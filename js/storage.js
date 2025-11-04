// ============================================
// 本地存储管理模块
// ============================================

const Storage = {
    // 存储键名
    KEYS: {
        WORDS: 'wordMemory_words', // 已废弃，保留兼容性
        BOOKS: 'wordMemory_books', // 新：词书列表
        CURRENT_BOOK: 'wordMemory_currentBook', // 当前选中的词书
        PROGRESS: 'wordMemory_progress',
        SETTINGS: 'wordMemory_settings',
        STATS: 'wordMemory_stats',
        REVIEW: 'wordMemory_review',
        THEME: 'wordMemory_theme'
    },

    // 保存数据
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('存储失败:', e);
            return false;
        }
    },

    // 读取数据
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('读取失败:', e);
            return defaultValue;
        }
    },

    // 删除数据
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('删除失败:', e);
            return false;
        }
    },

    // 清空所有数据
    clear() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.error('清空失败:', e);
            return false;
        }
    },

    // 保存单词列表
    saveWords(words) {
        return this.save(this.KEYS.WORDS, words);
    },

    // 读取单词列表
    loadWords() {
        return this.load(this.KEYS.WORDS, []);
    },

    // 保存学习进度
    saveProgress(progress) {
        return this.save(this.KEYS.PROGRESS, progress);
    },

    // 读取学习进度
    loadProgress() {
        return this.load(this.KEYS.PROGRESS, {
            currentIndex: 0,
            learned: [],
            correct: [],
            wrong: [],
            unknown: []
        });
    },

    // 保存设置
    saveSettings(settings) {
        return this.save(this.KEYS.SETTINGS, settings);
    },

    // 读取设置
    loadSettings() {
        return this.load(this.KEYS.SETTINGS, {
            learningMode: 'mixed', // mixed, selectOnly, spellOnly
            wordOrder: 'sequential', // sequential, random
            wordsPerSession: 20,
            noAnswerProbability: 10, // 无正确答案出现概率（0-20%）
            voiceAccent: 'en-US',
            voiceModel: '', // 声优模型（如果可用）
            voiceRate: 1.0, // 语速（0.5-2.0）
            autoSound: true,
            enableSoundEffects: true, // 音效提示开关
            animationType: 'particles', // 动画类型
            animationLevel: 'medium',
            autoNext: true,
            autoNextTime: 3, // 自动切换时间（秒）
            hotkeys: {
                option1: '1',
                option2: '2',
                option3: '3',
                option4: '4',
                option5: '5',
                option6: '6'
            } // 选项快捷键
        });
    },

    // 保存统计数据
    saveStats(stats) {
        return this.save(this.KEYS.STATS, stats);
    },

    // 读取统计数据
    loadStats() {
        const today = new Date().toDateString();
        const stats = this.load(this.KEYS.STATS, {});
        
        // 如果不是今天的数据，重置
        if (stats.date !== today) {
            return {
                date: today,
                time: 0, // 学习时长（分钟）
                words: 0, // 学习单词数
                correct: 0, // 正确数
                wrong: 0, // 错误数
                mastery: 0 // 掌握率
            };
        }
        
        return stats;
    },

    // 更新统计数据
    updateStats(updates) {
        const stats = this.loadStats();
        const newStats = { ...stats, ...updates };
        
        // 计算掌握率
        if (newStats.words > 0) {
            newStats.mastery = Math.round((newStats.correct / newStats.words) * 100);
        }
        
        this.saveStats(newStats);
        return newStats;
    },

    // 保存复习列表
    saveReview(reviewList) {
        return this.save(this.KEYS.REVIEW, reviewList);
    },

    // 读取复习列表
    loadReview() {
        return this.load(this.KEYS.REVIEW, []);
    },

    // 添加到复习列表（基于艾宾浩斯遗忘曲线）
    addToReview(word, reviewCount = 0) {
        const reviewList = this.loadReview();
        
        // 复习间隔（天）：1, 2, 4, 7, 15
        const intervals = [1, 2, 4, 7, 15];
        const interval = intervals[Math.min(reviewCount, intervals.length - 1)];
        
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        
        // 查找是否已存在
        const existingIndex = reviewList.findIndex(item => item.word === word.word);
        
        const reviewItem = {
            ...word,
            reviewCount: reviewCount + 1,
            nextReviewDate: nextReviewDate.toISOString(),
            lastReviewDate: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            reviewList[existingIndex] = reviewItem;
        } else {
            reviewList.push(reviewItem);
        }
        
        this.saveReview(reviewList);
    },

    // 获取今日需要复习的单词
    getTodayReview() {
        const reviewList = this.loadReview();
        const today = new Date();
        
        return reviewList.filter(item => {
            const nextReviewDate = new Date(item.nextReviewDate);
            return nextReviewDate <= today;
        });
    },

    // 保存主题
    saveTheme(theme) {
        return this.save(this.KEYS.THEME, theme);
    },

    // 读取主题
    loadTheme() {
        return this.load(this.KEYS.THEME, 'light');
    },

    // ============================================
    // 词书管理
    // ============================================

    // 保存所有词书
    saveBooks(books) {
        return this.save(this.KEYS.BOOKS, books);
    },

    // 读取所有词书
    loadBooks() {
        return this.load(this.KEYS.BOOKS, []);
    },

    // 添加词书
    addBook(book) {
        const books = this.loadBooks();
        
        // 学习相关的emoji列表
        const learningEmojis = [
            '📕', '📗', '📘', '📙', '📚', '📖', '📝', '✏️', '✒️', '🖊️',
            '🖍️', '📓', '📔', '📒', '📃', '📄', '📰', '🗞️', '📑', '🔖',
            '🎓', '🎯', '💡', '🧠', '📊', '📈', '🎨', '🌟', '⭐', '✨'
        ];
        
        // 随机选择一个emoji
        const randomIcon = learningEmojis[Math.floor(Math.random() * learningEmojis.length)];
        
        const newBook = {
            id: Date.now().toString(),
            name: book.name || '未命名词书',
            icon: book.icon || randomIcon, // 添加emoji图标
            words: book.words || [],
            createdAt: new Date().toISOString(),
            lastPracticeAt: null, // 最后练习时间
            round: 1, // 当前轮数
            progress: {
                currentIndex: 0,
                learned: [],
                correct: [],
                wrong: [],
                sequence: [] // 学习顺序（支持正序/乱序）
            }
        };
        books.push(newBook);
        this.saveBooks(books);
        return newBook;
    },

    // 更新词书
    updateBook(bookId, updates) {
        const books = this.loadBooks();
        const index = books.findIndex(b => b.id === bookId);
        if (index >= 0) {
            books[index] = { ...books[index], ...updates };
            this.saveBooks(books);
            return books[index];
        }
        return null;
    },

    // 删除词书
    deleteBook(bookId) {
        const books = this.loadBooks();
        const filtered = books.filter(b => b.id !== bookId);
        this.saveBooks(filtered);
        return filtered;
    },

    // 获取词书
    getBook(bookId) {
        const books = this.loadBooks();
        return books.find(b => b.id === bookId);
    },

    // 保存当前词书ID
    saveCurrentBook(bookId) {
        return this.save(this.KEYS.CURRENT_BOOK, bookId);
    },

    // 读取当前词书ID
    loadCurrentBook() {
        return this.load(this.KEYS.CURRENT_BOOK, null);
    },

    // 更新词书进度
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

    // 生成学习顺序（支持正序/乱序）
    generateSequence(bookId, order = 'sequential') {
        const book = this.getBook(bookId);
        if (!book) return [];

        const totalWords = book.words.length;
        let sequence = [];

        if (order === 'random') {
            // 乱序：生成随机顺序
            sequence = Array.from({ length: totalWords }, (_, i) => i);
            // Fisher-Yates 洗牌算法
            for (let i = sequence.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
            }
        } else {
            // 正序：按原顺序
            sequence = Array.from({ length: totalWords }, (_, i) => i);
        }

        // 保存顺序到进度中
        this.updateBookProgress(bookId, { sequence });
        return sequence;
    },

    // 迁移旧数据到词书系统
    migrateOldWords() {
        const oldWords = this.loadWords();
        if (oldWords && oldWords.length > 0) {
            const books = this.loadBooks();
            // 如果已经有词书，不迁移
            if (books.length === 0) {
                this.addBook({
                    name: '导入的单词',
                    words: oldWords
                });
                console.log('已迁移旧单词到词书系统');
            }
        }
    },

    // 格式化时间显示
    formatTimeAgo(isoString) {
        if (!isoString) return '';
        
        const now = new Date();
        const past = new Date(isoString);
        const diffMs = now - past;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        const hours = past.getHours().toString().padStart(2, '0');
        const minutes = past.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        if (diffDays === 0) {
            // 今天
            return `今天 ${timeStr}`;
        } else if (diffDays === 1) {
            // 昨天
            return `昨天 ${timeStr}`;
        } else if (diffDays < 7) {
            // 3-6天前
            return `${diffDays}天前`;
        } else if (diffDays < 30) {
            // 1-4周前
            const weeks = Math.floor(diffDays / 7);
            return weeks === 1 ? '1周前' : `${weeks}周前`;
        } else if (diffDays < 90) {
            // 1-3个月前
            const months = Math.floor(diffDays / 30);
            return months === 1 ? '1个月前' : `${months}个月前`;
        } else {
            // 显示日期 YY/MM/DD
            const year = past.getFullYear().toString().slice(-2);
            const month = (past.getMonth() + 1).toString().padStart(2, '0');
            const day = past.getDate().toString().padStart(2, '0');
            return `${year}/${month}/${day}`;
        }
    }
};

// 导出为全局变量
window.Storage = Storage;

