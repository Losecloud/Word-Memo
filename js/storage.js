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
        autoSaveStats: 'learningData'
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

    // 目录句柄是否可用（已获得读写授权）
    isFileSystemReady() {
        return !!(this._dirHandle && this._dirReady);
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
        if (!window.showDirectoryPicker) {
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
        return localStorage.getItem('wordMemory_haveUserDir') === '1';
    },

    // 从 IndexedDB 恢复目录句柄并申请授权
    async restoreUserDirectory() {
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
        return this.saveUserConfig(config);
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
    }
};

window.Storage = Storage;