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
        // file:// 直开：不存在内置服务（该接口仅 Obsidian 插件端提供），跳过探测避免 CORS 报错
        if (location.protocol === 'file:') { this._httpProbe = Promise.resolve(false); return this._httpProbe; }
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

    // ----------------------------------------
    // 独立 localStorage 键 → 用户配置镜像（extras）
    // ----------------------------------------
    // 收藏词单、词典授权码、AI 模型选择、练习配置等历史上散落在独立 localStorage 键中，
    // 只随浏览器缓存走、不写入 user_*.json，换端加载同一配置后这些数据会丢失。
    // 这里把它们集中镜像进用户配置的 extras 分区：写这些键时自动同步，加载配置时回填。
    MIRROR_KEYS: [
        'favoriteWordLists',            // 收藏词单（含自建词单的单词及欧路生词本链接）
        'favoriteWordListCur',
        'favoriteWordListPreferred',
        'eudicToken',                   // 欧路词典 OpenAPI 授权码
        'eudicSynced',                  // 各收藏词单的欧路同步基线
        'aiModelUsage',                 // AI 模型最近使用顺序
        'wreBookLang',
        'wreCefrPrefs',
        'synonymPracticeConfig',        // 同义替换练习配置
        'liyiPracticeConfig',           // 熟词僻义练习配置
        'epConfig',                     // 英文扑克配置
        'workshopAppFavorites',         // AI 工坊收藏
        'wordListColWidths',            // 浏览词单列宽
        'enabledDicts', 'knownDicts', 'dictMetas', 'browseDictCur', 'baseDictDisabled', // 词典启用/清单/首选
        'wordNotes',                    // 查词详情页「我的笔记」（按单词小写索引）
        'noteHeightList', 'noteHeightDetail', // 「我的笔记」拖拽调节的容器高度（清单页 / 详情页各一份，互为独立）
        'writingInputDebounce', 'cefrMarkEnabled', 'aiCorrectionEnabled' // AI 工坊写作设置
    ],
    MIRROR_KEY_PREFIXES: ['aiModel_'],  // AI 各下拉上次选中的模型 ID
    MIRROR_OWNER_KEY: 'wordMemory_mirrorOwner', // 本机镜像键当前归属账号（切换账号时据此清理旧账号残留）

    // 该键是否需随用户配置一同持久化
    _isMirrorKey(k) {
        if (!k) return false;
        if (this.MIRROR_KEYS.indexOf(k) >= 0) return true;
        if (this.MIRROR_KEY_PREFIXES.some(p => k.indexOf(p) === 0)) return true;
        const user = this.getCurrentUser() || 'default';
        return k === `liyiWordStats_${user}`; // 熟词僻义单词练习统计（按用户隔离）
    },

    // 采集当前所有待镜像键的原始值
    _collectExtras() {
        const extras = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (this._isMirrorKey(k)) extras[k] = localStorage.getItem(k);
            }
        } catch (e) { /* 忽略 */ }
        return extras;
    },

    // 把当前待镜像键合并进配置的 extras（已删除的镜像键同步剔除）
    _syncExtrasToConfig(config) {
        if (!config) return config;
        const collected = this._collectExtras();
        const prev = (config.extras && typeof config.extras === 'object') ? config.extras : {};
        for (const k of Object.keys(prev)) {
            if (this._isMirrorKey(k) && !Object.prototype.hasOwnProperty.call(collected, k)) delete prev[k];
        }
        config.extras = Object.assign(prev, collected);
        return config;
    },

    // 清空本机所有镜像键（不触发回写）：用于切换账号时清理上一账号的残留
    _clearMirrorKeys() {
        const stale = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                // liyiWordStats_ 按用户隔离，不受 _isMirrorKey 的当前用户判断限制
                if (this.MIRROR_KEYS.indexOf(k) >= 0 ||
                    this.MIRROR_KEY_PREFIXES.some(p => k.indexOf(p) === 0) ||
                    k.indexOf('liyiWordStats_') === 0) stale.push(k);
            }
        } catch (e) { /* 忽略 */ }
        this._applyingExtras = true;
        try { stale.forEach(k => localStorage.removeItem(k)); } catch (e) { /* 忽略 */ }
        finally { this._applyingExtras = false; }
    },

    // 用配置中的 extras 回填独立键（加载配置后调用；值为 null 时移除该键）
    // 若本机镜像键归属账号与当前账号不一致，先清空再回填，
    // 避免新账号继承旧账号的授权码 / 收藏词单 / 欧路生词本链接等
    _applyExtras(config) {
        const user = this.getCurrentUser() || '';
        let owner = null;
        try { owner = localStorage.getItem(this.MIRROR_OWNER_KEY); } catch (e) { /* 忽略 */ }
        // owner 为 null 视为老版本升级（未记录归属），此时不清空，交由调用方反向同步回收本机键
        if (owner !== null && owner !== user) this._clearMirrorKeys();
        const extras = config && config.extras;
        if (extras && typeof extras === 'object') {
            this._applyingExtras = true;
            try {
                for (const k of Object.keys(extras)) {
                    if (!this._isMirrorKey(k)) continue;
                    try {
                        if (extras[k] === null || extras[k] === undefined) localStorage.removeItem(k);
                        else localStorage.setItem(k, String(extras[k]));
                    } catch (e) { /* 忽略单键失败 */ }
                }
            } finally {
                this._applyingExtras = false;
            }
        }
        // 记录归属：此后本机镜像键即视为属于当前账号
        try { localStorage.setItem(this.MIRROR_OWNER_KEY, user); } catch (e) { /* 忽略 */ }
    },

    // 拦截独立键的写入/删除，防抖后同步进用户配置（无需改动各业务写入点）
    _installMirrorHook() {
        if (this._mirrorHooked) return;
        this._mirrorHooked = true;
        const self = this;
        const rawSet = localStorage.setItem.bind(localStorage);
        const rawRemove = localStorage.removeItem.bind(localStorage);
        localStorage.setItem = function (k, v) {
            rawSet(k, v);
            if (!self._applyingExtras && self._isMirrorKey(k)) self.scheduleExtrasMirror();
        };
        localStorage.removeItem = function (k) {
            rawRemove(k);
            if (!self._applyingExtras && self._isMirrorKey(k)) self.scheduleExtrasMirror();
        };
        // iframe（查词引擎页）等其它文档写入镜像键时，本页收不到 setItem 钩子，
        // 只能靠 storage 事件感知（跨文档触发），据此补一次镜像，确保详情页笔记高度等也随配置持久化
        window.addEventListener('storage', function (ev) {
            if (ev && ev.key && self._isMirrorKey(ev.key)) self.scheduleExtrasMirror();
        });
    },

    // 防抖同步：把当前待镜像键写入当前用户配置并落盘
    scheduleExtrasMirror() {
        if (this._mirrorTimer) clearTimeout(this._mirrorTimer);
        this._mirrorTimer = setTimeout(() => {
            this._mirrorTimer = null;
            const config = this.getUserConfig();
            if (config) this.saveUserConfig(config);
        }, 500);
    },

    // 设置当前登录用户
    setCurrentUser(username) {
        this._installMirrorHook(); // 安装独立键镜像钩子（幂等）
        localStorage.setItem('wordMemory_currentUser', username);
        this.initUserConfig(username);
        // 切换账号：清理旧账号残留的镜像键（授权码 / 收藏词单 / 欧路链接等）并回填本账号配置
        const config = this.getUserConfig();
        if (config) this._applyExtras(config);
        // 全新账号可能刚从目录文件或旧格式数据恢复，此处再迁移一次，确保不残留旧分类标签
        if (config && this._migrateCategoryInConfig(config)) this.saveUserConfig(config);
    },

    // 安全解析 JSON（失败返回 null）
    _parseJson(text) {
        if (!text) return null;
        try { return JSON.parse(text); } catch (e) { return null; }
    },

    // 配置是否为空壳（无任何用户产生的内容）：用于判断是否可用 user/ 目录文件恢复
    _isConfigEmpty(config) {
        if (!config || typeof config !== 'object') return true;
        const books = config.bookList && config.bookList.books;
        if (Array.isArray(books) && books.length) return false;
        const ld = config.learningData || {};
        if (ld.reviewList && ld.reviewList.length) return false;
        if (ld.statsHistory && ld.statsHistory.length) return false;
        if (ld.wordMemory && Object.keys(ld.wordMemory).length) return false;
        if (config.favoriteWords && config.favoriteWords.length) return false;
        const today = ld.todayStats || {};
        if ((today.words || 0) > 0 || (today.time || 0) > 0) return false;
        if (config.extras && config.extras.favoriteWordLists) return false;
        return true;
    },

    // 获取用户配置文件键名
    getUserConfigKey() {
        const user = this.getCurrentUser();
        return user ? `wordMemory_user_json_${user}` : null;
    },

    // 初始化用户配置
    initUserConfig(username) {
        const key = `wordMemory_user_json_${username}`;
        // 默认配置框架（无论新建还是合并补齐后续新增字段都要用，故置于分支之外）
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
                    defaultCover: 'import'
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
                    sm2Order: 'book',
                    sm2DailyCap: 200, // 艾宾浩斯每日到期上限（平摊复习量，超出顺延次日）
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
                extras: {}, // 独立 localStorage 键镜像（收藏词单 / 授权码 / AI 模型选择等，见 MIRROR_KEYS）
                theme: 'light'
            };

        if (!localStorage.getItem(key)) {
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
            // 打上保存时间戳：供加载时与 user/ 文件比较谁更新（换端/手动替换文件后能正确取舍）
            config.updatedAt = new Date().toISOString();
            // 先同步独立键镜像（收藏词单 / 授权码 / AI 模型选择 / 练习配置等），保证 json 完整
            try { this._syncExtrasToConfig(config); } catch (e) { /* 忽略 */ }
            localStorage.setItem(key, JSON.stringify(config));
            // 实时镜像写入本地 user/ 文件夹（异步，失败不影响主流程）
            this.writeConfigToFile(config).then((ok) => {
                // 写盘成功即已落盘；失败/不可用则标记，界面会在昵称末尾显示感叹号提示
                this._setConfigDirty(!ok && this.getCurrentUser() !== '游客');
            }).catch((e) => {
                console.warn('写入本地配置文件失败:', e);
                this._setConfigDirty(this.getCurrentUser() !== '游客');
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
            // 句柄先落地到内存并置为可用：本次会话的读写只依赖它，
            // 下面 IndexedDB 持久化失败（file:// 或隐私模式下 IndexedDB 被禁用时会抛错）
            // 只能影响「下次自动恢复授权」，绝不能让已授权的目录在本会话被判为不可用
            this._dirHandle = handle;
            this._dirReady = true;
            localStorage.setItem('wordMemory_haveUserDir', '1');
            try {
                await this._idbPut('userDir', handle);
            } catch (e) {
                console.warn('目录句柄持久化失败（本次会话仍可读写，下次需重新授权）:', e);
            }
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
                return true;
            })
            .catch((e) => { console.warn('写入本地配置文件失败:', e); return false; });
        return this._writeChain;
    },

    // ============================================
    // 配置落盘状态：本地缓存是否比 user/ 文件更新（供界面提示）
    // ============================================

    _configDirty: false,

    // 最新配置是否尚未写入 user/ 文件（true = 只存在于浏览器缓存，有丢失风险）
    isConfigDirty() {
        return !!this._configDirty;
    },

    // 变更落盘状态并通知宿主界面刷新提示（游客为临时账号，不参与提示）
    _setConfigDirty(v) {
        v = !!v;
        if (this._configDirty === v) return;
        this._configDirty = v;
        try {
            if (typeof window !== 'undefined' && typeof window.__wmConfigDirtyChanged === 'function') {
                window.__wmConfigDirtyChanged(v);
            }
        } catch (e) { /* 忽略 */ }
    },

    // ============================================
    // 手动保存 / 导出 / 导入用户配置
    // ============================================

    // 立即强制落盘：取消防抖窗口，把当前配置（含 extras 镜像）写入缓存与 user/ 文件
    // 返回 { ok, file, reason }：ok 表示缓存已写入，file 表示已落到 user/ 文件
    async flushUserConfig() {
        if (this._mirrorTimer) { clearTimeout(this._mirrorTimer); this._mirrorTimer = null; }
        const key = this.getUserConfigKey();
        const config = this.getUserConfig();
        if (!key || !config) return { ok: false, file: false, reason: 'no-user' };
        config.updatedAt = new Date().toISOString(); // 手动保存即最新时间戳，换端加载时不被旧文件压制
        try { this._syncExtrasToConfig(config); } catch (e) { /* 忽略 */ }
        localStorage.setItem(key, JSON.stringify(config));
        // 手动保存发生在用户手势中：借机重新申请页面加载时无法申请的目录授权
        // （restoreUserDirectory 内的 requestPermission 必须处于手势中才会被浏览器放行）
        if (!this.isFileSystemReady()) {
            try { await this.restoreUserDirectory(); } catch (e) { /* 忽略 */ }
        }
        if (!this.isFileSystemReady()) {
            this._setConfigDirty(this.getCurrentUser() !== '游客');
            return { ok: true, file: false, reason: this.hasUserDirectory() ? 'need-permission' : 'no-dir' };
        }
        const file = await this.writeConfigToFile(config);
        this._setConfigDirty(!file && this.getCurrentUser() !== '游客');
        return { ok: true, file: !!file, reason: file ? '' : 'write-failed' };
    },

    // 导出当前账号配置（含 extras 镜像）：返回 { name, text }，未登录返回 null
    exportUserConfig() {
        const user = this.getCurrentUser();
        const config = this.getUserConfig();
        if (!user || !config) return null;
        try { this._syncExtrasToConfig(config); } catch (e) { /* 忽略 */ }
        config.username = user;
        return { name: this._userFile(user), text: JSON.stringify(config, null, 2) };
    },

    // 导入配置到当前登录账号（username 一律以当前账号为准）：返回 { ok, error }
    importUserConfig(text) {
        const user = this.getCurrentUser();
        if (!user) return { ok: false, error: '请先登录账号' };
        let config = null;
        try { config = JSON.parse(text); } catch (e) { return { ok: false, error: '文件不是有效的 JSON' }; }
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
            return { ok: false, error: '配置格式不正确' };
        }
        config.username = user;
        config.updatedAt = new Date().toISOString(); // 导入即视为最新，重新载入后不会被旧文件回退
        delete config.version;
        localStorage.setItem(`wordMemory_user_json_${user}`, JSON.stringify(config));
        this.initUserConfig(user); // 补齐后续新增字段的默认值
        const merged = this.getUserConfig();
        this._applyExtras(merged); // 回填收藏词单 / 授权码 / AI 配置等独立键
        return { ok: true, config: merged };
    },

    // 目录文件与本地缓存谁为准：决定加载时采纳哪一份
    //  - 本地无该用户配置/是空壳 → 文件为准
    //  - 任一方带 updatedAt（新版保存时写入）→ 取时间较新者
    //  - 双方都无时间戳（历史配置）→ 文件明显更完整时以文件为准
    //    （用户手动替换/拷贝进来的完整配置通常远大于残留缓存，不能反过来被缓存覆盖）
    _shouldFileWin(cache, file) {
        if (!file) return false;
        if (!cache || this._isConfigEmpty(cache)) return true;
        const ct = Date.parse(cache.updatedAt || '') || 0;
        const ft = Date.parse(file.updatedAt || '') || 0;
        if (ct || ft) return ft >= ct;
        try {
            const cl = JSON.stringify(cache).length;
            const fl = JSON.stringify(file).length;
            return fl > cl * 1.2 && (fl - cl) > 4096;
        } catch (e) { return false; }
    },

    // 采纳文件配置到本地缓存；容量不足时告警并置标记，避免随后把旧缓存反写覆盖文件
    _adoptFileConfig(name, config) {
        try {
            localStorage.setItem(`wordMemory_user_json_${name}`, JSON.stringify(config));
            this._adoptFailed = false;
            return true;
        } catch (e) {
            this._adoptFailed = true;
            console.warn('配置文件写入本地缓存失败（本次以文件数据为准，不会反写覆盖文件）:', e);
            return false;
        }
    },

    // 从 user/ 目录读取当前用户配置（文件更新时以文件为准；否则保留本地最新数据）
    async loadConfigFromFile(username) {
        const name = username || this.getCurrentUser();
        if (!name || name === '游客' || !this.isFileSystemReady()) return null;
        const cache = this._parseJson(localStorage.getItem(`wordMemory_user_json_${name}`));
        // 桥接模式：走内置服务读取
        if (!this._hasDirAccess()) {
            try {
                const res = await fetch('/__wm__/user?name=' + encodeURIComponent(this._bridgeUserName(name)), { cache: 'no-store' });
                if (!res.ok) return null;
                const config = await res.json();
                if (config && config.username) {
                    if (this._shouldFileWin(cache, config)) this._adoptFileConfig(name, config);
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
                // 文件比本地缓存新（含用户手动替换文件）时采纳文件；
                // 否则以 localStorage 为准，避免并发写入残留的旧文件把最新数据冲掉。
                if (this._shouldFileWin(cache, config)) this._adoptFileConfig(name, config);
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
        this._installMirrorHook(); // 保证刷新后继续镜像独立键（登录时 setCurrentUser 已安装，此处兜底）
        this._adoptFailed = false;
        const user = username || this.getCurrentUser();
        if (user && user !== '游客') {
            // 有目录/桥接时按「文件与缓存谁更新」取舍，再补齐新增字段
            if (this.isFileSystemReady()) await this.loadConfigFromFile(user);
            this.initUserConfig(user);
            const key = `wordMemory_user_json_${user}`;
            try {
                const config = JSON.parse(localStorage.getItem(key));
                if (config) {
                    // 回填独立键（收藏词单 / 欧路授权码 / AI 模型选择 / 练习配置等），
                    // 否则换端加载配置后这些数据仍停留在旧端缓存里
                    this._applyExtras(config);
                    // 反向：本机已有但配置里缺的独立键（老账号首次升级）也要收进 extras
                    this._syncExtrasToConfig(config);
                    // 缓存未能承载文件数据时跳过反写，否则会用旧缓存覆盖掉更大的新文件
                    if (!this._adoptFailed) this.saveUserConfig(config);
                }
            } catch (e) { /* 忽略 */ }
        }
        // 本次会话无法写盘时标记「未落盘」，界面据此在昵称末尾提示手动保存
        // （游客为临时账号，文件本就不持久化，不提示）
        this._setConfigDirty(!!user && user !== '游客' && !this.isFileSystemReady());
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
        const prev = existingIndex >= 0 ? history[existingIndex] : null;

        const historyItem = {
            date: date, time: stats.time || 0, words: stats.words || 0,
            correct: stats.correct || 0, wrong: stats.wrong || 0,
            mastery: mastery, timestamp: new Date().toISOString(),
            // 每日掌握分布快照（三桶计数，增量极小）；同日已有则沿用，避免每次答题都重算
            efBuckets: (prev && prev.efBuckets) ? prev.efBuckets : this.computeEfBuckets()
        };
        
        if (existingIndex >= 0) history[existingIndex] = historyItem;
        else history.push(historyItem);
        
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        // 完整保留全部历史（原先截断为最近 90 天，会让「学习天数/累计时长/累计单词」不完整）
        config.learningData.statsHistory = history;
        
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

    // 概要卡片：天数/时长/单词取「全部历史记录」（与图表的时间范围切换无关），
    // 平均正确率取近 7 天以反映近期状态，并给出与历史平均正确率的差值（±n%）
    getStatsSummary() {
        const hasRecord = item =>
            (item.time || 0) > 0 || (item.words || 0) > 0 || (item.correct || 0) > 0 || (item.wrong || 0) > 0;
        const all = (this.loadStatsHistory() || []).filter(hasRecord);
        const recent = this.getRecentStats(7).filter(hasRecord);

        const rate = list => {
            const attempts = list.reduce((s, i) => s + (i.correct || 0) + (i.wrong || 0), 0);
            return attempts > 0 ? Math.round(list.reduce((s, i) => s + (i.correct || 0), 0) / attempts * 100) : null;
        };
        const recentAccuracy = rate(recent);
        const overallAccuracy = rate(all);

        return {
            totalDays: all.length,
            totalTime: all.reduce((s, i) => s + (i.time || 0), 0),
            totalWords: all.reduce((s, i) => s + (i.words || 0), 0),
            recentAccuracy,          // null = 近 7 天无答题记录
            overallAccuracy,         // null = 历史无答题记录
            // 近期相对历史平均正确率的差：正=上升，负=下降，null=无历史可比
            accuracyDelta: (recentAccuracy === null || overallAccuracy === null) ? null : recentAccuracy - overallAccuracy
        };
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

    // 一次性迁移：把存量错误次数按词书归类到 wrongByMode 三桶
    // （选错 select / 拼错 spell / 忘记 remember），后续错误按作答时的实际模式累加，
    // 总错误数仍以 wrongTimes 为准、三桶加总等于它。归类规则（用户指定）：
    // 扇贝考研→选错，百词斩→拼错，不背单词→忘记；其余词书按其 learningMode 首项。
    // 幂等：已带 wrongByMode 或已迁移标记的词书跳过。
    migrateWrongByMode() {
        const currentKey = this.getUserConfigKey();
        const prefix = 'wordMemory_user_json_';
        // 词书名 → 错误模式桶
        const nameMap = { '扇贝考研': 'select', '百词斩': 'spell', '不背单词': 'remember' };
        let changedUsers = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || key.indexOf(prefix) !== 0) continue;
            let config = null;
            try { config = JSON.parse(localStorage.getItem(key)); } catch (e) { continue; }
            if (!config || typeof config !== 'object' || !config.bookList || !Array.isArray(config.bookList.books)) continue;
            if (config.learningData && config.learningData.wrongModeMigrated) continue;
            let changed = false;
            config.bookList.books.forEach(book => {
                // 先按词书名命中三桶；未命中则按词书背诵模式首项
                let bucket = nameMap[book.name];
                if (!bucket) {
                    let m = book.learningMode;
                    if (!Array.isArray(m)) m = String(m || '').split(',');
                    const first = String(m[0] || '').trim();
                    bucket = first === 'spellOnly' ? 'spell' : (first === 'rememberOnly' ? 'remember' : 'select');
                }
                (book.words || []).forEach(w => {
                    if (!w || !(w.wrongTimes > 0) || w.wrongByMode) return;
                    w.wrongByMode = { select: 0, spell: 0, remember: 0 };
                    w.wrongByMode[bucket] = w.wrongTimes;
                    changed = true;
                });
            });
            if (!changed) {
                // 无存量错误也要写入标记，避免下次再全量扫描
                config.learningData = config.learningData || {};
                config.learningData.wrongModeMigrated = true;
                try { localStorage.setItem(key, JSON.stringify(config)); } catch (e) { continue; }
                continue;
            }
            config.learningData = config.learningData || {};
            config.learningData.wrongModeMigrated = true;
            try { localStorage.setItem(key, JSON.stringify(config)); } catch (e) { continue; }
            changedUsers++;
            // 当前登录用户同步写入 user/ 目录镜像
            if (key === currentKey) {
                this.writeConfigToFile(config).catch(() => { /* 文件镜像失败不影响主流程 */ });
            }
        }
        if (changedUsers) console.log(`✅ 错误次数细分迁移完成：已更新 ${changedUsers} 个用户配置`);
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

    // 各练习模式的 EF 加分权重，仅作用于 EF 上升（Δ>0）；答错/用提示的扣分恒为原始值不缩放
    // （答错是强证据，不该因模式简单而轻罚）。权重按「记忆提取难度」定：
    // 选义有 4 个选项可蒙对（弱证据）→ 0.5；记得么开放式回忆但自评 → 0.8；
    // 选义 Pro 干扰项形近、蒙对率≈0（基准）→ 1.0；拼写无提示产出（强证据）→ 1.2。
    // 注：q=4 时 Δ=0，权重乘上去仍为 0，故「犹豫着答对」不受模式影响。
    SM2_MODE_GAIN: { select: 0.5, remember: 0.8, selectPro: 1.0, spell: 1.2 },

    // 各练习模式的平均练习时间换算权重：把不同模式的原始耗时折算为「联想时间」，
    // 使跨模式的平均耗时可比（拼写含打字机械耗时，乘 0.7 归一；选义 Pro 干扰项形近、
    // 辨识更久，乘 0.8；选义/记得么为基准 1）。
    TIME_MODE_GAIN: { select: 1, spell: 0.7, remember: 1, selectPro: 0.8 },

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

    // 艾宾浩斯复习顺序：'book'＝按词书分组(默认) / 'overdue'＝全局逾期最久优先 / 'ef'＝EF 由低到高（越易忘越先）
    SM2_ORDERS: ['book', 'overdue', 'ef'],

    /** 读取艾宾浩斯复习顺序（异常值回落默认 'book'） */
    getSm2Order() {
        const config = this.getUserConfig();
        const order = config && config.learningData ? config.learningData.sm2Order : null;
        return this.SM2_ORDERS.indexOf(order) >= 0 ? order : 'book';
    },

    /** 保存艾宾浩斯复习顺序 */
    saveSm2Order(order) {
        const config = this.getUserConfig();
        if (!config) return false;
        if (this.SM2_ORDERS.indexOf(order) < 0) order = 'book';
        if (!config.learningData) config.learningData = {};
        config.learningData.sm2Order = order;
        return this.saveUserConfig(config);
    },

    /** 艾宾浩斯每日到期上限（50-500，默认 200）：超出部分顺延、次日优先复习 */
    getSm2DailyCap() {
        const config = this.getUserConfig();
        const cap = config && config.learningData ? config.learningData.sm2DailyCap : null;
        const n = parseInt(cap, 10);
        return (n >= 50 && n <= 500) ? n : 200;
    },

    /** 保存艾宾浩斯每日到期上限 */
    saveSm2DailyCap(cap) {
        const config = this.getUserConfig();
        if (!config) return false;
        const n = parseInt(cap, 10);
        if (!config.learningData) config.learningData = {};
        config.learningData.sm2DailyCap = (n >= 50 && n <= 500) ? n : 200;
        return this.saveUserConfig(config);
    },

    /**
     * SM-2 算法核心
     * @param {number} quality - 记忆质量 0-5
     * @param {object} prevMemory - 先前的记忆状态（或 null）
     * @param {number} [gainScale=1] - 该练习模式的 EF 加分权重（见 SM2_MODE_GAIN），仅缩放上升
     * @returns {object} 更新后的记忆状态
     */
    sm2(quality, prevMemory, gainScale) {
        const mem = prevMemory ? { ...prevMemory, history: prevMemory.history ? [...prevMemory.history] : [] } : this._defaultMemory();

        // 更新 EF (易变因子)：基础增量 Δ = 0.1 - (5-q)(0.08 + 0.02(5-q))
        // q=5 → +0.10，q=4 → 0，q=3 → -0.14，q=1 → -0.54
        const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        const scale = (delta > 0 && gainScale > 0) ? gainScale : 1;
        mem.ef = mem.ef + delta * scale;
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

    /** 获取今日到期复习的单词列表
     *  options.ahead=true：取「明日到期」（超前练习用，排除今日已到期）
     *  options.cap：每日到期上限（平摊复习量，超出部分顺延次日优先） */
    getDueWords(options = {}) {
        const { bookId, limit, ahead, cap } = options;
        const map = this.loadAllMemory();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 86400000);
        const results = [];

        for (const [key, mem] of Object.entries(map)) {
            if (!mem.nextReviewDate) continue;
            if (mem.blacklist) continue; // 「太简单」的词不再进入复习
            const [keyBookId, word] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
            if (bookId && keyBookId !== bookId) continue;

            const due = new Date(mem.nextReviewDate);
            // ahead：仅取明日到期；否则取今日及以前到期
            const inScope = ahead ? (due > today && due <= tomorrow) : (due <= today);
            if (!inScope) continue;
            results.push({ bookId: keyBookId, word, memory: mem });
        }

        // 按到期时间排序（最急的先）
        results.sort((a, b) => new Date(a.memory.nextReviewDate) - new Date(b.memory.nextReviewDate));

        // 每日上限：超出部分顺延（次日仍到期，按逾期最久优先自然排在前列）
        let list = results;
        if (cap && cap > 0 && list.length > cap) list = list.slice(0, cap);
        return limit ? list.slice(0, limit) : list;
    },

    /** 每日掌握分布快照：按当前 EF 三桶统计已记忆单词数（排除「太简单」黑名单）
     *  阈值对齐 SM-2 基准 2.5：掌握 ≥2.5 / 模糊 2.0–2.5 / 薄弱 <2.0 */
    computeEfBuckets() {
        const map = this.loadAllMemory();
        const b = { strong: 0, fuzzy: 0, weak: 0 };
        for (const key of Object.keys(map)) {
            const mem = map[key];
            if (!mem || mem.blacklist) continue;
            const ef = (mem.ef != null) ? mem.ef : 2.5;
            if (ef >= 2.5) b.strong++;
            else if (ef >= 2.0) b.fuzzy++;
            else b.weak++;
        }
        return b;
    },

    /** 获取所有单词的复习统计概览 */
    getMemoryOverview() {
        const map = this.loadAllMemory();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalWords = 0;
        let avgEF = 0, avgInterval = 0;

        for (const mem of Object.values(map)) {
            // 「太简单」黑名单词不再参与学习，按全局口径排除出统计（与图表/日报快照/到期队列一致），
            // 否则「已记忆」会大于图表「已学」，虚高
            if (!mem || mem.blacklist) continue;
            totalWords++;
            avgEF += mem.ef || 2.5;
            avgInterval += mem.interval || 0;
        }

        // 到期数与「开始复习」按钮共用 getDueWords 同一口径（含排除「太简单」标记），
        // 两处必须同源：否则面板显示的「今日到期」会与实际可复习数量对不上
        const dueWords = this.getDueWords();
        const overdueLine = new Date(today.getTime() - 86400000);
        const overdue = dueWords.filter(it => new Date(it.memory.nextReviewDate) < overdueLine).length;

        return {
            totalWords,
            dueToday: dueWords.length,
            overdue,
            avgEF: totalWords > 0 ? (avgEF / totalWords).toFixed(2) : '2.50',
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

// 立即安装独立键镜像钩子：任一加载本模块的页面（含 Obsidian 侧栏 iframe）写镜像键时都能同步进用户配置
if (typeof localStorage !== 'undefined' && typeof Storage._installMirrorHook === 'function') {
    Storage._installMirrorHook();
}