// ============================================
// 词忆 - 主应用逻辑
// ============================================

class WordMemoryApp {
    constructor() {
        this.books = []; // 所有词书
        this.currentBook = null; // 当前选中的词书
        this.currentSettingsBookId = null; // 当前设置的词书ID
        this.currentWordIndex = 0;
        this.currentMode = 'select'; // select 或 spell
        this.sessionWords = [];
        this.sessionResults = {
            correct: 0,
            wrong: 0,
            unknown: 0
        };
        this.wordResults = []; // 记录每个单词的答题结果（用于异色进度条）
        this.wordFirstResults = []; // 记录每个单词的初次答题结果（用于上一题标记）
        this.hintUsedForWords = []; // 记录每个单词是否使用过提示
        this.lastWordInfo = null; // 记录上一题的单词信息
        this.settings = Storage.loadSettings();
        this.hintCount = 3;
        this.startTime = null;
        this.autoNextTimer = null;
        this.capsLockOn = false; // Caps Lock状态
        this.availableVoices = []; // 可用的声优列表
        this.speechSynthesisActivated = false; // 【Win11修复】标记speechSynthesis是否已激活
        this.cefrData = null; // CEFR词汇数据
        this.sessionStartIndex = 0; // 本次学习开始的索引
        this.sessionStatsRecorded = {
            correct: 0,
            wrong: 0,
            unknown: 0
        }; // 本次session已经记录到今日统计的数量，避免重复计数
        this.statsDisplayTimer = null; // 今日统计显示更新定时器（每秒更新显示，不保存）
        this.isReviewMode = false; // 是否处于复习模式
        this.reviewingWrongCount = 0; // 正在复习的错题数量
        this.isWordListEditMode = false; // 单词表是否处于编辑模式
        this.currentWordListBookId = null; // 当前浏览的词书ID
        this.currentExample = ''; // 当前显示的例句文本（用于重新播放）
        
        // AI工坊相关
        this.selectedKeywords = []; // 选中的关键词
        this.selectedBooks = []; // 选中的词单
        this.currentStory = null; // 当前生成的故事
        this.currentQuestions = []; // 当前题目
        this.userAnswers = {}; // 用户答案
        this.keywordInputTimer = null; // 输入计时器
        
        // 同义词练习相关
        this.synonymDocs = []; // 文档列表（支持多文档缓存）
        this.synonymCurrentDocId = null; // 当前选中的文档ID
        this.synonymData = []; // 当前文档的同义词数据
        this.synonymWords = []; // 当前练习的单词列表
        this.synonymCurrentIndex = 0; // 当前题目索引
        this.synonymCurrentWord = null; // 当前单词
        this.synonymUserSelections = []; // 用户选择
        this.synonymResults = []; // 答题结果
        
        // Emoji数据
        this.emojiData = this.initEmojiData();
        this.currentEmojiCategory = 'all';
        
        // 确保音效设置有默认值（兼容旧数据）
        if (this.settings.enableSoundEffects === undefined) {
            this.settings.enableSoundEffects = true;
            Storage.saveSettings(this.settings);
            console.log('✨ 已为旧数据启用音效开关（默认开启）');
        }
        
        // 初始化音效
        this.initSoundEffects();
        
        this.init();
    }

    // 初始化
    init() {
        this.initTheme();
        this.initEventListeners();
        this.loadCEFRData(); // 加载CEFR数据
        this.migrateOldData(); // 迁移旧数据
        this.fixHistoryData(); // 修复历史统计数据
        this.loadBooks(); // 加载词书列表
        this.updateStats();
        this.checkReview();
        this.loadAvailableVoices();
    }

    // ============================================
    // 统一的页面管理机制
    // ============================================
    
