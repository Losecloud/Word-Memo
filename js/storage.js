// ============================================
// 本地存储管理模块 (多用户 JSON 配置系统)
// ============================================

const Storage = {
    // ----------------------------------------
    // 用户与基础配置管理
    // ----------------------------------------

    // 获取当前登录用户
    getCurrentUser() {
        return localStorage.getItem('wordMemory_currentUser');
    },

    // ----------------------------------------
    // Obsidian 内置服务 HTTP 桥接
    // ----------------------------------------
    // 浏览器里 user/ 目录走 File System Access API；Obsidian（Electron）不开放该 API，
    // 改由插件内置本地服务的 /__wm__/ 接口读写同一批 user_*.json，行为与浏览器一致。
    _httpReady: false,
    _httpProbe: null,

    // 探测内置服务是否可用（幂等，只探测一次）
    initHttpBridge() {
        if (this._httpProbe) return this._httpProbe;
        this._httpProbe = fetch('/__wm__/ping', { cache: 'no-store' })
            .then((res) => res.ok)
            .catch(() => false)
            .then((ok) => { this._httpReady = ok; return ok; });
        return this._httpProbe;
    },

    isHttpBridgeReady() {
        return this._httpReady;
    },

    // 目录句柄是否可用（HTTP 桥接模式下视为可用）
    _hasDirAccess() {
        return !!(this._dirHandle && this._dirReady);
    },

    // 桥接模式下的用户名（与 _userFile 使用同一套非法字符替换规则）
    _bridgeUserName(username) {
        return (username || 'default').replace(/[\\/:*?"<>|]/g, '_');
    },

    // 列出所有历史用户（扫描本地配置键），按创建时间倒序
    listUsers() {
        const users = [];
        try {
            const prefix = 'wordMemory_user_json_';
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    const username = key.slice(prefix.length);
                    let createdAt = null;
                    try {
                        const config = JSON.parse(localStorage.getItem(key));
                        if (config && config.createdAt) createdAt = config.createdAt;
                    } catch (e) { /* 忽略损坏数据 */ }
                    users.push({ username, createdAt });
                }
            }
        } catch (e) { /* 忽略 */ }
        // 按创建时间倒序（无时间者排后）
        users.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
        });
        return users.map(u => u.username);
    },

    // 列出所有历史用户：本地缓存 + user/ 目录（HTTP 桥接模式下合并磁盘账号）
    async listUsersAsync() {
        const users = this.listUsers();
        if (!this._httpReady) return users;
        try {
            const res = await fetch('/__wm__/users', { cache: 'no-store' });
            if (res.ok) {
                const disk = await res.json();
                for (const name of disk) {
                    if (name && users.indexOf(name) === -1) users.push(name);
                }
            }
        } catch (e) { /* 桥接不可用时忽略，仅用本地缓存 */ }
        return users;
    },

    // 删除某个历史用户的所有本地数据（含配置文件键）
    removeUser(username) {
        if (!username) return false;
        try {
            localStorage.removeItem(`wordMemory_user_json_${username}`);
            // 若删除的是当前登录用户，同时清除登录态
            if (this.getCurrentUser() === username) {
                localStorage.removeItem('wordMemory_currentUser');
            }
            // 同步删除 user/ 目录下对应的配置文件（游客不落盘，无需处理）
            if (username !== '游客' && this.isFileSystemReady()) {
                this._removeUserFile(username).catch((e) => {
                    console.warn('删除用户配置文件失败:', e);
                });
            }
            return true;
        } catch (e) { return false; }
    },

    // 删除 user/ 目录下指定用户的配置文件
    async _removeUserFile(username) {
        // 桥接模式：走内置服务删除
        if (this._httpReady && !this._hasDirAccess()) {
            try {
                await fetch('/__wm__/user?name=' + encodeURIComponent(this._bridgeUserName(username)), { method: 'DELETE' });
                console.log(`🗑️ 已删除用户配置文件: user_${this._bridgeUserName(username)}.json`);
            } catch (e) {
                // 文件不存在或删除失败，忽略
            }
            return;
        }
        try {
            await this._dirHandle.removeEntry(this._userFile(username));
            console.log(`🗑️ 已删除用户配置文件: ${this._userFile(username)}`);
        } catch (e) {
            // 文件不存在或删除失败，忽略
        }
    },

    // 设置当前登录用户
    setCurrentUser(username) {
        localStorage.setItem('wordMemory_currentUser', username);
        // 记录本次登录是否为全新账号（登录前本地无该用户配置）。
        // 仅全新账号才允许从目录文件恢复数据，避免用旧文件覆盖 localStorage 里的最新数据。
        this._isFreshUser = !localStorage.getItem(`wordMemory_user_json_${username}`);
        this.initUserConfig(username);
        // 全新账号可能刚从目录文件或旧格式数据恢复，此处再迁移一次，确保不残留旧分类标签
        const config = this.getUserConfig();
        if (config && this._migrateCategoryInConfig(config)) this.saveUserConfig(config);
    },

    // 获取用户配置文件键名
    getUserConfigKey() {
        const user = this.getCurrentUser();
        return user ? `wordMemory_user_json_${user}` : null;
    },

    // 初始化用户配置
    initUserConfig(username) {
        const key = `wordMemory_user_json_${username}`;
        if (!localStorage.getItem(key)) {
            // 创建默认科学配置框架
            const defaultConfig = {
                username: username,
                version: 1,
                createdAt: new Date().toISOString(),
                aiWorkspace: {},
                basicSettings: {
                    learningMode: 'selectOnly',
                    wordOrder: 'sequential',
                    wordsPerSession: 20,
                    noAnswerProbability: 10,
                    voiceAccent: 'en-US',
                    voiceModel: '',
                    voiceRate: 1.0,
                    autoSound: true,
                    enableSoundEffects: true,
                    animationType: 'particles',
                    animationLevel: 'medium',
                    autoNext: true,
                    autoNextTime: 1,
                    hotkeys: { option1: '1', option2: '2', option3: '3', option4: '4', option5: '5', option6: '6' },
                    defaultCover: 'import',
                    dictLookupInSidebar: true, // Obsidian：查词跳转是否交由右侧栏承接（默认开启）
                    hoverLookup: true, // Obsidian：悬浮取词（默认开启）
                    selectionTranslate: true, // Obsidian：划词右键「翻译」（默认开启）
                    hideSidebarImport: true // Obsidian：隐藏右侧栏「导入词典」拖入区（默认开启）
                },
                aiSettings: {
                    aiApiKey: '',
                    aiApiFormat: 'openai',
                    aiApiBaseUrl: '',
                    // 多厂商配置：name/baseUrl/apiFormat/apiKey/models
                    aiProviders: [],
                    aiActiveProviderIndex: 0
                },
                learningData: {
                    autoSaveStats: true,
                    todayStats: {
                        date: new Date().toDateString(),
                        time: 0,
                        words: 0,
                        correct: 0,
                        wrong: 0,
                        mastery: 0
                    },
                    statsHistory: [],
                    reviewList: []
                },
                bookList: {
                    currentBookId: null,
                    books: []
                },
                favoriteWords: [],
                theme: 'light'
            };
            
            // 尝试迁移旧的无用户数据（如果有的话）
            if (localStorage.getItem('wordMemory_settings')) {
                try {
                    const oldSettings = JSON.parse(localStorage.getItem('wordMemory_settings'));
                    Object.assign(defaultConfig.basicSettings, oldSettings);
                    if (oldSettings.aiApiKey !== undefined) defaultConfig.aiSettings.aiApiKey = oldSettings.aiApiKey;
                    if (oldSettings.aiApiFormat !== undefined) defaultConfig.aiSettings.aiApiFormat = oldSettings.aiApiFormat;
                    if (oldSettings.aiApiBaseUrl !== undefined) defaultConfig.aiSettings.aiApiBaseUrl = oldSettings.aiApiBaseUrl;
                    if (oldSettings.autoSaveStats !== undefined) defaultConfig.learningData.autoSaveStats = oldSettings.autoSaveStats;
                } catch(e){}
            }
            if (localStorage.getItem('wordMemory_books')) {
                try { defaultConfig.bookList.books = JSON.parse(localStorage.getItem('wordMemory_books')); } catch(e){}
            }
            if (localStorage.getItem('wordMemory_currentBook')) {
                try { defaultConfig.bookList.currentBookId = JSON.parse(localStorage.getItem('wordMemory_currentBook')); } catch(e){}
            }
            if (localStorage.getItem('wordMemory_stats_history')) {
                try { defaultConfig.learningData.statsHistory = JSON.parse(localStorage.getItem('wordMemory_stats_history')); } catch(e){}
            }
            if (localStorage.getItem('wordMemory_review')) {
                try { defaultConfig.learningData.reviewList = JSON.parse(localStorage.getItem('wordMemory_review')); } catch(e){}
            }

            localStorage.setItem(key, JSON.stringify(defaultConfig));
        } else {
            // 已存在配置：深度合并，自动补齐后续新增字段的默认值并推进版本号（不覆盖已有数据）
            try {
                const existing = JSON.parse(localStorage.getItem(key));
                const merged = this._deepMerge(defaultConfig, existing);
                merged.version = Math.max(merged.version || 0, defaultConfig.version || 1);
                merged.username = username;
                localStorage.setItem(key, JSON.stringify(merged));
            } catch (e) {
                console.warn('合并用户配置失败:', e);
            }
        }
    },

    // 递归深度合并：用 defaults 补齐 target 缺失的字段（保持 target 已有数据不变）
    _deepMerge(defaults, target) {
        const result = Object.assign({}, target);
        for (const key of Object.keys(defaults)) {
            const dv = defaults[key];
            const has = Object.prototype.hasOwnProperty.call(result, key);
            if (!has) {
                result[key] = this._cloneDefault(dv);
            } else if (dv && typeof dv === 'object' && !Array.isArray(dv) &&
                       result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                result[key] = this._deepMerge(dv, result[key]);
            }
        }
        return result;
    },

    // 深拷贝"默认值"，避免对象引用共享导致的跨用户污染
    _cloneDefault(v) {
        if (v === null || typeof v !== 'object') return v;
        if (Array.isArray(v)) return v.map((item) => this._cloneDefault(item));
        const out = {};
        for (const k of Object.keys(v)) out[k] = this._cloneDefault(v[k]);
        return out;
    },

    // 字段 -> 分区 注册表（替代硬编码白名单，便于扩展 AI 工坊等新字段）
    FIELD_SECTIONS: {
        aiApiKey: 'aiSettings',
        aiApiFormat: 'aiSettings',
        aiApiBaseUrl: 'aiSettings',
        aiProviders: 'aiSettings',
        aiActiveProviderIndex: 'aiSettings',
        autoSaveStats: 'learningData',
        chartSheet: 'basicSettings'
    },

    // 获取完整用户配置对象
    getUserConfig() {
        const key = this.getUserConfigKey();
        if (!key) return null;
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            console.error('读取用户配置失败:', e);
            return null;
        }
    },

    // 保存完整用户配置对象
    saveUserConfig(config) {
        const key = this.getUserConfigKey();
        if (key && config) {
            localStorage.setItem(key, JSON.stringify(config));
            // 实时镜像写入本地 user/ 文件夹（异步，失败不影响主流程）
            this.writeConfigToFile(config).catch((e) => {
                console.warn('写入本地配置文件失败:', e);
            });
            return true;
        }
        return false;
    },

    // ============================================
    // 本地文件夹存储 (File System Access API)
    // ============================================
    // localStorage 作为快速缓存，user/ 文件夹作为持久化来源，二者实时同步。

    // 目录句柄是否可用（已获得读写授权）；HTTP 桥接模式下同样视为可用
    isFileSystemReady() {
        return this._hasDirAccess() || this._httpReady;
    },

    // 打开 IndexedDB 以便持久化目录句柄
    _idbOpen() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('wordMemory_fs', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async _idbPut(key, value) {
        const db = await this._idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async _idbGet(key) {
        const db = await this._idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('handles', 'readonly');
            const req = tx.objectStore('handles').get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    // 目录内用户配置文件命名
    _userFile(username) {
        return `user_${(username || 'default').replace(/[\\/:*?"<>|]/g, '_')}.json`;
    },

    // 弹出目录选择器，让用户选中 reciting/user/ 目录（需在用户手势中调用）
    async chooseUserDirectory() {
        // 无 File System Access API 的环境（如 Obsidian）：改用内置服务桥接 user/ 目录
        if (!window.showDirectoryPicker) {
            if (await this.initHttpBridge()) {
                console.log('✅ 已启用内置服务目录桥接');
                return true;
            }
            console.warn('当前浏览器不支持 File System Access API');
            return false;
        }
        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            await this._idbPut('userDir', handle);
            this._dirHandle = handle;
            this._dirReady = true;
            localStorage.setItem('wordMemory_haveUserDir', '1');
            console.log('✅ 用户目录已绑定');
            return true;
        } catch (e) {
            console.warn('未选择用户目录，继续使用本地缓存:', e);
            this._dirReady = false;
            return false;
        }
    },

    // 是否已绑定过本地用户目录
    hasUserDirectory() {
        return this._httpReady || localStorage.getItem('wordMemory_haveUserDir') === '1';
    },

    // 从 IndexedDB 恢复目录句柄并申请授权
    async restoreUserDirectory() {
        // 桥接模式下无需目录句柄，user/ 目录由内置服务直接读写
        if (await this.initHttpBridge()) return;
        if (!window.showDirectoryPicker || this._dirReady) return;
        try {
            const handle = await this._idbGet('userDir');
            if (!handle) return;
            const opts = { mode: 'readwrite' };
            let perm = await handle.queryPermission(opts);
            if (perm === 'prompt') {
                perm = await handle.requestPermission(opts);
            }
            if (perm === 'granted') {
                this._dirHandle = handle;
                this._dirReady = true;
                console.log('已恢复用户目录授权');
            }
        } catch (e) {
            console.warn('恢复用户目录失败:', e);
        }
    },

    // 尝试把当前用户配置写为 user/ 目录下的 json 文件（实时保存）
    async writeConfigToFile(config) {
        const user = this.getCurrentUser();
        // 游客为临时体验账号，不落盘到 user/ 目录
        if (!user || user === '游客' || !this.isFileSystemReady() || !config) return false;
        // 先快照内容，避免后续串行写入时读到被再次修改的对象
        const snapshot = JSON.stringify(config, null, 2);
        // 桥接模式：走内置服务写入（同样串行化，避免并发写导致文件停留在旧内容）
        if (!this._hasDirAccess()) {
            if (!this._bridgeChain) this._bridgeChain = Promise.resolve();
            this._bridgeChain = this._bridgeChain
                .then(() => fetch('/__wm__/user?name=' + encodeURIComponent(this._bridgeUserName(user)), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: snapshot
                }))
                .then((res) => res.ok)
                .catch((e) => { console.warn('写入 user/ 目录失败:', e); return false; });
            return this._bridgeChain;
        }
        if (!this._writeChain) this._writeChain = Promise.resolve();
        // 串行化写入：并发 createWritable 会抛 InvalidModificationError 导致文件停留在旧内容，
        // 进而在下次登录时用旧文件覆盖 localStorage，造成“重登后词单/收藏丢失”。
        this._writeChain = this._writeChain
            .then(() => this._dirHandle.getFileHandle(this._userFile(user), { create: true }))
            .then(async (fileHandle) => {
                const writable = await fileHandle.createWritable();
                await writable.write(snapshot);
                await writable.close();
            })
            .catch((e) => { console.warn('写入本地配置文件失败:', e); });
        return this._writeChain;
    },

    // 从 user/ 目录读取当前用户配置（仅全新账号时才覆盖本地缓存，避免旧文件覆盖新数据）
    async loadConfigFromFile(username) {
        const name = username || this.getCurrentUser();
        if (!name || name === '游客' || !this.isFileSystemReady()) return null;
        // 桥接模式：走内置服务读取
        if (!this._hasDirAccess()) {
            try {
                const res = await fetch('/__wm__/user?name=' + encodeURIComponent(this._bridgeUserName(name)), { cache: 'no-store' });
                if (!res.ok) return null;
                const config = await res.json();
                if (config && config.username) {
                    if (this._isFreshUser) {
                        localStorage.setItem(`wordMemory_user_json_${name}`, JSON.stringify(config));
                    }
                    return config;
                }
            } catch (e) {
                // 文件可能还不存在，忽略
            }
            return null;
        }
        try {
            const fileHandle = await this._dirHandle.getFileHandle(this._userFile(name));
            const file = await fileHandle.getFile();
            const text = await file.text();
            if (!text) return null;
            const config = JSON.parse(text);
            if (config && config.username) {
                // 仅当本地无该用户配置（全新账号）时才用目录文件恢复；
                // 已存在账号以 localStorage 为准，防止并发写入残留的旧文件把最新数据冲掉。
                if (this._isFreshUser) {
                    localStorage.setItem(`wordMemory_user_json_${name}`, JSON.stringify(config));
                }
                return config;
            }
        } catch (e) {
            // 文件可能还不存在，忽略
        }
        return null;
    },

    // 初始化文件系统：恢复目录授权；用文件夹配置覆盖缓存，补齐新增字段并写回文件
    async initUserFileSystem(username) {
        await this.restoreUserDirectory();
        if (this.isFileSystemReady()) {
            const user = username || this.getCurrentUser();
            // 游客为临时体验账号，不参与 user/ 目录的文件读写
            if (user && user !== '游客') {
                await this.loadConfigFromFile(user);
                // 补齐后续新增字段的默认值（不影响已有数据），再写回文件，保证字段一次落盘
                this.initUserConfig(user);
                const key = `wordMemory_user_json_${user}`;
                try {
                    const config = JSON.parse(localStorage.getItem(key));
                    if (config) await this.writeConfigToFile(config);
                } catch (e) { /* 忽略 */ }
            }
        }
        return this.isFileSystemReady();
    },

    // ----------------------------------------
    // 以下为适配原有业务逻辑的接口，统一操作 UserConfig
    // ----------------------------------------

    // 读取设置 (组合 basicSettings 和 aiSettings)
    loadSettings() {
        const config = this.getUserConfig();
        if (!config) return {}; // 如果未登录，返回空
        return {
            ...config.basicSettings,
            ...config.aiSettings,
            autoSaveStats: config.learningData.autoSaveStats
        };
    },

    // 保存设置
    saveSettings(settings) {
        const config = this.getUserConfig();
        if (!config) return false;

        // 依据注册表将扁平字段派发到对应分区（未知字段默认落入 basicSettings 以向后兼容）
        for (const [key, value] of Object.entries(settings)) {
            if (key === 'autoSaveStats') {
                config.learningData.autoSaveStats = value;
                continue;
            }
            const section = this.FIELD_SECTIONS[key] || 'basicSettings';
            if (!config[section] || typeof config[section] !== 'object') config[section] = {};
            config[section][key] = value;
        }
        const ok = this.saveUserConfig(config);
        // 设置保存后通知宿主（Obsidian 插件）刷新悬浮取词 / 划词翻译开关，无需刷新页面
        try {
            if (typeof window !== 'undefined' && typeof window.__wmSyncHostSettings === 'function') window.__wmSyncHostSettings();
        } catch (e) { /* 忽略 */ }
        return ok;
    },

    // 读取任意分区数据（如 aiWorkspace），返回深拷贝避免误改
    loadSection(section) {
        const config = this.getUserConfig();
        if (!config || !config[section]) return {};
        return this._cloneDefault(config[section]);
    },

    // 写入/合并任意分区数据（如 aiWorkspace），浅合并保留未提及字段
    saveSection(section, data) {
        const config = this.getUserConfig();
        if (!config) return false;
        if (!config[section] || typeof config[section] !== 'object') config[section] = {};
        config[section] = Object.assign({}, config[section], data);
        return this.saveUserConfig(config);
    },

    // 读取主题
    loadTheme() {
        const config = this.getUserConfig();
        return config ? config.theme : 'light';
    },

    // 保存主题
    saveTheme(theme) {
        const config = this.getUserConfig();
        if (config) {
            config.theme = theme;
            this.saveUserConfig(config);
        }
    },

    // 读取星云封面配置（按用户隔离，存于 aiWorkspace.nebulaCover）
    loadNebulaConfig() {
        const config = this.getUserConfig();
        if (config && config.aiWorkspace && config.aiWorkspace.nebulaCover) {
            return this._cloneDefault(config.aiWorkspace.nebulaCover);
        }
        return null;
    },

    // 保存星云封面配置
    saveNebulaConfig(nebulaConfig) {
        const config = this.getUserConfig();
        if (!config) return false;
        if (!config.aiWorkspace || typeof config.aiWorkspace !== 'object') config.aiWorkspace = {};
        config.aiWorkspace.nebulaCover = nebulaConfig;
        return this.saveUserConfig(config);
    },

    // 读取混沌星云封面配置（按用户隔离，存于 aiWorkspace.chaosNebulaCover）
    loadChaosConfig() {
        const config = this.getUserConfig();
        if (config && config.aiWorkspace && config.aiWorkspace.chaosNebulaCover) {
            return this._cloneDefault(config.aiWorkspace.chaosNebulaCover);
        }
        return null;
    },

    // 保存混沌星云封面配置
    saveChaosConfig(chaosConfig) {
        const config = this.getUserConfig();
        if (!config) return false;
        if (!config.aiWorkspace || typeof config.aiWorkspace !== 'object') config.aiWorkspace = {};
        config.aiWorkspace.chaosNebulaCover = chaosConfig;
        return this.saveUserConfig(config);
    },

    // 读取蒲公英聚类封面配置（按用户隔离，存于 aiWorkspace.dandelionCover）
    loadDandelionConfig() {
        const config = this.getUserConfig();
        if (config && config.aiWorkspace && config.aiWorkspace.dandelionCover) {
            return this._cloneDefault(config.aiWorkspace.dandelionCover);
        }
        return null;
    },

    // 保存蒲公英聚类封面配置
    saveDandelionConfig(dandelionConfig) {
        const config = this.getUserConfig();
        if (!config) return false;
        if (!config.aiWorkspace || typeof config.aiWorkspace !== 'object') config.aiWorkspace = {};
        config.aiWorkspace.dandelionCover = dandelionConfig;
        return this.saveUserConfig(config);
    },

    // ----------------------------------------
    // 统计数据管理 (learningData)
    // ----------------------------------------

    loadStats() {
        const config = this.getUserConfig();
        if (!config) return {};
        const today = new Date().toDateString();
        let stats = config.learningData.todayStats;
        
        if (stats.date !== today) {
            stats = { date: today, time: 0, words: 0, correct: 0, wrong: 0, mastery: 0 };
            config.learningData.todayStats = stats;
            this.saveUserConfig(config);
        }
        return stats;
    },

    saveStats(stats) {
        const config = this.getUserConfig();
        if (config) {
            config.learningData.todayStats = stats;
            this.saveUserConfig(config);
        }
    },

    updateStats(updates) {
        const stats = this.loadStats();
        const newStats = { ...stats, ...updates };
        
        const totalAttempts = (newStats.correct || 0) + (newStats.wrong || 0);
        newStats.mastery = totalAttempts > 0 ? Math.round((newStats.correct / totalAttempts) * 100) : 0;
        newStats.mastery = Math.max(0, Math.min(100, newStats.mastery));
        
        this.saveStats(newStats);
        
        const settings = this.loadSettings();
        if (settings.autoSaveStats !== false) {
            this.saveStatsToHistory(newStats);
        }
        return newStats;
    },

    saveStatsToHistory(stats) {
        const config = this.getUserConfig();
        if (!config) return [];
        const history = config.learningData.statsHistory || [];
        const date = stats.date || new Date().toDateString();
        
        const existingIndex = history.findIndex(item => item.date === date);
        const totalAttempts = (stats.correct || 0) + (stats.wrong || 0);
        const mastery = totalAttempts > 0 ? Math.max(0, Math.min(100, Math.round((stats.correct / totalAttempts) * 100))) : 0;
        
        const historyItem = {
            date: date, time: stats.time || 0, words: stats.words || 0,
            correct: stats.correct || 0, wrong: stats.wrong || 0,
            mastery: mastery, timestamp: new Date().toISOString()
        };
        
        if (existingIndex >= 0) history[existingIndex] = historyItem;
        else history.push(historyItem);
        
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        config.learningData.statsHistory = history.slice(0, 90);
        
        this.saveUserConfig(config);
        return config.learningData.statsHistory;
    },

    loadStatsHistory() {
        const config = this.getUserConfig();
        return config ? (config.learningData.statsHistory || []) : [];
    },

    getRecentStats(days = 30) {
        const history = this.loadStatsHistory();
        const result = [];
        const today = new Date();
        
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const found = history.find(item => item.date === dateStr);
            result.push(found || { date: dateStr, time: 0, words: 0, correct: 0, wrong: 0, mastery: 0 });
        }
        return result;
    },

    /** 统计摘要：近 N 天的学习天数/累计时长/累计单词/平均正确率 */
    getStatsSummary(days = 30) {
        // 只统计有数据的天（空天不计入学习天数，也不拉低正确率）
        const history = this.getRecentStats(days).filter(item =>
            (item.time || 0) > 0 || (item.words || 0) > 0 || (item.correct || 0) > 0 || (item.wrong || 0) > 0);

        const totalDays = history.length;
        const totalTime = history.reduce((s, i) => s + (i.time || 0), 0);
        const totalWords = history.reduce((s, i) => s + (i.words || 0), 0);
        const totalCorrect = history.reduce((s, i) => s + (i.correct || 0), 0);
        const totalAttempts = history.reduce((s, i) => s + (i.correct || 0) + (i.wrong || 0), 0);
        const avgMastery = totalAttempts > 0 ? Math.round(totalCorrect / totalAttempts * 100) : 0;

        return { totalDays, totalTime, totalWords, avgMastery };
    },

    clearStatsHistory() {
        const config = this.getUserConfig();
        if (config) {
            const today = new Date().toDateString();
            const history = config.learningData.statsHistory || [];
            const todayStats = history.find(item => item.date === today);
            config.learningData.statsHistory = todayStats ? [todayStats] : [];
            this.saveUserConfig(config);
            return config.learningData.statsHistory;
        }
        return [];
    },

    // ----------------------------------------
    // 场景类别迁移（旧分类树 → 当前分类树）
    // ----------------------------------------

    // 迁移配置对象内所有词条的分类字段（词书 / 复习列表 / 收藏），返回是否有改动
    _migrateCategoryInConfig(config) {
        const ai = (typeof AIService !== 'undefined') ? AIService : null;
        if (!ai || typeof ai.migrateLegacyCategory !== 'function') return false;
        let dirty = false;
        const fix = (item) => {
            if (!item || typeof item !== 'object') return;
            const old = item.category;
            if (old === undefined || old === null || old === '') return;
            const next = ai.migrateLegacyCategory(old, item.word);
            if (old === next) return;
            if (next) item.category = next;
            else delete item.category;
            dirty = true;
        };
        const books = config.bookList && config.bookList.books;
        if (Array.isArray(books)) {
            for (const book of books) {
                if (book && Array.isArray(book.words)) book.words.forEach(fix);
            }
        }
        const review = config.learningData && config.learningData.reviewList;
        if (Array.isArray(review)) review.forEach(fix);
        if (Array.isArray(config.favoriteWords)) config.favoriteWords.forEach(fix);
        return dirty;
    },

    // 一次性迁移：把所有历史用户数据中的旧场景类别标签升级到当前分类树
    // 幂等，可重复调用；须在应用读取词书之前执行
    migrateLegacyCategories() {
        const currentKey = this.getUserConfigKey();
        const prefix = 'wordMemory_user_json_';
        let changedUsers = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || key.indexOf(prefix) !== 0) continue;
            let config = null;
            try { config = JSON.parse(localStorage.getItem(key)); } catch (e) { continue; }
            if (!config || typeof config !== 'object') continue;
            if (!this._migrateCategoryInConfig(config)) continue;
            localStorage.setItem(key, JSON.stringify(config));
            changedUsers++;
            // 当前登录用户同步写入 user/ 目录镜像
            if (key === currentKey) {
                this.writeConfigToFile(config).catch(() => { /* 文件镜像失败不影响主流程 */ });
            }
        }
        if (changedUsers) console.log(`✅ 场景类别迁移完成：已更新 ${changedUsers} 个用户配置`);
        return changedUsers;
    },

    // ----------------------------------------
    // 词书管理 (bookList)
    // ----------------------------------------

    loadBooks() {
        const config = this.getUserConfig();
        return config ? (config.bookList.books || []) : [];
    },

    saveBooks(books) {
        const config = this.getUserConfig();
        if (config) {
            config.bookList.books = books;
            this.saveUserConfig(config);
        }
    },

    addBook(book) {
        const books = this.loadBooks();
        const learningEmojis = ['📕', '📗', '📘', '📙', '📚', '📖', '📝', '✏️', '🌟', '✨'];
        const randomIcon = learningEmojis[Math.floor(Math.random() * learningEmojis.length)];
        
        const newBook = {
            id: Date.now().toString(),
            name: book.name || '未命名词书',
            icon: book.icon || randomIcon,
            words: book.words || [],
            createdAt: new Date().toISOString(),
            lastPracticeAt: null,
            round: 1,
            progress: { currentIndex: 0, learned: [], correct: [], wrong: [], sequence: [] }
        };
        books.push(newBook);
        this.saveBooks(books);
        return newBook;
    },

    updateBook(bookId, updates) {
        const books = this.loadBooks();
        const index = books.findIndex(b => b.id === bookId);
        if (index >= 0) {
            const oldBook = books[index];
            books[index] = {
                ...oldBook,
                ...updates,
                id: bookId,
                createdAt: oldBook.createdAt,
                words: updates.words !== undefined ? updates.words : oldBook.words
            };
            this.saveBooks(books);
            return books[index];
        }
        return null;
    },

    deleteBook(bookId) {
        const books = this.loadBooks();
        const filtered = books.filter(b => b.id !== bookId);
        this.saveBooks(filtered);
        return filtered;
    },

    getBook(bookId) {
        const books = this.loadBooks();
        return books.find(b => b.id === bookId);
    },

    saveCurrentBook(bookId) {
        const config = this.getUserConfig();
        if (config) {
            config.bookList.currentBookId = bookId;
            this.saveUserConfig(config);
        }
    },

    loadCurrentBook() {
        const config = this.getUserConfig();
        return config ? config.bookList.currentBookId : null;
    },

    updateBookProgress(bookId, progress) {
        const books = this.loadBooks();
        const index = books.findIndex(b => b.id === bookId);
        if (index >= 0) {
            books[index].progress = { ...books[index].progress, ...progress };
            this.saveBooks(books);
            return books[index];
        }
        return null;
    },

    generateSequence(bookId, order = 'sequential') {
        const book = this.getBook(bookId);
        if (!book) return [];
        const totalWords = book.words.length;
        let sequence = Array.from({ length: totalWords }, (_, i) => i);
        
        if (order === 'random') {
            for (let i = sequence.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
            }
        }
        this.updateBookProgress(bookId, { sequence });
        return sequence;
    },

    // ----------------------------------------
    // 其他模块 (复习、收藏等)
    // ----------------------------------------

    saveFavoriteItems(items) {
        const config = this.getUserConfig();
        if (config) {
            config.favoriteWords = items;
            this.saveUserConfig(config);
        }
    },

    loadFavoriteItems() {
        const config = this.getUserConfig();
        return config ? (config.favoriteWords || []) : [];
    },

    saveReview(reviewList) {
        const config = this.getUserConfig();
        if (config) {
            config.learningData.reviewList = reviewList;
            this.saveUserConfig(config);
        }
    },

    loadReview() {
        const config = this.getUserConfig();
        return config ? (config.learningData.reviewList || []) : [];
    },

    addToReview(word, reviewCount = 0) {
        const reviewList = this.loadReview();
        const intervals = [1, 2, 4, 7, 15];
        const interval = intervals[Math.min(reviewCount, intervals.length - 1)];
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        
        const existingIndex = reviewList.findIndex(item => item.word === word.word);
        const reviewItem = {
            ...word, reviewCount: reviewCount + 1,
            nextReviewDate: nextReviewDate.toISOString(), lastReviewDate: new Date().toISOString()
        };
        
        if (existingIndex >= 0) reviewList[existingIndex] = reviewItem;
        else reviewList.push(reviewItem);
        
        this.saveReview(reviewList);
    },

    getTodayReview() {
        const reviewList = this.loadReview();
        const today = new Date();
        return reviewList.filter(item => new Date(item.nextReviewDate) <= today);
    },

    formatTimeAgo(isoString) {
        if (!isoString) return '';
        const now = new Date();
        const past = new Date(isoString);
        const diffDays = Math.floor((now - past) / (1000 * 60 * 60 * 24));
        const hours = past.getHours().toString().padStart(2, '0');
        const minutes = past.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        if (diffDays === 0) return `今天 ${timeStr}`;
        if (diffDays === 1) return `昨天 ${timeStr}`;
        if (diffDays < 7) return `${diffDays}天前`;
        if (diffDays < 30) return Math.floor(diffDays / 7) === 1 ? '1周前' : `${Math.floor(diffDays / 7)}周前`;
        if (diffDays < 90) return Math.floor(diffDays / 30) === 1 ? '1个月前' : `${Math.floor(diffDays / 30)}个月前`;
        
        const year = past.getFullYear().toString().slice(-2);
        const month = (past.getMonth() + 1).toString().padStart(2, '0');
        const day = past.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day}`;
    },

    // ============================================
    // SM-2 艾宾浩斯智能复习模块 (WordMemory)
    // ============================================
    // 每个单词独立的记忆状态，存储于 learningData.wordMemory 字典
    // key: `${bookId}:${word}`, value: { ef, interval, reviewCount, lastReview, nextReview, totalReviews, totalCorrect, totalWrong, history[] }

    /** 创建默认记忆状态 */
    _defaultMemory() {
        return {
            ef: 2.5,
            interval: 0,
            reviewCount: 0,
            lastReviewDate: null,
            nextReviewDate: null,
            totalReviews: 0,
            totalCorrect: 0,
            totalWrong: 0,
            blacklist: false, // 「太简单」标记：不再进入复习
            history: [] // [{date, quality, mode}]
        };
    },

    /** 获取所有单词记忆状态 */
    loadAllMemory() {
        const config = this.getUserConfig();
        return config ? (config.learningData.wordMemory || {}) : {};
    },

    /** 保存所有单词记忆状态 */
    saveAllMemory(memoryMap) {
        const config = this.getUserConfig();
        if (config) {
            config.learningData.wordMemory = memoryMap;
            this.saveUserConfig(config);
        }
    },

    /** 获取单个单词的记忆状态 */
    getWordMemory(bookId, word) {
        const map = this.loadAllMemory();
        const key = `${bookId}:${word}`;
        return map[key] ? { ...map[key], history: map[key].history ? [...map[key].history] : [] } : null;
    },

    /** 保存/更新单个单词的记忆状态 */
    setWordMemory(bookId, word, memory) {
        const map = this.loadAllMemory();
        const key = `${bookId}:${word}`;
        map[key] = memory;
        this.saveAllMemory(map);
    },

    /** 标记「太简单」：标记后该词不再进入复习队列 */
    markWordTooEasy(bookId, word) {
        const map = this.loadAllMemory();
        const key = `${bookId}:${word}`;
        const mem = map[key] || this._defaultMemory();
        mem.blacklist = true;
        mem.nextReviewDate = null; // 立即移出待复习队列
        map[key] = mem;
        this.saveAllMemory(map);
    },

    /** 获取「太简单」黑名单集合（元素为 `${bookId}:${word}`），供学习清单一次性过滤 */
    loadTooEasySet() {
        const set = new Set();
        const map = this.loadAllMemory();
        for (const [key, mem] of Object.entries(map)) {
            if (mem && mem.blacklist) set.add(key);
        }
        return set;
    },

    /**
     * SM-2 算法核心
     * @param {number} quality - 记忆质量 0-5
     * @param {object} prevMemory - 先前的记忆状态（或 null）
     * @returns {object} 更新后的记忆状态
     */
    sm2(quality, prevMemory) {
        const mem = prevMemory ? { ...prevMemory, history: prevMemory.history ? [...prevMemory.history] : [] } : this._defaultMemory();

        // 更新 EF (易变因子)
        mem.ef = mem.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        mem.ef = Math.max(1.3, Math.min(3.0, mem.ef));

        // 记录历史
        mem.history.push({
            date: new Date().toISOString(),
            quality: quality,
            interval: mem.interval
        });
        // 只保留最近 20 条
        if (mem.history.length > 20) {
            mem.history = mem.history.slice(-20);
        }

        mem.totalReviews++;

        if (quality >= 3) {
            // 答对
            mem.totalCorrect++;
            mem.reviewCount++;
            if (mem.reviewCount === 1) {
                mem.interval = 1;
            } else if (mem.reviewCount === 2) {
                mem.interval = 6;
            } else {
                mem.interval = Math.round((mem.interval || 1) * mem.ef);
            }
        } else {
            // 答错
            mem.totalWrong++;
            mem.reviewCount = 0;
            mem.interval = 1;
        }

        // 最大间隔 180 天
        mem.interval = Math.min(180, Math.max(1, mem.interval));

        mem.lastReviewDate = new Date().toISOString();
        const next = new Date();
        next.setDate(next.getDate() + mem.interval);
        mem.nextReviewDate = next.toISOString();

        return mem;
    },

    /**
     * 将答题结果映射为 SM-2 质量分
     * @param {boolean} isCorrect - 是否答对
     * @param {boolean} hintUsed - 是否使用了提示
     * @param {boolean} wasSlow - 是否犹豫较久
     * @returns {number} 0-5
     */
    mapQuality(isCorrect, hintUsed, wasSlow) {
        if (isCorrect && !hintUsed && !wasSlow) return 5;
        if (isCorrect && !hintUsed && wasSlow) return 4;
        if (isCorrect && hintUsed) return 3;
        if (!isCorrect) return 1;
        return 0;
    },

    /** 获取今日到期复习的单词列表 */
    getDueWords(options = {}) {
        const { bookId, limit } = options;
        const map = this.loadAllMemory();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const results = [];

        for (const [key, mem] of Object.entries(map)) {
            if (!mem.nextReviewDate) continue;
            if (mem.blacklist) continue; // 「太简单」的词不再进入复习
            const [keyBookId, word] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
            if (bookId && keyBookId !== bookId) continue;

            const due = new Date(mem.nextReviewDate);
            if (due <= today) {
                results.push({ bookId: keyBookId, word, memory: mem });
            }
        }

        // 按到期时间排序（最急的先）
        results.sort((a, b) => new Date(a.memory.nextReviewDate) - new Date(b.memory.nextReviewDate));

        return limit ? results.slice(0, limit) : results;
    },

    /** 获取所有单词的复习统计概览 */
    getMemoryOverview() {
        const map = this.loadAllMemory();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let totalWords = 0, dueToday = 0, overdue = 0;
        let avgEF = 0, avgInterval = 0;

        for (const mem of Object.values(map)) {
            totalWords++;
            avgEF += mem.ef || 2.5;
            avgInterval += mem.interval || 0;

            if (mem.nextReviewDate) {
                const due = new Date(mem.nextReviewDate);
                if (due <= today) {
                    dueToday++;
                    // 逾期超过 1 天算 overdue
                    if (due < new Date(today.getTime() - 86400000)) {
                        overdue++;
                    }
                }
            }
        }

        return {
            totalWords,
            dueToday,
            overdue,
            avgEF: totalWords > 0 ? +(avgEF / totalWords).toFixed(2) : 2.5,
            avgInterval: totalWords > 0 ? Math.round(avgInterval / totalWords) : 0
        };
    },

    /** 获取某词书内所有单词的记忆状态（含未初始化的，用默认值） */
    getBookMemoryWithDefaults(bookId, words) {
        const map = this.loadAllMemory();
        const prefix = `${bookId}:`;
        const result = [];

        for (const w of words) {
            const wordText = typeof w === 'string' ? w : (w.word || '');
            if (!wordText) continue;
            const key = prefix + wordText;
            const mem = map[key] || null;
            result.push({
                word: wordText,
                memory: mem ? { ...mem, history: mem.history ? [...mem.history] : [] } : this._defaultMemory()
            });
        }
        return result;
    }
};

window.Storage = Storage;