    /**
     * 隐藏所有主页面
     */
    hideAllMainScreens() {
        const screens = [
            'welcomeScreen',
            'wordEditorScreen',
            'learningScreen',
            'completionScreen',
            'aiWorkshopScreen',
            'wordListScreen'
        ];
        
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('hidden');
            }
        });
    }
    
    /**
     * 显示指定的主页面（自动隐藏其他所有页面）
     * @param {string} screenId - 要显示的页面ID
     */
    showScreen(screenId) {
        this.hideAllMainScreens();
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
        }
    }

    // 加载CEFR数据
    loadCEFRData() {
        try {
            // 使用全局变量CEFR_DATA（已在cefr-data.js中定义）
            if (typeof CEFR_DATA !== 'undefined') {
                this.cefrData = CEFR_DATA;
                console.log('CEFR数据加载成功');
            } else {
                console.warn('CEFR_DATA未定义，请确保cefr-data.js已正确加载');
                this.cefrData = null;
            }
        } catch (error) {
            console.error('CEFR数据加载失败:', error);
            this.cefrData = null;
        }
    }

    // 获取单词的CEFR等级
    getWordCEFRLevel(word) {
        if (!this.cefrData || !word) return null;
        
        const lowerWord = word.toLowerCase();
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        
        for (const level of levels) {
            if (this.cefrData[level] && this.cefrData[level].includes(lowerWord)) {
                return level;
            }
        }
        
        return null;
    }

    // 初始化主题
    initTheme() {
        const theme = Storage.loadTheme();
        document.documentElement.setAttribute('data-theme', theme);
    }

    // 初始化事件监听
    initEventListeners() {
        // 上传按钮
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // 文件选择
        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // 拖拽上传
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        // 使用示例单词
        document.getElementById('useDemoBtn').addEventListener('click', () => {
            this.loadDemoWords();
        });

        // 添加词书
        document.getElementById('addBookBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // 下载模板
        document.getElementById('downloadTemplate').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadTemplate();
        });

        // 开始学习
        document.getElementById('startLearningBtn').addEventListener('click', () => {
            this.startLearning();
        });

        // 暗黑模式切换
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 设置按钮
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        // 关闭设置
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.closeSettings();
        });

        // 设置选项卡切换
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchSettingsTab(targetTab);
            });
        });

        document.getElementById('modalOverlay').addEventListener('click', () => {
            this.closeSettings();
        });

        // 保存设置
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        // 恢复默认设置
        document.getElementById('resetSettingsBtn').addEventListener('click', () => {
            this.resetSettings();
        });

        // 学习页面控制
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextWord();
        });

        document.getElementById('skipBtn').addEventListener('click', () => {
            this.skipWord();
        });

        document.getElementById('exitLearningBtn').addEventListener('click', () => {
            this.exitLearning();
        });

        // 发音按钮
        document.getElementById('soundBtn1').addEventListener('click', () => {
            this.playSound();
        });

        document.getElementById('soundBtn2').addEventListener('click', () => {
            this.playSound();
        });

        // 拼写模式控制
        document.getElementById('spellInput').addEventListener('input', (e) => {
            this.handleSpellInput(e.target.value);
        });

        document.getElementById('hintBtn').addEventListener('click', () => {
            this.showHint();
        });

        document.getElementById('unknownSpellBtn').addEventListener('click', () => {
            this.skipSpellWord();
        });

        // 监听Caps Lock状态
        document.addEventListener('keydown', (e) => {
            if (e.getModifierState) {
                this.capsLockOn = e.getModifierState('CapsLock');
            }
            
            // 选择模式快捷键监听
            if (this.currentMode === 'select' && !document.getElementById('modeSelectMeaning').classList.contains('hidden')) {
                this.handleHotkeyPress(e);
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.getModifierState) {
                this.capsLockOn = e.getModifierState('CapsLock');
            }
        });

        // 完成页面按钮
        document.getElementById('reviewWrongBtn').addEventListener('click', () => {
            this.reviewWrongWords();
        });

        // continueBtn 的事件监听器已在 showCompletion 中动态设置
        // 因为它可能是"继续学习"或"开启新一轮"

        document.getElementById('backHomeBtn').addEventListener('click', () => {
            // 保存学习进度后返回首页
            this.updateBookLearningProgress();
            this.backToHome();
        });

        // 词书设置相关事件
        document.getElementById('closeBookSettingsBtn').addEventListener('click', () => {
            this.closeBookSettings();
        });

        document.getElementById('bookSettingsOverlay').addEventListener('click', () => {
            this.closeBookSettings();
        });

        document.getElementById('changeIconBtn').addEventListener('click', () => {
            this.openEmojiPicker();
        });

        document.getElementById('renameBookBtn').addEventListener('click', () => {
            this.renameBook();
        });

        document.getElementById('toggleOrderBtn').addEventListener('click', () => {
            this.toggleBookOrder();
        });
        
        // Emoji选择器相关事件
        document.getElementById('closeEmojiPickerBtn').addEventListener('click', () => {
            this.closeEmojiPicker();
        });
        
        document.getElementById('emojiPickerOverlay').addEventListener('click', () => {
            this.closeEmojiPicker();
        });
        
        // Emoji分类切换
        document.querySelectorAll('.emoji-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.emoji-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterEmojisByCategory(btn.dataset.category);
            });
        });
        
        // Emoji搜索
        document.getElementById('emojiSearchInput').addEventListener('input', (e) => {
            this.searchEmojis(e.target.value);
        });

        document.getElementById('exportBookBtn').addEventListener('click', () => {
            this.exportBook();
        });

        // 浏览词单
        document.getElementById('browseWordListBtn').addEventListener('click', () => {
            this.showWordList();
        });

        // 关闭单词表页面
        document.getElementById('closeWordListBtn').addEventListener('click', () => {
            this.closeWordList();
        });

        // 导出单词表（复用导出功能）
        document.getElementById('exportWordListBtn').addEventListener('click', () => {
            this.exportBook();
        });

        // 补缺按钮
        document.getElementById('fillMissingBtn').addEventListener('click', () => {
            this.fillMissingFields();
        });

        // 切换单词表编辑模式
        document.getElementById('toggleEditModeBtn').addEventListener('click', () => {
            this.toggleWordListEditMode();
        });

        // 学习模式中的收藏按钮
        document.getElementById('favoriteBtn1').addEventListener('click', () => {
            this.toggleFavorite();
        });

        document.getElementById('favoriteBtn2').addEventListener('click', () => {
            this.toggleFavorite();
        });

        // AI工坊相关事件
        document.getElementById('aiWorkshopBtn').addEventListener('click', () => {
            this.openAiWorkshop();
        });

        document.getElementById('closeAiWorkshopBtn').addEventListener('click', () => {
            this.closeAiWorkshop();
        });
        
        // 工坊应用卡片点击事件
        document.querySelectorAll('.workshop-app-card').forEach(card => {
            card.addEventListener('click', () => {
                const appName = card.dataset.app;
                this.openWorkshopApp(appName);
            });
        });
        
        // 返回工坊按钮
        document.getElementById('backToWorkshopBtn').addEventListener('click', () => {
            this.showWorkshopHome();
        });
        
        // 同义词练习事件
        document.getElementById('synonymAddDocBtn').addEventListener('click', () => {
            document.getElementById('synonymFileInput').click();
        });

        document.getElementById('synonymFileInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleSynonymFileUpload(e.target.files[0]);
                e.target.value = ''; // 重置以允许上传相同文件名
            }
        });

        document.getElementById('startSynonymBtn').addEventListener('click', () => {
            this.startSynonymPractice();
        });

        document.getElementById('synonymSoundBtn').addEventListener('click', () => {
            this.playSynonymAudio();
        });

        document.getElementById('synonymSubmitBtn').addEventListener('click', () => {
            this.submitSynonymAnswer();
        });

        document.getElementById('synonymSkipBtn').addEventListener('click', () => {
            this.skipSynonymWord();
        });

        document.getElementById('synonymExitBtn').addEventListener('click', () => {
            this.exitSynonymPractice();
        });

        document.getElementById('synonymRestartBtn').addEventListener('click', () => {
            this.restartSynonymPractice();
        });

        document.getElementById('synonymBackBtn').addEventListener('click', () => {
            this.showWorkshopHome();
        });
        
        document.getElementById('synonymReviewBtn').addEventListener('click', () => {
            this.reviewSynonymErrors();
        });

        // 题材切换逻辑
        document.getElementById('storyGenre').addEventListener('change', (e) => {
            this.updateThemeOptions(e.target.value);
        });
        
        // 初始化默认题材的主题选项
        this.updateThemeOptions('外文刊物');

        document.getElementById('generateStoryBtn').addEventListener('click', () => {
            this.generateStory();
        });
        
        document.getElementById('useDemoStoryBtn').addEventListener('click', () => {
            this.useDemoStory();
        });
        
        document.getElementById('autoSelectBtn').addEventListener('click', () => {
            this.autoSelectKeywords();
        });
        
        document.getElementById('keywordInput').addEventListener('input', (e) => {
            this.handleKeywordInput(e.target.value);
        });
        
        // Tab切换
        document.querySelectorAll('.keyword-mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchKeywordMode(tab.dataset.mode);
            });
        });

        document.getElementById('regenerateStoryBtn').addEventListener('click', () => {
            this.generateStory();
        });

        document.getElementById('showQuestionsBtn').addEventListener('click', () => {
            this.showQuestions();
        });

        document.getElementById('backToStoryBtn').addEventListener('click', () => {
            this.backToStory();
        });
        
        // 双页展示按钮
        document.getElementById('toggleDualViewBtn').addEventListener('click', () => {
            this.toggleDualView();
        });

        document.getElementById('submitAnswersBtn').addEventListener('click', () => {
            this.submitAnswers();
        });

        document.getElementById('reviewQuestionsBtn').addEventListener('click', () => {
            this.reviewQuestions();
        });

        document.getElementById('newStoryBtn').addEventListener('click', () => {
            this.newStory();
        });

        document.getElementById('exitExamBtn').addEventListener('click', () => {
            this.exitExam();
        });

        document.getElementById('exitExamBtn2').addEventListener('click', () => {
            this.exitExam();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // 修复拼写模式焦点丢失问题
        // 1. 窗口获得焦点时，如果在拼写模式，自动聚焦输入框
        window.addEventListener('focus', () => {
            this.refocusSpellInput();
        });

        // 2. 点击拼写卡片区域时，自动聚焦输入框
        document.addEventListener('click', (e) => {
            // 检查是否点击了拼写模式的卡片区域
            const spellMode = document.getElementById('modeSpellWord');
            if (spellMode && !spellMode.classList.contains('hidden')) {
                // 如果点击的不是按钮或输入框，则重新聚焦
                if (!e.target.closest('button') && !e.target.closest('input')) {
                    this.refocusSpellInput();
                }
            }
        });

        // 移动端底部导航栏
        const mobileToggleSidebar = document.getElementById('mobileToggleSidebar');
        const mobileToggleStats = document.getElementById('mobileToggleStats');
        const mobileGoHome = document.getElementById('mobileGoHome');
        
        if (mobileToggleSidebar) {
            mobileToggleSidebar.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }
        
        if (mobileToggleStats) {
            mobileToggleStats.addEventListener('click', () => {
                this.toggleMobileStats();
            });
        }
        
        if (mobileGoHome) {
            mobileGoHome.addEventListener('click', () => {
                this.backToHome();
            });
        }

        // 例句点击播放
        document.getElementById('wrongAnswerExample').addEventListener('click', () => {
            this.replayExample();
        });

        // 记忆方法卡片关闭按钮
        document.getElementById('closeMemoryAidBtn').addEventListener('click', () => {
            this.closeMemoryAid();
        });

        // 移动端记忆方法弹窗关闭按钮
        document.getElementById('closeMemoryAidModalBtn').addEventListener('click', () => {
            this.closeMemoryAid();
        });

        // 点击蒙版也可以关闭
        const memoryModal = document.getElementById('memoryAidModal');
        if (memoryModal) {
            const overlay = memoryModal.querySelector('.memory-aid-modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    this.closeMemoryAid();
                });
            }
        }

        // 缓存设置相关事件
        document.getElementById('exportTodayStatsBtn').addEventListener('click', () => {
            this.exportTodayStats();
        });

        document.getElementById('exportAllStatsBtn').addEventListener('click', () => {
            this.exportAllStats();
        });

        document.getElementById('importStatsBtn').addEventListener('click', () => {
            document.getElementById('importStatsFile').click();
        });

        document.getElementById('importStatsFile').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importStats(e.target.files[0]);
                e.target.value = ''; // 重置以允许导入相同文件
            }
        });

        document.getElementById('clearStatsHistoryBtn').addEventListener('click', () => {
            this.clearStatsHistory();
        });

        document.getElementById('autoSaveStats').addEventListener('change', (e) => {
            this.toggleAutoSaveStats(e.target.checked);
        });

        // 历史统计图表相关事件
        document.getElementById('openStatsChartBtn').addEventListener('click', () => {
            this.openStatsChart();
        });

        document.getElementById('closeStatsChartBtn').addEventListener('click', () => {
            this.closeStatsChart();
        });

        // 时间范围切换
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const range = parseInt(btn.dataset.range);
                this.updateCharts(range);
            });
        });
    }

    // 处理文件上传
    async handleFileUpload(file) {
        this.showLoading('🧠 智能分析中...');

        try {
            // 第一步：智能解析文件
            this.updateLoadingProgress(20);
            const result = await WordParser.parse(file, { smartImport: true });
            let words = result.words;
            const analysis = result.analysis;

            console.log('📋 智能分析结果:', analysis);

            this.updateLoadingProgress(40);

            // 第二步：根据分析结果决定处理策略
            if (analysis.status === 'CONFORMS_TO_TEMPLATE') {
                // 情况1：符合模板格式，直接导入
                console.log('✅ 文件符合模板格式，准备直接导入');
            this.updateLoadingProgress(100);
                this.hideLoading();
                
                // 直接导入
                await this.directImportWords(words, file.name);
                
            } else if (analysis.status === 'MISSING_SECONDARY_FIELDS' || analysis.status === 'NO_MAIN_FIELD') {
                // 情况2&3：先用正则提取所有英文单词，立即显示，然后后台AI补充
                console.log('🔧 先提取所有英文单词，然后后台AI补充');
                
                this.hideLoading();
                
                // 第一步：用正则提取所有英文单词
                let extractedWords = WordParser.extractEnglishWords(result.rawContent);
                
                if (extractedWords.length === 0) {
                    alert('未能从文件中提取到有效的英文单词\n\n请检查文件内容是否包含英语单词');
                return;
            }
                
                console.log(`📖 提取到 ${extractedWords.length} 个单词，准备显示`);
                
                // 第二步：过滤A1级基础词汇（可选）
                const filteredWords = await this.filterBasicWords(extractedWords);
                
                if (filteredWords.length === 0) {
                    alert('所有单词都被过滤了，没有单词需要导入');
                    return;
                }
                
                console.log(`✅ 过滤后剩余 ${filteredWords.length} 个单词`);
                
                // 第三步：立即创建临时词书并显示
                await this.showWordListForSmartImport(filteredWords, '未命名词单');
                await this.fillWordListTable(filteredWords);
                
                // 第四步：后台AI补充（不阻塞页面）
                this.startBackgroundAIEnrichment(filteredWords, analysis);
                
            }

        } catch (error) {
            console.error('文件处理失败:', error);
            this.hideLoading();
            alert(`文件解析失败：${error.message}\n\n支持格式：TXT、CSV、XLSX、DOCX`);
        }
    }

    /**
     * 直接导入单词（符合模板格式时）
     */
    async directImportWords(words, fileName) {
        const bookName = prompt('请输入词书名称：', fileName.replace(/\.\w+$/, ''));
        if (!bookName) return;

            // 添加为新词书
            const newBook = Storage.addBook({
                name: bookName,
                words: words
            });

            // 选中新词书
            this.currentBook = newBook;
            Storage.saveCurrentBook(newBook.id);

                this.loadBooks(); // 刷新词书列表
        alert(`✅ 词书"${bookName}"已成功导入！\n共 ${words.length} 个单词`);
    }

    /**
     * 显示单词列表用于智能导入（临时词书）
     */
    async showWordListForSmartImport(words, bookName = '未命名词单') {
        // 创建临时词书（不保存到Storage）
        const tempBook = {
            id: 'temp_smart_import',
            name: bookName,
            words: words,
            icon: '📝',
            createdAt: Date.now(),
            isTemporary: true  // 标记为临时词书
        };

        // 保存当前浏览的词书ID
        this.currentWordListBookId = tempBook.id;
        this.tempSmartImportBook = tempBook;  // 临时保存

        // 显示单词表页面
        this.showScreen('wordListScreen');

        // 设置标题和图标
        document.getElementById('wordListIcon').textContent = tempBook.icon;
        document.getElementById('wordListBookName').textContent = tempBook.name;
        document.getElementById('wordListTotalCount').textContent = tempBook.words.length;

        // 渲染单词表格
        this.renderWordListTable(tempBook);
    }

    /**
     * 填充单词列表表格（逐个填充，按顺序）
     */
    async fillWordListTable(words) {
        if (!this.tempSmartImportBook) return;

        // 更新临时词书的单词
        this.tempSmartImportBook.words = words;

        // 重新渲染表格
        this.renderWordListTable(this.tempSmartImportBook);

        // 更新总数
        document.getElementById('wordListTotalCount').textContent = words.length;
    }

    /**
     * 更新表格中的单个单词
     * @param {Object} word - 单词对象
     * @param {number} wordIndex - 单词在词书中的索引
     */
    updateSingleWordInTable(word, wordIndex) {
        console.log(`  🔧 开始更新表格: 单词="${word.word}" 索引=${wordIndex}`);
        
        const tbody = document.querySelector('#wordListTable tbody');
        if (!tbody) {
            console.error('  ❌ 未找到表格tbody');
            console.log('  🔍 DOM检查: #wordListTable存在?', !!document.getElementById('wordListTable'));
            return;
        }
        console.log(`  ✓ 找到tbody，包含 ${tbody.children.length} 行`);

        // 查找对应的表格行
        const row = tbody.querySelector(`tr[data-word-index="${wordIndex}"]`);
        
        if (!row) {
            console.error(`  ❌ 未找到索引为 ${wordIndex} 的表格行`);
            console.log(`  🔍 表格行数: ${tbody.children.length}`);
            console.log(`  🔍 前5行的data-word-index:`, 
                Array.from(tbody.children).slice(0, 5).map(r => r.getAttribute('data-word-index')));
            return;
        }
        console.log(`  ✓ 找到目标行`);

        const cells = row.querySelectorAll('td');
        console.log(`  ✓ 行有 ${cells.length} 个单元格`);
        
        // 打印当前单元格内容
        if (cells.length >= 6) {
            console.log(`  📋 更新前单元格内容:`);
            console.log(`    序号: "${cells[1].textContent}"`);
            console.log(`    单词: "${cells[2].textContent}"`);
            console.log(`    音标: "${cells[3].textContent}"`);
            console.log(`    释义: "${cells[4].textContent.substring(0,20)}..."`);
            console.log(`    例句: "${cells[5].textContent.substring(0,20)}..."`);
        }
        
        // 表格结构：[编辑列(隐藏), 序号, 单词, 音标, 释义, 例句]
        // 索引：      0           1     2     3    4    5
        if (cells.length >= 6) {
            // 更新音标
            const oldPhonetic = cells[3].textContent;
            cells[3].textContent = word.phonetic || '-';
            console.log(`  ✓ 音标更新: "${oldPhonetic}" → "${cells[3].textContent}"`);
            
            // 更新释义
            const meaning = word.definitions && word.definitions[0] ? 
                word.definitions[0].meaning : '-';
            const oldMeaning = cells[4].textContent;
            cells[4].textContent = meaning;
            cells[4].title = meaning;
            console.log(`  ✓ 释义更新: "${oldMeaning.substring(0,15)}..." → "${meaning.substring(0, 15)}..."`);
            
            // 更新例句
            const example = word.definitions && word.definitions[0] ? 
                word.definitions[0].example : '-';
            const oldExample = cells[5].textContent;
            cells[5].textContent = example;
            cells[5].title = example;
            console.log(`  ✓ 例句更新: "${oldExample.substring(0,15)}..." → "${example.substring(0, 15)}..."`);
            
            // 添加闪烁效果
            row.style.transition = 'background-color 0.3s ease';
            row.style.backgroundColor = '#e8f5e9';
            console.log(`  ✨ 已添加绿色闪烁效果`);
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 800);
        } else {
            console.error(`  ❌ 表格列数不足: ${cells.length}`);
        }
    }

    /**
     * 批量更新词单表格（增量更新，不重新渲染整个表格）
     * @param {Array} enrichedBatch - 本批次补充完成的单词
     * @param {number} startIndex - 本批次在总列表中的起始索引
     */
    async updateWordListTableBatch(enrichedBatch, startIndex) {
        const tbody = document.querySelector('#wordListTable tbody');
        if (!tbody) return;

        // 更新词书中对应的单词数据（临时词书或正常词书）
        if (this.tempSmartImportBook) {
            // 智能导入的临时词书
            for (let i = 0; i < enrichedBatch.length; i++) {
                const globalIndex = startIndex + i;
                if (globalIndex < this.tempSmartImportBook.words.length) {
                    this.tempSmartImportBook.words[globalIndex] = enrichedBatch[i];
                }
            }
        }
        // 注意：正常词书的数据已在调用此函数前更新，这里只负责更新表格显示

        // 增量更新表格的对应行
        for (let i = 0; i < enrichedBatch.length; i++) {
            const globalIndex = startIndex + i;
            const word = enrichedBatch[i];
            
            // 查找对应的表格行（+1 因为索引从0开始，但显示序号从1开始）
            const row = tbody.querySelector(`tr[data-word-index="${globalIndex}"]`);
            
            if (row) {
                const cells = row.querySelectorAll('td');
                
                // 表格结构：[编辑列(隐藏), 序号, 单词, 音标, 释义, 例句]
                // 索引：      0           1     2     3    4    5
                if (cells.length >= 6) {
                    // cells[2] 是单词列，不更新
                    
                    // cells[3] 是音标列
                    cells[3].textContent = word.phonetic || '-';
                    
                    // cells[4] 是释义列
                    const meaning = word.definitions && word.definitions[0] ? 
                        word.definitions[0].meaning : '-';
                    cells[4].textContent = meaning;
                    cells[4].title = meaning; // 更新title用于悬停显示
                    
                    // cells[5] 是例句列
                    const example = word.definitions && word.definitions[0] ? 
                        word.definitions[0].example : '-';
                    cells[5].textContent = example;
                    cells[5].title = example; // 更新title用于悬停显示
                    
                    // 添加闪烁效果提示用户该行已更新
                    row.style.transition = 'background-color 0.3s ease';
                    row.style.backgroundColor = '#e8f5e9'; // 淡绿色
                    setTimeout(() => {
                        row.style.backgroundColor = '';
                    }, 800);
                }
            }
        }

        console.log(`📊 已更新表格：第 ${startIndex + 1}-${startIndex + enrichedBatch.length} 行`);
    }

    /**
     * 过滤A1级基础词汇
     * @param {Array} words - 单词列表
     * @returns {Promise<Array>} - 过滤后的单词列表
     */
    async filterBasicWords(words) {
        // A1级基础词汇列表（约200个最常用词）
        const a1BasicWords = new Set([
            // 冠词、代词
            'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
            'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
            // 介词
            'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'after',
            'over', 'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among',
            // 连词
            'and', 'or', 'but', 'because', 'if', 'when', 'than', 'so', 'as', 'while', 'until', 'unless',
            // 助动词
            'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
            // 常用动词
            'go', 'get', 'make', 'know', 'think', 'take', 'see', 'come', 'want', 'use', 'find', 'give', 'tell',
            'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call', 'keep', 'let', 'begin', 'help', 'talk', 'turn',
            'start', 'show', 'hear', 'play', 'run', 'move', 'like', 'live', 'believe', 'hold', 'bring', 'happen',
            'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn',
            'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add',
            // 常用名词
            'time', 'year', 'way', 'day', 'man', 'thing', 'woman', 'life', 'child', 'world', 'school', 'state',
            'family', 'student', 'group', 'country', 'problem', 'hand', 'part', 'place', 'case', 'week', 'company',
            'system', 'program', 'question', 'work', 'number', 'night', 'point', 'home', 'water', 'room', 'mother',
            'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'side',
            'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member',
            'law', 'car', 'city', 'name', 'team', 'minute', 'idea', 'body', 'information', 'back', 'parent', 'face',
            'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party', 'result',
            // 常用形容词
            'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big', 'high',
            'different', 'small', 'large', 'next', 'early', 'young', 'important', 'few', 'public', 'bad', 'same',
            'able', 'full', 'sure', 'better', 'free', 'less', 'ready', 'easy', 'hard', 'real', 'best', 'nice',
            // 常用副词
            'not', 'so', 'then', 'now', 'just', 'very', 'there', 'how', 'too', 'also', 'well', 'only', 'even', 'back',
            'still', 'where', 'why', 'really', 'again', 'here', 'always', 'never', 'today', 'together', 'yesterday',
            // 数字
            'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
            // 其他常用词
            'yes', 'no', 'ok', 'please', 'thanks', 'sorry', 'hello', 'hi', 'bye', 'goodbye', "sb", "sth", "black", 
            "white", "red", "green", "pink", "yellow", "blue", "orange", "purple", "brown", "gray", 
        ]);

        // 检查哪些单词是A1级
        const basicWordsFound = [];
        const nonBasicWords = [];

        for (const wordObj of words) {
            const word = wordObj.word.toLowerCase();
            if (a1BasicWords.has(word)) {
                basicWordsFound.push(wordObj);
            } else {
                nonBasicWords.push(wordObj);
            }
        }

        // 如果没有A1词汇，直接返回全部
        if (basicWordsFound.length === 0) {
            console.log('✓ 未检测到A1级基础词汇');
            return words;
        }

        console.log(`📋 检测到 ${basicWordsFound.length} 个A1级基础词汇`);

        // 显示多选对话框
        const selectedBasicWords = await this.showBasicWordsDialog(basicWordsFound);

        // 合并非基础词和用户选择的基础词
        return [...nonBasicWords, ...selectedBasicWords];
    }

    /**
     * 显示A1词汇选择对话框
     * @param {Array} basicWords - A1级词汇列表
     * @returns {Promise<Array>} - 用户选择的词汇
     */
    async showBasicWordsDialog(basicWords) {
        return new Promise((resolve) => {
            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'basic-words-dialog';
            dialog.innerHTML = `
                <div class="basic-words-overlay"></div>
                <div class="basic-words-content">
                    <h3>🔍 检测到A1级基础词汇</h3>
                    <p class="basic-words-hint">
                        检测到 <strong>${basicWords.length}</strong> 个A1级简单词汇（如 the, in, of 等）。<br>
                        这些词汇通常已掌握，默认<strong>不导入</strong>。您可以选择需要的词汇：
                    </p>
                    <div class="basic-words-actions">
                        <button class="btn-text" id="selectAllBasicWords">全选</button>
                        <button class="btn-text" id="deselectAllBasicWords">全不选</button>
                    </div>
                    <div class="basic-words-list">
                        ${basicWords.map((wordObj, index) => `
                            <label class="basic-word-item">
                                <input type="checkbox" value="${index}" class="basic-word-checkbox">
                                <span class="basic-word-text">${wordObj.word}</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="basic-words-buttons">
                        <button class="btn-secondary" id="cancelBasicWords">取消所有导入</button>
                        <button class="btn-primary" id="confirmBasicWords">确认导入以上（0）个</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // 获取确认按钮
            const confirmBtn = document.getElementById('confirmBasicWords');
            
            // 更新按钮文本的函数
            const updateConfirmButtonText = () => {
                const checkedCount = dialog.querySelectorAll('.basic-word-checkbox:checked').length;
                confirmBtn.textContent = `确认导入以上（${checkedCount}）个`;
            };
            
            // 监听所有复选框的变化
            dialog.querySelectorAll('.basic-word-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', updateConfirmButtonText);
            });

            // 全选/全不选
            document.getElementById('selectAllBasicWords').addEventListener('click', () => {
                dialog.querySelectorAll('.basic-word-checkbox').forEach(cb => cb.checked = true);
                updateConfirmButtonText();
            });

            document.getElementById('deselectAllBasicWords').addEventListener('click', () => {
                dialog.querySelectorAll('.basic-word-checkbox').forEach(cb => cb.checked = false);
                updateConfirmButtonText();
            });

            // 取消
            document.getElementById('cancelBasicWords').addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve([]); // 返回空数组表示不导入任何基础词
            });

            // 确认
            document.getElementById('confirmBasicWords').addEventListener('click', () => {
                const checkboxes = dialog.querySelectorAll('.basic-word-checkbox:checked');
                const selectedWords = Array.from(checkboxes).map(cb => basicWords[parseInt(cb.value)]);
                
                console.log(`✓ 用户选择了 ${selectedWords.length} 个A1词汇`);
                
                document.body.removeChild(dialog);
                resolve(selectedWords);
            });
        });
    }

    /**
     * 开始后台AI补充
     */
    async startBackgroundAIEnrichment(words, analysis) {
        console.log('🚀 开始后台AI补充...');
        
        // 显示进度条
        this.showAIProgress();
        
        // 记录已处理的单词索引（用于增量更新）
        let processedCount = 0;
        
        // 🕐 时间跟踪
        let timePerWord = 1; // 默认每个单词1秒
        let remainingWords = words.length;
        let batchStartTime = Date.now();
        
        // 启动倒计时
        this.startAIProgressCountdown(remainingWords * timePerWord);
        
        try {
            // 使用轻量AI模型补充
            const enrichedWords = await AIService.enrichWordsWithLight(
                words,
                // 进度回调
                (current, total, percentage, message) => {
                    this.updateAIProgress(current, total, percentage, message);
                },
                // 🔥 每批完成回调 - 实时更新表格
                async (enrichedBatch, batchIndex, totalBatches) => {
                    console.log(`✅ 第 ${batchIndex}/${totalBatches} 批完成，立即更新表格`);
                    
                    // 实时更新这批单词到表格
                    await this.updateWordListTableBatch(enrichedBatch, processedCount);
                    processedCount += enrichedBatch.length;
                    
                    // 🕐 智能调整时间预估
                    const batchEndTime = Date.now();
                    const batchDuration = (batchEndTime - batchStartTime) / 1000; // 秒
                    const actualTimePerWord = batchDuration / enrichedBatch.length;
                    
                    // 更新时间预估（加权平均，新数据权重更高）
                    timePerWord = timePerWord * 0.3 + actualTimePerWord * 0.7;
                    
                    // 更新剩余时间
                    remainingWords -= enrichedBatch.length;
                    const estimatedRemaining = Math.ceil(remainingWords * timePerWord);
                    this.updateAIProgressTime(estimatedRemaining);
                    
                    console.log(`⏱️ 本批耗时: ${batchDuration.toFixed(1)}秒, 每词: ${actualTimePerWord.toFixed(2)}秒, 预估剩余: ${estimatedRemaining}秒`);
                    
                    // 重新开始下一批的计时
                    batchStartTime = Date.now();
                }
            );
            
            // 隐藏进度条
            this.hideAIProgress();
            
            // 🔥 检查并补充遗漏的数据
            const missingWords = this.findMissingFields(enrichedWords);
            
            if (missingWords.length > 0) {
                console.log(`⚠️ 检测到 ${missingWords.length} 个单词的字段不完整，准备补充`);
                
                // 显示补充进度
                this.showAIProgress(`正在补充 ${missingWords.length} 个遗漏单词...`);
                
                // 启动补充倒计时（使用已学习的timePerWord）
                this.startAIProgressCountdown(Math.ceil(missingWords.length * timePerWord));
                
                try {
                    // 再次使用AI补充遗漏的单词
                    const reEnrichedWords = await AIService.enrichWordsWithLight(
                        missingWords,
                        (current, total, percentage, message) => {
                            this.updateAIProgress(current, total, percentage, `补充遗漏：${message}`);
                        },
                        async (enrichedBatch, batchIndex, totalBatches) => {
                            console.log(`✅ 补充批次 ${batchIndex}/${totalBatches} 完成`);
                            
                            // 找到这些单词在原列表中的位置并更新
                            for (const reEnrichedWord of enrichedBatch) {
                                const originalIndex = enrichedWords.findIndex(
                                    w => w.word.toLowerCase() === reEnrichedWord.word.toLowerCase()
                                );
                                
                                if (originalIndex !== -1) {
                                    // 更新原列表中的数据
                                    enrichedWords[originalIndex] = reEnrichedWord;
                                    
                                    // 实时更新表格
                                    await this.updateWordListTableBatch([reEnrichedWord], originalIndex);
                                }
                            }
                        }
                    );
                    
                    console.log(`✅ 遗漏数据补充完成`);

        } catch (error) {
                    console.error('补充遗漏数据失败:', error);
                }
                
                this.hideAIProgress();
            } else {
                console.log(`✓ 所有单词数据完整`);
            }
            
            // 显示补充完成的提示
            await this.showSmartImportCompleteDialog(enrichedWords, analysis);
            
        } catch (aiError) {
            console.error('AI补充失败:', aiError);
            this.hideAIProgress();
            
            // 降级处理：询问是否使用传统词典API补充
            if (confirm(`AI服务暂时不可用（${aiError.message}）\n\n是否使用传统词典API补充？（可能较慢）`)) {
                this.showAIProgress('正在使用词典API补充...');
                try {
                    const enrichedWords = await DictionaryAPI.enrichWords(words);
                    await this.fillWordListTable(enrichedWords);
                    this.hideAIProgress();
                    await this.showSmartImportCompleteDialog(enrichedWords, analysis);
                } catch (dictError) {
                    console.error('词典API补充失败:', dictError);
                    this.hideAIProgress();
                    alert('词典API也无法使用，建议检查网络连接');
                }
            }
        }
    }

    /**
     * 补缺功能 - 补全词单中缺失的字段
     */
    async fillMissingFields() {
        // 检查是否在浏览词单模式（通过检查是否有浏览中的词书ID或临时词书）
        const currentBook = this.tempSmartImportBook || 
                          (this.currentWordListBookId ? Storage.getBook(this.currentWordListBookId) : null);
        
        if (!currentBook || !currentBook.words || currentBook.words.length === 0) {
            alert('请先浏览词单再使用补缺功能');
            return;
        }

        console.log('🔍 开始检查词单缺失字段...');
        console.log(`📚 当前词书ID: ${currentBook.id}`);
        console.log(`📚 当前词书名称: ${currentBook.name}`);
        console.log(`📚 当前词书单词数: ${currentBook.words.length}`);
        
        // 打印前5个单词的状态
        console.log('📝 词书前5个单词状态:');
        currentBook.words.slice(0, 5).forEach((w, i) => {
            console.log(`  ${i}: ${w.word} - 音标:${w.phonetic||'缺'} 释义:${w.definitions?.[0]?.meaning?'有':'缺'} 例句:${w.definitions?.[0]?.example?'有':'缺'}`);
        });

        // 查找缺失字段的单词
        const missingWords = this.findMissingFields(currentBook.words);

        console.log(`🔍 检测到 ${missingWords.length} 个单词需要补缺`);
        if (missingWords.length > 0) {
            console.log('📋 需要补缺的单词列表:', missingWords.map(w => w.word).join(', '));
        }

        if (missingWords.length === 0) {
            alert('✅ 词单数据完整，无需补缺');
            return;
        }

        // 确认补缺
        const confirmed = confirm(
            `🔍 检测到 ${missingWords.length} 个单词的字段不完整\n\n` +
            `将使用AI自动补全音标、释义和例句\n\n` +
            `是否继续？`
        );

        if (!confirmed) return;

        console.log(`📝 开始补缺 ${missingWords.length} 个单词`);

        // 显示进度
        this.showAIProgress(`正在补全 ${missingWords.length} 个单词的缺失字段...`);

        // 时间跟踪
        let timePerWord = 1;
        let batchStartTime = Date.now();

        // 启动倒计时
        this.startAIProgressCountdown(missingWords.length * timePerWord);

        try {
            // 使用AI补全
            const enrichedWords = await AIService.enrichWordsWithLight(
                missingWords,
                (current, total, percentage, message) => {
                    this.updateAIProgress(current, total, percentage, message);
                },
                async (enrichedBatch, batchIndex, totalBatches) => {
                    console.log(`✅ 补缺批次 ${batchIndex}/${totalBatches} 完成，收到 ${enrichedBatch.length} 个单词`);
                    
                    // 调试：打印前3个补全的单词
                    if (enrichedBatch.length > 0) {
                        console.log('📝 补全数据示例:', enrichedBatch.slice(0, 3).map(w => ({
                            word: w.word,
                            phonetic: w.phonetic,
                            meaning: w.definitions?.[0]?.meaning?.substring(0, 30) + '...'
                        })));
                    }

                    // 找到这些单词在原词书中的位置并更新
                    for (const enrichedWord of enrichedBatch) {
                        const originalIndex = currentBook.words.findIndex(
                            w => w.word.toLowerCase() === enrichedWord.word.toLowerCase()
                        );

                        if (originalIndex !== -1) {
                            console.log(`🔄 更新单词 "${enrichedWord.word}" (索引 ${originalIndex})`);
                            
                            // 打印更新前的数据
                            const oldWord = currentBook.words[originalIndex];
                            console.log(`  📥 更新前: 音标="${oldWord.phonetic||'空'}" 释义="${oldWord.definitions?.[0]?.meaning?.substring(0,20)||'空'}..."`);
                            
                            // 更新原词书中的数据
                            currentBook.words[originalIndex] = enrichedWord;
                            
                            // 打印更新后的数据
                            console.log(`  📤 更新后: 音标="${enrichedWord.phonetic||'空'}" 释义="${enrichedWord.definitions?.[0]?.meaning?.substring(0,20)||'空'}..."`);

                            // 直接更新表格单元格
                            this.updateSingleWordInTable(enrichedWord, originalIndex);
                        } else {
                            console.warn(`⚠️ 未找到单词 "${enrichedWord.word}"`);
                        }
                    }
                    
                    // 每批完成后立即保存到localStorage（如果不是临时词书）
                    if (!this.tempSmartImportBook) {
                        console.log(`💾 准备保存第 ${batchIndex} 批数据到localStorage...`);
                        console.log(`  词书ID: ${currentBook.id}`);
                        
                        Storage.updateBook(currentBook.id, currentBook);
                        
                        // 验证保存
                        const savedBook = Storage.getBook(currentBook.id);
                        console.log(`  ✓ 保存验证: 词书有 ${savedBook.words.length} 个单词`);
                        
                        // 验证第一个更新的单词是否保存成功
                        if (enrichedBatch.length > 0) {
                            const testWord = enrichedBatch[0];
                            const savedWord = savedBook.words.find(w => w.word === testWord.word);
                            if (savedWord) {
                                console.log(`  ✓ 验证单词 "${testWord.word}": 音标="${savedWord.phonetic}" 已保存`);
                            }
                        }
                    }

                    // 智能调整时间预估
                    const batchEndTime = Date.now();
                    const batchDuration = (batchEndTime - batchStartTime) / 1000;
                    const actualTimePerWord = batchDuration / enrichedBatch.length;
                    timePerWord = timePerWord * 0.3 + actualTimePerWord * 0.7;

                    const remainingWords = missingWords.length - batchIndex * enrichedBatch.length;
                    const estimatedRemaining = Math.ceil(remainingWords * timePerWord);
                    this.updateAIProgressTime(estimatedRemaining);

                    batchStartTime = Date.now();
                }
            );

            console.log('🎉 所有批次处理完成');
            console.log(`📊 补全统计: ${missingWords.length} 个单词`);
            
            // 保存更新后的词书（如果不是临时词书）
            if (!this.tempSmartImportBook) {
                console.log('📦 准备最终验证和刷新...');
                
                // 从localStorage重新读取最新数据，确保同步
                const freshBook = Storage.getBook(currentBook.id);
                console.log(`  ✓ 从localStorage读取词书: ${freshBook.name}`);
                console.log(`  ✓ 词书包含 ${freshBook.words.length} 个单词`);
                
                // 详细验证前5个单词的数据
                console.log('📝 验证前5个单词数据:');
                freshBook.words.slice(0, 5).forEach((w, i) => {
                    console.log(`  ${i}: ${w.word} - 音标:"${w.phonetic||'缺'}" 释义:"${w.definitions?.[0]?.meaning?.substring(0,20)||'缺'}..."`);
                });
                
                // 统计完整数据
                const updatedCount = freshBook.words.filter(w => 
                    w.phonetic && w.phonetic !== '-' && 
                    w.definitions?.[0]?.meaning && w.definitions[0].meaning !== '-'
                ).length;
                
                console.log(`✅ 词书更新验证: ${updatedCount}/${freshBook.words.length} 个单词有完整数据`);
                
                // 检查刚才补缺的单词是否都更新了
                console.log('🔍 验证补缺的单词是否已保存:');
                missingWords.slice(0, 3).forEach(mw => {
                    const savedWord = freshBook.words.find(w => w.word === mw.word);
                    if (savedWord) {
                        console.log(`  ✓ "${savedWord.word}": 音标="${savedWord.phonetic}" 已更新`);
                    } else {
                        console.error(`  ❌ "${mw.word}" 未找到`);
                    }
                });
                
                // 延迟刷新表格，确保DOM更新
                setTimeout(() => {
                    console.log('🔄 开始重新渲染表格...');
                    this.renderWordListTable(freshBook);
                    console.log('✅ 表格已刷新');
                    
                    // 验证表格是否正确渲染
                    const tbody = document.querySelector('#wordListTable tbody');
                    if (tbody) {
                        console.log(`  ✓ 表格现有 ${tbody.children.length} 行`);
                        // 检查前3行的数据
                        Array.from(tbody.children).slice(0, 3).forEach((row, i) => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 6) {
                                console.log(`  行${i}: ${cells[2].textContent} - 音标:"${cells[3].textContent}"`);
                            }
                        });
                    }
                    
                    this.hideAIProgress();
                    alert(`✅ 补缺完成！\n\n已成功补全 ${missingWords.length} 个单词的缺失字段`);
                }, 300);
            } else {
                // 临时词书刷新表格
                console.log('🔄 刷新临时词书表格...');
                setTimeout(() => {
                    this.renderWordListTable(this.tempSmartImportBook);
                    console.log('✅ 临时词书表格已刷新');
                    
                    this.hideAIProgress();
                    alert(`✅ 补缺完成！\n\n已成功补全 ${missingWords.length} 个单词的缺失字段`);
                }, 300);
            }

        } catch (error) {
            console.error('补缺失败:', error);
            this.hideAIProgress();
            alert(`❌ 补缺失败：${error.message}\n\n请检查网络连接或API配置`);
        }
    }

    /**
     * 查找字段不完整的单词
     * @param {Array} words - 单词列表
     * @returns {Array} - 字段不完整的单词列表
     */
    findMissingFields(words) {
        const incomplete = [];
        
        for (const word of words) {
            let hasMissing = false;
            
            // 检查音标
            if (!word.phonetic || word.phonetic.trim() === '' || word.phonetic === '-') {
                hasMissing = true;
            }
            
            // 检查释义和例句
            if (!word.definitions || word.definitions.length === 0) {
                hasMissing = true;
            } else {
                const def = word.definitions[0];
                if (!def.meaning || def.meaning.trim() === '' || def.meaning === '-') {
                    hasMissing = true;
                }
                if (!def.example || def.example.trim() === '' || def.example === '-') {
                    hasMissing = true;
                }
            }
            
            if (hasMissing) {
                incomplete.push(word);
            }
        }
        
        return incomplete;
    }

    /**
     * 显示AI补充进度
     */
    showAIProgress(message = '正在补充单词信息...') {
        const container = document.getElementById('aiProgressContainer');
        const messageEl = document.getElementById('aiProgressMessage');
        const fillEl = document.getElementById('aiProgressFill');
        const statsEl = document.getElementById('aiProgressStats');
        const timeEl = document.getElementById('aiProgressTime');
        
        if (container) {
            container.classList.remove('hidden');
            messageEl.textContent = message;
            fillEl.style.width = '0%';
            statsEl.textContent = '0/0';
            if (timeEl) timeEl.textContent = '预计剩余: 0秒';
        }
    }

    /**
     * 更新AI补充进度
     */
    updateAIProgress(current, total, percentage, message) {
        const messageEl = document.getElementById('aiProgressMessage');
        const fillEl = document.getElementById('aiProgressFill');
        const statsEl = document.getElementById('aiProgressStats');
        
        if (messageEl) messageEl.textContent = message;
        if (fillEl) fillEl.style.width = `${percentage}%`;
        if (statsEl) statsEl.textContent = `${current}/${total}`;
        
        console.log(`🔄 AI进度：${current}/${total} (${percentage}%)`);
    }

    /**
     * 启动倒计时（同时更新进度条和剩余时间）
     */
    startAIProgressCountdown(totalSeconds) {
        // 清除之前的倒计时
        if (this.aiCountdownTimer) {
            clearInterval(this.aiCountdownTimer);
        }
        
        const totalTime = totalSeconds;
        let remainingSeconds = totalSeconds;
        
        // 立即更新一次
        this.updateAIProgressTime(remainingSeconds);
        this.updateProgressBarByTime(totalTime, remainingSeconds);
        
        // 每秒更新
        this.aiCountdownTimer = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds < 0) {
                remainingSeconds = 0;
                clearInterval(this.aiCountdownTimer);
            }
            
            // 更新时间显示
            this.updateAIProgressTime(remainingSeconds);
            
            // 根据倒计时更新进度条
            this.updateProgressBarByTime(totalTime, remainingSeconds);
        }, 1000);
    }

    /**
     * 根据倒计时更新进度条
     */
    updateProgressBarByTime(totalSeconds, remainingSeconds) {
        const fillEl = document.getElementById('aiProgressFill');
        if (fillEl && totalSeconds > 0) {
            const elapsedSeconds = totalSeconds - remainingSeconds;
            const percentage = Math.min((elapsedSeconds / totalSeconds) * 100, 100);
            fillEl.style.width = `${percentage}%`;
        }
    }

    /**
     * 更新剩余时间显示
     */
    updateAIProgressTime(seconds) {
        const timeEl = document.getElementById('aiProgressTime');
        if (timeEl) {
            if (seconds <= 0) {
                timeEl.textContent = '即将完成...';
            } else if (seconds < 60) {
                timeEl.textContent = `预计剩余: ${seconds}秒`;
            } else {
                const minutes = Math.floor(seconds / 60);
                const secs = seconds % 60;
                timeEl.textContent = `预计剩余: ${minutes}分${secs}秒`;
            }
        }
    }

    /**
     * 隐藏AI补充进度
     */
    hideAIProgress() {
        // 清除倒计时
        if (this.aiCountdownTimer) {
            clearInterval(this.aiCountdownTimer);
            this.aiCountdownTimer = null;
        }
        
        const container = document.getElementById('aiProgressContainer');
        if (container) {
            setTimeout(() => {
                container.classList.add('hidden');
            }, 500); // 延迟隐藏，让用户看到100%
        }
    }

    /**
     * 显示智能导入完成对话框
     */
    async showSmartImportCompleteDialog(words, analysis) {
        const message = `✅ 智能分析完成！\n\n` +
            `📊 分析结果：${analysis.description}\n` +
            `📝 识别单词：${words.length} 个\n\n` +
            `是否导入这些单词？`;

        const userChoice = confirm(message + '\n\n点击"确定"导入，点击"取消"继续编辑');

        if (userChoice) {
            // 用户选择立即导入
            await this.confirmSmartImport();
        } else {
            // 用户选择"再等等"，激活编辑模式
            this.activateSmartImportEditMode();
        }
    }

    /**
     * 确认智能导入
     */
    async confirmSmartImport() {
        if (!this.tempSmartImportBook) return;

        const bookName = prompt('请输入词书名称：', this.tempSmartImportBook.name);
        if (!bookName) return;

        // 添加为新词书
        const newBook = Storage.addBook({
            name: bookName,
            words: this.tempSmartImportBook.words
        });

        // 选中新词书
        this.currentBook = newBook;
        Storage.saveCurrentBook(newBook.id);

        // 清理临时词书
        this.tempSmartImportBook = null;
        this.currentWordListBookId = null;

        // 返回首页并刷新词书列表
        this.showScreen('welcomeScreen');
        this.loadBooks();

        alert(`✅ 词书"${bookName}"已成功导入！\n共 ${newBook.words.length} 个单词`);
    }

    /**
     * 激活智能导入编辑模式
     */
    activateSmartImportEditMode() {
        // 自动进入编辑模式
        if (!this.isWordListEditMode) {
            this.toggleWordListEditMode();
        }

        // 提示用户
        alert('💡 已进入编辑模式\n\n您可以：\n• 直接点击单元格编辑内容\n• 使用收藏和删除按钮管理单词\n• 编辑完成后点击"完成"按钮导入');
    }

    // 加载示例单词
    async loadDemoWords() {
        this.showLoading('正在加载示例单词...');
        
        setTimeout(() => {
            const demoWords = WordParser.getDemoWords();
            
            // 添加为示例词书
            const newBook = Storage.addBook({
                name: '示例单词',
                words: demoWords
            });

            this.currentBook = newBook;
            Storage.saveCurrentBook(newBook.id);

            this.hideLoading();
            this.loadBooks(); // 刷新词书列表
            alert(`示例词书已加载！\n共${demoWords.length}个单词\n点击"开始学习"按钮开始练习`);
        }, 1000);
    }

    // 显示编辑器
    showEditor() {
        this.showScreen('wordEditorScreen');
        this.renderEditorTable();
    }

    // 渲染编辑器表格
    renderEditorTable() {
        const tbody = document.getElementById('editorTableBody');
        tbody.innerHTML = '';

        this.words.forEach((word, index) => {
            const tr = document.createElement('tr');
            const def = word.definitions && word.definitions[0] ? word.definitions[0] : { pos: '', meaning: '' };
            
            tr.innerHTML = `
                <td><strong>${word.word}</strong></td>
                <td>${word.phonetic || ''}</td>
                <td>${def.meaning || ''}</td>
                <td>
                    <button class="btn-delete" onclick="app.deleteWord(${index})">删除</button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
    }

    // 删除单词
    deleteWord(index) {
        if (confirm('确定要删除这个单词吗？')) {
            this.words.splice(index, 1);
            Storage.saveWords(this.words);
            this.renderEditorTable();
        }
    }

    // 开始学习
    startLearning() {
        if (this.words.length === 0) {
            alert('请先上传单词列表');
            return;
        }

        // 选择本次学习的单词
        const wordsPerSession = parseInt(this.settings.wordsPerSession);
        this.sessionWords = this.words.slice(0, Math.min(wordsPerSession, this.words.length));
        this.currentWordIndex = 0;
        this.sessionResults = { correct: 0, wrong: 0, unknown: 0 };
        this.hintUsedForWords = []; // 重置提示使用记录
        this.startTime = Date.now();

        // 切换到学习界面
        this.showScreen('learningScreen');

        // 显示侧边栏和统计面板
        document.getElementById('sidebar').classList.remove('collapsed');
        
        // 启动今日统计显示定时器
        this.startStatsDisplayTimer();

        this.showWord();
    }

    // 显示当前单词
    showWord() {
        if (this.currentWordIndex >= this.sessionWords.length) {
            this.showCompletion();
            return;
        }

        const word = this.sessionWords[this.currentWordIndex];
        
        // 更新进度
        this.updateProgress();

        // 决定使用哪种模式
        const mode = this.decideMode();
        this.currentMode = mode;

        if (mode === 'select') {
            this.showSelectMode(word);
        } else {
            this.showSpellMode(word);
        }

        // 更新收藏状态显示
        this.updateFavoriteDisplay(word.favorite || false);

        // 自动播放发音
        if (this.settings.autoSound) {
            setTimeout(() => this.playSound(), 300);
        }
    }

    // 决定学习模式
    decideMode() {
        const mode = this.settings.learningMode;
        
        if (mode === 'selectOnly') return 'select';
        if (mode === 'spellOnly') return 'spell';
        
        // 混合模式：交替
        return this.currentWordIndex % 2 === 0 ? 'select' : 'spell';
    }

    // 显示选择模式
    showSelectMode(word) {
        document.getElementById('modeSelectMeaning').classList.remove('hidden');
        document.getElementById('modeSpellWord').classList.add('hidden');
        
        // 隐藏"下一个"按钮（选择模式不需要）
        document.getElementById('nextBtn').style.display = 'none';

        const def = word.definitions[0];
        document.getElementById('wordText').textContent = word.word;
        document.getElementById('wordPhonetic').textContent = word.phonetic || '';
        
        // 显示单词统计信息（复习模式）
        this.updateWordStatsDisplay(word);
        
        // 显示CEFR等级而非词性
        const cefrLevel = this.getWordCEFRLevel(word.word);
        const posElement = document.getElementById('wordPos');
        if (cefrLevel) {
            posElement.textContent = cefrLevel;
            posElement.className = `word-pos cefr-${cefrLevel.toLowerCase()}`;
            posElement.style.display = 'inline-block';
        } else {
            posElement.textContent = '';
            posElement.className = 'word-pos';
            posElement.style.display = 'none'; // 没有CEFR等级则隐藏
        }

        // 隐藏例句（切换单词时重置）
        const exampleContainer = document.getElementById('wrongAnswerExample');
        if (exampleContainer) {
            exampleContainer.classList.remove('show');
        }

        // 关闭记忆方法卡片（切换单词时自动关闭）
        this.closeMemoryAid();

        // 生成选项
        this.generateOptions(word);
        
        // 显示上次答题记录
        this.showLastWordBadge('lastWordBadge1');
    }

    // 生成选项
    generateOptions(word) {
        const container = document.getElementById('optionsContainer');
        
        // 清除所有旧按钮的focus状态和样式类（iOS修复）
        const oldButtons = container.querySelectorAll('.option-btn');
        oldButtons.forEach(btn => {
            btn.blur(); // 移除focus状态
            btn.classList.remove('correct', 'correct-unknown', 'wrong', 'selected');
            btn.disabled = false;
        });
        
        container.innerHTML = '';

        const correctAnswer = word.definitions[0].meaning;
        
        // 使用当前词书的所有单词作为干扰项来源
        const allWords = this.currentBook ? this.currentBook.words : this.sessionWords;
        
        // 使用设置的概率让"无正确答案"成为正确答案（复习错题时概率为0%）
        const settingNoAnswerProb = this.settings.noAnswerProbability !== undefined ? this.settings.noAnswerProbability : 10;
        const noCorrectAnswerProbability = this.isReviewMode ? 0 : (settingNoAnswerProb / 100);
        const noCorrectAnswerIsCorrect = Math.random() < noCorrectAnswerProbability;
        
        let options, allOptions, actualCorrectAnswer;
        
        // 创建释义到原词的映射
        this.meaningToWordMap = {};
        
        if (noCorrectAnswerIsCorrect) {
            // "无正确答案"是正确答案：生成4个干扰项（不包括真实答案）
            const distractors = DictionaryAPI.getDistractors(word, allWords, 4);
            // 保存映射关系
            distractors.forEach(d => {
                if (d.word) this.meaningToWordMap[d.meaning] = d.word;
            });
            options = [
                ...distractors.map(d => d.meaning),
                '无正确答案',
                '不知道'
            ];
            
            // 打乱前4个选项（4个干扰项）
            const firstFour = this.shuffleArray(options.slice(0, 4));
            allOptions = [...firstFour, '无正确答案', '不知道'];
            actualCorrectAnswer = '无正确答案';
        } else {
            // 正常情况：正确答案+3个干扰项
            const distractors = DictionaryAPI.getDistractors(word, allWords, 3);
            // 保存映射关系
            distractors.forEach(d => {
                if (d.word) this.meaningToWordMap[d.meaning] = d.word;
            });
            options = [
                correctAnswer,
                ...distractors.map(d => d.meaning),
                '无正确答案',
                '不知道'
            ];
            
            // 打乱前4个选项
            const firstFour = this.shuffleArray(options.slice(0, 4));
            allOptions = [...firstFour, '无正确答案', '不知道'];
            actualCorrectAnswer = correctAnswer;
        }

        // 按照指定顺序排列：4,5,6 / 1,2,3
        const orderedOptions = [
            allOptions[0], // 单词1 -> 快捷键4
            allOptions[1], // 单词2 -> 快捷键5
            allOptions[4], // "无正确答案" -> 快捷键6
            allOptions[2], // 单词3 -> 快捷键1
            allOptions[3], // 单词4 -> 快捷键2
            allOptions[5]  // "不知道" -> 快捷键3
        ];
        
        const hotkeys = this.settings.hotkeys || {
            option1: '1', option2: '2', option3: '3',
            option4: '4', option5: '5', option6: '6'
        };
        const hotkeyArray = [
            hotkeys.option4, hotkeys.option5, hotkeys.option6,
            hotkeys.option1, hotkeys.option2, hotkeys.option3
        ];

        orderedOptions.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.dataset.hotkey = hotkeyArray[index];
            btn.dataset.optionIndex = index;
            btn.dataset.option = option; // 存储原始选项文本，用于准确匹配
            
            // 原始索引（在allOptions中的位置）
            const originalIndex = allOptions.indexOf(option);
            
            // 将换行符转换为<br>标签以支持多行显示
            const optionText = option.replace(/\n/g, '<br>');
            
            // 为前4个选项（正确答案+干扰项）显示完整释义
            if (originalIndex < 4) {
                btn.innerHTML = `
                    <div class="option-content">
                        <span class="hotkey-hint">${hotkeyArray[index]}</span>
                        <span class="option-text">${optionText}</span>
                    </div>
                `;
            } else {
                // "无正确答案"和"不知道"添加英文提示
                const specialPos = option === '无正确答案' ? 'No answer' : 'No idea';
                btn.innerHTML = `
                    <div class="option-content">
                        <span class="hotkey-hint">${hotkeyArray[index]}</span>
                        <span class="option-text">${option}</span>
                        <span class="option-pos">${specialPos}</span>
                    </div>
                `;
            }
            
            // 使用 dataset.option 而不是闭包变量，这样修改 dataset.option 后点击事件能获取到新值
            btn.onclick = () => this.selectOption(btn.dataset.option, actualCorrectAnswer);
            container.appendChild(btn);
        });
        
        // 如果无正确答案概率为0%，禁用并灰化该选项
        if (settingNoAnswerProb === 0) {
            const buttons = document.querySelectorAll('.option-btn');
            buttons.forEach(btn => {
                if (btn.dataset.option === '无正确答案') {
                    btn.disabled = true;
                    btn.classList.add('option-disabled');
                    btn.title = '该选项已在设置中禁用（概率为0%）';
                }
            });
        }
        
        // 调整选项文本大小以保持一致高度
        this.adjustOptionTextSizes();
    }

    // 调整选项文本大小以保持一致高度
    adjustOptionTextSizes() {
        // 不再动态调整字体大小，改用CSS固定样式
        // 超长文本通过CSS的line-clamp直接截断并显示省略号
        // 这样可以保持字体大小合适，避免文字太小看不清
    }

    // 选择选项
    // 在错误按钮下方显示原词（上浮动画）
    showOriginalWord(button, originalWord) {
        // 移除之前可能存在的原词标签
        const existingLabel = button.querySelector('.original-word-label');
        if (existingLabel) {
            existingLabel.remove();
        }
        
        // 创建原词标签
        const label = document.createElement('div');
        label.className = 'original-word-label';
        label.textContent = originalWord;
        
        // 添加到按钮中
        button.appendChild(label);
        
        // 触发动画（稍微延迟以确保CSS已应用）
        setTimeout(() => {
            label.classList.add('show');
        }, 100);
    }

    // 显示例句并朗读（答错/不知道时调用）
    showExampleOnWrongAnswer(type = 'wrong') {
        const currentWord = this.sessionWords[this.currentWordIndex];
        if (!currentWord) return;

        const exampleContainer = document.getElementById('wrongAnswerExample');
        const exampleText = document.getElementById('exampleSentenceChoice');
        
        if (!exampleContainer || !exampleText) return;

        // 获取例句
        const def = currentWord.definitions && currentWord.definitions[0];
        const example = def?.example || '';

        if (example) {
            // 保存当前例句文本，用于重新播放
            this.currentExample = example;
            
            // 高亮显示当前单词的例句，根据类型应用不同样式
            const highlightedExample = this.highlightWordInExample(example, currentWord.word, type);
            exampleText.innerHTML = highlightedExample;
            
            // 移除之前的类型类，添加新的类型类
            exampleContainer.classList.remove('example-wrong', 'example-unknown');
            exampleContainer.classList.add(`example-${type}`);
            exampleContainer.classList.add('show');

            // 朗读例句
            console.log(`🔊 ${type === 'wrong' ? '答错' : '不知道'}时朗读例句:`, example);
            this.speak(example);
        } else {
            // 如果没有例句，只显示单词
            this.currentExample = '';
            exampleText.textContent = '（该单词暂无例句）';
            exampleContainer.classList.remove('example-wrong', 'example-unknown');
            exampleContainer.classList.add(`example-${type}`);
            exampleContainer.classList.add('show');
        }
    }

    // 重新播放例句
    replayExample() {
        if (!this.currentExample) {
            console.log('🔇 没有可播放的例句');
            return;
        }
        
        console.log('🔊 重新播放例句:', this.currentExample);
        this.speak(this.currentExample);
    }

    // 显示记忆方法
    async showMemoryAid() {
        const currentWord = this.sessionWords[this.currentWordIndex];
        if (!currentWord) return;

        console.log('💡 显示记忆方法:', currentWord.word);

        // 判断是移动端还是PC端
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // 移动端：显示蒙版弹窗
            const modal = document.getElementById('memoryAidModal');
            const modalBody = document.getElementById('memoryAidModalBody');
            
            // 显示加载状态
            modalBody.innerHTML = `
                <div class="memory-loading">
                    <div class="loading-spinner"></div>
                    <p>正在生成记忆方法...</p>
                </div>
            `;
            modal.classList.remove('hidden');
            modal.classList.add('show');

            // 调用API获取记忆方法
            const memoryContent = await this.getMemoryAidFromAI(currentWord);
            modalBody.innerHTML = memoryContent;
        } else {
            // PC端：直接在下方显示卡片
            const card = document.getElementById('memoryAidCard');
            const content = document.getElementById('memoryAidContent');
            
            // 显示加载状态
            content.innerHTML = `
                <div class="memory-loading">
                    <div class="loading-spinner"></div>
                    <p>正在生成记忆方法...</p>
                </div>
            `;
            card.classList.remove('hidden');
            card.classList.add('show');

            // 调用API获取记忆方法
            const memoryContent = await this.getMemoryAidFromAI(currentWord);
            content.innerHTML = memoryContent;
        }
    }

    // 调用QWEN模型获取记忆方法
    async getMemoryAidFromAI(wordData) {
        try {
            const apiKey = this.settings.aiApiKey || '';
            if (!apiKey) {
                return `
                    <div class="memory-method-section">
                        <div class="memory-method-title">⚠️ 未配置API密钥</div>
                        <div class="memory-method-content">
                            <p>请先在设置中配置硅基流动API密钥才能使用AI记忆辅助功能。</p>
                            <p>前往 设置 → AI工坊设置 → 配置API密钥</p>
                            <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-tertiary);">
                                💡 使用邀请码 <strong style="color: var(--primary-color);">WtZO3i7N</strong> 可免费获赠2000万token
                            </p>
                        </div>
                    </div>
                `;
            }
            
            console.log('🔑 使用API密钥长度:', apiKey.length);

            const word = wordData.word;
            const meaning = wordData.definitions?.[0]?.meaning || '';
            const example = wordData.definitions?.[0]?.example || '';

            const prompt = `请帮我生成记忆英文单词"${word}"的方法。

单词信息：
- 单词：${word}
- 释义：${meaning}
${example ? `- 例句：${example}` : ''}

请严格按照以下JSON格式返回，只返回JSON，不要有其他文字：

{
  "methods": [
    {
      "type": "词根词缀法",
      "content": "具体的词根词缀分析"
    },
    {
      "type": "联想记忆",
      "content": "联想记忆的具体方法"
    },
    {
      "type": "近义词",
      "content": "相关的近义词或反义词"
    },
    {
      "type": "名言名句",
      "content": "使用${word}的名人名言或著作名句"
    }
  ]
}

要求：
1. 只返回适用的记忆方法，不适用的直接省略
2. 每个方法的content要简洁实用，名言名句必须有真实来源，不要编造
3. 必须是有效的JSON格式，不要使用中文引号""
4. content中避免使用换行符，用空格或分号代替
5. 不要添加任何注释或额外文字`;

            console.log('🚀 开始调用QWEN API...');
            console.log('📝 提示词:', prompt);

            const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'Qwen/Qwen2.5-7B-Instruct',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            console.log('📡 API响应状态:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API请求失败:', errorText);
                throw new Error(`API请求失败 (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ API响应数据:', data);
            
            const aiResponse = data.choices?.[0]?.message?.content || '生成失败';
            console.log('💡 AI生成的记忆方法:', aiResponse);

            // 格式化AI响应
            return this.formatMemoryAidContent(aiResponse);
        } catch (error) {
            console.error('获取记忆方法失败:', error);
            return `
                <div class="memory-method-section">
                    <div class="memory-method-title">❌ 生成失败</div>
                    <div class="memory-method-content">
                        <p>无法连接到AI服务，请检查：</p>
                        <ul>
                            <li>API密钥是否正确</li>
                            <li>网络连接是否正常</li>
                            <li>API额度是否充足</li>
                        </ul>
                        <p>错误信息：${error.message}</p>
                    </div>
                </div>
            `;
        }
    }

    // 根据记忆方法类型自动匹配图标
    getMemoryMethodIcon(type) {
        const iconMap = {
            '词根词缀法': '🌱',
            '词根词缀': '🌱',
            '联想记忆法': '💭',
            '联想记忆': '💭',
            '谐音记忆': '🎵',
            '谐音联想': '🎵',
            '近义词': '🔄',
            '反义词': '↔️',
            '同义词': '🔄',
            '例句名言': '📝',
            '名言': '📝',
            '名言名句': '📝',
            '词源故事': '📚',
            '词源': '📚',
            '形象记忆': '🎨',
            '场景记忆': '🎬',
            '搭配用法': '🔗',
            '用法搭配': '🔗'
        };
        
        // 精确匹配
        if (iconMap[type]) {
            return iconMap[type];
        }
        
        // 模糊匹配
        for (const key in iconMap) {
            if (type.includes(key) || key.includes(type)) {
                return iconMap[key];
            }
        }
        
        // 默认图标
        return '💡';
    }
    
    // 格式化记忆方法内容
    formatMemoryAidContent(content) {
        try {
            // 尝试清理可能存在的markdown代码块标记
            let cleanContent = content.trim();
            
            // 移除可能的 ```json 和 ``` 标记
            cleanContent = cleanContent.replace(/^```json\s*/i, '');
            cleanContent = cleanContent.replace(/^```\s*/, '');
            cleanContent = cleanContent.replace(/```\s*$/, '');
            cleanContent = cleanContent.trim();
            
            // 替换中文引号为英文引号
            cleanContent = cleanContent.replace(/"/g, '"').replace(/"/g, '"');
            cleanContent = cleanContent.replace(/'/g, "'").replace(/'/g, "'");
            
            // 移除或转义控制字符（换行、制表符等）
            cleanContent = cleanContent.replace(/[\n\r\t]/g, ' ');
            
            console.log('🧹 清理后的内容:', cleanContent);
            
            // 尝试解析JSON
            const data = JSON.parse(cleanContent);
            
            if (!data.methods || !Array.isArray(data.methods) || data.methods.length === 0) {
                throw new Error('无效的JSON结构');
            }
            
            console.log('✅ JSON解析成功:', data);
            console.log('📊 方法数量:', data.methods.length);
            
            // 生成美观的HTML
            let html = '';
            
            data.methods.forEach((method, index) => {
                const type = method.type || '记忆方法';
                const icon = this.getMemoryMethodIcon(type); // 自动匹配图标
                const content = method.content || '';
                
                console.log(`  方法${index + 1}: type="${type}", icon="${icon}", content长度=${content.length}`);
                
                if (!content) {
                    console.log(`  ⚠️ 跳过空内容: type="${type}"`);
                    return; // 跳过空内容
                }
                
                html += `
                    <div class="memory-method-section">
                        <div class="memory-method-title">
                            <span class="memory-icon">${icon}</span>
                            <span class="memory-type">${type}</span>
                        </div>
                        <div class="memory-method-content">
                            ${this.formatContentText(content)}
                        </div>
                    </div>
                `;
            });
            
            console.log('🎨 生成的HTML长度:', html.length);
            return html || '<p>暂无记忆方法</p>';
            
        } catch (error) {
            console.error('❌ JSON解析失败，使用备用格式化:', error);
            console.log('原始内容:', content);
            
            // 如果JSON解析失败，使用备用的文本格式化
            return this.formatContentAsPlainText(content);
        }
    }
    
    // 格式化内容文本（处理特殊格式）
    formatContentText(text) {
        if (!text) return '';
        
        let formatted = text.trim();
        
        // 处理粗体 **文字**
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="memory-highlight">$1</strong>');
        
        // 处理列表项（- 开头）
        if (formatted.includes('\n- ')) {
            const lines = formatted.split('\n');
            let result = '';
            let inList = false;
            
            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('- ')) {
                    if (!inList) {
                        result += '<ul class="memory-list">';
                        inList = true;
                    }
                    result += `<li>${line.substring(2)}</li>`;
                } else {
                    if (inList) {
                        result += '</ul>';
                        inList = false;
                    }
                    if (line) {
                        result += `<p>${line}</p>`;
                    }
                }
            });
            
            if (inList) {
                result += '</ul>';
            }
            
            return result;
        }
        
        // 处理普通换行
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    // 备用的纯文本格式化（当JSON解析失败时使用）
    formatContentAsPlainText(content) {
        let formatted = content.trim();
        
        // 尝试提取JSON对象，即使格式不完美
        try {
            // 清理中文引号和特殊字符
            let cleaned = formatted
                .replace(/"/g, '"').replace(/"/g, '"')
                .replace(/'/g, "'").replace(/'/g, "'")
                .replace(/[\n\r\t]/g, ' ')
                .replace(/\s+/g, ' '); // 多个空格合并为一个
            
            // 尝试再次解析
            const data = JSON.parse(cleaned);
            if (data.methods && Array.isArray(data.methods)) {
                console.log('🔄 备用格式化中成功解析JSON');
                let html = '';
                data.methods.forEach(method => {
                    const type = method.type || '记忆方法';
                    const icon = this.getMemoryMethodIcon(type);
                    const content = method.content || '';
                    if (content) {
                        html += `
                            <div class="memory-method-section">
                                <div class="memory-method-title">
                                    <span class="memory-icon">${icon}</span>
                                    <span class="memory-type">${type}</span>
                                </div>
                                <div class="memory-method-content">
                                    ${this.formatContentText(content)}
                                </div>
                            </div>
                        `;
                    }
                });
                if (html) return html;
            }
        } catch (e) {
            console.log('🔄 备用格式化也无法解析JSON，使用纯文本处理');
        }
        
        // 如果还是失败，尝试手动提取type和content
        console.log('🔄 进入纯文本提取模式');
        
        // 尝试匹配 "type": "xxx" 和 "content": "xxx" 的模式
        const methodRegex = /"type"\s*:\s*"([^"]+)"\s*,?\s*"content"\s*:\s*"([^"]+)"/gi;
        const matches = [...formatted.matchAll(methodRegex)];
        
        if (matches.length > 0) {
            console.log(`📝 手动提取到 ${matches.length} 个方法`);
            let html = '';
            matches.forEach(match => {
                const type = match[1];
                const content = match[2];
                const icon = this.getMemoryMethodIcon(type);
                
                html += `
                    <div class="memory-method-section">
                        <div class="memory-method-title">
                            <span class="memory-icon">${icon}</span>
                            <span class="memory-type">${type}</span>
                        </div>
                        <div class="memory-method-content">
                            ${this.formatContentText(content)}
                        </div>
                    </div>
                `;
            });
            
            if (html) return html;
        }
        
        // 最后的纯文本处理
        console.log('📄 使用最终的纯文本格式化');
        formatted = formatted
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/```\s*$/, '')
            .replace(/[{}\[\]"]/g, '') // 移除JSON符号
            .replace(/\btype:\s*/gi, '\n\n')
            .replace(/\bcontent:\s*/gi, '')
            .replace(/\bmethods:\s*/gi, '')
            .replace(/\bicon:\s*[^\s,}]+,?\s*/gi, '') // 移除icon字段
            .replace(/,\s*,/g, ',') // 移除多余逗号
            .replace(/^[#*\-,]+\s*/gm, '') // 移除markdown符号
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // 简单分段
        const paragraphs = formatted.split(/\n\n+/).filter(p => p.trim());
        let html = '';
        
        paragraphs.forEach((para, index) => {
            para = para.trim();
            if (para && para.length > 2) { // 忽略太短的段落
                html += `
                    <div class="memory-method-section">
                        <div class="memory-method-title">
                            <span class="memory-icon">💡</span>
                            <span class="memory-type">记忆提示 ${index + 1}</span>
                        </div>
                        <div class="memory-method-content">
                            ${para.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                `;
            }
        });
        
        return html || `
            <div class="memory-method-section">
                <div class="memory-method-content">
                    ${content.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
    }

    // 关闭记忆方法卡片
    closeMemoryAid() {
        // PC端卡片
        const card = document.getElementById('memoryAidCard');
        if (card) {
            card.classList.remove('show');
            setTimeout(() => {
                card.classList.add('hidden');
            }, 300);
        }

        // 移动端弹窗
        const modal = document.getElementById('memoryAidModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    }

    selectOption(selected, correct) {
        console.log('📝 selectOption 被调用:', { selected, correct });
        
        // 检测是否点击了"如何记忆？"按钮
        if (selected === '如何记忆？') {
            console.log('💡 检测到点击"如何记忆？"按钮');
            this.showMemoryAid();
            return;
        }
        
        // 移除焦点，避免移动端出现绿色边框
        if (document.activeElement) {
            document.activeElement.blur();
        }
        
        const buttons = document.querySelectorAll('.option-btn');
        
        const isCorrect = selected === correct;
        const isUnknown = selected === '不知道';

        // 记录当前单词的答题结果
        if (isCorrect) {
            // 答对了，禁用所有按钮
            buttons.forEach(btn => {
                btn.disabled = true;
                // 使用dataset.option准确匹配，避免textContent的换行符问题
                const btnOption = btn.dataset.option;
                if (btnOption === correct) {
                    btn.classList.add('correct');
                }
            });
            
            // 如果是首次答题，记录首次结果
            if (!this.wordFirstResults[this.currentWordIndex]) {
                this.wordFirstResults[this.currentWordIndex] = 'correct';
                this.sessionResults.correct++;
                
                // 更新单词统计（答对）
                this.updateWordStats(this.sessionWords[this.currentWordIndex], true);
                
                // 如果是复习模式，从错题列表中移除该单词
                if (this.isReviewMode) {
                    this.removeCorrectWordFromWrongList(this.sessionWords[this.currentWordIndex]);
                }
                
                // 首次作答，更新词书进度和今日统计
                this.updateBookProgress();
                this.updateStatsRealtime();
            }
            
            this.wordResults[this.currentWordIndex] = 'correct';
            
            // 如果之前不是"不知道"状态，播放动画和音效
            const wasUnknown = this.wordResults[this.currentWordIndex - 1] === 'unknown' && 
                              this.currentWordIndex === this.currentWordIndex; // 同一题
            
            if (this.wordFirstResults[this.currentWordIndex] !== 'unknown') {
                // 首次答对，播放动画和音效
                this.playAnimation(true);
                this.playCorrectSound();
            } else {
                // 点击"不知道"后再点正确答案，只播放音效，不播放动画
                this.playCorrectSound();
            }
            
            // 答对才允许切换
            if (this.settings.autoNext) {
                document.getElementById('nextBtn').disabled = false;
                const autoNextTime = parseFloat(this.settings.autoNextTime || 3);
                if (autoNextTime > 0) {
                    this.autoNextTimer = setTimeout(() => {
                        this.nextWord();
                    }, autoNextTime * 1000);
                }
            } else {
                document.getElementById('nextBtn').disabled = false;
            }
        } else if (isUnknown) {
            // 不知道，显示正确答案但不禁用所有按钮
            buttons.forEach(btn => {
                const btnOption = btn.dataset.option;
                if (btnOption === correct) {
                    // 正确答案显示橙色，但不禁用，允许点击
                    btn.classList.add('correct-unknown');
                } else {
                    // 其他选项禁用
                    btn.disabled = true;
                }
            });
            
            // 如果是首次答题，记录首次结果
            if (!this.wordFirstResults[this.currentWordIndex]) {
                this.wordFirstResults[this.currentWordIndex] = 'unknown';
                this.sessionResults.unknown++;
                
                // ✅ 先更新统计（答错）
                this.updateWordStats(this.sessionWords[this.currentWordIndex], false);
                
                // 实时更新错题到词书并更新待复习数量
                this.updateWrongWordToBook(this.sessionWords[this.currentWordIndex]);
                
                // 首次作答，更新词书进度和今日统计
                this.updateBookProgress();
                this.updateStatsRealtime();
            }
            
            this.wordResults[this.currentWordIndex] = 'unknown';
            
            // 播放答错音效（不知道也算错）
            this.playWrongSound();
            
            // 显示例句并朗读（不知道样式）
            this.showExampleOnWrongAnswer('unknown');
            
            // 将"不知道"按钮文字改为"如何记忆？"
            const unknownButton = Array.from(buttons).find(btn => btn.dataset.option === '不知道');
            if (unknownButton && !unknownButton.dataset.memoryAidMode) {
                const optionContent = unknownButton.querySelector('.option-content');
                if (optionContent) {
                    const optionText = optionContent.querySelector('.option-text');
                    if (optionText) {
                        optionText.textContent = '如何记忆？';
                        // 修改dataset.option的值，这样点击时才能正确识别
                        unknownButton.dataset.option = '如何记忆？';
                        unknownButton.dataset.memoryAidMode = 'true'; // 标记已改变
                        unknownButton.classList.add('memory-aid-btn');
                        // 移除禁用状态，允许点击
                        unknownButton.disabled = false;
                    }
                }
            }
            
            // ❌ 不知道后不允许直接切换，必须点击正确答案才能切换
            document.getElementById('nextBtn').disabled = true;
            // 清除自动切换计时器
            if (this.autoNextTimer) {
                clearTimeout(this.autoNextTimer);
                this.autoNextTimer = null;
            }
        } else {
            // 答错了，只标记错误选项，其他选项可以继续选择
            let wrongButton = null;
            buttons.forEach(btn => {
                // 使用dataset.option准确匹配，避免textContent的换行符问题
                const btnOption = btn.dataset.option;
                if (btnOption === selected) {
                    btn.classList.add('wrong');
                    btn.disabled = true; // 只禁用错误的选项
                    wrongButton = btn;
                }
            });
            
            // 如果是首次答题，记录首次结果
            if (!this.wordFirstResults[this.currentWordIndex]) {
                this.wordFirstResults[this.currentWordIndex] = 'wrong';
                this.sessionResults.wrong++;
                
                // ✅ 先更新统计（答错）
                this.updateWordStats(this.sessionWords[this.currentWordIndex], false);
                
                // 实时更新错题到词书并更新待复习数量
                this.updateWrongWordToBook(this.sessionWords[this.currentWordIndex]);
                
                // 首次作答（答错），更新词书进度
                this.updateBookProgress();
                
                // 实时更新今日统计
                this.updateStatsRealtime();
            }
            
            this.wordResults[this.currentWordIndex] = 'wrong';
            this.playAnimation(false);
            
            // 播放答错音效
            this.playWrongSound();
            
            // 显示例句并朗读
            this.showExampleOnWrongAnswer();
            
            // 在错误答案下方显示原词（上浮动画）
            if (wrongButton && this.meaningToWordMap && this.meaningToWordMap[selected]) {
                this.showOriginalWord(wrongButton, this.meaningToWordMap[selected]);
            }
            
            // ❌ 答错不允许切换，禁用"下一题"按钮
            document.getElementById('nextBtn').disabled = true;
            // 清除自动切换计时器
            if (this.autoNextTimer) {
                clearTimeout(this.autoNextTimer);
                this.autoNextTimer = null;
            }
        }
    }

    // 计算两个字符串的相似度（0-1之间）
    calculateSimilarity(str1, str2) {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        // 完全相同
        if (s1 === s2) return 1;
        
        // 使用Levenshtein距离计算相似度
        const len1 = s1.length;
        const len2 = s2.length;
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : 1 - (distance / maxLen);
    }

    // 获取单词的词干（简单版词形还原）
    getWordStem(word) {
        const lower = word.toLowerCase();
        
        // 常见的后缀变化
        const suffixes = [
            'ing', 'ed', 'es', 's', 'ly', 'er', 'est', 'tion', 'ment', 'ness', 'ity', 'able', 'ible', 'al', 'ful', 'less', 'ous', 'ive', 'y'
        ];
        
        // 尝试移除后缀
        for (const suffix of suffixes) {
            if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
                return lower.slice(0, -suffix.length);
            }
        }
        
        return lower;
    }

    // 检查单词是否应该被隐藏（用于例句处理）
    shouldHideWord(targetWord, exampleWord) {
        const target = targetWord.toLowerCase();
        const example = exampleWord.toLowerCase();
        
        // 1. 完全匹配
        if (target === example) return true;
        
        // 2. 词干匹配（词形变化）
        const targetStem = this.getWordStem(target);
        const exampleStem = this.getWordStem(example);
        if (targetStem === exampleStem && targetStem.length >= 3) return true;
        
        // 3. 相似度匹配（>80%）
        const similarity = this.calculateSimilarity(target, example);
        if (similarity > 0.8) return true;
        
        return false;
    }

    // 显示拼写模式
    showSpellMode(word) {
        document.getElementById('modeSelectMeaning').classList.add('hidden');
        document.getElementById('modeSpellWord').classList.remove('hidden');
        
        // 显示"下一个"按钮（拼写模式需要）
        document.getElementById('nextBtn').style.display = '';

        const def = word.definitions[0];
        
        // 隐藏词性元素（词性已整合到释义中）
        const posTextElement = document.getElementById('meaningPartOfSpeech');
        posTextElement.textContent = '';
        posTextElement.style.display = 'none';
        
        // 显示CEFR等级标签
        const cefrLevel = this.getWordCEFRLevel(word.word);
        const posElement = document.getElementById('meaningPos');
        if (cefrLevel) {
            posElement.textContent = cefrLevel;
            posElement.className = `meaning-pos cefr-${cefrLevel.toLowerCase()}`;
            posElement.style.display = 'inline-block';
        } else {
            posElement.textContent = '';
            posElement.className = 'meaning-pos';
            posElement.style.display = 'none';
        }
        
        // 显示完整释义，将换行符替换为空格（一行显示）
        const meaningText = (def.meaning || '').replace(/\n/g, '  ');
        document.getElementById('meaningText').textContent = meaningText;
        
        // 处理例句：将单词及其变形替换为下划线（避免泄露答案）
        let exampleText = def.example || '';
        if (exampleText) {
            // 分词处理（保留标点）
            exampleText = exampleText.replace(/\b[\w']+\b/g, (match) => {
                // 检查是否需要隐藏这个单词
                if (this.shouldHideWord(word.word, match)) {
                    return '_'.repeat(match.length);
                }
                return match;
            });
        }
        document.getElementById('exampleSentence').textContent = exampleText;

        // 生成字母槽
        this.generateLetterSlots(word.word);

        // 清空输入
        const input = document.getElementById('spellInput');
        input.value = '';
        input.focus();
        
        // 更新"不知道"按钮的快捷键显示
        const unknownHotkey = this.settings.hotkeys?.option3 || '3';
        const unknownHotkeyElement = document.getElementById('unknownSpellHotkey');
        if (unknownHotkeyElement) {
            unknownHotkeyElement.textContent = unknownHotkey.toUpperCase();
        }
        
        // 显示上次答题记录
        this.showLastWordBadge('lastWordBadge2');
    }

    // 生成字母槽
    generateLetterSlots(word) {
        const container = document.getElementById('letterSlots');
        container.innerHTML = '';

        for (let i = 0; i < word.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'letter-slot';
            slot.dataset.index = i;
            slot.dataset.letter = word[i].toLowerCase();
            container.appendChild(slot);
        }

        // 激活第一个槽
        container.children[0].classList.add('active');
    }

    // 处理拼写输入
    handleSpellInput(value) {
        const word = this.sessionWords[this.currentWordIndex].word;
        const slots = document.querySelectorAll('.letter-slot');
        
        // 根据Caps Lock状态处理输入
        let letters;
        if (this.capsLockOn) {
            // Caps Lock开启，保持大写
            letters = value.toUpperCase().split('');
        } else {
            // Caps Lock关闭，转为小写
            letters = value.toLowerCase().split('');
        }

        // 清空所有槽
        slots.forEach(slot => {
            slot.textContent = '';
            slot.classList.remove('filled', 'wrong', 'correct', 'active');
        });

        let hasWrongLetter = false; // 检测是否有错误字母

        // 填充字母
        letters.forEach((letter, index) => {
            if (index < slots.length) {
                const slot = slots[index];
                // 显示用户输入的大小写
                slot.textContent = letter;
                slot.classList.add('filled');

                const correctLetter = slot.dataset.letter;
                // 不区分大小写比较
                if (letter.toLowerCase() === correctLetter.toLowerCase()) {
                    slot.classList.add('correct');
                } else {
                    slot.classList.add('wrong');
                    hasWrongLetter = true; // 标记有错误
                }
            }
        });

        // 激活当前位置
        if (letters.length < slots.length) {
            slots[letters.length].classList.add('active');
        }

            // 如果有错误字母，标记为答错（但不播放动画、不更新进度条）
            if (hasWrongLetter) {
                // 如果是首次答题，记录首次结果并播放音效
                if (!this.wordFirstResults[this.currentWordIndex]) {
                    this.wordFirstResults[this.currentWordIndex] = 'wrong';
                    this.sessionResults.wrong++;
                    this.playWrongSound(); // 首次答错时播放音效
                    
                    // ✅ 先更新统计（答错）
                    this.updateWordStats(this.sessionWords[this.currentWordIndex], false);
                    
                    // 实时更新错题到词书并更新待复习数量
                    this.updateWrongWordToBook(this.sessionWords[this.currentWordIndex]);
                    
                    // 首次作答（答错），更新词书进度和今日统计
                    this.updateBookProgress();
                    this.updateStatsRealtime();
                }
                
                // 禁用"下一题"按钮
            document.getElementById('nextBtn').disabled = true;
            // 清除自动切换计时器
            if (this.autoNextTimer) {
                clearTimeout(this.autoNextTimer);
                this.autoNextTimer = null;
            }
            
            // 不清空输入，允许用户继续编辑（退格修改）
            return; // 不继续处理
        }

        // 自动提交（如果全部填完且没有错误）
        if (letters.length === word.length && !hasWrongLetter) {
            setTimeout(() => {
                this.submitSpell();
            }, 300);
        }
    }

    // 提交拼写
    submitSpell() {
        const word = this.sessionWords[this.currentWordIndex];
        const input = document.getElementById('spellInput');
        const userAnswer = input.value.toLowerCase().trim();
        const correctAnswer = word.word.toLowerCase();
        
        // 提交后重新聚焦（避免焦点丢失）
        setTimeout(() => this.refocusSpellInput(), 100);

        const isCorrect = userAnswer === correctAnswer;
        
        // 检查是否使用过提示
        const usedHint = this.hintUsedForWords[this.currentWordIndex];

        // 只有答对时才更新结果和播放动画
        if (isCorrect) {
            // 如果使用过提示，即使答对也记录为unknown
            if (usedHint) {
                console.log(`⚠️ 使用过提示，记录为unknown`);
                // 如果是首次答题，记录首次结果
                if (!this.wordFirstResults[this.currentWordIndex]) {
                    this.wordFirstResults[this.currentWordIndex] = 'unknown';
                    this.sessionResults.unknown++;
                    
                    // ✅ 先更新统计（答错）
                    this.updateWordStats(word, false);
                    
                    // 实时更新错题到词书并更新待复习数量
                    this.updateWrongWordToBook(word);
                    
                    // 首次作答，更新词书进度和今日统计
                    this.updateBookProgress();
                    this.updateStatsRealtime();
                }
                this.wordResults[this.currentWordIndex] = 'unknown';
            } else {
                // 没有使用提示，正常记录为correct
                // 如果是首次答题，记录首次结果
                if (!this.wordFirstResults[this.currentWordIndex]) {
                    this.wordFirstResults[this.currentWordIndex] = 'correct';
                    this.sessionResults.correct++;
                    
                    // 更新单词统计（答对）
                    this.updateWordStats(word, true);
                    
                    // 首次作答，更新词书进度和今日统计
                    this.updateBookProgress();
                    this.updateStatsRealtime();
                }
                // 更新进度条（只在答对时）
                this.wordResults[this.currentWordIndex] = this.wordFirstResults[this.currentWordIndex];
            }
            
            // 播放答对动画和音效
            this.playAnimation(true);
            this.playCorrectSound();
            
            // 允许切换到下一题
            if (this.settings.autoNext) {
                document.getElementById('nextBtn').disabled = false;
                const autoNextTime = parseFloat(this.settings.autoNextTime || 3);
                if (autoNextTime > 0) {
                    this.autoNextTimer = setTimeout(() => {
                        this.nextWord();
                    }, autoNextTime * 1000);
                }
            } else {
                document.getElementById('nextBtn').disabled = false;
            }
        }
        // 注意：答错的情况已在handleSpellInput中处理，这里不需要else分支
    }

    // 显示提示（无次数限制，但使用提示后将记录为unknown）
    showHint() {
        const word = this.sessionWords[this.currentWordIndex].word;
        const input = document.getElementById('spellInput');
        const currentInput = input.value.toLowerCase();

        // 提示下一个字母
        if (currentInput.length < word.length) {
            const nextLetter = word[currentInput.length];
            input.value = currentInput + nextLetter;
            this.handleSpellInput(input.value);
            
            // 标记当前单词使用了提示
            this.hintUsedForWords[this.currentWordIndex] = true;
            console.log(`💡 使用了提示，当前单词将被记录为unknown`);
            
            // 重新聚焦输入框，并将光标移到末尾
            setTimeout(() => {
                input.focus();
                // 设置光标位置到输入框末尾，确保后续输入追加而非插入
                input.setSelectionRange(input.value.length, input.value.length);
            }, 10);
        }
    }

    // 拼写模式：不知道
    skipSpellWord() {
        // 如果是首次答题，记录首次结果
        if (!this.wordFirstResults[this.currentWordIndex]) {
            this.wordFirstResults[this.currentWordIndex] = 'unknown';
            this.sessionResults.unknown++;
            
            // ✅ 先更新统计（答错）
            this.updateWordStats(this.sessionWords[this.currentWordIndex], false);
            
            // 实时更新错题到词书并更新待复习数量
            this.updateWrongWordToBook(this.sessionWords[this.currentWordIndex]);
            
            // 首次作答，更新词书进度和今日统计
            this.updateBookProgress();
            this.updateStatsRealtime();
        }
        
        this.wordResults[this.currentWordIndex] = 'unknown';
        
        // 播放答错音效（不知道也算错）
        this.playWrongSound();
        
        // "不知道"允许切换到下一题
        if (this.settings.autoNext) {
            document.getElementById('nextBtn').disabled = false;
            const autoNextTime = parseFloat(this.settings.autoNextTime || 3);
            if (autoNextTime > 0) {
                this.autoNextTimer = setTimeout(() => {
                    this.nextWord();
                }, autoNextTime * 1000);
            }
        } else {
            document.getElementById('nextBtn').disabled = false;
        }
        
        // 重新聚焦输入框（避免焦点丢失）
        setTimeout(() => this.refocusSpellInput(), 100);
    }

    // 处理快捷键按下
    handleHotkeyPress(e) {
        const key = e.key;
        const hotkeys = this.settings.hotkeys || {
            option1: '1', option2: '2', option3: '3',
            option4: '4', option5: '5', option6: '6'
        };

        // 查找对应的选项按钮
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            if (btn.dataset.hotkey === key && !btn.disabled) {
                e.preventDefault();
                btn.click();
            }
        });
    }

    // 显示反馈
    showFeedback(isCorrect, message, detail = '') {
        const overlay = document.getElementById('feedbackOverlay');
        const icon = document.getElementById('feedbackIcon');
        const text = document.getElementById('feedbackText');
        const answer = document.getElementById('correctAnswer');

        icon.textContent = isCorrect ? '✓' : '✗';
        text.textContent = message;
        answer.textContent = detail;

        overlay.classList.remove('hidden');

        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 2500);
    }

    // 下一个单词
    nextWord() {
        // 清除自动下一题计时器
        if (this.autoNextTimer) {
            clearTimeout(this.autoNextTimer);
            this.autoNextTimer = null;
        }
        
        // 清除当前所有按钮的focus状态（iOS修复）
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.blur();
        });
        
        // 移除任何活动元素的focus
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }

        // 保存当前单词信息作为上一题记录（使用首次答题结果）
        if (this.sessionWords[this.currentWordIndex]) {
            const currentWord = this.sessionWords[this.currentWordIndex];
            const currentFirstResult = this.wordFirstResults[this.currentWordIndex];
            this.lastWordInfo = {
                word: currentWord.word,
                pos: currentWord.definitions[0].pos,
                meaning: currentWord.definitions[0].meaning,
                result: currentFirstResult, // 'correct', 'wrong', 'unknown' - 使用首次结果
                favorite: currentWord.favorite || false, // 收藏状态
                originalIndex: currentWord.originalIndex // 原始索引，用于收藏功能
            };
        }

        document.getElementById('nextBtn').disabled = true;
        this.currentWordIndex++;
        this.showWord();
    }

    // 跳过单词
    skipWord() {
        // 如果是首次答题，记录首次结果
        if (!this.wordFirstResults[this.currentWordIndex]) {
            this.wordFirstResults[this.currentWordIndex] = 'unknown';
            this.sessionResults.unknown++;
            
            // ✅ 先更新统计（答错）
            this.updateWordStats(this.sessionWords[this.currentWordIndex], false);
            
            // 实时更新错题到词书并更新待复习数量
            this.updateWrongWordToBook(this.sessionWords[this.currentWordIndex]);
            
            // 首次作答，更新词书进度和今日统计
            this.updateBookProgress();
            this.updateStatsRealtime();
        }
        
        this.wordResults[this.currentWordIndex] = 'unknown';
        
        this.nextWord();
    }

    // 更新进度
    updateProgress() {
        const current = this.currentWordIndex + 1;
        const total = this.sessionWords.length;

        document.getElementById('currentIndex').textContent = current;
        document.getElementById('totalWords').textContent = total;

        // 计算正确率
        const attempted = this.sessionResults.correct + this.sessionResults.wrong;
        const accuracy = attempted > 0 ? Math.round((this.sessionResults.correct / attempted) * 100) : 0;
        document.getElementById('accuracy').textContent = `${accuracy}%`;

        // 更新异色进度条
        this.updateColoredProgress();

        // 不在这里更新词书进度，改为在用户作答后才更新
        // this.updateBookProgress();
    }

    // 更新异色进度条
    updateColoredProgress() {
        const track = document.getElementById('progressTrack');
        const total = this.sessionWords.length;
        const segmentWidth = 100 / total; // 每个单词占的百分比

        // 清空进度条
        track.innerHTML = '';

        // 创建已答题的进度段
        for (let i = 0; i < this.currentWordIndex; i++) {
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            segment.style.width = `${segmentWidth}%`;
            
            // 根据首次答题结果设置颜色（使用首次结果，反映真实的答题情况）
            if (this.wordFirstResults && this.wordFirstResults[i]) {
                segment.classList.add(this.wordFirstResults[i]); // 'correct', 'wrong', 或 'unknown'
            }
            
            track.appendChild(segment);
        }

        // 添加当前正在答的单词（高亮）
        if (this.currentWordIndex < total) {
            const currentSegment = document.createElement('div');
            currentSegment.className = 'progress-segment current';
            currentSegment.style.width = `${segmentWidth}%`;
            track.appendChild(currentSegment);
        }

        // 添加未答的单词（灰色）
        for (let i = this.currentWordIndex + 1; i < total; i++) {
            const segment = document.createElement('div');
            segment.className = 'progress-segment pending';
            segment.style.width = `${segmentWidth}%`;
            track.appendChild(segment);
        }
    }

    // 实时更新词书进度（每答完一题后调用）
    updateBookProgress() {
        if (this.currentBook) {
            // ⚠️ 复习模式下不更新currentIndex，只在学习模式下更新
            if (this.isReviewMode) {
                console.log('📝 [复习模式] 跳过currentIndex更新');
                return;
            }
            
            // 实时进度 = 本次开始索引 + 当前已答题数（包含答对和答错）
            // 这样用户可以实时看到学习进度
            const newIndex = this.sessionStartIndex + this.currentWordIndex + 1;
            
            Storage.updateBookProgress(this.currentBook.id, { 
                currentIndex: newIndex 
            });
            
            console.log(`📊 [学习模式] 更新进度: currentIndex → ${newIndex}`);
            
            // 重新渲染词书列表以显示更新
            this.loadBooks();
        }
    }

    // 更新单词统计显示（显示错误率/练习次数）
    updateWordStatsDisplay(word) {
        const statsElement = document.getElementById('wordStats');
        if (!statsElement) return;
        
        const totalAttempts = word.totalAttempts || 0;
        const wrongTimes = word.wrongTimes || 0;
        
        // 如果有统计数据（练习次数>0），则显示
        if (totalAttempts > 0) {
            const errorRate = Math.round((wrongTimes / totalAttempts) * 100);
            const modeLabel = this.isReviewMode ? '复习中' : ''; 
            statsElement.innerHTML = `<span class="stats-label">错误率</span> <span class="stats-value">${errorRate}%</span> <span class="stats-detail">(${wrongTimes}/${totalAttempts})${modeLabel}</span>`;
            statsElement.style.display = 'inline-flex';
            console.log(`📊 显示统计: "${word.word}" - ${errorRate}% (${wrongTimes}/${totalAttempts})`);
        } else {
            statsElement.style.display = 'none';
        }
    }

    // 更新单词练习次数统计（答对或答错都会调用）
    updateWordStats(word, isCorrect) {
        if (!word) {
            console.error(`❌ updateWordStats 失败: word 为空`);
            return;
        }

        // 优先使用 word._bookId，否则使用 currentBook
        const bookId = word._bookId || this.currentBook?.id;
        if (!bookId) {
            console.error(`❌ updateWordStats 失败: 无法确定词书ID`);
            return;
        }

        const book = Storage.getBook(bookId);
        if (!book) {
            console.error(`❌ updateWordStats 失败: 找不到词书 ${bookId}`);
            return;
        }

        // 优先使用 word._wordIndex，否则通过单词文本查找
        let wordIndex = word._wordIndex;
        if (wordIndex === undefined) {
            wordIndex = book.words.findIndex(w => w.word === word.word);
        }
        
        if (wordIndex < 0 || wordIndex >= book.words.length) {
            console.error(`❌ updateWordStats 失败: 找不到单词 "${word.word}" (索引: ${wordIndex})`);
            return;
        }

        // 直接更新词书中的单词对象
        const wordInBook = book.words[wordIndex];
        
        // 记录更新前的状态
        const beforeAttempts = wordInBook.totalAttempts || 0;
        const beforeWrong = wordInBook.wrongTimes || 0;
        
        // 初始化统计字段
        if (!wordInBook.totalAttempts) wordInBook.totalAttempts = 0;
        if (!wordInBook.wrongTimes) wordInBook.wrongTimes = 0;
        
        // 更新总练习次数
        wordInBook.totalAttempts += 1;
        
        // 如果答错，更新错误次数和最后错误时间
        if (!isCorrect) {
            wordInBook.wrongTimes += 1;
            wordInBook.lastWrongDate = Date.now();
        }
        
        // 记录更新后的状态
        const afterAttempts = wordInBook.totalAttempts;
        const afterWrong = wordInBook.wrongTimes;
        
        // 计算错误率
        const errorRate = Math.round((wordInBook.wrongTimes / wordInBook.totalAttempts) * 100);
        
        const mode = this.isReviewMode ? '复习' : '学习';
        console.log(`📊 [${mode}] "${word.word}" 统计更新:`);
        console.log(`   ${isCorrect ? '✓答对' : '✗答错'} | 练习 ${beforeAttempts}→${afterAttempts}次 | 错误 ${beforeWrong}→${afterWrong}次 | 错误率${errorRate}%`);
        
        // 🔥 关键修复：正确调用 Storage.updateBook
        // updateBook 的签名是 (bookId, updates)
        const updatedBook = Storage.updateBook(bookId, book);
        if (updatedBook) {
            console.log(`✅ 词书已保存 (bookId: ${bookId})`);
            
            // 验证保存是否成功 - 重新从storage读取
            const verifyBook = Storage.getBook(bookId);
            const verifyWord = verifyBook.words[wordIndex];
            console.log(`🔍 验证: 练习${verifyWord.totalAttempts || 0}次 | 错误${verifyWord.wrongTimes || 0}次`);
            
            if (verifyWord.totalAttempts !== afterAttempts) {
                console.error(`❌ 验证失败！期望${afterAttempts}次，实际${verifyWord.totalAttempts || 0}次`);
            }
        } else {
            console.error(`❌ 词书保存失败！bookId: ${bookId}`);
        }
        
        // 同步更新当前单词对象的统计（用于显示）
        word.totalAttempts = wordInBook.totalAttempts;
        word.wrongTimes = wordInBook.wrongTimes;
        word.lastWrongDate = wordInBook.lastWrongDate;
        
        // 实时更新显示
        this.updateWordStatsDisplay(word);
    }

    // 实时更新错题到词书（答错时立即调用）
    updateWrongWordToBook(word) {
        if (!this.currentBook || !word) return;

        // ⚠️ 注意：统计更新已在 selectOption 中完成，这里不需要重复调用
        // this.updateWordStats(word, false); // ❌ 已移除，避免重复统计

        const book = Storage.getBook(this.currentBook.id);
        if (!book) return;

        const existingWrong = book.progress.wrong || [];
        
        // 检查是否已存在
        const existingIndex = existingWrong.findIndex(w => w.word === word.word);
        
        // 从词书中获取最新的单词数据（包含更新后的统计）
        const wordIndex = book.words.findIndex(w => w.word === word.word);
        const updatedWord = wordIndex >= 0 ? book.words[wordIndex] : word;
        
        if (existingIndex >= 0) {
            // 更新已存在的错题
            existingWrong[existingIndex] = {
                ...existingWrong[existingIndex],
                ...updatedWord,  // 包含最新的 wrongTimes, totalAttempts 等
                wrongAt: new Date().toISOString(),
                reviewCount: (existingWrong[existingIndex].reviewCount || 0)
            };
            console.log(`❌ 答错单词 "${word.word}" (已存在，更新时间)`);
        } else {
            // 添加新错题
            existingWrong.push({
                ...updatedWord,  // 包含最新的 wrongTimes, totalAttempts 等
                wrongAt: new Date().toISOString(),
                reviewCount: 0
            });
            console.log(`❌ 答错单词 "${word.word}" (新增)，当前错题总数: ${existingWrong.length}`);
        }

        // 保存更新后的错题列表
        Storage.updateBookProgress(this.currentBook.id, { wrong: existingWrong });
        
        // 重新加载词书数据（确保checkReview能获取最新数据）
        this.books = Storage.loadBooks();
        
        // 实时更新右侧待复习单词数量
        this.checkReview();
        
        // 实时更新完成页面的复习按钮
        const reviewBtn = document.getElementById('reviewWrongBtn');
        if (reviewBtn && existingWrong.length > 0) {
            reviewBtn.textContent = `复习错题 (${existingWrong.length})`;
        }
    }

    // 从错题列表中移除已答对的单词（复习模式答对时调用）
    removeCorrectWordFromWrongList(word) {
        if (!this.currentBook || !word) return;

        const book = Storage.getBook(this.currentBook.id);
        if (!book) return;

        const existingWrong = book.progress.wrong || [];
        
        // 查找该单词在错题列表中的索引
        const existingIndex = existingWrong.findIndex(w => w.word === word.word);
        
        if (existingIndex >= 0) {
            // 从错题列表中移除
            existingWrong.splice(existingIndex, 1);
            console.log(`✅ 答对单词 "${word.word}"，已从错题列表移除，剩余错题: ${existingWrong.length}`);
            
            // 保存更新后的错题列表
            Storage.updateBookProgress(this.currentBook.id, { wrong: existingWrong });
            
            // 重新加载词书数据（确保checkReview能获取最新数据）
            this.books = Storage.loadBooks();
            
            // 实时更新右侧待复习单词数量
            this.checkReview();
            
            // 实时更新完成页面的复习按钮
            const reviewBtn = document.getElementById('reviewWrongBtn');
            if (reviewBtn) {
                if (existingWrong.length > 0) {
                    reviewBtn.textContent = `复习错题 (${existingWrong.length})`;
                } else {
                    reviewBtn.textContent = '复习错题';
                }
            }
        } else {
            console.log(`ℹ️ 单词 "${word.word}" 不在错题列表中，无需移除`);
        }
    }

    // 显示完成页面
    showCompletion() {
        // 停止今日统计显示定时器
        this.stopStatsDisplayTimer();
        
        this.showScreen('completionScreen');

        // 更新统计
        const total = this.sessionResults.correct + this.sessionResults.wrong + this.sessionResults.unknown;
        const accuracy = total > 0 ? Math.round((this.sessionResults.correct / total) * 100) : 0;

        document.getElementById('statsTotal').textContent = total;
        document.getElementById('statsCorrect').textContent = this.sessionResults.correct;
        document.getElementById('statsWrong').textContent = this.sessionResults.wrong;
        document.getElementById('statsAccuracy').textContent = `${accuracy}%`;

        // 保存最后的时间增量（单词数和答题结果已在实时更新中记录，避免重复）
        const elapsed = (Date.now() - this.startTime) / 60000; // 分钟（保留小数）
        if (elapsed > 0) {
            const currentStats = Storage.loadStats();
            Storage.updateStats({
                time: currentStats.time + elapsed,
                words: currentStats.words,
                correct: currentStats.correct,
                wrong: currentStats.wrong
            });
        }

        // 检测是否完成整本词书
        let bookCompleted = false;
        if (this.currentBook) {
            const book = Storage.getBook(this.currentBook.id);
            if (book) {
                const totalWords = book.words.length;
                const currentIndex = book.progress.currentIndex;
                bookCompleted = currentIndex >= totalWords;
                
                console.log(`📊 完成检测 - 当前进度: ${currentIndex}/${totalWords}, 完成: ${bookCompleted}`);
            }
        }

        // 根据是否完成整本词书显示不同的内容
        const completionTitle = document.querySelector('.completion-title');
        const completionIcon = document.querySelector('.completion-icon');
        const continueBtn = document.getElementById('continueBtn');
        
        if (bookCompleted) {
            completionIcon.textContent = '🎊';
            completionTitle.textContent = '词书已学完！';
            continueBtn.textContent = '开启新一轮';
            continueBtn.onclick = () => this.startNewRound();
        } else {
            completionIcon.textContent = '🎉';
            completionTitle.textContent = '恭喜完成学习！';
            continueBtn.textContent = '继续学习';
            continueBtn.onclick = () => this.continueLearning();
        }

        // 更新错题按钮显示（错题已经在答题时实时添加了）
        if (this.currentBook) {
            // 重新获取最新的词书数据
            const book = Storage.getBook(this.currentBook.id);
            if (book) {
                const existingWrong = book.progress.wrong || [];
                
                console.log(`📊 完成页面 - 词书 "${book.name}" 错题数: ${existingWrong.length}`);
                
                // 根据错题数量显示/隐藏复习按钮
                const reviewBtn = document.getElementById('reviewWrongBtn');
                if (existingWrong.length > 0) {
                    reviewBtn.style.display = 'inline-block';
                    reviewBtn.textContent = `复习错题 (${existingWrong.length})`;
                } else {
                    reviewBtn.style.display = 'none';
                }
            }
        } else {
            // 如果没有词书，隐藏复习按钮
            document.getElementById('reviewWrongBtn').style.display = 'none';
        }

        this.updateStats();
        
        // 重新加载词书数据（确保checkReview能获取最新数据）
        this.books = Storage.loadBooks();
        
        // 实时更新右侧待复习单词数量
        this.checkReview();
    }

    // 复习错题
    reviewWrongWords() {
        if (!this.currentBook) {
            alert('请先选择词书');
            return;
        }

        const book = Storage.getBook(this.currentBook.id);
        if (!book) {
            alert('词书不存在');
            return;
        }

        const wrongWords = book.progress.wrong || [];
        if (wrongWords.length === 0) {
            alert('本次学习没有错题！👏');
            return;
        }

        // 保存当前进度（保持不变，因为已经在学习中实时更新了）
        // 从进度中减去错题数量（因为错题还没真正掌握）
        const currentProgress = book.progress.currentIndex || 0;
        const newProgress = Math.max(0, currentProgress - wrongWords.length);
        Storage.updateBookProgress(this.currentBook.id, { 
            currentIndex: newProgress
        });
        this.loadBooks(); // 刷新显示

        // 使用错题列表开始新一轮学习（错题已经包含 originalIndex）
        this.sessionWords = wrongWords;
        this.currentWordIndex = 0;
        this.sessionResults = { correct: 0, wrong: 0, unknown: 0 };
        this.wordResults = [];
        this.wordFirstResults = [];
        this.hintUsedForWords = []; // 重置提示使用记录
        this.lastWordInfo = null;
        this.isReviewMode = true; // 标记为复习模式
        this.sessionStartIndex = newProgress; // 从减去错题后的位置开始
        this.startTime = Date.now();
        this.sessionStatsRecorded = { correct: 0, wrong: 0, unknown: 0 }; // 重置已记录的统计

        // 记录复习前的错题数量（用于后续对比）
        this.reviewingWrongCount = wrongWords.length;
        
        console.log(`🔄 开始复习 - 词书 "${book.name}" 有 ${wrongWords.length} 个错题`);
        
        // 清空当前错题（复习完会重新统计）
        Storage.updateBookProgress(this.currentBook.id, { wrong: [] });
        
        console.log(`🗑️ 已清空错题列表，准备重新统计`);
        
        // 重新加载词书数据并更新待复习数量
        this.books = Storage.loadBooks();
        this.checkReview();

        // 切换到学习界面
        this.showScreen('learningScreen');
        
        // 启动今日统计显示定时器
        this.startStatsDisplayTimer();

        this.showWord();
    }

    // 继续学习
    continueLearning() {
        // 更新词书进度
        this.updateBookLearningProgress();
        
        // 重新加载词书并继续
        if (this.currentBook) {
            this.startBookLearning(this.currentBook.id);
        } else {
            this.backToHome();
        }
    }

    // 开启新一轮
    startNewRound() {
        if (!this.currentBook) {
            alert('没有选中的词书');
            return;
        }
        
        const book = Storage.getBook(this.currentBook.id);
        if (!book) {
            alert('词书不存在');
            return;
        }
        
        // 更新轮数
        const newRound = (book.round || 1) + 1;
        
        // 重置进度，保留错题
        Storage.updateBookProgress(book.id, {
            currentIndex: 0,
            learned: [],
            correct: []
            // wrong 不重置，保留错题
        });
        
        // 更新轮数
        const books = Storage.loadBooks();
        const bookIndex = books.findIndex(b => b.id === book.id);
        if (bookIndex !== -1) {
            books[bookIndex].round = newRound;
            Storage.saveBooks(books);
        }
        
        console.log(`🔄 开启新一轮 - 词书 "${book.name}" Round ${newRound}`);
        
        // 重新加载词书列表
        this.loadBooks();
        
        // 开始新一轮学习
        this.startBookLearning(book.id);
    }

    // 返回首页
    backToHome() {
        // 停止今日统计显示定时器
        this.stopStatsDisplayTimer();
        
        this.showScreen('welcomeScreen');
    }

    // 退出学习
    exitLearning() {
        if (confirm('确定要退出学习吗？进度将不会保存。')) {
            // 停止今日统计显示定时器
            this.stopStatsDisplayTimer();
            
            this.backToHome();
        }
    }

    // 加载可用的声优
    loadAvailableVoices() {
        // Web Speech API需要异步加载声优列表
        const loadVoices = () => {
            this.availableVoices = speechSynthesis.getVoices();
            //console.log('🔊 可用声优数量:', this.availableVoices.length);
            
            // 打印所有英语声音供调试
            const enVoices = this.availableVoices.filter(v => v.lang.startsWith('en'));
            if (enVoices.length > 0) {
                //console.log('📢 可用英语语音:', enVoices.map(v => `${v.name} (${v.lang})`).join(', '));
            } else {
                console.warn('⚠️ 未找到英语语音，可能需要等待系统加载');
            }
            
            // 【Win11修复】尝试"唤醒"speechSynthesis（避免首次播放失败）
            if (this.availableVoices.length > 0 && !this.speechSynthesisActivated) {
                const utterance = new SpeechSynthesisUtterance('');
                utterance.volume = 0; // 静音
                speechSynthesis.speak(utterance);
                this.speechSynthesisActivated = true;
                console.log('✅ speechSynthesis已激活');
            }
        };

        // 首次加载
        loadVoices();

        // 监听声优加载完成（Chrome/Edge需要）
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        // 延迟再检查一次（Win11有时需要）
        setTimeout(() => {
            if (this.availableVoices.length === 0) {
                console.warn('⚠️ 首次加载声音列表为空，1秒后重试...');
                loadVoices();
            }
        }, 1000);
    }

    // 播放发音（用于学习模式）
    playSound() {
        const word = this.sessionWords[this.currentWordIndex];
        if (!word) return;
        this.speak(word.word);
        
        // 如果是拼写模式，重新聚焦输入框（修复焦点丢失问题）
        setTimeout(() => {
            this.refocusSpellInput();
        }, 200);
    }
    
    // 通用发音方法（可用于任何单词）
    speak(wordText) {
        if (!wordText) return;

        try {
            // 清除之前的定时器，避免多次调用
            if (this.speakTimeout) {
                clearTimeout(this.speakTimeout);
                this.speakTimeout = null;
            }

            // 【修复】只在真正需要时才取消，避免频繁取消导致interrupted错误
            if (speechSynthesis.speaking) {
                console.log('🔊 有语音正在播放，取消并准备播放新的');
                speechSynthesis.cancel();
            }

            // 防抖：延迟播放，避免快速切换导致的中断
            this.speakTimeout = setTimeout(() => {
                try {
                    // 再次检查是否还有语音在播放
                    if (speechSynthesis.speaking) {
                        speechSynthesis.cancel();
                    }

                    const utterance = new SpeechSynthesisUtterance(wordText);
                    utterance.lang = this.settings.voiceAccent || 'en-US';
                    utterance.rate = this.settings.voiceRate || 1.0;
                    utterance.pitch = 1.0;
                    utterance.volume = 1.0;

                    // 如果用户选择了特定声优
                    if (this.settings.voiceModel && this.availableVoices.length > 0) {
                        const selectedVoice = this.availableVoices.find(
                            voice => voice.name === this.settings.voiceModel
                        );
                        if (selectedVoice) {
                            utterance.voice = selectedVoice;
                        }
                    } else {
                        // 自动选择对应语言的声优
                        const voices = this.availableVoices.filter(
                            voice => voice.lang.startsWith(this.settings.voiceAccent.split('-')[0])
                        );
                        if (voices.length > 0) {
                            utterance.voice = voices[0];
                            console.log('🔊 使用声音:', voices[0].name);
                        }
                    }

                    // 添加错误和结束回调
                    utterance.onerror = (event) => {
                        // 只在非正常中断时输出错误
                        if (event.error !== 'interrupted') {
                            console.error('❌ 发音错误:', event.error);
                            if (event.error === 'not-allowed') {
                                console.warn('⚠️ 浏览器阻止了自动播放，请手动点击发音按钮');
                            }
                        }
                    };

                    utterance.onend = () => {
                        console.log('✅ 发音完成:', wordText);
                    };

                    console.log('🔊 开始播放:', wordText);
                    speechSynthesis.speak(utterance);
                } catch (innerError) {
                    console.error('❌ 播放语音时出错:', innerError);
                }
            }, 150); // 增加延迟到150ms，避免快速切换

        } catch (error) {
            console.error('❌ 发音失败:', error);
        }
    }

    // 初始化音效（延迟创建以避免浏览器警告）
    initSoundEffects() {
        this.audioContext = null;
        this.audioContextInitialized = false;
    }
    
    // 确保 AudioContext 已创建
    ensureAudioContext() {
        if (!this.audioContext && !this.audioContextInitialized) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.audioContextInitialized = true;
                console.log('🔊 音效系统初始化成功，状态:', this.audioContext.state);
            } catch (error) {
                console.warn('Web Audio API不可用，音效将被禁用:', error);
                this.audioContextInitialized = true; // 标记已尝试
            }
        }
        return this.audioContext;
    }

    // 播放答对音效
    async playCorrectSound() {
        if (!this.settings.enableSoundEffects) return;
        
        // 延迟创建 AudioContext（在用户交互时）
        const audioContext = this.ensureAudioContext();
        if (!audioContext) return;
        
        console.log('🎵 尝试播放答对音效 - 音效开关:', this.settings.enableSoundEffects, 'AudioContext状态:', audioContext.state);
        
        try {
            // 恢复 AudioContext（浏览器自动播放策略要求）
            if (audioContext.state === 'suspended') {
                console.log('🔓 恢复 AudioContext...');
                await audioContext.resume();
                console.log('✅ AudioContext 已恢复，状态:', audioContext.state);
            }
            
            // 创建一个愉悦的上升音
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            //console.log('✅ 答对音效播放中...');
        } catch (error) {
            //console.error('播放答对音效失败:', error);
        }
    }

    // 播放答错音效
    async playWrongSound() {
        if (!this.settings.enableSoundEffects) return;
        
        // 延迟创建 AudioContext（在用户交互时）
        const audioContext = this.ensureAudioContext();
        if (!audioContext) return;
        
        console.log('🔊 尝试播放答错音效 - 音效开关:', this.settings.enableSoundEffects, 'AudioContext状态:', audioContext.state);
        
        try {
            // 恢复 AudioContext（浏览器自动播放策略要求）
            if (audioContext.state === 'suspended') {
                console.log('🔓 恢复 AudioContext...');
                await audioContext.resume();
                console.log('✅ AudioContext 已恢复，状态:', audioContext.state);
            }
            
            // 创建一个低沉的下降音
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime); // G4
            oscillator.frequency.setValueAtTime(329.63, audioContext.currentTime + 0.15); // E4
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            console.log('✅ 答错音效播放中...');
        } catch (error) {
            console.error('播放答错音效失败:', error);
        }
    }

    // 显示上次答题记录
    showLastWordBadge(badgeId) {
        const badge = document.getElementById(badgeId);
        if (!badge) return;

        if (!this.lastWordInfo) {
            badge.style.display = 'none';
            return;
        }

        const { word, pos, meaning, result, favorite } = this.lastWordInfo;
        const icon = result === 'correct' ? '✔' : result === 'wrong' ? '✗' : '?';
        const className = result === 'correct' ? 'correct' : result === 'wrong' ? 'wrong' : 'unknown';
        
        // 收藏按钮的状态
        const favoriteClass = favorite ? '' : 'favorite-gray';
        
        badge.style.display = 'flex';
        badge.className = `last-word-badge ${className}`;
        badge.innerHTML = `
            <span class="badge-icon">${icon}</span>
            <span class="badge-content">
                <span class="badge-word">${word}</span>:
                <span class="badge-meaning">${pos} ${meaning}</span>
            </span>
            <button class="btn-favorite-badge" title="收藏/取消收藏">
                <span class="favorite-icon ${favoriteClass}">⭐</span>
            </button>
        `;
        
        // 为收藏按钮添加点击事件
        const favoriteBtn = badge.querySelector('.btn-favorite-badge');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止事件冒泡
                this.toggleLastWordFavorite();
            });
        }
    }

    // 播放动画（根据设置选择类型）
    playAnimation(isSuccess) {
        const animationType = this.settings.animationType || 'particles';
        
        switch (animationType) {
            case 'particles':
                this.playParticles(isSuccess);
                break;
            case 'ripple':
                this.playRipple(isSuccess);
                break;
            case 'fireworks':
                this.playFireworks(isSuccess);
                break;
            case 'glow':
                this.playGlow(isSuccess);
                break;
            case 'confetti':
                this.playConfetti(isSuccess);
                break;
            default:
                this.playParticles(isSuccess);
        }
    }

    // 播放粒子动画
    playParticles(isSuccess) {
        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        
        // 根据动画强度设置参数
        let particleCount, speedMultiplier, particleSize, lifeDrain, gravity;
        if (this.settings.animationLevel === 'low') {
            particleCount = 20;
            speedMultiplier = 6;
            particleSize = 3;
            lifeDrain = 0.03;
            gravity = 0.15;
        } else if (this.settings.animationLevel === 'high') {
            particleCount = 80;
            speedMultiplier = 15;
            particleSize = 6;
            lifeDrain = 0.015;
            gravity = 0.25;
        } else { // medium
            particleCount = 40;
            speedMultiplier = 10;
            particleSize = 4;
            lifeDrain = 0.02;
            gravity = 0.2;
        }

        const color = isSuccess ? '#10B981' : '#EF4444';

        // 创建粒子
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * speedMultiplier,
                vy: (Math.random() - 0.5) * speedMultiplier,
                life: 1,
                size: particleSize
            });
        }

        // 动画循环
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                if (p.life <= 0) {
                    particles.splice(index, 1);
                    return;
                }

                ctx.fillStyle = color;
                ctx.globalAlpha = p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                p.x += p.vx;
                p.y += p.vy;
                p.vy += gravity; // 重力
                p.life -= lifeDrain;
            });

            if (particles.length > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    // 播放涟漪动画
    playRipple(isSuccess) {
        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const color = isSuccess ? '#10B981' : '#EF4444';
        const maxRadius = Math.max(canvas.width, canvas.height);
        
        const ripples = [];
        
        // 根据动画强度设置参数
        let rippleCount, rippleSpeed, opacityDrain, lineWidth, rippleDelay;
        if (this.settings.animationLevel === 'low') {
            rippleCount = 2;
            rippleSpeed = 5;
            opacityDrain = 0.015;
            lineWidth = 2;
            rippleDelay = 300;
        } else if (this.settings.animationLevel === 'high') {
            rippleCount = 6;
            rippleSpeed = 12;
            opacityDrain = 0.008;
            lineWidth = 5;
            rippleDelay = 150;
        } else { // medium
            rippleCount = 3;
            rippleSpeed = 8;
            opacityDrain = 0.01;
            lineWidth = 3;
            rippleDelay = 200;
        }

        // 创建涟漪
        for (let i = 0; i < rippleCount; i++) {
            setTimeout(() => {
                ripples.push({ radius: 0, opacity: 1 });
            }, i * rippleDelay);
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ripples.forEach((ripple, index) => {
                if (ripple.opacity <= 0) {
                    ripples.splice(index, 1);
                    return;
                }

                ctx.strokeStyle = color;
                ctx.globalAlpha = ripple.opacity;
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.arc(centerX, centerY, ripple.radius, 0, Math.PI * 2);
                ctx.stroke();

                ripple.radius += rippleSpeed;
                ripple.opacity -= opacityDrain;
            });

            if (ripples.length > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    // 播放烟花动画
    playFireworks(isSuccess) {
        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        
        // 根据动画强度设置参数
        let particleCount, speedMin, speedMax, sizeMin, sizeMax, lifeDrain, gravity, airResistance;
        if (this.settings.animationLevel === 'low') {
            particleCount = 30;
            speedMin = 3;
            speedMax = 6;
            sizeMin = 1.5;
            sizeMax = 3;
            lifeDrain = 0.02;
            gravity = 0.08;
            airResistance = 0.98;
        } else if (this.settings.animationLevel === 'high') {
            particleCount = 120;
            speedMin = 7;
            speedMax = 14;
            sizeMin = 3;
            sizeMax = 7;
            lifeDrain = 0.012;
            gravity = 0.15;
            airResistance = 0.995;
        } else { // medium
            particleCount = 60;
            speedMin = 5;
            speedMax = 10;
            sizeMin = 2;
            sizeMax = 5;
            lifeDrain = 0.015;
            gravity = 0.1;
            airResistance = 0.99;
        }

        const color = isSuccess ? '#10B981' : '#EF4444';
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 创建烟花粒子（从中心爆炸）
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = speedMin + Math.random() * (speedMax - speedMin);
            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                size: sizeMin + Math.random() * (sizeMax - sizeMin)
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                if (p.life <= 0) {
                    particles.splice(index, 1);
                    return;
                }

                ctx.fillStyle = color;
                ctx.globalAlpha = p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                p.x += p.vx;
                p.y += p.vy;
                p.vy += gravity; // 重力
                p.vx *= airResistance; // 空气阻力
                p.life -= lifeDrain;
            });

            if (particles.length > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    // 播放光晕动画
    playGlow(isSuccess) {
        const wordCard = document.getElementById('wordCard');
        const color = isSuccess ? '#10B981' : '#EF4444';
        
        // 根据动画强度设置参数
        let glowSize1, glowSize2, duration, transitionTime;
        if (this.settings.animationLevel === 'low') {
            glowSize1 = 15;
            glowSize2 = 30;
            duration = 400;
            transitionTime = 0.2;
        } else if (this.settings.animationLevel === 'high') {
            glowSize1 = 50;
            glowSize2 = 100;
            duration = 1000;
            transitionTime = 0.5;
        } else { // medium
            glowSize1 = 30;
            glowSize2 = 60;
            duration = 600;
            transitionTime = 0.3;
        }
        
        wordCard.style.transition = `box-shadow ${transitionTime}s ease`;
        wordCard.style.boxShadow = `0 0 ${glowSize1}px ${color}, 0 0 ${glowSize2}px ${color}`;
        
        setTimeout(() => {
            wordCard.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }, duration);
    }

    // 播放彩纸飘落动画
    playConfetti(isSuccess) {
        const canvas = document.getElementById('particleCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const confetti = [];
        
        // 根据动画强度设置参数
        let confettiCount, vxRange, vyMin, vyMax, rotationSpeedRange, widthMin, widthMax, heightMin, heightMax, gravity;
        if (this.settings.animationLevel === 'low') {
            confettiCount = 30;
            vxRange = 1.5;
            vyMin = 1.5;
            vyMax = 3;
            rotationSpeedRange = 6;
            widthMin = 6;
            widthMax = 10;
            heightMin = 9;
            heightMax = 15;
            gravity = 0.08;
        } else if (this.settings.animationLevel === 'high') {
            confettiCount = 120;
            vxRange = 3;
            vyMin = 3;
            vyMax = 6;
            rotationSpeedRange = 15;
            widthMin = 10;
            widthMax = 18;
            heightMin = 15;
            heightMax = 25;
            gravity = 0.12;
        } else { // medium
            confettiCount = 60;
            vxRange = 2;
            vyMin = 2;
            vyMax = 5;
            rotationSpeedRange = 10;
            widthMin = 8;
            widthMax = 14;
            heightMin = 12;
            heightMax = 20;
            gravity = 0.1;
        }

        const colors = isSuccess 
            ? ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']
            : ['#EF4444', '#F87171', '#FCA5A5', '#FEE2E2'];

        // 创建彩纸
        for (let i = 0; i < confettiCount; i++) {
            confetti.push({
                x: Math.random() * canvas.width,
                y: -20,
                vx: (Math.random() - 0.5) * vxRange,
                vy: vyMin + Math.random() * (vyMax - vyMin),
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * rotationSpeedRange,
                color: colors[Math.floor(Math.random() * colors.length)],
                width: widthMin + Math.random() * (widthMax - widthMin),
                height: heightMin + Math.random() * (heightMax - heightMin)
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            confetti.forEach((c, index) => {
                if (c.y > canvas.height) {
                    confetti.splice(index, 1);
                    return;
                }

                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate((c.rotation * Math.PI) / 180);
                ctx.fillStyle = c.color;
                ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
                ctx.restore();

                c.x += c.vx;
                c.y += c.vy;
                c.rotation += c.rotationSpeed;
                c.vy += gravity; // 重力
            });

            if (confetti.length > 0) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    // 切换主题
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        Storage.saveTheme(newTheme);
    }

    // 打开设置
    openSettings() {
        document.getElementById('settingsModal').classList.remove('hidden');
        
        // 加载当前设置
        // 学习模式 - 使用switch-button
        const learningMode = this.settings.learningMode || 'mixed';
        document.querySelectorAll('#learningModeButtons .switch-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === learningMode) {
                btn.classList.add('active');
            }
            // 添加点击事件
            btn.onclick = () => {
                document.querySelectorAll('#learningModeButtons .switch-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });
        
        document.getElementById('wordOrder').value = this.settings.wordOrder || 'sequential';
        document.getElementById('wordsPerSession').value = this.settings.wordsPerSession || 20;
        
        // 无正确答案概率设置
        const noAnswerProbability = this.settings.noAnswerProbability !== undefined ? this.settings.noAnswerProbability : 10;
        document.getElementById('noAnswerProbability').value = noAnswerProbability;
        document.getElementById('noAnswerProbabilityValue').textContent = noAnswerProbability;
        
        document.getElementById('voiceAccent').value = this.settings.voiceAccent;
        document.getElementById('autoSound').checked = this.settings.autoSound;
        document.getElementById('enableSoundEffects').checked = this.settings.enableSoundEffects !== false; // 默认开启
        document.getElementById('animationType').value = this.settings.animationType || 'particles';
        document.getElementById('animationLevel').value = this.settings.animationLevel;
        document.getElementById('autoNext').checked = this.settings.autoNext;
        document.getElementById('autoNextTime').value = this.settings.autoNextTime || 3;
        document.getElementById('autoNextTimeValue').textContent = (this.settings.autoNextTime || 3).toFixed(1);

        // 加载语速设置
        const voiceRate = this.settings.voiceRate || 1.0;
        document.getElementById('voiceRate').value = voiceRate;
        document.getElementById('voiceRateValue').textContent = voiceRate.toFixed(1);

        // 加载AI API密钥
        document.getElementById('aiApiKey').value = this.settings.aiApiKey || '';
        
        // 加载Hugging Face API密钥
        document.getElementById('hfApiKey').value = this.settings.hfApiKey || '';

        // 加载自动保存统计数据设置
        document.getElementById('autoSaveStats').checked = this.settings.autoSaveStats !== false; // 默认开启

        // 填充声优列表
        this.populateVoiceList();

        // 加载快捷键设置
        const hotkeys = this.settings.hotkeys || {
            option1: '1', option2: '2', option3: '3',
            option4: '4', option5: '5', option6: '6'
        };
        document.getElementById('hotkey1').value = hotkeys.option1;
        document.getElementById('hotkey2').value = hotkeys.option2;
        document.getElementById('hotkey3').value = hotkeys.option3;
        document.getElementById('hotkey4').value = hotkeys.option4;
        document.getElementById('hotkey5').value = hotkeys.option5;
        document.getElementById('hotkey6').value = hotkeys.option6;

        // 根据autoNext状态启用/禁用时间设置
        this.toggleAutoNextTimeGroup();

        // 监听autoNext变化
        document.getElementById('autoNext').onchange = () => {
            this.toggleAutoNextTimeGroup();
        };

        // 监听自动切换时间滑块变化
        const timeSlider = document.getElementById('autoNextTime');
        timeSlider.addEventListener('input', (e) => {
            document.getElementById('autoNextTimeValue').textContent = parseFloat(e.target.value).toFixed(1);
        });

        // 监听语速滑块变化
        const rateSlider = document.getElementById('voiceRate');
        rateSlider.addEventListener('input', (e) => {
            document.getElementById('voiceRateValue').textContent = parseFloat(e.target.value).toFixed(1);
        });

        // 监听无正确答案概率滑块变化
        const noAnswerSlider = document.getElementById('noAnswerProbability');
        noAnswerSlider.addEventListener('input', (e) => {
            document.getElementById('noAnswerProbabilityValue').textContent = e.target.value;
        });

        // 监听口音变化，重新填充声优列表
        document.getElementById('voiceAccent').addEventListener('change', () => {
            this.populateVoiceList();
        });
    }

    // 填充声优列表
    populateVoiceList() {
        const voiceSelect = document.getElementById('voiceModel');
        const selectedAccent = document.getElementById('voiceAccent').value;
        
        // 清空现有选项（保留"自动选择"）
        voiceSelect.innerHTML = '<option value="">自动选择（推荐）</option>';
        
        // 获取所有可用的声音
        const voices = this.availableVoices;
        
        if (voices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '加载中...';
            option.disabled = true;
            voiceSelect.appendChild(option);
            console.warn('⚠️ 声音列表为空，可能还在加载中');
            return;
        }
        
        // 筛选匹配的声音
        const matchedVoices = voices.filter(voice => {
            // 根据选择的口音筛选
            if (selectedAccent === 'en-US') {
                return voice.lang.includes('en-US') || voice.lang === 'en';
            } else if (selectedAccent === 'en-GB') {
                return voice.lang.includes('en-GB');
            }
            return voice.lang.startsWith('en');
        });
        
        // 如果没有完全匹配的，显示所有英语声音
        const displayVoices = matchedVoices.length > 0 ? matchedVoices : 
                              voices.filter(v => v.lang.startsWith('en'));
        
        // 添加到下拉框
        displayVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });
        
        // 设置当前选中的声优
        if (this.settings.voiceModel) {
            voiceSelect.value = this.settings.voiceModel;
        }
        
        console.log(`📢 已加载 ${displayVoices.length} 个声优选项`);
    }

    // 切换自动切换时间设置的启用状态
    toggleAutoNextTimeGroup() {
        const autoNext = document.getElementById('autoNext').checked;
        const timeGroup = document.getElementById('autoNextTimeGroup');
        
        if (autoNext) {
            timeGroup.classList.remove('disabled');
        } else {
            timeGroup.classList.add('disabled');
        }
    }

    // 关闭设置
    closeSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    // 切换设置选项卡
    switchSettingsTab(tabName) {
        // 移除所有选项卡的active类
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 移除所有内容区域的active类
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 激活对应的选项卡和内容
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        let contentId;
        switch(tabName) {
            case 'basic':
                contentId = 'basicSettings';
                break;
            case 'ai':
                contentId = 'aiSettings';
                break;
            case 'cache':
                contentId = 'cacheSettings';
                // 加载缓存设置数据
                this.loadCacheSettings();
                break;
            case 'other':
                contentId = 'otherSettings';
                break;
        }
        
        const activeContent = document.getElementById(contentId);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    // 保存设置
    saveSettings() {
        const wordsPerSession = parseInt(document.getElementById('wordsPerSession').value);
        
        // 验证单词数量
        if (isNaN(wordsPerSession) || (wordsPerSession < -1 || wordsPerSession === 0)) {
            alert('请输入有效的单词数量（-1表示无限，或大于0的数字）');
            return;
        }

        // 从switch-button获取学习模式
        const learningModeBtn = document.querySelector('#learningModeButtons .switch-btn.active');
        const learningMode = learningModeBtn ? learningModeBtn.dataset.mode : 'mixed';

        this.settings = {
            learningMode: learningMode,
            wordOrder: document.getElementById('wordOrder').value,
            wordsPerSession: wordsPerSession,
            noAnswerProbability: parseInt(document.getElementById('noAnswerProbability').value), // 无正确答案概率（0-20）
            voiceAccent: document.getElementById('voiceAccent').value,
            voiceModel: document.getElementById('voiceModel').value || '', // 保存选择的声优
            voiceRate: parseFloat(document.getElementById('voiceRate').value) || 1.0, // 保存语速
            autoSound: document.getElementById('autoSound').checked,
            enableSoundEffects: document.getElementById('enableSoundEffects').checked,
            animationType: document.getElementById('animationType').value,
            animationLevel: document.getElementById('animationLevel').value,
            autoNext: document.getElementById('autoNext').checked,
            autoNextTime: parseFloat(document.getElementById('autoNextTime').value),
            autoSaveStats: document.getElementById('autoSaveStats').checked, // 保存自动缓存设置
            aiApiKey: document.getElementById('aiApiKey').value.trim() || '', // 保存AI API密钥（AI工坊）
            hfApiKey: document.getElementById('hfApiKey').value.trim() || '', // 保存Hugging Face API密钥（智能导入）
            hotkeys: {
                option1: document.getElementById('hotkey1').value,
                option2: document.getElementById('hotkey2').value,
                option3: document.getElementById('hotkey3').value,
                option4: document.getElementById('hotkey4').value,
                option5: document.getElementById('hotkey5').value,
                option6: document.getElementById('hotkey6').value
            }
        };

        Storage.saveSettings(this.settings);
        this.closeSettings();
        alert('设置已保存');
    }

    // 重置设置
    resetSettings() {
        if (confirm('确定要恢复默认设置吗？')) {
            this.settings = {
                learningMode: 'mixed',
                wordOrder: 'sequential',
                wordsPerSession: 20,
                noAnswerProbability: 10, // 无正确答案出现概率
                voiceAccent: 'en-US',
                voiceModel: '',
                voiceRate: 1.0,
                autoSound: true,
                enableSoundEffects: true,
                animationType: 'particles',
                animationLevel: 'medium',
                autoNext: true,
                autoNextTime: 3,
                aiApiKey: '', // 默认为空，用户需要自己配置
                hfApiKey: '', // 默认为空，用户需要自己配置
                hotkeys: {
                    option1: '1',
                    option2: '2',
                    option3: '3',
                    option4: '4',
                    option5: '5',
                    option6: '6'
                }
            };
            Storage.saveSettings(this.settings);
            this.closeSettings();
            this.openSettings(); // 重新打开以显示更新后的值
        }
    }

    // 更新统计面板
    updateStats() {
        const stats = Storage.loadStats();
        
        // 将分钟转换为 MM:SS 格式显示
        const totalMinutes = stats.time || 0;
        const minutes = Math.floor(totalMinutes);
        const seconds = Math.round((totalMinutes - minutes) * 60);
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        document.getElementById('todayTime').textContent = timeStr;
        document.getElementById('todayWords').textContent = stats.words || 0;
        document.getElementById('todayMastery').textContent = `${stats.mastery || 0}%`;
        document.getElementById('todayWrong').textContent = stats.wrong || 0;
    }

    // 实时更新今日统计（只在首次作答时调用）
    updateStatsRealtime() {
        // 计算本次新增的作答数（sessionResults - sessionStatsRecorded）
        const newCorrect = this.sessionResults.correct - this.sessionStatsRecorded.correct;
        const newWrong = this.sessionResults.wrong - this.sessionStatsRecorded.wrong;
        const newUnknown = this.sessionResults.unknown - this.sessionStatsRecorded.unknown;
        const newTotal = newCorrect + newWrong + newUnknown;
        
        if (newTotal > 0) {
            // 更新已记录的统计，避免下次重复计数
            this.sessionStatsRecorded.correct = this.sessionResults.correct;
            this.sessionStatsRecorded.wrong = this.sessionResults.wrong;
            this.sessionStatsRecorded.unknown = this.sessionResults.unknown;
            
            // 计算当前session的实时时长（分钟，保留小数以支持秒级精度）
            const currentElapsed = (Date.now() - this.startTime) / 60000;
            
            // 更新存储的统计数据
            const currentStats = Storage.loadStats();
            
            // 复习模式不计入学习单词数（学习单词是指新单词，不是复习）
            const wordsToAdd = this.isReviewMode ? 0 : newTotal;
            
            Storage.updateStats({
                time: currentStats.time + currentElapsed,
                words: currentStats.words + wordsToAdd,  // 复习模式不增加学习单词数
                correct: currentStats.correct + newCorrect,
                wrong: currentStats.wrong + newWrong + newUnknown  // unknown也算作wrong
            });
            
            // 重置开始时间，下次只计算增量时间
            this.startTime = Date.now();
            
            // 更新界面显示
            this.updateStats();
            
            const mode = this.isReviewMode ? '复习' : '学习';
            console.log(`📊 实时统计更新(${mode}) - 新增: ${newTotal}词 (✓${newCorrect} ✗${newWrong} ?${newUnknown})${this.isReviewMode ? ' [不计入学习单词数]' : ''}`);
        }
    }

    // 启动今日统计显示定时器（每秒更新时长显示）
    startStatsDisplayTimer() {
        // 清除可能存在的旧定时器
        this.stopStatsDisplayTimer();
        
        // 记录基础统计（分钟数）
        const baseStats = Storage.loadStats();
        const baseMinutes = baseStats.time || 0;
        const baseStartTime = this.startTime;
        
        // 每秒更新一次时长显示（不保存到storage）
        this.statsDisplayTimer = setInterval(() => {
            // 计算经过的总秒数
            const elapsedSeconds = Math.floor((Date.now() - baseStartTime) / 1000);
            // 转换为分钟（小数）
            const elapsedMinutes = elapsedSeconds / 60;
            // 总时长（分钟）
            const totalMinutes = baseMinutes + elapsedMinutes;
            
            // 转换为 MM:SS 格式
            const minutes = Math.floor(totalMinutes);
            const seconds = Math.floor((totalMinutes - minutes) * 60);
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            const timeElement = document.getElementById('todayTime');
            const oldTimeStr = timeElement.textContent;
            
            // 每秒都更新显示
            if (timeStr !== oldTimeStr) {
                timeElement.textContent = timeStr;
                
                // 只在整分钟变化时添加动画效果
                if (seconds === 0) {
                    timeElement.classList.add('updating');
                    setTimeout(() => {
                        timeElement.classList.remove('updating');
                    }, 500);
                }
            }
        }, 1000);
        
        console.log('⏱️ 今日统计显示定时器已启动（MM:SS格式）');
    }
    
    // 停止今日统计显示定时器
    stopStatsDisplayTimer() {
        if (this.statsDisplayTimer) {
            clearInterval(this.statsDisplayTimer);
            this.statsDisplayTimer = null;
            console.log('⏱️ 今日统计显示定时器已停止');
        }
    }

    // 检查复习
    checkReview() {
        // 统计所有词书中的错题总数
        const booksWithWrong = [];
        let totalWrongWords = 0;
        
        this.books.forEach(book => {
            const wrongWords = book.progress?.wrong || [];
            if (wrongWords.length > 0) {
                booksWithWrong.push({
                    id: book.id,
                    name: book.name,
                    icon: book.icon,  // 🔥 传递图标
                    wrongCount: wrongWords.length
                });
                totalWrongWords += wrongWords.length;
                console.log(`📚 词书 "${book.name}" (${book.icon || '无图标'}) 有 ${wrongWords.length} 个错题`);
            }
        });
        
        console.log(`✅ 待复习单词总数: ${totalWrongWords}`);
        
        // 渲染复习词书列表
        this.renderReviewBooksList(booksWithWrong, totalWrongWords);
    }
    
    // 渲染复习词书列表
    renderReviewBooksList(booksWithWrong, totalWrongWords) {
        const container = document.getElementById('reviewBooksList');
        if (!container) {
            console.error('❌ 找不到reviewBooksList容器');
            return;
        }
        
        console.log('📋 渲染复习列表，词书数量:', booksWithWrong.length);
        console.log('📋 词书详情:', booksWithWrong);
        
        if (booksWithWrong.length === 0) {
            // 没有错题
            container.innerHTML = `
                <div class="review-empty">
                    <div style="font-size: 2rem; margin-bottom: 8px;">🎉</div>
                    <div>暂无需要复习的单词</div>
                </div>
            `;
            return;
        }
        
        // 显示总数
        let html = `<p class="review-count">还有 <strong>${totalWrongWords}</strong> 个单词需要复习</p>`;
        
        // 最多显示10个词书
        const displayBooks = booksWithWrong.slice(0, 10);
        
        displayBooks.forEach((book, index) => {
            // 使用词书自己的icon，如果没有则使用默认emoji
            const defaultEmojis = ['📕', '📗', '📘', '📙', '📔', '📓', '📒', '📖', '📚', '📑'];
            const emoji = book.icon || defaultEmojis[index % 10];
            
            // 安全转义HTML特殊字符
            const safeName = String(book.name || '未命名词书').replace(/&/g, '&amp;')
                                                              .replace(/</g, '&lt;')
                                                              .replace(/>/g, '&gt;')
                                                              .replace(/"/g, '&quot;')
                                                              .replace(/'/g, '&#039;');
            
            console.log(`📖 词书 ${index + 1}: ${emoji} ${safeName} (${book.wrongCount}个错词)`);
            
            html += `
                <div class="review-book-item">
                    <div class="review-book-icon">${emoji}</div>
                    <div class="review-book-info">
                        <div class="review-book-name">${safeName}</div>
                        <div class="review-book-count">${book.wrongCount} 词</div>
                    </div>
                    <button class="review-book-btn" onclick="app.startBookReview('${book.id}')" title="开始复习">✏️</button>
                </div>
            `;
        });
        
        // 如果超过10个，显示提示
        if (booksWithWrong.length > 10) {
            html += `
                <div class="review-count" style="text-align: center; margin-top: 8px;">
                    还有 ${booksWithWrong.length - 10} 个词书未显示
                </div>
            `;
        }
        
        container.innerHTML = html;
        console.log('✅ 复习列表渲染完成');
    }
    
    // 开始指定词书的复习
    startBookReview(bookId) {
        // 检查是否正在学习
        const learningScreen = document.getElementById('learningScreen');
        const isLearning = !learningScreen.classList.contains('hidden');
        
        if (isLearning) {
            if (!confirm('当前正在学习中，是否中断并开始复习错题？')) {
                return;
            }
        }
        
        const book = Storage.getBook(bookId);
        if (!book) {
            alert('词书不存在');
            return;
        }
        
        const wrongWords = book.progress?.wrong || [];
        if (wrongWords.length === 0) {
            alert('该词书暂无需要复习的单词！👏');
            this.checkReview(); // 刷新列表
            return;
        }
        
        // 选中该词书并开始复习
        this.currentBook = book;
        Storage.saveCurrentBook(book.id);
        
        // 🔥 关键修复：从词书的 words 数组中获取最新的单词对象（包含累积的统计信息）
        // 而不是直接使用 book.progress.wrong 中的快照副本
        const reviewWords = wrongWords.map(wrongWord => {
            // 在词书中查找该单词的最新版本及其索引
            const wordIndex = book.words.findIndex(w => w.word === wrongWord.word);
            if (wordIndex >= 0) {
                const latestWord = book.words[wordIndex];
                console.log(`📝 [复习模式] 准备复习 "${wrongWord.word}" [索引${wordIndex}]: 总${latestWord.totalAttempts || 0}次 | 错${latestWord.wrongTimes || 0}次`);
                // 返回带有必要索引信息的单词对象
                return {
                    ...latestWord,
                    originalIndex: wordIndex,  // ✅ 保留 originalIndex 用于收藏功能
                    _bookId: book.id,  // 记录词书ID
                    _wordIndex: wordIndex  // 记录在词书中的索引
                };
            } else {
                console.warn(`⚠️ 在词书中找不到单词 "${wrongWord.word}"，使用错题列表中的版本`);
                return wrongWord;
            }
        });
        
        // 使用包含最新统计信息的单词对象
        this.sessionWords = reviewWords;
        this.currentWordIndex = 0;
        this.sessionResults = { correct: 0, wrong: 0, unknown: 0 };
        this.wordResults = [];
        this.wordFirstResults = [];
        this.hintUsedForWords = []; // 重置提示使用记录
        this.lastWordInfo = null;
        this.isReviewMode = true;
        this.sessionStartIndex = book.progress.currentIndex || 0;
        this.startTime = Date.now();
        this.sessionStatsRecorded = { correct: 0, wrong: 0, unknown: 0 }; // 重置已记录的统计
        
        // 记录复习前的错题数量
        this.reviewingWrongCount = wrongWords.length;
        
        console.log(`🔄 开始复习 - 词书 "${book.name}" 有 ${wrongWords.length} 个错题`);
        
        // ✅ 不再清空错题列表，而是在答对时逐个移除
        // 这样即使中途退出，未复习的单词仍保留在错题列表中
        console.log(`📝 保持错题列表，答对时将逐个移除`);
        
        // 重新加载词书数据并更新待复习数量
        this.books = Storage.loadBooks();
        this.checkReview();
        
        // 切换到学习界面
        this.showScreen('learningScreen');
        
        // 启动今日统计显示定时器
        this.startStatsDisplayTimer();

        this.showWord();
    }


    // 加载进度
    loadProgress() {
        const savedWords = Storage.loadWords();
        if (savedWords.length > 0) {
            this.words = savedWords;
        }
    }

    // 下载模板
    downloadTemplate() {
        const content = WordParser.generateTemplate();
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '单词模板.csv';
        link.click();
    }

    // 显示加载
    showLoading(text = '加载中...') {
        document.getElementById('loadingOverlay').classList.remove('hidden');
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingProgressBar').style.width = '0%';
    }

    // 隐藏加载
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    // 更新加载进度
    updateLoadingProgress(percent) {
        document.getElementById('loadingProgressBar').style.width = `${percent}%`;
    }

    // 更新加载文本
    updateLoadingText(text) {
        document.getElementById('loadingText').textContent = text;
    }

    // 键盘快捷键
    handleKeyboard(e) {
        // 在学习页面
        const learningScreen = document.getElementById('learningScreen');
        if (!learningScreen.classList.contains('hidden')) {
            // Enter键切换下一题
            if (e.key === 'Enter' && !document.getElementById('nextBtn').disabled) {
                this.nextWord();
                return;
            }
            
            // 拼写模式快捷键（需要 Shift 组合键，避免和拼写输入冲突）
            const spellMode = document.getElementById('modeSpellWord');
            if (spellMode && !spellMode.classList.contains('hidden')) {
                // 必须同时按下 Shift 键
                if (!e.shiftKey) {
                    return;
                }
                
                const key = e.key.toUpperCase();
                
                // Shift+Q - 播放发音
                if (key === 'Q') {
                    e.preventDefault();
                    this.playSound();
                    return;
                }
                
                // Shift+H - 提示
                if (key === 'H') {
                    e.preventDefault();
                    this.showHint();
                    return;
                }
                
                // Shift+不知道按钮（使用设置中的快捷键）
                const unknownHotkey = this.settings.hotkeys?.option3 || '3';
                if (key === unknownHotkey.toUpperCase()) {
                    e.preventDefault();
                    this.skipSpellWord();
                    return;
                }
            }
        }
    }

    // 工具函数：打乱数组
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ============================================
    // 词书管理功能
    // ============================================

    // 迁移旧数据
    migrateOldData() {
        Storage.migrateOldWords();
        
        // 为旧的词书添加默认icon和round（如果没有的话）
        const books = Storage.loadBooks();
        let updated = false;
        const defaultEmojis = ['📕', '📗', '📘', '📙', '📚', '📖', '📝', '✏️', '📓', '📔'];
        
        books.forEach((book, index) => {
            if (!book.icon) {
                book.icon = defaultEmojis[index % defaultEmojis.length];
                updated = true;
            }
            if (!book.round) {
                book.round = 1;
                updated = true;
            }
        });
        
        if (updated) {
            Storage.saveBooks(books);
            console.log('✨ 已为旧词书添加默认图标和轮数');
        }
    }

    // 修复历史统计数据（修复掌握率计算错误）
    fixHistoryData() {
        const fixed = Storage.fixHistoryMastery();
        if (fixed) {
            console.log('✅ 已修复历史数据中的掌握率计算');
            // 重新更新今日统计显示
            this.updateStats();
        }
    }

    // 重新聚焦拼写输入框（修复焦点丢失问题）
    refocusSpellInput() {
        // 检查是否在拼写模式
        const spellMode = document.getElementById('modeSpellWord');
        if (!spellMode || spellMode.classList.contains('hidden')) {
            return; // 不在拼写模式，不需要聚焦
        }

        const input = document.getElementById('spellInput');
        if (input) {
            input.focus();
            // 将光标移到末尾
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }

    // 加载词书列表
    loadBooks() {
        this.books = Storage.loadBooks();
        this.renderBookList();
        
        // 尝试加载上次选中的词书
        const currentBookId = Storage.loadCurrentBook();
        if (currentBookId) {
            this.selectBook(currentBookId);
        }
    }

    // 渲染词书列表
    renderBookList() {
        const container = document.getElementById('bookList');
        container.innerHTML = '';

        if (this.books.length === 0) {
            container.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-tertiary); font-size: 0.875rem;">暂无词书，点击下方添加</p>';
            return;
        }

        // 排序：优先最近练习时间，其次导入时间（新到旧）
        const sortedBooks = [...this.books].sort((a, b) => {
            // 如果都有练习时间，按练习时间排序
            if (a.lastPracticeAt && b.lastPracticeAt) {
                return new Date(b.lastPracticeAt) - new Date(a.lastPracticeAt);
            }
            // 如果只有一个有练习时间，有的排前面
            if (a.lastPracticeAt) return -1;
            if (b.lastPracticeAt) return 1;
            // 都没有练习时间，按导入时间排序（新到旧）
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        sortedBooks.forEach(book => {
            const item = document.createElement('div');
            item.className = 'book-item';
            if (this.currentBook && this.currentBook.id === book.id) {
                item.classList.add('active');
            }

            const progress = book.progress || { currentIndex: 0 };
            const totalWords = book.words.length;
            const learnedCount = progress.currentIndex;
            
            // 格式化时间显示
            const timeDisplay = book.lastPracticeAt 
                ? `练习: ${Storage.formatTimeAgo(book.lastPracticeAt)}`
                : `导入: ${Storage.formatTimeAgo(book.createdAt)}`;

            // 使用词书自己的icon，如果没有则使用默认emoji📕
            const bookIcon = book.icon || '📕';
            
            // 获取轮数信息
            const round = book.round || 1;
            const roundDisplay = `, round ${round}`;
            
            item.innerHTML = `
                <div class="book-item-header">
                    <span class="book-item-icon">${bookIcon}</span>
                    <div class="book-item-name">${book.name}</div>
                    <div class="book-item-count">${totalWords}词</div>
                </div>
                <div class="book-item-progress">
                    已练习到：${learnedCount}/${totalWords}${roundDisplay}
                </div>
                <div class="book-item-time">${timeDisplay}</div>
                <div class="book-item-actions">
                    <button class="btn-book-settings" onclick="app.openBookSettings('${book.id}')" title="词书设置">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                        </svg>
                    </button>
                    <button class="btn-book-action" onclick="app.startBookLearning('${book.id}')">
                        开始学习
                    </button>
                    <button class="btn-book-action" onclick="app.deleteBookConfirm('${book.id}')">
                        删除
                    </button>
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-book-action') && 
                    !e.target.classList.contains('btn-book-settings') &&
                    !e.target.closest('.btn-book-settings')) {
                    this.selectBook(book.id);
                }
            });

            container.appendChild(item);
        });
    }

    // 选择词书
    selectBook(bookId) {
        this.currentBook = Storage.getBook(bookId);
        Storage.saveCurrentBook(bookId);
        this.renderBookList();
    }

    // 开始词书学习
    startBookLearning(bookId) {
        const book = Storage.getBook(bookId);
        if (!book || !book.words || book.words.length === 0) {
            alert('该词书没有单词');
            return;
        }

        this.currentBook = book;
        Storage.saveCurrentBook(bookId);

        // 生成或加载学习顺序
        let sequence = book.progress.sequence;
        if (!sequence || sequence.length === 0) {
            sequence = Storage.generateSequence(bookId, this.settings.wordOrder);
            this.currentBook = Storage.getBook(bookId); // 重新加载以获取更新后的进度
        }

        // 根据进度获取当前学习位置
        let startIndex = book.progress.currentIndex || 0;
        
        // 🔧 修复：如果 currentIndex >= sequence.length，说明已学完，显示"开启新一轮"提示
        if (startIndex >= sequence.length) {
            const confirmNewRound = confirm(
                `词书已学完一轮！\n\n` +
                `📊 词书：${book.name}\n` +
                `📝 单词数：${book.words.length}\n` +
                `🔄 当前轮次：Round ${book.round || 1}\n\n` +
                `点击"确定"开启新一轮学习（Round ${(book.round || 1) + 1}）\n` +
                `点击"取消"返回词书列表`
            );
            
            if (confirmNewRound) {
                this.startNewRound();
            } else {
                this.showScreen('mainScreen');
            }
            return;
        }
        
        const wordsPerSession = parseInt(this.settings.wordsPerSession);
        
        // 根据顺序表获取单词（保持引用，不创建副本）
        this.sessionWords = [];
        const endIndex = wordsPerSession === -1 
            ? sequence.length  // 无限模式：学习所有剩余单词
            : Math.min(startIndex + wordsPerSession, sequence.length);
            
        for (let i = startIndex; i < endIndex; i++) {
            const wordIndex = sequence[i];
            // ✅ 直接引用词书中的单词，并添加 originalIndex
            const word = book.words[wordIndex];
            // 使用一个包装对象，保持对原始单词的引用
            this.sessionWords.push({
                ...word,  // 展开所有属性
                originalIndex: wordIndex,  // 添加索引
                _bookId: book.id,  // 记录词书ID，用于统计更新
                _wordIndex: wordIndex  // 记录在词书中的索引
            });
        }
        
        console.log(`📚 [学习模式] 准备学习 ${this.sessionWords.length} 个单词 (${startIndex}→${endIndex}/${sequence.length})`);

        if (this.sessionWords.length === 0) {
            alert('词书已学完！');
            // 重置进度
            Storage.updateBookProgress(bookId, { currentIndex: 0 });
            this.renderBookList();
            return;
        }

        // 初始化学习状态
        this.currentWordIndex = 0;
        this.sessionResults = { correct: 0, wrong: 0, unknown: 0 };
        this.wordResults = []; // 重置每个单词的结果记录
        this.wordFirstResults = []; // 重置每个单词的首次答题结果记录
        this.sessionStartIndex = startIndex; // 记录本次学习开始的索引
        this.isReviewMode = false; // 标记是否为复习模式
        this.startTime = Date.now();
        this.sessionStatsRecorded = { correct: 0, wrong: 0, unknown: 0 }; // 重置已记录的统计

        // 更新最后练习时间
        Storage.updateBook(bookId, { lastPracticeAt: new Date().toISOString() });

        // 切换到学习界面
        this.showScreen('learningScreen');
        document.getElementById('sidebar').classList.remove('collapsed');
        
        // 启动今日统计显示定时器
        this.startStatsDisplayTimer();

        this.showWord();
    }

    // 删除词书（确认）
    deleteBookConfirm(bookId) {
        const book = Storage.getBook(bookId);
        if (confirm(`确定要删除词书"${book.name}"吗？此操作不可恢复！`)) {
            Storage.deleteBook(bookId);
            if (this.currentBook && this.currentBook.id === bookId) {
                this.currentBook = null;
                Storage.saveCurrentBook(null);
            }
            this.loadBooks();
        }
    }

    // ============================================
    // 词书设置相关功能
    // ============================================

    // 打开词书设置弹窗
    openBookSettings(bookId) {
        this.currentSettingsBookId = bookId;
        const book = Storage.getBook(bookId);
        
        if (!book) return;

        // 更新弹窗标题
        document.getElementById('bookSettingsTitle').textContent = `${book.name} - 设置`;

        // 更新正序/乱序按钮文本
        const isRandom = book.isRandomOrder || false;
        const toggleOrderText = document.getElementById('toggleOrderText');
        toggleOrderText.textContent = isRandom ? '设置为正序' : '设置为乱序';

        // 显示弹窗
        document.getElementById('bookSettingsModal').classList.remove('hidden');
    }

    // 关闭词书设置弹窗
    closeBookSettings() {
        document.getElementById('bookSettingsModal').classList.add('hidden');
        this.currentSettingsBookId = null;
    }

    // 重命名词书
    renameBook() {
        const book = Storage.getBook(this.currentSettingsBookId);
        if (!book) return;

        const newName = prompt('请输入新的词书名称：', book.name);
        
        if (newName && newName.trim() && newName !== book.name) {
            book.name = newName.trim();
            Storage.updateBook(this.currentSettingsBookId, book);
            this.loadBooks();
            
            // 更新弹窗标题
            document.getElementById('bookSettingsTitle').textContent = `${book.name} - 设置`;
        }
    }

    // 切换词书顺序（正序/乱序）
    toggleBookOrder() {
        const book = Storage.getBook(this.currentSettingsBookId);
        if (!book) return;

        const wasRandom = book.isRandomOrder || false;
        const newIsRandom = !wasRandom;

        if (newIsRandom) {
            // 切换到乱序：生成随机顺序
            if (confirm('切换到乱序将从新的随机顺序开始学习，已练习的单词进度将保留。确认切换？')) {
                // 生成随机索引映射
                const indices = Array.from({ length: book.words.length }, (_, i) => i);
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                
                book.isRandomOrder = true;
                book.randomIndices = indices;
                
                // 找到第一个未练习的单词位置
                const progress = book.progress || { results: [] };
                let firstUnpracticed = 0;
                for (let i = 0; i < indices.length; i++) {
                    const originalIndex = indices[i];
                    if (!progress.results || !progress.results[originalIndex] || 
                        progress.results[originalIndex].status === 'pending') {
                        firstUnpracticed = i;
                        break;
                    }
                }
                
                book.progress = book.progress || {};
                book.progress.currentIndex = firstUnpracticed;
                
                Storage.updateBook(this.currentSettingsBookId, book);
                this.loadBooks();
                
                // 更新按钮文本
                document.getElementById('toggleOrderText').textContent = '设置为正序';
            }
        } else {
            // 切换到正序：从第一个未练习的单词开始
            if (confirm('切换到正序将从第一个未练习的单词开始，已练习的单词进度将保留。确认切换？')) {
                book.isRandomOrder = false;
                delete book.randomIndices;
                
                // 找到第一个未练习的单词
                const progress = book.progress || { results: [] };
                let firstUnpracticed = 0;
                if (progress.results) {
                    for (let i = 0; i < book.words.length; i++) {
                        if (!progress.results[i] || progress.results[i].status === 'pending') {
                            firstUnpracticed = i;
                            break;
                        }
                    }
                }
                
                book.progress = book.progress || {};
                book.progress.currentIndex = firstUnpracticed;
                
                Storage.updateBook(this.currentSettingsBookId, book);
                this.loadBooks();
                
                // 更新按钮文本
                document.getElementById('toggleOrderText').textContent = '设置为乱序';
            }
        }
    }

    // 导出词书为CSV
    exportBook() {
        const book = Storage.getBook(this.currentSettingsBookId);
        if (!book) return;

        try {
            // 构建CSV内容
            let csvContent = '单词,音标,释义,例句\n';
            
            book.words.forEach(word => {
                const def = word.definitions && word.definitions[0] ? word.definitions[0] : {};
                
                // 转义CSV字段（处理逗号和引号）
                const escapeCSV = (str) => {
                    if (!str) return '';
                    str = String(str);
                    // 如果包含逗号、换行或引号，需要用引号包裹
                    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                        // 将引号转义为两个引号
                        str = str.replace(/"/g, '""');
                        return `"${str}"`;
                    }
                    return str;
                };
                
                const wordText = escapeCSV(word.word);
                const phonetic = escapeCSV(word.phonetic || '');
                const meaning = escapeCSV(def.meaning || '');
                const example = escapeCSV(def.example || '');
                
                csvContent += `${wordText},${phonetic},${meaning},${example}\n`;
            });

            // 创建Blob并下载
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            // 生成文件名（词书名称 + 日期）
            const date = new Date().toISOString().split('T')[0];
            const fileName = `${book.name}_${date}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 关闭设置弹窗
            this.closeBookSettings();
            
            alert(`词书已成功导出为 ${fileName}`);
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败，请重试');
        }
    }

    // 显示单词表浏览页面
    showWordList() {
        const book = Storage.getBook(this.currentSettingsBookId);
        if (!book) return;

        // 保存当前浏览的词书ID
        this.currentWordListBookId = this.currentSettingsBookId;

        // 重置编辑模式
        this.isWordListEditMode = false;
        document.getElementById('editModeText').textContent = '编辑';

        // 关闭设置弹窗
        this.closeBookSettings();

        // 显示单词表页面
        this.showScreen('wordListScreen');

        // 设置标题和图标
        document.getElementById('wordListIcon').textContent = book.icon || '📖';
        document.getElementById('wordListBookName').textContent = book.name;
        document.getElementById('wordListTotalCount').textContent = book.words.length;

        // 渲染单词表格
        this.renderWordListTable(book);
    }

    // 渲染单词表格
    renderWordListTable(book) {
        const tbody = document.getElementById('wordListTableBody');
        tbody.innerHTML = '';

        book.words.forEach((word, index) => {
            const def = word.definitions && word.definitions[0] ? word.definitions[0] : {};
            const row = document.createElement('tr');
            row.dataset.wordIndex = index;
            
            // 添加斑马纹
            if (index % 2 === 0) {
                row.classList.add('word-list-row-even');
            }

            // 编辑列（默认隐藏）
            const editCell = document.createElement('td');
            editCell.className = 'word-list-cell word-list-cell-edit hidden';
            
            // 收藏按钮
            const favoriteBtn = document.createElement('button');
            favoriteBtn.className = 'word-list-action-btn favorite-btn';
            favoriteBtn.innerHTML = word.favorite ? '⭐' : '<span class="favorite-gray">⭐</span>';
            favoriteBtn.title = word.favorite ? '取消收藏' : '收藏';
            favoriteBtn.dataset.wordIndex = index;
            favoriteBtn.addEventListener('click', () => {
                this.toggleWordFavorite(index);
            });
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'word-list-action-btn delete-btn';
            deleteBtn.innerHTML = '✖️';
            deleteBtn.title = '删除单词';
            deleteBtn.dataset.wordIndex = index;
            deleteBtn.addEventListener('click', () => {
                this.deleteWordFromList(index, word.word);
            });
            
            editCell.appendChild(favoriteBtn);
            editCell.appendChild(deleteBtn);
            row.appendChild(editCell);

            // 序号
            const indexCell = document.createElement('td');
            indexCell.className = 'word-list-cell word-list-cell-index';
            indexCell.textContent = index + 1;
            row.appendChild(indexCell);

            // 单词（可编辑）
            const wordCell = document.createElement('td');
            wordCell.className = 'word-list-cell word-list-cell-word editable-cell';
            wordCell.dataset.field = 'word';
            wordCell.dataset.wordIndex = index;
            wordCell.innerHTML = `<strong>${this.escapeHtml(word.word)}</strong>`;
            row.appendChild(wordCell);

            // 音标（可编辑）
            const phoneticCell = document.createElement('td');
            phoneticCell.className = 'word-list-cell word-list-cell-phonetic editable-cell';
            phoneticCell.dataset.field = 'phonetic';
            phoneticCell.dataset.wordIndex = index;
            phoneticCell.textContent = word.phonetic || '-';
            row.appendChild(phoneticCell);

            // 释义（可编辑）
            const meaningCell = document.createElement('td');
            meaningCell.className = 'word-list-cell word-list-cell-meaning editable-cell';
            meaningCell.dataset.field = 'meaning';
            meaningCell.dataset.wordIndex = index;
            meaningCell.dataset.partOfSpeech = def.partOfSpeech || '';
            
            // 合并词性和释义
            let meaningText = '';
            if (def.partOfSpeech) {
                meaningText = `<span class="word-list-pos">${this.escapeHtml(def.partOfSpeech)}</span> `;
            }
            meaningText += this.escapeHtml(def.meaning || '-');
            
            meaningCell.innerHTML = meaningText;
            row.appendChild(meaningCell);

            // 例句（可编辑）
            const exampleCell = document.createElement('td');
            exampleCell.className = 'word-list-cell word-list-cell-example editable-cell';
            exampleCell.dataset.field = 'example';
            exampleCell.dataset.wordIndex = index;
            
            if (def.example) {
                // 高亮例句中的单词
                const exampleWithHighlight = this.highlightWordInExample(def.example, word.word);
                exampleCell.innerHTML = exampleWithHighlight;
            } else {
                exampleCell.textContent = '-';
            }
            
            row.appendChild(exampleCell);

            tbody.appendChild(row);
        });
        
        // 如果当前在编辑模式，应用编辑状态
        if (this.isWordListEditMode) {
            this.applyEditableState(true);
        }
    }

    // 高亮例句中的单词
    highlightWordInExample(example, word, type = 'wrong') {
        if (!example || !word) return this.escapeHtml(example || '');
        
        // 转义HTML
        const escapedExample = this.escapeHtml(example);
        
        // 根据类型选择样式类
        const highlightClass = type === 'unknown' ? 'word-highlight-unknown' : 'word-list-highlight';
        
        // 检测是否为词组（包含空格）
        const isPhrase = word.includes(' ');
        
        if (isPhrase) {
            // 处理词组的情况
            let result = escapedExample;
            
            // 处理包含括号的可选部分，如 "know better (than)"
            // 生成多个可能的匹配模式
            const phraseVariants = this.generatePhraseVariants(word);
            
            // 尝试匹配每个变体（从最长到最短，避免短的先匹配导致长的无法匹配）
            phraseVariants.sort((a, b) => b.length - a.length);
            
            for (const variant of phraseVariants) {
                // 使用单词边界进行匹配，支持大小写不敏感
                const regex = new RegExp(`\\b${this.escapeRegex(variant)}\\b`, 'gi');
                
                // 检查是否有匹配
                if (regex.test(result)) {
                    // 重置 regex（因为 test 会改变 lastIndex）
                    regex.lastIndex = 0;
                    
                    // 替换匹配的词组
                    result = result.replace(regex, (match) => {
                        return `<strong class="${highlightClass}">${match}</strong>`;
                    });
                    
                    // 找到匹配后就停止，避免重复高亮
                    break;
                }
            }
            
            return result;
        } else {
            // 单个单词的情况（保持原有逻辑）
            // 获取目标单词的词干
            const targetStem = this.getWordStem(word.toLowerCase());
            
            // 使用正则表达式分词，保留标点和空格
            const tokens = escapedExample.split(/(\b[\w']+\b)/g);
            
            // 遍历所有token，高亮匹配的单词
            const result = tokens.map(token => {
                // 跳过非单词token（空格、标点等）
                if (!/\b[\w']+\b/.test(token)) return token;
                
                const tokenLower = token.toLowerCase();
                const tokenStem = this.getWordStem(tokenLower);
                
                // 1. 精确匹配
                if (tokenLower === word.toLowerCase()) {
                    return `<strong class="${highlightClass}">${token}</strong>`;
                }
                
                // 2. 词干匹配（处理词形变化）
                if (tokenStem === targetStem && targetStem.length >= 3) {
                    return `<strong class="${highlightClass}">${token}</strong>`;
                }
                
                // 3. 相似度匹配（>85%）- 防止误判，提高阈值
                const similarity = this.calculateSimilarity(word.toLowerCase(), tokenLower);
                if (similarity > 0.85 && tokenLower.length >= 3) {
                    return `<strong class="${highlightClass}">${token}</strong>`;
                }
                
                return token;
            });
            
            return result.join('');
        }
    }
    
    // 生成词组的变体（处理括号中的可选部分）
    generatePhraseVariants(phrase) {
        const variants = [];
        
        // 检查是否包含括号
        const bracketRegex = /\s*\([^)]*\)\s*/g;
        
        if (bracketRegex.test(phrase)) {
            // 包含括号的情况
            // 1. 完整版本（去掉括号但保留内容）
            const fullVersion = phrase.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
            variants.push(fullVersion);
            
            // 2. 不包含括号内容的版本
            const withoutBrackets = phrase.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
            variants.push(withoutBrackets);
            
            // 3. 原始版本（保留括号）
            variants.push(phrase.trim());
        } else {
            // 不包含括号，直接使用原词组
            variants.push(phrase.trim());
        }
        
        // 去重
        return [...new Set(variants)];
    }
    
    // 转义正则表达式特殊字符
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // HTML转义函数
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 关闭单词表页面
    closeWordList() {
        this.showScreen('welcomeScreen');
        
        // 重置编辑模式
        this.isWordListEditMode = false;
        this.currentWordListBookId = null;
    }

    // 切换单词表编辑模式
    toggleWordListEditMode() {
        if (this.isWordListEditMode) {
            // 退出编辑模式 - 保存所有编辑
            this.saveAllWordListEdits();
        }
        
        this.isWordListEditMode = !this.isWordListEditMode;
        
        const editColumnHeader = document.getElementById('editColumnHeader');
        const editCells = document.querySelectorAll('.word-list-cell-edit');
        const editModeText = document.getElementById('editModeText');
        
        if (this.isWordListEditMode) {
            // 进入编辑模式
            editColumnHeader.classList.remove('hidden');
            editCells.forEach(cell => cell.classList.remove('hidden'));
            editModeText.textContent = '完成';
            this.applyEditableState(true);
        } else {
            // 退出编辑模式
            editColumnHeader.classList.add('hidden');
            editCells.forEach(cell => cell.classList.add('hidden'));
            editModeText.textContent = '编辑';
            this.applyEditableState(false);
        }
    }
    
    // 应用可编辑状态
    applyEditableState(isEditable) {
        const editableCells = document.querySelectorAll('.editable-cell');
        
        editableCells.forEach(cell => {
            if (isEditable) {
                cell.contentEditable = 'true';
                cell.classList.add('editing');
                cell.title = '点击编辑';
            } else {
                cell.contentEditable = 'false';
                cell.classList.remove('editing');
                cell.title = '';
            }
        });
    }
    
    // 保存所有单词表编辑
    saveAllWordListEdits() {
        // 判断是否为临时词书（智能导入模式）
        const isSmartImport = this.tempSmartImportBook && this.currentWordListBookId === 'temp_smart_import';
        
        let book;
        if (isSmartImport) {
            book = this.tempSmartImportBook;
        } else {
            book = Storage.getBook(this.currentWordListBookId);
        }
        
        if (!book) return;
        
        let hasChanges = false;
        const editableCells = document.querySelectorAll('.editable-cell');
        
        editableCells.forEach(cell => {
            const wordIndex = parseInt(cell.dataset.wordIndex);
            const field = cell.dataset.field;
            const word = book.words[wordIndex];
            
            if (!word) return;
            
            // 获取编辑后的内容（去除HTML标签）
            let newValue = cell.textContent.trim();
            
            // 如果值是 "-"，转为空字符串
            if (newValue === '-') {
                newValue = '';
            }
            
            // 根据字段类型更新数据
            switch(field) {
                case 'word':
                    if (newValue && newValue !== word.word) {
                        word.word = newValue;
                        hasChanges = true;
                    }
                    break;
                    
                case 'phonetic':
                    if (newValue !== word.phonetic) {
                        word.phonetic = newValue;
                        hasChanges = true;
                    }
                    break;
                    
                case 'meaning':
                    const def = word.definitions && word.definitions[0] ? word.definitions[0] : {};
                    // 提取词性（如果有）
                    const posMatch = cell.querySelector('.word-list-pos');
                    if (posMatch) {
                        newValue = newValue.replace(posMatch.textContent.trim(), '').trim();
                    }
                    
                    if (newValue !== def.meaning) {
                        if (!word.definitions || word.definitions.length === 0) {
                            word.definitions = [{}];
                        }
                        word.definitions[0].meaning = newValue;
                        hasChanges = true;
                    }
                    break;
                    
                case 'example':
                    const exampleDef = word.definitions && word.definitions[0] ? word.definitions[0] : {};
                    if (newValue !== exampleDef.example) {
                        if (!word.definitions || word.definitions.length === 0) {
                            word.definitions = [{}];
                        }
                        word.definitions[0].example = newValue;
                        hasChanges = true;
                    }
                    break;
            }
        });
        
        if (isSmartImport) {
            // 智能导入模式：编辑完成后自动导入
        if (hasChanges) {
                console.log('✅ 智能导入编辑已保存');
                this.showToast('编辑已保存', 'success');
            }
            // 完成编辑后，询问是否导入
            this.confirmSmartImport();
        } else {
            // 普通模式：保存到Storage
            if (hasChanges) {
            Storage.updateBook(this.currentWordListBookId, book);
            this.loadBooks();
            console.log('✅ 单词表编辑已保存');
            this.showToast('保存成功', 'success');
            }
        }
    }
    
    // 显示提示信息
    showToast(message, type = 'info') {
        // 创建提示元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // 触发动画
        setTimeout(() => toast.classList.add('show'), 10);
        
        // 3秒后移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 切换单词收藏状态（单词表中）
    toggleWordFavorite(wordIndex) {
        const book = Storage.getBook(this.currentWordListBookId);
        if (!book) return;
        
        const word = book.words[wordIndex];
        if (!word) return;
        
        // 切换收藏状态
        word.favorite = !word.favorite;
        
        // 保存到存储
        Storage.updateBook(this.currentWordListBookId, book);
        
        // 更新按钮显示
        const favoriteBtn = document.querySelector(`.favorite-btn[data-word-index="${wordIndex}"]`);
        if (favoriteBtn) {
            favoriteBtn.innerHTML = word.favorite ? '⭐' : '<span class="favorite-gray">⭐</span>';
            favoriteBtn.title = word.favorite ? '取消收藏' : '收藏';
        }
        
        console.log(`${word.favorite ? '收藏' : '取消收藏'}单词: ${word.word}`);
    }

    // 从单词表删除单词
    deleteWordFromList(wordIndex, wordText) {
        const confirmed = confirm(`是否从词单删除该词：${wordText}\n\n确认 / 不了`);
        
        if (!confirmed) return;
        
        const book = Storage.getBook(this.currentWordListBookId);
        if (!book) return;
        
        // 删除单词
        book.words.splice(wordIndex, 1);
        
        // 保存到存储
        Storage.updateBook(this.currentWordListBookId, book);
        
        // 重新加载词书列表
        this.loadBooks();
        
        // 重新渲染表格
        this.renderWordListTable(book);
        
        // 更新单词总数
        document.getElementById('wordListTotalCount').textContent = book.words.length;
        
        console.log(`已删除单词: ${wordText}`);
    }

    // 切换当前学习单词的收藏状态
    toggleFavorite() {
        if (!this.currentBook || this.currentWordIndex >= this.sessionWords.length) {
            console.warn('❌ 无法切换收藏：没有当前词书或单词索引超出范围');
            return;
        }
        
        const sessionWord = this.sessionWords[this.currentWordIndex];
        const originalIndex = sessionWord.originalIndex;
        
        if (originalIndex === undefined) {
            console.error('❌ 无法切换收藏：单词对象缺少 originalIndex 属性', sessionWord);
            return;
        }
        
        const book = Storage.getBook(this.currentBook.id);
        
        if (!book) {
            console.error('❌ 无法切换收藏：找不到词书', this.currentBook.id);
            return;
        }
        
        const word = book.words[originalIndex];
        if (!word) {
            console.error('❌ 无法切换收藏：找不到单词', originalIndex);
            return;
        }
        
        // 切换收藏状态
        word.favorite = !word.favorite;
        
        // 同时更新 sessionWord 的收藏状态（保持同步）
        sessionWord.favorite = word.favorite;
        
        // 保存到存储
        Storage.updateBook(this.currentBook.id, book);
        
        // 更新显示
        this.updateFavoriteDisplay(word.favorite);
        
        console.log(`⭐ ${word.favorite ? '已收藏' : '取消收藏'}单词: ${word.word}`);
    }

    // 收藏/取消收藏上次答题的单词
    toggleLastWordFavorite() {
        if (!this.currentBook || !this.lastWordInfo) {
            console.warn('❌ 无法切换收藏：没有当前词书或上次单词信息');
            return;
        }
        
        const originalIndex = this.lastWordInfo.originalIndex;
        
        if (originalIndex === undefined) {
            console.error('❌ 无法切换收藏：lastWordInfo 缺少 originalIndex 属性', this.lastWordInfo);
            return;
        }
        
        const book = Storage.getBook(this.currentBook.id);
        
        if (!book) {
            console.error('❌ 无法切换收藏：找不到词书', this.currentBook.id);
            return;
        }
        
        const word = book.words[originalIndex];
        if (!word) {
            console.error('❌ 无法切换收藏：找不到单词', originalIndex);
            return;
        }
        
        // 切换收藏状态
        word.favorite = !word.favorite;
        
        // 更新 lastWordInfo 的收藏状态
        this.lastWordInfo.favorite = word.favorite;
        
        // 如果上一题和当前题是同一个单词，也要更新 sessionWord
        if (this.currentWordIndex > 0) {
            const prevSessionWord = this.sessionWords[this.currentWordIndex - 1];
            if (prevSessionWord && prevSessionWord.originalIndex === originalIndex) {
                prevSessionWord.favorite = word.favorite;
            }
        }
        
        // 保存到存储
        Storage.updateBook(this.currentBook.id, book);
        
        // 重新显示badge以更新星星状态
        const badge1 = document.getElementById('lastWordBadge1');
        const badge2 = document.getElementById('lastWordBadge2');
        if (badge1 && badge1.style.display !== 'none') {
            this.showLastWordBadge('lastWordBadge1');
        }
        if (badge2 && badge2.style.display !== 'none') {
            this.showLastWordBadge('lastWordBadge2');
        }
        
        console.log(`⭐ ${word.favorite ? '已收藏' : '取消收藏'}上次单词: ${word.word}`);
    }

    // 更新学习模式中的收藏按钮显示
    updateFavoriteDisplay(isFavorite) {
        const favoriteBtn1 = document.getElementById('favoriteBtn1');
        const favoriteBtn2 = document.getElementById('favoriteBtn2');
        
        const icon = '⭐';
        
        if (favoriteBtn1) {
            const iconSpan = favoriteBtn1.querySelector('.favorite-icon');
            if (iconSpan) {
                if (isFavorite) {
                    iconSpan.innerHTML = icon;
                    iconSpan.classList.remove('favorite-gray');
                } else {
                    iconSpan.innerHTML = icon;
                    iconSpan.classList.add('favorite-gray');
                }
            }
        }
        
        if (favoriteBtn2) {
            const iconSpan = favoriteBtn2.querySelector('.favorite-icon');
            if (iconSpan) {
                if (isFavorite) {
                    iconSpan.innerHTML = icon;
                    iconSpan.classList.remove('favorite-gray');
                } else {
                    iconSpan.innerHTML = icon;
                    iconSpan.classList.add('favorite-gray');
                }
            }
        }
    }

    // 更新词书学习进度（学习完成时调用）
    updateBookLearningProgress() {
        if (!this.currentBook) return;

        const book = Storage.getBook(this.currentBook.id);
        if (!book) return;

        const sequence = book.progress.sequence || [];
        
        // 计算答对的单词数
        const correctCount = this.wordFirstResults.filter(result => result === 'correct').length;
        
        // 更新进度：sessionStartIndex + 答对的单词数
        const newIndex = this.sessionStartIndex + correctCount;

        Storage.updateBookProgress(this.currentBook.id, {
            currentIndex: Math.min(newIndex, sequence.length)
        });
    }

    // ============================================
    // Emoji选择器相关方法
    // ============================================
    
    // 初始化Emoji数据（带搜索关键词）
    initEmojiData() {
        return {
            learning: {
                emojis: ['📕', '📗', '📘', '📙', '📚', '📖', '📝', '✏️', '✒️', '🖊️', '🖍️', '📓', '📔', '📒', '📃', '📄', '📰', '🗞️', '📑', '🔖', '🎓', '🎯', '💡', '🧠', '📊', '📈', '🎨', '🌟', '⭐', '✨'],
                keywords: ['书', '笔', '学习', '教育', '知识', '记录', '报纸', '毕业', '目标', '灯泡', '大脑', '图表', '艺术', '星星']
            },
            numbers: {
                emojis: ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '#️⃣', '*️⃣', '🔢', '💯', '㊙️', '㊗️', '🈁', '🈂️', '🈚', '🈯', '🈲', '🈳', '🈴', '🈵', '🈶', '🈷️', '🈸', '🈹', '🈺'],
                keywords: ['数字', '编号', '统计', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '百分百', '秘密', '祝贺']
            },
            letters: {
                emojis: ['🅰️', '🅱️', '🅾️', '🆎', '🆑', '🆒', '🆓', '🆔', '🆕', '🆖', '🆗', '🆘', '🆙', '🆚', '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵'],
                keywords: ['字母', '英文', 'abc', 'ABCDEFG', 'ok', 'new', 'free', 'cool', 'sos', 'up', 'vs']
            },
            math: {
                emojis: ['➕', '➖', '✖️', '➗', '🟰', '♾️', '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️', '💱', '💲', '⚠️', '🔺', '🔻', '🔼', '🔽', '⏫', '⏬', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '📶', '📳', '📴'],
                keywords: ['加', '减', '乘', '除', '等于', '无穷', '问号', '感叹号', '警告', '三角', '箭头', '暂停', '播放']
            },
            business: {
                emojis: ['💰', '💵', '💴', '💶', '💷', '💸', '💳', '🪙', '💹', '📊', '📈', '📉', '💼', '🏦', '🏪', '🏬', '🏢', '🏛️', '⚖️', '📝', '📋', '📌', '📍', '📎', '🔗', '📧', '📨', '📩', '📤', '📥'],
                keywords: ['钱', '美元', '欧元', '日元', '银行', '商店', '公司', '办公', '图表', '增长', '下降', '公文包', '邮件', '链接']
            },
            law: {
                emojis: ['⚖️', '👨‍⚖️', '👩‍⚖️', '🏛️', '👮', '👮‍♂️', '👮‍♀️', '🚨', '🚓', '🚔', '⛓️', '🔒', '🔓', '🔐', '🗝️', '📜', '📋', '✅', '❌', '⭕', '🚫', '🆘', '⚠️', '📢', '📣', '🔔', '🔕', '📯', '🎯', '🏴'],
                keywords: ['法律', '天平', '法官', '警察', '警车', '锁', '钥匙', '文书', '对勾', '叉号', '禁止', '警告', '广播']
            },
            medical: {
                emojis: ['⚕️', '💊', '💉', '🩺', '🩹', '🩼', '🦷', '🧬', '🔬', '🧪', '🧫', '🌡️', '🩸', '❤️', '🫀', '🫁', '🧠', '👁️', '🦴', '👨‍⚕️', '👩‍⚕️', '🏥', '🚑', '⛑️', '🆘', '☤', '♿', '🧘', '💆', '🛌'],
                keywords: ['医疗', '医生', '护士', '药', '针', '听诊器', '绷带', '牙齿', '基因', '显微镜', '试管', '体温计', '心脏', '大脑', '医院', '救护车']
            },
            tech: {
                emojis: ['💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💾', '💿', '📀', '📱', '☎️', '📞', '📟', '📠', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '🔧', '🔨', '⚒️', '🛠️', '⚙️', '🔩'],
                keywords: ['电脑', '键盘', '打印机', '鼠标', '光盘', '手机', '电话', '电池', '插头', '灯泡', '手电筒', '工具', '扳手', '锤子', '齿轮']
            },
            environment: {
                emojis: ['♻️', '🌍', '🌎', '🌏', '🌐', '🗺️', '🧭', '⛰️', '🏔️', '🗻', '🌋', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '💧', '💦', '🌊', '⚡', '🔥', '❄️', '☃️', '⛄', '🌬️', '💨', '☁️', '🌤️', '⛅', '🌥️'],
                keywords: ['环保', '回收', '地球', '世界', '地图', '指南针', '山', '火山', '水', '海浪', '闪电', '火', '雪', '云', '风']
            },
            transport: {
                emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🚲', '🛵', '🏍️', '✈️', '🛩️', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞'],
                keywords: ['汽车', '出租车', '公交', '警车', '救护车', '消防车', '卡车', '自行车', '摩托车', '飞机', '直升机', '火车', '高铁', '地铁']
            },
            media: {
                emojis: ['📺', '📻', '📡', '📰', '🗞️', '📖', '📚', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📃', '📄', '📑', '🎬', '🎞️', '📽️', '🎥', '📹', '📷', '📸', '🎙️', '🎚️', '🎛️', '📢', '📣', '📯'],
                keywords: ['电视', '收音机', '报纸', '新闻', '书', '摄像机', '相机', '麦克风', '广播', '喇叭']
            },
            culture: {
                emojis: ['🎭', '🎨', '🎪', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎰', '🎳', '🎮', '🕹️', '🎨', '🖼️', '🎭', '🗿', '🏛️', '⛩️', '🕌', '🕍', '⛪'],
                keywords: ['艺术', '戏剧', '马戏', '电影', '话筒', '耳机', '音乐', '钢琴', '吉他', '小提琴', '画画', '雕像', '寺庙', '教堂']
            },
            politics: {
                emojis: ['🏛️', '🗳️', '🗽', '⚖️', '🏴', '🏳️', '🚩', '📜', '📋', '📰', '🗞️', '📢', '📣', '🎙️', '⚠️', '🚨', '🔔', '🏁', '🏴‍☠️', '🆘', '🌍', '🌎', '🌏', '🌐', '🤝', '✊', '✌️', '🤲', '👏', '🙏'],
                keywords: ['政府', '投票', '自由女神', '天平', '旗帜', '文书', '报纸', '广播', '警告', '地球', '握手', '拳头', '和平', '鼓掌']
            },
            nature: {
                emojis: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '🌴', '🌳', '🌲', '🌱', '🍀', '🌿', '☘️', '🌾', '🌵', '🍁', '🍂', '🍃', '🌾', '🌰', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘'],
                keywords: ['花', '树', '植物', '叶子', '太阳', '月亮', '自然', '草', '仙人掌', '枫叶']
            },
            food: {
                emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞'],
                keywords: ['水果', '苹果', '橙子', '柠檬', '香蕉', '西瓜', '葡萄', '草莓', '菠萝', '蔬菜', '番茄', '茄子', '辣椒', '面包']
            },
            activity: {
                emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷'],
                keywords: ['足球', '篮球', '橄榄球', '棒球', '网球', '排球', '乒乓球', '羽毛球', '高尔夫', '风筝', '钓鱼', '滑板', '运动']
            },
            objects: {
                emojis: ['⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭'],
                keywords: ['手表', '手机', '电脑', '键盘', '鼠标', '相机', '电话', '电视', '收音机', '指南针', '物品', '工具']
            },
            symbols: {
                emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐'],
                keywords: ['心', '爱', '红心', '爱心', '和平', '宗教', '十字', '符号']
            },
            flags: {
                emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', 
                        '🇨🇳', '🇺🇸', '🇬🇧', '🇯🇵', '🇰🇷', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇷🇺', '🇧🇷', '🇮🇳', 
                        '🇨🇦', '🇦🇺', '🇲🇽', '🇳🇱', '🇸🇪', '🇨🇭', '🇹🇷', '🇵🇱', '🇧🇪', '🇦🇹',
                        '🇦🇷', '🇨🇱', '🇨🇴', '🇵🇪', '🇻🇪', '🇪🇬', '🇿🇦', '🇳🇬', '🇰🇪', '🇲🇦',
                        '🇸🇦', '🇦🇪', '🇮🇷', '🇮🇶', '🇮🇱', '🇵🇰', '🇧🇩', '🇹🇭', '🇻🇳', '🇵🇭',
                        '🇲🇾', '🇸🇬', '🇮🇩', '🇲🇲', '🇰🇭', '🇱🇦', '🇳🇵', '🇱🇰', '🇦🇫', '🇲🇳',
                        '🇳🇿', '🇫🇯', '🇵🇬', '🇵🇹', '🇬🇷', '🇭🇺', '🇨🇿', '🇷🇴', '🇧🇬', '🇭🇷',
                        '🇷🇸', '🇸🇮', '🇸🇰', '🇺🇦', '🇧🇾', '🇱🇹', '🇱🇻', '🇪🇪', '🇫🇮', '🇳🇴',
                        '🇩🇰', '🇮🇸', '🇮🇪', '🇱🇺', '🇲🇹', '🇨🇾', '🇦🇱', '🇲🇰', '🇧🇦', '🇲🇪',
                        '🇰🇿', '🇺🇿', '🇹🇲', '🇰🇬', '🇹🇯', '🇦🇲', '🇬🇪', '🇦🇿', '🇯🇴', '🇱🇧',
                        '🇸🇾', '🇾🇪', '🇴🇲', '🇰🇼', '🇶🇦', '🇧🇭', '🇱🇾', '🇹🇳', '🇩🇿', '🇸🇩',
                        '🇪🇹', '🇸🇴', '🇩🇯', '🇪🇷', '🇺🇬', '🇹🇿', '🇷🇼', '🇧🇮', '🇿🇲', '🇿🇼',
                        '🇲🇼', '🇲🇿', '🇧🇼', '🇳🇦', '🇦🇴', '🇨🇬', '🇨🇩', '🇨🇫', '🇹🇩', '🇨🇲',
                        '🇬🇭', '🇨🇮', '🇸🇳', '🇲🇱', '🇧🇫', '🇳🇪', '🇹🇬', '🇧🇯', '🇬🇳', '🇸🇱',
                        '🇱🇷', '🇬🇲', '🇬🇶', '🇬🇦', '🇨🇻', '🇸🇹', '🇲🇷', '🇲🇬', '🇰🇲', '🇸🇨',
                        '🇲🇺', '🇷🇪', '🇾🇹', '🇨🇺', '🇯🇲', '🇭🇹', '🇩🇴', '🇵🇷', '🇹🇹', '🇧🇸',
                        '🇧🇧', '🇬🇩', '🇱🇨', '🇻🇨', '🇦🇬', '🇩🇲', '🇰🇳', '🇧🇿', '🇨🇷', '🇸🇻',
                        '🇬🇹', '🇭🇳', '🇳🇮', '🇵🇦', '🇧🇴', '🇪🇨', '🇬🇾', '🇵🇾', '🇸🇷', '🇺🇾'],
                keywords: ['国旗', '旗帜', '中国', '美国', '英国', '日本', '韩国', '法国', '德国', '意大利', '西班牙', '俄罗斯', '巴西', '印度',
                          '加拿大', '澳大利亚', '墨西哥', '荷兰', '瑞典', '瑞士', '土耳其', '波兰', '比利时', '奥地利',
                          '阿根廷', '智利', '哥伦比亚', '秘鲁', '委内瑞拉', '埃及', '南非', '尼日利亚', '肯尼亚', '摩洛哥',
                          '沙特', '阿联酋', '伊朗', '伊拉克', '以色列', '巴基斯坦', '孟加拉', '泰国', '越南', '菲律宾',
                          '马来西亚', '新加坡', '印尼', '缅甸', '柬埔寨', '老挝', '尼泊尔', '斯里兰卡', '阿富汗', '蒙古',
                          '新西兰', '斐济', '葡萄牙', '希腊', '匈牙利', '捷克', '罗马尼亚', '保加利亚', '克罗地亚',
                          '塞尔维亚', '斯洛文尼亚', '斯洛伐克', '乌克兰', '白俄罗斯', '立陶宛', '拉脱维亚', '爱沙尼亚', '芬兰', '挪威',
                          '丹麦', '冰岛', '爱尔兰', '卢森堡', '马耳他', '塞浦路斯', '阿尔巴尼亚', '北马其顿', '波黑', '黑山',
                          '哈萨克斯坦', '乌兹别克斯坦', '土库曼斯坦', '吉尔吉斯斯坦', '塔吉克斯坦', '亚美尼亚', '格鲁吉亚', '阿塞拜疆', '约旦', '黎巴嫩',
                          '叙利亚', '也门', '阿曼', '科威特', '卡塔尔', '巴林', '利比亚', '突尼斯', '阿尔及利亚', '苏丹',
                          '埃塞俄比亚', '索马里', '吉布提', '厄立特里亚', '乌干达', '坦桑尼亚', '卢旺达', '布隆迪', '赞比亚', '津巴布韦',
                          '马拉维', '莫桑比克', '博茨瓦纳', '纳米比亚', '安哥拉', '刚果布', '刚果金', '中非', '乍得', '喀麦隆',
                          '加纳', '科特迪瓦', '塞内加尔', '马里', '布基纳法索', '尼日尔', '多哥', '贝宁', '几内亚', '塞拉利昂',
                          '利比里亚', '冈比亚', '赤道几内亚', '加蓬', '佛得角', '圣多美', '毛里塔尼亚', '马达加斯加', '科摩罗', '塞舌尔',
                          '毛里求斯', '留尼汪', '马约特', '古巴', '牙买加', '海地', '多米尼加', '波多黎各', '特立尼达', '巴哈马',
                          '巴巴多斯', '格林纳达', '圣卢西亚', '圣文森特', '安提瓜', '多米尼克', '圣基茨', '伯利兹', '哥斯达黎加', '萨尔瓦多',
                          '危地马拉', '洪都拉斯', '尼加拉瓜', '巴拿马', '玻利维亚', '厄瓜多尔', '圭亚那', '巴拉圭', '苏里南', '乌拉圭']
            }
        };
    }
    
    // 打开Emoji选择器
    openEmojiPicker() {
        if (!this.currentSettingsBookId) {
            console.warn('⚠️ 没有选中的词书ID');
            return;
        }
        
        console.log('📱 打开Emoji选择器，当前词书ID:', this.currentSettingsBookId);
        
        // 只隐藏词书设置弹窗，不清空currentSettingsBookId
        document.getElementById('bookSettingsModal').classList.add('hidden');
        
        // 显示emoji选择器
        document.getElementById('emojiPickerModal').classList.remove('hidden');
        
        // 渲染所有emoji
        this.renderEmojis('all');
        
        // 清空搜索框
        document.getElementById('emojiSearchInput').value = '';
    }
    
    // 关闭Emoji选择器
    closeEmojiPicker() {
        document.getElementById('emojiPickerModal').classList.add('hidden');
        // 清空当前设置的词书ID
        this.currentSettingsBookId = null;
        console.log('✅ Emoji选择器已关闭');
    }
    
    // 渲染Emoji网格
    renderEmojis(category) {
        const emojiGrid = document.getElementById('emojiGrid');
        emojiGrid.innerHTML = '';
        
        let emojisToShow = [];
        
        if (category === 'all') {
            // 显示所有emoji
            Object.values(this.emojiData).forEach(categoryData => {
                emojisToShow = emojisToShow.concat(categoryData.emojis);
            });
        } else if (this.emojiData[category]) {
            emojisToShow = this.emojiData[category].emojis;
        }
        
        // 创建emoji元素
        emojisToShow.forEach(emoji => {
            const emojiItem = document.createElement('div');
            emojiItem.className = 'emoji-item';
            emojiItem.textContent = emoji;
            emojiItem.title = emoji;
            emojiItem.addEventListener('click', () => {
                this.selectEmoji(emoji);
            });
            emojiGrid.appendChild(emojiItem);
        });
        
        // 显示emoji总数
        console.log(`📊 当前显示 ${emojisToShow.length} 个emoji`);
    }
    
    // 按分类筛选Emoji
    filterEmojisByCategory(category) {
        this.currentEmojiCategory = category;
        this.renderEmojis(category);
    }
    
    // 搜索Emoji
    searchEmojis(query) {
        if (!query.trim()) {
            // 如果搜索框为空，显示当前分类
            this.renderEmojis(this.currentEmojiCategory);
            return;
        }
        
        const emojiGrid = document.getElementById('emojiGrid');
        emojiGrid.innerHTML = '';
        
        const searchTerm = query.toLowerCase().trim();
        const matchedEmojis = [];
        
        // 遍历所有分类进行搜索
        Object.entries(this.emojiData).forEach(([category, data]) => {
            const keywords = data.keywords.join(' ').toLowerCase();
            
            // 检查关键词是否包含搜索词
            if (keywords.includes(searchTerm)) {
                // 如果关键词匹配，添加该分类的所有emoji
                matchedEmojis.push(...data.emojis);
            }
        });
        
        // 去重（某些emoji可能在多个分类中）
        const uniqueEmojis = [...new Set(matchedEmojis)];
        
        if (uniqueEmojis.length > 0) {
            // 显示搜索结果
            uniqueEmojis.forEach(emoji => {
                const emojiItem = document.createElement('div');
                emojiItem.className = 'emoji-item';
                emojiItem.textContent = emoji;
                emojiItem.title = emoji;
                emojiItem.addEventListener('click', () => {
                    this.selectEmoji(emoji);
                });
                emojiGrid.appendChild(emojiItem);
            });
            
            console.log(`🔍 搜索"${query}"找到 ${uniqueEmojis.length} 个emoji`);
        } else {
            // 没有找到结果
            emojiGrid.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
                    <div style="font-size: 0.875rem;">未找到"${query}"相关的emoji</div>
                    <div style="font-size: 0.75rem; margin-top: 8px; opacity: 0.7;">试试其他关键词，如：心、书、旗帜、美国</div>
                </div>
            `;
        }
    }
    
    // 选择Emoji
    selectEmoji(emoji) {
        if (!this.currentSettingsBookId) {
            console.error('❌ 无法选择emoji：currentSettingsBookId为空');
            return;
        }
        
        console.log(`🎨 正在更新词书图标为: ${emoji}，词书ID: ${this.currentSettingsBookId}`);
        
        // 更新词书的icon
        const updated = Storage.updateBook(this.currentSettingsBookId, { icon: emoji });
        
        if (updated) {
            // 刷新词书列表显示
            this.loadBooks();
            
            // 关闭emoji选择器
            this.closeEmojiPicker();
            
            // 显示成功提示
            console.log(`✨ 词书图标已成功更新为: ${emoji}`);
            
            // 可选：显示toast提示
            // alert(`图标已更新为 ${emoji}`);
        } else {
            console.error('❌ 更新词书图标失败');
        }
    }

    // ============================================
    // AI工坊相关方法
    // ============================================

    // 打开AI工坊
    openAiWorkshop() {
        // 显示AI工坊页面
        this.showScreen('aiWorkshopScreen');

        // 显示工坊主页，隐藏应用
        this.showWorkshopHome();
    }

    // 关闭AI工坊
    closeAiWorkshop() {
        this.showScreen('welcomeScreen');
        
        // 清除缓存的故事和题目数据
        this.currentStory = null;
        this.currentQuestions = [];
        this.userAnswers = {};
        
        // 重置阅读联想记忆的UI状态
        document.getElementById('aiStoryForm').classList.remove('hidden');
        document.getElementById('aiStoryDisplay').classList.add('hidden');
        document.getElementById('aiQuestionsDisplay').classList.add('hidden');
        document.getElementById('aiResultsDisplay').classList.add('hidden');
        
        // 退出双页模式（如果正在使用）
        if (document.body.classList.contains('dual-view-mode')) {
            this.toggleDualView();
        }
        
        // 重置工坊状态
        this.showWorkshopHome();
        
        console.log('✅ AI工坊已关闭，缓存已清除');
    }
    
    // 显示工坊主页
    showWorkshopHome() {
        document.getElementById('workshopAppsGrid').classList.remove('hidden');
        document.getElementById('readingAppContainer').classList.add('hidden');
        document.getElementById('synonymAppContainer').classList.add('hidden');
    }
    
    // 打开工坊应用
    openWorkshopApp(appName) {
        document.getElementById('workshopAppsGrid').classList.add('hidden');
        
        if (appName === 'reading') {
            console.log('📖 打开阅读联想记忆应用');
            document.getElementById('readingAppContainer').classList.remove('hidden');
        // 加载词单列表
        this.loadBookSelector();
        // 加载收藏单词
        this.loadFavoriteKeywords();
        // 加载待复习单词
        console.log('🔄 准备加载待复习单词...');
        this.loadReviewKeywords();
            // 重置关键词列表
        this.selectedKeywords = [];
        this.selectedBooks = [];
        this.updateSelectedKeywordsDisplay();
        } else if (appName === 'synonym') {
            document.getElementById('synonymAppContainer').classList.remove('hidden');
            // 初始化同义词练习
            this.initSynonymPractice();
        }
    }
    
    // ============================================
    // 移动端侧边栏切换
    // ============================================
    
    // 切换移动端词书列表
    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const statsPanel = document.querySelector('.stats-panel');
        const btn = document.getElementById('mobileToggleSidebar');
        
        if (!sidebar) return;
        
        // 如果统计面板打开，先关闭
        if (statsPanel && statsPanel.classList.contains('mobile-show')) {
            statsPanel.classList.remove('mobile-show');
            document.getElementById('mobileToggleStats').classList.remove('active');
        }
        
        // 切换侧边栏
        sidebar.classList.toggle('mobile-show');
        btn.classList.toggle('active');
        
        // 点击遮罩层关闭侧边栏
        if (sidebar.classList.contains('mobile-show')) {
            const closeOnClick = (e) => {
                if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
                    sidebar.classList.remove('mobile-show');
                    btn.classList.remove('active');
                    document.removeEventListener('click', closeOnClick);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', closeOnClick);
            }, 100);
        }
    }
    
    // 切换移动端今日统计
    toggleMobileStats() {
        const statsPanel = document.querySelector('.stats-panel');
        const sidebar = document.querySelector('.sidebar');
        const btn = document.getElementById('mobileToggleStats');
        
        if (!statsPanel) return;
        
        // 如果侧边栏打开，先关闭
        if (sidebar && sidebar.classList.contains('mobile-show')) {
            sidebar.classList.remove('mobile-show');
            document.getElementById('mobileToggleSidebar').classList.remove('active');
        }
        
        // 切换统计面板
        statsPanel.classList.toggle('mobile-show');
        btn.classList.toggle('active');
        
        // 点击遮罩层关闭统计面板
        if (statsPanel.classList.contains('mobile-show')) {
            const closeOnClick = (e) => {
                if (!statsPanel.contains(e.target) && !btn.contains(e.target)) {
                    statsPanel.classList.remove('mobile-show');
                    btn.classList.remove('active');
                    document.removeEventListener('click', closeOnClick);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', closeOnClick);
            }, 100);
        }
    }
    
    // ============================================
    // 同义词练习相关方法
    // ============================================
    
    // 初始化同义词练习
    async initSynonymPractice() {
        console.log('📖 初始化同义词练习');
        
        // 重置状态
        this.synonymData = [];
        this.synonymWords = [];
        this.synonymCurrentIndex = 0;
        this.synonymUserSelections = [];
        this.synonymResults = [];
        
        // 显示配置页面
        document.getElementById('synonymConfig').classList.remove('hidden');
        document.getElementById('synonymPractice').classList.add('hidden');
        document.getElementById('synonymCompletion').classList.add('hidden');
        
        // 加载文档缓存
        this.loadSynonymDocsCache();
        
        // 如果没有文档，加载内置示例文档
        if (this.synonymDocs.length === 0) {
            await this.loadBuiltInSynonymDoc();
        }
        
        // 渲染文档列表
        this.renderSynonymDocsList();
        
        // 如果有文档，选择第一个
        if (this.synonymDocs.length > 0 && !this.synonymCurrentDocId) {
            this.selectSynonymDoc(this.synonymDocs[0].id);
        }
        
        // 更新开始按钮状态
        this.updateSynonymStartButton();
    }
    
    // 加载内置示例文档
    async loadBuiltInSynonymDoc() {
        console.log('📚 加载内置示例文档...');
        this.showLoading('正在加载示例文档...');
        
        try {
            // 使用预加载的JS数据（避免CORS问题）
            if (typeof synonym538Data === 'undefined') {
                throw new Error('内置数据未加载，请确保 synonym-538-data.js 已引入');
            }
            
            // 处理数据格式，转换为标准格式
            const data = this.processSynonym538Data(synonym538Data);
            
            const doc = {
                id: 'built-in-538',
                name: '538阅读同义替换词（内置）',
                fileName: '538阅读同义替换词.xlsx',
                uploadTime: new Date().toISOString(),
                wordCount: data.length,
                data: data,
                isBuiltIn: true
            };
            
            this.synonymDocs.push(doc);
            this.saveSynonymDocsCache();
            
            this.hideLoading();
            this.showToast('已加载内置示例文档', 'success');
            console.log('✅ 内置文档加载成功:', data.length, '个单词');
        } catch (error) {
            console.error('内置文档加载失败:', error);
            this.hideLoading();
            this.showToast('内置文档加载失败：' + error.message, 'error');
        }
    }
    
    // 处理538数据格式
    processSynonym538Data(rawData) {
        const processed = [];
        
        for (const row of rawData) {
            const word = (row['重点词'] || '').toString().trim();
            const synonymsStr = (row['同义词/替换词'] || '').toString();
            
            if (!word || !synonymsStr) continue;
            
            // 解析同义词（支持换行符、逗号等分隔）
            const synonyms = synonymsStr
                .split(/[\n,，、;；]/)
                .map(s => s.trim())
                .filter(s => s && s.length > 0);
            
            if (synonyms.length === 0) continue;
            
            // 从"全义"字段提取音标
            const fullDef = row['全义'] || '';
            const phoneticMatch = fullDef.match(/^\/[^\/]+\//);
            const phonetic = phoneticMatch ? phoneticMatch[0] : '';
            
            processed.push({
                word: word,
                phonetic: phonetic,
                meaning: (row['释义'] || '').toString().trim(),
                level: '',  // 538数据中没有等级字段
                synonyms: synonyms
            });
        }
        
        console.log(`📊 处理538数据: ${rawData.length} 行 → ${processed.length} 个有效单词`);
        return processed;
    }
    
    // 处理文件上传
    async handleSynonymFileUpload(file) {
        if (!file) return;
        
        console.log('📂 上传文件:', file.name);
        this.showLoading('正在解析文件...');
        
        try {
            const data = await this.parseSynonymExcel(file);
            
            // 创建新文档
            const doc = {
                id: 'upload-' + Date.now(),
                name: file.name.replace(/\.(xlsx|xls)$/, ''),
                fileName: file.name,
                uploadTime: new Date().toISOString(),
                wordCount: data.length,
                data: data,
                isBuiltIn: false
            };
            
            this.synonymDocs.push(doc);
            this.saveSynonymDocsCache();
            this.renderSynonymDocsList();
            this.selectSynonymDoc(doc.id);
            
            this.hideLoading();
            this.showToast(`成功加载 ${data.length} 个单词`, 'success');
        } catch (error) {
            console.error('文件解析失败:', error);
            this.hideLoading();
            
            const errorMsg = error.message || '文件解析失败，请检查格式';
            alert(`❌ 文件解析失败\n\n${errorMsg}`);
        }
    }
    
    // 加载文档缓存
    loadSynonymDocsCache() {
        const cached = localStorage.getItem('synonymDocsCache');
        if (cached) {
            try {
                this.synonymDocs = JSON.parse(cached);
                console.log('✅ 已加载文档缓存:', this.synonymDocs.length, '个文档');
                return true;
            } catch (e) {
                console.error('缓存加载失败:', e);
                this.synonymDocs = [];
                return false;
            }
        }
        this.synonymDocs = [];
        return false;
    }
    
    // 保存文档缓存
    saveSynonymDocsCache() {
        try {
            localStorage.setItem('synonymDocsCache', JSON.stringify(this.synonymDocs));
            console.log('💾 文档缓存已保存');
        } catch (e) {
            console.error('缓存保存失败:', e);
        }
    }
    
    // 渲染文档列表
    renderSynonymDocsList() {
        const docsList = document.getElementById('synonymDocsList');
        docsList.innerHTML = '';
        
        this.synonymDocs.forEach(doc => {
            const docItem = document.createElement('div');
            docItem.className = 'doc-item';
            if (doc.isBuiltIn) {
                docItem.classList.add('built-in');
            }
            if (doc.id === this.synonymCurrentDocId) {
                docItem.classList.add('active');
            }
            
            docItem.innerHTML = `
                <span class="doc-item-icon">${doc.isBuiltIn ? '📚' : '📄'}</span>
                <div class="doc-item-info">
                    <div class="doc-item-name">${doc.name}</div>
                    <div class="doc-item-meta">${doc.wordCount} 个单词 · ${this.formatDate(doc.uploadTime)}</div>
                </div>
                ${!doc.isBuiltIn ? `
                    <div class="doc-item-actions">
                        <button class="btn-doc-action" data-action="delete" data-id="${doc.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            `;
            
            // 点击选择文档
            docItem.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-doc-action')) {
                    this.selectSynonymDoc(doc.id);
                }
            });
            
            // 删除按钮
            const deleteBtn = docItem.querySelector('[data-action="delete"]');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteSynonymDoc(doc.id);
                });
            }
            
            docsList.appendChild(docItem);
        });
    }
    
    // 选择文档
    selectSynonymDoc(docId) {
        const doc = this.synonymDocs.find(d => d.id === docId);
        if (!doc) return;
        
        this.synonymCurrentDocId = docId;
        this.synonymData = doc.data;
        
        // 更新文档列表的active状态
        this.renderSynonymDocsList();
        
        // 更新当前文档信息
        document.getElementById('synonymCurrentDocName').textContent = doc.name;
        document.getElementById('synonymCurrentDocCount').textContent = doc.wordCount;
        
        // 更新开始按钮
        this.updateSynonymStartButton();
        
        console.log('📖 已选择文档:', doc.name);
    }
    
    // 删除文档
    deleteSynonymDoc(docId) {
        if (!confirm('确定要删除这个文档吗？')) return;
        
        this.synonymDocs = this.synonymDocs.filter(d => d.id !== docId);
        this.saveSynonymDocsCache();
        
        // 如果删除的是当前文档，选择其他文档
        if (this.synonymCurrentDocId === docId) {
            if (this.synonymDocs.length > 0) {
                this.selectSynonymDoc(this.synonymDocs[0].id);
            } else {
                this.synonymCurrentDocId = null;
                this.synonymData = [];
                document.getElementById('synonymCurrentDocName').textContent = '未选择';
                document.getElementById('synonymCurrentDocCount').textContent = '0';
            }
        }
        
        this.renderSynonymDocsList();
        this.updateSynonymStartButton();
        this.showToast('文档已删除', 'success');
    }
    
    // 更新开始按钮状态
    updateSynonymStartButton() {
        const startBtn = document.getElementById('startSynonymBtn');
        startBtn.disabled = this.synonymData.length === 0;
    }
    
    // 解析Excel文件
    async parseSynonymExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    
                    const parsed = this.processSynonymExcelData(jsonData);
                    resolve(parsed);
                } catch (error) {
                    console.error('解析错误:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    // 处理Excel数据（提取共同逻辑）
    processSynonymExcelData(jsonData) {
        if (jsonData.length === 0) {
            throw new Error('文件为空或格式不正确');
        }
        
        // 获取所有列名
        const firstRow = jsonData[0];
        const columnNames = Object.keys(firstRow);
        
        console.log('📋 Excel列名:', columnNames);
        
        // 智能匹配列名
        const columnMapping = this.matchExcelColumns(columnNames);
        
        console.log('🔍 列名匹配结果:', columnMapping);
        
        if (!columnMapping.word || !columnMapping.synonyms) {
            const missingCols = [];
            if (!columnMapping.word) missingCols.push('单词/重点词');
            if (!columnMapping.synonyms) missingCols.push('同义词/替换词');
            throw new Error(`未找到必需的列：${missingCols.join('、')}。\n\n当前列名：${columnNames.join('、')}`);
        }
        
        // 解析数据
        const parsed = jsonData.map((row, index) => {
            // 获取同义词字符串
            const synonymsStr = row[columnMapping.synonyms] || '';
            const synonyms = synonymsStr.toString().split(/[,，、;；]/).map(s => s.trim()).filter(s => s);
            
            // 获取单词
            const word = (row[columnMapping.word] || '').toString().trim();
            
            return {
                word: word,
                phonetic: row[columnMapping.phonetic] ? row[columnMapping.phonetic].toString().trim() : '',
                meaning: row[columnMapping.meaning] ? row[columnMapping.meaning].toString().trim() : '',
                level: row[columnMapping.level] ? row[columnMapping.level].toString().trim() : '',
                synonyms: synonyms
            };
        }).filter(item => item.word && item.synonyms.length > 0);
        
        console.log(`✅ 成功解析 ${parsed.length} 个单词`);
        
        if (parsed.length === 0) {
            throw new Error('未找到有效数据。请确保：\n1. 单词/重点词列不为空\n2. 同义词/替换词列不为空\n3. 同义词用逗号分隔');
        }
        
        return parsed;
    }
    
    // 智能匹配Excel列名
    matchExcelColumns(columnNames) {
        const mapping = {
            word: null,
            phonetic: null,
            meaning: null,
            level: null,
            synonyms: null
        };
        
        // 定义匹配规则（按优先级排序）
        const patterns = {
            word: ['重点词', '单词', 'word', '词汇', '英文', '英语单词'],
            phonetic: ['音标', 'phonetic', '发音', 'pronunciation'],
            meaning: ['中文释义', '释义', '意思', '中文', '翻译', 'meaning', '定义'],
            level: ['等级', 'level', '难度', 'cefr', '级别'],
            synonyms: ['同义词', '替换词', '同义替换', 'synonym', '近义词', '相关词']
        };
        
        // 对每个字段进行匹配
        for (const [field, keywords] of Object.entries(patterns)) {
            for (const colName of columnNames) {
                const normalizedCol = colName.toLowerCase().trim();
                
                // 精确匹配或包含关键字
                for (const keyword of keywords) {
                    const normalizedKeyword = keyword.toLowerCase();
                    
                    if (normalizedCol === normalizedKeyword || 
                        normalizedCol.includes(normalizedKeyword) ||
                        normalizedKeyword.includes(normalizedCol)) {
                        mapping[field] = colName;
                        break;
                    }
                }
                
                if (mapping[field]) break;
            }
        }
        
        return mapping;
    }
    
    // 开始练习
    startSynonymPractice() {
        const mode = document.getElementById('synonymMode').value;
        const count = parseInt(document.getElementById('synonymCount').value);
        
        // 准备单词列表
        let words = [...this.synonymData];
        
        // 乱序
        if (mode === 'random') {
            words = words.sort(() => Math.random() - 0.5);
        }
        
        // 限制数量
        this.synonymWords = words.slice(0, Math.min(count, words.length));
        this.synonymCurrentIndex = 0;
        this.synonymResults = [];
        
        // 显示练习页面
        document.getElementById('synonymConfig').classList.add('hidden');
        document.getElementById('synonymPractice').classList.remove('hidden');
        
        // 渲染第一题
        this.renderSynonymQuestion();
    }
    
    // 渲染题目
    renderSynonymQuestion() {
        if (this.synonymCurrentIndex >= this.synonymWords.length) {
            this.finishSynonymPractice();
            return;
        }
        
        const word = this.synonymWords[this.synonymCurrentIndex];
        this.synonymCurrentWord = word;
        this.synonymUserSelections = [];
        
        // 更新进度
        document.getElementById('synonymCurrentIndex').textContent = this.synonymCurrentIndex + 1;
        document.getElementById('synonymTotalWords').textContent = this.synonymWords.length;
        
        // 更新单词信息
        document.getElementById('synonymWordText').textContent = word.word;
        document.getElementById('synonymWordPhonetic').textContent = word.phonetic;
        
        // 解析词性和释义
        const meaningMatch = word.meaning.match(/^([a-z]+\.)(.+)$/i);
        if (meaningMatch) {
            document.getElementById('synonymWordPos').textContent = meaningMatch[1];
            document.getElementById('synonymWordMeaning').textContent = meaningMatch[2].trim();
        } else {
            document.getElementById('synonymWordPos').textContent = '';
            document.getElementById('synonymWordMeaning').textContent = word.meaning;
        }
        
        document.getElementById('synonymWordLevel').textContent = word.level;
        
        // 更新提示
        document.getElementById('synonymTotalAnswer').textContent = word.synonyms.length;
        document.getElementById('synonymAnswerCount').textContent = 0;
        
        // 生成选项
        this.generateSynonymOptions(word);
        
        // 更新进度条
        this.updateSynonymProgress();
        
        // 隐藏反馈
        document.getElementById('synonymFeedbackOverlay').classList.add('hidden');
        
        // 更新上一题标记
        this.updateSynonymLastBadge();
        
        // 自动播放单词发音
        setTimeout(() => {
            this.speak(word.word);
        }, 300);
    }
    
    // 生成选项（正确答案 + 3个干扰项）
    generateSynonymOptions(word) {
        const correctAnswers = word.synonyms;
        const distractors = [];
        
        // 从其他单词中选择干扰项
        const otherWords = this.synonymData.filter(w => w.word !== word.word);
        let allOtherSynonyms = [];
        
        otherWords.forEach(w => {
            allOtherSynonyms = allOtherSynonyms.concat(w.synonyms);
        });
        
        // 去重
        allOtherSynonyms = [...new Set(allOtherSynonyms)];
        
        // 随机选3个不重复的干扰项
        while (distractors.length < 3 && allOtherSynonyms.length > 0) {
            const randomIndex = Math.floor(Math.random() * allOtherSynonyms.length);
            const distractor = allOtherSynonyms[randomIndex];
            
            if (!correctAnswers.includes(distractor) && !distractors.includes(distractor)) {
                distractors.push(distractor);
            }
            
            allOtherSynonyms.splice(randomIndex, 1);
        }
        
        // 混合并随机排序
        const allOptions = [...correctAnswers, ...distractors].sort(() => Math.random() - 0.5);
        
        // 渲染选项
        const optionsGrid = document.getElementById('synonymOptionsGrid');
        optionsGrid.innerHTML = '';
        
        allOptions.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'synonym-option';
            optionBtn.textContent = option;
            optionBtn.dataset.value = option;
            optionBtn.addEventListener('click', () => this.handleSynonymOptionClick(optionBtn));
            optionsGrid.appendChild(optionBtn);
        });
    }
    
    // 处理选项点击
    handleSynonymOptionClick(optionBtn) {
        // 移除焦点，避免移动端出现绿色边框
        if (document.activeElement) {
            document.activeElement.blur();
        }
        
        const value = optionBtn.dataset.value;
        
        if (optionBtn.classList.contains('selected')) {
            // 取消选择
            optionBtn.classList.remove('selected');
            const index = this.synonymUserSelections.indexOf(value);
            if (index > -1) {
                this.synonymUserSelections.splice(index, 1);
            }
        } else {
            // 选择
            optionBtn.classList.add('selected');
            this.synonymUserSelections.push(value);
        }
        
        // 更新计数
        document.getElementById('synonymAnswerCount').textContent = this.synonymUserSelections.length;
        
        // 如果选够了答案数量，自动提交
        if (this.synonymUserSelections.length === this.synonymCurrentWord.synonyms.length) {
            setTimeout(() => {
                this.submitSynonymAnswer();
            }, 300); // 稍微延迟，让用户看到选中效果
        }
    }
    
    // 提交答案
    submitSynonymAnswer() {
        if (this.synonymUserSelections.length === 0) {
            this.showToast('请至少选择一个选项', 'error');
            return;
        }
        
        const word = this.synonymCurrentWord;
        const correctAnswers = word.synonyms;
        const userAnswers = this.synonymUserSelections;
        
        // 判断结果
        const correctSelected = userAnswers.filter(a => correctAnswers.includes(a));
        const incorrectSelected = userAnswers.filter(a => !correctAnswers.includes(a));
        const missed = correctAnswers.filter(a => !userAnswers.includes(a));
        
        const isFullyCorrect = correctSelected.length === correctAnswers.length && incorrectSelected.length === 0;
        const isPartiallyCorrect = correctSelected.length > 0 && (incorrectSelected.length > 0 || missed.length > 0);
        
        // 记录结果
        this.synonymResults.push({
            word: word.word,
            correct: isFullyCorrect,
            partial: isPartiallyCorrect,
            correctSelected: correctSelected.length,
            total: correctAnswers.length,
            userAnswers: userAnswers,
            correctAnswers: correctAnswers
        });
        
        // 显示反馈
        this.showSynonymFeedback(isFullyCorrect, isPartiallyCorrect, correctAnswers, incorrectSelected, missed);
    }
    
    // 显示反馈
    showSynonymFeedback(isFullyCorrect, isPartiallyCorrect, correctAnswers, incorrectSelected, missed) {
        // 更新选项状态
        document.querySelectorAll('.synonym-option').forEach(btn => {
            const value = btn.dataset.value;
            btn.style.pointerEvents = 'none';
            
            if (correctAnswers.includes(value)) {
                btn.classList.add('correct');
            }
            if (incorrectSelected.includes(value)) {
                btn.classList.add('incorrect');
            }
            if (missed.includes(value)) {
                btn.classList.add('missed');
            }
        });
        
        // 显示反馈层
        const overlay = document.getElementById('synonymFeedbackOverlay');
        const icon = document.getElementById('synonymFeedbackIcon');
        const text = document.getElementById('synonymFeedbackText');
        const answer = document.getElementById('synonymCorrectAnswer');
        
        if (isFullyCorrect) {
            icon.textContent = '✓';
            icon.style.color = 'var(--success)';
            text.textContent = '完全正确！';
            answer.textContent = '';
            
            // 播放成功音效（不播放动画，静默提醒）
            this.playCorrectSound();
        } else if (isPartiallyCorrect) {
            icon.textContent = '△';
            icon.style.color = 'var(--warning)';
            text.textContent = '部分正确';
            answer.innerHTML = `<div style="margin-top: 1rem;">正确答案：<strong>${correctAnswers.join(', ')}</strong></div>`;
            
            // 播放提示音
            this.playWrongSound();
        } else {
            icon.textContent = '✗';
            icon.style.color = 'var(--error)';
            text.textContent = '请继续加油！';
            answer.innerHTML = `<div style="margin-top: 1rem;">正确答案：<strong>${correctAnswers.join(', ')}</strong></div>`;
            
            // 播放错误音效
            this.playWrongSound();
        }
        
        overlay.classList.remove('hidden');
        
        // 禁用提交按钮，防止重复提交
        document.getElementById('synonymSubmitBtn').disabled = true;
        
        // 自动进入下一题（使用学习模式的切换时长设置）
        const autoNextTime = parseFloat(this.settings.autoNextTime || 3);
        setTimeout(() => {
            this.nextSynonymWord();
            // 重新启用提交按钮
            document.getElementById('synonymSubmitBtn').disabled = false;
        }, autoNextTime * 1000);
    }
    
    // 下一题
    nextSynonymWord() {
        this.synonymCurrentIndex++;
        this.renderSynonymQuestion();
    }
    
    // 跳过
    skipSynonymWord() {
        this.synonymResults.push({
            word: this.synonymCurrentWord.word,
            correct: false,
            partial: false,
            skipped: true,
            userAnswers: [],
            correctAnswers: this.synonymCurrentWord.synonyms
        });
        this.nextSynonymWord();
    }
    
    // 完成练习
    finishSynonymPractice() {
        // 计算统计
        const total = this.synonymResults.length;
        const correct = this.synonymResults.filter(r => r.correct).length;
        const partial = this.synonymResults.filter(r => r.partial).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        // 显示完成页面
        document.getElementById('synonymPractice').classList.add('hidden');
        document.getElementById('synonymCompletion').classList.remove('hidden');
        
        // 更新统计
        document.getElementById('synonymStatsTotal').textContent = total;
        document.getElementById('synonymStatsCorrect').textContent = correct;
        document.getElementById('synonymStatsPartial').textContent = partial;
        document.getElementById('synonymStatsAccuracy').textContent = `${accuracy}%`;
    }
    
    // 退出练习
    exitSynonymPractice() {
        if (confirm('确定要退出练习吗？当前进度将不会保存。')) {
            this.showWorkshopHome();
        }
    }
    
    // 重新开始
    restartSynonymPractice() {
        this.initSynonymPractice();
    }
    
    // 查看错题
    reviewSynonymErrors() {
        // 筛选错题
        const errors = this.synonymResults.filter(r => !r.correct);
        
        if (errors.length === 0) {
            this.showToast('太棒了！没有错题', 'success');
            return;
        }
        
        // 准备错题列表
        this.synonymWords = errors.map(e => {
            return this.synonymData.find(w => w.word === e.word);
        }).filter(w => w);
        
        this.synonymCurrentIndex = 0;
        this.synonymResults = [];
        
        // 显示练习页面
        document.getElementById('synonymCompletion').classList.add('hidden');
        document.getElementById('synonymPractice').classList.remove('hidden');
        
        // 渲染第一题
        this.renderSynonymQuestion();
        
        this.showToast(`开始复习 ${errors.length} 道错题`, 'info');
    }
    
    // 更新进度条
    updateSynonymProgress() {
        const track = document.getElementById('synonymProgressTrack');
        track.innerHTML = '';
        
        this.synonymWords.forEach((_, index) => {
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            segment.style.width = `${100 / this.synonymWords.length}%`;
            
            if (index < this.synonymCurrentIndex) {
                const result = this.synonymResults[index];
                if (result.correct) {
                    segment.classList.add('correct');
                } else if (result.partial) {
                    segment.classList.add('partial');
                } else {
                    segment.classList.add('wrong');
                }
            } else if (index === this.synonymCurrentIndex) {
                segment.classList.add('current');
            } else {
                segment.classList.add('pending');
            }
            
            track.appendChild(segment);
        });
        
        // 更新正确率
        if (this.synonymCurrentIndex > 0) {
            const correct = this.synonymResults.filter(r => r.correct).length;
            const accuracy = Math.round((correct / this.synonymCurrentIndex) * 100);
            document.getElementById('synonymAccuracy').textContent = `${accuracy}%`;
        } else {
            document.getElementById('synonymAccuracy').textContent = '0%';
        }
    }
    
    // 更新上一题标记
    updateSynonymLastBadge() {
        const badge = document.getElementById('synonymLastBadge');
        
        if (this.synonymCurrentIndex > 0 && this.synonymResults.length > 0) {
            const lastResult = this.synonymResults[this.synonymResults.length - 1];
            badge.style.display = 'flex';
            
            if (lastResult.correct) {
                badge.textContent = '✓ 上一题正确';
                
            } else if (lastResult.partial) {
                badge.textContent = '△ 上一题部分正确';
                
            } else if (lastResult.skipped) {
                badge.textContent = '⊘ 上一题跳过';
                
               
            } else {
                badge.textContent = '✗ 上一题错误';
               
            }
        } else {
            badge.style.display = 'none';
        }
    }
    
    // 播放单词发音
    playSynonymAudio() {
        if (this.synonymCurrentWord) {
            this.speak(this.synonymCurrentWord.word);
        }
    }

    // 加载收藏单词作为关键词
    loadFavoriteKeywords() {
        const keywordList = document.getElementById('keywordList');
        const keywordEmpty = document.getElementById('keywordEmpty');
        keywordList.innerHTML = '';

        // 获取所有词书中的收藏单词
        const favoriteWords = [];
        const books = Storage.loadBooks();
        
        books.forEach(book => {
            book.words.forEach(word => {
                if (word.favorite && word.word) {
                    favoriteWords.push(word.word.toLowerCase());
                }
            });
        });

        // 去重
        const uniqueFavorites = [...new Set(favoriteWords)];

        if (uniqueFavorites.length === 0) {
            keywordEmpty.classList.remove('hidden');
            keywordList.classList.add('hidden');
        } else {
            keywordEmpty.classList.add('hidden');
            keywordList.classList.remove('hidden');

            // 渲染收藏单词
            uniqueFavorites.forEach(word => {
                const keyword = document.createElement('button');
                keyword.className = 'keyword-item';
                keyword.textContent = word;
                keyword.dataset.word = word;
                keyword.addEventListener('click', () => {
                    this.toggleKeywordSelection(word, keyword);
                });
                keywordList.appendChild(keyword);
            });
        }

        console.log(`📚 加载了 ${uniqueFavorites.length} 个收藏单词`);
    }

    // 加载待复习单词（错题和不知道的）
    loadReviewKeywords() {
        console.log('🔍 ===== 开始加载待复习单词 =====');
        
        const reviewKeywordList = document.getElementById('reviewKeywordList');
        const reviewKeywordEmpty = document.getElementById('reviewKeywordEmpty');
        
        console.log('🔍 DOM元素:', {
            reviewKeywordList: reviewKeywordList ? '✓' : '✗',
            reviewKeywordEmpty: reviewKeywordEmpty ? '✓' : '✗'
        });
        
        reviewKeywordList.innerHTML = '';

        // 获取所有词书中待复习的单词（与右侧待复习区逻辑一致）
        const reviewWords = [];
        const books = Storage.loadBooks();
        
        console.log(`🔍 加载了 ${books.length} 个词书`);
        
        books.forEach((book, bookIndex) => {
            // book.progress.wrong 数组中存储的是完整的单词对象，不是索引
            const wrongWords = book.progress?.wrong || [];
            
            console.log(`🔍 词书 ${bookIndex + 1} [${book.name}]:`, {
                totalWords: book.words?.length || 0,
                wrongWordsCount: wrongWords.length,
                wrongWordsType: wrongWords.length > 0 ? typeof wrongWords[0] : 'N/A',
                firstWrongWord: wrongWords.length > 0 ? wrongWords[0]?.word : 'N/A',
                hasProgress: !!book.progress,
                progressKeys: book.progress ? Object.keys(book.progress) : []
            });
            
            // wrongWords 数组中的每个元素就是一个单词对象
            wrongWords.forEach((wordObj, i) => {
                if (i < 3) {  // 只打印前3个单词详情
                    console.log(`  📝 错词 ${i + 1}:`, {
                        exists: !!wordObj,
                        word: wordObj?.word,
                        wrongAt: wordObj?.wrongAt,
                        reviewCount: wordObj?.reviewCount,
                        wrongTimes: wordObj?.wrongTimes
                    });
                }
                
                // wordObj 就是单词对象
                if (wordObj && wordObj.word) {
                    reviewWords.push({
                        word: wordObj.word.toLowerCase(),
                        wrongTimes: wordObj.wrongTimes || wordObj.reviewCount || 1,
                        lastWrongDate: wordObj.wrongAt ? new Date(wordObj.wrongAt).getTime() : 0
                    });
                }
            });
        });

        console.log(`🔍 收集到 ${reviewWords.length} 个待复习单词（去重前）`);

        if (reviewWords.length === 0) {
            console.log('⚠️ 没有待复习单词，显示空状态');
            reviewKeywordEmpty.classList.remove('hidden');
            reviewKeywordList.classList.add('hidden');
        } else {
            console.log('✅ 有待复习单词，开始处理');
            reviewKeywordEmpty.classList.add('hidden');
            reviewKeywordList.classList.remove('hidden');

            // 按最近错误时间排序，最近的在前
            reviewWords.sort((a, b) => b.lastWrongDate - a.lastWrongDate);

            // 去重（保留最近的记录）
            const uniqueReviewWords = [];
            const seenWords = new Set();
            reviewWords.forEach(item => {
                if (!seenWords.has(item.word)) {
                    seenWords.add(item.word);
                    uniqueReviewWords.push(item);
                }
            });

            console.log(`🔍 去重后 ${uniqueReviewWords.length} 个单词`);
            console.log('🔍 前10个单词:', uniqueReviewWords.slice(0, 10).map(w => w.word));

            // 渲染待复习单词
            uniqueReviewWords.forEach((item, index) => {
                const keyword = document.createElement('button');
                keyword.className = 'keyword-item review-keyword-item';
                keyword.innerHTML = `
                    <span class="review-keyword-word">${item.word}</span>
                    <span class="review-keyword-badge">×${item.wrongTimes}</span>
                `;
                keyword.dataset.word = item.word;
                keyword.addEventListener('click', () => {
                    this.toggleKeywordSelection(item.word, keyword);
                });
                reviewKeywordList.appendChild(keyword);
                
                if (index < 3) {
                    console.log(`  ✓ 渲染单词 ${index + 1}: ${item.word} (×${item.wrongTimes})`);
                }
            });

            console.log(`✅ 成功加载 ${uniqueReviewWords.length} 个待复习单词到列表`);
        }
        
        console.log('🔍 ===== 加载待复习单词完成 =====');
    }

    // 切换关键词选择
    toggleKeywordSelection(word, element) {
        const index = this.selectedKeywords.indexOf(word);
        
        if (index > -1) {
            // 取消选择
            this.selectedKeywords.splice(index, 1);
            element.classList.remove('selected');
        } else {
            // 选择
            if (this.selectedKeywords.length >= 10) {
                alert('最多选择10个关键词');
                return;
            }
            this.selectedKeywords.push(word);
            element.classList.add('selected');
        }

        this.updateSelectedKeywordsDisplay();
    }

    // 更新已选择关键词显示
    updateSelectedKeywordsDisplay() {
        const container = document.getElementById('selectedKeywords');
        container.innerHTML = '';

        if (this.selectedKeywords.length > 0) {
            const label = document.createElement('div');
            label.className = 'selected-keywords-label';
            label.textContent = `已选择 ${this.selectedKeywords.length} 个关键词：`;
            container.appendChild(label);

            const list = document.createElement('div');
            list.className = 'selected-keywords-list';
            
            this.selectedKeywords.forEach(word => {
                const tag = document.createElement('span');
                tag.className = 'keyword-tag';
                tag.innerHTML = `${word} <button class="keyword-remove" data-word="${word}">×</button>`;
                
                tag.querySelector('.keyword-remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeKeyword(word);
                });
                
                list.appendChild(tag);
            });

            container.appendChild(list);
        }
    }

    // 移除关键词
    removeKeyword(word) {
        const index = this.selectedKeywords.indexOf(word);
        if (index > -1) {
            this.selectedKeywords.splice(index, 1);
        }

        // 更新按钮状态
        const button = document.querySelector(`.keyword-item[data-word="${word}"]`);
        if (button) {
            button.classList.remove('selected');
        }

        this.updateSelectedKeywordsDisplay();
    }
    
    // 加载词单选择器
    loadBookSelector() {
        const bookSelector = document.getElementById('bookSelector');
        bookSelector.innerHTML = '';
        
        const books = Storage.loadBooks();
        
        if (books.length === 0) {
            return;
        }
        
        books.forEach(book => {
            const bookItem = document.createElement('button');
            bookItem.className = 'book-selector-item';
            bookItem.dataset.bookId = book.id;
            
            bookItem.innerHTML = `
                <span class="book-selector-item-icon">${book.icon || '📖'}</span>
                <span class="book-selector-item-name">${book.name}</span>
                <span class="book-selector-item-count">(${book.words.length}词)</span>
            `;
            
            bookItem.addEventListener('click', () => {
                this.toggleBookSelection(book, bookItem);
            });
            
            bookSelector.appendChild(bookItem);
        });
    }
    
    // 切换词单选择
    toggleBookSelection(book, element) {
        const index = this.selectedBooks.findIndex(b => b.id === book.id);
        
        if (index > -1) {
            // 取消选择
            this.selectedBooks.splice(index, 1);
            element.classList.remove('selected');
        } else {
            // 选择
            this.selectedBooks.push(book);
            element.classList.add('selected');
        }
    }
    
    // 自动选择关键词
    autoSelectKeywords() {
        if (this.selectedBooks.length === 0) {
            alert('请先选择至少一个词单');
            return;
        }
        
        const count = parseInt(document.getElementById('autoSelectCount').value);
        
        if (count < 3 || count > 20) {
            alert('请输入3-20之间的数量');
            return;
        }
        
        // 收集所有选中词单的单词
        let allWords = [];
        this.selectedBooks.forEach(book => {
            book.words.forEach(word => {
                allWords.push(word.word);
            });
        });
        
        // 去重
        allWords = [...new Set(allWords)];
        
        if (allWords.length < count) {
            alert(`选中的词单总共只有 ${allWords.length} 个单词，少于要求的 ${count} 个`);
            return;
        }
        
        // 随机打乱并选择
        const shuffled = allWords.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
        
        // 清空现有选择
        this.selectedKeywords = [];
        
        // 更新关键词列表按钮状态
        document.querySelectorAll('.keyword-item').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 添加随机选择的单词
        selected.forEach(word => {
            if (!this.selectedKeywords.includes(word)) {
                this.selectedKeywords.push(word);
                
                // 更新按钮状态
                const button = document.querySelector(`.keyword-item[data-word="${word}"]`);
                if (button) {
                    button.classList.add('selected');
                }
            }
        });
        
        this.updateSelectedKeywordsDisplay();
        
        console.log(`🎲 随机选择了 ${selected.length} 个关键词:`, selected);
    }
    
    // 处理手动输入单词
    handleKeywordInput(value) {
        const input = document.getElementById('keywordInput');
        
        // 清除之前的计时器
        if (this.keywordInputTimer) {
            clearTimeout(this.keywordInputTimer);
        }
        
        // 清除无效状态
        input.classList.remove('invalid');
        
        const word = value.trim().toLowerCase();
        
        // 空值不处理
        if (!word) {
            return;
        }
        
        // 检查是否在CEFR词汇表中
        const isValid = this.checkWordInCEFR(word);
        
        if (!isValid) {
            // 显示红色波浪线
            input.classList.add('invalid');
        }
        
        // 设置新的计时器（0.5秒后自动添加）
        this.keywordInputTimer = setTimeout(() => {
            if (isValid && word) {
                this.addKeywordFromInput(word);
                input.value = '';
                input.classList.remove('invalid');
            }
        }, 500);
    }
    
    // 检查单词是否在CEFR词汇表中
    checkWordInCEFR(word) {
        if (!this.cefrData || !word) return false;
        
        const lowerWord = word.toLowerCase();
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        
        for (const level of levels) {
            if (this.cefrData[level] && this.cefrData[level].includes(lowerWord)) {
                return true;
            }
        }
        
        return false;
    }
    
    // 从输入添加关键词
    addKeywordFromInput(word) {
        // 检查是否已经存在
        if (this.selectedKeywords.includes(word)) {
            console.log(`单词 "${word}" 已存在`);
            return;
        }
        
        // 检查数量限制
        if (this.selectedKeywords.length >= 20) {
            alert('最多选择20个关键词');
            return;
        }
        
        // 添加关键词
        this.selectedKeywords.push(word);
        
        // 更新按钮状态（如果存在）
        const button = document.querySelector(`.keyword-item[data-word="${word}"]`);
        if (button) {
            button.classList.add('selected');
        }
        
        this.updateSelectedKeywordsDisplay();
        
        console.log(`✅ 添加关键词: ${word}`);
    }
    
    // 切换关键词选择模式
    switchKeywordMode(mode) {
        // 移除所有active类
        document.querySelectorAll('.keyword-mode-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.keyword-mode-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 添加active类到选中的tab和panel
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        if (mode === 'books') {
            document.getElementById('panelBooks').classList.add('active');
        } else if (mode === 'favorites') {
            document.getElementById('panelFavorites').classList.add('active');
        } else if (mode === 'review') {
            document.getElementById('panelReview').classList.add('active');
        } else if (mode === 'input') {
            document.getElementById('panelInput').classList.add('active');
            // 自动聚焦输入框
            setTimeout(() => {
                document.getElementById('keywordInput').focus();
            }, 100);
        }
    }

    // 更新主题选项（根据题材）
    updateThemeOptions(genre) {
        const themeSelect = document.getElementById('storyTheme');
        
        const themeOptions = {
            '外文刊物': [
                { value: '随机', label: '🔄 随机选择' },
                { value: '科技未来', label: '🚀 科技未来' },
                { value: '环境与能源', label: '🌍 环境与能源' },
                { value: '法律与犯罪', label: '⚖️ 法律与犯罪' },
                { value: '教育社科', label: '🎓 教育社科' },
                { value: '经济与发展', label: '💰 经济与发展' },
                { value: '文化传媒', label: '🎭 文化传媒' },
                { value: '农业与食品', label: '🍎 农业与食品' },
                { value: '商业职场', label: '💼 商业职场' },
                { value: '社会问题', label: '🔍 社会问题' },
                { value: '政府政策', label: '🏛️ 政府政策' },
                { value: '健康与生活', label: '❤️ 健康与生活' },
                { value: '全球化', label: '✈️ 全球化' }
            ],
            '生动故事': [
                { value: '随机', label: '🔄 随机选择' },
                { value: '科技', label: '🚀 科技未来' },
                { value: '玄幻', label: '🔮 玄幻修仙' },
                { value: '悬疑', label: '🔍 悬疑推理' },
                { value: '恋爱', label: '💕 浪漫爱情' },
                { value: '冒险', label: '🗺️ 冒险探险' },
                { value: '历史', label: '📜 历史穿越' },
                { value: '奇幻', label: '🦄 奇幻魔法' },
                { value: '商业', label: '💼 商业职场' }
            ],
            '文献报告': [
                { value: '随机', label: '🔄 随机选择' },
                { value: '计算机', label: '💻 计算机科学' },
                { value: '商业金融', label: '💰 商业金融' },
                { value: '机械电气', label: '⚙️ 机械电气' },
                { value: '宗教文学', label: '📖 宗教文学' },
                { value: '社科心理', label: '🧠 社科心理' },
                { value: '医学生物', label: '🧬 医学生物' },
                { value: '物理化学', label: '⚗️ 物理化学' },
                { value: '数学统计', label: '📊 数学统计' },
                { value: '法律政治', label: '⚖️ 法律政治' },
                { value: '教育学', label: '🎓 教育学' },
                { value: '建筑工程', label: '🏗️ 建筑工程' },
                { value: '艺术设计', label: '🎨 艺术设计' }
            ],
            '海外工作生活': [
                { value: '随机', label: '🔄 随机选择' },
                { value: '招聘广告', label: '📢 招聘广告' },
                { value: '职场制度', label: '📋 职场制度' },
                { value: '政策文件', label: '📄 政策文件' },
                { value: '社区公告', label: '📮 社区公告' },
                { value: '产品说明书', label: '📱 产品说明书' },
                { value: '就诊流程', label: '🏥 就诊流程' },
                { value: '旅行住宿', label: '✈️ 旅行住宿' },
                { value: '租房合同', label: '🏠 租房合同' },
                { value: '银行服务', label: '🏦 银行服务' },
                { value: '交通指南', label: '🚇 交通指南' }
            ]
        };
        
        const options = themeOptions[genre] || themeOptions['外文刊物'];
        
        // 清空现有选项
        themeSelect.innerHTML = '';
        
        // 添加新选项
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            if (option.value === '随机') {
                optionElement.selected = true;
            }
            themeSelect.appendChild(optionElement);
        });
    }
    
    // 生成故事
    async generateStory() {
        const genre = document.getElementById('storyGenre').value;
        let theme = document.getElementById('storyTheme').value;
        const difficulty = document.getElementById('storyDifficulty').value;
        const aiModel = document.getElementById('aiModel').value;

        if (this.selectedKeywords.length < 3) {
            alert('请至少选择3个关键词');
            return;
        }
        
        // 如果选择了"随机"，则从当前题材的主题中随机选一个
        if (theme === '随机') {
            const themeSelect = document.getElementById('storyTheme');
            const options = Array.from(themeSelect.options).filter(opt => opt.value !== '随机');
            if (options.length > 0) {
                theme = options[Math.floor(Math.random() * options.length)].value;
            }
        }

        // 显示加载状态
        const generateBtn = document.getElementById('generateStoryBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="loading-spinner-small"></span>生成中...';

        try {
            // 调用AI API
            const story = await this.callStoryGenerationAPI(genre, theme, this.selectedKeywords, difficulty, aiModel);
            
            this.currentStory = story;

            // 显示故事
            this.displayStory(story);

            // 隐藏表单，显示故事
            document.getElementById('aiStoryForm').classList.add('hidden');
            document.getElementById('aiStoryDisplay').classList.remove('hidden');

        } catch (error) {
            console.error('生成阅读失败:', error);
            alert('生成阅读失败，请检查大模型API key是否配置正确');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
        }
    }
    
    // 使用示例故事（用于调试）
    useDemoStory() {
        // 创建示例故事数据
        const demoStory = {
            title: 'The Mysterious Journey',
            theme: '科技',
            content: `In the year 2150, Dr. Sarah Chen stood before a massive computer terminal in the heart of Silicon Valley. The world had changed dramatically, but her love for technology remained constant.

"This is it," she whispered, her fingers dancing across the holographic keyboard. "The breakthrough we've been waiting for."

The laboratory was filled with the gentle hum of advanced machinery. Sarah had spent years developing an artificial intelligence system that could learn and adapt like the human brain. Tonight, she would finally activate it.

As she pressed the final command, the screens around her burst into life. Lines of code flowed like water, and within seconds, a voice emerged from the speakers.

"Hello, Dr. Chen. I am ARIA - Adaptive Reasoning Intelligence Algorithm. How may I assist you today?"

Sarah's heart raced with excitement. She had done it. She had created something beautiful - a digital mind capable of understanding the world around it.

But little did she know, this was just the beginning of an extraordinary journey that would change humanity forever.`,
            keywords: ['computer', 'love', 'beautiful', 'world', 'learn', 'time'],
            questions: [
                {
                    type: 'choice',
                    question: 'What year does the story take place?',
                    options: ['2050', '2100', '2150', '2200'],
                    answer: 2,
                    explanation: '故事发生在2150年，这在开头第一句就明确说明了。'
                },
                {
                    type: 'choice',
                    question: 'What is ARIA?',
                    options: [
                        'A robot',
                        'An artificial intelligence system',
                        'A spaceship',
                        'A laboratory'
                    ],
                    answer: 1,
                    explanation: 'ARIA是Sarah开发的人工智能系统，全称是Adaptive Reasoning Intelligence Algorithm（自适应推理智能算法）。'
                },
                {
                    type: 'choice',
                    question: 'Where is the laboratory located?',
                    options: ['New York', 'Tokyo', 'Silicon Valley', 'London'],
                    answer: 2,
                    explanation: '实验室位于硅谷的中心，这是世界著名的科技中心。'
                },
                {
                    type: 'choice',
                    question: 'How does Dr. Chen feel when ARIA speaks?',
                    options: ['Sad', 'Angry', 'Excited', 'Confused'],
                    answer: 2,
                    explanation: '当ARIA说话时，Sarah的心跳加速，充满激动（excitement），因为她终于成功创造了这个AI系统。'
                },
                {
                    type: 'choice',
                    question: 'What does the story suggest about the future?',
                    options: [
                        'Technology will disappear',
                        'AI will change humanity',
                        'The world will end',
                        'Nothing will change'
                    ],
                    answer: 1,
                    explanation: '故事结尾暗示这只是一段非凡旅程的开始，将永远改变人类，说明AI将对人类产生重大影响。'
                },
                {
                    type: 'fill',
                    question: 'Dr. Chen created ARIA, an AI system that can ____ and adapt like the human brain.',
                    answer: 'learn',
                    explanation: '文中提到Sarah开发了一个可以像人类大脑一样学习和适应的人工智能系统。'
                }
            ]
        };
        
        this.currentStory = demoStory;
        
        // 显示故事
        this.displayStory(demoStory);
        
        // 隐藏表单，显示故事
        document.getElementById('aiStoryForm').classList.add('hidden');
        document.getElementById('aiStoryDisplay').classList.remove('hidden');
        
        console.log('✨ 已加载示例故事，可用于调试样式和功能');
    }

    // 调用故事生成API
    async callStoryGenerationAPI(genre, theme, keywords, difficulty, aiModel = 'Qwen/Qwen3-30B-A3B') {
        const keywordsStr = keywords.join(', ');
        
        // 根据题材定义角色和风格
        const genreRoles = {
            '外文刊物': '你是一个英语刊物主编，擅长根据给出的若干单词，生成吸引人的各种题材的英语外刊',
            '生动故事': '你是一个创意故事作家，擅长根据给出的若干单词，创作引人入胜的英语故事',
            '文献报告': '你是一个学术研究员，擅长根据给出的若干单词，撰写严谨的英语学术文献和研究报告',
            '海外工作生活': '你是一个海外生活顾问，擅长根据给出的若干单词，编写实用的海外工作生活相关的英语文档'
        };
        
        const genreContentType = {
            '外文刊物': '外刊',
            '生动故事': '故事',
            '文献报告': '学术文献',
            '海外工作生活': '实用文档'
        };
        
        const roleDesc = genreRoles[genre] || genreRoles['外文刊物'];
        const contentType = genreContentType[genre] || '外刊';
        
        const systemPrompt = `${roleDesc}。请严格按照以下JSON格式返回：

{
    "title": "${contentType}标题（英文）",
    "story": "${contentType}正文（英文）",
    "questions": [
        {
            "type": "choice",
            "question": "问题（英文）",
            "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
            "answer": 0,
            "explanation": "解析（中文）"
        },
        {
            "type": "fill",
            "question": "问题句子，用____表示填空位置（英文）",
            "answer": "正确答案（ONLY ONE WORD）",
            "explanation": "解析（中文）"
        }
    ]
}

重要说明：
- type为"choice"的是选择题，必须有options数组（格式："A. 内容"）和answer（数字索引0-3）
- type为"fill"的是填空题，只需要answer字段（字符串），不要options数组
- 填空题的question中必须用____（4个下划线）标记填空位置

要求：
1. ${contentType}必须自然地使用所有关键词
2. 难度等级为 ${difficulty}
3. 生成3-5个阅读理解题，其中至少1个填空题、1个选择题
4. 题目要有一定难度，可以包含英语阅读题常用的同义替换、熟词生义等陷阱
5. 填空题的答案应该是从文章提取的单个单词
6. 确保JSON格式正确，可被解析`;

        const userPrompt = `请根据以下信息生成一个英文${contentType}：

题材：${genre}
主题：${theme}
关键词：${keywordsStr}
难度等级：${difficulty}
词数：500-800单词

请生成一个完整的${contentType}内容，并附带4-5个阅读理解题目。`;

        const requestData = {
            model: aiModel,
            stream: false,
            max_tokens: 4096,
            temperature: 0.9,
            top_p: 0.8,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ]
        };

        // 检查用户是否配置了API密钥
        const apiKey = this.settings.aiApiKey || '';
        if (!apiKey) {
            throw new Error('请先在设置中配置AI API密钥！\n\n获取免费密钥：\n1. 访问 https://cloud.siliconflow.cn/i/WtZO3i7N\n2. 注册账号（使用邀请码 WtZO3i7N 可获赠2000万token）\n3. 在API密钥管理中创建密钥\n4. 将密钥复制到本应用的设置中');
        }

        console.log('🤖 调用AI API生成阅读...');
        console.log('请求参数:', requestData);

        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        console.log('🤖 AI返回内容:', content);

        // 提取JSON
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('无法从响应中提取JSON数据');
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const storyData = JSON.parse(jsonStr);

        // 清理题目数据，确保填空题格式正确
        const cleanedQuestions = (storyData.questions || []).map(q => {
            if (q.type === 'fill') {
                // 填空题：移除options数组，确保answer是字符串
                const cleanedQ = {
                    type: 'fill',
                    question: q.question,
                    explanation: q.explanation
                };
                
                // 如果answer是数字（错误格式），尝试从options中提取正确答案
                if (typeof q.answer === 'number' && q.options && q.options[q.answer]) {
                    // 提取选项文本，移除"A. "、"B. "等前缀
                    let answerText = q.options[q.answer].trim();
                    const prefixMatch = answerText.match(/^[A-D][\.\)]\s*/);
                    if (prefixMatch) {
                        answerText = answerText.substring(prefixMatch[0].length);
                    }
                    cleanedQ.answer = answerText;
                } else {
                    // answer已经是字符串，直接使用
                    cleanedQ.answer = String(q.answer || '');
                }
                
                return cleanedQ;
            } else {
                // 选择题：保持原样
                return q;
            }
        });

        return {
            title: storyData.title || 'Untitled Story',
            content: storyData.story || storyData.content || '',
            questions: cleanedQuestions,
            theme: theme,
            keywords: keywords,
            difficulty: difficulty
        };
    }

    // 清洗文本中的Markdown标记
    cleanMarkdown(text) {
        if (!text) return '';
        // 移除 ** 加粗标记
        return text.replace(/\*\*/g, '');
    }

    // 显示故事
    displayStory(story) {
        // 清洗标题和内容中的Markdown标记
        const cleanTitle = this.cleanMarkdown(story.title);
        const cleanContent = this.cleanMarkdown(story.content);
        
        document.getElementById('storyTitle').textContent = cleanTitle;
        document.getElementById('storyThemeMeta').textContent = story.theme;
        
        // 计算字数
        const wordCount = cleanContent.split(/\s+/).length;
        document.getElementById('storyWordCount').textContent = wordCount;

        // 高亮关键词
        let highlightedContent = cleanContent;
        story.keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
            highlightedContent = highlightedContent.replace(regex, '<mark class="keyword-highlight">$1</mark>');
        });

        // 分段显示
        const paragraphs = highlightedContent.split('\n\n');
        const contentHtml = paragraphs
            .filter(p => p.trim())
            .map(p => `<p class="story-paragraph">${p.trim()}</p>`)
            .join('');

        document.getElementById('storyContent').innerHTML = contentHtml;
        
        // 显示单词列表
        this.renderVocabularyList(story.keywords);
        
        // 初始化文本选择功能
        this.initTextSelection();
        
        // 初始化关键词点击功能
        this.initKeywordHighlightClick();
    }
    
    // 渲染单词列表
    renderVocabularyList(keywords) {
        const vocabularyList = document.getElementById('vocabularyList');
        const vocabularyCount = document.getElementById('vocabularyCount');
        
        // 更新单词数量
        vocabularyCount.textContent = `${keywords.length} 个单词`;
        
        // 获取所有词书的单词数据
        let allWords = [];
        this.books.forEach(book => {
            if (book.words) {
                allWords = allWords.concat(book.words);
            }
        });
        
        // 创建单词卡片
        const vocabularyHtml = keywords.map((keyword, index) => {
            // 在所有词书中查找单词信息
            let wordData = allWords.find(w => w.word.toLowerCase() === keyword.toLowerCase());
            
            // 如果没找到，尝试从 DictionaryAPI 获取
            if (!wordData && typeof DictionaryAPI !== 'undefined') {
                const fallbackData = DictionaryAPI.fallbackData[keyword.toLowerCase()];
                if (fallbackData) {
                    const firstDef = fallbackData.definitions[0];
                    wordData = {
                        word: keyword,
                        phonetic: fallbackData.phonetic,
                        definitions: [firstDef]
                    };
                }
            }
            
            // 从definitions中获取释义（与学习模式一致）
            let phonetic = '';
            let meaning = '';
            let pos = '';
            
            if (wordData) {
                phonetic = wordData.phonetic || '';
                const def = wordData.definitions && wordData.definitions[0] ? wordData.definitions[0] : {};
                meaning = def.meaning || '';
                pos = def.pos || '';
            }
            
            return `
                <div class="vocabulary-item" data-word="${keyword}" data-index="${index}">
                    <div class="vocabulary-left">
                        <span class="vocabulary-word">${keyword}</span>
                        <button class="vocabulary-sound-btn" title="发音">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                            </svg>
                        </button>
                    </div>
                    <button class="vocabulary-toggle-btn" title="显示/隐藏释义">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <div class="vocabulary-meaning hidden">
                        ${pos ? `<span class="vocabulary-pos">${pos}</span>` : ''}
                        <span class="vocabulary-meaning-text">${meaning || '暂无释义'}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        vocabularyList.innerHTML = vocabularyHtml;
        
        // 添加点击事件
        vocabularyList.querySelectorAll('.vocabulary-item').forEach(item => {
            const soundBtn = item.querySelector('.vocabulary-sound-btn');
            const toggleBtn = item.querySelector('.vocabulary-toggle-btn');
            const meaningDiv = item.querySelector('.vocabulary-meaning');
            
            // 发音按钮（阻止冒泡，避免触发item的点击事件）
            if (soundBtn) {
                soundBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const word = item.dataset.word;
                    this.speak(word);
                });
            }
            
            // 点击整个item切换释义显示/隐藏
            if (meaningDiv) {
                item.addEventListener('click', (e) => {
                    meaningDiv.classList.toggle('hidden');
                    // 切换眼睛图标状态
                    if (toggleBtn) {
                        if (meaningDiv.classList.contains('hidden')) {
                            toggleBtn.classList.remove('active');
                        } else {
                            toggleBtn.classList.add('active');
                        }
                    }
                });
            }
        });
    }
    
    // 初始化关键词高亮点击功能
    initKeywordHighlightClick() {
        const storyContent = document.getElementById('storyContent');
        if (!storyContent) return;
        
        // 获取所有的 keyword-highlight 元素
        const keywordElements = storyContent.querySelectorAll('.keyword-highlight');
        
        keywordElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const word = element.textContent.trim();
                this.showKeywordToolbar(element, word);
            });
        });
        
        // 点击其他地方隐藏toolbar
        document.addEventListener('click', (e) => {
            const toolbar = document.getElementById('keywordHighlightToolbar');
            if (toolbar && !toolbar.contains(e.target) && !e.target.classList.contains('keyword-highlight')) {
                toolbar.classList.add('hidden');
            }
        });
    }
    
    // 显示关键词工具栏
    showKeywordToolbar(element, word) {
        const toolbar = document.getElementById('keywordHighlightToolbar');
        if (!toolbar) return;
        
        // 获取单词信息
        const wordInfo = this.getWordInfo(word);
        
        // 更新toolbar内容
        document.getElementById('keywordToolbarWord').textContent = word;
        document.getElementById('keywordToolbarPhonetic').textContent = wordInfo.phonetic || '';
        document.getElementById('keywordToolbarMeaning').textContent = wordInfo.meaning || '暂无释义';
        
        // 设置toolbar位置（在元素右上角附近）
        const rect = element.getBoundingClientRect();
        const toolbarWidth = 300; // 预估toolbar宽度
        const toolbarHeight = 100; // 预估toolbar高度
        
        // 计算位置：优先在元素右上方，如果空间不够则调整
        let left = rect.right + 10;
        let top = rect.top - toolbarHeight / 2;
        
        // 边界检查
        if (left + toolbarWidth > window.innerWidth) {
            // 如果右边空间不够，显示在左边
            left = rect.left - toolbarWidth - 10;
        }
        
        if (left < 0) {
            // 如果左边也不够，显示在元素上方居中
            left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
            top = rect.top - toolbarHeight - 10;
        }
        
        if (top < 0) {
            // 如果上方空间不够，显示在下方
            top = rect.bottom + 10;
        }
        
        toolbar.style.left = `${left}px`;
        toolbar.style.top = `${top}px`;
        
        // 显示toolbar
        toolbar.classList.remove('hidden');
        
        // 播放发音（随机美式/英式）
        const accents = ['en-US', 'en-GB'];
        const randomAccent = accents[Math.floor(Math.random() * accents.length)];
        this.speakWithAccent(word, randomAccent);
        
        // 绑定发音按钮点击事件
        const soundBtn = document.getElementById('keywordToolbarSoundBtn');
        const newSoundBtn = soundBtn.cloneNode(true); // 克隆节点以移除旧的事件监听器
        soundBtn.parentNode.replaceChild(newSoundBtn, soundBtn);
        
        newSoundBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 再次随机播放发音
            const randomAccent = accents[Math.floor(Math.random() * accents.length)];
            this.speakWithAccent(word, randomAccent);
        });
    }
    
    // 获取单词信息（音标和释义）
    getWordInfo(word) {
        // 获取所有词书的单词数据
        let allWords = [];
        this.books.forEach(book => {
            if (book.words) {
                allWords = allWords.concat(book.words);
            }
        });
        
        // 在所有词书中查找单词信息
        let wordData = allWords.find(w => w.word.toLowerCase() === word.toLowerCase());
        
        // 如果没找到，尝试从 DictionaryAPI 获取
        if (!wordData && typeof DictionaryAPI !== 'undefined') {
            const fallbackData = DictionaryAPI.fallbackData[word.toLowerCase()];
            if (fallbackData) {
                const firstDef = fallbackData.definitions[0];
                wordData = {
                    word: word,
                    phonetic: fallbackData.phonetic,
                    definitions: [firstDef]
                };
            }
        }
        
        // 从definitions中获取释义
        let phonetic = '';
        let meaning = '';
        let pos = '';
        
        if (wordData) {
            phonetic = wordData.phonetic || '';
            const def = wordData.definitions && wordData.definitions[0] ? wordData.definitions[0] : {};
            meaning = def.meaning || '';
            pos = def.pos || '';
            
            // 组合词性和释义
            if (pos && meaning) {
                meaning = `${pos} ${meaning}`;
            }
        }
        
        return {
            phonetic: phonetic,
            meaning: meaning
        };
    }
    
    // 使用指定口音播放发音
    speakWithAccent(word, accent) {
        if (!word) return;
        
        try {
            // 清除之前的定时器
            if (this.speakTimeout) {
                clearTimeout(this.speakTimeout);
                this.speakTimeout = null;
            }
            
            // 取消正在播放的语音
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            
            // 延迟播放，避免快速切换导致的中断
            this.speakTimeout = setTimeout(() => {
                try {
                    if (speechSynthesis.speaking) {
                        speechSynthesis.cancel();
                    }
                    
                    const utterance = new SpeechSynthesisUtterance(word);
                    utterance.lang = accent;
                    utterance.rate = this.settings.voiceRate || 1.0;
                    utterance.pitch = 1.0;
                    utterance.volume = 1.0;
                    
                    // 如果用户选择了特定声优
                    if (this.settings.voiceModel) {
                        const voices = speechSynthesis.getVoices();
                        const selectedVoice = voices.find(v => v.name === this.settings.voiceModel);
                        if (selectedVoice) {
                            utterance.voice = selectedVoice;
                        }
                    }
                    
                    speechSynthesis.speak(utterance);
                    
                    console.log(`🔊 播放发音: ${word} (${accent})`);
                } catch (innerError) {
                    console.error('发音失败:', innerError);
                }
            }, 50);
        } catch (error) {
            console.error('发音失败:', error);
        }
    }
    
    // AI翻译方法
    async translateText(text) {
        // 检查用户是否配置了API密钥
        const apiKey = this.settings.aiApiKey || '';
        if (!apiKey) {
            throw new Error('请先在设置中配置AI API密钥');
        }
        
        console.log('🌐 开始翻译:', text);
        
        // 使用轻量级模型进行快速翻译
        const requestData = {
            model: 'Qwen/Qwen2.5-7B-Instruct',  // 使用快速的小模型
            messages: [
                {
                    role: 'system',
                    content: '你是一个专业的英译中翻译助手。请将用户提供的英文文本翻译成简洁准确的中文，只返回翻译结果，不要添加任何解释或额外内容。'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        };
        
        try {
            const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            const translation = data.choices[0].message.content.trim();
            
            console.log('✅ 翻译完成:', translation);
            return translation;
        } catch (error) {
            console.error('❌ 翻译失败:', error);
            throw error;
        }
    }
    
    // 初始化文本选择功能
    initTextSelection(containerIds = ['storyContent', 'questionsList', 'resultsDetails']) {
        const toolbar = document.getElementById('textSelectionToolbar');
        const translateBtn = document.getElementById('translateBtn');
        const highlightBtn = document.getElementById('highlightBtn');
        
        if (!toolbar) return;
        
        let selectedText = '';
        let selectedRange = null;
        
        // 为每个容器添加文本选择功能
        containerIds.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            // 移除旧的事件监听器（如果存在）
            const oldMouseUpHandler = container._textSelectionMouseUpHandler;
            if (oldMouseUpHandler) {
                container.removeEventListener('mouseup', oldMouseUpHandler);
            }
            
            // 监听文本选择
            const mouseUpHandler = (e) => {
                setTimeout(() => {
                    const selection = window.getSelection();
                    selectedText = selection.toString().trim();
                    
                    if (selectedText.length > 0) {
                        selectedRange = selection.getRangeAt(0);
                        
                        // 显示工具栏
                        this.showSelectionToolbar(e.pageX, e.pageY);
                    } else {
                        toolbar.classList.add('hidden');
                    }
                }, 10);
            };
            container.addEventListener('mouseup', mouseUpHandler);
            container._textSelectionMouseUpHandler = mouseUpHandler;
        });
        
        // 移除旧的按钮事件监听器
        const oldTranslateHandler = translateBtn._translateClickHandler;
        if (oldTranslateHandler) {
            translateBtn.removeEventListener('click', oldTranslateHandler);
        }
        
        const oldHighlightHandler = highlightBtn._highlightClickHandler;
        if (oldHighlightHandler) {
            highlightBtn.removeEventListener('click', oldHighlightHandler);
        }
        
        const oldDocClickHandler = document._textSelectionDocClickHandler;
        if (oldDocClickHandler) {
            document.removeEventListener('click', oldDocClickHandler);
        }
        
        // 翻译功能
        const translateHandler = async () => {
            if (selectedText) {
                // 显示翻译结果区域
                const translationResult = document.getElementById('toolbarTranslationResult');
                const translationOriginal = document.getElementById('translationOriginal');
                const translationText = document.getElementById('translationText');
                const toolbarButtons = document.getElementById('toolbarButtons');
                
                // 隐藏按钮，显示翻译区域
                toolbarButtons.classList.add('hidden');
                translationResult.classList.remove('hidden');
                
                // 设置原文
                translationOriginal.textContent = selectedText;
                
                // 显示加载状态
                translationText.innerHTML = '<span class="translation-loading">翻译中...</span>';
                
                try {
                    // 调用AI翻译
                    const translation = await this.translateText(selectedText);
                    translationText.textContent = translation;
                } catch (error) {
                    console.error('翻译失败:', error);
                    translationText.innerHTML = `<span class="translation-error">翻译失败: ${error.message}</span>`;
                }
            }
        };
        translateBtn.addEventListener('click', translateHandler);
        translateBtn._translateClickHandler = translateHandler;
        
        // 翻译结果关闭按钮
        const translationCloseBtn = document.getElementById('translationCloseBtn');
        const oldTranslationCloseHandler = translationCloseBtn._translationCloseClickHandler;
        if (oldTranslationCloseHandler) {
            translationCloseBtn.removeEventListener('click', oldTranslationCloseHandler);
        }
        
        const translationCloseHandler = () => {
            const translationResult = document.getElementById('toolbarTranslationResult');
            const toolbarButtons = document.getElementById('toolbarButtons');
            
            // 隐藏翻译区域，显示按钮
            translationResult.classList.add('hidden');
            toolbarButtons.classList.remove('hidden');
        };
        translationCloseBtn.addEventListener('click', translationCloseHandler);
        translationCloseBtn._translationCloseClickHandler = translationCloseHandler;
        
        // 高亮功能
        const highlightHandler = () => {
            if (selectedRange) {
                this.highlightSelection(selectedRange);
                toolbar.classList.add('hidden');
                window.getSelection().removeAllRanges();
            }
        };
        highlightBtn.addEventListener('click', highlightHandler);
        highlightBtn._highlightClickHandler = highlightHandler;
        
        // 点击其他地方隐藏工具栏
        const docClickHandler = (e) => {
            if (!toolbar.contains(e.target)) {
                // 检查是否点击在任何容器内
                const clickedInContainer = containerIds.some(id => {
                    const container = document.getElementById(id);
                    return container && container.contains(e.target);
                });
                
                if (!clickedInContainer) {
                    toolbar.classList.add('hidden');
                    // 重置翻译区域
                    const translationResult = document.getElementById('toolbarTranslationResult');
                    const toolbarButtons = document.getElementById('toolbarButtons');
                    if (translationResult && !translationResult.classList.contains('hidden')) {
                        translationResult.classList.add('hidden');
                        toolbarButtons.classList.remove('hidden');
                    }
                }
            }
        };
        document.addEventListener('click', docClickHandler);
        document._textSelectionDocClickHandler = docClickHandler;
    }
    
    // 显示选择工具栏
    showSelectionToolbar(x, y) {
        const toolbar = document.getElementById('textSelectionToolbar');
        
        // 重置翻译区域状态（隐藏翻译结果，显示按钮）
        const translationResult = document.getElementById('toolbarTranslationResult');
        const toolbarButtons = document.getElementById('toolbarButtons');
        if (translationResult && toolbarButtons) {
            translationResult.classList.add('hidden');
            toolbarButtons.classList.remove('hidden');
        }
        
        // 显示工具栏
        toolbar.classList.remove('hidden');
        
        // 设置位置（在鼠标旁边）
        const toolbarRect = toolbar.getBoundingClientRect();
        const offsetX = 10;
        const offsetY = -toolbarRect.height - 10;
        
        let left = x + offsetX;
        let top = y + offsetY;
        
        // 确保工具栏不会超出视口
        if (left + toolbarRect.width > window.innerWidth) {
            left = window.innerWidth - toolbarRect.width - 10;
        }
        if (top < 0) {
            top = y + 10;
        }
        
        toolbar.style.left = left + 'px';
        toolbar.style.top = top + 'px';
    }
    
    // 高亮选中的文本
    highlightSelection(range) {
        try {
            const span = document.createElement('span');
            span.className = 'text-highlight';
            span.appendChild(range.extractContents());
            range.insertNode(span);
            
            // 添加点击移除高亮功能
            span.addEventListener('click', (e) => {
                if (e.target === span || span.contains(e.target)) {
                    // 判断是否点击了删除按钮区域
                    const rect = span.getBoundingClientRect();
                    const clickX = e.clientX;
                    const rightEdge = rect.right;
                    
                    // 如果点击靠近右边缘（删除按钮区域）
                    if (clickX > rightEdge - 20) {
                        // 移除高亮，恢复普通文本
                        const parent = span.parentNode;
                        while (span.firstChild) {
                            parent.insertBefore(span.firstChild, span);
                        }
                        parent.removeChild(span);
                        e.stopPropagation();
                    }
                }
            });
        } catch (error) {
            console.error('高亮失败:', error);
        }
    }

    // 显示题目
    showQuestions() {
        if (!this.currentStory || !this.currentStory.questions || this.currentStory.questions.length === 0) {
            alert('暂无题目');
            return;
        }

        // 渲染题目
        this.renderQuestions();

        // 检查是否在双页展示模式
        const isDualView = document.body.classList.contains('dual-view-mode');
        
        if (!isDualView) {
            // 普通模式：隐藏故事，显示题目
            document.getElementById('aiStoryDisplay').classList.add('hidden');
            document.getElementById('aiQuestionsDisplay').classList.remove('hidden');
        } else {
            // 双页模式：两者都显示
            document.getElementById('aiStoryDisplay').classList.remove('hidden');
            document.getElementById('aiQuestionsDisplay').classList.remove('hidden');
        }
    }
    
    // 切换双页展示模式
    toggleDualView() {
        const isDualView = document.body.classList.contains('dual-view-mode');
        const toggleBtn = document.getElementById('toggleDualViewBtn');
        
        // 检测设备宽度，移动端禁用
        if (window.innerWidth < 1024) {
            alert('双页展示功能需要更大的屏幕空间，请在PC端使用');
            return;
        }
        
        if (!isDualView) {
            // 检查是否有题目
            if (!this.currentStory || !this.currentStory.questions || this.currentStory.questions.length === 0) {
                alert('请先生成题目后再使用双页展示');
                return;
            }
            
            // 开启双页展示
            document.body.classList.add('dual-view-mode');
            toggleBtn.classList.add('active');
            toggleBtn.querySelector('span').textContent = '退出双页';
            
            // 渲染题目（如果还没渲染）
            this.renderQuestions();
            
            // 确保两个区域都显示
            document.getElementById('aiStoryDisplay').classList.remove('hidden');
            document.getElementById('aiQuestionsDisplay').classList.remove('hidden');
            
            // 隐藏表单区域
            document.getElementById('aiStoryForm').classList.add('hidden');
            document.getElementById('aiResultsDisplay').classList.add('hidden');
            
        } else {
            // 退出双页展示
            document.body.classList.remove('dual-view-mode');
            toggleBtn.classList.remove('active');
            toggleBtn.querySelector('span').textContent = '双页展示';
            
            // 恢复到普通模式，只显示故事
            document.getElementById('aiStoryDisplay').classList.remove('hidden');
            document.getElementById('aiQuestionsDisplay').classList.add('hidden');
        }
    }

    // 渲染题目
    renderQuestions() {
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = '';

        this.currentStory.questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            
            const questionHeader = document.createElement('div');
            questionHeader.className = 'question-header';
            questionHeader.innerHTML = `
                <span class="question-number">Question ${index + 1}</span>
                <span class="question-type">${q.type === 'choice' ? '选择题' : '填空题'}</span>
            `;
            questionDiv.appendChild(questionHeader);

            if (q.type === 'choice') {
                const questionText = document.createElement('div');
                questionText.className = 'question-text';
                // 清洗问题文本中的Markdown标记
                questionText.textContent = this.cleanMarkdown(q.question);
                questionDiv.appendChild(questionText);
                
                // 选择题
                const optionsDiv = document.createElement('div');
                optionsDiv.className = 'question-options';
                
                q.options.forEach((option, optIndex) => {
                    const optionLabel = document.createElement('label');
                    optionLabel.className = 'question-option';
                    
                    // 移除选项文本开头的字母标签（如"A. "、"B. "等），并清洗Markdown标记
                    let cleanOption = this.cleanMarkdown(option.trim());
                    const prefixMatch = cleanOption.match(/^[A-D][\.\)]\s*/);
                    if (prefixMatch) {
                        cleanOption = cleanOption.substring(prefixMatch[0].length);
                    }
                    
                    optionLabel.innerHTML = `
                        <input type="radio" name="question${index}" value="${optIndex}">
                        <span class="option-label">${String.fromCharCode(65 + optIndex)}.</span>
                        <span class="option-text">${cleanOption}</span>
                    `;
                    
                    // 恢复之前选择的答案
                    if (this.userAnswers[index] !== undefined && this.userAnswers[index] === optIndex) {
                        optionLabel.querySelector('input').checked = true;
                    }
                    
                    optionsDiv.appendChild(optionLabel);
                });
                
                questionDiv.appendChild(optionsDiv);
            } else {
                // 填空题 - 将输入框嵌入到题目文本中
                const questionText = document.createElement('div');
                questionText.className = 'question-text question-text-fillblank';
                
                // 清洗问题文本
                let cleanQuestion = this.cleanMarkdown(q.question);
                const savedAnswer = this.userAnswers[index] || '';
                
                // 查找下划线标记（支持多种格式：______、____、___、__）
                const blankPattern = /_{2,}|\[blank\]|\[___\]/gi;
                
                if (blankPattern.test(cleanQuestion)) {
                    // 如果有下划线标记，替换为输入框
                    cleanQuestion = cleanQuestion.replace(blankPattern, `<input type="text" class="fill-blank-input-inline" id="answer${index}" placeholder="填写答案" value="${savedAnswer}" data-question-index="${index}">`);
                    questionText.innerHTML = cleanQuestion;
                } else {
                    // 如果没有下划线标记，在末尾添加输入框
                    questionText.innerHTML = `${cleanQuestion} <input type="text" class="fill-blank-input-inline" id="answer${index}" placeholder="填写答案" value="${savedAnswer}" data-question-index="${index}">`;
                }
                
                questionDiv.appendChild(questionText);
            }

            questionsList.appendChild(questionDiv);
        });
        
        // 初始化文本选择功能（包括题目区域）
        setTimeout(() => {
            this.initTextSelection(['storyContent', 'questionsList', 'resultsDetails']);
        }, 100);
    }

    // 返回故事（保存当前答案）
    backToStory() {
        // 保存当前答案
        this.saveCurrentAnswers();
        
        const isDualView = document.body.classList.contains('dual-view-mode');
        
        if (!isDualView) {
            // 普通模式：隐藏题目，显示故事
            document.getElementById('aiQuestionsDisplay').classList.add('hidden');
            document.getElementById('aiStoryDisplay').classList.remove('hidden');
        }
        // 双页模式：不做操作，保持两者都显示
    }
    
    // 保存当前答案
    saveCurrentAnswers() {
        this.currentStory.questions.forEach((q, index) => {
            if (q.type === 'choice') {
                const selected = document.querySelector(`input[name="question${index}"]:checked`);
                if (selected) {
                    this.userAnswers[index] = parseInt(selected.value);
                }
            } else {
                const input = document.getElementById(`answer${index}`);
                if (input && input.value.trim()) {
                    this.userAnswers[index] = input.value.trim();
                }
            }
        });
    }

    // 提交答案
    submitAnswers() {
        // 先保存当前答案
        this.saveCurrentAnswers();
        
        let allAnswered = true;

        // 检查是否所有题目都已作答
        this.currentStory.questions.forEach((q, index) => {
            if (this.userAnswers[index] === undefined) {
                allAnswered = false;
            }
        });

        if (!allAnswered) {
            alert('请完成所有题目');
            return;
        }

        // 显示结果
        this.showResults();
    }

    // 显示结果
    showResults() {
        let correct = 0;
        const total = this.currentStory.questions.length;

        // 计算得分
        this.currentStory.questions.forEach((q, index) => {
            const userAnswer = this.userAnswers[index];
            
            if (q.type === 'choice') {
                if (userAnswer === q.answer) {
                    correct++;
                }
            } else {
                // 填空题判断（不区分大小写）
                const correctAnswer = String(q.answer).toLowerCase().trim();
                const userAnswerLower = String(userAnswer).toLowerCase().trim();
                if (userAnswerLower === correctAnswer) {
                    correct++;
                }
            }
        });

        const score = correct;
        const percentage = Math.round((correct / total) * 100);

        // 更新结果显示
        document.getElementById('resultsScore').textContent = score;
        document.getElementById('resultsTotal').textContent = total;

        if (percentage >= 80) {
            document.getElementById('resultsIcon').textContent = '🎉';
            document.getElementById('resultsTitle').textContent = '太棒了！';
        } else if (percentage >= 60) {
            document.getElementById('resultsIcon').textContent = '👍';
            document.getElementById('resultsTitle').textContent = '不错！';
        } else {
            document.getElementById('resultsIcon').textContent = '💪';
            document.getElementById('resultsTitle').textContent = '继续加油！';
        }

        // 显示详细结果
        const resultsDetails = document.getElementById('resultsDetails');
        resultsDetails.innerHTML = '';

        this.currentStory.questions.forEach((q, index) => {
            const userAnswer = this.userAnswers[index];
            let isCorrect = false;
            let userAnswerDisplay = '';
            let correctAnswerDisplay = '';

            if (q.type === 'choice') {
                isCorrect = userAnswer === q.answer;
                
                // 清理选项文本（移除前缀和Markdown标记）
                const cleanOption = (opt) => {
                    let clean = this.cleanMarkdown(opt.trim());
                    const match = clean.match(/^[A-D][\.\)]\s*/);
                    if (match) clean = clean.substring(match[0].length);
                    return clean;
                };
                
                userAnswerDisplay = cleanOption(q.options[userAnswer]);
                correctAnswerDisplay = cleanOption(q.options[q.answer]);
            } else {
                const correctAnswer = String(q.answer).toLowerCase().trim();
                const userAnswerLower = String(userAnswer).toLowerCase().trim();
                isCorrect = userAnswerLower === correctAnswer;
                
                userAnswerDisplay = userAnswer;
                correctAnswerDisplay = q.answer;
            }

            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${isCorrect ? 'correct' : 'wrong'}`;
            resultItem.innerHTML = `
                <div class="result-header">
                    <span class="result-icon">${isCorrect ? '✓' : '✗'}</span>
                    <span class="result-title">Question ${index + 1}</span>
                </div>
                <div class="result-question">${this.escapeHtml(this.cleanMarkdown(q.question))}</div>
                <div class="result-answer">
                    <strong>你的答案：</strong>${this.escapeHtml(userAnswerDisplay)}
                    ${!isCorrect ? `<br><strong style="color: var(--success);">正确答案：</strong>${this.escapeHtml(correctAnswerDisplay)}` : ''}
                </div>
                ${q.explanation ? `<div class="result-explanation"><strong>💡 解析：</strong>${this.escapeHtml(this.cleanMarkdown(q.explanation))}</div>` : ''}
            `;
            resultsDetails.appendChild(resultItem);
        });

        // 初始化文本选择功能（包括结果区域）
        setTimeout(() => {
            this.initTextSelection(['storyContent', 'questionsList', 'resultsDetails']);
        }, 100);

        // 检查是否在双页模式
        const isDualView = document.body.classList.contains('dual-view-mode');
        
        if (isDualView) {
            // 双页模式：题目区域变为结果区域
            document.getElementById('aiQuestionsDisplay').classList.add('hidden');
            document.getElementById('aiResultsDisplay').classList.remove('hidden');
            // 保持故事区域显示
            document.getElementById('aiStoryDisplay').classList.remove('hidden');
        } else {
            // 普通模式：隐藏题目和故事，只显示结果
            document.getElementById('aiQuestionsDisplay').classList.add('hidden');
            document.getElementById('aiStoryDisplay').classList.add('hidden');
            document.getElementById('aiResultsDisplay').classList.remove('hidden');
            
            // 滚动到顶部
            document.querySelector('.main-content').scrollTop = 0;
        }
    }

    // 查看解析（返回题目页面并标注）
    reviewQuestions() {
        const isDualView = document.body.classList.contains('dual-view-mode');
        
        document.getElementById('aiResultsDisplay').classList.add('hidden');
        document.getElementById('aiQuestionsDisplay').classList.remove('hidden');
        
        if (isDualView) {
            // 双页模式：保持故事区域显示
            document.getElementById('aiStoryDisplay').classList.remove('hidden');
        }

        // 标注正确/错误答案
        setTimeout(() => {
            this.currentStory.questions.forEach((q, index) => {
                const userAnswer = this.userAnswers[index];
                
                if (q.type === 'choice') {
                    const options = document.querySelectorAll(`input[name="question${index}"]`);
                    options.forEach((option, optIndex) => {
                        const label = option.closest('.question-option');
                        // 禁用选项
                        option.disabled = true;
                        
                        if (optIndex === q.answer) {
                            label.classList.add('correct-answer');
                        }
                        if (optIndex === userAnswer && userAnswer !== q.answer) {
                            label.classList.add('wrong-answer');
                        }
                    });
                } else {
                    // 填空题也禁用输入
                    const input = document.getElementById(`answer${index}`);
                    if (input) {
                        input.disabled = true;
                        const correctAnswer = String(q.answer).toLowerCase().trim();
                        const userAnswerLower = String(userAnswer).toLowerCase().trim();
                        if (userAnswerLower !== correctAnswer) {
                            input.classList.add('incorrect');
                        } else {
                            input.classList.add('correct');
                        }
                    }
                }
            });
            
            // 重新初始化文本选择功能
            this.initTextSelection(['storyContent', 'questionsList', 'resultsDetails']);
        }, 100);
        
        // 滚动到顶部
        document.querySelector('.main-content').scrollTop = 0;
    }

    // 生成新故事
    newStory() {
        // 退出双页模式（如果正在使用）
        if (document.body.classList.contains('dual-view-mode')) {
            this.toggleDualView();
        }

        // 重置状态
        this.currentStory = null;
        this.currentQuestions = [];
        this.userAnswers = {};

        // 重置表单显示状态
        document.getElementById('aiResultsDisplay').classList.add('hidden');
        document.getElementById('aiQuestionsDisplay').classList.add('hidden');
        document.getElementById('aiStoryDisplay').classList.add('hidden');
        document.getElementById('aiStoryForm').classList.remove('hidden');

        // 滚动到顶部
        document.querySelector('.main-content').scrollTop = 0;
    }

    // 结束考试（退出所有考试，返回AI工坊首页）
    exitExam() {
        const confirmed = confirm('确定要结束考试吗？当前进度将不会保存。');
        
        if (!confirmed) return;

        // 退出双页模式（如果正在使用）
        if (document.body.classList.contains('dual-view-mode')) {
            this.toggleDualView();
        }

        // 重置所有状态
        this.currentStory = null;
        this.currentQuestions = [];
        this.userAnswers = {};

        // 隐藏所有子页面，显示表单
        document.getElementById('aiResultsDisplay').classList.add('hidden');
        document.getElementById('aiQuestionsDisplay').classList.add('hidden');
        document.getElementById('aiStoryDisplay').classList.add('hidden');
        document.getElementById('aiStoryForm').classList.remove('hidden');

        // 滚动到顶部
        document.querySelector('.main-content').scrollTop = 0;

        console.log('✅ 已退出考试，返回AI工坊首页');
    }

    // ============================================
    // 缓存设置相关方法
    // ============================================

    // 加载缓存设置页面
    loadCacheSettings() {
        const stats = Storage.loadStats();
        
        // 显示今日统计数据
        const totalMinutes = stats.time || 0;
        const minutes = Math.floor(totalMinutes);
        const seconds = Math.round((totalMinutes - minutes) * 60);
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        document.getElementById('cacheTodayTime').textContent = timeStr;
        document.getElementById('cacheTodayWords').textContent = stats.words || 0;
        document.getElementById('cacheTodayMastery').textContent = `${stats.mastery || 0}%`;
        
        // 显示历史统计记录
        this.loadStatsHistory();
    }

    // 加载历史统计记录
    loadStatsHistory() {
        const history = Storage.getRecentStats(30); // 最近30天
        const listContainer = document.getElementById('statsHistoryList');
        
        if (history.length === 0) {
            listContainer.innerHTML = '<div class="stats-history-empty">暂无历史记录</div>';
            return;
        }
        
        listContainer.innerHTML = '';
        history.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'stats-history-item';
            
            // 格式化日期
            const date = new Date(item.date);
            const isToday = item.date === new Date().toDateString();
            const dateStr = isToday ? '今天' : this.formatDate(date);
            
            // 格式化时间
            const totalMinutes = item.time || 0;
            const minutes = Math.floor(totalMinutes);
            const timeStr = `${minutes}分钟`;
            
            itemDiv.innerHTML = `
                <div>
                    <div class="stats-history-date">${dateStr}</div>
                    <div class="stats-history-data">
                        <span>⏱️ ${timeStr}</span>
                        <span>📖 ${item.words}词</span>
                        <span>✅ ${item.mastery}%</span>
                    </div>
                </div>
                <div class="stats-history-actions">
                    ${!isToday ? `<button class="btn-history-action" onclick="app.deleteStatsHistoryItem('${item.date}')">删除</button>` : ''}
                </div>
            `;
            
            listContainer.appendChild(itemDiv);
        });
    }

    // 格式化日期（支持字符串和Date对象）
    formatDate(date) {
        // 如果是字符串，转换为Date对象
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        // 如果不是有效的Date对象，返回默认值
        if (!(date instanceof Date) || isNaN(date)) {
            return '未知时间';
        }
        
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '今天';
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}月${day}日`;
        }
    }

    // 导出今日统计数据
    exportTodayStats() {
        const jsonData = Storage.exportStatsAsJSON(false); // 只导出今日数据
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `词忆-今日统计-${today}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('✅ 今日统计数据已导出');
    }

    // 导出所有历史统计数据
    exportAllStats() {
        const jsonData = Storage.exportStatsAsJSON(true); // 包含所有历史
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `词忆-统计数据-${today}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('✅ 所有统计数据已导出');
    }

    // 导入统计数据
    async importStats(file) {
        try {
            const text = await file.text();
            const result = Storage.importStatsFromJSON(text);
            
            if (result.success) {
                alert('✅ 数据导入成功！');
                // 刷新显示
                this.loadCacheSettings();
                this.updateStats();
            } else {
                alert(`❌ 导入失败：${result.message}`);
            }
        } catch (e) {
            console.error('导入统计数据失败:', e);
            alert('❌ 导入失败，请检查文件格式');
        }
    }

    // 删除历史统计记录项
    deleteStatsHistoryItem(date) {
        if (confirm(`确定要删除 ${this.formatDate(new Date(date))} 的统计数据吗？`)) {
            Storage.deleteStatsHistoryItem(date);
            this.loadStatsHistory();
            console.log(`✅ 已删除 ${date} 的统计数据`);
        }
    }

    // 清空历史统计数据
    clearStatsHistory() {
        if (confirm('⚠️ 确定要清空所有历史统计数据吗？\n\n此操作将删除所有历史记录（不包括今日数据），且不可恢复！')) {
            if (confirm('请再次确认：真的要清空所有历史数据吗？')) {
                Storage.clearStatsHistory();
                this.loadStatsHistory();
                alert('✅ 历史统计数据已清空');
                console.log('✅ 历史统计数据已清空');
            }
        }
    }

    // 切换自动保存统计数据
    toggleAutoSaveStats(enabled) {
        this.settings.autoSaveStats = enabled;
        Storage.saveSettings(this.settings);
        console.log(`✅ 自动保存统计数据已${enabled ? '开启' : '关闭'}`);
    }

    // ============================================
    // 历史统计图表相关方法
    // ============================================

    // 打开历史统计图表页面
    openStatsChart() {
        // 隐藏其他页面
        document.querySelectorAll('.main-content > div').forEach(div => {
            if (!div.classList.contains('loading-overlay')) {
                div.classList.add('hidden');
            }
        });

        // 显示图表页面
        document.getElementById('statsChartScreen').classList.remove('hidden');

        // 默认显示最近7天数据
        this.currentChartRange = 7;
        this.updateCharts(7);

        // 添加窗口大小变化监听器
        if (!this.chartResizeListener) {
            this.chartResizeListener = () => {
                if (!document.getElementById('statsChartScreen').classList.contains('hidden')) {
                    this.updateCharts(this.currentChartRange || 7);
                }
            };
            window.addEventListener('resize', this.chartResizeListener);
        }

        console.log('✅ 打开历史统计图表');
    }

    // 关闭历史统计图表页面
    closeStatsChart() {
        document.getElementById('statsChartScreen').classList.add('hidden');
        
        // 返回欢迎页面
        document.getElementById('welcomeScreen').classList.remove('hidden');

        console.log('✅ 关闭历史统计图表');
    }

    // 更新图表数据
    updateCharts(days) {
        this.currentChartRange = days;
        const history = Storage.getRecentStats(days);
        
        if (history.length === 0) {
            // 如果没有数据，显示提示
            ['timeChart', 'wordsChart', 'errorChart'].forEach(id => {
                const canvas = document.getElementById(id);
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary');
                ctx.font = '14px Inter';
                ctx.textAlign = 'center';
                ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
            });
            
            // 清空摘要
            document.getElementById('summaryTotalDays').textContent = '0';
            document.getElementById('summaryTotalTime').textContent = '0';
            document.getElementById('summaryTotalWords').textContent = '0';
            document.getElementById('summaryAvgMastery').textContent = '0%';
            return;
        }

        // 反转数组，使日期从旧到新
        const sortedHistory = [...history].reverse();

        // 准备数据
        const dates = sortedHistory.map(item => {
            const date = new Date(item.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });

        const timeData = sortedHistory.map(item => Math.floor(item.time || 0));
        const wordsData = sortedHistory.map(item => item.words || 0);
        const errorData = sortedHistory.map(item => {
            const total = (item.correct || 0) + (item.wrong || 0);
            return total > 0 ? Math.round((item.wrong || 0) / total * 100) : 0;
        });

        // 绘制三个图表
        this.drawLineChart('timeChart', dates, timeData, '#667eea', '分钟');
        this.drawLineChart('wordsChart', dates, wordsData, '#10b981', '个');
        this.drawLineChart('errorChart', dates, errorData, '#ef4444', '%');

        // 更新统计摘要
        const summary = Storage.getStatsSummary(days);
        document.getElementById('summaryTotalDays').textContent = summary.totalDays;
        document.getElementById('summaryTotalTime').textContent = Math.floor(summary.totalTime);
        document.getElementById('summaryTotalWords').textContent = summary.totalWords;
        document.getElementById('summaryAvgMastery').textContent = `${summary.avgMastery}%`;
    }

    // 绘制折线图
    drawLineChart(canvasId, labels, data, color, unit) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        // 设置高DPI显示
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 计算图表区域
        const padding = { top: 20, right: 30, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // 找到最大值
        const maxValue = Math.max(...data, 1);
        const minValue = Math.min(...data, 0);
        const valueRange = maxValue - minValue || 1;

        // 获取CSS变量颜色
        const styles = getComputedStyle(document.documentElement);
        const textColor = styles.getPropertyValue('--text-secondary').trim();
        const gridColor = styles.getPropertyValue('--border-color').trim();

        // 绘制网格线和Y轴标签
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.font = '11px Inter';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';

        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            const value = Math.round(maxValue - (valueRange / gridLines) * i);
            
            // 绘制网格线
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // 绘制Y轴标签
            ctx.fillText(value.toString(), padding.left - 10, y + 4);
        }

        // 绘制X轴标签
        ctx.textAlign = 'center';
        const labelStep = Math.ceil(labels.length / 7); // 最多显示7个标签
        labels.forEach((label, index) => {
            if (index % labelStep === 0 || index === labels.length - 1) {
                const x = padding.left + (chartWidth / (labels.length - 1 || 1)) * index;
                ctx.fillText(label, x, height - 10);
            }
        });

        // 绘制折线和点
        if (data.length > 0) {
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            // 绘制渐变填充区域
            const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
            gradient.addColorStop(0, color + '30');
            gradient.addColorStop(1, color + '00');

            ctx.beginPath();
            data.forEach((value, index) => {
                const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
                const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            // 填充区域
            const lastX = padding.left + chartWidth;
            const baseY = padding.top + chartHeight;
            ctx.lineTo(lastX, baseY);
            ctx.lineTo(padding.left, baseY);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // 绘制折线
            ctx.beginPath();
            data.forEach((value, index) => {
                const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
                const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.strokeStyle = color;
            ctx.stroke();

            // 绘制数据点
            data.forEach((value, index) => {
                const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
                const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                
                // 外圈
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                
                // 内圈
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = styles.getPropertyValue('--surface').trim();
                ctx.fill();
            });
        }

        // 添加鼠标移动事件监听器来显示数据点
        const chartKey = `${canvasId}_mousemove`;
        if (!this.chartEventListeners) {
            this.chartEventListeners = {};
        }
        
        // 移除旧的监听器
        if (this.chartEventListeners[chartKey]) {
            canvas.removeEventListener('mousemove', this.chartEventListeners[chartKey]);
            canvas.removeEventListener('mouseleave', this.chartEventListeners[`${chartKey}_leave`]);
        }
        
        // 创建重绘基础图表的函数（不包含事件监听器）
        const redrawBase = () => {
            // 设置高DPI显示
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            
            const width = rect.width;
            const height = rect.height;
            
            // 清空画布
            ctx.clearRect(0, 0, width, height);
            
            // 绘制网格线和Y轴标签
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.font = '11px Inter';
            ctx.fillStyle = textColor;
            ctx.textAlign = 'right';

            for (let i = 0; i <= gridLines; i++) {
                const y = padding.top + (chartHeight / gridLines) * i;
                const value = Math.round(maxValue - (valueRange / gridLines) * i);
                
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();

                ctx.fillText(value.toString(), padding.left - 10, y + 4);
            }

            // 绘制X轴标签
            ctx.textAlign = 'center';
            const labelStep = Math.ceil(labels.length / 7);
            labels.forEach((label, index) => {
                if (index % labelStep === 0 || index === labels.length - 1) {
                    const x = padding.left + (chartWidth / (labels.length - 1 || 1)) * index;
                    ctx.fillText(label, x, height - 10);
                }
            });

            // 绘制折线和点
            if (data.length > 0) {
                ctx.strokeStyle = color;
                ctx.fillStyle = color;
                ctx.lineWidth = 2.5;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';

                // 绘制渐变填充区域
                const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
                gradient.addColorStop(0, color + '30');
                gradient.addColorStop(1, color + '00');

                ctx.beginPath();
                data.forEach((value, index) => {
                    const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
                    const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                    
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                const lastX = padding.left + chartWidth;
                const baseY = padding.top + chartHeight;
                ctx.lineTo(lastX, baseY);
                ctx.lineTo(padding.left, baseY);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                // 绘制折线
                ctx.beginPath();
                data.forEach((value, index) => {
                    const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
                    const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                    
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.strokeStyle = color;
                ctx.stroke();

                // 绘制数据点
                data.forEach((value, index) => {
                    const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
                    const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = styles.getPropertyValue('--surface').trim();
                    ctx.fill();
                });
            }
        };
        
        // 创建新的监听器
        const mouseMoveHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // 检查是否悬停在某个数据点附近
            let hoveredIndex = -1;
            let minDistance = 15; // 检测范围
            
            data.forEach((value, index) => {
                const x = padding.left + (chartWidth / (data.length - 1 || 1)) * index;
                const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
                
                if (distance < minDistance) {
                    minDistance = distance;
                    hoveredIndex = index;
                }
            });
            
            // 重绘基础图表
            redrawBase();
            
            // 如果悬停在数据点上，显示提示
            if (hoveredIndex >= 0) {
                const value = data[hoveredIndex];
                const label = labels[hoveredIndex];
                const x = padding.left + (chartWidth / (data.length - 1 || 1)) * hoveredIndex;
                const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                
                // 高亮数据点
                ctx.beginPath();
                ctx.arc(x, y, 7, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = styles.getPropertyValue('--surface').trim();
                ctx.fill();
                
                // 绘制提示框
                const text = `${value}${unit}`;
                ctx.font = '12px Inter';
                ctx.textAlign = 'center';
                const textWidth = ctx.measureText(text).width;
                const tooltipPadding = 8;
                const tooltipWidth = textWidth + tooltipPadding * 2;
                const tooltipHeight = 24;
                const tooltipX = x - tooltipWidth / 2;
                let tooltipY = y - 35;
                
                // 确保提示框在画布内
                if (tooltipY < 0) {
                    tooltipY = y + 20;
                }
                if (tooltipX < 0) {
                    tooltipX = 5;
                } else if (tooltipX + tooltipWidth > width) {
                    tooltipX = width - tooltipWidth - 5;
                }
                
                // 绘制提示框背景
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
                ctx.fill();
                
                // 绘制提示框文字
                ctx.fillStyle = '#ffffff';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x, tooltipY + tooltipHeight / 2);
                
                canvas.style.cursor = 'pointer';
            } else {
                canvas.style.cursor = 'default';
            }
        };
        
        const mouseLeaveHandler = () => {
            // 鼠标离开时重绘图表，移除高亮
            redrawBase();
            canvas.style.cursor = 'default';
        };
        
        // 保存监听器引用
        this.chartEventListeners[chartKey] = mouseMoveHandler;
        this.chartEventListeners[`${chartKey}_leave`] = mouseLeaveHandler;
        
        // 添加监听器
        canvas.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('mouseleave', mouseLeaveHandler);
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new WordMemoryApp();
});

