// ============================================
// 词忆 - 主应用逻辑
// ============================================

// 常见不规则动词词形表：原形 → 其他词形（过去式/过去分词/三单/进行时等）。
// 用于前端高亮识别 AI 糅合关键词时输出的词性/词形变化（如 undergo → underwent / undergone）
const IRREGULAR_WORD_FORMS = {
    'be': ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
    'have': ['has', 'had', 'having'],
    'do': ['does', 'did', 'done', 'doing'],
    'go': ['goes', 'went', 'gone', 'going'],
    'undergo': ['undergoes', 'underwent', 'undergone', 'undergoing'],
    'overcome': ['overcame', 'overcoming', 'overcomes'],
    'take': ['took', 'taken', 'takes', 'taking'],
    'mistake': ['mistook', 'mistaken', 'mistakes', 'mistaking'],
    'overtake': ['overtook', 'overtaken', 'overtaking'],
    'undertake': ['undertook', 'undertaken', 'undertaking'],
    'shake': ['shook', 'shaken', 'shaking'],
    'give': ['gave', 'given', 'gives', 'giving'],
    'forgive': ['forgave', 'forgiven', 'forgiving'],
    'drive': ['drove', 'driven', 'drives', 'driving'],
    'ride': ['rode', 'ridden', 'rides', 'riding'],
    'rise': ['rose', 'risen', 'rises', 'rising'],
    'arise': ['arose', 'arisen', 'arising'],
    'write': ['wrote', 'written', 'writes', 'writing'],
    'rewrite': ['rewrote', 'rewritten', 'rewriting'],
    'read': ['reads', 'reading'],
    'speak': ['spoke', 'spoken', 'speaks', 'speaking'],
    'break': ['broke', 'broken', 'breaks', 'breaking'],
    'choose': ['chose', 'chosen', 'chooses', 'choosing'],
    'steal': ['stole', 'stolen', 'steals', 'stealing'],
    'forget': ['forgot', 'forgotten', 'forgets', 'forgetting'],
    'get': ['got', 'gotten', 'gets', 'getting'],
    'begin': ['began', 'begun', 'begins', 'beginning'],
    'drink': ['drank', 'drunk', 'drinks', 'drinking'],
    'ring': ['rang', 'rung', 'rings', 'ringing'],
    'sing': ['sang', 'sung', 'sings', 'singing'],
    'swim': ['swam', 'swum', 'swims', 'swimming'],
    'run': ['ran', 'runs', 'running'],
    'sit': ['sat', 'sits', 'sitting'],
    'win': ['won', 'wins', 'winning'],
    'find': ['found', 'finds', 'finding'],
    'bring': ['brought', 'brings', 'bringing'],
    'buy': ['bought', 'buys', 'buying'],
    'catch': ['caught', 'catches', 'catching'],
    'teach': ['taught', 'teaches', 'teaching'],
    'think': ['thought', 'thinks', 'thinking'],
    'fight': ['fought', 'fights', 'fighting'],
    'build': ['built', 'builds', 'building'],
    'send': ['sent', 'sends', 'sending'],
    'spend': ['spent', 'spends', 'spending'],
    'meet': ['met', 'meets', 'meeting'],
    'feel': ['felt', 'feels', 'feeling'],
    'sleep': ['slept', 'sleeps', 'sleeping'],
    'keep': ['kept', 'keeps', 'keeping'],
    'leave': ['left', 'leaves', 'leaving'],
    'lose': ['lost', 'loses', 'losing'],
    'mean': ['meant', 'means', 'meaning'],
    'pay': ['paid', 'pays', 'paying'],
    'say': ['said', 'says', 'saying'],
    'sell': ['sold', 'sells', 'selling'],
    'tell': ['told', 'tells', 'telling'],
    'understand': ['understood', 'understands', 'understanding'],
    'stand': ['stood', 'stands', 'standing'],
    'come': ['came', 'comes', 'coming'],
    'become': ['became', 'becomes', 'becoming'],
    'eat': ['ate', 'eaten', 'eats', 'eating'],
    'fall': ['fell', 'fallen', 'falls', 'falling'],
    'grow': ['grew', 'grown', 'grows', 'growing'],
    'know': ['knew', 'known', 'knows', 'knowing'],
    'throw': ['threw', 'thrown', 'throws', 'throwing'],
    'blow': ['blew', 'blown', 'blows', 'blowing'],
    'draw': ['drew', 'drawn', 'draws', 'drawing'],
    'fly': ['flew', 'flown', 'flies', 'flying'],
    'hear': ['heard', 'hears', 'hearing'],
    'hold': ['held', 'holds', 'holding'],
    'lie': ['lay', 'lain', 'lies', 'lying'],
    'make': ['made', 'makes', 'making'],
    'show': ['showed', 'shown', 'shows', 'showing'],
    'wear': ['wore', 'worn', 'wears', 'wearing'],
    'wind': ['wound', 'winds', 'winding'],
    'swear': ['swore', 'sworn', 'swearing'],
    'tear': ['tore', 'torn', 'tears', 'tearing'],
    'bite': ['bit', 'bitten', 'bites', 'biting'],
    'hide': ['hid', 'hidden', 'hides', 'hiding'],
    'seek': ['sought', 'seeks', 'seeking'],
    'shoot': ['shot', 'shoots', 'shooting'],
    'light': ['lit', 'lights', 'lighting'],
    'freeze': ['froze', 'frozen', 'freezes', 'freezing'],
    'swell': ['swelled', 'swollen', 'swells', 'swelling'],
    'put': ['puts', 'putting', 'put'],
    'cut': ['cuts', 'cutting', 'cut'],
    'hurt': ['hurts', 'hurting', 'hurt'],
    'cost': ['costs', 'costing', 'cost'],
    'hit': ['hits', 'hitting', 'hit'],
    'let': ['lets', 'letting', 'let'],
    'set': ['sets', 'setting', 'set'],
    'shut': ['shuts', 'shutting', 'shut'],
    'quit': ['quits', 'quitting', 'quit'],
    'split': ['splits', 'splitting', 'split'],
    'spread': ['spreads', 'spreading', 'spread'],
    'burst': ['bursts', 'bursting', 'burst'],
    'cast': ['casts', 'casting', 'cast'],
    'upset': ['upsets', 'upsetting', 'upset'],
    'broadcast': ['broadcasts', 'broadcasted', 'broadcasting'],
    'lead': ['led', 'leads', 'leading'],
    'feed': ['fed', 'feeds', 'feeding'],
    'breed': ['bred', 'breeds', 'breeding'],
    'speed': ['sped', 'speeds', 'speeding'],
    'bend': ['bent', 'bends', 'bending'],
    'lend': ['lent', 'lends', 'lending'],
    'burn': ['burnt', 'burned', 'burns', 'burning'],
    'learn': ['learnt', 'learned', 'learns', 'learning'],
    'dream': ['dreamt', 'dreamed', 'dreams', 'dreaming'],
    'smell': ['smelt', 'smelled', 'smells', 'smelling'],
    'spell': ['spelt', 'spelled', 'spells', 'spelling'],
    'dwell': ['dwelt', 'dwelled', 'dwells', 'dwelling'],
    'kneel': ['knelt', 'kneeled', 'kneels', 'kneeling'],
    'leap': ['leapt', 'leaped', 'leaps', 'leaping'],
    'creep': ['crept', 'creeps', 'creeping'],
    'weep': ['wept', 'weeps', 'weeping'],
    'sweep': ['swept', 'sweeps', 'sweeping'],
    'deal': ['dealt', 'deals', 'dealing'],
    'flee': ['fled', 'flees', 'fleeing'],
    'grind': ['ground', 'grinds', 'grinding'],
    'stick': ['stuck', 'sticks', 'sticking'],
    'dig': ['dug', 'digs', 'digging'],
    'sting': ['stung', 'stings', 'stinging'],
    'swing': ['swung', 'swings', 'swinging'],
    'hang': ['hung', 'hangs', 'hanging'],
    'slide': ['slid', 'slides', 'sliding'],
    'forbid': ['forbade', 'forbidden', 'forbids', 'forbidding'],
    'withdraw': ['withdrew', 'withdrawn', 'withdraws', 'withdrawing'],
    'withhold': ['withheld', 'withholds', 'withholding'],
    'withstand': ['withstood', 'withstands', 'withstanding'],
    'foresee': ['foresaw', 'foreseen', 'foresees', 'foreseeing'],
    'beat': ['beat', 'beaten', 'beats', 'beating'],
    'became': ['become'],
    'good': ['better', 'best'],
    'well': ['better', 'best'],
    'bad': ['worse', 'worst'],
    'badly': ['worse', 'worst'],
    'far': ['farther', 'farthest', 'further', 'furthest'],
    'little': ['less', 'least'],
    'many': ['more', 'most'],
    'much': ['more', 'most'],
    'old': ['older', 'elder', 'oldest', 'eldest'],
    'man': ['men'],
    'woman': ['women'],
    'child': ['children'],
    'foot': ['feet'],
    'tooth': ['teeth'],
    'goose': ['geese'],
    'mouse': ['mice'],
    'person': ['people'],
    'ox': ['oxen'],
    'index': ['indices', 'indexes'],
    'criterion': ['criteria'],
    'phenomenon': ['phenomena'],
    'datum': ['data'],
    'medium': ['media'],
    'analysis': ['analyses'],
    'basis': ['bases'],
    'thesis': ['theses'],
    'crisis': ['crises'],
    'hypothesis': ['hypotheses'],
    'curriculum': ['curricula'],
    'bacterium': ['bacteria'],
    'stratum': ['strata'],
    'focus': ['foci', 'focuses']
};

// 常用缩写/所有格形式（所有格 -'s / -s' 在规则中统一生成；此处补充代词/助动词的缩写形）
const WORD_CONTRACTIONS = {
    'i': ["i'm", "i've", "i'd", "i'll"],
    'you': ["you're", "you've", "you'd", "you'll"],
    'he': ["he's", "he'd", "he'll"],
    'she': ["she's", "she'd", "she'll"],
    'it': ["it's", "it'd", "it'll"],
    'we': ["we're", "we've", "we'd", "we'll"],
    'they': ["they're", "they've", "they'd", "they'll"],
    'that': ["that's", "that'd", "that'll"],
    'what': ["what's", "what'll"],
    'who': ["who's", "who'd", "who'll"],
    'there': ["there's", "there're", "there'd", "there'll"],
    'do': ["don't", "doesn't", "didn't"],
    'does': ["doesn't"],
    'did': ["didn't"],
    'is': ["isn't"],
    'are': ["aren't"],
    'was': ["wasn't"],
    'were': ["weren't"],
    'have': ["haven't"],
    'has': ["hasn't"],
    'had': ["hadn't"],
    'will': ["won't"],
    'would': ["wouldn't"],
    'could': ["couldn't"],
    'should': ["shouldn't"],
    'must': ["mustn't"],
    'need': ["needn't"],
    'can': ["can't", "cannot"],
    'cannot': ["can't"],
    'let': ["let's"],
    'not': ["n't"]
};

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
        this.modeOverride = null; // 返回上一题时锁定使用的答题模式
        this.settings = {}; // 稍后在 login 或 init 处加载
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
        this.lastActivityTime = null; // 最后一次用户活动时间（防挂机）
        this.isPausedDueToInactivity = false; // 是否因无活动而暂停计时
        this.pausedTime = null; // 暂停时的时间点
        this.pausedElapsedMinutes = 0; // 暂停时已累计的时长（分钟）
        this.activityTrackerBound = null; // 活动跟踪函数的绑定引用（用于移除监听器）
        this.isReviewMode = false; // 是否处于复习模式
        this.reviewingWrongCount = 0; // 正在复习的错题数量
        this.isWordListEditMode = false; // 单词表是否处于编辑模式
        this.currentWordListBookId = null; // 当前浏览的词书ID
        this.currentExample = ''; // 当前显示的例句文本（用于重新播放）
        this.spellTypingTimer = null; // 拼写输入"输入中"状态计时器（暂停槽位呼吸动画）
        this.memoryAidCache = {}; // 记忆方法AI结果缓存（key: 单词|模型，同会话内避免重复调用AI）
        
        // AI工坊相关
        this.selectedKeywords = []; // 选中的关键词
        this.selectedBooks = []; // 选中的词单
        this.currentStory = null; // 当前生成的故事
        this.currentQuestions = []; // 当前题目
        this.userAnswers = {}; // 用户答案
        this.keywordInputTimer = null; // 输入计时器
        this.readingTimer = null; // 阅读计时器定时器
        this.readingTimerSeconds = 300; // 阅读计时器秒数（5分钟 = 300秒）
        
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
        
        this.initLogin();
    }

    // 初始化登录逻辑
    initLogin() {
        this.setupUserArea();
        const user = Storage.getCurrentUser();
        if (!user) {
            // 游客模式：当天已选择过，后续进入不再提示登录
            if (this.isGuestSessionActive()) {
                this.enterApplication('游客', false);
                return;
            }
            const loginModal = document.getElementById('userLoginModal');
            const loginBtn = document.getElementById('loginBtn');
            const guestBtn = document.getElementById('guestBtn');
            const usernameInput = document.getElementById('usernameInput');
            
            this.updateUserAreaState('');
            this.renderHistoryUsers();
            loginModal.classList.remove('hidden');
            
            loginBtn.onclick = () => {
                const username = usernameInput.value.trim();
                if (username) {
                    // 正常登录：清除当天游客标记
                    localStorage.removeItem('wordMemory_guestDay');
                    this.enterApplication(username, true);
                } else {
                    alert('请输入有效的用户昵称');
                }
            };
            
            // 游客模式：当天不再提示登录，直接以游客身份体验
            if (guestBtn) {
                guestBtn.onclick = () => {
                    localStorage.setItem('wordMemory_guestDay', this.todayStr());
                    this.enterApplication('游客', false);
                };
            }
            
            usernameInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    loginBtn.click();
                }
            };
        } else {
            this.updateUserAreaState(user);
            this.initUserFileSystemAndFinish(user);
        }
    }

    // 当天日期字符串（YYYY-MM-DD）
    todayStr() {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${m}-${day}`;
    }

    // 游客模式是否仍有效（当天）
    isGuestSessionActive() {
        return localStorage.getItem('wordMemory_guestDay') === this.todayStr();
    }

    // 渲染历史用户列表（点击整行/进入按钮直接进入该账号，删除按钮移除本地数据）
    renderHistoryUsers() {
        const listEl = document.getElementById('historyUserList');
        const emptyEl = document.getElementById('historyUserEmpty');
        if (!listEl) return;
        // 游客账号为临时体验，不列入历史用户列表
        const users = Storage.listUsers().filter(u => u !== '游客');
        const self = this;
        if (users.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            listEl.innerHTML = '';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';
        listEl.innerHTML = '';
        users.forEach(username => {
            const item = document.createElement('div');
            item.className = 'history-user-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '8px';
            item.style.padding = '8px 12px';
            item.style.borderRadius = '8px';
            item.style.cursor = 'pointer';
            item.style.border = '1px solid var(--border-color)';
            item.style.background = 'var(--background)';
            item.style.transition = 'background var(--transition-fast)';
            // 昵称
            const name = document.createElement('span');
            name.textContent = username;
            name.style.flex = '1';
            name.style.overflow = 'hidden';
            name.style.textOverflow = 'ellipsis';
            name.style.whiteSpace = 'nowrap';
            name.style.fontWeight = '500';
            // 进入按钮
            const enterBtn = document.createElement('button');
            enterBtn.textContent = '进入';
            enterBtn.style.cssText = 'flex-shrink:0; padding:2px 10px; font-size:12px; border:1px solid var(--primary-color); border-radius:6px; background:transparent; color:var(--primary-color); cursor:pointer;';
            enterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterApplication(username, false);
            });
            // 删除按钮
            const delBtn = document.createElement('button');
            delBtn.textContent = '删除';
            delBtn.style.cssText = 'flex-shrink:0; padding:2px 10px; font-size:12px; border:1px solid var(--error); border-radius:6px; background:transparent; color:var(--error); cursor:pointer;';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除历史用户 "${username}" 的所有本地数据吗？此操作不可恢复。`)) {
                    Storage.removeUser(username);
                    self.renderHistoryUsers();
                }
            });
            item.appendChild(name);
            item.appendChild(enterBtn);
            item.appendChild(delBtn);
            // 点击整行进入
            item.addEventListener('click', () => {
                this.enterApplication(username, false);
            });
            listEl.appendChild(item);
        });
    }

    // 首次登录：在用户手势中绑定本地 user/ 目录，然后完成初始化
    enterApplication(username, firstTime) {
        Storage.setCurrentUser(username);
        const finish = () => {
            const loginModal = document.getElementById('userLoginModal');
            loginModal.classList.add('hidden');
            this.updateUserAreaState(username);
            this.initUserFileSystemAndFinish(username);
        };
        if (firstTime) {
            // 已绑定过目录则直接复用，否则在用户手势中弹出选择器绑定 reciting/user/ 目录
            if (Storage.hasUserDirectory()) {
                finish();
            } else {
                Storage.chooseUserDirectory().finally(finish);
            }
        } else {
            finish();
        }
    }

    // 恢复文件系统授权并从 user/ 目录加载配置后完成初始化
    async initUserFileSystemAndFinish(username) {
        await Storage.initUserFileSystem(username);
        this.finishInit();
    }

    // 初始化顶部用户区域（登录按钮 / 用户昵称 + 下拉菜单）
    setupUserArea() {
        const loginBtn = document.getElementById('headerLoginBtn');
        const userMenuBtn = document.getElementById('userMenuBtn');
        const dropdown = document.getElementById('userDropdown');

        // 未登录时点击“登录”打开登录弹窗
        loginBtn.addEventListener('click', () => {
            const loginModal = document.getElementById('userLoginModal');
            this.renderHistoryUsers();
            loginModal.classList.remove('hidden');
            const input = document.getElementById('usernameInput');
            if (input) input.focus();
        });

        // 点击用户昵称展开/收起下拉菜单
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // 点击页面其它区域时关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

        // 下拉菜单：个人信息
        document.getElementById('dropdownProfile').addEventListener('click', () => {
            dropdown.classList.add('hidden');
            this.openUserProfileModal();
        });

        // 下拉菜单：学习数据（跳转到统计图表页，同 btn-stats-chart）
        document.getElementById('dropdownStats').addEventListener('click', () => {
            dropdown.classList.add('hidden');
            this.openStatsChart();
        });

        // 下拉菜单：绑定/重新绑定本地文件夹
        document.getElementById('dropdownSyncDir').addEventListener('click', async () => {
            dropdown.classList.add('hidden');
            const ok = await Storage.chooseUserDirectory();
            if (ok) {
                // 绑定成功后将当前配置同步写入新目录
                await Storage.initUserFileSystem(Storage.getCurrentUser());
                alert('已将用户配置保存到本地文件夹');
            } else {
                alert('未完成绑定，当前配置仍保存在浏览器本地缓存');
            }
        });

        // 下拉菜单：退出登录 / 游客切换登录
        document.getElementById('dropdownLogout').addEventListener('click', () => {
            dropdown.classList.add('hidden');
            if (Storage.getCurrentUser() === '游客') {
                // 游客模式：点击“登录”切换到真实账号登录，先提醒游客数据为临时缓存
                if (!confirm('游客模式下，您的学习数据仅保存在本地缓存中，随时可能被清空，不保证长期保存。\n\n确定切换到正式账号登录吗？')) return;
                localStorage.removeItem('wordMemory_guestDay');
                localStorage.removeItem('wordMemory_currentUser');
                location.reload();
                return;
            }
            this.logout();
        });

        // 通用：关闭弹窗
        document.querySelectorAll('[data-close-modal]').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.closeModal;
                const m = document.getElementById(id);
                if (m) m.classList.add('hidden');
            });
        });
    }

    // 根据登录状态刷新顶部用户区域
    updateUserAreaState(username) {
        const loginBtn = document.getElementById('headerLoginBtn');
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (username) {
            loginBtn.classList.add('hidden');
            userMenuBtn.classList.remove('hidden');
            // 昵称最多显示12个字符，超出用省略号
            const name = String(username || '');
            document.getElementById('headerUserName').textContent =
                name.length > 12 ? name.slice(0, 12) + '…' : name;
            const avatar = document.getElementById('userAvatar');
            avatar.textContent = (username.trim()[0] || '词').toUpperCase();
            // 游客模式下，底部菜单项显示“登录”而非“退出登录”
            const logoutItem = document.getElementById('dropdownLogout');
            if (logoutItem) {
                if (username === '游客') {
                    logoutItem.textContent = '登录';
                    logoutItem.classList.remove('dropdown-danger');
                } else {
                    logoutItem.textContent = '退出登录';
                    logoutItem.classList.add('dropdown-danger');
                }
            }
        } else {
            userMenuBtn.classList.add('hidden');
            loginBtn.classList.remove('hidden');
            document.getElementById('userDropdown').classList.add('hidden');
        }
    }

    // 打开个人信息弹窗
    openUserProfileModal() {
        const user = Storage.getCurrentUser();
        if (!user) return;
        let createdAt = '未知';
        try {
            const conf = JSON.parse(localStorage.getItem(`wordMemory_user_json_${user}`) || 'null');
            if (conf && conf.createdAt) {
                createdAt = new Date(conf.createdAt).toLocaleString();
            }
        } catch (e) { /* 忽略解析错误 */ }

        document.getElementById('profileUsername').textContent = user;
        document.getElementById('profileCreatedAt').textContent = createdAt;
        document.getElementById('userProfileModal').classList.remove('hidden');
    }

    // 打开学习数据（前端占位）
    openLearningDataModal() {
        const user = Storage.getCurrentUser();
        if (!user) return;
        document.getElementById('statsUsername').textContent = user;
        document.getElementById('learningDataModal').classList.remove('hidden');
    }

    // 退出登录
    logout() {
        if (!confirm('确定要退出登录吗？')) return;
        localStorage.removeItem('wordMemory_currentUser');
        // 重新加载以初始化新会话（游客/重新登录）
        location.reload();
    }

    // ============================================
    // 页面封面：单词导入 / 单词星云
    // ============================================

    // 应用当前封面模式（依据 defaultCover 设置切换欢迎页封面）
    applyCoverMode() {
        // 委托给独立模块 js/nebula.js 处理封面切换与星云渲染
        if (typeof NebulaCover !== 'undefined') {
            NebulaCover.apply();
        }
        // “切换星云封面”按钮仅单词导入封面显示
        const switchBtn = document.getElementById('switchNebulaCoverBtn');
        if (switchBtn) {
            const cover = (this.settings && this.settings.defaultCover) || 'import';
            switchBtn.style.display = cover === 'nebula' ? 'none' : 'inline-flex';
        }
    }

    // 供外部刷新星云（例如设置保存后）
    refreshNebulaCover() {
        if (typeof NebulaCover !== 'undefined') {
            NebulaCover.apply();
        }
    }

    finishInit() {
        this.settings = Storage.loadSettings();
        
        // 确保音效设置有默认值（兼容旧数据）
        if (this.settings.enableSoundEffects === undefined) {
            this.settings.enableSoundEffects = true;
            Storage.saveSettings(this.settings);
            console.log('✨ 已为旧数据启用音效开关（默认开启）');
        }
        
        // 初始化音效
        this.initSoundEffects();
        
        this.initTheme();
        this.initEventListeners();
        this.initAiModelSelects(); // 初始化AI模型选择器
        this.initSettingSelects(); // 初始化设置下拉（自绘现代UI，与AI模型下拉一致）
        this.loadCEFRData(); // 加载CEFR数据
        this.migrateOldData(); // 迁移旧数据
        this.loadBooks(); // 加载词书列表
        this.updateStats();
        this.checkReview();
        this.loadAvailableVoices();
        this.applyCoverMode(); // 应用封面模式（单词导入/单词星云）
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
            'wordListScreen',
            'statsChartScreen'  // 历史统计页面
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
        // 回到欢迎页时应用封面模式，并在星云封面下启动/恢复渲染
        if (screenId === 'welcomeScreen') {
            this.applyCoverMode();
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

    // 构造CEFR等级标识HTML（未命中返回空字符串；样式参考 nebula-card-level）
    getCEFRBadgeHTML(word) {
        const level = this.getWordCEFRLevel(word);
        if (!level) return '';
        return `<span class="cefr-level-badge cefr-${level.toLowerCase()}">${level}</span>`;
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

        // 单词导入封面：切换到星云封面（按默认配置展示示例单词，并保存封面配置）
        const switchNebulaBtn = document.getElementById('switchNebulaCoverBtn');
        if (switchNebulaBtn) {
            switchNebulaBtn.addEventListener('click', () => {
                if (!this.settings) this.settings = {};
                this.settings.defaultCover = 'nebula';
                Storage.saveSettings(this.settings);
                if (typeof NebulaCover !== 'undefined' && typeof NebulaCover.switchFromImport === 'function') {
                    NebulaCover.switchFromImport();
                } else {
                    this.applyCoverMode();
                }
                // 已进入星云封面，不再显示切换按钮
                switchNebulaBtn.style.display = 'none';
            });
        }

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

        // 设置页：添加自定义模型
        document.getElementById('addCustomModelFromSettings').addEventListener('click', () => {
            this.addCustomModelFromSettings();
        });

        // AI 多厂商 sheet：新增厂商
        const addProviderBtn = document.getElementById('aiAddProviderTab');
        if (addProviderBtn) {
            addProviderBtn.addEventListener('click', () => { this.addAiProvider(); });
        }
        // AI 多厂商 sheet：点击切换 / 双击重命名 / 删除
        const providerTabList = document.getElementById('aiProviderTabList');
        if (providerTabList) {
            providerTabList.addEventListener('click', (e) => {
                const del = e.target.closest('.ai-provider-tab-del');
                if (del) {
                    const idx = parseInt(del.dataset.del, 10);
                    this.removeAiProvider(idx);
                    return;
                }
                const tab = e.target.closest('.ai-provider-tab');
                if (tab) {
                    const idx = parseInt(tab.dataset.index, 10);
                    this.switchAiProvider(idx);
                }
            });
            providerTabList.addEventListener('dblclick', (e) => {
                const tab = e.target.closest('.ai-provider-tab');
                if (!tab) return;
                const idx = parseInt(tab.dataset.index, 10);
                const providers = this.getAiProviders();
                const p = providers[idx];
                if (!p) return;
                const newName = prompt('请输入厂商名称：', p.name || '未命名');
                if (newName === null) return;
                const trimmed = newName.trim();
                if (trimmed) {
                    p.name = trimmed;
                    this.renderAiProviderTabs();
                }
            });
        }

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

        // 点击记住么模式的释义卡片 → 重读一遍例句
        document.getElementById('rememberMeaningDisplay').addEventListener('click', () => {
            this.replayExample();
        });

        document.getElementById('exitLearningBtn').addEventListener('click', () => {
            this.exitLearning();
        });

        // 移动端学习头部返回按钮：弹出确认，确定后退出学习
        const learningBackBtn = document.getElementById('learningBackBtn');
        const exitLearningModal = document.getElementById('exitLearningModal');
        if (learningBackBtn) {
            learningBackBtn.addEventListener('click', () => {
                if (exitLearningModal) {
                    // 恢复默认退出学习文案（可能被“回到主页”弹窗修改过）
                    const titleEl = exitLearningModal.querySelector('.modal-header h3');
                    const bodyEl = exitLearningModal.querySelector('.modal-body p');
                    if (titleEl) titleEl.textContent = '退出学习';
                    if (bodyEl) bodyEl.innerHTML = '确定要退出学习吗？<br>进度将不会保存。';
                    exitLearningModal.classList.remove('hidden');
                }
            });
        }
        const confirmExitBtn = document.getElementById('confirmExitLearningBtn');
        if (confirmExitBtn) {
            confirmExitBtn.addEventListener('click', () => {
                if (exitLearningModal) exitLearningModal.classList.add('hidden');
                this.backToHome();
            });
        }

        // 左右边缘隐形按钮：折叠/展开 左侧词书列表 与 右侧统计面板
        const edgeToggleLeft = document.getElementById('edgeToggleLeft');
        const edgeToggleRight = document.getElementById('edgeToggleRight');
        const sidebarEl = document.getElementById('sidebar');
        const statsPanelEl = document.getElementById('statsPanel');
        const nebulaControlsEl = document.getElementById('nebulaControls');
        const nebulaControlsToggle = document.getElementById('nebulaControlsToggle');

        // 折叠/展开面板后，延时刷新星云封面，使其按新的可视区域尺寸重新渲染（非拉伸）
        const refreshNebulaAfterToggle = () => {
            // 侧栏/统计面板已是覆盖层，折叠不再改变内容尺寸，
            // 因此星云始终按全屏渲染，无需重绘。
        };

        // 让星云控制面板始终贴在统计面板左侧（展开时右偏移避开右侧栏）
        const syncNebulaControlsOffset = () => {
            if (!nebulaControlsEl) return;
            // 移动端：面板为抽屉，控件始终右对齐贴右边缘
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                nebulaControlsEl.style.right = '16px';
                return;
            }
            const statsCollapsed = statsPanelEl ? statsPanelEl.classList.contains('collapsed') : true;
            nebulaControlsEl.style.right = statsCollapsed ? '16px' : '276px';
        };

        // 统一设置所有可折叠项的折叠状态，并同步按钮箭头与悬浮提示
        const setBothCollapsed = (collapsed) => {
            if (sidebarEl) sidebarEl.classList.toggle('collapsed', collapsed);
            if (statsPanelEl) statsPanelEl.classList.toggle('collapsed', collapsed);
            // 中键折叠包含星云控制面板
            if (nebulaControlsEl) nebulaControlsEl.classList.toggle('collapsed', collapsed);
            if (edgeToggleLeft) {
                edgeToggleLeft.classList.toggle('collapsed', collapsed);
                edgeToggleLeft.title = collapsed ? '展开词书列表' : '折叠词书列表';
            }
            if (edgeToggleRight) {
                edgeToggleRight.classList.toggle('collapsed', collapsed);
                edgeToggleRight.title = collapsed ? '展开统计面板' : '折叠统计面板';
            }
            this.edgeLastSidebarCollapsed = collapsed;
            this.edgeLastRightCollapsed = collapsed;
            syncNebulaControlsOffset();
            refreshNebulaAfterToggle();
        };
        // 暴露给双页展示等场景：进入双页时自动折叠两侧栏，退出时恢复展开
        this._setBothCollapsed = setBothCollapsed;

        // 绑定悬浮提示（常规文字 + 中键交互说明）
        const applyToggleHint = (wrap, label) => {
            if (!wrap) return;
            wrap.querySelectorAll('.edge-toggle-btn, .edge-toggle-sub').forEach((t) => {
                t.addEventListener('mouseenter', () => {
                    t.title = `鼠标左键折叠/展开${label}\n鼠标中键同时折叠/展开所有面板`;
                });
                t.addEventListener('mouseleave', () => {
                    t.title = wrap.classList.contains('collapsed')
                        ? `展开${label}`
                        : `折叠${label}`;
                });
            });
        };

        const bindEdgeToggle = (wrap) => {
            if (!wrap) return;
            const isSidebar = wrap === edgeToggleLeft;
            const targetEl = isSidebar ? sidebarEl : statsPanelEl;
            const handleClick = () => {
                const collapsed = targetEl.classList.toggle('collapsed');
                wrap.classList.toggle('collapsed', collapsed);
                if (isSidebar) {
                    this.edgeLastSidebarCollapsed = collapsed;
                    wrap.title = collapsed ? '展开左侧词书列表' : '折叠左侧词书列表';
                } else {
                    this.edgeLastRightCollapsed = collapsed;
                    wrap.title = collapsed ? '展开右侧统计面板' : '折叠右侧统计面板';
                }
                syncNebulaControlsOffset();
                refreshNebulaAfterToggle();
                // 点击后让按钮失焦，避免 :focus-within 使容器保持显示，鼠标移开即可渐隐
                wrap.contains(document.activeElement) && document.activeElement.blur();
            };
            const handleAux = (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    const collapsed = targetEl.classList.contains('collapsed');
                    setBothCollapsed(!collapsed);
                }
            };
            // 主按钮与副按钮响应相同的交互（副按钮=贴合边缘的瘦长条）
            wrap.querySelectorAll('.edge-toggle-btn, .edge-toggle-sub').forEach((el) => {
                el.addEventListener('click', handleClick);
                el.addEventListener('auxclick', handleAux);
                el.addEventListener('mousedown', handleAux);
            });
        };

        // 非移动端时才显示隐形按钮（移动端用抽屉）
        const bindEdgeVisibility = (wrap) => {
            if (!wrap) return;
            const sync = () => {
                const isMobile = window.innerWidth <= 768;
                wrap.style.display = isMobile ? 'none' : 'block';
            };
            sync();
            window.addEventListener('resize', sync);
        };

        bindEdgeToggle(edgeToggleLeft);
        bindEdgeToggle(edgeToggleRight);
        bindEdgeVisibility(edgeToggleLeft);
        bindEdgeVisibility(edgeToggleRight);
        if (edgeToggleLeft) applyToggleHint(edgeToggleLeft, '左侧词书列表');
        if (edgeToggleRight) applyToggleHint(edgeToggleRight, '右侧统计面板');

        // 星云控制面板折叠按钮（V 型）
        if (nebulaControlsEl && nebulaControlsToggle) {
            nebulaControlsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const collapsed = nebulaControlsEl.classList.toggle('collapsed');
                nebulaControlsToggle.title = collapsed ? '展开控制面板' : '折叠控制面板';
            });
            // 点击标题区也折叠
            const headerEl = nebulaControlsEl.querySelector('.nebula-controls-header');
            if (headerEl) {
                headerEl.addEventListener('click', (e) => {
                    if (e.target.closest('.nebula-controls-toggle')) return;
                    const collapsed = nebulaControlsEl.classList.toggle('collapsed');
                    nebulaControlsToggle.title = collapsed ? '展开控制面板' : '折叠控制面板';
                });
            }
        }
        // 初始化星云控制面板的偏移（贴在统计面板左侧）
        syncNebulaControlsOffset();
        // 跨移动端/桌面断点时保持贴边正确
        window.addEventListener('resize', syncNebulaControlsOffset);

        // 发音按钮
        document.getElementById('soundBtn1').addEventListener('click', () => {
            this.playSound();
        });

        document.getElementById('soundBtn2').addEventListener('click', () => {
            this.playSound();
        });

        document.getElementById('soundBtn3').addEventListener('click', () => {
            this.playSound();
        });

        // 移动端学习头部发音按钮（与各模式卡片内发音按钮同逻辑）
        const soundBtnMobile = document.getElementById('soundBtnMobile');
        if (soundBtnMobile) {
            soundBtnMobile.addEventListener('click', () => {
                this.playSound();
            });
        }

        // 记得么模式控制
        document.getElementById('rememberBtn').addEventListener('click', () => {
            this.handleRememberClick(true);
        });

        // 拼写模式控制
        const spellInputEl = document.getElementById('spellInput');
        spellInputEl.addEventListener('input', (e) => {
            this.handleSpellInput(e.target.value);
            this.markSpellTyping();
        });

        // 光标激活检测：聚焦时开启当前槽位呼吸动画，失焦时停止
        spellInputEl.addEventListener('focus', () => {
            document.body.classList.add('spell-cursor-on');
            if (this.spellTypingTimer) { clearTimeout(this.spellTypingTimer); this.spellTypingTimer = null; }
            document.body.classList.remove('spell-typing');
        });
        spellInputEl.addEventListener('blur', () => {
            if (this.spellTypingTimer) { clearTimeout(this.spellTypingTimer); this.spellTypingTimer = null; }
            document.body.classList.remove('spell-cursor-on', 'spell-typing');
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

            // 记得么模式快捷键监听：单词③=记得，单词④=不记得（或其后的“如何记忆？”）
            // ③ 对应 settings.hotkeys.option1，④ 对应 settings.hotkeys.option2
            if (this.currentMode === 'remember' && !document.getElementById('modeRemember').classList.contains('hidden')) {
                const hotkeys = this.settings.hotkeys || {
                    option1: '1', option2: '2', option3: '3',
                    option4: '4', option5: '5', option6: '6'
                };
                if (e.key === hotkeys.option1) {
                    e.preventDefault();
                    document.getElementById('rememberBtn').click();
                } else if (e.key === hotkeys.option2) {
                    e.preventDefault();
                    const notRememberBtn = document.getElementById('notRememberBtn');
                    if (!notRememberBtn.disabled) notRememberBtn.click();
                }
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
            // 如果处于编辑模式且存在未保存的改动，询问用户是否确认直接关闭（放弃保存）
            if (this.isWordListEditMode && this.isWordListDirty()) {
                const confirmed = confirm('尚未保存，是否确认保存后退出？\n\n点击“确定”将直接关闭并放弃未保存的更改；点击“取消”将取消关闭。');
                if (!confirmed) {
                    // 用户选择取消，停止关闭流程
                    return;
                }
                // 用户确认 -> 直接关闭（不保存）
            }

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

        // 新增单词按钮事件
        document.getElementById('addOneWordBtn').addEventListener('click', () => {
            this.addBlankWordRow(1);
        });

        document.getElementById('addNWordsBtn').addEventListener('click', () => {
            this.showAddNWordsDialog();
        });

        document.getElementById('addWordsFromFileBtn').addEventListener('click', () => {
            this.addWordsFromFileToCurrentBook();
        });

        // 学习模式中的收藏按钮
        document.getElementById('favoriteBtn1').addEventListener('click', () => {
            this.toggleFavorite();
        });

        document.getElementById('favoriteBtn2').addEventListener('click', () => {
            this.toggleFavorite();
        });

        document.getElementById('favoriteBtn3').addEventListener('click', () => {
            this.toggleFavorite();
        });

        // AI工坊相关事件
        document.getElementById('aiWorkshopBtn').addEventListener('click', () => {
            this.openAiWorkshop();
        });

        // AI工坊顶部header栏的关闭按钮（关闭AI工坊，返回主页）
        document.getElementById('aiWorkshopCloseBtn').addEventListener('click', () => {
            this.closeAiWorkshop();
        });

        // 各应用头部右上角的"返回工坊"按钮（点击返回AI工坊菜单页）
        document.querySelectorAll('.ai-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showWorkshopHome();
            });
        });
        
        // 工坊应用卡片点击事件
        document.querySelectorAll('.workshop-app-card').forEach(card => {
            card.addEventListener('click', () => {
                const appName = card.dataset.app;
                this.openWorkshopApp(appName);
            });
        });
        
        // 文字游戏事件
        const genBtn = document.getElementById('generateGameBtn');
        if (genBtn) {
            genBtn.addEventListener('click', (e) => {
                // Immediate UI hide to mirror dual-view toggle behavior (avoid flicker)
                try { document.body.classList.add('immersive-mode'); } catch(e) {}
                try {
                    const sb = document.getElementById('sidebar');
                    const sp = document.getElementById('statsPanel');
                    if (sb) sb.classList.add('hidden');
                    if (sp) sp.classList.add('hidden');
                } catch (e) {}
                this.startTextGame();
            });
        }
        const demoBtn = document.getElementById('useDemoGameBtn');
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                this.useDemoTextGame && this.useDemoTextGame();
            });
        }
        const regenBtn = document.getElementById('textGameRegenerateBtn');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => {
                this.startTextGame();
            });
        }
        const exitBtn = document.getElementById('textGameExitBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                // restore keyword selector and go back to workshop home
                this.restoreKeywordSelector && this.restoreKeywordSelector();
                // exit immersive mode when leaving the text game
                try { document.body.classList.remove('immersive-mode'); } catch(e) {}
                // exit dual view if active
                if (document.body.classList.contains('textgame-dual-view')) {
                    this.toggleTextGameDualView();
                }
                try {
                    const sb = document.getElementById('sidebar');
                    const sp = document.getElementById('statsPanel');
                    if (sb) { sb.classList.remove('hidden'); sb.classList.remove('mobile-show'); }
                    if (sp) { sp.classList.remove('hidden'); sp.classList.remove('mobile-show'); }
                } catch (e) {}
                this.showWorkshopHome();
            });
        }

        // 文字游戏双页展示切换按钮
        const tgDualBtn = document.getElementById('toggleTextGameDualViewBtn');
        if (tgDualBtn) {
            tgDualBtn.addEventListener('click', () => {
                this.toggleTextGameDualView();
            });
        }
        
        // 返回工坊按钮（已从同义替换页 header 移除，与其他三个应用统一；保留逻辑供其它入口复用）
        // 同义替换练习事件
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

        // 关闭同义词词单浏览视图
        document.getElementById('closeSynonymWordListViewBtn').addEventListener('click', () => {
            this.closeSynonymWordListView();
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

        // AI写作相关事件 - contenteditable 单层方案
        const writingEditor = document.getElementById('writingEditor');
        if (writingEditor) {
            let isComposing = false;
            let needsRerender = false;

            // IME 输入法开始（中文/日文输入）
            writingEditor.addEventListener('compositionstart', () => {
                isComposing = true;
            });

            // IME 输入法结束
            writingEditor.addEventListener('compositionend', () => {
                isComposing = false;
                // IME 结束后立即处理
                this._saveCursorPos(writingEditor);
                this.handleWritingEditorInput(writingEditor);
            });

            // 输入事件（过滤 IME 中间状态）
            writingEditor.addEventListener('input', (e) => {
                if (isComposing) return;
                this.handleWritingEditorInput(writingEditor);
            });

            // 按键事件：保存光标 + 处理 Enter
            writingEditor.addEventListener('keydown', (e) => {
                // 保存当前光标位置（在按键生效前）
                this._saveCursorPos(writingEditor);

                // Enter 键：手动插入 <br> 保持结构一致
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                    e.preventDefault();
                    this._insertLineBreak(writingEditor);
                }
            });

            // 粘贴事件：清理 HTML，只保留纯文本
            writingEditor.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                this._insertTextAtCursor(writingEditor, text);
            });

            // 聚焦时恢复光标
            writingEditor.addEventListener('focus', () => {
                this._restoreCursorPos(writingEditor, this._savedCursorPos);
            });
        }
        const generateWritingBtn = document.getElementById('generateWritingBtn');
        if (generateWritingBtn) {
            generateWritingBtn.addEventListener('click', () => this.generateWriting());
        }
        const clearWritingBtn = document.getElementById('clearWritingBtn');
        if (clearWritingBtn) {
            clearWritingBtn.addEventListener('click', () => this.clearWriting());
        }
        const toggleCefrMarkBtn = document.getElementById('toggleCefrMarkBtn');
        if (toggleCefrMarkBtn) {
            toggleCefrMarkBtn.addEventListener('click', () => this.toggleCefrMark());
        }
        // 等级筛选按钮 Beg./Int./Adv.
        document.querySelectorAll('.level-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                const isActive = btn.classList.contains('active');
                document.querySelectorAll('.level-filter').forEach(b => b.classList.remove('active'));
                if (!isActive) {
                    btn.classList.add('active');
                    this._activeLevelFilter = btn.dataset.filter;
                } else {
                    this._activeLevelFilter = null;
                }
                this.applyLevelFilter();
            });
        });
        // 单个等级徽章点击
        document.querySelectorAll('.level-badge').forEach(badge => {
            badge.addEventListener('click', () => {
                const level = badge.dataset.level;
                if (this._badgeHighlight === level) {
                    this._badgeHighlight = null;
                    badge.classList.remove('dimmed');
                    document.querySelectorAll('.writing-render-area .cefr-word').forEach(w => w.classList.remove('dimmed'));
                } else {
                    document.querySelectorAll('.level-badge').forEach(b => b.classList.remove('dimmed'));
                    this._badgeHighlight = level;
                    document.querySelectorAll('.writing-render-area .cefr-word').forEach(w => {
                        if (w.dataset.level && w.dataset.level !== level) {
                            w.classList.add('dimmed');
                        } else {
                            w.classList.remove('dimmed');
                        }
                    });
                }
            });
        });
        // AI 评估按钮（score-btn 只显示，不做AI评估 - 保持本地）
        const scoreBtn = document.getElementById('scoreBtn');
        if (scoreBtn) {
            scoreBtn.addEventListener('click', () => this.showScoreDetail());
        }
        // tip-btn 提示点击
        const tipBtn = document.getElementById('tipBtn');
        if (tipBtn) {
            tipBtn.addEventListener('click', () => this.handleTipTap());
        }
        // 主题选择变化时更新题目卡片
        const topicSelect = document.getElementById('writingTopic');
        if (topicSelect) {
            topicSelect.addEventListener('change', () => this.updateTopicCard());
        }

        // 计时器按钮（短按开始/暂停，长按3s结束）
        const timerBtn = document.getElementById('writingTimerBtn');
        if (timerBtn) {
            let longPressTimer = null;
            let isLongPress = false;
            timerBtn.addEventListener('click', (e) => {
                if (isLongPress) { isLongPress = false; return; }
                this.toggleTimer();
            });
            timerBtn.addEventListener('mousedown', () => {
                if (!this._timerRunning) return;
                isLongPress = false;
                longPressTimer = setTimeout(() => {
                    isLongPress = true;
                    this.vibrate();
                    if (confirm(`本次计时：${this._timerDisplay}\n确定要结束计时吗？`)) {
                        this.stopTimer();
                        this.showToast('已结束计时');
                    } else {
                        isLongPress = false;
                    }
                }, 3000);
            });
            const cancelLongPress = () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            };
            timerBtn.addEventListener('mouseup', cancelLongPress);
            timerBtn.addEventListener('mouseleave', cancelLongPress);
            timerBtn.addEventListener('touchstart', (e) => {
                if (!this._timerRunning) return;
                isLongPress = false;
                longPressTimer = setTimeout(() => {
                    isLongPress = true;
                    this.vibrate();
                    if (confirm(`本次计时：${this._timerDisplay}\n确定要结束计时吗？`)) {
                        this.stopTimer();
                        this.showToast('已结束计时');
                    } else {
                        isLongPress = false;
                    }
                }, 3000);
            });
            timerBtn.addEventListener('touchend', cancelLongPress);
            timerBtn.addEventListener('touchcancel', cancelLongPress);
        }

        // 底部 5 图标导航
        const navLikeBtn = document.getElementById('navLikeBtn');
        if (navLikeBtn) {
            navLikeBtn.addEventListener('click', () => {
                this._isLiked = !this._isLiked;
                navLikeBtn.classList.toggle('liked', this._isLiked);
                this.showToast(this._isLiked ? '已收藏' : '已取消收藏', this._isLiked ? 'success' : 'info');
                this.vibrate();
            });
        }
        const navDeleteBtn = document.getElementById('navDeleteBtn');
        if (navDeleteBtn) {
            navDeleteBtn.addEventListener('click', () => {
                if (confirm('确定要清空当前内容吗？')) {
                    this.handleWritingInput('');
                    this.showToast('已清空', 'info');
                    this.vibrate();
                }
            });
        }
        const navPhotoBtn = document.getElementById('navPhotoBtn');
        if (navPhotoBtn) {
            navPhotoBtn.addEventListener('click', () => {
                this.showToast('拍照识别功能开发中', 'info');
                this.vibrate();
            });
        }
        const navCopyBtn = document.getElementById('navCopyBtn');
        if (navCopyBtn) {
            navCopyBtn.addEventListener('click', () => {
                const editor = document.getElementById('writingEditor');
                const text = editor ? editor.textContent : '';
                if (!text) { this.showToast('暂无内容可复制', 'error'); return; }
                this.copyToClipboard(text);
                this.showToast('已复制到剪贴板', 'success');
                this.vibrate();
            });
        }
        const navSettingBtn = document.getElementById('navSettingBtn');
        if (navSettingBtn) {
            navSettingBtn.addEventListener('click', () => {
                this.openSettingPanel();
                this.vibrate();
            });
        }

        // 设置面板
        const settingCloseBtn = document.getElementById('settingCloseBtn');
        if (settingCloseBtn) settingCloseBtn.addEventListener('click', () => this.closeSettingPanel());
        const settingOverlay = document.getElementById('settingOverlay');
        if (settingOverlay) {
            settingOverlay.addEventListener('click', (e) => {
                if (e.target === settingOverlay) this.closeSettingPanel();
            });
        }
        const settingCefrSwitch = document.getElementById('settingCefrSwitch');
        if (settingCefrSwitch) {
            settingCefrSwitch.checked = !!this._cefrMarkEnabled;
            settingCefrSwitch.addEventListener('change', (e) => {
                if (e.target.checked !== this._cefrMarkEnabled) this.toggleCefrMark();
            });
        }
        const settingDebounceSwitch = document.getElementById('settingDebounceSwitch');
        if (settingDebounceSwitch) {
            settingDebounceSwitch.addEventListener('change', (e) => {
                this._inputDebounce = e.target.checked;
                Storage.saveSection('aiWorkspace', { writingInputDebounce: this._inputDebounce ? '1' : '0' });
            });
        }
        // 读取持久化设置
        try {
            const ws = Storage.loadSection('aiWorkspace') || {};
            const db = ws.writingInputDebounce !== undefined ? ws.writingInputDebounce : localStorage.getItem('writingInputDebounce');
            if (db !== null && db !== undefined) {
                this._inputDebounce = db === '1';
                if (settingDebounceSwitch) settingDebounceSwitch.checked = this._inputDebounce;
            } else {
                this._inputDebounce = false;  // 默认不防抖，保持原版实时
            }
        } catch (err) { this._inputDebounce = false; }
        // CEFR 持久化读取
        try {
            const ws = Storage.loadSection('aiWorkspace') || {};
            const saved = ws.cefrMarkEnabled !== undefined ? ws.cefrMarkEnabled : localStorage.getItem('cefrMarkEnabled');
            if (saved !== null && saved !== undefined) {
                this._cefrMarkEnabled = saved === '1';
                const wrapper = document.querySelector('.writing-input-wrapper');
                if (wrapper) wrapper.classList.toggle('cefr-active', this._cefrMarkEnabled);
                const label = document.getElementById('cefrMarkLabel');
                if (label) label.textContent = this._cefrMarkEnabled ? '关闭染色' : '开启染色';
            }
        } catch (err) {}

        // AI纠正 持久化读取
        try {
            const ws = Storage.loadSection('aiWorkspace') || {};
            const aiSaved = ws.aiCorrectionEnabled !== undefined ? ws.aiCorrectionEnabled : localStorage.getItem('aiCorrectionEnabled');
            if (aiSaved !== null && aiSaved !== undefined) {
                this._aiCorrectionEnabled = aiSaved === '1';
            }
        } catch (err) {}
        const settingAiSwitch = document.getElementById('settingAiSwitch');
        if (settingAiSwitch) {
            settingAiSwitch.checked = !!this._aiCorrectionEnabled;
            settingAiSwitch.addEventListener('change', (e) => {
                this.toggleAiCorrection(e.target.checked);
            });
        }

        // 创建纠错弹窗容器
        if (!document.getElementById('correctionPopup')) {
            const popupContainer = document.createElement('div');
            popupContainer.id = 'correctionPopup';
            document.body.appendChild(popupContainer);
        }

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
                // 已在主页时直接返回
                const welcomeEl = document.getElementById('welcomeScreen');
                if (welcomeEl && !welcomeEl.classList.contains('hidden')) {
                    this.backToHome();
                    return;
                }
                // 非主页：弹出确认提示（进度不会保存）
                const exitModal = document.getElementById('exitLearningModal');
                if (exitModal) {
                    const titleEl = exitModal.querySelector('.modal-header h3');
                    const bodyEl = exitModal.querySelector('.modal-body p');
                    if (titleEl) titleEl.textContent = '回到主页';
                    if (bodyEl) bodyEl.innerHTML = '即将回到主页，<br>进度将不会保存。';
                    exitModal.classList.remove('hidden');
                } else {
                    if (confirm('即将回到主页，进度将不会保存。')) {
                        this.backToHome();
                    }
                }
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

        // 记忆方法 refresh 按钮（PC端卡片 + 移动端弹窗）：跳过缓存强制重新请求AI
        const refreshPcBtn = document.getElementById('refreshMemoryAidBtn');
        if (refreshPcBtn) {
            refreshPcBtn.addEventListener('click', () => {
                this.showMemoryAid(true);
            });
        }
        const refreshMobileBtn = document.getElementById('refreshMemoryAidMobileBtn');
        if (refreshMobileBtn) {
            refreshMobileBtn.addEventListener('click', () => {
                this.showMemoryAid(true);
            });
        }

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
                
                // 第一步：用正则提取所有英文单词；Excel 等文件无原始文本时回退到解析器已识别的单词
                let extractedWords = WordParser.extractEnglishWords(result.rawContent);
                if (extractedWords.length === 0 && Array.isArray(result.words) && result.words.length > 0) {
                    extractedWords = result.words;
                }

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
            row.style.backgroundColor = 'color-mix(in srgb, var(--success) 12%, transparent)';
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
                    row.style.backgroundColor = 'color-mix(in srgb, var(--success) 12%, transparent)'; // 淡绿色（主题成功色）
                    setTimeout(() => {
                        row.style.backgroundColor = '';
                    }, 800);
                }
            }
        }

        console.log(`📊 已更新表格：第 ${startIndex + 1}-${startIndex + enrichedBatch.length} 行`);
        
        // 🎯 补缺了一批之后，自动将最新一批的末尾滚动到可视区域中间
        this.scrollWordListToRowByIndex(startIndex + enrichedBatch.length - 1);
    }

    /**
     * 将词单表格滚动到指定行（data-word-index），使该行居中显示在可视区域
     * @param {number} rowIndex - 目标行的 data-word-index
     */
    scrollWordListToRowByIndex(rowIndex) {
        const wrapper = document.querySelector('.word-list-table-wrapper');
        const tbody = document.querySelector('#wordListTable tbody');
        if (!wrapper || !tbody) return;
        
        const row = tbody.querySelector(`tr[data-word-index="${rowIndex}"]`);
        if (!row) return;
        
        const rowTop = row.offsetTop;
        const targetScroll = rowTop - wrapper.clientHeight / 2 + row.offsetHeight / 2;
        wrapper.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
        });
    }

    /**
     * 过滤A1级基础词汇
     * @param {Array} words - 单词列表
     * @returns {Promise<Array>} - 过滤后的单词列表
     */
    async filterBasicWords(words) {
        // A1级基础词汇：优先取自内置 CEFR 词单（data/cefr-data.js 的 CEFR_DATA.A1），
        // 若数据未加载则回退到内置的常用基础词集合
        let a1BasicWords = new Set();
        try {
            const a1List = this.cefrData && this.cefrData['A1'];
            if (a1List && a1List.length > 0) {
                a1List.forEach(w => a1BasicWords.add(String(w).toLowerCase().trim()));
            }
        } catch (e) { /* 忽略 */ }

        if (a1BasicWords.size === 0) {
            // 兜底：内置的常见 A1 基础词汇（约200个最常用词）
            a1BasicWords = new Set([
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
            "white", "red", "green", "pink", "yellow", "blue", "orange", "purple", "brown", "gray", "ing", "ed", "s",
             "ly", "er", "est", "tion", "ment", "ness", "ity", "able", "ible", "al", "ful", "less", "ous", "ive", "y"
            ]);
        }

        // 无论是否包含A1词汇，都弹出确认窗口，让用户以列表形式确认导入哪些单词
        const selectedWords = await this.showBasicWordsDialog(words, a1BasicWords);

        // 返回用户确认要导入的单词（保持原顺序）
        return selectedWords;
    }

    /**
     * 显示单词导入确认对话框
     * @param {Array} words - 本次导入的全部单词
     * @param {Set} a1BasicWords - A1级基础词汇集合，命中的单词将高亮且默认不勾选
     * @returns {Promise<Array>} - 用户确认导入的单词（保持原顺序）
     */
    async showBasicWordsDialog(words, a1BasicWords) {
        return new Promise((resolve) => {
            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'basic-words-dialog';
            dialog.innerHTML = `
                <div class="basic-words-overlay"></div>
                <div class="basic-words-content">
                    <h3>🔍 导入单词确认</h3>
                    <p class="basic-words-hint">
                        本次共识别到 <strong>${words.length}</strong> 个单词。请勾选需要导入的单词：<br>
                        蓝色高亮为A1基础词汇（如 the, in, of 等），默认<strong>不勾选</strong>；如需导入请手动勾选。
                    </p>
                    <div class="basic-words-actions">
                        <button class="btn-text" id="selectAllBasicWords">全选</button>
                        <button class="btn-text" id="deselectAllBasicWords">全不选</button>
                    </div>
                    <div class="basic-words-list">
                        ${words.map((wordObj, index) => {
                            const isA1 = a1BasicWords.has((wordObj.word || '').toLowerCase());
                            // 默认勾选：非A1勾选，A1不勾选
                            return `
                            <label class="basic-word-item${isA1 ? ' basic-word-item-a1' : ''}">
                                <input type="checkbox" value="${index}" class="basic-word-checkbox" ${isA1 ? '' : 'checked'}>
                                <span class="basic-word-text">${wordObj.word}${isA1 ? '<span class="basic-word-a1-tag">A1</span>' : ''}</span>
                            </label>
                        `;
                        }).join('')}
                    </div>
                    <div class="basic-words-model-row">
                        <label for="basicAiModel">AI识别模型：</label>
                        <select id="basicAiModel" class="form-select basic-words-model" data-ai-model-select data-short-label="true" title="选择用于AI补充单词信息的模型"></select>
                    </div>
                    <div class="basic-words-buttons">
                        <button class="btn-secondary" id="cancelBasicWords">取消所有导入</button>
                        <button class="btn-primary" id="confirmBasicWords">确认导入以上（0）个</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // 统一填充 AI 识别模型下拉（内置 + 自定义 + 添加自定义模型入口）
            this.initAiModelSelects();
            const modelSelect = dialog.querySelector('#basicAiModel');
            // 同步当前生效模型（统一系统会记住上次选择 aiModel_basicAiModel）
            if (modelSelect && modelSelect.value) {
                this.selectedAiImportModel = modelSelect.value;
            }
            modelSelect.addEventListener('change', () => {
                this.selectedAiImportModel = modelSelect.value;
            });

            // 获取确认按钮
            const confirmBtn = document.getElementById('confirmBasicWords');
            
            // 更新按钮文本的函数
            const updateConfirmButtonText = () => {
                const checkedCount = dialog.querySelectorAll('.basic-word-checkbox:checked').length;
                confirmBtn.textContent = `确认导入以上（${checkedCount}）个`;
            };
            // 初始化按钮文本（反映默认已勾选的非A1单词数）
            updateConfirmButtonText();
            
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
                resolve([]); // 返回空数组表示不导入任何单词
            });

            // 确认
            document.getElementById('confirmBasicWords').addEventListener('click', () => {
                const checkboxes = dialog.querySelectorAll('.basic-word-checkbox:checked');
                const selectedWords = Array.from(checkboxes).map(cb => words[parseInt(cb.value)]);
                
                console.log(`✓ 用户确认导入 ${selectedWords.length} 个单词`);
                
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
            // 使用所选AI模型补充
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
                },
                this.selectedAiImportModel, // 用户在导入确认窗口选择的AI模型
                this.aiEnrichCancelToken // 取消令牌：点击"终止"时中断本轮补缺
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
                        , this.selectedAiImportModel, // 复用导入确认窗口选择的AI模型
                        this.aiEnrichCancelToken // 取消令牌：点击"终止"时中断补充遗漏的补缺
                    );
                    
                    console.log(`✅ 遗漏数据补充完成`);

        } catch (error) {
                    // 用户主动终止时，将取消标记上传给外层统一处理（保存已补内容、不弹降级框）
                    if (error && error.message === AIService.CANCEL_ERROR) {
                        throw error;
                    }
                    console.error('补充遗漏数据失败:', error);
                }
                
                this.hideAIProgress();
            } else {
                console.log(`✓ 所有单词数据完整`);
            }
            
            // 显示补充完成的提示
            await this.showSmartImportCompleteDialog(enrichedWords, analysis);
            
        } catch (aiError) {
            // 🛑 用户点击"终止"按钮：保存当前已补充的内容并结束，不视为失败
            if (aiError && aiError.message === AIService.CANCEL_ERROR) {
                console.log('🛑 用户终止了AI补缺，保存已补充内容');
                this.hideAIProgress();
                
                // words 与 tempSmartImportBook.words 是同一引用，表格与临时词书均已实时更新，直接统计已补充的数量
                const completedCount = words.filter(w =>
                    w.definitions && w.definitions[0] && w.definitions[0].meaning &&
                    w.definitions[0].meaning.trim() !== '' && w.definitions[0].meaning !== '-'
                ).length;
                
                alert(`🛑 已终止AI补缺\n\n已保存 ${completedCount}/${words.length} 个单词的补充内容。\n\n可继续编辑后导入，或稍后再点"补缺"继续。`);
                return;
            }
            
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

        // 🔧 重要：先保存所有未保存的编辑内容
        // 如果用户在编辑模式下输入了内容但还没保存，先保存这些编辑
        if (this.isWordListEditMode) {
            console.log('💾 检测到编辑模式，先保存所有编辑内容...');
            this.saveAllWordListEdits();
            
            // 重新获取词书数据（因为保存后可能更新了）
            const updatedBook = this.tempSmartImportBook || 
                              (this.currentWordListBookId ? Storage.getBook(this.currentWordListBookId) : null);
            if (updatedBook) {
                // 使用最新的词书数据
                currentBook.words = updatedBook.words;
                currentBook.id = updatedBook.id;
                currentBook.name = updatedBook.name;
                console.log('✅ 已更新词书数据，当前单词数:', currentBook.words.length);
                
                // 打印保存后的前5个单词，确认数据已更新
                console.log('📝 保存后词书前5个单词:');
                currentBook.words.slice(0, 5).forEach((w, i) => {
                    console.log(`  ${i}: "${w.word || '(空)'}" - 音标:${w.phonetic||'缺'} 释义:${w.definitions?.[0]?.meaning?'有':'缺'}`);
                });
            }
        }

        console.log('🔍 开始检查词单缺失字段...');
        console.log(`📚 当前词书ID: ${currentBook.id}`);
        console.log(`📚 当前词书名称: ${currentBook.name}`);
        console.log(`📚 当前词书单词数: ${currentBook.words.length}`);
        
        // 打印前5个单词的状态
        console.log('📝 词书前5个单词状态:');
        currentBook.words.slice(0, 5).forEach((w, i) => {
            console.log(`  ${i}: ${w.word || '(空)'} - 音标:${w.phonetic||'缺'} 释义:${w.definitions?.[0]?.meaning?'有':'缺'} 例句:${w.definitions?.[0]?.example?'有':'缺'}`);
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
                    let lastUpdatedIndex = 0; // 记录本批末尾行的索引，供滚动定位
                    for (const enrichedWord of enrichedBatch) {
                        const originalIndex = currentBook.words.findIndex(
                            w => w.word.toLowerCase() === enrichedWord.word.toLowerCase()
                        );

                        if (originalIndex !== -1) {
                            console.log(`🔄 更新单词 "${enrichedWord.word}" (索引 ${originalIndex})`);
                            
                            // 打印更新前的数据
                            const oldWord = currentBook.words[originalIndex];
                            console.log(`  📥 更新前: 音标="${oldWord.phonetic||'空'}" 释义="${oldWord.definitions?.[0]?.meaning?.substring(0,20)||'空'}..."`);
                            
                            // 保留原单词的其他属性（如收藏状态、学习统计等）
                            const updatedWord = {
                                ...oldWord,  // 保留原有属性
                                word: enrichedWord.word,
                                phonetic: enrichedWord.phonetic || oldWord.phonetic || '',
                                definitions: enrichedWord.definitions || oldWord.definitions || []
                            };
                            
                            // 更新原词书中的数据
                            currentBook.words[originalIndex] = updatedWord;
                            
                            // 打印更新后的数据
                            console.log(`  📤 更新后: 音标="${updatedWord.phonetic||'空'}" 释义="${updatedWord.definitions?.[0]?.meaning?.substring(0,20)||'空'}..."`);

                            // 直接更新表格单元格
                            this.updateSingleWordInTable(updatedWord, originalIndex);
                            
                            lastUpdatedIndex = originalIndex;
                        } else {
                            console.warn(`⚠️ 未找到单词 "${enrichedWord.word}"`);
                        }
                    }
                    
                    // 🎯 补缺了一批之后，自动将最新一批的末尾滚动到可视区域中间
                    this.scrollWordListToRowByIndex(lastUpdatedIndex);
                    
                    // 每批完成后立即保存到localStorage（如果不是临时词书）
                    if (!this.tempSmartImportBook) {
                        console.log(`💾 准备保存第 ${batchIndex} 批数据到localStorage...`);
                        console.log(`  词书ID: ${currentBook.id}`);
                        
                        // 保存前验证 currentBook 中的数据
                        if (enrichedBatch.length > 0) {
                            const testWord = enrichedBatch[0];
                            const wordInCurrentBook = currentBook.words.find(w => w.word === testWord.word);
                            console.log(`  📤 保存前验证 currentBook 中 "${testWord.word}": 音标="${wordInCurrentBook?.phonetic}" 释义="${wordInCurrentBook?.definitions?.[0]?.meaning?.substring(0, 20)}..."`);
                        }
                        
                        Storage.updateBook(currentBook.id, currentBook);
                        
                        // 验证保存
                        const savedBook = Storage.getBook(currentBook.id);
                        console.log(`  ✓ 保存验证: 词书有 ${savedBook.words.length} 个单词`);
                        
                        // 验证第一个更新的单词是否保存成功
                        if (enrichedBatch.length > 0) {
                            const testWord = enrichedBatch[0];
                            const savedWord = savedBook.words.find(w => w.word === testWord.word);
                            if (savedWord) {
                                console.log(`  📥 保存后验证 "${testWord.word}": 音标="${savedWord.phonetic}" 释义="${savedWord.definitions?.[0]?.meaning?.substring(0, 20)}..."`);
                            } else {
                                console.error(`  ❌ 保存后未找到单词 "${testWord.word}"`);
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
                },
                this.selectedAiImportModel || this.getLastUsedModel(), // 用户选择的AI模型
                this.aiEnrichCancelToken // 取消令牌：点击"终止"时中断补缺
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
            // 🛑 用户点击"终止"按钮：已补充的批次在此前已逐批写入词书并保存，刷新表格后提示
            if (error && error.message === AIService.CANCEL_ERROR) {
                console.log('🛑 用户终止了补缺，已补充的内容已保存');
                this.hideAIProgress();
                
                const freshBook = this.tempSmartImportBook || Storage.getBook(currentBook.id);
                if (freshBook) {
                    this.renderWordListTable(freshBook);
                }
                
                alert('🛑 已终止补缺\n\n已补充的内容已保存，可稍后再点"补缺"继续。');
                return;
            }
            
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
            // 跳过没有单词内容的行（完全空白的行）
            if (!word.word || word.word.trim() === '') {
                continue;
            }
            
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
        
        // 初始化本轮AI补缺的取消控制（每次显示进度条时重置，支持再次补缺）
        // 取消令牌贯穿整轮补缺；ai-service 会在其中挂上真实 AbortController 供终止按钮中断在途请求
        this.aiEnrichCancelToken = { cancelled: false };
        
        // 显示并启用终止按钮，绑定点击事件（只绑定一次）
        const cancelBtn = document.getElementById('aiProgressCancelBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-flex';
            cancelBtn.disabled = false;
            if (!cancelBtn.dataset.bound) {
                cancelBtn.dataset.bound = '1';
                cancelBtn.addEventListener('click', () => {
                    this.requestCancelAIEnrichment();
                });
            }
        }
    }

    /**
     * 用户点击"终止"按钮：请求终止当前AI补缺
     * 置取消标记并中断在途网络请求；已补充的内容由各调用方的 catch 分支负责保存
     */
    requestCancelAIEnrichment() {
        if (this.aiEnrichCancelToken) {
            this.aiEnrichCancelToken.cancelled = true;
            // 中断当前在途的网络请求（AbortController 由 ai-service 挂载到令牌上）
            if (this.aiEnrichCancelToken.abortController) {
                try {
                    this.aiEnrichCancelToken.abortController.abort();
                } catch (e) { /* 忽略 */ }
            }
        }
        const cancelBtn = document.getElementById('aiProgressCancelBtn');
        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.textContent = '正在终止...';
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
        
        // 复位取消控制，避免影响后续轮次的补缺
        this.aiEnrichCancelToken = null;
        
        // 隐藏并复位终止按钮
        const cancelBtn = document.getElementById('aiProgressCancelBtn');
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.textContent = '终止';
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
        
        // 移动端：自动关闭侧边栏弹窗
        this.closeMobileSidebar();
        
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

        // 决定使用哪种模式（返回上一题时沿用上次的答题模式）
        let mode;
        if (this.modeOverride) {
            mode = this.modeOverride;
            this.modeOverride = null;
        } else {
            mode = this.decideMode();
        }
        this.currentMode = mode;

        if (mode === 'select') {
            this.showSelectMode(word);
        } else if (mode === 'spell') {
            this.showSpellMode(word);
        } else if (mode === 'remember') {
            this.showRememberMode(word);
        }

        // 更新收藏状态显示
        this.updateFavoriteDisplay(word.favorite || false);

        // 自动播放发音
        if (this.settings.autoSound) {
            setTimeout(() => this.playSound(), 300);
        }
    
    // 预取下一个单词的发音（提前准备，减少切换时延迟）
    try {
        const nextIdx = this.currentWordIndex + 1;
        const nextWordObj = this.sessionWords[nextIdx];
        if (nextWordObj) {
            this.prepareNextWordSpeech(nextWordObj.word);
        } else {
            // 无下一词时清除已预取的内容
            this.preparedUtterance = null;
        }
    } catch (e) {
        console.warn('预取下一个单词发音失败:', e);
    }
    }

    // 决定学习模式
    decideMode() {
        const mode = this.settings.learningMode || 'selectOnly';
        const modesArray = mode.split(',');
        
        // 单选情况
        if (modesArray.length === 1) {
            if (modesArray[0] === 'selectOnly') return 'select';
            if (modesArray[0] === 'spellOnly') return 'spell';
            if (modesArray[0] === 'rememberOnly') return 'remember';
            if (modesArray[0] === 'mixed') return Math.random() < 0.5 ? 'select' : 'spell'; // 兼容旧版数据
        }
        
        // 多选情况（或使用当前UI上的激活按钮作为后备）
        const modes = [];
        if (modesArray.length > 1) {
            modesArray.forEach(m => {
                if (m === 'selectOnly') modes.push('select');
                else if (m === 'spellOnly') modes.push('spell');
                else if (m === 'rememberOnly') modes.push('remember');
            });
        } else {
            const activeBtns = document.querySelectorAll('#learningModeButtons .switch-btn.active');
            activeBtns.forEach(btn => {
                if (btn.dataset.mode === 'selectOnly') modes.push('select');
                else if (btn.dataset.mode === 'spellOnly') modes.push('spell');
                else if (btn.dataset.mode === 'rememberOnly') modes.push('remember');
            });
        }
        
        if (modes.length === 0) return 'select'; // 兜底返回看单词选释义
        return modes[Math.floor(Math.random() * modes.length)];
    }

    // 显示选择模式
    showSelectMode(word) {
        document.getElementById('modeSelectMeaning').classList.remove('hidden');
        document.getElementById('modeSpellWord').classList.add('hidden');
        document.getElementById('modeRemember').classList.add('hidden');
        // 离开拼写模式，清理光标呼吸状态
        document.body.classList.remove('spell-cursor-on', 'spell-typing');
        
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

    // 记得么模式"如何记忆？"：先显示释义（例句之上），再请求AI记忆方法
    showRememberMeaningAid() {
        const currentWord = this.sessionWords[this.currentWordIndex];
        const def = currentWord?.definitions?.[0];
        // 显示前置释义
        const section = document.getElementById('rememberMeaningSection');
        if (section) {
            section.classList.remove('hidden');
            const meaning = def?.meaning || '暂无释义';
            const text = document.getElementById('rememberMeaningText');
            if (text) text.textContent = meaning;
        }
        // 再请求AI记忆方法
        this.showMemoryAid();
    }

    // 显示记忆方法（forceRefresh=true 时绕过缓存并使其失效，强制重新请求AI）
    async showMemoryAid(forceRefresh = false) {
        const currentWord = this.sessionWords[this.currentWordIndex];
        if (!currentWord) return;

        console.log('💡 显示记忆方法:', currentWord.word);

        // 计算缓存key（单词+模型），不同模型生成的内容单独缓存
        const model = this.getActiveMemoryModel();
        const cacheKey = `${currentWord.word.replace(/\|/g, '')}|${model}`;

        if (!this.memoryAidCache) this.memoryAidCache = {};

        // 强制刷新：先清掉旧缓存，避免失败/竞态导致旧内容回写
        if (forceRefresh) {
            delete this.memoryAidCache[cacheKey];
        }

        // 命中缓存且未强制刷新：直接使用缓存内容，避免频繁调用AI
        if (!forceRefresh && this.memoryAidCache[cacheKey]) {
            console.log('💾 命中记忆方法缓存:', cacheKey);
            this.renderMemoryAid(this.memoryAidCache[cacheKey]);
            return;
        }

        // 请求序号：快速连续点击/请求并发时，只允许最新一次请求回写缓存与渲染
        const reqSeq = (this.memoryAidReqSeq = (this.memoryAidReqSeq || 0) + 1);

        // 显示加载状态
        const loadingHtml = `
            <div class="memory-loading">
                <div class="loading-spinner"></div>
                <p>正在生成记忆方法...</p>
            </div>
        `;
        this.renderMemoryAid(loadingHtml);

        // 调用API获取记忆方法
        const memoryContent = await this.getMemoryAidFromAI(currentWord);

        // 若期间又发起了更新的请求，丢弃本次结果，避免旧回复覆盖新缓存
        if (reqSeq !== this.memoryAidReqSeq) {
            console.log('↩️ 丢弃过期的记忆方法响应（已有更新的请求）');
            return;
        }

        // 最新一次请求的结果写入缓存（刷新获得的最新AI回复成为最新缓存）
        this.memoryAidCache[cacheKey] = memoryContent;

        this.renderMemoryAid(memoryContent);
    }

    // 渲染记忆方法内容（PC端卡片 / 移动端弹窗）
    renderMemoryAid(html) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            const modal = document.getElementById('memoryAidModal');
            const modalBody = document.getElementById('memoryAidModalBody');
            if (modalBody) modalBody.innerHTML = html;
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('show');
            }
        } else {
            const card = document.getElementById('memoryAidCard');
            const content = document.getElementById('memoryAidContent');
            if (content) content.innerHTML = html;
            if (card) {
                card.classList.remove('hidden');
                card.classList.add('show');
            }
        }
    }

    // 获取当前生效的记忆方法模型，并让 PC/移动端两个下拉始终同步一致。
    // 注意：不能依赖元素可见性（弹窗开合会改变 hidden 状态导致缓存key漂移），
    // 必须保证同一次会话内多次调用返回同一稳定值。
    getActiveMemoryModel() {
        const memModelEl = document.getElementById('memoryAidModel');
        const memModelElM = document.getElementById('memoryAidModelMobile');
        const pcVal = memModelEl ? memModelEl.value : '';
        const mobileVal = memModelElM ? memModelElM.value : '';

        // 移动端弹窗打开时以弹窗选择为准，否则以 PC 卡片选择为准；两边同步一致
        const modal = document.getElementById('memoryAidModal');
        const modalOpen = modal && !modal.classList.contains('hidden');
        let model = '';
        if (modalOpen && mobileVal) {
            model = mobileVal;
            if (memModelEl) memModelEl.value = mobileVal;
        } else if (pcVal) {
            model = pcVal;
            if (memModelElM) memModelElM.value = pcVal;
        } else if (mobileVal) {
            model = mobileVal;
        }

        return model || this.getLastUsedModel() || '';
    }

    // 调用AI模型获取记忆方法
    async getMemoryAidFromAI(wordData) {
        try {
            const apiKey = AIService.getApiKey();
            if (!apiKey) {
                return `
                    <div class="memory-method-section">
                        <div class="memory-method-title">⚠️ 未配置API密钥</div>
                        <div class="memory-method-content">
                            <p>请先在设置中配置API密钥才能使用AI记忆辅助功能。</p>
                            <p>前往 设置 → AI工坊设置 → 配置API密钥</p>
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

            // 使用用户在卡片/弹窗中选择的模型（复用 getActiveMemoryModel 保证与缓存key一致）
            const memoryModel = this.getActiveMemoryModel();

            const aiResponse = await AIService.callModel(memoryModel, prompt, {
                temperature: 0.7,
                max_tokens: 1000
            });

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
            this.showRememberMeaningAid();
            return;
        }
        
        // 立即转移焦点到隐藏元素（移动端修复）
        this.clearFocus();
        
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
                const autoNextTime = parseFloat(this.settings.autoNextTime || 1);
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
            
            // 如果是在记得么模式下，也显示“如何记忆？”按钮逻辑
            const isRememberMode = !document.getElementById('modeRemember').classList.contains('hidden');
            if (isRememberMode) {
                const notRememberBtn = document.getElementById('notRememberBtn');
                if (notRememberBtn) {
                    notRememberBtn.textContent = '如何记忆？';
                    notRememberBtn.onclick = () => this.showRememberMeaningAid();
                }
            }
            
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
        
        // 最后再次确保转移焦点（移动端修复）
        setTimeout(() => {
            this.clearFocus();
        }, 50);
    }
    
    // 清除焦点：将焦点转移到隐藏元素（移动端修复）
    clearFocus() {
        const focusTrap = document.getElementById('focusTrap');
        if (focusTrap) {
            focusTrap.focus();
            // 立即再blur，确保没有任何元素有焦点
            setTimeout(() => focusTrap.blur(), 10);
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

    // 显示记得么模式
    showRememberMode(word) {
        document.getElementById('modeSelectMeaning').classList.add('hidden');
        document.getElementById('modeSpellWord').classList.add('hidden');
        document.getElementById('modeRemember').classList.remove('hidden');
        // 离开拼写模式，清理光标呼吸状态
        document.body.classList.remove('spell-cursor-on', 'spell-typing');
        
        // 隐藏"下一个"按钮
        document.getElementById('nextBtn').style.display = 'none';

        document.getElementById('rememberWordText').textContent = word.word;
        document.getElementById('rememberWordPhonetic').textContent = word.phonetic || '';
        
        // 隐藏释义区容器和释义文本
        document.getElementById('rememberMeaningDisplay').classList.add('hidden');
        document.getElementById('rememberMeaningDisplay').classList.remove('meaning-unknown');
        document.getElementById('rememberMeaningSection').classList.add('hidden');
        const notRememberBtn = document.getElementById('notRememberBtn');
        if (notRememberBtn) {
            notRememberBtn.textContent = '不记得';
            notRememberBtn.disabled = false;
            notRememberBtn.classList.remove('memory-aid-btn'); // 移除黄色特效
            notRememberBtn.classList.remove('not-remember-active'); // 清除命中反馈
            notRememberBtn.onclick = () => this.handleRememberClick(false);
        }

        // 清除“记得”按钮的命中反馈
        const rememberBtnReset = document.getElementById('rememberBtn');
        if (rememberBtnReset) rememberBtnReset.classList.remove('btn-remember-active');

        // 填充角标：记得=③(option1)，不记得=④(option2)
        const hotkeys = this.settings.hotkeys || {
            option1: '1', option2: '2', option3: '3',
            option4: '4', option5: '5', option6: '6'
        };
        // 填充角标：记得=③(option1)，不记得=④(option2)
        // 注意：不记得按钮在复位时用 textContent 覆盖，会清空内部角标 span，
        // 因此这里统一用 innerHTML 重建并填充角标，确保两个角标都显示。
        if (rememberBtnReset) {
            rememberBtnReset.innerHTML = '记得 <span class="hotkey-hint" id="rememberHotkey"></span>';
        }
        const rememberHotkey = document.getElementById('rememberHotkey');
        if (rememberHotkey) rememberHotkey.textContent = hotkeys.option1;

        const notRememberBtnEl = document.getElementById('notRememberBtn');
        if (notRememberBtnEl) {
            notRememberBtnEl.innerHTML = '不记得 <span class="hotkey-hint" id="notRememberHotkey"></span>';
        }
        const notRememberHotkey = document.getElementById('notRememberHotkey');
        if (notRememberHotkey) notRememberHotkey.textContent = hotkeys.option2;
        
        // 更新统计显示
        this.updateWordStatsDisplay(word, 3); // 3 为记得么模式的 badge ID 后缀
        
        // 显示上次答题记录
        this.showLastWordBadge('lastWordBadge3');

        // 显示等级
        const cefrLevel = this.getWordCEFRLevel(word.word);
        const posElement = document.getElementById('rememberWordPos');
        if (cefrLevel) {
            posElement.textContent = cefrLevel;
            posElement.className = `word-pos cefr-${cefrLevel.toLowerCase()}`;
            posElement.style.display = 'inline-block';
        } else {
            posElement.style.display = 'none';
        }

        // 隐藏例句
        const exampleContainer = document.getElementById('wrongAnswerExample');
        if (exampleContainer) {
            exampleContainer.classList.remove('show');
        }

        // 关闭记忆方法
        this.closeMemoryAid();
    }

    // 处理记得么模式的点击
    handleRememberClick(isRemember) {
        const word = this.sessionWords[this.currentWordIndex];
        if (!word) return;

        // 按下按钮的颜色反馈（参考模式1 option-btn 的命中态）
        const rememberBtn = document.getElementById('rememberBtn');
        const notRememberBtn = document.getElementById('notRememberBtn');
        // 命中反馈仅作用于“记得”按钮；点“不记得”时保持按钮原样，不再添加任何命中类
        if (isRemember) {
            const rememberBtn = document.getElementById('rememberBtn');
            if (rememberBtn) rememberBtn.classList.add('btn-remember-active');
        }

        if (isRemember) {
            // 记得：直接下一个
            if (!this.wordFirstResults[this.currentWordIndex]) {
                this.wordFirstResults[this.currentWordIndex] = 'correct';
                this.sessionResults.correct++;
                this.updateWordStats(word, true);
                
                if (this.isReviewMode) {
                    this.removeCorrectWordFromWrongList(word);
                }
                this.updateBookProgress();
                this.updateStatsRealtime();
            }
            
            this.playAnimation(true);
            this.playCorrectSound();

            // 短暂延迟以展示“记得”按钮的命中反馈，再进入下一题
            setTimeout(() => {
                this.nextWord();
            }, 450);
        } else {
            // 不记得：只显示例句（不显示释义），释义等点击"如何记忆？"后再显示
            document.getElementById('rememberMeaningDisplay').classList.remove('hidden');
            document.getElementById('rememberMeaningDisplay').classList.add('meaning-unknown');
            
            // 释义区域保持隐藏（点击"如何记忆？"后才显示）
            document.getElementById('rememberMeaningSection').classList.add('hidden');
            
            // 提取并显示例句
            const def = word.definitions && word.definitions[0];
            const example = def?.example || '';
            const exampleTextElem = document.getElementById('rememberExampleText');
            if (example) {
                this.currentExample = example; // 保存当前例句，供点击重放
                exampleTextElem.innerHTML = this.highlightWordInExample(example, word.word, 'unknown');
            } else {
                this.currentExample = '';
                exampleTextElem.textContent = '（该单词暂无例句）';
            }
            
            // 将"不记得"按钮转变为"如何记忆？"按钮，并附加特定的黄色样式类
            const notRememberBtn = document.getElementById('notRememberBtn');
            if (notRememberBtn) {
                notRememberBtn.textContent = '如何记忆？';
                notRememberBtn.classList.add('memory-aid-btn');
                notRememberBtn.onclick = () => {
                    // 点击后：显示前置释义，并请求AI
                    this.showRememberMeaningAid();
                };
            }
            
            this.selectOption('不知道', example);
        }
    }

    // 显示拼写模式
    showSpellMode(word) {
        document.getElementById('modeSelectMeaning').classList.add('hidden');
        document.getElementById('modeSpellWord').classList.remove('hidden');
        document.getElementById('modeRemember').classList.add('hidden');
        
        // 拼写模式不显示"下一个"按钮，答对后自动进入下一题
        document.getElementById('nextBtn').style.display = 'none';

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
        
        // 更新"提示"和"不知道"按钮的快捷键显示（与 remember-actions 一致：提示=option1，不知道=option2）
        const hotkeys = this.settings.hotkeys || {
            option1: '1', option2: '2', option3: '3',
            option4: '4', option5: '5', option6: '6'
        };
        const hintHotkey = document.getElementById('hintHotkey');
        if (hintHotkey) hintHotkey.textContent = hotkeys.option1;

        const unknownHotkeyElement = document.getElementById('unknownSpellHotkey');
        if (unknownHotkeyElement) {
            unknownHotkeyElement.textContent = hotkeys.option2;
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

    // 标记拼写"输入中"（暂停当前槽位呼吸动画，保证输入时不闪晃）
    markSpellTyping() {
        document.body.classList.add('spell-typing');
        if (this.spellTypingTimer) clearTimeout(this.spellTypingTimer);
        this.spellTypingTimer = setTimeout(() => {
            document.body.classList.remove('spell-typing');
            this.spellTypingTimer = null;
        }, 500);
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
            
            // 拼写模式无"下一个"按钮：答对后自动进入下一题
            if (this.settings.autoNext) {
                const autoNextTime = parseFloat(this.settings.autoNextTime || 1);
                if (autoNextTime > 0) {
                    this.autoNextTimer = setTimeout(() => {
                        this.nextWord();
                    }, autoNextTime * 1000);
                    return;
                }
            }
            this.nextWord();
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
            const autoNextTime = parseFloat(this.settings.autoNextTime || 1);
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
        
        // 转移焦点（移动端修复）
        this.clearFocus();

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
                originalIndex: currentWord.originalIndex, // 原始索引，用于收藏功能
                mode: this.currentMode // 本次答题使用的模式，返回上一题时沿用
            };
        }

        document.getElementById('nextBtn').disabled = true;
        this.currentWordIndex++;
        this.showWord();
    }

    // 返回上一个单词重新背诵（点击上一题标记）
    goToLastWord() {
        if (!this.lastWordInfo) return;

        // 上一个单词的索引：exact currentWordIndex - 1
        const prevIndex = this.currentWordIndex - 1;
        if (prevIndex < 0 || !this.sessionWords[prevIndex]) return;

        // 保证待返回索引对应的是 lastWordInfo 记录的单词，避免复习/乱序时错位
        const prevWord = this.sessionWords[prevIndex];
        if (prevWord.originalIndex !== this.lastWordInfo.originalIndex) return;

        // 清除自动下一题计时器，避免返回后又被切走
        if (this.autoNextTimer) {
            clearTimeout(this.autoNextTimer);
            this.autoNextTimer = null;
        }

        // 重置该单词的答题记录，允许重新作答
        this.wordResults[prevIndex] = undefined;
        this.wordFirstResults[prevIndex] = undefined;

        // 锁定本次展示使用与上次回答相同的模式
        this.modeOverride = this.lastWordInfo.mode || null;

        // 跳回上一题并重新展示
        this.currentWordIndex = prevIndex;
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
        // 计算实际学习时长（考虑暂停的情况）
        let elapsed = 0;
        if (this.effectiveStartTime) {
            // 如果当前处于暂停状态，使用暂停时的累计时长
            if (this.isPausedDueToInactivity && this.pausedElapsedMinutes > 0) {
                elapsed = this.pausedElapsedMinutes;
            } else {
                // 否则计算从有效开始时间到现在的时长
                elapsed = (Date.now() - this.effectiveStartTime) / 60000; // 分钟（保留小数）
            }
        } else {
            // 兼容旧逻辑：如果没有有效开始时间，使用原始开始时间
            elapsed = (Date.now() - this.startTime) / 60000;
        }
        
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
            // 如果已经为该单词预取了 utterance，直接立刻播放并清除预取缓存（跳过防抖延时）
            if (this.preparedUtterance && this.preparedUtterance.text === wordText) {
                try {
                    if (this.speakTimeout) {
                        clearTimeout(this.speakTimeout);
                        this.speakTimeout = null;
                    }
                    if (speechSynthesis.speaking) {
                        speechSynthesis.cancel();
                    }
                    // 添加必要的回调以保持日志行为一致
                    this.preparedUtterance.onerror = (event) => {
                        if (event.error !== 'interrupted') {
                            console.error('❌ 发音错误:', event.error);
                        }
                    };
                    this.preparedUtterance.onend = () => {
                        console.log('✅ 发音完成:', wordText);
                    };
                    console.log('🔊 使用预取发音立即播放:', wordText);
                    speechSynthesis.speak(this.preparedUtterance);
                } catch (err) {
                    console.warn('使用预取发音播放失败，回退常规流程:', err);
                } finally {
                    this.preparedUtterance = null;
                }
                return;
            }
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

    // 预取下一个单词的发音（构建并缓存 SpeechSynthesisUtterance，降低切换时的准备开销）
    prepareNextWordSpeech(nextWordText) {
        try {
            if (!nextWordText) {
                this.preparedUtterance = null;
                return;
            }

            // 如果已经为相同单词预取过，则无需重复
            if (this.preparedUtterance && this.preparedUtterance.text === nextWordText) {
                return;
            }

            // 创建并配置 utterance，但不立即播放
            const utt = new SpeechSynthesisUtterance(nextWordText);
            utt.lang = this.settings.voiceAccent || 'en-US';
            utt.rate = this.settings.voiceRate || 1.0;
            utt.pitch = 1.0;
            utt.volume = 1.0;

            if (this.settings.voiceModel && this.availableVoices && this.availableVoices.length > 0) {
                const selected = this.availableVoices.find(v => v.name === this.settings.voiceModel);
                if (selected) utt.voice = selected;
            } else if (this.availableVoices && this.availableVoices.length > 0) {
                const langPrefix = (this.settings.voiceAccent || 'en-US').split('-')[0];
                const candidates = this.availableVoices.filter(v => v.lang.startsWith(langPrefix));
                if (candidates.length > 0) utt.voice = candidates[0];
            }

            // 不绑定 onend/onerror：在实际播放时再绑定，以避免重复打印
            this.preparedUtterance = utt;
            console.log('🔊 已预取发音:', nextWordText);
        } catch (error) {
            console.warn('⚠️ 预取发音失败:', error);
            this.preparedUtterance = null;
        }
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

        // 移动端：把 badge 移到学习头部居中显示；桌面端：还原到各自卡片头部
        this.placeLastWordBadge(badgeId);

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

        // 点击上一题标记主体 → 返回上一个单词重新背诵
        badge.addEventListener('click', (e) => {
            // 忽略对收藏按钮的点击（已 stopPropagation，此处兜底）
            if (e.target.closest('.btn-favorite-badge')) return;
            this.goToLastWord();
        });
    }

    // 根据屏幕宽度调整 badge 位置：移动端放入学习头部（返回与发音之间居中），桌面端还原到各自卡片头部
    placeLastWordBadge(activeBadgeId) {
        const badgeIds = ['lastWordBadge1', 'lastWordBadge2', 'lastWordBadge3'];
        const isMobile = window.innerWidth <= 768;
        const mobileHeader = document.getElementById('learningMobileHeader');
        const originalContainers = {
            lastWordBadge1: document.getElementById('modeSelectMeaning')?.querySelector('.card-header'),
            lastWordBadge2: document.getElementById('modeSpellWord')?.querySelector('.card-header'),
            lastWordBadge3: document.getElementById('modeRemember')?.querySelector('.card-header')
        };

        badgeIds.forEach(id => {
            const b = document.getElementById(id);
            if (!b) return;

            if (isMobile && mobileHeader) {
                // 移动端：只有当前激活模式的 badge 显示（其余隐藏），并移入学习头部
                if (id === activeBadgeId) {
                    if (b.parentElement !== mobileHeader) mobileHeader.appendChild(b);
                } else {
                    b.style.display = 'none';
                }
            } else {
                // 桌面端：还原到各自卡片头部
                const original = originalContainers[id];
                if (original && b.parentElement !== original) {
                    original.appendChild(b);
                }
            }
        });
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
        const applyTheme = () => {
            document.documentElement.setAttribute('data-theme', newTheme);
            Storage.saveTheme(newTheme);
        };
        // 刷新星云：先按新主题重建核心文字色，但页面整体主题色等加载动画结束后统一切换，
        // 避免出现"一部分CSS已提前切换新颜色"的跳变。
        let refreshing = false;
        if (typeof NebulaCover !== 'undefined' && NebulaCover.refresh) {
            refreshing = true;
            NebulaCover.refresh(newTheme, () => {
                applyTheme();
            });
        }
        if (!refreshing) applyTheme();
    }

    // 打开设置
    openSettings() {
        document.getElementById('settingsModal').classList.remove('hidden');
        
        // 加载当前设置
        // 学习模式 - 使用多选交互逻辑
        const learningMode = this.settings.learningMode || 'selectOnly';
        const activeModes = learningMode.split(','); // 支持旧版的 'mixed' 或新版的逗号分隔

        document.querySelectorAll('#learningModeButtons .switch-btn').forEach(btn => {
            btn.classList.remove('active');
            
            // 兼容旧版的 mixed 逻辑，如果旧版存了 mixed，默认勾选模式1和模式2
            if (learningMode === 'mixed') {
                if (btn.dataset.mode === 'selectOnly' || btn.dataset.mode === 'spellOnly') {
                    btn.classList.add('active');
                }
            } else if (activeModes.includes(btn.dataset.mode)) {
                // 如果当前按钮在已保存的模式数组中
                btn.classList.add('active');
            }
            // 添加多选点击事件
            btn.onclick = () => {
                const activeBtns = document.querySelectorAll('#learningModeButtons .switch-btn.active');
                if (btn.classList.contains('active')) {
                    // 如果已经是激活状态，尝试取消激活（至少保留一个）
                    if (activeBtns.length > 1) {
                        btn.classList.remove('active');
                    } else {
                        alert('请至少选择一种背诵方式');
                    }
                } else {
                    btn.classList.add('active');
                }
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

        // 加载AI API配置（多厂商 sheet）
        this.renderAiProviderTabs();
        this.loadAiProviderForm();

        // 加载自动保存统计数据设置
        document.getElementById('autoSaveStats').checked = this.settings.autoSaveStats !== false; // 默认开启

        // 渲染自定义模型列表（当前厂商）
        this.renderCustomModelList();

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
            this.initSettingSelects(); // 声优列表重建后刷新设置下拉
        });

        // 同步设置下拉的自绘UI（在全部 select 值赋值完后刷新触发器与面板）
        this.initSettingSelects();
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
            case 'page':
                contentId = 'pageSettings';
                // 加载页面设置数据
                this.loadPageSettings();
                break;
        }
        
        const activeContent = document.getElementById(contentId);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    // 保存设置
    saveSettings() {
        // 默认封面：仅在页面设置下拉被同步过（进入过"页面"tab）时才读取控件值，
        // 否则沿用已保存的值，避免保存其他设置时把星云封面重置为"单词导入"。
        const wordsPerSession = parseInt(document.getElementById('wordsPerSession').value);
        
        // 验证单词数量
        if (isNaN(wordsPerSession) || (wordsPerSession < -1 || wordsPerSession === 0)) {
            alert('请输入有效的单词数量（-1表示无限，或大于0的数字）');
            return;
        }

        // 从多选按钮获取学习模式
        const activeBtns = document.querySelectorAll('#learningModeButtons .switch-btn.active');
        
        let learningMode = 'selectOnly';
        if (activeBtns.length === 0) {
            learningMode = 'selectOnly'; // 降级保护
        } else if (activeBtns.length === 1) {
            learningMode = activeBtns[0].dataset.mode;
        } else {
            // 多选情况，收集所有选中的模式
            const modes = Array.from(activeBtns).map(btn => btn.dataset.mode);
            // 这里我们用逗号分隔保存，例如 "selectOnly,spellOnly"
            learningMode = modes.join(',');
        }

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
            // AI 多厂商配置：先把表单写入当前激活厂商，再整体保存 aiProviders
            ...this.collectAiProviderSettings(),
            hotkeys: {
                option1: document.getElementById('hotkey1').value,
                option2: document.getElementById('hotkey2').value,
                option3: document.getElementById('hotkey3').value,
                option4: document.getElementById('hotkey4').value,
                option5: document.getElementById('hotkey5').value,
                option6: document.getElementById('hotkey6').value
            },
            defaultCover: this._getSavedDefaultCover()
        };

        Storage.saveSettings(this.settings);
        this.closeSettings();
        this.applyCoverMode(); // 封面模式可能变化，立即刷新
        alert('设置已保存');
    }

    // 读取已保存的默认封面：下拉被同步过才读控件值，否则保留原设置
    _getSavedDefaultCover() {
        const el = document.getElementById('defaultCover');
        if (el && el.dataset.synced) return el.value;
        return this.settings.defaultCover || 'import';
    }

    // 加载页面设置
    loadPageSettings() {
        const cover = this.settings.defaultCover || 'import';
        const el = document.getElementById('defaultCover');
        if (el) {
            el.value = cover;
            el.dataset.synced = '1'; // 标记已同步过，保存时才允许读取该下拉的值
            // 同步自绘下拉的触发器显示
            if (el._settingPickerBuilt) this._refreshSettingPicker(el);
        }
    }

    // 重置设置
    resetSettings() {
        if (confirm('确定要恢复默认设置吗？')) {
            this.settings = {
                learningMode: 'selectOnly',
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
                autoNextTime: 1,
                aiApiFormat: 'openai', // AI API 格式（openai/anthropic）
                aiApiBaseUrl: '', // AI API 自定义请求地址
                aiApiKey: '', // 默认为空，用户需要自己配置
                aiProviders: [{ name: '未命名', baseUrl: '', apiFormat: 'openai', apiKey: '', models: [] }], // AI 多厂商配置
                aiActiveProviderIndex: 0, // 当前激活厂商索引
                hotkeys: {
                    option1: '1',
                    option2: '2',
                    option3: '3',
                    option4: '4',
                    option5: '5',
                    option6: '6'
                },
                defaultCover: 'import'
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
            // 考虑暂停的情况：如果处于暂停状态，不更新时长（暂停期间不计入学习时长）
            if (this.isPausedDueToInactivity) {
                // 暂停期间不更新时长，只更新答题统计
                const currentStats = Storage.loadStats();
                const wordsToAdd = this.isReviewMode ? 0 : newTotal;
                
                Storage.updateStats({
                    words: currentStats.words + wordsToAdd,
                    correct: currentStats.correct + newCorrect,
                    wrong: currentStats.wrong + newWrong + newUnknown
                });
                
                // 更新界面显示
                this.updateStats();
                
                console.log(`📊 实时统计更新（暂停中，不计时长）- 新增: ${newTotal}词 (✓${newCorrect} ✗${newWrong} ?${newUnknown})`);
                return;
            }
            
            // 正常情况：计算时长并更新
            let currentElapsed = 0;
            if (this.effectiveStartTime) {
                currentElapsed = (Date.now() - this.effectiveStartTime) / 60000;
            } else {
                // 兼容旧逻辑
                currentElapsed = (Date.now() - this.startTime) / 60000;
            }
            
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
            
            // 更新基础分钟数和有效开始时间，下次只计算增量时间
            this.baseMinutes = currentStats.time;
            if (this.effectiveStartTime) {
                this.effectiveStartTime = Date.now();
                // 更新定时器的基础时间（不重启，只是更新内部变量）
                this.baseMinutes = currentStats.time;
            } else {
                // 兼容旧逻辑
                this.startTime = Date.now();
            }
            
            // 更新界面显示
            this.updateStats();
            
            const mode = this.isReviewMode ? '复习' : '学习';
            console.log(`📊 实时统计更新(${mode}) - 新增: ${newTotal}词 (✓${newCorrect} ✗${newWrong} ?${newUnknown})${this.isReviewMode ? ' [不计入学习单词数]' : ''}`);
        }
    }

    // 启动今日统计显示定时器（每秒更新时长显示）
    startStatsDisplayTimer(customStartTime = null, customBaseMinutes = null) {
        // 清除可能存在的旧定时器
        this.stopStatsDisplayTimer();
        
        // 记录基础统计（分钟数）
        const baseStats = Storage.loadStats();
        // 如果提供了自定义基础分钟数，使用它；否则使用存储的统计
        const baseMinutes = customBaseMinutes !== null ? customBaseMinutes : (baseStats.time || 0);
        // 如果提供了自定义开始时间，使用它；否则使用 this.startTime
        let effectiveStartTime = customStartTime !== null ? customStartTime : this.startTime;
        
        if (!effectiveStartTime) {
            console.warn('⚠️ 无法启动统计显示定时器：开始时间未设置');
            return;
        }
        
        // 初始化活动跟踪
        this.lastActivityTime = Date.now();
        this.isPausedDueToInactivity = false;
        this.pausedTime = null;
        this.pausedElapsedMinutes = 0;
        this.effectiveStartTime = effectiveStartTime; // 存储可修改的开始时间
        this.baseMinutes = baseMinutes; // 存储基础分钟数
        
        // 启动活动跟踪监听器
        this.startActivityTracking();
        
        // 每秒更新一次时长显示（不保存到storage）
        this.statsDisplayTimer = setInterval(() => {
            // 检查用户活动状态
            const now = Date.now();
            const inactiveDuration = now - this.lastActivityTime; // 无活动时长（毫秒）
            const INACTIVE_THRESHOLD = 3 * 60 * 1000; // 3分钟（毫秒）
            
            // 如果超过3分钟无活动，暂停计时
            if (inactiveDuration >= INACTIVE_THRESHOLD && !this.isPausedDueToInactivity) {
                // 计算暂停前的累计时长
                const elapsedBeforePause = (this.lastActivityTime - this.effectiveStartTime) / 60000;
                this.pausedElapsedMinutes = elapsedBeforePause;
                this.pausedTime = this.lastActivityTime;
                this.isPausedDueToInactivity = true;
                console.log(`⏸️ 检测到3分钟无活动，已暂停计时（暂停前时长: ${elapsedBeforePause.toFixed(2)}分钟）`);
            }
            
            // 如果用户恢复活动，继续计时
            if (inactiveDuration < INACTIVE_THRESHOLD && this.isPausedDueToInactivity) {
                // 恢复计时：调整开始时间，使得累计时长 = 暂停时的时长 + (当前时间 - 恢复时间)
                const resumeTime = Date.now();
                // 调整开始时间：newStartTime = resumeTime - pausedElapsedMinutes
                this.effectiveStartTime = resumeTime - (this.pausedElapsedMinutes * 60000);
                this.isPausedDueToInactivity = false;
                this.pausedTime = null;
                console.log(`▶️ 检测到用户活动，已恢复计时（恢复前累计: ${this.pausedElapsedMinutes.toFixed(2)}分钟）`);
                this.pausedElapsedMinutes = 0;
            }
            
            // 如果处于暂停状态，不更新计时
            if (this.isPausedDueToInactivity) {
                // 显示暂停时的时长（不增加）
                const totalMinutes = this.baseMinutes + this.pausedElapsedMinutes;
                const minutes = Math.floor(totalMinutes);
                const seconds = Math.floor((totalMinutes - minutes) * 60);
                const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                
                const timeElement = document.getElementById('todayTime');
                if (timeElement && timeElement.textContent !== timeStr) {
                    timeElement.textContent = timeStr;
                }
                return;
            }
            
            // 计算经过的总秒数（从调整后的开始时间计算）
            const elapsedSeconds = Math.floor((Date.now() - this.effectiveStartTime) / 1000);
            // 转换为分钟（小数）
            const elapsedMinutes = elapsedSeconds / 60;
            // 总时长（分钟）= 基础时长 + 当前session的时长
            const totalMinutes = this.baseMinutes + elapsedMinutes;
            
            // 转换为 MM:SS 格式
            const minutes = Math.floor(totalMinutes);
            const seconds = Math.floor((totalMinutes - minutes) * 60);
            const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            const timeElement = document.getElementById('todayTime');
            if (!timeElement) {
                // 如果元素不存在（比如不在统计面板可见的页面），跳过更新
                return;
            }
            
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
        
        console.log('⏱️ 今日统计显示定时器已启动（MM:SS格式，防挂机保护已启用）');
    }
    
    // 启动用户活动跟踪
    startActivityTracking() {
        // 绑定函数以便后续移除监听器
        this.activityTrackerBound = this.trackUserActivity.bind(this);
        
        // 监听各种用户活动事件
        const events = ['mousedown', 'mousemove', 'keydown', 'keypress', 'scroll', 'touchstart', 'touchmove', 'click', 'wheel'];
        events.forEach(event => {
            document.addEventListener(event, this.activityTrackerBound, { passive: true });
        });
        
        console.log('👆 用户活动跟踪已启动（防挂机保护）');
    }
    
    // 停止用户活动跟踪
    stopActivityTracking() {
        if (this.activityTrackerBound) {
            const events = ['mousedown', 'mousemove', 'keydown', 'keypress', 'scroll', 'touchstart', 'touchmove', 'click', 'wheel'];
            events.forEach(event => {
                document.removeEventListener(event, this.activityTrackerBound);
            });
            this.activityTrackerBound = null;
            console.log('👆 用户活动跟踪已停止');
        }
    }
    
    // 跟踪用户活动
    trackUserActivity() {
        // 更新最后一次活动时间
        this.lastActivityTime = Date.now();
        
        // 如果当前处于暂停状态，恢复计时
        if (this.isPausedDueToInactivity) {
            console.log('▶️ 检测到用户活动，恢复计时');
            // 恢复逻辑在定时器中处理
        }
    }
    
    // 停止今日统计显示定时器
    stopStatsDisplayTimer() {
        if (this.statsDisplayTimer) {
            clearInterval(this.statsDisplayTimer);
            this.statsDisplayTimer = null;
            console.log('⏱️ 今日统计显示定时器已停止');
        }
        
        // 停止活动跟踪
        this.stopActivityTracking();
        
        // 重置活动跟踪状态
        this.lastActivityTime = null;
        this.isPausedDueToInactivity = false;
        this.pausedTime = null;
        this.pausedElapsedMinutes = 0;
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
                // 拼写模式无"下一个"按钮，答对后已自动切换，Enter 不再切题（避免重复跳题）
                if (document.getElementById('nextBtn').style.display === 'none') {
                    return;
                }
                this.nextWord();
                return;
            }
            
            // 拼写模式快捷键（与 remember-actions 相同映射：提示=option1，不知道=option2，无需 Shift）
            const spellMode = document.getElementById('modeSpellWord');
            if (spellMode && !spellMode.classList.contains('hidden')) {
                const hotkeys = this.settings.hotkeys || {
                    option1: '1', option2: '2', option3: '3',
                    option4: '4', option5: '5', option6: '6'
                };

                // 提示：与"记得"（rememberA）相同热键
                if (e.key === hotkeys.option1) {
                    e.preventDefault();
                    this.showHint();
                    return;
                }

                // 不知道：与"不记得"相同热键
                if (e.key === hotkeys.option2) {
                    e.preventDefault();
                    const unknownBtn = document.getElementById('unknownSpellBtn');
                    if (unknownBtn && !unknownBtn.disabled) this.skipSpellWord();
                    return;
                }

                // Shift+Q - 播放发音
                if (e.shiftKey && e.key.toUpperCase() === 'Q') {
                    e.preventDefault();
                    this.playSound();
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
        console.log('✅ 已使用新的用户存储架构');
    }

    // 修复历史统计数据（修复掌握率计算错误）
    fixHistoryData() {
        console.log('✅ 历史数据修复已由新存储架构处理');
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
        const allBooks = Storage.loadBooks();
        
        // 过滤掉损坏的词书数据（没有words数组或words不是数组）
        const validBooks = allBooks.filter(book => {
            if (!book.words || !Array.isArray(book.words)) {
                console.warn(`⚠️ 检测到损坏的词书数据，已自动跳过: "${book.name || '未命名'}" (ID: ${book.id || '未知'})`);
                return false;
            }
            return true;
        });
        
        // 如果有损坏的词书，更新Storage（移除损坏的数据）
        if (validBooks.length < allBooks.length) {
            console.log(`🔧 已清理 ${allBooks.length - validBooks.length} 个损坏的词书`);
            Storage.saveBooks(validBooks);
        }
        
        this.books = validBooks;
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

        // 在列表上方渲染“收藏词单”入口（显示所有被收藏的单词，作为虚拟词书）
        try {
            const favContainer = document.getElementById('favoriteBookContainer');
            if (favContainer) {
                favContainer.innerHTML = ''; // 清空
                const favVirtual = this.getFavoritesVirtualBook();
                if (favVirtual.words.length > 0) {
                    const favItem = document.createElement('div');
                    favItem.className = 'book-item';
                    if (this.currentBook && this.currentBook.id === favVirtual.id) {
                        favItem.classList.add('active');
                    }

                    const totalWords = favVirtual.words.length;
                    const bookIcon = favVirtual.icon || '⭐';

                    favItem.innerHTML = `
                        <div class="book-item-header">
                            <span class="book-item-icon">${bookIcon}</span>
                            <div class="book-item-name">${favVirtual.name}</div>
                            <div class="book-item-count">${totalWords}词</div>
                        </div>
                        <div class="book-item-progress">
                            已收藏：${totalWords} 个单词
                        </div>
                        <div class="book-item-time">汇总自所有词书</div>
                        <div class="book-item-actions">
                            <button class="btn-book-action" id="openFavoritesBtn">
                                查看
                            </button>
                            <button class="btn-book-action" id="learnFavoritesBtn">
                                开始学习
                            </button>
                        </div>
                    `;

                    favItem.querySelector('#openFavoritesBtn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openFavoritesWordList();
                    });
                    favItem.querySelector('#learnFavoritesBtn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.startFavoritesLearning();
                    });

                    favItem.addEventListener('click', (e) => {
                        if (!e.target.classList.contains('btn-book-action')) {
                            this.openFavoritesWordList();
                        }
                    });

                    favContainer.appendChild(favItem);
                } else {
                    favContainer.innerHTML = ''; // 无收藏则不显示
                }
            }
        } catch (err) {
            console.error('渲染收藏词单失败:', err);
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
            // 防御性检查（正常情况下不应该到这里，因为loadBooks已经过滤了）
            if (!book.words || !Array.isArray(book.words)) {
                return;
            }
            
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                    </button>
                    <button class="btn-book-action" onclick="app.startBookLearning('${book.id}')">
                        开始学习
                    </button>
                    <button class="btn-book-action btn-book-danger" onclick="app.deleteBookConfirm('${book.id}')">
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

    // 聚合所有词书中的收藏单词，返回一个虚拟词书对象
    getFavoritesVirtualBook() {
        const books = Storage.loadBooks();
        const seen = new Set();
        const favorites = [];

        books.forEach(book => {
            if (!book || !Array.isArray(book.words)) return;
            book.words.forEach((word, widx) => {
                if (word && word.favorite && word.word) {
                    const key = word.word.trim().toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        // 复制重要字段，保留来源信息与原始文本及索引，用于回写
                        favorites.push({
                            word: word.word,
                            phonetic: word.phonetic || '',
                            definitions: word.definitions ? JSON.parse(JSON.stringify(word.definitions)) : [{}],
                            favorite: true,
                            _sourceBookId: book.id,
                            _sourceWordIndex: widx,
                            _originalWord: word.word
                        });
                    }
                }
            });
        });
        // 添加全局收藏项（来自 Storage.loadFavoriteItems）
        try {
            const globalFavs = Storage.loadFavoriteItems();
            if (Array.isArray(globalFavs)) {
                globalFavs.forEach((item) => {
                    if (!item || !item.word) return;
                    const key = item.word.trim().toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        favorites.push({
                            word: item.word,
                            phonetic: item.phonetic || '',
                            definitions: item.definitions ? JSON.parse(JSON.stringify(item.definitions)) : [{ meaning: item.meaning || '', example: item.example || '' }],
                            favorite: true,
                            _sourceBookId: 'global',
                            _sourceWordIndex: undefined,
                            _originalWord: item.word
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('加载全局收藏项失败:', e);
        }

        return {
            id: 'favorites',
            name: '收藏词单',
            icon: '⭐',
            words: favorites,
            createdAt: new Date().toISOString()
        };
    }

    // 打开收藏词单的浏览页面（视为虚拟词书）
    openFavoritesWordList() {
        const virtual = this.getFavoritesVirtualBook();
        if (!virtual || virtual.words.length === 0) {
            alert('没有收藏的单词');
            return;
        }

        // 将当前词单切换为虚拟收藏词单（不保存到Storage）
        this.currentWordListBookId = 'favorites';
        this.favoritesVirtualBook = virtual;
        this.isWordListEditMode = false;
        document.getElementById('editModeText').textContent = '编辑';
        // 更新标题与图标
        document.getElementById('wordListIcon').textContent = virtual.icon || '⭐';
        document.getElementById('wordListBookName').textContent = virtual.name;
        document.getElementById('wordListTotalCount').textContent = virtual.words.length;
        // 显示词单页面并渲染表格
        this.showScreen('wordListScreen');
        this.renderWordListTable(virtual);

        // 在侧边栏高亮虚拟词书（设置 currentBook.id）
        this.currentBook = { id: 'favorites' };
        this.renderBookList();
    }

    // 检查某个单词是否已被收藏（来自任意词书或全局收藏）
    isWordFavorited(wordText) {
        if (!wordText) return false;
        const key = wordText.trim().toLowerCase();

        // 检查各词书中的收藏标记
        const books = Storage.loadBooks();
        for (const book of books) {
            if (!book || !Array.isArray(book.words)) continue;
            for (const w of book.words) {
                if (w && w.word && w.favorite && w.word.trim().toLowerCase() === key) {
                    return true;
                }
            }
        }

        // 检查全局收藏项
        const globals = Storage.loadFavoriteItems();
        if (Array.isArray(globals)) {
            for (const item of globals) {
                if (item && item.word && item.word.trim().toLowerCase() === key) {
                    return true;
                }
            }
        }

        return false;
    }

    // 在所有词书（包括全局收藏）中查找单词，返回找到的词对象及来源信息
    findWordInAllBooks(wordText) {
        if (!wordText) return null;
        const key = wordText.trim().toLowerCase();

        const books = Storage.loadBooks();
        for (const book of books) {
            if (!book || !Array.isArray(book.words)) continue;
            for (const w of book.words) {
                if (w && w.word && w.word.trim().toLowerCase() === key) {
                    return { word: w, source: 'book', bookId: book.id, bookName: book.name };
                }
            }
        }

        const globals = Storage.loadFavoriteItems() || [];
        for (const item of globals) {
            if (item && item.word && item.word.trim().toLowerCase() === key) {
                return { word: item, source: 'favorites', bookId: 'favorites', bookName: '收藏' };
            }
        }

        return null;
    }

    // 启动英文词典（data/englishwords-dict.js）后台静默加载：
    // 优先用 Web Worker 在后台线程加载并解析（不阻塞主线程交互），
    // Worker 不可用（如 file:// 环境）时退化为延迟注入 <script> 兜底。
    initEnglishDictionaryLoader() {
        if (this.englishDictInitStarted) return;
        this.englishDictInitStarted = true;
        this.englishDictReady = (typeof ENGLISHWORDS_DICT !== 'undefined' && !!ENGLISHWORDS_DICT); // 已被兜底脚本加载时的快速路径
        this.englishDictWorker = null;
        this.englishDictWaiters = new Map();
        this.englishDictSeq = 0;
        this.englishDictLoadPromise = null;

        const start = () => {
            if (this.englishDictReady) return;
            try {
                if (typeof Worker === 'undefined') throw new Error('Worker 不可用');
                const worker = new Worker('js/dictionary-worker.js');
                this.englishDictWorker = worker;
                const url = (new URL('data/englishwords-dict.js', location.href)).href;
                this.englishDictLoadPromise = new Promise((resolve) => {
                    worker.onmessage = (e) => {
                        const msg = e.data;
                        if (!msg) return;
                        if (msg.type === 'load-result') {
                            this.englishDictReady = !!msg.ok;
                            if (!msg.ok && this.englishDictWorker === worker) {
                                this.englishDictWorker = null;
                                this._injectEnglishDictScript(); // Worker 解析失败时兜底
                            }
                            const done = this.englishDictLoadPromise;
                            this.englishDictLoadPromise = null;
                            if (done) done(msg);
                        } else if (msg.type === 'lookup-result') {
                            const cb = this.englishDictWaiters.get(msg.id);
                            if (cb) {
                                this.englishDictWaiters.delete(msg.id);
                                cb(msg);
                            }
                        }
                    };
                    worker.onerror = () => {
                        if (this.englishDictWorker === worker) this.englishDictWorker = null;
                        this.englishDictLoadPromise = null;
                        this._injectEnglishDictScript();
                        resolve({ ok: false });
                    };
                    worker.postMessage({ type: 'load', url });
                });
            } catch (err) {
                this._injectEnglishDictScript();
            }
        };

        // 页面可交互后再启动，避免与首屏渲染争抢资源
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => start(), { timeout: 2000 });
        } else {
            setTimeout(start, 500);
        }
    }

    // 兜底：动态注入数据脚本（仅 Worker 不可用时触发，解析仍发生在主线程）
    _injectEnglishDictScript() {
        if (this.englishDictScriptInjected) return;
        this.englishDictScriptInjected = true;
        try {
            const s = document.createElement('script');
            s.src = 'data/englishwords-dict.js';
            s.async = true;
            s.onload = () => { this.englishDictReady = true; };
            s.onerror = () => { this.englishDictScriptInjected = false; };
            document.head.appendChild(s);
        } catch (err) {
            // 忽略注入失败（此时翻译自动回退到 AI）
        }
    }

    // 在英文词典（data/englishwords-dict.js 导出的 ENGLISHWORDS_DICT）中查找单词（异步，不阻塞主线程）
    async findDictionaryWord(wordText) {
        if (!wordText) return null;
        const key = wordText.trim().toLowerCase();

        // 快速路径：全局数据已就绪（Worker 已完成解析 / 兜底脚本已加载）
        if (typeof ENGLISHWORDS_DICT !== 'undefined' && ENGLISHWORDS_DICT) {
            const entry = ENGLISHWORDS_DICT[key];
            if (entry && Array.isArray(entry)) {
                return { word: key, pronunciation: entry[0] || '', meaning: entry[1] || '' };
            }
            return null;
        }

        const worker = this.englishDictWorker;
        if (!worker) return null;

        // 等待后台加载完成（带超时，避免首次翻译卡住等待）
        if (this.englishDictLoadPromise) {
            const settled = await Promise.race([
                this.englishDictLoadPromise.catch(() => ({ ok: false })),
                new Promise(resolve => setTimeout(() => resolve({ ok: false }), 2000))
            ]);
            if (!settled || !settled.ok) return null;
        }

        const id = ++this.englishDictSeq;
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.englishDictWaiters.delete(id);
                resolve(null);
            }, 1000);
            this.englishDictWaiters.set(id, (msg) => {
                clearTimeout(timeout);
                if (msg && msg.found && msg.entry && Array.isArray(msg.entry)) {
                    resolve({ word: key, pronunciation: msg.entry[0] || '', meaning: msg.entry[1] || '' });
                } else {
                    resolve(null);
                }
            });
            worker.postMessage({ type: 'lookup', id, key });
        });
    }

    // 专门处理收藏词单进入学习
    startFavoritesLearning() {
        const book = this.getFavoritesVirtualBook();
        if (!book || !book.words || book.words.length === 0) {
            alert('收藏列表为空');
            return;
        }

        this.currentBook = book;
        const sequence = Array.from({ length: book.words.length }, (_, i) => i);
        this.sessionWords = [];
        for (let i = 0; i < sequence.length; i++) {
            const wordObj = book.words[sequence[i]];
            this.sessionWords.push({
                ...wordObj,
                originalIndex: sequence[i],
                _bookId: 'favorites',
                _wordIndex: sequence[i]
            });
        }

        this.currentWordIndex = 0;
        this.sessionResults = { correct: 0, wrong: 0, unknown: 0 };
        this.wordResults = [];
        this.wordFirstResults = [];
        this.startTime = Date.now();
        this.showScreen('learningScreen');
        document.getElementById('sidebar').classList.remove('collapsed');
        this.closeMobileSidebar();
        this.startStatsDisplayTimer();
        this.showWord();
    }

    // 将一组翻译结果加入到统一的“全局收藏项”（显示在统一的收藏词单聚合中）
    addTranslationsToFavoritesBook(translatedArray) {
        if (!translatedArray || translatedArray.length === 0) {
            this.showToast('没有可收藏的翻译结果', 'info');
            return;
        }

        // 读取现有全局收藏项
        const existing = Storage.loadFavoriteItems() || [];
        const existingSet = new Set(existing.map(i => i.word.trim().toLowerCase()));

        let added = 0;
        translatedArray.forEach(item => {
            const w = (item.word || '').trim();
            if (!w) return;
            // 如果已在任意词书或全局收藏中存在，跳过
            if (this.isWordFavorited(w) || existingSet.has(w.toLowerCase())) return;

            const newItem = {
                word: w,
                phonetic: item.phonetic || '',
                definitions: item.definitions && item.definitions.length ? item.definitions : [{ meaning: item.meaning || '', example: item.example || '' }],
                createdAt: new Date().toISOString()
            };
            existing.push(newItem);
            existingSet.add(w.toLowerCase());
            added++;
        });

        Storage.saveFavoriteItems(existing);
        // 重新渲染侧栏和收藏视图
        this.loadBooks();

        if (added > 0) {
            this.showToast(`已将 ${added} 个翻译结果添加到收藏`, 'success');
        } else {
            this.showToast('翻译结果已存在于收藏中', 'info');
        }
    }

    // 修改开始学习逻辑，支持虚拟收藏词单（bookId === 'favorites'）
    startBookLearning(bookId) {
        if (bookId === 'favorites') {
            const book = this.getFavoritesVirtualBook();
            if (!book || !book.words || book.words.length === 0) {
                alert('收藏列表为空');
                return;
            }

            this.currentBook = book;
            // 不保存到Storage，直接使用简单顺序
            const sequence = Array.from({ length: book.words.length }, (_, i) => i);
            this.sessionWords = [];
            for (let i = 0; i < sequence.length; i++) {
                const wordObj = book.words[sequence[i]];
                this.sessionWords.push({
                    ...wordObj,
                    originalIndex: sequence[i],
                    _bookId: 'favorites',
                    _wordIndex: sequence[i]
                });
            }

            this.currentWordIndex = 0;
            this.sessionResults = { correct: 0, wrong: 0, unknown: 0 };
            this.wordResults = [];
            this.wordFirstResults = [];
            this.startTime = Date.now();
            this.showScreen('learningScreen');
            document.getElementById('sidebar').classList.remove('collapsed');
            this.closeMobileSidebar();
            this.startStatsDisplayTimer();
            this.showWord();
            return;
        }

        // 其它情况回退到原始实现
        const originalBook = Storage.getBook(bookId);
        if (!originalBook || !originalBook.words || originalBook.words.length === 0) {
            alert('该词书没有单词');
            return;
        }
        // (保留原实现 below)
        const book = originalBook;
        this.currentBook = book;
        Storage.saveCurrentBook(bookId);

        // 生成或加载学习顺序
        let sequence = book.progress && book.progress.sequence ? book.progress.sequence : [];
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
        
        // 移动端：自动关闭侧边栏弹窗
        this.closeMobileSidebar();
        
        // 启动今日统计显示定时器
        this.startStatsDisplayTimer();
        
        this.showWord();
    }

    // 选择词书
    selectBook(bookId) {
        this.currentBook = Storage.getBook(bookId);
        Storage.saveCurrentBook(bookId);
        this.renderBookList();
    }

    // (second duplicate of startBookLearning removed to keep the favorites-capable version)

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

            // 编辑列（根据编辑模式决定是否隐藏）
            const editCell = document.createElement('td');
            editCell.className = this.isWordListEditMode 
                ? 'word-list-cell word-list-cell-edit' 
                : 'word-list-cell word-list-cell-edit hidden';
            
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
            // 确保编辑列显示
            const editColumnHeader = document.getElementById('editColumnHeader');
            if (editColumnHeader) editColumnHeader.classList.remove('hidden');
            
            this.applyEditableState(true);
            // 确保按钮群显示
            const addButtons = document.getElementById('wordListAddButtons');
            if (addButtons) addButtons.classList.remove('hidden');
        } else {
            // 确保编辑列隐藏
            const editColumnHeader = document.getElementById('editColumnHeader');
            if (editColumnHeader) editColumnHeader.classList.add('hidden');
            
            // 确保按钮群隐藏
            const addButtons = document.getElementById('wordListAddButtons');
            if (addButtons) addButtons.classList.add('hidden');
        }
    }

    // 高亮例句中的单词
    highlightWordInExample(example, word, type = 'wrong') {
        if (!example || !word) return this.escapeHtml(example || '');
        
        // 转义HTML
        const escapedExample = this.escapeHtml(example);
        
        // 根据类型选择样式类
        const highlightClass = type === 'unknown' ? 'word-highlight-unknown' : (type === 'keyword' ? 'keyword-highlight' : 'word-list-highlight');
        
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
        const addButtons = document.getElementById('wordListAddButtons');
        
        if (this.isWordListEditMode) {
            // 进入编辑模式
            editColumnHeader.classList.remove('hidden');
            editCells.forEach(cell => cell.classList.remove('hidden'));
            editModeText.textContent = '完成';
            if (addButtons) addButtons.classList.remove('hidden');
            this.applyEditableState(true);
        } else {
            // 退出编辑模式
            editColumnHeader.classList.add('hidden');
            editCells.forEach(cell => cell.classList.add('hidden'));
            editModeText.textContent = '编辑';
            if (addButtons) addButtons.classList.add('hidden');
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
    
    // 检查单词表是否有未保存的改动（仅检测，不保存）
    isWordListDirty() {
        const isSmartImport = this.tempSmartImportBook && this.currentWordListBookId === 'temp_smart_import';
        const book = isSmartImport ? this.tempSmartImportBook : Storage.getBook(this.currentWordListBookId);
        if (!book) return false;

        const editableCells = document.querySelectorAll('.editable-cell');
        for (const cell of editableCells) {
            const wordIndex = parseInt(cell.dataset.wordIndex);
            const field = cell.dataset.field;
            const word = book.words[wordIndex];
            if (!word) continue;

            let newValue = cell.textContent.trim();
            if (newValue === '-') newValue = '';

            switch (field) {
                case 'word':
                    if (newValue && newValue !== word.word) return true;
                    break;
                case 'phonetic':
                    if (newValue !== word.phonetic) return true;
                    break;
                case 'meaning': {
                    const posMatch = cell.querySelector('.word-list-pos');
                    if (posMatch) {
                        newValue = newValue.replace(posMatch.textContent.trim(), '').trim();
                    }
                    const def = word.definitions && word.definitions[0] ? word.definitions[0] : {};
                    if (newValue !== def.meaning) return true;
                    break;
                }
                case 'example': {
                    const exampleDef = word.definitions && word.definitions[0] ? word.definitions[0] : {};
                    if (newValue !== exampleDef.example) return true;
                    break;
                }
            }
        }

        return false;
    }
    
    // 保存所有单词表编辑
    saveAllWordListEdits() {
        // 判断是否为临时词书（智能导入模式）
        const isSmartImport = this.tempSmartImportBook && this.currentWordListBookId === 'temp_smart_import';
        
        let book;
        if (isSmartImport) {
            book = this.tempSmartImportBook;
        } else if (this.currentWordListBookId === 'favorites') {
            // 使用虚拟收藏词单
            book = this.favoritesVirtualBook || this.getFavoritesVirtualBook();
        } else {
            book = Storage.getBook(this.currentWordListBookId);
        }
        
        if (!book) return;
        
        let hasChanges = false;
        const modifiedSourceBookIds = new Set();
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

            if (this.currentWordListBookId === 'favorites') {
                // 回写到源词书
                const sourceBookId = word._sourceBookId;
                const sourceIndexHint = word._sourceWordIndex;
                const originalText = word._originalWord;
                const sourceBook = Storage.getBook(sourceBookId);
                if (!sourceBook || !Array.isArray(sourceBook.words)) return;

                // 尝试使用索引提示匹配
                let sourceWordIndex = -1;
                if (typeof sourceIndexHint === 'number' &&
                    sourceBook.words[sourceIndexHint] &&
                    sourceBook.words[sourceIndexHint].word === originalText) {
                    sourceWordIndex = sourceIndexHint;
                } else {
                    // 回退到按原始文本匹配（忽略大小写）
                    sourceWordIndex = sourceBook.words.findIndex(w => w.word && w.word.toLowerCase() === originalText.toLowerCase());
                }

                if (sourceWordIndex === -1) return;

                const sourceWord = sourceBook.words[sourceWordIndex];

                switch(field) {
                    case 'word':
                        if (newValue && newValue !== sourceWord.word) {
                            sourceWord.word = newValue;
                            hasChanges = true;
                            modifiedSourceBookIds.add(sourceBookId);
                        }
                        break;
                    case 'phonetic':
                        if (newValue !== sourceWord.phonetic) {
                            sourceWord.phonetic = newValue;
                            hasChanges = true;
                            modifiedSourceBookIds.add(sourceBookId);
                        }
                        break;
                    case 'meaning': {
                        const posMatch = cell.querySelector('.word-list-pos');
                        if (posMatch) {
                            newValue = newValue.replace(posMatch.textContent.trim(), '').trim();
                        }
                        const def = sourceWord.definitions && sourceWord.definitions[0] ? sourceWord.definitions[0] : {};
                        if (newValue !== def.meaning) {
                            if (!sourceWord.definitions || sourceWord.definitions.length === 0) {
                                sourceWord.definitions = [{}];
                            }
                            sourceWord.definitions[0].meaning = newValue;
                            hasChanges = true;
                            modifiedSourceBookIds.add(sourceBookId);
                        }
                        break;
                    }
                    case 'example': {
                        const exampleDef = sourceWord.definitions && sourceWord.definitions[0] ? sourceWord.definitions[0] : {};
                        if (newValue !== exampleDef.example) {
                            if (!sourceWord.definitions || sourceWord.definitions.length === 0) {
                                sourceWord.definitions = [{}];
                            }
                            sourceWord.definitions[0].example = newValue;
                            hasChanges = true;
                            modifiedSourceBookIds.add(sourceBookId);
                        }
                        break;
                    }
                }
            } else {
                // 普通词书写入虚拟 book 对象
                if (!book.words) return;
                const targetWord = book.words[wordIndex];
                if (!targetWord) return;

                switch(field) {
                    case 'word':
                        if (newValue && newValue !== targetWord.word) {
                            targetWord.word = newValue;
                            hasChanges = true;
                        }
                        break;
                    case 'phonetic':
                        if (newValue !== targetWord.phonetic) {
                            targetWord.phonetic = newValue;
                            hasChanges = true;
                        }
                        break;
                    case 'meaning':
                        const def = targetWord.definitions && targetWord.definitions[0] ? targetWord.definitions[0] : {};
                        const posMatch = cell.querySelector('.word-list-pos');
                        if (posMatch) {
                            newValue = newValue.replace(posMatch.textContent.trim(), '').trim();
                        }
                        if (newValue !== def.meaning) {
                            if (!targetWord.definitions || targetWord.definitions.length === 0) {
                                targetWord.definitions = [{}];
                            }
                            targetWord.definitions[0].meaning = newValue;
                            hasChanges = true;
                        }
                        break;
                    case 'example':
                        const exampleDef = targetWord.definitions && targetWord.definitions[0] ? targetWord.definitions[0] : {};
                        if (newValue !== exampleDef.example) {
                            if (!targetWord.definitions || targetWord.definitions.length === 0) {
                                targetWord.definitions = [{}];
                            }
                            targetWord.definitions[0].example = newValue;
                            hasChanges = true;
                        }
                        break;
                }
            }
        });

        // 写回修改的源词书
        if (this.currentWordListBookId === 'favorites') {
            modifiedSourceBookIds.forEach(bookId => {
                const src = Storage.getBook(bookId);
                if (src) {
                    Storage.updateBook(bookId, src);
                }
            });
            if (hasChanges) {
                this.loadBooks();
                // 重新打开收藏词单以刷新虚拟列表
                this.openFavoritesWordList();
                console.log('✅ 收藏词单的修改已同步回源词书');
                this.showToast('保存成功（已同步至来源词书）', 'success');
            }
            return;
        }
        
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
        // 确保toast置于最顶层（覆盖粒子画布、模态等）
        toast.style.zIndex = '20001';
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
        // 支持在收藏虚拟词单中切换收藏状态（实际操作源词书）
        if (this.currentWordListBookId === 'favorites') {
            const virtual = this.favoritesVirtualBook || this.getFavoritesVirtualBook();
            const vword = virtual.words[wordIndex];
            if (!vword) return;
            const sourceBookId = vword._sourceBookId;
            const sourceIndexHint = vword._sourceWordIndex;
            const originalText = vword._originalWord;
            const sourceBook = Storage.getBook(sourceBookId);
            if (!sourceBook || !Array.isArray(sourceBook.words)) return;

            // 优先使用索引提示
            let sourceWordIndex = -1;
            if (typeof sourceIndexHint === 'number' &&
                sourceBook.words[sourceIndexHint] &&
                sourceBook.words[sourceIndexHint].word === originalText) {
                sourceWordIndex = sourceIndexHint;
            } else {
                sourceWordIndex = sourceBook.words.findIndex(w => w.word && w.word.toLowerCase() === originalText.toLowerCase());
            }
            if (sourceWordIndex === -1) return;

            const sourceWord = sourceBook.words[sourceWordIndex];
            sourceWord.favorite = !sourceWord.favorite;
            Storage.updateBook(sourceBookId, sourceBook);

            // 如果被取消收藏，从虚拟列表中移除并重渲染
            if (!sourceWord.favorite) {
                this.openFavoritesWordList();
            } else {
                // 仅更新按钮显示
                const favoriteBtn = document.querySelector(`.favorite-btn[data-word-index="${wordIndex}"]`);
                if (favoriteBtn) {
                    favoriteBtn.innerHTML = sourceWord.favorite ? '⭐' : '<span class="favorite-gray">⭐</span>';
                    favoriteBtn.title = sourceWord.favorite ? '取消收藏' : '收藏';
                }
            }

            this.clearFocus();
            console.log(`${sourceWord.favorite ? '收藏' : '取消收藏'}单词: ${sourceWord.word}`);
            return;
        }

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

        // 立即刷新侧栏收藏卡片计数（点击收藏即生效 +1）
        this.renderBookList();
        
        // 转移焦点，避免移动端星标旋转残留（移动端修复）
        this.clearFocus();
        
        console.log(`${word.favorite ? '收藏' : '取消收藏'}单词: ${word.word}`);
    }

    // 从单词表删除单词
    deleteWordFromList(wordIndex, wordText) {
        const confirmed = confirm(`是否从词单删除该词：${wordText}\n\n确认 / 不了`);
        
        if (!confirmed) return;

        // 如果当前是收藏虚拟词单，则把源词书中的该单词取消收藏（不真的删除源单词）
        if (this.currentWordListBookId === 'favorites') {
            const virtual = this.favoritesVirtualBook || this.getFavoritesVirtualBook();
            const vword = virtual.words[wordIndex];
            if (!vword) return;
            const sourceBookId = vword._sourceBookId;
            const sourceIndexHint = vword._sourceWordIndex;
            const originalText = vword._originalWord;
            const sourceBook = Storage.getBook(sourceBookId);
            if (!sourceBook || !Array.isArray(sourceBook.words)) return;

            // 优先使用索引提示
            let sourceWordIndex = -1;
            if (typeof sourceIndexHint === 'number' &&
                sourceBook.words[sourceIndexHint] &&
                sourceBook.words[sourceIndexHint].word === originalText) {
                sourceWordIndex = sourceIndexHint;
            } else {
                sourceWordIndex = sourceBook.words.findIndex(w => w.word && w.word.toLowerCase() === originalText.toLowerCase());
            }
            if (sourceWordIndex === -1) return;

            // 取消收藏标记
            sourceBook.words[sourceWordIndex].favorite = false;
            Storage.updateBook(sourceBookId, sourceBook);

            // 重新加载列表与收藏视图
            this.loadBooks();
            this.openFavoritesWordList();
            console.log(`已从收藏中移除: ${wordText}`);
            return;
        }

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

    // 添加空白单词行
    addBlankWordRow(count = 1) {
        const book = Storage.getBook(this.currentWordListBookId);
        if (!book) {
            alert('❌ 无法添加单词：未找到当前词书');
            return;
        }

        // 创建空白单词对象
        const blankWord = {
            word: '',
            phonetic: '',
            definitions: [{
                partOfSpeech: '',
                meaning: '',
                example: ''
            }],
            favorite: false
        };

        // 添加n个空白单词
        for (let i = 0; i < count; i++) {
            book.words.push({ ...blankWord });
        }

        // 保存到存储
        Storage.updateBook(this.currentWordListBookId, book);

        // 重新渲染表格
        this.renderWordListTable(book);

        // 更新单词总数
        document.getElementById('wordListTotalCount').textContent = book.words.length;

        // 如果当前在编辑模式，保持编辑状态
        if (this.isWordListEditMode) {
            this.applyEditableState(true);
        }

        // 滚动到新添加的行
        const tbody = document.getElementById('wordListTableBody');
        if (tbody && tbody.lastElementChild) {
            tbody.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        console.log(`✅ 已添加 ${count} 行空白单词`);
    }

    // 显示添加N行对话框
    showAddNWordsDialog() {
        const count = prompt('新增单词行数：', '5');
        
        if (count === null) {
            // 用户取消
            return;
        }

        const num = parseInt(count);
        
        if (isNaN(num) || num <= 0) {
            alert('请输入有效的数字（大于0）');
            return;
        }

        if (num > 100) {
            const confirmed = confirm(`您要添加 ${num} 行，数量较多，确定继续吗？`);
            if (!confirmed) return;
        }

        this.addBlankWordRow(num);
    }

    // 从文件导入单词到当前词书
    async addWordsFromFileToCurrentBook() {
        const book = Storage.getBook(this.currentWordListBookId);
        if (!book) {
            alert('❌ 无法导入单词：未找到当前词书');
            return;
        }

        // 创建隐藏的文件输入元素
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.txt,.csv,.xlsx,.xls,.docx';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;

            const file = e.target.files[0];
            await this.importWordsToCurrentBook(file, book);
            
            // 清理
            document.body.removeChild(fileInput);
        });

        document.body.appendChild(fileInput);
        fileInput.click();
    }

    // 导入单词到当前词书
    async importWordsToCurrentBook(file, currentBook) {
        this.showLoading('正在解析文件...');

        try {
            // 解析文件
            this.updateLoadingProgress(20);
            const result = await WordParser.parse(file, { smartImport: true });
            let words = result.words;
            const analysis = result.analysis;

            this.updateLoadingProgress(60);

            if (analysis.status === 'CONFORMS_TO_TEMPLATE') {
                // 符合模板格式，直接使用
                console.log('✅ 文件符合模板格式');
            } else {
                // 需要提取单词；Excel 等文件无原始文本时回退到解析器已识别的单词
                let extractedWords = WordParser.extractEnglishWords(result.rawContent);
                if (extractedWords.length === 0 && Array.isArray(result.words) && result.words.length > 0) {
                    extractedWords = result.words;
                }

                if (extractedWords.length === 0) {
                    this.hideLoading();
                    alert('未能从文件中提取到有效的英文单词\n\n请检查文件内容是否包含英语单词');
                    return;
                }

                // 过滤基础词汇
                const filteredWords = await this.filterBasicWords(extractedWords);
                
                if (filteredWords.length === 0) {
                    this.hideLoading();
                    alert('所有单词都被过滤了，没有单词需要导入');
                    return;
                }

                words = filteredWords;
            }

            this.updateLoadingProgress(80);

            // 合并到当前词书
            const existingWords = currentBook.words.map(w => w.word.toLowerCase());
            const newWords = [];
            const duplicateWords = [];

            words.forEach(word => {
                const wordLower = word.word.toLowerCase();
                if (existingWords.includes(wordLower)) {
                    duplicateWords.push(word.word);
                } else {
                    newWords.push(word);
                    existingWords.push(wordLower);
                }
            });

            if (newWords.length === 0) {
                this.hideLoading();
                alert('所有单词都已存在于当前词书中');
                return;
            }

            // 添加到词书
            currentBook.words.push(...newWords);

            // 保存
            Storage.updateBook(this.currentWordListBookId, currentBook);

            this.updateLoadingProgress(100);
            this.hideLoading();

            // 显示结果
            let message = `✅ 成功导入 ${newWords.length} 个单词到词书"${currentBook.name}"`;
            if (duplicateWords.length > 0) {
                message += `\n\n跳过 ${duplicateWords.length} 个重复单词`;
            }
            alert(message);

            // 重新渲染表格
            this.renderWordListTable(currentBook);

            // 更新单词总数
            document.getElementById('wordListTotalCount').textContent = currentBook.words.length;

            // 如果当前在编辑模式，保持编辑状态
            if (this.isWordListEditMode) {
                this.applyEditableState(true);
            }

            // 重新加载词书列表
            this.loadBooks();

            console.log(`✅ 已导入 ${newWords.length} 个单词到词书"${currentBook.name}"`);

        } catch (error) {
            console.error('导入失败:', error);
            this.hideLoading();
            alert(`文件解析失败：${error.message}\n\n支持格式：TXT、CSV、XLSX、DOCX`);
        }
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
        
        // 立即刷新侧栏收藏卡片计数与收藏词单（点击收藏即生效 +1，无需等作答）
        this.renderBookList();
        
        // 转移焦点，避免移动端星标旋转残留（移动端修复）
        this.clearFocus();
        
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
        
        // 立即刷新侧栏收藏卡片计数（点击收藏/取消立即生效）
        this.renderBookList();
        
        // 转移焦点，避免移动端星标旋转残留（移动端修复）
        this.clearFocus();
        
        // 重新显示badge以更新星星状态
        const badge1 = document.getElementById('lastWordBadge1');
        const badge2 = document.getElementById('lastWordBadge2');
        const badge3 = document.getElementById('lastWordBadge3');
        if (badge1 && badge1.style.display !== 'none') {
            this.showLastWordBadge('lastWordBadge1');
        }
        if (badge2 && badge2.style.display !== 'none') {
            this.showLastWordBadge('lastWordBadge2');
        }
        if (badge3 && badge3.style.display !== 'none') {
            this.showLastWordBadge('lastWordBadge3');
        }
        
        console.log(`⭐ ${word.favorite ? '已收藏' : '取消收藏'}上次单词: ${word.word}`);
    }

    // 收藏选中的单词（从文本选择工具栏）
    favoriteSelectedWord(selectedText) {
        if (!selectedText || !selectedText.trim()) {
            return;
        }
        
        // 清理选中的文本：去除标点、空格，转换为小写
        const cleanWord = selectedText.trim()
            .replace(/[^\w\s-]/g, '') // 移除标点符号，保留字母、数字、连字符
            .toLowerCase()
            .split(/\s+/)[0]; // 只取第一个单词（如果有多个单词）
        
        if (!cleanWord || cleanWord.length === 0) {
            console.warn('❌ 无法收藏：选中的文本不是有效的单词');
            return;
        }
        
        // 在所有词书中查找这个单词
        const books = Storage.loadBooks();
        let foundWord = null;
        let foundBook = null;
        let foundIndex = -1;
        
        // 遍历所有词书查找单词
        for (const book of books) {
            if (!book.words || !Array.isArray(book.words)) continue;
            
            const index = book.words.findIndex(w => {
                const wordText = (w.word || '').toLowerCase().trim();
                return wordText === cleanWord;
            });
            
            if (index >= 0) {
                foundWord = book.words[index];
                foundBook = book;
                foundIndex = index;
                break;
            }
        }
        
        if (!foundWord) {
            // 没找到单词，提示用户
            console.warn(`❌ 未找到单词 "${cleanWord}"，无法收藏`);
            alert(`未找到单词 "${cleanWord}"\n\n请确保该单词已存在于您的词书中`);
            return;
        }
        
        // 切换收藏状态
        const wasFavorite = foundWord.favorite;
        foundWord.favorite = !foundWord.favorite;
        
        // 保存词书
        Storage.updateBook(foundBook.id, foundBook);
        
        // 显示反馈
        const message = foundWord.favorite 
            ? `⭐ 已收藏单词: ${foundWord.word}` 
            : `已取消收藏单词: ${foundWord.word}`;
        console.log(message);
        
        // 如果当前正在显示单词列表，更新显示
        if (this.currentWordListBookId === foundBook.id) {
            this.renderWordList(foundBook);
        }
        
        // 立即刷新侧栏收藏卡片计数（点击收藏立即生效）
        this.renderBookList();
        
        // 如果当前在AI工坊的收藏单词模式，刷新显示
        const panelFavorites = document.getElementById('panelFavorites');
        if (panelFavorites && !panelFavorites.classList.contains('hidden')) {
            this.loadFavoriteKeywords();
        }
    }

    // 更新学习模式中的收藏按钮显示
    updateFavoriteDisplay(isFavorite) {
        const favoriteBtn1 = document.getElementById('favoriteBtn1');
        const favoriteBtn2 = document.getElementById('favoriteBtn2');
        const favoriteBtn3 = document.getElementById('favoriteBtn3');
        
        const icon = '⭐';
        
        const applyTo = (btn) => {
            if (!btn) return;
            const iconSpan = btn.querySelector('.favorite-icon');
            if (iconSpan) {
                iconSpan.innerHTML = icon;
                iconSpan.classList.toggle('favorite-gray', !isFavorite);
            }
        };
        
        applyTo(favoriteBtn1);
        applyTo(favoriteBtn2);
        applyTo(favoriteBtn3);
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
        // 标记按钮激活样式
        const btn = document.getElementById('aiWorkshopBtn');
        if (btn) btn.classList.add('ai-workshop-active');
        // 显示AI工坊页面
        this.showScreen('aiWorkshopScreen');

        // 显示工坊主页，隐藏应用
        this.showWorkshopHome();
    }

    // 关闭AI工坊
    closeAiWorkshop() {
        // 移除按钮激活样式
        const btn = document.getElementById('aiWorkshopBtn');
        if (btn) btn.classList.remove('ai-workshop-active');
        this.showScreen('welcomeScreen');
        
        // 停止阅读计时器
        this.stopReadingTimer();
        
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
        // 顶部header栏仅在菜单页显示
        const topBar = document.getElementById('aiWorkshopTopBar');
        if (topBar) topBar.classList.remove('hidden');
        document.getElementById('readingAppContainer').classList.add('hidden');
        document.getElementById('synonymAppContainer').classList.add('hidden');
        // 隐藏文字游戏容器（新增）
        const textGameEl = document.getElementById('textGameAppContainer');
        if (textGameEl) textGameEl.classList.add('hidden');
        // 隐藏AI写作容器
        const writingEl = document.getElementById('writingAppContainer');
        if (writingEl) writingEl.classList.add('hidden');
        // Restore shared keyword selector back to reading app (if moved)
        this.restoreKeywordSelector && this.restoreKeywordSelector();
        // 退出文字游戏的沉浸/双页模式（回到工坊菜单时一并清理）
        try {
            if (document.body.classList.contains('textgame-dual-view')) {
                const tb = document.getElementById('toggleTextGameDualViewBtn');
                if (tb) {
                    tb.classList.remove('active');
                    const span = tb.querySelector('span');
                    if (span) span.textContent = '双页展示';
                }
                // 双页退出时恢复展开两侧栏
                if (typeof this._setBothCollapsed === 'function') this._setBothCollapsed(false);
            }
            document.body.classList.remove('textgame-dual-view');
            document.body.classList.remove('immersive-mode');
        } catch (e) {}
    }

    // 打开工坊应用
    openWorkshopApp(appName) {
        document.getElementById('workshopAppsGrid').classList.add('hidden');
        // 进入应用页时隐藏顶部header栏
        const topBar = document.getElementById('aiWorkshopTopBar');
        if (topBar) topBar.classList.add('hidden');

        if (appName === 'writing') {
            console.log('✍️ 打开AI写作应用');
            const el = document.getElementById('writingAppContainer');
            if (el) el.classList.remove('hidden');
            // 初始化写作模块（仅首次进入时构建索引）
            this.initWriting && this.initWriting();
        } else if (appName === 'reading') {
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
        } else if (appName === 'textgame') {
            console.log('🎭 打开文字游戏应用');
            const el = document.getElementById('textGameAppContainer');
            if (el) el.classList.remove('hidden');
            // 初始化文字游戏配置
            this.initTextGame();
            // 确保共享的关键词选择器有数据：加载词单、收藏和待复习（与阅读模块一致）
            this.loadBookSelector && this.loadBookSelector();
            this.loadFavoriteKeywords && this.loadFavoriteKeywords();
            console.log('🔄 准备加载待复习单词（textgame）...');
            this.loadReviewKeywords && this.loadReviewKeywords();
            // 重置已选择关键词与已选词单并更新显示（避免沿用其它模块状态）
            this.selectedKeywords = [];
            this.selectedBooks = [];
            this.updateSelectedKeywordsDisplay && this.updateSelectedKeywordsDisplay();
            // Move shared keyword selector into text game placeholder
            this.moveKeywordSelectorTo && this.moveKeywordSelectorTo('textGameKeywordPlaceholder');
            // Enable text selection / translation on the text game message list and content
            try {
                this.initTextSelection && this.initTextSelection(['messageList', 'textGameContent', 'textGameDisplay']);
                console.log('Text selection initialized for text game (messageList,textGameContent,textGameDisplay)');
            } catch (e) {
                console.error('initTextSelection failed for textgame:', e);
            }
        }
    }
    
    // ============================================
    // 移动端侧边栏切换
    // ============================================
    
    // 切换移动端词书列表
    // 关闭移动端侧边栏
    closeMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const btn = document.getElementById('mobileToggleSidebar');
        
        if (sidebar && sidebar.classList.contains('mobile-show')) {
            sidebar.classList.remove('mobile-show');
            if (btn) {
                btn.classList.remove('active');
            }
        }
    }
    
    // 关闭移动端统计面板
    closeMobileStats() {
        const statsPanel = document.querySelector('.stats-panel');
        const btn = document.getElementById('mobileToggleStats');
        
        if (statsPanel && statsPanel.classList.contains('mobile-show')) {
            statsPanel.classList.remove('mobile-show');
            if (btn) {
                btn.classList.remove('active');
            }
        }
    }
    
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
        // 关闭词单浏览视图，避免与配置页拼接
        const wlView = document.getElementById('synonymWordListView');
        if (wlView) wlView.classList.add('hidden');
        // 配置页恢复卡片外观（练习模式时背景透明无阴影）
        const synContainer = document.getElementById('synonymAppContainer');
        if (synContainer) synContainer.classList.remove('synonym-practice-mode');
        
        // 加载文档缓存
        this.loadSynonymDocsCache();
        
        // 内置文档始终从最新数据文件重建（覆盖旧缓存，避免词性等字段缺失）
        this.synonymDocs = this.synonymDocs.filter(d => !d.isBuiltIn);
        await this.loadBuiltInSynonymDoc();
        await this.loadBuiltInKaoyanSynonymDoc();
        
        // 渲染文档列表
        this.renderSynonymDocsList();
        
        // 确保有选中文档且已加载其数据。
        // 注意：initSynonymPractice 开头已重置 synonymData，重新进入时 synonymCurrentDocId 仍存在，
        // 若只在 !synonymCurrentDocId 时选择文档，会导致重新进入后 synonymData 为空、开始按钮置灰。
        if (this.synonymDocs.length > 0) {
            const currentValid = this.synonymDocs.some(d => d.id === this.synonymCurrentDocId);
            this.selectSynonymDoc(currentValid ? this.synonymCurrentDocId : this.synonymDocs[0].id);
        }
        
        // 更新开始按钮状态
        this.updateSynonymStartButton();
    }

    // 饱和式清除文字游戏现场：清空消息流/交互区/场景摘要/进行中的流式与AI定时器，
    // 确保二次进入时不会残留上次对局的任何内容
    clearTextGameSession() {
        // 中止进行中的流式打字输出与AI等待/回退定时器
        try { if (this._textGameTyper) { clearInterval(this._textGameTyper); this._textGameTyper = null; } } catch (e) {}
        try { this._finishTextGameStreaming = null; } catch (e) {}
        try { if (this.textGameAiTimeoutId) { clearTimeout(this.textGameAiTimeoutId); this.textGameAiTimeoutId = null; } } catch (e) {}
        try { if (this._autoTextGameFallbackTimer) { clearTimeout(this._autoTextGameFallbackTimer); this._autoTextGameFallbackTimer = null; } } catch (e) {}
        try { if (this._textGameTimeoutTimer) { clearTimeout(this._textGameTimeoutTimer); this._textGameTimeoutTimer = null; } } catch (e) {}

        // 清空消息流（上次对话正文）
        const list = document.getElementById('messageList');
        if (list) list.innerHTML = '';

        // 清空并隐藏交互区（选项 + 自由输入）
        const choicesEl = document.getElementById('gameChoices');
        if (choicesEl) { choicesEl.innerHTML = ''; choicesEl.classList.add('hidden'); }
        const inputContainer = document.getElementById('playerInputContainer');
        if (inputContainer) { inputContainer.classList.add('hidden'); }
        const inputEl = document.getElementById('playerInput');
        if (inputEl) { inputEl.value = ''; }
        const feedbackEl = document.getElementById('inputFeedback');
        if (feedbackEl) { feedbackEl.textContent = ''; }

        // 清空场景摘要区（右页 Background / Mission）
        try {
            const sceneMeta = document.getElementById('sceneMeta');
            if (sceneMeta) { sceneMeta.classList.add('hidden'); }
            const bg = document.getElementById('sceneBackground');
            const ms = document.getElementById('sceneMission');
            if (bg) bg.innerHTML = '';
            if (ms) ms.innerHTML = '';
        } catch (e) {}

        // 重置对局状态
        this._demoTextMode = false;
        this._demoEnded = false;
        this._demoNode = null;
        // 重置撤回机制（每场游戏最多 3 次）
        this._textGameUndoStack = [];
        this._textGameUndoRemaining = 3;
        this._textGameTurnSeq = 0;
        // 重置通关进度
        this.textGameProgress = 0;
        // 清空进度条显示与反馈
        try {
            const progressEl = document.getElementById('sceneProgress');
            if (progressEl) { progressEl.classList.add('hidden'); }
            const bar = document.getElementById('sceneProgressBar');
            if (bar) { bar.style.width = '0%'; bar.classList.remove('is-complete', 'is-critical'); }
            const val = document.getElementById('sceneProgressValue');
            if (val) val.textContent = '0%';
            const res = document.querySelector('#sceneProgress .scene-progress-result');
            if (res) res.remove();
            const delta = document.querySelector('#sceneProgress .scene-progress-delta');
            if (delta) delta.remove();
        } catch (e) {}
    }

    // 初始化文字游戏
    initTextGame() {
        console.log('🎭 初始化文字游戏配置');
        // 饱和式清除上次对局残留（消息流、交互区、场景、定时器、状态）
        this.clearTextGameSession();
        // 重置双页展示状态（重新进入工坊时清理）
        try {
            document.body.classList.remove('textgame-dual-view');
            const tb = document.getElementById('toggleTextGameDualViewBtn');
            if (tb) {
                tb.classList.remove('active');
                const span = tb.querySelector('span');
                if (span) span.textContent = '双页展示';
            }
        } catch (e) {}
        // 重置状态
        this.textGameConfig = {
            genre: 'horror',
            gender: 'unknown',
            vocabLevel: 'B2',
            model: document.getElementById('textGameAiModel') ? document.getElementById('textGameAiModel').value : '',
            keywords: []
        };

        // 显示配置区，隐藏展示区
        const cfg = document.getElementById('textGameConfig');
        const disp = document.getElementById('textGameDisplay');
        if (cfg) cfg.classList.remove('hidden');
        if (disp) disp.classList.add('hidden');

        // 清空关键词显示
        // ensure placeholder is ready; actual selector will be moved when opening app
        const placeholder = document.getElementById('textGameKeywordPlaceholder');
        if (placeholder) placeholder.innerHTML = '';
    }

    // 使用预设的Demo剧情（用于调试UX，不调用AI）
    useDemoTextGame() {
        // 进入Demo模式
        this._demoTextMode = true;
        this._demoEnded = false;

        // UI：隐藏配置区，显示展示区（与 AI 模式一致）
        const cfg = document.getElementById('textGameConfig');
        const disp = document.getElementById('textGameDisplay');
        const title = document.getElementById('textGameTitle');
        const meta = document.getElementById('textGameMeta');
        if (cfg) cfg.classList.add('hidden');
        if (disp) disp.classList.remove('hidden');
        try { document.body.classList.add('immersive-mode'); } catch(e) {}
        try {
            const sc = document.getElementById('sceneMeta');
            if (sc) sc.classList.add('hidden');
        } catch(e) {}
        if (title) title.textContent = 'Text Game — Demo (Debug UX)';
        if (meta) meta.textContent = 'Demo mode: choose an option to preview its scripted continuation';

        // 清空历史，从开场重新开始
        const ml = document.getElementById('messageList');
        if (ml) ml.innerHTML = '';
        const bgEl = document.getElementById('sceneBackground');
        const msEl = document.getElementById('sceneMission');
        if (bgEl) bgEl.innerHTML = '';
        if (msEl) msEl.innerHTML = '';

        // 载入预设剧本树
        this._demoScript = this.buildDemoStoryScript();

        // 输出开场白（流式）并展示第一个选择
        const opening = this._demoScript;
        this.appendAiMessage(opening.narration);
        this._demoNode = opening;
        this.showGameIntroAndInteraction({
            background: opening.background,
            mission: opening.mission,
            options: opening.options
        }, [], 'choice');
    }

    // 构建 Demo 用剧本树（开场 + 各选项后续剧情 + 结局）
    buildDemoStoryScript() {
        // 结局节点：所有分支的终点
        const ending = {
            narration: 'The night finally releases its grip. The noise was never a monster — only the rattling old window you always forgot to latch. But somewhere in the dark, a deeper silence begins to hum a tune you almost recognize. The little story settles back into its bed, waiting for the next restless visitor. The End.',
            background: 'Dawn breaks over the silent house.',
            mission: 'The mystery is fully resolved.',
            options: ['Retry the demo'], // 单选项：可再走一遍
            children: null,
            ending: true
        };

        // 三个支线，每个支线再给出 3 个后续选择，最后都汇入结局
        const branch0 = {
            narration: 'You press your ear to the cold door. On the other side, the scratching stops — then something small and quick skitters away under the floorboards. A crack runs down the wallpaper, and behind it you glimpse a single, watchful eye. It blinks. Then it is gone. The corridor feels narrower now, as if the house itself is holding its breath.',
            background: 'You chose to investigate the scratching sound near the old door.',
            mission: 'Trace the source before the hallway closes back in.',
            options: ['Follow the eye into the wall gap', 'Mark the spot and retreat', 'Call to the eye'],
            children: [ending, ending, ending]
        };
        const branch1 = {
            narration: 'You pull the blanket over your head and stay impossibly still. Minutes stretch like wet rope. The scratching travels down the wall, lingers at the foot of the bed — and passes. But then, muffled, a voice whispers your own name, pronouncing it slowly, as if learning it. Your bedsheet is suddenly extremely alone in the room.',
            background: 'You chose to stay hidden and keep still.',
            mission: 'Wait out the night without drawing attention.',
            options: ['Peek through a slit', 'Whisper back your name', 'Bolt for the light switch'],
            children: [ending, ending, ending]
        };
        const branch2 = {
            narration: 'You step into the hall and call out for the guard. Footsteps answer from the far end — then stop. A figure in a faded uniform rounds the corner, lamplight hooked over its shoulder. It says nothing, only gestures you to follow. Whatever watches from the walls chooses, for the moment, to let you carry on beneath its careful gaze.',
            background: 'You chose to call out for the guard.',
            mission: 'Follow the guard and glean an explanation.',
            options: ['Follow without a word', 'Ask what lurks here', 'Refuse and run'],
            children: [ending, ending, ending]
        };

        // 开场节点
        const opening = {
            narration: 'It is 2:47 AM when the scratching begins. You wake to the sound of it — thin, patient, moving across the wall behind your bed like an index finger tracing a line that does not want to be found. Rain taps the window. The air smells of cold metal. There is a door in front of you, and behind it, something is listening for your next decision.',
            background: 'You are awake in a strange, narrow room on a rainy night.',
            mission: 'Survive the night and discover what is scratching beyond the door.',
            options: ['Investigate the scratching sound', 'Stay hidden and listen', 'Call out for help'],
            children: [branch0, branch1, branch2]
        };
        return opening;
    }

    // 处理 Demo 模式下的选项点击
    _handleDemoChoice(index) {
        // 结局已经展示过，再次点击（如 Retry）则重新开局
        if (this._demoEnded) {
            this._demoEnded = false;
            this.useDemoTextGame();
            return;
        }
        const node = this._demoNode;
        if (!node) return;
        const next = node.children && node.children[index] ? node.children[index] : null;
        if (!next) return;

        // 进入下一节点：流式输出后续剧情并给出新选项
        this._demoNode = next;
        this.appendAiMessage(next.narration);
        if (next.ending) this._demoEnded = true;
        this.showGameIntroAndInteraction({
            background: next.background,
            mission: next.mission,
            options: next.options
        }, [], 'choice');
    }

    // 开始文字游戏（异步收集配置并显示占位内容，然后调用AI）
    async startTextGame() {
        try {
            // 饱和式清除上次对局残留，确保每次开局都是全新内容
            this.clearTextGameSession();
            const genreEl = document.getElementById('textGameGenre');
            const genderEl = document.getElementById('textGameGender');
            const levelEl = document.getElementById('textGameVocabLevel');
            const modelEl = document.getElementById('textGameAiModel');
            const kwInput = document.getElementById('textGameKeywordsInput');

            const config = {
                genre: genreEl ? genreEl.value : 'horror',
                gender: genderEl ? genderEl.value : 'unknown',
                vocabLevel: levelEl ? levelEl.value : 'B2',
                model: modelEl ? modelEl.value : '',
                // keywords will be taken from shared selectedKeywords state
                keywords: this.selectedKeywords && this.selectedKeywords.length > 0 ? this.selectedKeywords.slice() : []
            };

            this.textGameConfig = config;
            console.log('🎮 文字游戏配置：', config);

            // 更新界面：隐藏配置，显示展示区
            const cfg = document.getElementById('textGameConfig');
            const disp = document.getElementById('textGameDisplay');
            const content = document.getElementById('textGameContent');
            const title = document.getElementById('textGameTitle');
            const meta = document.getElementById('textGameMeta');

            if (cfg) cfg.classList.add('hidden');
            if (disp) disp.classList.remove('hidden');
            // enter immersive mode to hide side panels for focused experience
            try { document.body.classList.add('immersive-mode'); } catch(e) {}
            // reset scene meta area
            try {
                const sceneMeta = document.getElementById('sceneMeta');
                if (sceneMeta) {
                    sceneMeta.classList.add('hidden');
                    const bg = document.getElementById('sceneBackground');
                    const ms = document.getElementById('sceneMission');
                    if (bg) bg.innerHTML = '';
                    if (ms) ms.innerHTML = '';
                }
            } catch (e) { /* ignore */ }
            if (title) title.textContent = `Text Game — ${config.genre === 'horror' ? 'Horror' : config.genre === 'sci-fi' ? 'Sci‑Fi' : 'Romance'}`;
            if (meta) meta.textContent = `Protagonist: ${config.gender} • Level: ${config.vocabLevel} • Keywords: ${config.keywords.join(', ') || '—'}`;
            // Avoid replacing the entire content element (which contains #messageList and reply UI).
            // Instead update the message list or show a connecting note so appendAiMessage still works.
            try {
                const messageListEl = document.getElementById('messageList');
                if (messageListEl) {
                    // show a single waiting placeholder using unified waiting UI
                    this.showAiWaiting('Connecting to AI and generating the opening scene');
                } else if (content) {
                    // fallback: if messageList is not present for some reason, write into content
                    content.innerHTML = '<p>Connecting to AI and generating the opening scene... please wait.</p>';
                }
            } catch (e) {
                console.error('Failed to render connecting message:', e);
                if (content) content.innerHTML = '<p>Connecting to AI and generating the opening scene... please wait.</p>';
            }

            // 调用AI服务生成开场（此处简单示例，真正实现请使用 AIService.callModel）
            try {
                // set a timeout to detect long-running AI calls and offer fallback
                // Instrumentation: log timeout lifecycle for debugging
                if (this.textGameAiTimeoutId) {
                    console.log('Clearing previous textGameAiTimeout:', this.textGameAiTimeoutId);
                    clearTimeout(this.textGameAiTimeoutId);
                    this.textGameAiTimeoutId = null;
                }
                this.textGameAiTimeoutId = setTimeout(() => {
                    console.log('textGameAiTimeout fired (8s)');
                    this.onTextGameAiTimeout(config);
                }, 8000);
                console.log('Set textGameAiTimeout id:', this.textGameAiTimeoutId);

                // Request structured scene data (narration + mission + 3 options + interaction_mode)
                const progressNote = this.buildTextGameProgressNote();
                const vocabNote = this.buildTextGameVocabNote();
                const prompt = `You are an assistant that must produce an opening scene for an interactive text game and return a JSON object at the end with keys: background, mission, options (array of 3 objects), interaction_mode (either "choice" or "input"). First write an EXTREMELY SHORT English narration (at most 60 words, hard limit) for the player-character using these keywords as cues: ${config.keywords.join(', ')}.${vocabNote} Keep the opening brief — a few vivid lines of scenery or atmosphere are enough, no lengthy prologue. Use the keywords sparingly: it is fine to weave in only 0-3 of them into the opening, or even none — the rest may appear naturally in later turns, options, or the ending. When you do use a keyword, use a reasonable inflected/derived form for about half of them (plural, tense change, -ing/-ed participle, derived adjective/adverb), so the player can still recognize the base word from different angles (e.g. use "underwent" for "undergo").${progressNote} Then output a JSON object alone (no extra text) like:
{
  "background":"...brief story background in 3-5 short sentences...",
  "mission":"...player mission in one sentence...",
  "options":[{"text":"action A","impact":"good"},{"text":"action B","impact":"neutral"},{"text":"action C","impact":"neutral"}],
  "interaction_mode":"choice"
}
Each option must include an "impact" field. IMPORTANT for this FIRST round only: do NOT include any "bad" option — provide exactly one "good" (the correct path toward completing the mission) and two "neutral" (mediocre, low-risk middle paths that move the progress by only 0-5%). Wrong/reckless options appear only from later rounds, so the opening is not punishingly hard. Pick interaction_mode either "choice" or "input". Ensure option texts are concise (4-10 words) and may contain keywords.`;
                const modelName = config.model || this.getLastUsedModel();
                console.log('Calling AIService.callModel with model:', modelName);
                let aiText = '';
                try {
                    aiText = await AIService.callModel(modelName, prompt);
                    console.log('AIService returned, length:', (aiText || '').length);
                } finally {
                    // Ensure timeout cleared when call completes (success or failure)
                    if (this.textGameAiTimeoutId) {
                        console.log('Clearing textGameAiTimeout after AI response:', this.textGameAiTimeoutId);
                        clearTimeout(this.textGameAiTimeoutId);
                        this.textGameAiTimeoutId = null;
                    }
                    // If an automatic fallback timer was scheduled due to earlier timeout, cancel it
                    if (this._autoTextGameFallbackTimer) {
                        console.log('Clearing _autoTextGameFallbackTimer after AI response:', this._autoTextGameFallbackTimer);
                        clearTimeout(this._autoTextGameFallbackTimer);
                        this._autoTextGameFallbackTimer = null;
                    }
                }

                // Try to extract JSON object from response
                let jsonMatch = aiText.match(/\{[\s\S]*\}/);
                let scene = null;
                if (jsonMatch) {
                    try {
                        scene = JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        console.warn('Failed to parse scene JSON:', e);
                    }
                }

                // Display raw narration (everything before JSON) with keyword highlights
                let narration = aiText;
                if (jsonMatch) narration = aiText.substring(0, jsonMatch.index).trim();
                // 清理叙述中遗留的 Markdown 代码块围栏（"```json" 等）
                narration = this.cleanAiNarration(narration);
                if (content) {
                    const highlighted = this.applyKeywordHighlight(narration, config.keywords || []);
                    // append as AI message bubble（传关键词，流式输出实时高亮）
                    this.appendAiMessage(highlighted, config.keywords || []);
                }

                // If we have scene JSON, render intro/mission and the chosen interaction mode
                if (scene) {
                    // clear any pending timeout
                    if (this.textGameAiTimeoutId) {
                        clearTimeout(this.textGameAiTimeoutId);
                        this.textGameAiTimeoutId = null;
                    }
                    // 开场首次选择柔和化：AI 若仍返回 bad 选项，一律软化为 neutral，
                    // 避免开局 66% 概率直接面临扣分/ GAME OVER（后续轮次恢复 good/bad/neutral）
                    const openingOptions = (scene.options && Array.isArray(scene.options))
                        ? scene.options.map(o => {
                            if (this.getGameOptionImpact(o) === 'bad') {
                                if (o && typeof o === 'object') return Object.assign({}, o, { impact: 'neutral' });
                            }
                            return o;
                        })
                        : scene.options;
                    if (!openingOptions.some(o => o && o.impact === 'good')) {
                        if (openingOptions[0] && typeof openingOptions[0] === 'object') openingOptions[0].impact = 'good';
                    }
                    this.showGameIntroAndInteraction(scene, config.keywords || [], scene.interaction_mode || 'choice');
                } else {
                    // fallback: if no scene JSON, provide a simple choice fallback
                    const fallbackScene = {
                        background: 'An unexpected evening unfolds.',
                        mission: 'Find out what is happening and stay alive.',
                        options: ['Investigate the noise', 'Call a friend', 'Hide and wait'],
                        interaction_mode: 'choice'
                    };
                    this.showGameIntroAndInteraction(fallbackScene, config.keywords || [], fallbackScene.interaction_mode);
                }
                } catch (err) {
                console.error('AI 生成失败：', err);
                if (content) this.appendAiMessage(`<p>⚠️ AI generation failed: ${err.message || err}</p>`);
                if (this.textGameAiTimeoutId) {
                    clearTimeout(this.textGameAiTimeoutId);
                    this.textGameAiTimeoutId = null;
                }
            }
        } catch (error) {
            console.error('开始文字游戏失败：', error);
            alert('无法开始文字游戏：' + error.message);
        }
    }

    // Apply keyword highlight to arbitrary text (returns HTML)
    // 兼容关键词的词形/词性变化（单复数、时态、动名词、派生形副词等），
    // 使 AI 糅合关键词时输出的变形词也能被识别并高亮
    applyKeywordHighlight(text, keywords) {
        if (!text) return '';
        const highlighted = this.highlightKeywordVariants(text, keywords);
        // sanitize minimal: replace newlines with <br>
        return highlighted.replace(/\n/g, '<br>');
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 生成某关键词及其常见词形/词性变化的匹配候选，用于在 AI 糅合关键词后，
    // 前端仍能从不同角度高亮识别该词（如 undergo → underwent）。
    // 规则覆盖面大于参考程序（CEFR Shadow_uni writing.vue 的 getWordBaseForm，23 条规则）：
    // 单复数 / 所有格与缩写 / 时态与分词 / 比较级最高级 / 双写辅音 / y 结尾变化 /
    // f-fe 复数 / -ly 副词 / -ness -ment -ation -tion -ion -al -ive -ous -ful -less -ize -able 派生 / 不规则词形表
    buildKeywordCandidates(word) {
        if (!word) return [];
        const w = String(word).trim().toLowerCase();
        if (!w) return [];
        // 多词或带空格/符号的关键词不做形态扩展，仅按原样匹配
        if (!/^[a-z][a-z'-]*$/.test(w)) return [w];
        const cands = new Set([w]);
        const isConsY = /[bcdfghjklmnpqrstvwxz]y$/.test(w); // 辅音+y 结尾（happy）
        const endsE = /e$/.test(w);                          // 元音 e 结尾（make / create）
        const stem = endsE ? w.slice(0, -1) : '';
        const yStem = isConsY ? w.slice(0, -1) : '';         // 辅音+y 词干（happy→happ）

        // 1) 复数形式：-s / -es（s,x,z,ch,sh 及辅音+o）/ 辅音+y→ies / f-fe→ves
        if (isConsY) {
            ['ies', 'ied', 'ier', 'iest', 'iness', 'ily', 'iful'].forEach(s => cands.add(yStem + s)); // happy→happiness / happily / beautiful
        }
        if (/(s|x|z|ch|sh)$/.test(w)) {
            cands.add(w + 'es'); // box→boxes
        } else if (!isConsY) {
            cands.add(w + 's');  // book→books
        }
        if (/fe$/.test(w)) {
            cands.add(w.slice(0, -2) + 'ves'); // knife→knives
        } else if (/f$/.test(w) && w.length > 2) {
            cands.add(w.slice(0, -1) + 'ves'); // leaf→leaves
        }

        // 2) 动词时态/分词：make→makes/making/made（不规则见第7条）、move→moved/moving、segregate→segregated/segregating
        if (endsE) {
            ['d', 'ed', 'ing', 'able'].forEach(s => cands.add(stem + s)); // 兼容 move→moved 与 segregate→segregated
            cands.add(w + 's'); // moves
        } else {
            ['s', 'es', 'ed', 'ing'].forEach(s => cands.add(w + s));
        }

        // 3) 比较级/最高级：fast→faster/fastest、nice→nicer/nicest、（happy→happier/happiest 见第1条）
        if (endsE) {
            ['r', 'st'].forEach(s => cands.add(stem + s));
        } else if (!isConsY) {
            ['er', 'est'].forEach(s => cands.add(w + s));
        }

        // 4) 双写末尾辅音 + er/est/ing/ed（run→running/runner、big→bigger、stop→stopped）
        if (w.length >= 3 && !/([bcdfgkmnprt])\1$/.test(w) && /[bdfgkmnprt]$/.test(w)) {
            const last = w.slice(-1);
            [last + 'er', last + 'est', last + 'ing', last + 'ed'].forEach(s => cands.add(w + s));
        }

        // 5) 派生后缀（名词/形容词/副词词性变化）：
        //    -ation/-tion/-ion（create→creation、inform→information、discuss→discussion）
        if (endsE) {
            cands.add(stem + 'ation');
            cands.add(stem + 'tion'); // introduce→introduction
            cands.add(stem + 'ive');  // create→creative
            cands.add(stem + 'al');   // nature→natural
            cands.add(stem + 'ment'); // achieve→achievement
            cands.add(stem + 'ize');  // stable→stabilize
        }
        ['ation', 'tion', 'ion', 'ment', 'ous', 'ful', 'less', 'able', 'al', 'ive', 'ize'].forEach(s => cands.add(w + s));
        // -ly 副词：quick→quickly、complete→completely、simple→simply、happy→happily、basic→basically
        if (/le$/.test(w)) {
            cands.add(w.slice(0, -1) + 'y'); // simple→simply
        } else if (endsE) {
            cands.add(stem + 'ly');
        } else if (isConsY) {
            cands.add(yStem + 'ily');
        } else {
            cands.add(w + 'ly');
        }
        if (/ic$/.test(w)) cands.add(w + 'ally'); // basic→basically
        // -ness：dark→darkness、aware→awareness（happy→happiness 见第1条）
        cands.add(w + 'ness');

        // 6) 所有格 -'s / -s' 及代词/助动词缩写（he's、don't、can't、won't 等）
        cands.add(w + "'s");
        cands.add(w + "s'");
        const contr = WORD_CONTRACTIONS[w];
        if (contr) contr.forEach(c => cands.add(c));

        // 7) 不规则动词/比较级/复数词形表（undergo→underwent、go→went、man→men、good→better 等）
        const irregular = IRREGULAR_WORD_FORMS[w];
        if (irregular) irregular.forEach(f => cands.add(f));

        return Array.from(cands);
    }

    // 高亮文本中的关键词及其词形/词性变化形式（返回 HTML，使用 keyword-highlight 样式）
    highlightKeywordVariants(text, keywords) {
        if (!text) return '';
        const cands = new Set();
        (keywords || []).forEach(kw => {
            this.buildKeywordCandidates(kw).forEach(c => cands.add(c));
        });
        if (!cands.size) return String(text);
        const parts = Array.from(cands)
            .sort((a, b) => b.length - a.length)
            .map(c => this.escapeRegExp(c));
        const regex = new RegExp('\\b(?:' + parts.join('|') + ')\\b', 'gi');
        return String(text).replace(regex, '<mark class="keyword-highlight">$&</mark>');
    }

    // Strip HTML tags to obtain plain text for streaming display
    stripHtml(html) {
        if (!html) return '';
        // Replace <br> with newline, then remove other tags
        return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
    }

    // Append an AI/narrator message to the conversation list
    // 流式输出时实时高亮关键词（基于已累积的纯文本片段调用 highlightKeywordVariants）
    appendAiMessage(htmlContent, keywords) {
        const list = document.getElementById('messageList');
        if (!list) return;
        const node = document.createElement('div');
        node.className = 'message message-ai';
        // create a paragraph for streaming text
        const p = document.createElement('p');
        p.className = 'ai-stream';
        p.textContent = 'Things happening...';
        node.appendChild(p);
        list.appendChild(node);
        list.scrollTop = list.scrollHeight;

        const kwList = keywords || (this.textGameConfig && this.textGameConfig.keywords) || [];

        // Simulate streaming: type out plain text with live keyword highlighting,
        // then replace with final HTML (with highlights) at the end
        try {
            const plain = this.stripHtml(String(htmlContent));
            let buffer = '';
            let i = 0;
            // 流式打字速度：每帧间隔 2ms、仍一次只推进 1 个字符（等效 2ms/字符），
            // 保持逐字显现的观感，仅将间隔由原先的 18ms 缩短以加快
            const rate = 10; // ms per char
            // small delay so user sees the "生成中" hint briefly
            setTimeout(() => {
                p.textContent = '';
                const typer = setInterval(() => {
                    if (i >= plain.length) {
                        clearInterval(typer);
                        // replace with final HTML (with highlights)
                        node.innerHTML = String(htmlContent);
                        // ensure appended node is visible
                        list.scrollTop = list.scrollHeight;
                        this.initKeywordHighlightClick();
                        if (this._finishTextGameStreaming === finishStream) this._finishTextGameStreaming = null;
                        return;
                    }
                    buffer += plain.charAt(i);
                    i++;
                    // 对已累积纯文本实时高亮（关键词片段安全，buffer 无 HTML）
                    p.innerHTML = this.highlightKeywordVariants(buffer, kwList);
                    list.scrollTop = list.scrollHeight;
                }, rate);
                // 记录流式定时器，供切换/重开时饱和式清除
                this._textGameTyper = typer;
                // 注册“立即完成”回调：游戏结束/用户抢答时直接显示全部内容
                const finishStream = () => {
                    clearInterval(typer);
                    try { p.remove(); } catch (e) {}
                    node.innerHTML = String(htmlContent);
                    list.scrollTop = list.scrollHeight;
                    this.initKeywordHighlightClick();
                    if (this._finishTextGameStreaming === finishStream) this._finishTextGameStreaming = null;
                };
                this._finishTextGameStreaming = finishStream;
            }, 300);
        } catch (e) {
            // on error, just set final content
            node.innerHTML = String(htmlContent);
            list.scrollTop = list.scrollHeight;
            this.initKeywordHighlightClick();
        }
    }

    // Stream plain text char-by-char inside an existing AI message node, then replace with final HTML (with highlights)
    // 流式过程中实时高亮关键词
    streamIntoAiNode(node, finalHtml, plainText, keywords) {
        if (!node) return;
        const kwList = keywords || (this.textGameConfig && this.textGameConfig.keywords) || [];
        try {
            const str = String(plainText || '');
            node.textContent = '';
            const p = document.createElement('p');
            p.className = 'ai-stream';
            node.appendChild(p);
            let buffer = '';
            let i = 0;
            // 流式打字速度：与 appendAiMessage 保持一致（每帧 2ms、一次 1 字符）
            const rate = 2; // ms per char
            const typer = setInterval(() => {
                if (i >= str.length) {
                    clearInterval(typer);
                    node.innerHTML = String(finalHtml);
                    const list = document.getElementById('messageList');
                    if (list) list.scrollTop = list.scrollHeight;
                    this.initKeywordHighlightClick();
                    if (this._finishTextGameStreaming === finishStream) this._finishTextGameStreaming = null;
                    return;
                }
                buffer += str.charAt(i);
                i++;
                // 对已累积纯文本实时高亮
                p.innerHTML = this.highlightKeywordVariants(buffer, kwList);
                const list = document.getElementById('messageList');
                if (list) list.scrollTop = list.scrollHeight;
            }, rate);
            // 记录流式定时器，供切换/重开时饱和式清除
            this._textGameTyper = typer;
            // 注册“立即完成”回调：游戏结束/用户抢答时直接显示全部内容
            const finishStream = () => {
                clearInterval(typer);
                try { p.remove(); } catch (e) {}
                node.innerHTML = String(finalHtml);
                const list = document.getElementById('messageList');
                if (list) list.scrollTop = list.scrollHeight;
                this.initKeywordHighlightClick();
                if (this._finishTextGameStreaming === finishStream) this._finishTextGameStreaming = null;
            };
            this._finishTextGameStreaming = finishStream;
        } catch (e) {
            node.innerHTML = String(finalHtml);
            this.initKeywordHighlightClick();
        }
    }

    // 立即完成进行中的流式打字输出：直接显示全部回传内容。
    // 用于游戏结束（通关/GAME OVER）或用户在流式期间抢先选择新答案的场景，
    // 避免旧的“逐字打字”动画在背景中继续拖沓
    finishTextGameStreaming() {
        try {
            if (typeof this._finishTextGameStreaming === 'function') {
                const fn = this._finishTextGameStreaming;
                this._finishTextGameStreaming = null;
                fn();
            }
        } catch (e) { /* ignore */ }
    }

    // Append a player message bubble (text). 返回节点引用，供撤回机制使用
    appendPlayerMessage(text) {
        const list = document.getElementById('messageList');
        if (!list) return null;
        const node = document.createElement('div');
        node.className = 'message message-player';
        // 左侧撤回图标：点击回退到该次选择之前（每场游戏最多 3 次）
        const undo = document.createElement('button');
        undo.type = 'button';
        undo.className = 'player-undo';
        undo.title = '撤回这次选择';
        undo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24"><g id="Bold Duotone/Arrows Action/Undo Left Round"><path id="Vector" fill="#000000" d="M5.81055 6.25h9.18935c3.1756 0 5.75 2.57436 5.75 5.75 0 3.1756 -2.5744 5.75 -5.75 5.75H7.99989c-0.41421 0 -0.75 -0.3358 -0.75 -0.75s0.33579 -0.75 0.75 -0.75h7.00001c2.3472 0 4.25 -1.9028 4.25 -4.25 0 -2.34721 -1.9028 -4.25 -4.25 -4.25H5.81055l-0.75 -0.75 0.75 -0.75Z" stroke-width="1"></path><path id="Vector_2" fill="#000000" fill-rule="evenodd" d="M7.53033 3.46967c-0.29289 -0.29289 -0.76777 -0.29289 -1.06066 0l-3 3c-0.29289 0.29289 -0.29289 0.76777 0 1.06066l3 2.99997c0.29289 0.2929 0.76777 0.2929 1.06066 0s0.29289 -0.76774 0 -1.06063L5.06066 7l2.46967 -2.46967c0.29289 -0.29289 0.29289 -0.76777 0 -1.06066Z" clip-rule="evenodd" stroke-width="1"></path></g></svg>`;
        undo.addEventListener('click', (e) => {
            e.stopPropagation();
            this.undoTextGameMove(node);
        });
        node.appendChild(undo);
        const bubble = document.createElement('div');
        bubble.className = 'player-bubble';
        bubble.textContent = text;
        node.appendChild(bubble);
        list.appendChild(node);
        list.scrollTop = list.scrollHeight;
        this.updateUndoIconState();
        return node;
    }

    // 记录一次玩家行动前的状态快照，供撤回（undo）恢复
    pushTextGameUndo(playerNode, scene, mode, keywords) {
        if (!this._textGameUndoStack) this._textGameUndoStack = [];
        if (this._textGameUndoRemaining == null) this._textGameUndoRemaining = 3;
        this._textGameUndoStack.push({
            playerNode,
            progress: this.textGameProgress || 0,
            playerScore: this.playerScore,
            scene: {
                background: scene && scene.background,
                mission: scene && scene.mission,
                options: scene && scene.options ? scene.options.slice() : []
            },
            mode,
            keywords: keywords || []
        });
        this.updateUndoIconState();
    }

    // 撤回：终止进行中的 AI 请求/流式输出，移除该玩家消息及其后的全部内容，
    // 恢复进度与交互区到尚未选择之前的状态；每场游戏最多允许撤回 3 次
    undoTextGameMove(playerNode) {
        if (!this._textGameUndoStack) this._textGameUndoStack = [];
        if (this._textGameUndoRemaining == null) this._textGameUndoRemaining = 3;
        if (this._textGameUndoRemaining <= 0) return;
        const idx = this._textGameUndoStack.findIndex(s => s.playerNode === playerNode);
        if (idx === -1) return;
        const snapshot = this._textGameUndoStack[idx];
        // 递增回合序号，使进行中的 AI 请求/结局生成回合失效（await 返回后将被忽略）
        this._textGameTurnSeq = (this._textGameTurnSeq || 0) + 1;
        // 中止流式打字输出
        try { if (this._textGameTyper) { clearInterval(this._textGameTyper); this._textGameTyper = null; } } catch (e) {}
        this._finishTextGameStreaming = null;
        // 移除该玩家消息及其后的所有消息（AI 回复、等待占位、结局等）
        const list = document.getElementById('messageList');
        if (list && playerNode && playerNode.parentNode === list) {
            let n = playerNode.nextSibling;
            while (n) { const nxt = n.nextSibling; list.removeChild(n); n = nxt; }
            list.removeChild(playerNode);
            list.scrollTop = list.scrollHeight;
        }
        // 丢弃该次及之后的全部快照
        this._textGameUndoStack = this._textGameUndoStack.slice(0, idx);
        // 恢复进度与分数，重渲染进度条（清除 finalText / delta 并隐藏交互区由 show 重建）
        this.textGameProgress = snapshot.progress;
        if (snapshot.playerScore != null) this.playerScore = snapshot.playerScore;
        this.renderGameProgress();
        // 恢复交互区到选择之前（重新展示选项/输入）
        try {
            this.showGameIntroAndInteraction(snapshot.scene, snapshot.keywords, snapshot.mode);
        } catch (e) { console.error('撤回后恢复界面失败：', e); }
        // 撤回计数递减
        this._textGameUndoRemaining--;
        this.updateUndoIconState();
    }

    // 根据剩余撤回次数刷新所有撤回图标的可用状态
    updateUndoIconState() {
        const remaining = this._textGameUndoRemaining == null ? 3 : this._textGameUndoRemaining;
        const list = document.getElementById('messageList');
        if (!list) return;
        list.querySelectorAll('.player-undo').forEach(ic => {
            ic.classList.toggle('undo-disabled', remaining <= 0);
            ic.title = remaining <= 0 ? '撤回次数已用完（0/3）' : `撤回这次选择（本局剩余 ${remaining}/3）`;
        });
    }

    // Append a simple AI waiting placeholder and return the node so caller can update/replace it later
    showAiWaiting(message = 'Things happening...') {
        const list = document.getElementById('messageList');
        if (!list) return null;
        const node = document.createElement('div');
        node.className = 'message message-ai';
        const p = document.createElement('p');
        p.className = 'ai-waiting';
        // structure: main text + animated ellipsis span
        p.innerHTML = `<span class="ai-waiting-text">${message}</span><span class="ai-ellipsis">.</span>`;
        node.appendChild(p);
        list.appendChild(node);
        list.scrollTop = list.scrollHeight;

        // animate ellipsis by JS to ensure wide browser support
        let dots = 1;
        const ell = p.querySelector('.ai-ellipsis');
        const intervalId = setInterval(() => {
            if (!ell) return;
            dots = (dots % 3) + 1;
            ell.textContent = '.'.repeat(dots);
        }, 400);
        // store interval id so caller can clear when replacing node
        try { node._waitInterval = intervalId; } catch (e) {}
        return node;
    }

    clearAiWaiting(node) {
        try {
            if (!node) return;
            if (node._waitInterval) {
                clearInterval(node._waitInterval);
                node._waitInterval = null;
            }
            // remove temporary class if any
        } catch (e) {}
    }

    // Called when AI takes too long to respond
    onTextGameAiTimeout(config) {
        console.log('onTextGameAiTimeout called');
        this.textGameAiTimeoutId = null;
        this.appendAiMessage('<div class="ai-warning">Waite for another while...</div>');
        // show a force-fallback quick reply in the reply bar
        const choicesEl = document.getElementById('gameChoices');
        if (!choicesEl) return;
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.textContent = 'Force fallback';
        btn.addEventListener('click', () => {
            btn.disabled = true;
            // clear scheduled auto fallback to avoid duplicate execution
            if (this._autoTextGameFallbackTimer) {
                clearTimeout(this._autoTextGameFallbackTimer);
                this._autoTextGameFallbackTimer = null;
            }
            this.forceStartFallback(config);
        });
        // append at top
        choicesEl.innerHTML = '';
        const cont = document.createElement('div');
        cont.className = 'quick-replies';
        cont.appendChild(btn);
        choicesEl.appendChild(cont);
        choicesEl.classList.remove('hidden');
        // 自动回退：如果用户不点击 Force fallback，N 秒后自动触发回退以保持可玩性
        try {
            if (this._autoTextGameFallbackTimer) {
                clearTimeout(this._autoTextGameFallbackTimer);
                this._autoTextGameFallbackTimer = null;
            }
            this._autoTextGameFallbackTimer = setTimeout(() => {
                console.log('Auto triggering forceStartFallback due to prolonged AI delay');
                this.forceStartFallback(config);
                if (choicesEl) choicesEl.classList.add('hidden');
            }, 12000); // 12s 后自动回退
        } catch (e) {
            console.error('auto fallback setup failed:', e);
        }
    }

    // Force a local fallback scene if AI is unavailable
    forceStartFallback(config) {
        // clear any scheduled auto fallback to prevent re-entrancy
        if (this._autoTextGameFallbackTimer) {
            clearTimeout(this._autoTextGameFallbackTimer);
            this._autoTextGameFallbackTimer = null;
        }
        const fallbackScene = {
            background: 'An unexpected evening unfolds in the cramped quarters.',
            mission: 'Discover the source of the disturbance and survive the shift.',
            options: ['Investigate the corridor', 'Call out to the guard', 'Retreat to your bunk'],
            interaction_mode: 'choice'
        };
        this.appendAiMessage('<div class="ai-note">Using fallback scene due to slow AI.</div>');
        this.showGameIntroAndInteraction(fallbackScene, config.keywords || [], fallbackScene.interaction_mode);
    }

    // 规范化 AI 返回的选项：可能是字符串数组，也可能含有对象元素（如 {text/option/action...}），
    // 统一转为纯字符串，避免渲染出 "[object Object]"
    normalizeGameOption(opt) {
        if (typeof opt === 'string') return opt;
        if (opt && typeof opt === 'object') {
            const text = opt.text ?? opt.option ?? opt.action ?? opt.label ?? opt.name ?? opt.value;
            if (text != null) return String(text);
            try { return JSON.stringify(opt); } catch (e) { return String(opt); }
        }
        return String(opt == null ? '' : opt);
    }

    // 读取 AI 返回选项的 impact 走向标记（good / bad / neutral），无标记返回 null
    getGameOptionImpact(opt) {
        if (opt && typeof opt === 'object' && opt.impact) {
            const imp = String(opt.impact).toLowerCase();
            if (imp.includes('good') || imp.includes('correct') || imp.includes('right')) return 'good';
            if (imp.includes('bad') || imp.includes('wrong') || imp.includes('mistake')) return 'bad';
            return 'neutral';
        }
        return null;
    }

    // 渲染通关进度条（在右页 scene-mission 下方）
    renderGameProgress(showResult) {
        const progressEl = document.getElementById('sceneProgress');
        const bar = document.getElementById('sceneProgressBar');
        const val = document.getElementById('sceneProgressValue');
        if (!progressEl || !bar || !val) return;
        progressEl.classList.remove('hidden');
        const p = Math.max(0, Math.min(100, Math.round(this.textGameProgress)));
        val.textContent = p + '%';
        bar.style.width = p + '%';
        bar.classList.remove('is-complete');
        if (this.textGameProgress >= 100) bar.classList.add('is-complete');

        // 移除旧的反馈与结果标签，再按需添加新的
        const oldDelta = progressEl.querySelector('.scene-progress-delta');
        if (oldDelta) oldDelta.remove();
        const oldRes = progressEl.querySelector('.scene-progress-result');
        if (oldRes) oldRes.remove();

        if (showResult && showResult.deltaText) {
            const delta = document.createElement('span');
            delta.className = 'scene-progress-delta ' + (showResult.cls || 'flat');
            delta.textContent = showResult.deltaText;
            // 插入到 head 内 label 右侧，避免撑开 scene-progress 容器高度
            const head = progressEl.querySelector('.scene-progress-head');
            const label = progressEl.querySelector('.scene-progress-label');
            if (head && label) {
                if (label.nextSibling) head.insertBefore(delta, label.nextSibling);
                else head.appendChild(delta);
            } else {
                progressEl.appendChild(delta);
            }
        }
        if (showResult && showResult.finalText) {
            const res = document.createElement('div');
            res.className = 'scene-progress-result ' + (showResult.cls || '');
            res.textContent = showResult.finalText;
            progressEl.appendChild(res);
        }
    }

    // 依据选项走向类型，应用随机的进度增减：
    // 正确=+10~15%、错误=-15~25%、平庸=±5%、自定义=-80~+80%
    // 返回本次实际增减值（含正负号）
    applyGameProgressByImpact(impact, isCustom) {
        let delta;
        if (isCustom) {
            delta = Math.round((Math.random() * 160 - 80)); // -80 ~ +80
        } else if (impact === 'good') {
            delta = Math.round(10 + Math.random() * 6);     // +10 ~ +15
        } else if (impact === 'bad') {
            delta = -Math.round(15 + Math.random() * 11);   // -15 ~ -25
        } else {
            delta = Math.round(Math.random() * 10 - 5);     // -5 ~ +5
        }
        this.textGameProgress = Math.max(0, Math.min(100, (this.textGameProgress || 0) + delta));
        return delta;
    }

    // 展示一次进度增减的视觉反馈（进度条更新 + 增减气泡）
    flashGameProgress(delta, label) {
        const cls = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat');
        const deltaText = (delta > 0 ? '+' : '') + delta + '% ' + (label || '');
        this.renderGameProgress({ deltaText, cls });
    }

    // 自定义行动：由 AI 评估的 impact 决定方向，幅度按概率分档（避免自定义开局动辄大额加分）：
    // 1) ±15 分：65% 概率（小幅波动）
    // 2) +15~+40 分：AI 判定精妙时酌情给高分（幅度 15~40，25%）
    // 3) +40~+80 分：选项天衣无缝的表现（10%）
    // 4) -15~-40 分：AI 判定明显脱离任务，酌情扣分（幅度 15~40，25%）
    // 5) -40~-80 分：选项离谱、与剧情无关或超常理（10%）
    // 方向由 AI 的 impact 决定：good→加分、bad→扣分、neutral→小幅随机（±15 内）
    applyCustomProgressByImpact(impact) {
        const roll = Math.random();
        let mag;
        if (roll < 0.65) {
            mag = Math.random() * 15;                 // ±0~15（65%）
        } else if (roll < 0.90) {
            mag = 15 + Math.random() * 25;             // 15~40（25% 酌情）
        } else {
            mag = 40 + Math.random() * 40;             // 40~80（10% 天衣无缝/离谱到家）
        }
        let delta;
        if (impact === 'good') {
            delta = Math.round(mag);
        } else if (impact === 'bad') {
            delta = -Math.round(mag);
        } else {
            // neutral：小幅随机（±15 内，避免平庸行动也推动大波动）
            mag = Math.random() * 15;
            delta = Math.round(mag) * (Math.random() < 0.5 ? -1 : 1);
        }
        this.textGameProgress = Math.max(0, Math.min(100, (this.textGameProgress || 0) + delta));
        return delta;
    }

    // 通关（progress≥100%）或 GAME OVER（progress≤0%）时的结局处理：
    // 通关走 AI 结局总结；GAME OVER 直接提示，不再请求 AI
    handleTextGameEnd(type) {
        // 立即完成进行中的流式打字，直接展示全部回传内容，再进入结局
        this.finishTextGameStreaming();
        const label = type === 'win' ? '通关！' : 'GAME OVER';
        this.renderGameProgress({ finalText: label, cls: type === 'win' ? 'win' : 'lose' });
        // 隐藏交互区，避免继续选择
        try {
            const choicesEl = document.getElementById('gameChoices');
            if (choicesEl) { choicesEl.innerHTML = ''; choicesEl.classList.add('hidden'); }
            const inputContainer = document.getElementById('playerInputContainer');
            if (inputContainer) inputContainer.classList.add('hidden');
        } catch (e) {}
        if (type === 'win') {
            // 通关：请求 AI 生成最终结局总结
            const kw = (this.textGameConfig && this.textGameConfig.keywords) || [];
            this.appendAiMessage(`<div class="ai-note">🎉 任务完成！进度已满，正在撰写大结局...\nMission complete! The grand finale is being written...</div>`, kw);
            const vocabNote = this.buildTextGameVocabNote();
            const prompt = `You are a game master ending an interactive text game. The player has successfully completed the mission.${vocabNote} Write a triumphant final epilogue (100-180 words) that resolves the story, referencing the mission and weaving in these keywords sparingly — only 0-4 of them per turn: ${kw.join(', ')} (for about half of them use an inflected/derived form like plural, tense change, -ing/-ed participle, or derived adjective/adverb, e.g. "underwent" for "undergo"). End with a clear sense of victory. Do NOT write any meta or filler phrases inside the narration such as "mission complete", "task complete", "you win", "well done", "100%", progress percentages, or any completion-status announcements — narrate the ending purely in-story. Output only the narration text.`;
            const modelName = this.textGameConfig.model || this.getLastUsedModel();
            // 结局回合序号：玩家撤回后，进行中的结局生成将被忽略
            const endTurn = ++this._textGameTurnSeq;
            AIService.callModel(modelName, prompt).then(aiText => {
                if (endTurn !== this._textGameTurnSeq) return;
                const cleaned = this.cleanAiNarration(aiText);
                this.appendAiMessage(this.applyKeywordHighlight(cleaned, kw), kw);
            }).catch(err => {
                if (endTurn !== this._textGameTurnSeq) return;
                console.error('结局生成失败：', err);
                this.appendAiMessage('<div class="ai-error">结局生成失败，但你已通关！You win! 🎉</div>');
            });
        } else {
            // GAME OVER：直接提示，不再请求 AI
            this.appendAiMessage('<div class="ai-error">💀 GAME OVER — 你的选择让你偏离了任务，故事到此结束。\nYour choices led you astray; the story ends here.</div>');
        }
    }

    // 组装 AI 剧情拓展 prompt 时附加当前通关进度，供 AI 校对走向与结局引导
    buildTextGameProgressNote() {
        const p = Math.max(0, Math.min(100, Math.round(this.textGameProgress || 0)));
        if (p >= 100) return ' The player has reached 100% task progress (mission complete) — wrap toward the final victory ending.';
        if (p <= 0) return ' The player is at 0% task progress (total failure) — the story ends in a dead end / GAME OVER.';
        if (p >= 80) return ` The player is near completion (${p}% progress) — steer strongly toward the final ending.`;
        if (p <= 20) return ` The player is close to failure (${p}% progress) — the tension is high, give them a narrow chance to recover.`;
        return ` Current task progress is ${p}%.`;
    }

    // 组装词汇难度约束：将用户选择的词汇等级（A / B1 / B2 / C1 / C2）写入 AI prompt。
    // 旧版约束太宽泛（仅"avoid advanced words"），AI 常忽略并返回 C2 生僻词，
    // 因此改为硬性规则：明确禁止的书面/罕见词示例 + 句式要求。
    buildTextGameVocabNote() {
        let level = (this.textGameConfig && this.textGameConfig.vocabLevel) || 'B1';
        level = String(level).toUpperCase();
        const spec = {
            A:  { name: 'CEFR A (beginner)',        rule: 'only the most basic everyday words (go, see, big, water, house, happy); one short clause per sentence' },
            A1: { name: 'CEFR A1 (beginner)',       rule: 'only the most basic everyday words (go, see, big, water, house, happy); one short clause per sentence' },
            A2: { name: 'CEFR A2 (elementary)',     rule: 'simple everyday words and short sentences; nothing literary or formal' },
            B1: { name: 'CEFR B1 (intermediate)',   rule: 'common everyday words an intermediate learner knows; short, clear subject-verb-object sentences; NO rare, literary, archaic or C2 words such as monarch, disarray, squall, snobbery, seething, spectral, secretion, lurched, glimpsed, desolate, absurd, turmoil' },
            B2: { name: 'CEFR B2 (upper-intermediate)', rule: 'common, natural words that fluent learners use; avoid obscure literary or archaic words (e.g. snobbery, seething, spectral, secretion)' },
            C1: { name: 'CEFR C1 (advanced)',       rule: 'advanced but widely used words; avoid extremely rare or archaic ones (e.g. obfuscate, sesquipedalian)' },
            C2: { name: 'CEFR C2 (proficient)',     rule: 'rich vocabulary is allowed but must stay readable' }
        };
        const s = spec[level] || spec['B1'];
        return ` Write ALL narration strictly at ${s.level} English difficulty and HARD-ENFORCE this: ${s.rule}. The chosen keywords (including their inflected forms) may still appear even if slightly above that level, but every other word must stay within the level; if a sentence would require an advanced word, rewrite it with a simpler synonym. A whole story must read as if written specifically for an English learner at that level.`;
    }

    // 清理 AI 返回叙述文本中残留的 Markdown 代码块围栏（如 ```json / ``` / ```` 等），
    // 全局移除任意位置的围栏标记，避免 "```json" 之类标记混入正文显示
    cleanAiNarration(text) {
        if (!text) return '';
        let t = String(text).trim();
        // 全局移除 ```json / ```javascript / ```js / ``` 等围栏标记（含行内出现）
        t = t.replace(/```(?:json|javascript|js)?\s*/gi, '');
        // 移除残留的孤立反引号对/围栏
        t = t.replace(/```+/g, '');
        return t.trim();
    }

    // 30-60% 概率将上一轮"未选择的选项"保留到新一轮选项中：
    // - 以随机概率（30%~60%区间内随机取值）决定是否保留
    // - 从旧选项中剔除已被选择的 index，随机挑选 1~2 个保留
    // - 保留选项保持原 impact（正确/错误各半由AI当初标注决定；无 impact 则随机补标）
    // - 保留若干旧项时，新选项相应截断，总量封顶 3 个
    // 注：本机制已停用——为让每次选择后所有答案都随 AI 刷新，
    // handleChoiceSelected 直接改用 AI 返回的全新选项，不再调用本方法。
    mixCarriedOverOptions(prevOptions, chosenIndex, newOptions) {
        const mixed = Array.isArray(newOptions) ? newOptions.slice() : [];
        // 无旧选项或旧选项不完整时直接返回新选项
        if (!Array.isArray(prevOptions) || prevOptions.length < 2) return mixed;

        // 上一轮未被选择的选项（剔除已选的那个）
        const remaining = prevOptions.filter((_, i) => i !== chosenIndex);
        if (!remaining.length) return mixed;

        // 随机决定是否保留（每次请求在 30%~60% 之间随机取概率，非固定值）
        const keepChance = 0.3 + Math.random() * 0.3; // 30%~60%
        if (Math.random() >= keepChance) return mixed;

        // 随机保留 1~2 个（不超过剩余可选数，且给新选项至少留 1 个位置）
        const shuffled = remaining.slice().sort(() => Math.random() - 0.5);
        const keepCount = Math.min(1 + Math.floor(Math.random() * 2), shuffled.length, Math.max(0, 3 - 1));
        const carried = shuffled.slice(0, keepCount).map(opt => {
            // 规范化为 {text, impact} 对象
            const text = this.normalizeGameOption(opt);
            let impact = this.getGameOptionImpact(opt);
            // 无 impact 时随机标注，保证保留项正确/错误概率各半
            if (!impact) impact = Math.random() < 0.5 ? 'good' : 'bad';
            return { text, impact };
        });

        // 保留项排在前面（保证一定出现），新选项截断到剩余槽位，总量 3 个封顶
        const slots = Math.max(0, 3 - carried.length);
        const merged = carried.concat(mixed.slice(0, slots)).slice(0, 3);
        return merged;
    }

    // Show intro/mission then render either choice UI or input UI as dialog-style conversation
    showGameIntroAndInteraction(scene, keywords, mode) {
        const choicesEl = document.getElementById('gameChoices');
        const inputContainer = document.getElementById('playerInputContainer');
        const inputEl = document.getElementById('playerInput');
        const feedbackEl = document.getElementById('inputFeedback');

        // Render Background and Mission in the fixed top-right meta box instead of appending inline
        try {
            const sceneMeta = document.getElementById('sceneMeta');
            const bgEl = document.getElementById('sceneBackground');
            const msEl = document.getElementById('sceneMission');
            if (bgEl) {
                bgEl.innerHTML = `<strong>Background</strong><div>${this.applyKeywordHighlight(this.normalizeGameOption(scene.background), keywords)}</div>`;
            }
            if (msEl) {
                msEl.innerHTML = `<strong>Mission</strong><div>${this.applyKeywordHighlight(this.normalizeGameOption(scene.mission), keywords)}</div>`;
            }
            if (sceneMeta) sceneMeta.classList.remove('hidden');
        } catch (e) {
            // fallback to appending if meta box not available
            const aiHtml = `<div><strong>Background</strong><div>${this.applyKeywordHighlight(scene.background || '', keywords)}</div></div>
                            <div style="margin-top:8px;"><strong>Mission</strong><div>${this.applyKeywordHighlight(scene.mission || '', keywords)}</div></div>`;
            this.appendAiMessage(aiHtml);
        }

        // Clear existing replies
        if (choicesEl) { choicesEl.innerHTML = ''; choicesEl.classList.add('hidden'); }
        if (inputContainer) { inputContainer.classList.add('hidden'); if (inputEl) inputEl.value = ''; if (feedbackEl) feedbackEl.textContent = ''; }

        const chosenMode = mode === 'input' || mode === 'choice' ? mode : (Math.random() < 0.5 ? 'choice' : 'input');

        if (chosenMode === 'choice') {
            const rawOpts = (scene.options && Array.isArray(scene.options) && scene.options.length) ? scene.options : ['Option A','Option B','Option C'];
            // 规范化选项：对象元素转为字符串，避免 "[object Object]"；同时保留原始项以读取 impact
            const opts = rawOpts.slice(0, 3).map(o => this.normalizeGameOption(o));
            const impacts = rawOpts.slice(0, 3).map(o => this.getGameOptionImpact(o));
            if (choicesEl) {
                const quickContainer = document.createElement('div');
                quickContainer.className = 'quick-replies';

                // 长按 500ms 才发送选项；点击/双击选项内高亮生词不启动长按计时（交由关键词点击弹窗）
                const attachLongPressSend = (btn, doSend) => {
                    let pressTimer = null;
                    let sent = false;
                    const fillEl = document.createElement('span');
                    fillEl.className = 'press-fill';
                    btn.appendChild(fillEl);
                    const clearPress = () => {
                        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
                        fillEl.classList.remove('press-fill-active');
                    };
                    btn.addEventListener('pointerdown', (e) => {
                        // 点击/双击选项内的高亮生词：不启动长按计时
                        if (e.target.closest('.keyword-highlight')) { clearPress(); return; }
                        if (sent) return;
                        clearPress();
                        fillEl.classList.add('press-fill-active');
                        pressTimer = setTimeout(() => {
                            pressTimer = null;
                            // 若按钮已被禁用（说明其他选项已先行提交），不再触发发送，避免重复 AI 请求
                            if (btn.disabled) {
                                fillEl.classList.remove('press-fill-active');
                                return;
                            }
                            sent = true;
                            fillEl.classList.add('press-fill-done');
                            doSend();
                        }, 500);
                    });
                    ['pointerup', 'pointerleave', 'pointercancel'].forEach(evt => {
                        btn.addEventListener(evt, clearPress);
                    });
                    // 注意：不在按钮上拦截 click —— 让点击高亮词事件自然冒泡到 document 委托，
                    // 从而弹出单词卡片；长按发送只依赖 pointerdown 计时，与 click 无关
                };

                const submitChoice = (idx, opt, impact) => {
                    // 用户在流式期间抢答：立即完成旧流式，直接显示全部内容
                    this.finishTextGameStreaming();
                    // 先行禁用全部选项，防止其他选项再触发重复提交
                    quickContainer.querySelectorAll('.quick-reply-btn').forEach(b => b.disabled = true);
                    // show player's choice as bubble
                    const playerNode = this.appendPlayerMessage(opt);
                    // 记录行动前状态快照，供撤回（每场最多 3 次）
                    this.pushTextGameUndo(playerNode, scene, chosenMode, keywords);
                    // 依据选项走向应用进度增减（正确/错误/平庸；impact 缺失时按平庸处理）
                    const delta = this.applyGameProgressByImpact(impact, false);
                    this.flashGameProgress(delta);
                    // 进度达到边界：通关或 GAME OVER，不再请求 AI
                    if (this.textGameProgress >= 100) { this.handleTextGameEnd('win'); return; }
if (this.textGameProgress < 0) { this.handleTextGameEnd('lose'); return; }
                    // continue
                    this.handleChoiceSelected(idx, opt, scene, keywords);
                };

                opts.forEach((opt, idx) => {
                    const btn = document.createElement('button');
                    btn.className = 'quick-reply-btn';
                    btn.innerHTML = this.applyKeywordHighlight(this.cleanAiNarration(opt), keywords);
                    const impact = impacts[idx] || 'neutral';
                    attachLongPressSend(btn, () => submitChoice(idx, opt, impact));
                    quickContainer.appendChild(btn);
                });
                // create free-form input + Enter button container (left of Skip)
                const entryWrap = document.createElement('div');
                entryWrap.className = 'quick-entry-group';

                const freeInput = document.createElement('input');
                freeInput.type = 'text';
                freeInput.className = 'quick-free-input';
                freeInput.placeholder = 'Enter your decision...';
                freeInput.setAttribute('aria-label', 'Free-form decision input');

                const enterBtn = document.createElement('button');
                enterBtn.className = 'quick-reply-enter';
                enterBtn.textContent = 'Enter';

                // Enter button handler: copy value to the main player input and submit evaluation
                const submitFreeInput = () => {
                    const val = freeInput.value ? freeInput.value.trim() : '';
                    if (!val) return;
                    // 用户在流式期间抢答：立即完成旧流式，直接显示全部内容
                    this.finishTextGameStreaming();
                    // disable quick replies to prevent double submissions
                    quickContainer.querySelectorAll('.quick-reply-btn').forEach(b => b.disabled = true);
                    freeInput.disabled = true;
                    enterBtn.disabled = true;
                    // mirror into shared playerInput element so existing submit flow works
                    try {
                        const sharedInput = document.getElementById('playerInput');
                        if (sharedInput) sharedInput.value = val;
                    } catch (e) {}
                    const playerNode = this.appendPlayerMessage(val);
                    // 记录行动前状态快照，供撤回（每场最多 3 次）
                    this.pushTextGameUndo(playerNode, scene, chosenMode, keywords);
                    // 自定义选项的进度增减交由 AI 评估后决定（见 handlePlayerInputSubmit）
                    // quickEntry=true：评估后强制回到选择模式，不再弹回主输入框
                    this.handlePlayerInputSubmit(scene, keywords, true);
                };

                enterBtn.addEventListener('click', submitFreeInput);
                freeInput.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') {
                        ev.preventDefault();
                        submitFreeInput();
                    }
                });

                entryWrap.appendChild(freeInput);
                entryWrap.appendChild(enterBtn);

                // place free-input and Skip on the same horizontal row
                const entryRow = document.createElement('div');
                entryRow.className = 'quick-entry-row';
                entryRow.appendChild(entryWrap);

                const skipBtn = document.createElement('button');
                skipBtn.className = 'quick-reply-btn skip';
                skipBtn.textContent = 'Skip';
                attachLongPressSend(skipBtn, () => {
                    // 用户在流式期间抢答：立即完成旧流式，直接显示全部内容
                    this.finishTextGameStreaming();
                    const playerNode = this.appendPlayerMessage('Skip');
                    // 记录行动前状态快照，供撤回（每场最多 3 次）
                    this.pushTextGameUndo(playerNode, scene, chosenMode, keywords);
                    quickContainer.querySelectorAll('.quick-reply-btn').forEach(b => b.disabled = true);
                    // also disable free input
                    freeInput.disabled = true;
                    enterBtn.disabled = true;
                    this.handleChoiceSelected(-1, 'skip', scene, keywords);
                });
                entryRow.appendChild(skipBtn);
                quickContainer.appendChild(entryRow);
                choicesEl.appendChild(quickContainer);
                choicesEl.classList.remove('hidden');
            }
        } else {
            if (inputContainer) {
                inputContainer.classList.remove('hidden');
                if (inputEl) { inputEl.classList.add('fade-in'); inputEl.focus(); }
                const submitBtn = document.getElementById('playerSubmitBtn');
                const cancelBtn = document.getElementById('playerCancelBtn');
                if (submitBtn) {
                    submitBtn.onclick = () => {
                        const val = inputEl ? inputEl.value.trim() : '';
                        if (!val) return;
                        // 用户在流式期间抢答：立即完成旧流式，直接显示全部内容
                        this.finishTextGameStreaming();
                        const playerNode = this.appendPlayerMessage(val);
                        // 记录行动前状态快照，供撤回（每场最多 3 次）
                        this.pushTextGameUndo(playerNode, scene, chosenMode, keywords);
                        // 自定义选项的进度增减交由 AI 评估后决定（见 handlePlayerInputSubmit）
                        this.handlePlayerInputSubmit(scene, keywords);
                    };
                }
                if (cancelBtn) {
                    cancelBtn.onclick = () => {
                        inputContainer.classList.add('hidden');
                        this.showGameIntroAndInteraction(scene, keywords, 'choice');
                    };
                }
            }
        }

        // 首次展示场景时渲染通关进度条（显示当前进度，初始 0%）
        this.renderGameProgress();

        // Re-init keyword click handlers so highlights remain interactive
        this.initKeywordHighlightClick();
    }

    // Handle player selecting a choice
    async handleChoiceSelected(index, optionText, scene, keywords) {
        // Demo 模式：走预设剧本，不调用AI
        // 注意：选项按钮的点击处理已先 appendPlayerMessage 展示玩家气泡，
        // 这里不再重复追加，避免 message-list 中出现两条相同的选项气泡
        if (this._demoTextMode) {
            this._handleDemoChoice(index);
            return;
        }
        // 回合序号：撤回会使进行中的 AI 回合一并失效
        const turn = ++this._textGameTurnSeq;
        // Call AI to continue the narration based on selected action
        // show waiting placeholder while AI is processing
        const placeholder = this.showAiWaiting('Things happening...');
        try {
            const progressNote = this.buildTextGameProgressNote();
            const vocabNote = this.buildTextGameVocabNote();
            const prompt = `Continue the interactive text game narration in English. Previous background: ${scene.background}. Mission: ${scene.mission}. Player chose: ${optionText}.${vocabNote} Available keywords: ${keywords.join(', ')} (use them sparingly — 0-4 per turn is enough, or none at all; weave only what fits naturally into this turn's narration, and try to use up all remaining keywords across later turns, options, and the ending. When used, for about half of them use an inflected/derived form such as plural, tense change, -ing/-ed participle, or a derived adjective/adverb, e.g. "underwent" for "undergo", so the player can still recognize the base word).${progressNote} Produce a short narration (100-180 words) and then output JSON with keys options (3 new option objects) and interaction_mode ("choice" or "input"). Each option must include an "impact" field: "good" (correct path), "bad" (wrong path), or "neutral" (mediocre middle path); provide a sensible mix (usually one good, one bad, one neutral). Output the narration first, then the JSON object alone like {"options":[{"text":"...","impact":"good"}],"interaction_mode":"choice"}.`;
            const modelName = this.textGameConfig.model || this.getLastUsedModel();
            const aiText = await AIService.callModel(modelName, prompt);

            // 若玩家在此期间已撤回本次选择，则忽略本次返回
            if (turn !== this._textGameTurnSeq) return;

            // extract narration and JSON similar to start
            let jsonMatch = aiText.match(/\{[\s\S]*\}/);
            let narration = aiText;
            let sceneObj = null;
            if (jsonMatch) {
                narration = aiText.substring(0, jsonMatch.index).trim();
                try { sceneObj = JSON.parse(jsonMatch[0]); } catch(e){ console.warn('parse continue JSON failed', e); }
            }
            // 清理叙述中遗留的 Markdown 代码块围栏（"```json" 等）
            narration = this.cleanAiNarration(narration);
            // prepare highlighted HTML
            const highlighted = this.applyKeywordHighlight(narration, keywords);
            if (placeholder) {
                try { this.clearAiWaiting(placeholder); } catch (e) {}
                this.streamIntoAiNode(placeholder, highlighted, this.stripHtml(narration), keywords);
            } else {
                this.appendAiMessage(highlighted);
            }

            // If next scene object exists, show next interaction
            if (sceneObj) {
                // 直接使用 AI 返回的全新选项；不再保留上一轮旧选项，
                // 避免未选择的旧答案一直霸占位置不更新
                const freshOptions = (sceneObj.options && Array.isArray(sceneObj.options)) ? sceneObj.options : [];
                setTimeout(() => {
                    this.showGameIntroAndInteraction({
                        background: scene.background,
                        mission: scene.mission,
                        options: freshOptions,
                    }, keywords, sceneObj.interaction_mode || 'choice');
                }, 200);
            }
        } catch (err) {
            // 撤回后的失败不再提示
            if (turn !== this._textGameTurnSeq) return;
            console.error('Error continuing narration:', err);
            if (placeholder) {
                try { this.clearAiWaiting(placeholder); } catch (e) {}
                placeholder.innerHTML = '<div class="ai-error">Narration failed. Please try again. 叙述生成失败，请重试。</div>';
            } else {
                this.appendAiMessage('<div class="ai-error">Narration failed. Please try again. 叙述生成失败，请重试。</div>');
            }
        }
    }

    // Handle free-input submit: evaluate via AI and either continue or request correction/punishment
    // forceChoiceNext：true 表示本输入来自 quick 自定义选项（quick free-input），
    // 评估后强制回到选择模式，避免再弹主输入框
    async handlePlayerInputSubmit(scene, keywords, forceChoiceNext) {
        const inputEl = document.getElementById('playerInput');
        const feedbackEl = document.getElementById('inputFeedback');
        const playerText = inputEl ? inputEl.value.trim() : '';
        if (!playerText) {
            if (feedbackEl) feedbackEl.textContent = 'Please enter an action.';
            return;
        }
        // 回合序号：撤回会使进行中的 AI 回合一并失效
        const turn = ++this._textGameTurnSeq;

        // Ask AI to evaluate player's input for relevance & continue or punish
        try {
            const progressNote = this.buildTextGameProgressNote();
            const vocabNote = this.buildTextGameVocabNote();
            const prompt = `You are a strict and unbiased game master. Given the current background: "${scene.background}" and the mission: "${scene.mission}", and keywords: ${keywords.join(', ')}, critically evaluate the player's proposed action: "${playerText}".${vocabNote}${progressNote}
Judge the action ONLY by how much it serves the mission:
- Clearly progresses toward the mission → valid=true, impact="good".
- Somewhat on-topic but timid/ineffective/unsure → valid=true, impact="neutral".
- Reckless, dangerous, directly against the mission, or nonsensical/off-topic → valid=false with punish=true and impact="bad" (a severe mistake that must hurt progress).
- Mostly related but with a serious consequence that sets the mission back → valid=true and impact="bad" (still continues the story, but the progress must drop).
Be strictly honest — do NOT always give "good". Depending on the input text, sometimes good, sometimes neutral, sometimes bad. The player relies on this evaluation to steer the mission, so "reason" must explicitly explain why the action helps or hurts the mission.
Return a JSON object with:
{"valid": true/false, "reason":"1-2 sentence evaluation of this exact input, shown to the player", "punish": true/false, "impact":"good"/"bad"/"neutral", "narration":"next narration text", "next_interaction":"choice" or "input", "options":[{"text":"opt1","impact":"good"},{"text":"opt2","impact":"bad"},{"text":"opt3","impact":"neutral"}]}
When including options, each must have an "impact" field. Use the available keywords sparingly in the "narration" — 0-4 entries per turn is enough, or none at all; weave in only what fits naturally and try to use up all remaining keywords across later turns and the ending. When used, for about half of them use an inflected/derived form (plural, tense change, -ing/-ed participle, derived adjective/adverb) instead of the base form, e.g. "underwent" for "undergo", so the player can still recognize the base word. Only output the JSON object.`;
            const placeholder = this.showAiWaiting('Things happening...');
            const modelName = this.textGameConfig.model || this.getLastUsedModel();
            const aiResp = await AIService.callModel(modelName, prompt);

            // 若玩家在此期间已撤回本次输入，则忽略本次返回
            if (turn !== this._textGameTurnSeq) return;

            const jsonMatch = aiResp.match(/\{[\s\S]*\}/);
            let evalObj = null;
            if (jsonMatch) {
                try { evalObj = JSON.parse(jsonMatch[0]); } catch (e) { console.warn('parse eval JSON failed', e); }
            }

            if (!evalObj) {
                if (feedbackEl) feedbackEl.textContent = 'Evaluation failed. Please try again.';
                return;
            }

            // If invalid and punish => show reason and apply penalty (progress must DECREASE, never increase)
            if (!evalObj.valid) {
                if (feedbackEl) feedbackEl.textContent = `Incorrect / Off-topic: ${evalObj.reason || 'Please try again.'}`;
                if (evalObj.punish) {
                    this.playerScore = (this.playerScore || 10) - 1;
                    this.appendAiMessage(`<div class="penalty">You were penalized. Score: ${this.playerScore}</div>`);
                    // 惩罚：进度向 bad 方向扣减（-15~25，绝不增加）
                    const delta = this.applyGameProgressByImpact('bad', false);
                    this.flashGameProgress(delta, '惩罚');
                    if (this.textGameProgress <= 0) { this.handleTextGameEnd('lose'); return; }
                    // re-enable inputs after a short delay so the player can continue
                    setTimeout(() => {
                        try {
                            document.querySelectorAll('#gameChoices .quick-replies .quick-reply-btn').forEach(b => b.disabled = false);
                            document.querySelectorAll('#gameChoices .quick-free-input').forEach(i => i.disabled = false);
                            document.querySelectorAll('#gameChoices .quick-reply-enter').forEach(b => b.disabled = false);
                            const shared = document.getElementById('playerInput');
                            if (shared) { shared.disabled = false; }
                        } catch (e) { /* ignore */ }
                    }, 900);
                } else {
                    // allow retry immediately
                    try {
                        document.querySelectorAll('#gameChoices .quick-replies .quick-reply-btn').forEach(b => b.disabled = false);
                        document.querySelectorAll('#gameChoices .quick-free-input').forEach(i => i.disabled = false);
                        document.querySelectorAll('#gameChoices .quick-reply-enter').forEach(b => b.disabled = false);
                        const shared = document.getElementById('playerInput');
                        if (shared) { shared.disabled = false; }
                    } catch (e) { /* ignore */ }
                }
                return;
            }

            // Otherwise, append narration and continue with next interaction
            // 自定义行动：根据 AI 评估的 impact 应用大波动进度增减（方向由 AI 判定）
            const impact = (evalObj.impact === 'good' || evalObj.impact === 'bad' || evalObj.impact === 'neutral')
                ? evalObj.impact : 'neutral';
            const delta = this.applyCustomProgressByImpact(impact);
            this.flashGameProgress(delta, impact === 'good' ? '行动成功' : (impact === 'bad' ? '行动失误' : '行动平淡'));
            // 展示 AI 对玩家输入的评估理由，让玩家看到 AI 确实依据答案内容做了评判
            if (evalObj.reason) {
                const reasonText = String(evalObj.reason).trim();
                if (reasonText) {
                    const reasonHtml = `<div class="ai-note" style="font-size:0.9rem;opacity:0.9;">🧭 评估：${this.escapeHtml(reasonText)}</div>`;
                    if (placeholder) {
                        try { placeholder.insertAdjacentHTML('afterend', reasonHtml); } catch (e) {}
                    } else {
                        this.appendAiMessage(reasonHtml);
                    }
                }
            }
            if (this.textGameProgress >= 100) { this.handleTextGameEnd('win'); return; }
            if (this.textGameProgress <= 0) { this.handleTextGameEnd('lose'); return; }
            // 清理 AI 返回的 narration 中残留的 Markdown 围栏后展示
            const nextNarrationHtml = this.applyKeywordHighlight(this.cleanAiNarration(evalObj.narration || ''), keywords);
            if (placeholder) {
                try { placeholder.innerHTML = nextNarrationHtml; } catch (e) { this.appendAiMessage(nextNarrationHtml); }
            } else {
                this.appendAiMessage(nextNarrationHtml);
            }

            // show next interaction depending on evalObj.next_interaction
            // 若本次输入来自 quick 自定义选项（quickEntry），评估后直接给出新选项，
            // 不再弹回主输入框（避免“已发送答案还要求再输入”）；主输入框模式才尊重 AI 的 next_interaction
            const nextMode = forceChoiceNext ? 'choice' : (evalObj.next_interaction || 'choice');
            this.showGameIntroAndInteraction({
                background: scene.background,
                mission: scene.mission,
                options: evalObj.options || []
            }, keywords, nextMode);
        } catch (err) {
            // 撤回后的失败不再提示
            if (turn !== this._textGameTurnSeq) return;
            console.error('Error evaluating player input:', err);
            const feedbackEl = document.getElementById('inputFeedback');
            if (feedbackEl) feedbackEl.textContent = 'Evaluation error. Try again later.';
        }
    }

    // Move the shared keyword selector (from reading app) into target container
    moveKeywordSelectorTo(targetId) {
        try {
            const tabs = document.querySelector('.keyword-mode-tabs');
            const content = document.querySelector('.keyword-mode-content');
            const selected = document.getElementById('selectedKeywords');
            if (!tabs || !content || !selected) return;

            if (!this.keywordSelectorOriginalParent) {
                this.keywordSelectorOriginalParent = tabs.parentNode;
            }

            const target = document.getElementById(targetId);
            if (!target) return;

            target.appendChild(tabs);
            target.appendChild(content);
            target.appendChild(selected);
        } catch (e) {
            console.error('moveKeywordSelectorTo error:', e);
        }
    }

    // Restore the shared keyword selector back to its original parent
    restoreKeywordSelector() {
        try {
            if (!this.keywordSelectorOriginalParent) return;
            const tabs = document.querySelector('.keyword-mode-tabs');
            const content = document.querySelector('.keyword-mode-content');
            const selected = document.getElementById('selectedKeywords');
            if (!tabs || !content || !selected) return;

            this.keywordSelectorOriginalParent.appendChild(tabs);
            this.keywordSelectorOriginalParent.appendChild(content);
            this.keywordSelectorOriginalParent.appendChild(selected);
            this.keywordSelectorOriginalParent = null;
        } catch (e) {
            console.error('restoreKeywordSelector error:', e);
        }
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
                level: '雅思',  // 538 阅读同义替换词（雅思）
                synonyms: synonyms
            });
        }
        
        console.log(`📊 处理538数据: ${rawData.length} 行 → ${processed.length} 个有效单词`);
        return processed;
    }
    
    // 加载内置考研同义替换文档
    async loadBuiltInKaoyanSynonymDoc() {
        console.log('📚 加载内置考研同义替换文档...');
        this.showLoading('正在加载考研同义替换文档...');
        
        try {
            if (typeof synonymKaoyanData === 'undefined') {
                throw new Error('内置数据未加载，请确保 synonym-kaoyan-data.js 已引入');
            }
            
            const data = this.processSynonymKaoyanData(synonymKaoyanData);
            
            const doc = {
                id: 'built-in-kaoyan',
                name: '考研同义替换词（内置）',
                fileName: '考研同义替换词.xlsx',
                uploadTime: new Date().toISOString(),
                wordCount: data.length,
                data: data,
                isBuiltIn: true
            };
            
            this.synonymDocs.push(doc);
            this.saveSynonymDocsCache();
            
            this.hideLoading();
            this.showToast('已加载内置考研同义替换文档', 'success');
            console.log('✅ 内置考研文档加载成功:', data.length, '个单词');
        } catch (error) {
            console.error('内置考研文档加载失败:', error);
            this.hideLoading();
            this.showToast('内置考研文档加载失败：' + error.message, 'error');
        }
    }
    
    // 处理考研同义替换数据格式
    processSynonymKaoyanData(rawData) {
        const processed = [];
        
        for (const row of rawData) {
            const word = (row['重点词'] !== undefined ? String(row['重点词']) : '').trim();
            const synonymsStr = (row['雅思阅读同义词'] || '').toString();
            
            if (!word || !synonymsStr) continue;
            
            // 解析同义词（支持换行符、逗号、斜杠等分隔）
            const synonyms = synonymsStr
                .split(/[\n,，、;；/]/)
                .map(s => s.trim())
                .filter(s => s && s.length > 0);
            
            if (synonyms.length === 0) continue;
            
            processed.push({
                word: word,
                phonetic: '',  // 考研数据中没有音标字段
                meaning: (row['释义'] || '').toString().trim(),
                level: '考研',
                synonyms: synonyms
            });
        }
        
        console.log(`📊 处理考研数据: ${rawData.length} 行 → ${processed.length} 个有效单词`);
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
                <div class="doc-item-actions">
                    ${doc.isBuiltIn ? `
                        <button class="btn-doc-action btn-doc-view" data-action="view" data-id="${doc.id}" title="查看词单">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    ` : `
                        <button class="btn-doc-action" data-action="delete" data-id="${doc.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    `}
                </div>
            `;
            
            // 点击选择文档
            docItem.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-doc-action')) {
                    this.selectSynonymDoc(doc.id);
                }
            });
            
            // 查看词单按钮
            const viewBtn = docItem.querySelector('[data-action="view"]');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewSynonymDocList(doc.id);
                });
            }
            
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
    
    // 查看同义词词单内容（复用 word-list-screen 样式）
    viewSynonymDocList(docId) {
        const doc = this.synonymDocs.find(d => d.id === docId);
        if (!doc || !Array.isArray(doc.data)) return;
        
        document.getElementById('synonymConfig').classList.add('hidden');
        document.getElementById('synonymPractice').classList.add('hidden');
        document.getElementById('synonymCompletion').classList.add('hidden');
        document.getElementById('synonymWordListView').classList.remove('hidden');
        
        document.getElementById('synonymViewDocName').textContent = doc.name;
        document.getElementById('synonymViewDocCount').textContent = doc.wordCount;
        
        const tbody = document.getElementById('synonymViewDocTableBody');
        tbody.innerHTML = '';
        
        doc.data.forEach((item, index) => {
            const row = document.createElement('tr');
            if (index % 2 === 0) row.classList.add('word-list-row-even');
            
            const idxCell = document.createElement('td');
            idxCell.className = 'word-list-cell word-list-cell-index';
            idxCell.textContent = index + 1;
            row.appendChild(idxCell);
            
            const wordCell = document.createElement('td');
            wordCell.className = 'word-list-cell word-list-cell-word';
            wordCell.innerHTML = `<strong>${this.escapeHtml(item.word)}</strong>`;
            row.appendChild(wordCell);
            
            const phoneCell = document.createElement('td');
            phoneCell.className = 'word-list-cell word-list-cell-phonetic';
            phoneCell.textContent = item.phonetic || '-';
            row.appendChild(phoneCell);
            
            const meanCell = document.createElement('td');
            meanCell.className = 'word-list-cell word-list-cell-meaning';
            meanCell.textContent = item.meaning || '-';
            row.appendChild(meanCell);
            
            const synCell = document.createElement('td');
            synCell.className = 'word-list-cell word-list-cell-example';
            synCell.textContent = (item.synonyms && item.synonyms.length) ? item.synonyms.join('、') : '-';
            row.appendChild(synCell);
            
            tbody.appendChild(row);
        });
    }
    
    // 关闭同义词词单浏览视图
    closeSynonymWordListView() {
        document.getElementById('synonymWordListView').classList.add('hidden');
        document.getElementById('synonymConfig').classList.remove('hidden');
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
        
        // 初始化学习时长统计
        this.synonymStartTime = Date.now();
        this.synonymStatsRecorded = { correct: 0, wrong: 0, partial: 0 }; // 已记录的统计，避免重复计数
        
        // 获取当前已保存的时长作为基础
        const baseStats = Storage.loadStats();
        this.synonymBaseMinutes = baseStats.time || 0;
        
        // 启动实时统计显示定时器（秒级更新）
        this.startStatsDisplayTimer(this.synonymStartTime, this.synonymBaseMinutes);
        
        // 显示练习页面
        document.getElementById('synonymConfig').classList.add('hidden');
        document.getElementById('synonymPractice').classList.remove('hidden');
        // 练习模式：卡片背景透明无阴影
        const synContainer = document.getElementById('synonymAppContainer');
        if (synContainer) synContainer.classList.add('synonym-practice-mode');
        
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
        
        // 释义完整显示（含词性），与背单词模式一致
        document.getElementById('synonymWordMeaning').textContent = word.meaning;
        
        // 显示CEFR等级（与背单词模式一致：映射等级+对应配色）
        const cefrLevel = this.getWordCEFRLevel(word.word);
        const synonymLevelEl = document.getElementById('synonymWordLevel');
        if (cefrLevel) {
            synonymLevelEl.textContent = cefrLevel;
            synonymLevelEl.className = `word-level cefr-${cefrLevel.toLowerCase()}`;
            synonymLevelEl.style.display = 'inline-block';
        } else {
            synonymLevelEl.textContent = '';
            synonymLevelEl.className = 'word-level';
            synonymLevelEl.style.display = 'none';
        }
        
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
        
        // 实时更新学习时长统计
        this.updateSynonymStatsRealtime(isFullyCorrect, isPartiallyCorrect);
        
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
        
        // 实时更新学习时长统计（跳过算作错误）
        this.updateSynonymStatsRealtime(false, false);
        
        this.nextSynonymWord();
    }
    
    // 完成练习
    finishSynonymPractice() {
        // 计算统计
        const total = this.synonymResults.length;
        const correct = this.synonymResults.filter(r => r.correct).length;
        const partial = this.synonymResults.filter(r => r.partial).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        // 停止实时统计显示定时器
        this.stopStatsDisplayTimer();
        
        // 记录最终的学习时长和剩余统计
        if (this.synonymStartTime || this.effectiveStartTime) {
            // 计算实际学习时长（考虑暂停的情况）
            let elapsed = 0;
            const effectiveStart = this.effectiveStartTime || this.synonymStartTime;
            
            if (effectiveStart) {
                // 如果当前处于暂停状态，使用暂停时的累计时长
                if (this.isPausedDueToInactivity && this.pausedElapsedMinutes > 0) {
                    elapsed = this.pausedElapsedMinutes;
                } else {
                    elapsed = (Date.now() - effectiveStart) / 60000; // 分钟（保留小数）
                }
            }
            
            if (elapsed > 0) {
                // 计算剩余未记录的统计
                const remainingCorrect = correct - (this.synonymStatsRecorded.correct || 0);
                const remainingWrong = (total - correct - partial) - (this.synonymStatsRecorded.wrong || 0);
                const remainingPartial = partial - (this.synonymStatsRecorded.partial || 0);
                
                // 如果有剩余未记录的统计，更新统计（包括部分正确的也算错误）
                if (remainingCorrect > 0 || remainingWrong > 0 || remainingPartial > 0 || elapsed > 0.01) {
                    const currentStats = Storage.loadStats();
                    Storage.updateStats({
                        time: currentStats.time + elapsed,
                        correct: currentStats.correct + remainingCorrect,
                        wrong: currentStats.wrong + remainingWrong + remainingPartial // 部分正确也算错误
                    });
                    
                    console.log(`📊 同义词练习完成统计 - 时长: ${elapsed.toFixed(2)}分钟, 正确: ${remainingCorrect}, 错误: ${remainingWrong + remainingPartial}`);
                }
            }
            
            // 重置开始时间
            this.synonymStartTime = null;
            this.synonymBaseMinutes = null;
            this.effectiveStartTime = null;
        }
        
        // 更新今日统计显示
        this.updateStats();
        
        // 显示完成页面
        document.getElementById('synonymPractice').classList.add('hidden');
        document.getElementById('synonymCompletion').classList.remove('hidden');
        
        // 更新统计
        document.getElementById('synonymStatsTotal').textContent = total;
        document.getElementById('synonymStatsCorrect').textContent = correct;
        document.getElementById('synonymStatsPartial').textContent = partial;
        document.getElementById('synonymStatsAccuracy').textContent = `${accuracy}%`;
    }
    
    // 实时更新同义词练习统计（类似学习模式的实时更新）
    updateSynonymStatsRealtime(isFullyCorrect, isPartiallyCorrect) {
        if (!this.synonymStartTime) return;
        
        // 计算本次新增的答题数
        const currentCorrect = this.synonymResults.filter(r => r.correct).length;
        const currentWrong = this.synonymResults.filter(r => !r.correct && !r.partial && !r.skipped).length;
        const currentPartial = this.synonymResults.filter(r => r.partial).length;
        
        const newCorrect = currentCorrect - (this.synonymStatsRecorded.correct || 0);
        const newWrong = currentWrong - (this.synonymStatsRecorded.wrong || 0);
        const newPartial = currentPartial - (this.synonymStatsRecorded.partial || 0);
        const newTotal = newCorrect + newWrong + newPartial;
        
        if (newTotal > 0) {
            // 更新已记录的统计，避免下次重复计数
            this.synonymStatsRecorded.correct = currentCorrect;
            this.synonymStatsRecorded.wrong = currentWrong;
            this.synonymStatsRecorded.partial = currentPartial;
            
            // 更新存储的统计数据（只更新答题统计，不更新时长）
            // 时长由定时器实时显示，只在完成/退出时保存
            const currentStats = Storage.loadStats();
            
            // 同义词模式：部分正确也算错误，不计入学习单词数（因为这是练习，不是学习新单词）
            Storage.updateStats({
                correct: currentStats.correct + newCorrect,
                wrong: currentStats.wrong + newWrong + newPartial // 部分正确也算错误
            });
            
            // 更新界面显示（单词数和正确率）
            this.updateStats();
            
            console.log(`📊 同义词实时统计更新 - 新增: ${newTotal}题 (✓${newCorrect} ✗${newWrong} △${newPartial})`);
        }
    }
    
    // 退出练习
    exitSynonymPractice() {
        if (confirm('确定要退出练习吗？当前进度将不会保存。')) {
            // 停止实时统计显示定时器
            this.stopStatsDisplayTimer();
            
            // 记录已学习的时长（即使退出也记录）
            if (this.synonymStartTime || this.effectiveStartTime) {
                // 计算实际学习时长（考虑暂停的情况）
                let elapsed = 0;
                const effectiveStart = this.effectiveStartTime || this.synonymStartTime;
                
                if (effectiveStart) {
                    // 如果当前处于暂停状态，使用暂停时的累计时长
                    if (this.isPausedDueToInactivity && this.pausedElapsedMinutes > 0) {
                        elapsed = this.pausedElapsedMinutes;
                    } else {
                        elapsed = (Date.now() - effectiveStart) / 60000;
                    }
                }
                
                if (elapsed > 0) {
                    // 只更新时长，不更新答题统计（因为用户选择退出，不保存进度）
                    const currentStats = Storage.loadStats();
                    Storage.updateStats({
                        time: currentStats.time + elapsed
                    });
                    
                    console.log(`📊 同义词练习退出 - 已记录时长: ${elapsed.toFixed(2)}分钟`);
                }
                
                // 重置开始时间
                this.synonymStartTime = null;
                this.synonymBaseMinutes = null;
                this.effectiveStartTime = null;
            }
            
            // 更新今日统计显示
            this.updateStats();
            
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
        // 练习模式：卡片背景透明无阴影
        const synContainer = document.getElementById('synonymAppContainer');
        if (synContainer) synContainer.classList.add('synonym-practice-mode');
        
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
            
            // 与正常背单词模式一致的图标 + 配色类
            let className = 'unknown';
            let icon = '?';
            let text = '';
            if (lastResult.correct) {
                className = 'correct';
                icon = '✔';
                text = '上一题正确';
            } else if (lastResult.partial) {
                className = 'partial';
                icon = '△';
                text = '上一题部分正确';
            } else if (lastResult.skipped) {
                className = 'skipped';
                icon = '⊘';
                text = '上一题跳过';
            } else {
                className = 'wrong';
                icon = '✗';
                text = '上一题错误';
            }
            
            badge.style.display = 'flex';
            badge.className = `last-word-badge ${className}`;
            // 悬浮详情卡片：上一组答案对照
            const detailHtml = this.buildSynonymLastBadgeDetail(lastResult);
            badge.innerHTML = `
                <span class="badge-icon">${icon}</span>
                <span class="badge-content">
                    <span class="badge-word">${text}</span>
                </span>
                <span class="badge-tooltip">${detailHtml}</span>
            `;
        } else {
            badge.style.display = 'none';
            badge.className = 'last-word-badge';
        }
    }

    // 构建上一题悬浮详情卡片：答对（绿）/ 未答对（黄）/ 全部答错（红）
    buildSynonymLastBadgeDetail(result) {
        const esc = (s) => this.escapeHtml(String(s));
        const correctAnswers = Array.isArray(result.correctAnswers) ? result.correctAnswers : [];
        const userAnswers = Array.isArray(result.userAnswers) ? result.userAnswers : [];
        // 答对 = 用户选择且属于正确答案
        const correctOnes = correctAnswers.filter(a => userAnswers.includes(a));
        // 未答对 = 选错(不在正确答案中) + 漏选(正确答案中未选)
        const wrongOnes = userAnswers.filter(a => !correctAnswers.includes(a));
        const missedOnes = correctAnswers.filter(a => !userAnswers.includes(a));
        const missAll = correctOnes.length === 0;

        let html = `<div class="badge-tooltip-title">${esc(result.word || '')}</div>`;
        html += '<div class="badge-tooltip-body">';
        if (result.skipped) {
            // 跳过：中性灰色
            const allOnes = [...wrongOnes, ...missedOnes];
            html += `<div class="badge-tooltip-group badge-tooltip-gray">
                        <div class="badge-tooltip-group-label">已跳过</div>
                        <div class="badge-tooltip-tags">`;
            (allOnes.length > 0 ? allOnes : correctAnswers).forEach(w => {
                html += `<span class="badge-tooltip-tag">${esc(w)}</span>`;
            });
            html += '</div></div>';
        } else if (missAll) {
            // 全部答错：红色
            html += `<div class="badge-tooltip-group badge-tooltip-red">
                        <div class="badge-tooltip-group-label">全部未答对</div>
                        <div class="badge-tooltip-tags">`;
            [...wrongOnes, ...missedOnes].forEach(w => {
                html += `<span class="badge-tooltip-tag">${esc(w)}</span>`;
            });
            html += '</div></div>';
        } else {
            // 答对部分：绿色
            if (correctOnes.length > 0) {
                html += `<div class="badge-tooltip-group badge-tooltip-green">
                            <div class="badge-tooltip-group-label">答对 (${correctOnes.length}/${correctAnswers.length})</div>
                            <div class="badge-tooltip-tags">`;
                correctOnes.forEach(w => {
                    html += `<span class="badge-tooltip-tag">${esc(w)}</span>`;
                });
                html += '</div></div>';
            }
            // 未答对部分：黄色（仅漏选的正确答案）
            if (missedOnes.length > 0) {
                html += `<div class="badge-tooltip-group badge-tooltip-yellow">
                            <div class="badge-tooltip-group-label">未答对 (${missedOnes.length})</div>
                            <div class="badge-tooltip-tags">`;
                missedOnes.forEach(w => {
                    html += `<span class="badge-tooltip-tag">${esc(w)}</span>`;
                });
                html += '</div></div>';
            }
            // 选错部分：灰色主题 + 删除线（参考跳过主题色）
            if (wrongOnes.length > 0) {
                html += `<div class="badge-tooltip-group badge-tooltip-gray">
                            <div class="badge-tooltip-group-label">选错 (${wrongOnes.length})</div>
                            <div class="badge-tooltip-tags">`;
                wrongOnes.forEach(w => {
                    html += `<span class="badge-tooltip-tag strike">${esc(w)}</span>`;
                });
                html += '</div></div>';
            }
        }
        html += '</div>';
        return html;
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

        // 添加全局收藏项（来自翻译等功能收藏的单词，与 getFavoritesVirtualBook 保持一致）
        try {
            const globalFavs = Storage.loadFavoriteItems();
            if (Array.isArray(globalFavs)) {
                globalFavs.forEach(item => {
                    if (item && item.word) {
                        favoriteWords.push(item.word.trim().toLowerCase());
                    }
                });
            }
        } catch (e) {
            console.warn('加载全局收藏项失败:', e);
        }

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

        if (this.selectedBooks.length === 0) {
            // 无选中词单：清空关键词并恢复按钮文字
            this.selectedKeywords = [];
            document.querySelectorAll('.keyword-item').forEach(btn => {
                btn.classList.remove('selected');
            });
            this.updateSelectedKeywordsDisplay();
            this.updateAutoSelectBtnText();
        } else {
            // 有选中词单（选中或取消后仍剩词单）：自动随机挑选，按钮文字变为"重新生成"
            this.autoSelectKeywords();
        }
    }

    // 更新随机挑选按钮文字
    updateAutoSelectBtnText() {
        const textEl = document.getElementById('autoSelectBtnText');
        if (!textEl) return;
        textEl.textContent = this.selectedBooks.length > 0 ? '重新生成' : '立即挑选';
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
        this.updateAutoSelectBtnText();
        
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

        // 同步自绘下拉（setting-picker）的触发器与面板显示
        if (themeSelect._settingPickerBuilt) {
            this._refreshSettingPicker(themeSelect);
        }
    }
    
    // ============================================
    // AI写作模块（CEFR实时渲染）
    // ============================================

    // CEFR主题色（与小程序colorConfig.js的color_1 Nature主题一致）
    static get CEFR_THEME_COLORS() {
        return {
            A1: '#57912b',
            A2: '#93a418',
            B1: '#b9780f',
            B2: '#b6620e',
            C1: '#b32e27',
            C2: '#b1296d'
        };
    }

    // 统一的AI模型字典（一处维护，多处引用）
    static get AI_MODELS() {
        // 已停用内置模型，全部改为用户自定义模型（通过 AI 设置中的"添加自定义模型"管理）
        return [];
    }

    // ============================================
    // AI 多厂商 sheet（不同厂商 modelID 相互隔离）
    // ============================================

    // 从请求地址中提取关键厂商域名，如 https://api.siliconflow.cn/v1 -> siliconflow
    extractProviderName(url) {
        try {
            const u = new URL(url);
            let host = u.hostname; // e.g. api.siliconflow.cn
            host = host.replace(/^www\./, '');
            const parts = host.split('.');
            // 取注册域名的主域名段（倒数第二段）：siliconflow.cn -> siliconflow
            if (parts.length >= 2) return parts[parts.length - 2];
            return host || '';
        } catch (e) { return ''; }
    }

    // 获取厂商列表；无则初始化一个默认"未命名"厂商，并迁移旧字段（aiApiKey 等）
    getAiProviders() {
        let providers = Array.isArray(this.settings.aiProviders) ? this.settings.aiProviders : null;
        if (!providers || providers.length === 0) {
            // 从旧字段迁移：baseUrl/格式/密钥/自定义模型
            const legacyModels = this._readLegacyCustomAiModels();
            providers = [{
                name: this.extractProviderName(this.settings.aiApiBaseUrl) || '未命名',
                baseUrl: this.settings.aiApiBaseUrl || '',
                apiFormat: this.settings.aiApiFormat || 'openai',
                apiKey: this.settings.aiApiKey || '',
                models: legacyModels
            }];
            this.settings.aiProviders = providers;
            this.settings.aiActiveProviderIndex = 0;
        }
        return providers;
    }

    // 当前激活厂商索引（越界时回退 0）
    getAiActiveIndex() {
        const providers = this.getAiProviders();
        const idx = this.settings.aiActiveProviderIndex || 0;
        return (idx >= 0 && idx < providers.length) ? idx : 0;
    }

    // 读取旧版全局/分区存储中的自定义模型（仅用于迁移）
    _readLegacyCustomAiModels() {
        try {
            if (Storage.getCurrentUser()) {
                const ai = Storage.loadSection('aiSettings');
                if (Array.isArray(ai.customAiModels)) return ai.customAiModels;
            } else {
                const saved = localStorage.getItem('customAiModels');
                if (saved) return JSON.parse(saved);
            }
        } catch (e) { }
        return [];
    }

    // 渲染 sheet 标签栏（含激活态、删除按钮）
    renderAiProviderTabs() {
        const list = document.getElementById('aiProviderTabList');
        if (!list) return;
        const providers = this.getAiProviders();
        const activeIdx = this.getAiActiveIndex();
        list.innerHTML = '';
        providers.forEach((p, i) => {
            const tab = document.createElement('div');
            tab.className = 'ai-provider-tab' + (i === activeIdx ? ' active' : '');
            tab.dataset.index = i;
            const name = document.createElement('span');
            name.className = 'ai-provider-tab-name';
            name.textContent = p.name || '未命名';
            tab.appendChild(name);
            // 允许双击重命名
            tab.title = '点击切换；双击重命名';
            if (providers.length > 1) {
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'ai-provider-tab-del';
                del.textContent = '×';
                del.title = '删除该厂商';
                del.dataset.del = i;
                tab.appendChild(del);
            }
            list.appendChild(tab);
        });
    }

    // 加载当前激活厂商的表单值
    loadAiProviderForm() {
        const providers = this.getAiProviders();
        const p = providers[this.getAiActiveIndex()];
        if (!p) return;
        document.getElementById('aiApiFormat').value = p.apiFormat || 'openai';
        // aiApiFormat 是自绘典雅下拉，设置值后刷新触发器文本
        const fmtEl = document.getElementById('aiApiFormat');
        if (fmtEl && fmtEl._settingPickerBuilt) this._refreshSettingPicker(fmtEl);
        document.getElementById('aiApiBaseUrl').value = p.baseUrl || '';
        document.getElementById('aiApiKey').value = p.apiKey || '';
        // 填写地址后自动识别厂商名（仅当名称为"未命名"或为空时）
        const baseUrlEl = document.getElementById('aiApiBaseUrl');
        baseUrlEl.oninput = () => {
            const name = this.extractProviderName(baseUrlEl.value);
            const cur = providers[this.getAiActiveIndex()];
            if (cur && name && (!cur.name || cur.name === '未命名')) {
                cur.name = name;
                this.renderAiProviderTabs();
            }
        };
    }

    // 保存：把当前表单写入激活厂商，返回需并入 settings 的字段
    collectAiProviderSettings() {
        const providers = this.getAiProviders();
        const idx = this.getAiActiveIndex();
        const p = providers[idx] || providers[0];
        p.apiFormat = document.getElementById('aiApiFormat').value || 'openai';
        p.baseUrl = document.getElementById('aiApiBaseUrl').value.trim() || '';
        p.apiKey = document.getElementById('aiApiKey').value.trim() || '';
        // 地址变化时同步厂商名（若仍为"未命名"）
        if (p.baseUrl && (!p.name || p.name === '未命名')) {
            p.name = this.extractProviderName(p.baseUrl) || p.name;
        }
        return {
            aiProviders: providers,
            aiActiveProviderIndex: idx
        };
    }

    // 立即持久化AI厂商与自定义模型（不依赖设置面板的保存按钮）
    persistAiProviders() {
        Storage.saveSection('aiSettings', {
            aiProviders: this.settings.aiProviders,
            aiActiveProviderIndex: this.settings.aiActiveProviderIndex
        });
    }

    // 切换激活厂商
    switchAiProvider(index) {
        const providers = this.getAiProviders();
        if (index < 0 || index >= providers.length || index === this.getAiActiveIndex()) return;
        // 先保存当前表单到原激活厂商
        this.collectAiProviderSettings();
        this.settings.aiActiveProviderIndex = index;
        this.persistAiProviders();
        this.renderAiProviderTabs();
        this.loadAiProviderForm();
        // 模型列表按厂商隔离，切换后刷新
        this.renderCustomModelList();
        this.initAiModelSelects();
    }

    // 新增厂商（默认"未命名"）
    addAiProvider() {
        const providers = this.getAiProviders();
        this.collectAiProviderSettings();
        providers.push({ name: '未命名', baseUrl: '', apiFormat: 'openai', apiKey: '', models: [] });
        this.settings.aiActiveProviderIndex = providers.length - 1;
        this.persistAiProviders();
        this.renderAiProviderTabs();
        this.loadAiProviderForm();
        this.renderCustomModelList();
        this.initAiModelSelects();
    }

    // 删除厂商（至少保留一个）
    removeAiProvider(index) {
        const providers = this.getAiProviders();
        if (providers.length <= 1) return;
        if (index < 0 || index >= providers.length) return;
        providers.splice(index, 1);
        const active = this.getAiActiveIndex();
        if (index < active) this.settings.aiActiveProviderIndex = active - 1;
        else if (index === active) this.settings.aiActiveProviderIndex = Math.max(0, index - 1);
        this.persistAiProviders();
        this.renderAiProviderTabs();
        this.loadAiProviderForm();
        this.renderCustomModelList();
        this.initAiModelSelects();
    }

    // 获取所有可用模型（内置 + 所有厂商自定义模型，下拉统一展示）
    getAllAiModels() {
        // 已停用内置模型，统一只使用自定义模型
        return this.getAllCustomAiModels();
    }

    // 合并所有厂商的自定义模型（存储上仍按厂商隔离，仅展示时汇总，附带厂商归属）
    getAllCustomAiModels() {
        const providers = this.getAiProviders();
        const result = [];
        (providers || []).forEach((p, pi) => {
            if (Array.isArray(p.models)) {
                p.models.forEach(m => {
                    if (m && m.value) {
                        result.push(Object.assign({}, m, {
                            providerIndex: pi,
                            providerName: p.name || '未命名'
                        }));
                    }
                });
            }
        });
        return result;
    }

    // 读取当前激活厂商的自定义模型列表（新增时写入目标厂商）
    getCustomAiModels() {
        const providers = this.getAiProviders();
        const p = providers[this.getAiActiveIndex()];
        return (p && Array.isArray(p.models)) ? p.models : [];
    }

    // 保存自定义模型列表到当前激活厂商（隔离存储）
    saveCustomAiModels(custom) {
        const providers = this.getAiProviders();
        const p = providers[this.getAiActiveIndex()];
        if (!p) return false;
        p.models = Array.isArray(custom) ? custom : [];
        // 同步到 settings，供 saveSettings 统一持久化
        this.settings.aiProviders = providers;
        this.persistAiProviders();
        return true;
    }

    // 读取全局模型使用记录（按最近使用排序，最新在前），未记录过的返回 null 已知值列表
    getModelUsageOrder() {
        try {
            const raw = localStorage.getItem('aiModelUsage');
            if (!raw) return [];
            const usage = JSON.parse(raw);
            if (Array.isArray(usage)) return usage;
        } catch (e) { /* 忽略 */ }
        return [];
    }

    // 记录一次模型使用，将模型置为最近使用
    recordModelUsage(value) {
        if (!value || value === '__add_new__') return;
        try {
            let usage = this.getModelUsageOrder();
            usage = usage.filter(m => m !== value);
            usage.unshift(value);
            // 保留最近 50 条即可
            localStorage.setItem('aiModelUsage', JSON.stringify(usage.slice(0, 50)));
        } catch (e) { /* 忽略 */ }
    }

    // 依据使用记录对模型列表排序（最新在前，未使用过的保持原相对顺序在后）
    sortModelsByUsage(models) {
        const usage = this.getModelUsageOrder();
        if (usage.length === 0) return models.slice();
        const rank = {};
        usage.forEach((m, i) => { rank[m] = i; });
        return models.slice().sort((a, b) => {
            const ra = rank[a.value];
            const rb = rank[b.value];
            if (ra !== undefined && rb !== undefined) return ra - rb;
            if (ra !== undefined) return -1;
            if (rb !== undefined) return 1;
            return 0;
        });
    }

    // 获取全局最近一次使用的模型值；无记录则取首个自定义模型
    getLastUsedModel() {
        const usage = this.getModelUsageOrder();
        if (usage.length > 0) return usage[0];
        const custom = this.getAllCustomAiModels();
        if (custom.length > 0) return custom[0].value;
        return null;
    }

    // 添加自定义模型（默认写入当前激活厂商，也可指定 providerIndex）
    addCustomAiModel(value, label, providerIndex) {
        if (!value || !label) return false;
        try {
            const providers = this.getAiProviders();
            let idx = providerIndex;
            if (idx == null || idx < 0 || idx >= providers.length) idx = this.getAiActiveIndex();
            const target = providers[idx];
            if (!target) return false;
            // 检查是否已存在（跨所有厂商，保证下拉展示时模型ID唯一）
            if (this.getAllCustomAiModels().some(m => m.value === value)) {
                return false;
            }
            const shortLabel = label.split('(')[0].trim();
            if (!Array.isArray(target.models)) target.models = [];
            target.models.push({ value, label, shortLabel, custom: true });
            this.settings.aiProviders = providers;
            this.persistAiProviders();
            // 新增的自定义模型记为最近使用
            this.recordModelUsage(value);
            // 重新初始化所有选择器
            this.initAiModelSelects();
            return true;
        } catch (e) {
            console.error('添加自定义模型失败:', e);
            return false;
        }
    }

    // 删除自定义模型（跨厂商定位并从所属厂商移除）
    removeCustomAiModel(value) {
        try {
            const providers = this.getAiProviders();
            let removed = false;
            providers.forEach(p => {
                if (Array.isArray(p.models)) {
                    const before = p.models.length;
                    p.models = p.models.filter(m => m.value !== value);
                    if (p.models.length !== before) removed = true;
                }
            });
            if (!removed) return false;
            this.settings.aiProviders = providers;
            this.persistAiProviders();
            // 同步清理使用记录中的该模型
            if (this.getModelUsageOrder().includes(value)) {
                try {
                    localStorage.setItem('aiModelUsage', JSON.stringify(this.getModelUsageOrder().filter(m => m !== value)));
                } catch (e) {}
            }
            // 重新初始化所有选择器
            this.initAiModelSelects();
            return true;
        } catch (e) {
            console.error('删除自定义模型失败:', e);
            return false;
        }
    }

    // 渲染设置页中的自定义模型列表（只显示当前sheet厂商的模型，不与其他厂商混合）
    renderCustomModelList() {
        const container = document.getElementById('customModelList');
        if (!container) return;
        const custom = this.getCustomAiModels();
        if (custom.length === 0) {
            container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-tertiary); font-size:13px;">暂无自定义模型</div>';
            return;
        }
        container.innerHTML = '';
        custom.forEach(model => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid var(--border-color);';
            const info = document.createElement('div');
            info.style.cssText = 'flex:1; min-width:0;';
            info.innerHTML = `<div style="font-weight:500; color:var(--text-primary);">${this.escapeHtml(model.label || model.value)}</div>` +
                             `<div style="font-size:12px; color:var(--text-secondary); word-break:break-all;">${this.escapeHtml(model.value)}</div>`;
            const btnWrap = document.createElement('div');
            btnWrap.style.cssText = 'flex-shrink:0; display:flex; align-items:center; gap:8px; margin-left:12px;';
            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️ 编辑';
            editBtn.title = '编辑此自定义模型的标签与ID';
            editBtn.style.cssText = 'padding:4px 10px; border:1px solid var(--primary-color,#3b82f6); border-radius:6px; background:transparent; color:var(--primary-color,#3b82f6); font-size:13px; cursor:pointer;';
            editBtn.addEventListener('click', () => {
                this.editCustomAiModel(model.value);
            });
            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑 删除';
            delBtn.title = '删除此自定义模型';
            delBtn.style.cssText = 'padding:4px 10px; border:1px solid var(--error); border-radius:6px; background:transparent; color:var(--error); font-size:13px; cursor:pointer;';
            delBtn.addEventListener('click', () => {
                if (confirm(`确定要删除自定义模型 "${model.label || model.shortLabel}" 吗？`)) {
                    this.removeCustomAiModel(model.value);
                    this.showToast('自定义模型已删除', 'info');
                    this.renderCustomModelList();
                }
            });
            btnWrap.appendChild(editBtn);
            btnWrap.appendChild(delBtn);
            row.appendChild(info);
            row.appendChild(btnWrap);
            container.appendChild(row);
        });
    }

    // 编辑自定义模型（标签 + ID）
    editCustomAiModel(oldValue) {
        const all = this.getAllAiModels();
        const model = all.find(m => m.value === oldValue);
        if (!model || !model.custom) {
            this.showToast('未找到该自定义模型', 'error');
            return;
        }
        const newLabel = prompt('请输入新的标签（备注名称）：', model.label || model.shortLabel);
        if (newLabel === null) return;
        const trimmedLabel = newLabel.trim();
        const newValue = prompt('请输入新的模型ID（将用于API请求的 model 参数）：', oldValue);
        if (newValue === null) return;
        const trimmedValue = newValue.trim();
        if (!trimmedLabel || !trimmedValue) {
            this.showToast('标签与ID不能为空', 'error');
            return;
        }
        if (this.updateCustomAiModel(oldValue, trimmedValue, trimmedLabel)) {
            this.showToast('自定义模型已更新', 'success');
            // 若ID被修改，同步更新使用记录与各下拉的上次选择
            if (trimmedValue !== oldValue) {
                try {
                    const usage = this.getModelUsageOrder().map(v => v === oldValue ? trimmedValue : v);
                    localStorage.setItem('aiModelUsage', JSON.stringify(usage));
                } catch (e) {}
            }
            this.initAiModelSelects();
            this.renderCustomModelList();
        } else {
            this.showToast('更新失败：ID已存在或无效', 'error');
        }
    }

    // 更新自定义模型（可修改标签和ID，跨厂商定位修改）
    updateCustomAiModel(oldValue, newValue, newLabel) {
        try {
            const providers = this.getAiProviders();
            for (let pi = 0; pi < providers.length; pi++) {
                const custom = providers[pi].models;
                if (!Array.isArray(custom)) continue;
                const idx = custom.findIndex(m => m.value === oldValue);
                if (idx === -1) continue;
                // ID冲突校验（排除自身）
                if (newValue !== oldValue &&
                    this.getAllCustomAiModels().some(m => m.value === newValue)) {
                    return false;
                }
                custom[idx].value = newValue;
                custom[idx].label = newLabel;
                custom[idx].shortLabel = newLabel.split('(')[0].trim() || newLabel;
                this.settings.aiProviders = providers;
                this.persistAiProviders();
                return true;
            }
            return false;
        } catch (e) {
            console.error('更新自定义模型失败:', e);
            return false;
        }
    }

    // 从设置中添加自定义模型（打开带厂商选择的新弹窗）
    addCustomModelFromSettings() {
        this.showAddModelDialog(null);
    }

    // 显示添加自定义模型对话框（含厂商下拉选择 / 模型ID / 名称）
    showAddModelDialog(selectId) {
        const providers = this.getAiProviders();
        if (providers.length === 0) {
            this.showToast('请先在AI设置中新增厂商', 'error');
            return;
        }

        // 动态构建弹窗 DOM
        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.id = 'addCustomModelModal';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 420px; width: 90%;">
                <div class="modal-header">
                    <h3>添加自定义模型</h3>
                    <button type="button" class="btn-icon modal-close-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom:14px;">
                        <label style="display:block; margin-bottom:6px; font-size:13px; color:var(--text-secondary);">厂商 <span style="color:var(--error);">*</span></label>
                        <div class="ai-picker add-model-provider-picker" id="addModelProviderPicker" style="width:100%; min-width:0;">
                            <button type="button" class="ai-picker-trigger">
                                <span class="ai-picker-trigger-id"></span>
                                <span class="ai-picker-trigger-tag"></span>
                            </button>
                        </div>
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="display:block; margin-bottom:6px; font-size:13px; color:var(--text-secondary);">模型ID <span style="color:var(--error);">*</span></label>
                        <input type="text" id="addModelValue" class="setting-input" style="width:100%;" placeholder="例如: custom-model-name" />
                        <div style="font-size:12px; color:var(--text-tertiary); margin-top:4px;">此值将直接用于 API 请求的 model 参数</div>
                    </div>
                    <div style="margin-bottom:4px;">
                        <label style="display:block; margin-bottom:6px; font-size:13px; color:var(--text-secondary);">名称 <span style="font-size:12px; color:var(--text-tertiary);">（选填，默认同模型ID）</span></label>
                        <input type="text" id="addModelLabel" class="setting-input" style="width:100%;" placeholder="例如: 我的自定义模型" />
                    </div>
                </div>
                <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="btn-secondary modal-cancel-btn">取消</button>
                    <button type="button" class="btn-primary modal-confirm-btn">添加</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // ---- 厂商下拉：自绘 ai-picker 典雅风格 ----
        let selectedProviderIndex = 0;
        const pickerEl = overlay.querySelector('#addModelProviderPicker');
        const triggerEl = pickerEl.querySelector('.ai-picker-trigger');
        const triggerIdEl = pickerEl.querySelector('.ai-picker-trigger-id');
        const triggerTagEl = pickerEl.querySelector('.ai-picker-trigger-tag');
        let panelEl = null;

        const updateProviderTrigger = (idx) => {
            const p = providers[idx];
            if (!p) return;
            triggerIdEl.textContent = p.name || '未命名';
            triggerTagEl.textContent = p.baseUrl || '';
        };
        const closeProviderPanel = () => {
            if (panelEl) { panelEl.remove(); panelEl = null; }
            pickerEl.classList.remove('open');
        };
        const openProviderPanel = () => {
            const rect = triggerEl.getBoundingClientRect();
            panelEl = document.createElement('div');
            panelEl.className = 'ai-picker-panel add-model-provider-panel';
            // 面板挂到 body，fixed 定位，层级高于弹窗内其它元素
            panelEl.style.cssText = `position:fixed; top:${rect.bottom + 6}px; left:${rect.left}px; ` +
                `min-width:${rect.width}px; max-width:520px; width:max-content; z-index:10000;`;
            providers.forEach((p, i) => {
                const item = document.createElement('div');
                item.className = 'ai-picker-item' + (i === selectedProviderIndex ? ' ai-picker-item-active' : '');
                item.dataset.index = i;
                const idSpan = document.createElement('span');
                idSpan.className = 'ai-picker-item-id';
                idSpan.textContent = p.name || '未命名';
                const tagSpan = document.createElement('span');
                tagSpan.className = 'ai-picker-item-tag';
                tagSpan.textContent = p.baseUrl || '（未填写请求地址）';
                tagSpan.title = p.baseUrl || '';
                item.appendChild(idSpan);
                item.appendChild(tagSpan);
                item.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    selectedProviderIndex = i;
                    updateProviderTrigger(i);
                    closeProviderPanel();
                });
                panelEl.appendChild(item);
            });
            document.body.appendChild(panelEl);
            pickerEl.classList.add('open');
        };
        triggerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = pickerEl.classList.contains('open');
            closeProviderPanel();
            if (!wasOpen) openProviderPanel();
        });
        const docCloseProvider = (e) => {
            if (panelEl && !panelEl.contains(e.target)) closeProviderPanel();
        };
        document.addEventListener('click', docCloseProvider);
        updateProviderTrigger(0);

        const closeModal = () => {
            closeProviderPanel();
            document.removeEventListener('click', docCloseProvider);
            overlay.remove();
        };
        overlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);
        overlay.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
        overlay.querySelector('.modal-overlay').addEventListener('click', closeModal);
        overlay.querySelector('.modal-confirm-btn').addEventListener('click', () => {
            const value = overlay.querySelector('#addModelValue').value.trim();
            if (!value) {
                this.showToast('请输入模型ID', 'error');
                return;
            }
            const label = overlay.querySelector('#addModelLabel').value.trim() || value;
            if (this.addCustomAiModel(value, label, selectedProviderIndex)) {
                this.showToast('自定义模型添加成功', 'success');
                closeModal();
                this.renderCustomModelList();
                // 自动选择新添加的模型（若从某下拉触发）
                if (selectId) {
                    setTimeout(() => {
                        const select = document.getElementById(selectId);
                        if (select) {
                            select.value = value;
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            this.refreshAiModelPicker(select);
                        }
                        const savedKey = 'aiModel_' + selectId;
                        try { localStorage.setItem(savedKey, value); } catch (e) {}
                    }, 100);
                }
            } else {
                this.showToast('添加失败：模型已存在或无效', 'error');
            }
        });

        // 回车快捷确认
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
                overlay.querySelector('.modal-confirm-btn').click();
            }
        });

        // 聚焦模型ID输入框
        const valueInput = overlay.querySelector('#addModelValue');
        setTimeout(() => valueInput.focus(), 50);
    }

    // 初始化设置面板的下拉框，使用与AI模型选择器一致的自绘现代下拉UI
    // 原生select保留为值载体（value读取/change事件兼容），外包装自绘trigger+panel
    initSettingSelects() {
        const self = this;
        const selects = document.querySelectorAll('select.setting-select');
        selects.forEach(select => {
            if (select._settingPickerBuilt) {
                self._refreshSettingPicker(select);
                return;
            }
            self._buildSettingPicker(select);
        });
    }

    // 构建单个设置下拉的自绘UI（复用 ai-picker 样式，保持与AI模型下拉一致）
    _buildSettingPicker(select) {
        const self = this;

        // 包装容器
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-picker setting-picker';

        const parent = select.parentNode;
        parent.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        select.classList.add('ai-picker-select');

        // 触发器
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ai-picker-trigger';
        wrapper.insertBefore(trigger, select);

        // 面板
        const panel = document.createElement('div');
        panel.className = 'ai-picker-panel';
        panel.style.display = 'none';
        wrapper.appendChild(panel);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = panel.style.display !== 'none';
            document.querySelectorAll('.ai-picker-panel').forEach(p => { p.style.display = 'none'; });
            panel.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) self._refreshSettingPicker(select);
        });

        panel.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = e.target.closest('[data-setting-value]');
            if (!item) return;
            select.value = item.dataset.settingValue;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            panel.style.display = 'none';
            self._refreshSettingPicker(select);
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) panel.style.display = 'none';
        });

        select._settingPickerBuilt = true;
        self._refreshSettingPicker(select);
    }

    // 刷新设置下拉：更新触发器文本 + 渲染面板选项
    _refreshSettingPicker(select) {
        const wrapper = select.closest('.setting-picker');
        if (!wrapper) return;
        const trigger = wrapper.querySelector('.ai-picker-trigger');
        const panel = wrapper.querySelector('.ai-picker-panel');
        if (!trigger || !panel) return;

        const options = Array.from(select.options);
        const cur = options.find(o => o.value === select.value) || options[0];

        trigger.innerHTML = '';
        const tSpan = document.createElement('span');
        tSpan.className = 'ai-picker-trigger-id';
        tSpan.textContent = cur ? cur.textContent.trim() : '';
        trigger.appendChild(tSpan);

        panel.innerHTML = '';
        options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'ai-picker-item';
            item.dataset.settingValue = opt.value;
            if (opt.value === select.value) item.classList.add('ai-picker-item-active');
            const idSpan = document.createElement('span');
            idSpan.className = 'ai-picker-item-id';
            idSpan.textContent = opt.textContent.trim();
            item.appendChild(idSpan);
            panel.appendChild(item);
        });
    }

    // 初始化AI模型选择器（自绘双列下拉：第1列模型ID，第2列标签；无框线、可加宽）
    // 保留原select作为值载体（value读取/change事件兼容），其外包装自定义UI
    initAiModelSelects() {
        const self = this;
        const selects = document.querySelectorAll('select[data-ai-model-select]');
        selects.forEach(select => {
            if (select._aiPickerBuilt) {
                // 已构建则刷新面板并重算恢复值（自定义模型可能已加载/新增）
                self._restoreModelValue(select);
                self.refreshAiModelPicker(select);
                return;
            }
            self._buildAiModelPicker(select);
        });
    }

    // 构建单个AI模型自绘下拉（select被包装为值载体）
    _buildAiModelPicker(select) {
        const self = this;
        const savedKey = 'aiModel_' + select.id;

        // 包装容器
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-picker';

        // 将 select 移入 wrapper 并隐藏（保留 value / change 兼容）
        const parent = select.parentNode;
        parent.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        select.classList.add('ai-picker-select');

        // 触发器
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ai-picker-trigger';
        wrapper.insertBefore(trigger, select);

        // 面板
        const panel = document.createElement('div');
        panel.className = 'ai-picker-panel';
        panel.style.display = 'none';
        wrapper.appendChild(panel);

        // 触发器点击展开/收起
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = panel.style.display !== 'none';
            // 关闭其它已打开面板
            document.querySelectorAll('.ai-picker-panel').forEach(p => { p.style.display = 'none'; });
            panel.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) self.refreshAiModelPicker(select);
        });

        // 面板内部点击（选项选择）
        panel.addEventListener('click', (e) => {
            // 阻止冒泡，避免触发其它 doc-level 关闭逻辑（如隐藏 text-selection-toolbar）
            e.stopPropagation();
            const item = e.target.closest('[data-ai-value]');
            if (item) {
                const val = item.dataset.aiValue;
                if (val === '__add_new__') {
                    // 恢复上次选择并打开添加对话框
                    self._restoreModelValue(select);
                    panel.style.display = 'none';
                    self.showAddModelDialog(select.id);
                    return;
                }
                // 更新值载体并触发change（保持其它监听兼容）
                select.value = val;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                self._applyModelValue(select, val);
                panel.style.display = 'none';
                // 刷新触发器文本，立即反映当前选中的模型
                self.refreshAiModelPicker(select);
            }
        });

        // 点击面板外关闭
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                panel.style.display = 'none';
            }
        });

        select._aiPickerBuilt = true;
        // 同步 select 内部 option（保证 value 读取兼容），再恢复上次选择
        self._syncSelectOptions(select);
        self._restoreModelValue(select);
        self.refreshAiModelPicker(select);
    }

    // 恢复下拉上次选择值（优先级：该下拉上次记录 > select已有值 > 全局最近使用 > 首个自定义）
    _restoreModelValue(select) {
        const savedKey = 'aiModel_' + select.id;
        const allModels = this.getAllAiModels();
        // 优先该下拉自己的缓存，避免 select.value 被初始化为内置值后永远压制缓存
        let cached = null;
        try { cached = localStorage.getItem(savedKey); } catch (e) {}
        let savedValue = cached || select.value || '';
        const lastUsed = this.getLastUsedModel();
        // 无缓存/已选时取全局最近使用，否则首个自定义模型
        let fallback = lastUsed;
        if (!fallback) {
            const custom = this.getAllCustomAiModels();
            fallback = custom.length > 0 ? custom[0].value : '';
        }
        const candidate = (savedValue && allModels.some(m => m.value === savedValue)) ? savedValue : fallback;
        select.value = allModels.some(m => m.value === candidate) ? candidate : '';
    }

    // 应用选择：保存记录
    _applyModelValue(select, val) {
        const savedKey = 'aiModel_' + select.id;
        try {
            localStorage.setItem(savedKey, val);
            this.recordModelUsage(val);
        } catch (e) {}
    }

    // 刷新自绘下拉：更新触发器显示 + 渲染面板分组（内置/自定义）
    refreshAiModelPicker(select) {
        const self = this;
        const wrapper = select.closest('.ai-picker');
        if (!wrapper) return;
        const trigger = wrapper.querySelector('.ai-picker-trigger');
        const panel = wrapper.querySelector('.ai-picker-panel');
        if (!trigger || !panel) return;

        // 同步 select 内部 option（保证 value 读取与触发器渲染兼容）
        this._syncSelectOptions(select);

        const allModels = this.getAllAiModels();

        // 触发器文本
        const cur = allModels.find(m => m.value === select.value) ||
            { value: select.value, shortLabel: '', label: '' };
        trigger.innerHTML = '';
        const tSpan = document.createElement('span');
        tSpan.className = 'ai-picker-trigger-id';
        tSpan.textContent = cur.value;
        const tTag = document.createElement('span');
        tTag.className = 'ai-picker-trigger-tag';
        tTag.textContent = cur.shortLabel || cur.label || '';
        trigger.appendChild(tSpan);
        trigger.appendChild(tTag);

        // 面板内容：仅显示自定义模型组
        panel.innerHTML = '';
        const customModels = this.sortModelsByUsage(allModels.filter(m => m.custom));

        // 自定义模型组（标题右侧放置"添加自定义模型"入口）
        const cg = document.createElement('div');
        cg.className = 'ai-picker-group-title';
        const cgLabel = document.createElement('span');
        cgLabel.textContent = '自定义模型';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'ai-picker-add-btn';
        addBtn.dataset.aiValue = '__add_new__';
        addBtn.title = '添加自定义模型';
        addBtn.innerHTML = '➕ 添加自定义模型';
        cg.appendChild(cgLabel);
        cg.appendChild(addBtn);
        panel.appendChild(cg);
        customModels.forEach(model => {
            panel.appendChild(self._makeAiItem(model, 'true'));
        });
    }

    // 生成单个面板项（双列：模型ID / 标签）
    _makeAiItem(model, isCustom) {
        const item = document.createElement('div');
        item.className = 'ai-picker-item';
        item.dataset.aiValue = model.value;
        const first = document.createElement('span');
        first.className = 'ai-picker-item-id';
        first.textContent = model.value;
        const tag = document.createElement('span');
        tag.className = 'ai-picker-item-tag';
        tag.textContent = model.shortLabel || model.label || '';
        item.appendChild(first);
        item.appendChild(tag);
        return item;
    }

    // 同步维护隐藏 select 的真实 option（保证 select.value 可用，供业务 value 读取兼容）
    _syncSelectOptions(select) {
        const allModels = this.getAllAiModels();
        // 记录当前值
        const curVal = select.value;
        select.innerHTML = '';
        allModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.shortLabel || model.label || model.value;
            select.appendChild(option);
        });
        // 添加入口（值载体不真正使用）
        if (!curVal || !allModels.some(m => m.value === curVal)) {
            this._restoreModelValue(select);
        } else {
            select.value = curVal;
        }
    }

    // 初始化写作模块（构建Set索引以提升查询性能）
    initWriting() {
        if (this._writingInitialized) return;
        // 将 cefrData 数组转为 Set（仅一次）
        if (typeof CEFR_DATA !== 'undefined' && !this._cefrSetData) {
            this._cefrSetData = {};
            Object.keys(CEFR_DATA).forEach(level => {
                const arr = Array.isArray(CEFR_DATA[level]) ? CEFR_DATA[level] : [];
                this._cefrSetData[level] = new Set(arr.map(w => String(w).toLowerCase()));
            });
            const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
            levels.forEach(l => {
                const size = this._cefrSetData[l] ? this._cefrSetData[l].size : 0;
                console.log(`  ${l}: ${size} words`);
            });
            console.log('✅ CEFR Set索引构建完成');
        } else if (typeof CEFR_DATA === 'undefined') {
            console.error('❌ CEFR_DATA 未定义！cefr-data.js 可能未加载');
        }
        // 默认开启染色
        if (this._cefrMarkEnabled === undefined) {
            this._cefrMarkEnabled = true;
            const wrapper = document.querySelector('.writing-input-wrapper');
            if (wrapper) wrapper.classList.add('cefr-active');
        }
        this._writingInitialized = true;
        // 初始化题目卡片
        this.updateTopicCard();
    }

    // 处理输入：分词、染色、统计（外部调用时使用，如清空、设置文本等）
    handleWritingInput(text) {
        // 确保写作模块已初始化（CEFR数据已加载）
        if (!this._writingInitialized) {
            this.initWriting();
        }
        const editor = document.getElementById('writingEditor');
        if (!editor) return;

        if (!text) {
            editor.innerHTML = '';
            this.updateWritingStats({ tokenCount: 0, typeCount: 0, mlSentence: 0, slSentence: 0, levelCounts: { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0 }, totalWords: 0 });
            this._writingErrorState = null;
            this._prevErrorState = null;
            this._currentTipsList = [];
            this._currentTipIndex = 0;
            this.closeCorrectionPopup();
            this.updateTipButtonState('allSet');
            return;
        }
        const result = this.processWritingText(text);
        editor.innerHTML = result.html;
        this.updateWritingStats(result);
        // 应用当前筛选状态
        this.applyLevelFilter();
    }

    // 核心：文本处理（移植自小程序writing.vue的processText + 错误渲染）
    processWritingText(text) {
        // 如果AI纠正功能关闭，跳过错误检测
        if (!this._aiCorrectionEnabled) {
            this._writingErrorState = { vocabErrors: [], grammarErrors: [], tipsList: [], correctionMap: { vocab: new Map(), grammar: new Map() } };
            return this._processWritingTextWithoutErrors(text);
        }

        // 检测错误
        const errorState = this.detectWritingErrors(text);
        
        // 自动移除用户已自行修正的错误（对比之前的错误状态）
        if (this._prevErrorState && this._prevErrorState.tipsList) {
            const currentLower = text.toLowerCase();
            const isStillValid = (tip) => {
                const wrongExists = currentLower.includes(tip.wrong.toLowerCase());
                const correctExists = currentLower.includes(tip.correct.toLowerCase());
                return wrongExists && !correctExists;
            };
            // 过滤tipsList
            errorState.tipsList = errorState.tipsList.filter(isStillValid);
            // 同步过滤vocabErrors
            errorState.vocabErrors = errorState.vocabErrors.filter(err => {
                const correct = errorState.correctionMap.vocab.get(err.wrong.toLowerCase());
                if (!correct) return true;
                return isStillValid({ wrong: err.wrong, correct });
            });
            // 同步过滤grammarErrors
            errorState.grammarErrors = errorState.grammarErrors.filter(err => {
                const correct = errorState.correctionMap.grammar.get(err.wrong.toLowerCase());
                if (!correct) return true;
                return isStillValid({ wrong: err.wrong, correct });
            });
        }
        this._prevErrorState = errorState;
        this._writingErrorState = errorState;

        return this._renderWritingText(text, errorState);
    }

    // 不带错误检测的文本处理（AI纠正关闭时使用）
    _processWritingTextWithoutErrors(text) {
        const result = this._renderWritingText(text, { vocabErrors: [], grammarErrors: [], tipsList: [], correctionMap: { vocab: new Map(), grammar: new Map() } });
        // 更新tip按钮状态
        if (result.tokenCount === 0) {
            this.updateTipButtonState('allSet');
        } else {
            this.updateTipButtonState('great');
        }
        return result;
    }

    // 实际的文本渲染逻辑
    _renderWritingText(text, errorState) {

        const regex = /([a-zA-Z']+'?[a-zA-Z']*|[.,!?;]+|\n+|[ \t\f\r]+|\d+|[^a-zA-Z\s.,!?;\n']+)/g;
        const parts = text.match(regex) || [];

        let coloredText = '';
        let tokenCount = 0;
        const uniqueWords = new Set();
        const levelCounts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
        let totalWords = 0;
        const colors = WordMemoryApp.CEFR_THEME_COLORS;

        // 构建错误位置映射
        const errorPositions = new Map();
        const errorInfo = new Map();
        const markers = {
            vocabulary: errorState.vocabErrors,
            grammar: errorState.grammarErrors
        };

        if (markers.vocabulary) {
            markers.vocabulary.forEach(err => {
                for (let i = err.start; i < err.end; i++) {
                    errorPositions.set(i, 'vocab');
                    errorInfo.set(i, { type: 'vocab', wrong: err.wrong, correct: err.correct });
                }
            });
        }
        if (markers.grammar) {
            markers.grammar.forEach(err => {
                for (let i = err.start; i < err.end; i++) {
                    errorPositions.set(i, 'grammar');
                    errorInfo.set(i, { type: 'grammar', wrong: err.wrong, correct: err.correct });
                }
            });
        }

        let currentPosition = 0;
        let currentErrorSpan = null;

        for (const part of parts) {
            if (/^\n+$/.test(part)) {
                if (currentErrorSpan) { coloredText += '</span>'; currentErrorSpan = null; }
                coloredText += '<br>'.repeat(part.length);
                currentPosition += part.length;
                continue;
            }

            const errorType = errorPositions.get(currentPosition);
            const errInfo = errorInfo.get(currentPosition);

            // 处理错误标记的开始
            if (errInfo && (!currentErrorSpan || currentErrorSpan.type !== errInfo.type || currentErrorSpan.wrong !== errInfo.wrong)) {
                if (currentErrorSpan) coloredText += '</span>';
                if (errInfo.type === 'vocab') {
                    coloredText += `<span class="error-vocab" style="background-color: color-mix(in srgb, var(--error) 12%, transparent); padding: 0 3px; border-radius: 4px; cursor: pointer;" data-error-type="vocab" data-wrong="${this.escapeAttr(errInfo.wrong)}" data-correct="${this.escapeAttr(errInfo.correct || '')}" onclick="WordMemoryApp.showCorrection(event)">`;
                } else {
                    coloredText += `<span class="error-grammar" style="border-bottom: 2px dashed color-mix(in srgb, var(--warning) 45%, transparent); padding-bottom: 1px; cursor: pointer;" data-error-type="grammar" data-wrong="${this.escapeAttr(errInfo.wrong)}" data-correct="${this.escapeAttr(errInfo.correct || '')}" onclick="WordMemoryApp.showCorrection(event)">`;
                }
                currentErrorSpan = errInfo;
            } else if (!errInfo && currentErrorSpan) {
                coloredText += '</span>';
                currentErrorSpan = null;
            }

            if (/^\s+$/.test(part)) {
                coloredText += this.escapeHtml(part);
            } else if (/^[.,!?;]+$/.test(part)) {
                const c = this._cefrMarkEnabled ? 'var(--text-tertiary)' : 'inherit';
                coloredText += `<span style="color:${c}">${this.escapeHtml(part)}</span>`;
            } else if (/^\d+$/.test(part) || /[^a-zA-Z\s.,!?;\n']+/.test(part)) {
                const c = this._cefrMarkEnabled ? 'var(--text-tertiary)' : 'inherit';
                coloredText += `<span style="color:${c}">${this.escapeHtml(part)}</span>`;
            } else {
                tokenCount++;
                const originalWord = part.toLowerCase();
                let baseWord = originalWord;
                let wordLevel = this.getWritingWordLevel(originalWord);

                if (originalWord === 'true' || originalWord === 'false') {
                    wordLevel = 'A1';
                } else if (!wordLevel) {
                    baseWord = this.getWritingWordBaseForm(originalWord);
                    wordLevel = this.getWritingWordLevel(baseWord);
                }

                let color;
                if (this._cefrMarkEnabled) {
                    color = wordLevel ? colors[wordLevel] : 'var(--text-tertiary)';
                } else {
                    color = 'inherit';
                }
                coloredText += `<span class="cefr-word" style="color:${color};" data-level="${wordLevel || ''}" data-word="${this.escapeAttr(originalWord)}">${this.escapeHtml(part)}</span>`;

                uniqueWords.add(baseWord);
                if (wordLevel) {
                    levelCounts[wordLevel]++;
                    totalWords++;
                }
            }
            currentPosition += part.length;
        }

        // 确保所有错误span都被关闭
        if (currentErrorSpan) coloredText += '</span>';

        // 句子长度统计
        let mlSentence = 0;
        let slSentence = 0;
        const sanitizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const sentences = sanitizedText.split(/(?<!\b[A-Za-z]{1,2})[,.!?]/g);
        sentences.forEach((sentence) => {
            const trimmed = sentence.trim();
            if (trimmed === '') return;
            const words = trimmed.split(/\s+/)
                .filter(w => w.match(/[a-zA-Z]/))
                .map(w => w.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, ''));
            const wordCount = words.length;
            if (wordCount > 15) slSentence++;
            else if (wordCount > 10) mlSentence++;
        });

        // 预估等级（含错误扣分）- 与 writing.vue 一致
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const weights = { A1: 0.03, A2: 0.05, B1: 0.12, B2: 0.2, C1: 0.3, C2: 0.4 };
        let finalScore = 0;
        levels.forEach((level) => {
            const pct = totalWords > 0 ? (levelCounts[level] / totalWords) * 100 : 0;
            finalScore += pct * weights[level] * 10;
        });
        finalScore += mlSentence * 0.25;
        finalScore += slSentence * 0.75;

        // 错误扣分
        let vocabErrorCount = errorState.vocabErrors ? errorState.vocabErrors.length : 0;
        let grammarErrorCount = errorState.grammarErrors ? errorState.grammarErrors.length : 0;
        finalScore -= vocabErrorCount * 2;
        finalScore -= grammarErrorCount * 2;

        let finalLevel = 'A1';
        if (finalScore >= 40 && finalScore < 50) finalLevel = 'A2';
        else if (finalScore >= 50 && finalScore < 65) finalLevel = 'B1';
        else if (finalScore >= 65 && finalScore < 78) finalLevel = 'B2';
        else if (finalScore >= 78 && finalScore < 85) finalLevel = 'C1';
        else if (finalScore >= 85) finalLevel = 'C2';

        console.log('📊 评级计算详情:', {
            tokenCount,
            totalWords,
            levelCounts,
            mlSentence,
            slSentence,
            finalScore: finalScore.toFixed(2),
            finalLevel,
            displayLevel: tokenCount >= 5 ? finalLevel : 'A1'
        });

        // 更新tip按钮状态
        const tipsCount = errorState.tipsList ? errorState.tipsList.length : 0;
        if (tokenCount === 0) {
            this.updateTipButtonState('allSet');
        } else if (this._isAnalyzing) {
            this.updateTipButtonState('parsing');
        } else if (tipsCount > 0) {
            this.updateTipButtonState('hasTips', tipsCount);
        } else {
            this.updateTipButtonState('great');
        }

        return {
            html: coloredText,
            tokenCount,
            typeCount: uniqueWords.size,
            mlSentence,
            slSentence,
            levelCounts,
            totalWords,
            estimatedLevel: tokenCount >= 5 ? finalLevel : 'A1',
            score: finalScore,
            tipsCount,
            errorState
        };
    }

    // 渲染HTML到渲染区
    // ========== 光标位置保存与恢复 ==========

    // 保存光标在纯文本中的位置（将 <br> 视为 \n）
    _saveCursorPos(editor) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!editor.contains(range.startContainer)) return;

        const preRange = range.cloneRange();
        preRange.selectNodeContents(editor);
        preRange.setEnd(range.endContainer, range.endOffset);

        // 计算纯文本长度，将 <br> 和 <div> 视为换行符
        let cursorPos = 0;
        const frag = preRange.cloneContents();
        const walker = document.createTreeWalker(frag, NodeFilter.SHOW_ALL, null);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                cursorPos += node.textContent.length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'BR') {
                    cursorPos += 1;
                } else if (node.tagName === 'DIV' || node.tagName === 'P') {
                    cursorPos += 1; // 块级元素视为换行
                }
            }
        }
        this._savedCursorPos = cursorPos;
    }

    // 恢复光标到指定位置（纯文本偏移，将 \n 对应到 <br>）
    _restoreCursorPos(editor, targetPos) {
        if (targetPos === undefined || targetPos === null) {
            this._setCursorToEnd(editor);
            return;
        }

        const selection = window.getSelection();
        if (!selection) return;

        // 遍历节点，找到目标位置
        let remaining = targetPos;
        let foundNode = null;
        let foundOffset = 0;

        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ALL, null);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeLen = node.textContent.length;
                if (remaining <= nodeLen) {
                    foundNode = node;
                    foundOffset = remaining;
                    break;
                }
                remaining -= nodeLen;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'BR') {
                    if (remaining <= 1) {
                        // 光标放在 <br> 后面
                        // 尝试找下一个兄弟节点
                        const next = node.nextSibling;
                        if (next) {
                            if (next.nodeType === Node.TEXT_NODE) {
                                foundNode = next;
                                foundOffset = 0;
                            } else {
                                // 下一个是元素，光标放在该元素前
                                foundNode = node.parentNode;
                                const idx = Array.prototype.indexOf.call(node.parentNode.childNodes, next);
                                foundOffset = idx;
                            }
                        } else {
                            // <br> 是最后一个节点，光标放在父元素末尾
                            foundNode = node.parentNode;
                            foundOffset = node.parentNode.childNodes.length;
                        }
                        break;
                    }
                    remaining -= 1;
                } else if (node.tagName === 'DIV' || node.tagName === 'P') {
                    if (remaining <= 1) {
                        // 光标放在块级元素开始处
                        const firstChild = node.firstChild;
                        if (firstChild) {
                            if (firstChild.nodeType === Node.TEXT_NODE) {
                                foundNode = firstChild;
                                foundOffset = 0;
                            } else {
                                foundNode = node;
                                foundOffset = 0;
                            }
                        } else {
                            foundNode = node;
                            foundOffset = 0;
                        }
                        break;
                    }
                    remaining -= 1;
                }
            }
        }

        const range = document.createRange();
        if (foundNode) {
            if (foundNode.nodeType === Node.TEXT_NODE) {
                range.setStart(foundNode, Math.min(foundOffset, foundNode.textContent.length));
            } else {
                range.setStart(foundNode, Math.min(foundOffset, foundNode.childNodes.length));
            }
        } else {
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    _setCursorToEnd(editor) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    // 在光标位置插入换行符（<br>）
    _insertLineBreak(editor) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();

        // 创建 <br> 元素
        const br = document.createElement('br');

        // 插入 <br>
        range.insertNode(br);

        // 在 <br> 后插入一个零宽空格，确保光标位置正确
        const zeroWidth = document.createTextNode('\u200B');
        br.parentNode.insertBefore(zeroWidth, br.nextSibling);

        // 将光标移动到零宽空格后面
        const newRange = document.createRange();
        newRange.setStartAfter(zeroWidth);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // 触发输入事件以进行重新渲染
        this.handleWritingEditorInput(editor);
    }

    // 在光标位置插入文本
    _insertTextAtCursor(editor, text) {
        if (!text) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            // 如果没有选区，在末尾插入
            this._setCursorToEnd(editor);
        }

        const range = selection.getRangeAt(0);
        range.deleteContents();

        // 处理文本中的换行
        const lines = text.split(/\r?\n/);
        const fragment = document.createDocumentFragment();

        lines.forEach((line, index) => {
            if (index > 0) {
                fragment.appendChild(document.createElement('br'));
            }
            if (line.length > 0) {
                fragment.appendChild(document.createTextNode(line));
            }
        });

        range.insertNode(fragment);

        // 将光标移动到插入文本末尾
        const newRange = document.createRange();
        newRange.selectNodeContents(editor);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // 触发重新渲染
        this.handleWritingEditorInput(editor);
    }

    // ========== 编辑器输入处理 ==========

    // 获取编辑器文本（将 <br> 和块级元素转换为换行符）
    _getWritingText(editor) {
        // 克隆节点以避免修改原 DOM
        const temp = editor.cloneNode(true);
        
        // 将所有 <br> 替换为换行文本节点
        const walker = document.createTreeWalker(temp, NodeFilter.SHOW_ELEMENT, null);
        const elements = [];
        let el;
        while ((el = walker.nextNode())) {
            elements.push(el);
        }
        
        // 从后向前替换，避免影响索引
        for (let i = elements.length - 1; i >= 0; i--) {
            const elem = elements[i];
            if (elem.tagName === 'BR') {
                const textNode = document.createTextNode('\n');
                elem.parentNode.replaceChild(textNode, elem);
            } else if (elem.tagName === 'DIV' || elem.tagName === 'P') {
                // 块级元素：在其内容后添加换行
                const textNode = document.createTextNode('\n');
                elem.appendChild(textNode);
            }
        }
        
        return temp.textContent.replace(/\u200B/g, '');
    }

    // contenteditable 编辑器输入处理
    handleWritingEditorInput(editor) {
        // 先保存光标位置（在获取文本前）
        this._saveCursorPos(editor);

        // 获取纯文本（正确处理换行）
        const text = this._getWritingText(editor);

        // 确保写作模块已初始化
        if (!this._writingInitialized) {
            this.initWriting();
        }

        if (!text) {
            editor.innerHTML = '';
            this.updateWritingStats({ tokenCount: 0, typeCount: 0, mlSentence: 0, slSentence: 0, levelCounts: { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0 }, totalWords: 0 });
            this._writingErrorState = null;
            this._prevErrorState = null;
            this._currentTipsList = [];
            this._currentTipIndex = 0;
            this.closeCorrectionPopup();
            this.updateTipButtonState('allSet');
            return;
        }

        // 保存需要恢复的光标位置
        const posToRestore = this._savedCursorPos || text.length;

        // 处理文本并生成带颜色的 HTML
        const result = this.processWritingText(text);

        // 更新 HTML（直接设置，不需要动画）
        editor.innerHTML = result.html;

        // 恢复光标位置
        requestAnimationFrame(() => {
            this._restoreCursorPos(editor, posToRestore);
        });

        this.updateWritingStats(result);

        // 应用当前筛选状态
        this.applyLevelFilter();
    }

    // 更新统计栏
    updateWritingStats(result) {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        const tokenCount = result.tokenCount || 0;
        set('writingTokenCount', tokenCount);
        set('writingTypeCount', result.typeCount || 0);

        // 等级徽章计数
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const levelCounts = result.levelCounts || { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0 };
        levels.forEach(level => {
            const count = levelCounts[level] || 0;
            const el = document.getElementById('badgeCount' + level);
            if (el) el.textContent = count;
        });

        // 柱状图条件显示：有文本时切到 has-text
        const evalChart = document.getElementById('evalChart');
        if (evalChart) {
            const hasText = tokenCount > 0;
            if (hasText && !evalChart.classList.contains('has-text')) {
                evalChart.classList.add('has-text');
            } else if (!hasText && evalChart.classList.contains('has-text')) {
                evalChart.classList.remove('has-text');
            }
        }

        // 6级柱状图：空状态为正方形（CSS aspect-ratio），有文本时柱高=30+百分比
        const total = result.totalWords || 0;
        levels.forEach(level => {
            const count = levelCounts[level] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const fill = document.getElementById('barFill' + level);
            const pctEl = document.getElementById('barPct' + level);
            // 容器内容区高度=165-28-4=133px，0%时26px正方形
            const CHART_H = 133, BASE_H = 26;
            if (total > 0) {
                if (pct > 0) {
                    // 有百分比的柱子：26px起按比例增长到133px
                    const barHeight = Math.round(BASE_H + (CHART_H - BASE_H) * pct / 100);
                    if (fill) fill.style.height = barHeight + 'px';
                    if (pctEl) {
                        pctEl.textContent = Math.round(pct) + '%';
                        pctEl.style.opacity = '1';
                    }
                } else {
                    // 0%柱子：保持正方形
                    if (fill) fill.style.height = BASE_H + 'px';
                    if (pctEl) pctEl.style.opacity = '0';
                }
            } else {
                // 空状态：恢复正方形
                if (fill) fill.style.height = BASE_H + 'px';
                if (pctEl) pctEl.style.opacity = '0';
            }
        });

        // 估算等级 + 同步到 score-btn + 颜色
        const level = result.estimatedLevel || 'A1';
        set('writingEstimatedLevel', level);
        const color = WordMemoryApp.CEFR_THEME_COLORS[level] || '#57912b';
        const scoreBtn = document.getElementById('scoreBtn');
        if (scoreBtn) {
            scoreBtn.style.background = color;
            const darker = this.getDarkerColor(color, 0.65);
            const shadow = document.getElementById('scoreBtnShadow');
            if (shadow) {
                shadow.style.background = darker;
            }
        }
    }

    // 将颜色变暗（用于按钮阴影）
    getDarkerColor(hex, factor) {
        const c = hex.replace('#', '');
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        const dr = Math.round(r * factor);
        const dg = Math.round(g * factor);
        const db = Math.round(b * factor);
        return '#' + [dr, dg, db].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    // ============ 计时器 ============
    toggleTimer() {
        this.vibrate();
        if (!this._timerRunning) {
            this.startTimer();
        } else if (this._timerPaused) {
            this.resumeTimer();
        } else {
            this.pauseTimer();
        }
    }

    startTimer() {
        this._timerStart = Date.now();
        this._timerElapsed = 0;
        this._timerRunning = true;
        this._timerPaused = false;
        this._tickTimer();
        this._timerInterval = setInterval(() => this._tickTimer(), 1000);
        this._updateTimerBtn();
    }

    pauseTimer() {
        this._timerPaused = true;
        this._timerElapsed = Date.now() - this._timerStart;
        clearInterval(this._timerInterval);
        this._updateTimerBtn();
    }

    resumeTimer() {
        this._timerStart = Date.now() - this._timerElapsed;
        this._timerPaused = false;
        this._tickTimer();
        this._timerInterval = setInterval(() => this._tickTimer(), 1000);
        this._updateTimerBtn();
    }

    stopTimer() {
        clearInterval(this._timerInterval);
        this._timerRunning = false;
        this._timerPaused = false;
        this._timerStart = 0;
        this._timerElapsed = 0;
        this._timerDisplay = '00:00';
        const el = document.getElementById('timerDisplay');
        if (el) el.textContent = '00:00';
        this._updateTimerBtn();
    }

    _tickTimer() {
        const elapsed = Date.now() - this._timerStart;
        const totalSec = Math.floor(elapsed / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        this._timerDisplay = h > 0
            ? `${h}:${String(m).padStart(2, '0')}`
            : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        const el = document.getElementById('timerDisplay');
        if (el) el.textContent = this._timerDisplay;
    }

    _updateTimerBtn() {
        const btn = document.getElementById('writingTimerBtn');
        if (!btn) return;
        btn.classList.toggle('running', this._timerRunning && !this._timerPaused);
        btn.title = this._timerRunning ? (this._timerPaused ? '点击继续' : '点击暂停（长按结束）') : '点击开始计时';
    }

    // ============ 设置面板 ============
    openSettingPanel() {
        const overlay = document.getElementById('settingOverlay');
        if (overlay) overlay.classList.add('show');
    }

    closeSettingPanel() {
        const overlay = document.getElementById('settingOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    // ============ Tip 按钮 ============
    handleTipTap() {
        this.vibrate();
        const state = this._writingErrorState;
        if (!state || !state.tipsList || state.tipsList.length === 0) {
            this.showToast('All set! 暂无错误', 'info');
            return;
        }
        // 点击tip按钮时，显示第一个错误的弹窗
        this._currentTipIndex = 0;
        this._currentTipsList = state.tipsList;
        this.showTipPopupForIndex(0);
    }

    // 显示指定索引的tip弹窗
    showTipPopupForIndex(index) {
        const tips = this._currentTipsList;
        if (!tips || tips.length === 0) return;
        if (index < 0 || index >= tips.length) return;

        this._currentTipIndex = index;
        const tip = tips[index];

        // 查找对应错误元素并显示弹窗
        const editor = document.getElementById('writingEditor');
        if (editor) {
            const selector = tip.type === 'grammar' ? '.error-grammar' : '.error-vocab';
            const spans = editor.querySelectorAll(selector);
            let targetSpan = null;
            spans.forEach(span => {
                if (span.dataset.wrong === tip.wrong) targetSpan = span;
            });
            if (targetSpan) {
                const fakeEvent = {
                    stopPropagation: () => {},
                    currentTarget: targetSpan
                };
                this.showCorrection(fakeEvent);
                return;
            }
        }

        // 如果找不到对应元素，直接用tip数据构建弹窗
        this._showCorrectionPopupFromTip(tip);
    }

    // 从tip数据直接显示弹窗（不依赖DOM元素）
    _showCorrectionPopupFromTip(tip) {
        const popup = document.getElementById('correctionPopup');
        if (!popup) return;

        const typeLabel = tip.type === 'grammar' ? '语法错误 Grammar' : '词汇错误 Vocabulary';
        const typeColor = tip.type === 'grammar' ? 'var(--error)' : 'var(--warning)';
        const tips = this._currentTipsList;
        const index = this._currentTipIndex;

        popup.innerHTML = `
            <div id="correctionOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.25);z-index:999;" onclick="WordMemoryApp.closeCorrectionPopup()"></div>
            <div class="correction-popup" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1000;background:var(--surface);border-radius:14px;padding:20px 24px;min-width:300px;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.18);border:1px solid var(--border-color);font-family:inherit;animation:correctionFadeIn 0.18s ease-out;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                    <span style="background:${typeColor};color:#fff;padding:3px 10px;border-radius:6px;font-size:0.72rem;font-weight:700;">${typeLabel}</span>
                    <span style="color:var(--text-secondary);font-size:0.78rem;">${index + 1}/${tips.length}</span>
                </div>
                <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:0.68rem;color:var(--text-tertiary);margin-bottom:3px;">原文</div>
                        <div style="color:var(--error);font-weight:700;font-size:1rem;text-decoration:line-through;word-break:break-all;">${this.escapeHtml(tip.wrong)}</div>
                    </div>
                    <div style="font-size:1.2rem;color:var(--text-tertiary);flex-shrink:0;">→</div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:0.68rem;color:var(--text-tertiary);margin-bottom:3px;">建议</div>
                        <div style="color:var(--success);font-weight:700;font-size:1rem;word-break:break-all;">${this.escapeHtml(tip.correct)}</div>
                    </div>
                </div>
                ${tip.explanation ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:14px;padding:8px 12px;background:var(--hover-bg);border-radius:8px;">${this.escapeHtml(tip.explanation)}</div>` : ''}
                <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;">
                    <div style="display:flex;gap:6px;">
                        <button id="tipPrev" ${index === 0 ? 'disabled' : ''} style="padding:6px 12px;border-radius:6px;border:1px solid var(--border-color);background:transparent;color:${index === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)'};cursor:${index === 0 ? 'not-allowed' : 'pointer'};font-size:0.78rem;">‹</button>
                        <button id="tipNext" ${index >= tips.length - 1 ? 'disabled' : ''} style="padding:6px 12px;border-radius:6px;border:1px solid var(--border-color);background:transparent;color:${index >= tips.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)'};cursor:${index >= tips.length - 1 ? 'not-allowed' : 'pointer'};font-size:0.78rem;">›</button>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button id="correctionIgnore" style="padding:7px 14px;border-radius:7px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:0.82rem;font-weight:600;">忽略</button>
                        <button id="correctionAccept" style="padding:7px 14px;border-radius:7px;border:none;background:var(--success);color:#fff;cursor:pointer;font-size:0.82rem;font-weight:600;">接受</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('tipPrev').onclick = () => this.showTipPopupForIndex(index - 1);
        document.getElementById('tipNext').onclick = () => this.showTipPopupForIndex(index + 1);
        document.getElementById('correctionAccept').onclick = () => {
            this.applyCorrection(tip.wrong, tip.correct);
            this.closeCorrectionPopup();
        };
        document.getElementById('correctionIgnore').onclick = () => {
            this.closeCorrectionPopup();
        };
    }

    // ============ Score 按钮详情 ============
    showScoreDetail() {
        this.vibrate();
        const level = (document.getElementById('writingEstimatedLevel') || {}).textContent || 'A1';
        const tokens = (document.getElementById('writingTokenCount') || {}).textContent || '0';
        const types = (document.getElementById('writingTypeCount') || {}).textContent || '0';
        const dist = ['A1','A2','B1','B2','C1','C2'].map(l => {
            const c = (document.getElementById('badgeCount'+l)||{}).textContent || '0';
            return `${l}:${c}`;
        }).join('  ');
        this.showInfoBar(`预估 ${level} · ${tokens}词 · ${types}型 · ${dist}`, 'info');
    }

    // ============ 通用工具 ============
    showToast(message, type) {
        type = type || 'info';
        const existing = document.querySelector('.writing-toast');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'writing-toast';
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, 1600);
    }

    showInfoBar(message, type) {
        type = type || 'info';
        const wrap = document.getElementById('writingAppContainer') || document.body;
        const existing = wrap.querySelector('.writing-info-bar');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'writing-info-bar ' + type;
        el.textContent = message;
        // 插入到写作区顶部
        const card = wrap.querySelector('.ai-feature-card');
        if (card) {
            card.style.position = 'relative';
            card.insertBefore(el, card.firstChild);
            setTimeout(() => { if (el.parentNode) el.remove(); }, 3000);
        }
    }

    vibrate() {
        try {
            if (navigator.vibrate) navigator.vibrate(15);
        } catch (e) {}
    }

    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(() => this._fallbackCopy(text));
        } else {
            this._fallbackCopy(text);
        }
    }

    _fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }

    // 应用等级筛选（高亮选中的级别，其他变灰）
    applyLevelFilter() {
        const filter = this._activeLevelFilter;
        const activeLevels = filter ? filter.split(',') : null;
        document.querySelectorAll('.writing-render-area .cefr-word').forEach(w => {
            const level = w.dataset.level;
            if (!activeLevels) {
                w.classList.remove('dimmed');
            } else if (level && activeLevels.includes(level)) {
                w.classList.remove('dimmed');
            } else {
                w.classList.add('dimmed');
            }
        });
    }

    // 更新题目卡片
    updateTopicCard(topicText) {
        const el = document.getElementById('writingTopicContent');
        if (!el) return;
        if (topicText) {
            el.textContent = topicText;
            return;
        }
        const topicSelect = document.getElementById('writingTopic');
        const styleSelect = document.getElementById('writingStyle');
        const levelSelect = document.getElementById('writingLevel');
        if (!topicSelect) return;
        const topic = topicSelect.value;
        const style = styleSelect ? styleSelect.value : '议论文';
        const level = levelSelect ? levelSelect.value : 'B2';
        if (topic === '随机') {
            el.textContent = '点击「AI生成」随机抽取题目，或直接在下框输入你想表达的观点。';
        } else {
            el.textContent = `请就「${topic}」写一段${style}（CEFR ${level}），不少于200词。`;
        }
    }

    // 显示AI评估结果
    showWritingEvaluation() {
        const level = (document.getElementById('writingEstimatedLevel') || {}).textContent || 'A1';
        const tokens = (document.getElementById('writingTokenCount') || {}).textContent || '0';
        const types = (document.getElementById('writingTypeCount') || {}).textContent || '0';
        // 取各级别计数
        const counts = ['A1','A2','B1','B2','C1','C2'].map(l => `${l}:${(document.getElementById('badgeCount'+l)||{}).textContent||0}`).join('  ');
        alert(`📊 AI Evaluation\n\n预估等级: ${level}\n总词数: ${tokens}\n独立词: ${types}\n\n级别分布: ${counts}\n\n点击徽章可单独聚焦该级别，点击 Beg./Int./Adv. 按钮可按范围筛选。`);
    }

    // 单词等级查询（使用Set索引）
    getWritingWordLevel(word) {
        if (!this._cefrSetData || !word) {
            // 调试：检查前3个单词的查询结果
            if (!this._wordLevelDebugCount) this._wordLevelDebugCount = 0;
            if (this._wordLevelDebugCount < 3 && word && /^[a-zA-Z]+$/.test(word)) {
                this._wordLevelDebugCount++;
                console.log(`🔍 查询单词 "${word}": _cefrSetData=${!!this._cefrSetData}, 结果=null`);
            }
            return null;
        }
        const lower = word.toLowerCase();
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        for (const level of levels) {
            if (this._cefrSetData[level] && this._cefrSetData[level].has(lower)) {
                return level;
            }
        }
        // 调试：检查前3个单词的查询结果
        if (!this._wordLevelDebugCount) this._wordLevelDebugCount = 0;
        if (this._wordLevelDebugCount < 3 && word && /^[a-zA-Z]+$/.test(word)) {
            this._wordLevelDebugCount++;
            const a1Size = this._cefrSetData['A1'] ? this._cefrSetData['A1'].size : 0;
            console.log(`🔍 查询单词 "${word}": 数据已加载(A1=${a1Size}), 未找到`);
        }
        return null;
    }

    // 词形还原（移植自小程序writing.vue的getWordBaseForm）
    getWritingWordBaseForm(word) {
        let base = word.toLowerCase();
        const rules = [
            { pattern: /'s$/, replace: '' },
            { pattern: /s'$/, replace: '' },
            { pattern: /'ve$/, replace: '' },
            { pattern: /'d$/, replace: '' },
            { pattern: /'re$/, replace: '' },
            { pattern: /n't$/, replace: '' },
            { pattern: /([bdfgkmnprt])\1er$/, replace: '$1' },
            { pattern: /([bdfgkmnprt])\1est$/, replace: '$1' },
            { pattern: /([bdfgkmnprt])\1ing$/, replace: '$1' },
            { pattern: /([bdfgkmnprt])\1ed$/, replace: '$1' },
            { pattern: /ier$/, replace: 'y' },
            { pattern: /iest$/, replace: 'y' },
            { pattern: /ies$/, replace: 'y' },
            { pattern: /ied$/, replace: 'y' },
            { pattern: /ation$/, replace: 'e' },
            { pattern: /est$/, replace: '' },
            { pattern: /est$/, replace: 'e' },
            { pattern: /es$/, replace: '' },
            { pattern: /s$/, replace: '' },
            { pattern: /er$/, replace: '' },
            { pattern: /r$/, replace: '' },
            { pattern: /ing$/, replace: '' },
            { pattern: /ing$/, replace: 'e' },
            { pattern: /ed$/, replace: '' },
            { pattern: /d$/, replace: '' }
        ];
        for (const rule of rules) {
            if (rule.pattern.test(base)) {
                const candidate = base.replace(rule.pattern, rule.replace);
                // 验证候选词是否在词典中
                if (this.getWritingWordLevel(candidate)) {
                    return candidate;
                }
            }
        }
        return base;
    }

    // 切换CEFR染色开关
    toggleCefrMark() {
        this._cefrMarkEnabled = !this._cefrMarkEnabled;
        const wrapper = document.querySelector('.writing-input-wrapper');
        if (wrapper) wrapper.classList.toggle('cefr-active', this._cefrMarkEnabled);
        const label = document.getElementById('cefrMarkLabel');
        if (label) label.textContent = this._cefrMarkEnabled ? '关闭染色' : '开启染色';
        // 同步设置面板 switch
        const switchEl = document.getElementById('settingCefrSwitch');
        if (switchEl) switchEl.checked = this._cefrMarkEnabled;
        // 持久化
        Storage.saveSection('aiWorkspace', { cefrMarkEnabled: this._cefrMarkEnabled ? '1' : '0' });
        // 提示
        this.showToast(this._cefrMarkEnabled ? 'CEFR标记已开启' : 'CEFR标记已关闭', 'info');
        // 重新渲染
        const editor = document.getElementById('writingEditor');
        if (editor) this.handleWritingInput(editor.textContent);
    }

    // 清空写作区
    clearWriting() {
        this.handleWritingInput('');
        // 清除错误标记
        this._writingErrorState = null;
        this.updateTipButtonState('allSet');
    }

    // 本地纠错词典（常见拼写错误 + 语法规则，模拟AI纠正）
    get _correctionDict() {
        if (!this.__correctionDict) {
            this.__correctionDict = {
                'teh': 'the', 'recieve': 'receive', 'recieved': 'received',
                'occured': 'occurred', 'occurence': 'occurrence',
                'seperate': 'separate', 'seperated': 'separated',
                'alot': 'a lot', 'becuase': 'because',
                'writen': 'written', 'goverment': 'government',
                'enviroment': 'environment', 'developement': 'development',
                'accomodate': 'accommodate', 'neccessary': 'necessary',
                'definately': 'definitely', 'independant': 'independent',
                'succesful': 'successful', 'comittee': 'committee',
                'arguement': 'argument', 'existance': 'existence',
                'maintainance': 'maintenance', 'achive': 'achieve',
                'beleive': 'believe', 'beleived': 'believed',
                'foriegn': 'foreign', 'priviledge': 'privilege',
                'untill': 'until', 'truely': 'truly',
                'begining': 'beginning', 'comming': 'coming',
                'runing': 'running', 'stoped': 'stopped',
                'thier': 'their', 'futher': 'further',
                'colour': 'color', 'defence': 'defense',
                'centre': 'center', 'theatre': 'theater',
                'metre': 'meter', 'litre': 'liter',
                'licence': 'license', 'practise': 'practice',
                'analyse': 'analyze', 'recognise': 'recognize',
                'organisation': 'organization', 'behaviour': 'behavior',
                'favourite': 'favorite', 'honour': 'honor',
                'endeavour': 'endeavor', 'travelled': 'traveled',
                'travelling': 'traveling', 'cancelled': 'canceled',
                'cancelled': 'canceled', 'fulfil': 'fulfill',
                'fulfilment': 'fulfillment', 'enrol': 'enroll',
                'enrolment': 'enrollment', 'installment': 'installment',
                'installment': 'installment', 'aging': 'ageing',
                'artifact': 'artefact', 'artifacts': 'artefacts',
                'gray': 'grey', 'colored': 'coloured',
                'labor': 'labour', 'labors': 'labours',
                'favor': 'favour', 'favors': 'favours',
                'behavior': 'behaviour', 'behaviors': 'behaviours',
                'organize': 'organise', 'organizes': 'organises',
                'realize': 'realise', 'realizes': 'realises',
                'modernize': 'modernise', 'modernizes': 'modernises',
                'standardization': 'standardisation',
                'authorization': 'authorisation',
                'initialization': 'initialisation',
                'optimization': 'optimisation',
                'minimize': 'minimise', 'minimizes': 'minimises',
                'maximize': 'maximise', 'maximizes': 'maximises',
                'analyze': 'analyse', 'analyzes': 'analyses',
                'defense': 'defence', 'offense': 'offence',
                'license': 'licence', 'licenses': 'licences',
                'practice': 'practise', 'practices': 'practises',
                'advise': 'advice', 'advises': 'advices',
                'compose': 'comprise', 'composed': 'comprised',
                'disinterested': 'uninterested',
                'historic': 'historical',
                'infer': 'imply', 'inferred': 'implied',
                'notable': 'noticeable', 'notably': 'noticeably',
                'priceless': 'invaluable', 'pricelessly': 'invaluably',
                'rebut': 'refute', 'rebutted': 'refuted',
                'reticent': 'reluctant', 'reticently': 'reluctantly',
                'sportive': 'sporting', 'sportively': 'sportingly',
                'transpire': 'happen', 'transpired': 'happened',
                'veracious': 'truthful', 'veraciously': 'truthfully',
                'whole': 'whole', 'wrath': 'anger'
            };
        }
        return this.__correctionDict;
    }

    get _grammarDict() {
        if (!this.__grammarDict) {
            this.__grammarDict = {
                'i is': 'I am', 'you is': 'you are', 'he are': 'he is',
                'she are': 'she is', 'it are': 'it is', 'we is': 'we are',
                'they is': 'they are', 'I are': 'I am', 'you am': 'you are',
                'a apple': 'an apple', 'a hour': 'an hour', 'a honest': 'an honest',
                'a heir': 'an heir', 'a honor': 'an honor',
                'an book': 'a book', 'an user': 'a user', 'an one': 'a one',
                'was you': 'were you', 'was they': 'were they',
                'have went': 'have gone', 'has went': 'has gone',
                'have took': 'have taken', 'has took': 'has taken',
                'have ate': 'have eaten', 'has ate': 'has eaten',
                'have drank': 'have drunk', 'has drank': 'has drunk',
                'have wrote': 'have written', 'has wrote': 'has written',
                'have spoke': 'have spoken', 'has spoke': 'has spoken',
                'have broke': 'have broken', 'has broke': 'has broken',
                'have chose': 'have chosen', 'has chose': 'has chosen',
                'have fell': 'have fallen', 'has fell': 'has fallen',
                'have forgot': 'have forgotten', 'has forgot': 'has forgotten',
                'have ridden': 'have ridden', 'has ridden': 'has ridden',
                'have shaken': 'have shaken', 'has shaken': 'has shaken',
                'have stolen': 'have stolen', 'has stolen': 'has stolen',
                'have swum': 'have swum', 'has swum': 'has swum',
                'have thrown': 'have thrown', 'has thrown': 'has thrown',
                'have worn': 'have worn', 'has worn': 'has worn',
                'is been': 'has been', 'are been': 'have been',
                'could of': 'could have', 'would of': 'would have',
                'should of': 'should have', 'must of': 'must have',
                'might of': 'might have',
                'coulda': 'could have', 'woulda': 'would have',
                'shoulda': 'should have', 'musta': 'must have',
                'couldve': 'could have', 'wouldve': 'would have',
                'shouldve': 'should have', 'mustve': 'must have',
                'alot of': 'a lot of',
                'inorder to': 'in order to',
                'because of the fact that': 'because',
                'due to the fact that': 'because',
                'make a decision': 'decide',
                'make a choice': 'choose',
                'make an attempt': 'try',
                'make a purchase': 'buy',
                'make a reference': 'reference',
                'make a comparison': 'compare',
                'make an adjustment': 'adjust',
                'make an investment': 'invest',
                'make a profit': 'profit',
                'make a loss': 'lose',
                'make an effort': 'effort',
                'make progress': 'progress',
                'make improvements': 'improve',
                'make a commitment': 'commit',
                'make a promise': 'promise',
                'make a plan': 'plan',
                'make an arrangement': 'arrange',
                'make an appointment': 'appoint',
                'make an agreement': 'agree',
                'make a settlement': 'settle',
                'make a resolution': 'resolve',
                'make a distinction': 'distinguish',
                'make an identification': 'identify',
                'make a judgment': 'judge',
                'make an assessment': 'assess',
                'make an evaluation': 'evaluate',
                'make an analysis': 'analyze',
                'make a summary': 'summarize',
                'make a conclusion': 'conclude',
                'make a recommendation': 'recommend',
                'make a suggestion': 'suggest',
                'make an observation': 'observe',
                'make an investigation': 'investigate',
                'make a discovery': 'discover',
                'make an achievement': 'achieve',
                'make a mistake': 'mistake',
                'make an error': 'err',
                'make a correction': 'correct',
                'make an improvement': 'improve',
                'make a change': 'change',
                'make a transformation': 'transform',
                'make a conversion': 'convert',
                'make a transition': 'transition',
                'make a movement': 'move',
                'make a transfer': 'transfer',
                'make a transmission': 'transmit',
                'make a distribution': 'distribute',
                'make a collection': 'collect',
                'make an assembly': 'assemble',
                'make a meeting': 'meet',
                'make a conference': 'conference',
                'make a conversation': 'converse',
                'make a discussion': 'discuss',
                'make a dialogue': 'dialogue',
                'make an exchange': 'exchange',
                'make a communication': 'communicate',
                'make a connection': 'connect',
                'make a relationship': 'relate',
                'make an association': 'associate',
                'make a partnership': 'partner',
                'make a collaboration': 'collaborate',
                'make a cooperation': 'cooperate',
                'make an alliance': 'ally',
                'make a union': 'unite',
                'make a combination': 'combine',
                'make a mixture': 'mix',
                'make a blend': 'blend',
                'make a synthesis': 'synthesize',
                'make an integration': 'integrate',
                'make a coordination': 'coordinate',
                'make a synchronization': 'synchronize',
                'make a harmonization': 'harmonize',
                'make a reconciliation': 'reconcile',
                'make a modification': 'modify',
                'make an alteration': 'alter',
                'make a revolution': 'revolution',
                'make a shift': 'shift',
                'make a flow': 'flow',
                'make a distribution': 'distribute',
                'make a collection': 'collect',
                'make an accumulation': 'accumulate',
                'make a gathering': 'gather',
                'make an assembly': 'assemble'
            };
        }
        return this.__grammarDict;
    }

    // 检测错误（返回 {vocabErrors, grammarErrors, tipsList, correctionMap}）
    detectWritingErrors(text) {
        const vocabErrors = [];
        const grammarErrors = [];
        const tipsList = [];
        const correctionMap = { vocab: new Map(), grammar: new Map() };

        if (!text || !this._aiCorrectionEnabled) {
            return { vocabErrors, grammarErrors, tipsList, correctionMap };
        }

        const lower = text.toLowerCase();
        const dict = this._correctionDict;

        // 词汇错误检测
        for (const [wrong, correct] of Object.entries(dict)) {
            const wrongLower = wrong.toLowerCase();
            if (wrongLower === correct.toLowerCase()) continue;
            let pos = lower.indexOf(wrongLower);
            while (pos !== -1) {
                const before = pos > 0 ? lower[pos - 1] : ' ';
                const after = pos + wrongLower.length < lower.length ? lower[pos + wrongLower.length] : ' ';
                const isWordBoundary = !/[a-zA-Z]/.test(before) && !/[a-zA-Z]/.test(after);
                if (wrongLower.includes(' ') || isWordBoundary) {
                    const actualText = text.substring(pos, pos + wrong.length);
                    vocabErrors.push({
                        text: actualText, start: pos,
                        end: pos + wrong.length,
                        wrong: actualText, correct: correct,
                        type: 'vocab',
                        explanation: `拼写错误：${actualText} → ${correct}`
                    });
                    correctionMap.vocab.set(actualText.toLowerCase(), correct);
                    tipsList.push({
                        type: 'vocab', wrong: actualText, correct: correct,
                        explanation: `拼写错误：${actualText} → ${correct}`
                    });
                }
                pos = lower.indexOf(wrongLower, pos + 1);
                if (pos === -1) break;
            }
        }

        // 语法错误检测
        const gDict = this._grammarDict;
        for (const [wrong, correct] of Object.entries(gDict)) {
            const wrongLower = wrong.toLowerCase();
            if (wrongLower === correct.toLowerCase()) continue;
            let pos = lower.indexOf(wrongLower);
            while (pos !== -1) {
                const actualText = text.substring(pos, pos + wrong.length);
                grammarErrors.push({
                    text: actualText, start: pos,
                    end: pos + wrong.length,
                    wrong: actualText, correct: correct,
                    type: 'grammar',
                    explanation: `语法错误：${actualText} → ${correct}`
                });
                correctionMap.grammar.set(actualText.toLowerCase(), correct);
                tipsList.push({
                    type: 'grammar', wrong: actualText, correct: correct,
                    explanation: `语法错误：${actualText} → ${correct}`
                });
                pos = lower.indexOf(wrongLower, pos + 1);
                if (pos === -1) break;
            }
        }

        // 按位置排序并合并重叠
        const mergeOverlapping = (errs) => {
            if (errs.length === 0) return errs;
            const sorted = [...errs].sort((a, b) => a.start - b.start);
            const merged = [sorted[0]];
            for (let i = 1; i < sorted.length; i++) {
                const last = merged[merged.length - 1];
                if (sorted[i].start < last.end) {
                    last.end = Math.max(last.end, sorted[i].end);
                } else {
                    merged.push({ ...sorted[i] });
                }
            }
            return merged;
        };

        return {
            vocabErrors: mergeOverlapping(vocabErrors),
            grammarErrors: mergeOverlapping(grammarErrors),
            tipsList,
            correctionMap
        };
    }

    // 更新tip按钮状态（4状态机：parsing/allSet/hasTips/great）
    updateTipButtonState(state, count) {
        const tipContent = document.getElementById('tipContent');
        const tipBtn = document.getElementById('tipBtn');
        if (!tipContent) return;

        let html = '';
        switch (state) {
            case 'parsing':
                html = '<span class="tip-text">parsing</span><svg class="tip-icon loading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/></svg>';
                break;
            case 'hasTips':
                html = `<span class="tip-number">${count}</span><span class="tip-label">tips</span><svg class="tip-icon" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm10-6a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5 12a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zm14.07-6.07a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.71-.71a1 1 0 011.41 0zM7.05 17.95a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.71-.71a1 1 0 011.41 0zm12.02 2.12a1 1 0 01-1.41 0l-.71-.71a1 1 0 111.41-1.41l.71.71a1 1 0 010 1.41zM7.05 6.05a1 1 0 01-1.41 0l-.71-.71a1 1 0 111.41-1.41l.71.71a1 1 0 010 1.41zM12 7a5 5 0 100 10 5 5 0 000-10z"/></svg>`;
                break;
            case 'great':
                html = '<span class="tip-text">Great!</span><svg class="tip-icon" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                break;
            case 'allSet':
            default:
                html = '<span class="tip-text">All set!</span>';
                break;
        }
        tipContent.innerHTML = html;
        tipContent.style.opacity = '0';
        setTimeout(() => { tipContent.style.opacity = '1'; }, 50);

        // 存储当前状态
        this._currentTipState = state;
    }

    // 显示纠错弹窗（位置跟随错误元素）
    showCorrection(event) {
        event.stopPropagation();
        const target = event.currentTarget.closest('[data-error-type]') || event.currentTarget;
        const wrong = target.dataset.wrong || '';
        const correct = target.dataset.correct || '';
        const type = target.dataset.errorType || 'vocab';

        if (!wrong || !correct) return;

        const popup = document.getElementById('correctionPopup');
        if (!popup) return;

        const typeLabel = type === 'grammar' ? '语法错误 Grammar' : '词汇错误 Vocabulary';
        const typeColor = type === 'grammar' ? 'var(--error)' : 'var(--warning)';

        // 计算弹窗位置：跟随错误元素
        const rect = target.getBoundingClientRect();
        const windowH = window.innerHeight;
        let top = rect.top - 180;
        if (top < 10) top = rect.bottom + 10;
        const left = Math.min(Math.max(10, rect.left), window.innerWidth - 340);

        popup.innerHTML = `
            <div id="correctionOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.25);z-index:999;" onclick="WordMemoryApp.closeCorrectionPopup()"></div>
            <div class="correction-popup" style="position:fixed;top:${top}px;left:${left}px;z-index:1000;background:var(--surface);border-radius:14px;padding:20px 24px;min-width:300px;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.18);border:1px solid var(--border-color);font-family:inherit;animation:correctionFadeIn 0.18s ease-out;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                    <span style="background:${typeColor};color:#fff;padding:3px 10px;border-radius:6px;font-size:0.72rem;font-weight:700;">${typeLabel}</span>
                    <span style="cursor:pointer;color:var(--text-secondary);font-size:0.8rem;padding:2px 6px;" onclick="WordMemoryApp.closeCorrectionPopup()">✕</span>
                </div>
                <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:0.68rem;color:var(--text-tertiary);margin-bottom:3px;">原文</div>
                        <div style="color:var(--error);font-weight:700;font-size:1rem;text-decoration:line-through;word-break:break-all;">${this.escapeHtml(wrong)}</div>
                    </div>
                    <div style="font-size:1.2rem;color:var(--text-tertiary);flex-shrink:0;">→</div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:0.68rem;color:var(--text-tertiary);margin-bottom:3px;">建议</div>
                        <div style="color:var(--success);font-weight:700;font-size:1rem;word-break:break-all;">${this.escapeHtml(correct)}</div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button id="correctionIgnore" style="padding:7px 16px;border-radius:7px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:0.82rem;font-weight:600;transition:background 0.15s;" onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='transparent'">忽略</button>
                    <button id="correctionAccept" style="padding:7px 16px;border-radius:7px;border:none;background:var(--success);color:#fff;cursor:pointer;font-size:0.82rem;font-weight:600;transition:background 0.15s;" onmouseover="this.style.background='color-mix(in srgb, var(--success) 85%, #000)'" onmouseout="this.style.background='var(--success)'">接受</button>
                </div>
            </div>
        `;

        const acceptBtn = document.getElementById('correctionAccept');
        const ignoreBtn = document.getElementById('correctionIgnore');
        if (acceptBtn) {
            acceptBtn.onclick = () => {
                this.applyCorrection(wrong, correct);
                this.closeCorrectionPopup();
            };
        }
        if (ignoreBtn) {
            ignoreBtn.onclick = () => {
                this.closeCorrectionPopup();
            };
        }
    }

    closeCorrectionPopup() {
        const popup = document.getElementById('correctionPopup');
        if (popup) popup.innerHTML = '';
    }

    // 应用纠正：替换editor中的错误文本
    applyCorrection(wrong, correct) {
        const editor = document.getElementById('writingEditor');
        if (!editor || !wrong || !correct) return;
        const text = editor.textContent;
        // 替换所有出现
        const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const newText = text.replace(regex, correct);
        this.handleWritingInput(newText);
        this.showToast(`已替换：${wrong} → ${correct}`, 'success');
    }

    // 切换AI纠正
    toggleAiCorrection(enabled) {
        this._aiCorrectionEnabled = enabled;
        Storage.saveSection('aiWorkspace', { aiCorrectionEnabled: enabled ? '1' : '0' });
        const switchEl = document.getElementById('settingAiSwitch');
        if (switchEl) switchEl.checked = enabled;
        
        if (enabled) {
            this.showToast('AI实时纠正已开启', 'success');
            // 重新渲染以显示错误
            const editor = document.getElementById('writingEditor');
            if (editor && editor.textContent) {
                this.handleWritingInput(editor.textContent);
            } else {
                this.updateTipButtonState('allSet');
            }
        } else {
            this.showToast('AI实时纠正已关闭', 'info');
            // 清除错误状态和弹窗
            this._writingErrorState = null;
            this._prevErrorState = null;
            this.closeCorrectionPopup();
            this._currentTipsList = [];
            this._currentTipIndex = 0;
            // 重新渲染去除错误标记
            const editor = document.getElementById('writingEditor');
            if (editor && editor.textContent) {
                this.handleWritingInput(editor.textContent);
            } else {
                editor.innerHTML = '';
                this.updateWritingStats({ tokenCount: 0, typeCount: 0, mlSentence: 0, slSentence: 0, levelCounts: { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0 }, totalWords: 0 });
                this.updateTipButtonState('allSet');
            }
        }
    }

    // HTML转义
    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    escapeAttr(str) {
        return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // 调用AI生成写作
    async generateWriting() {
        const topic = document.getElementById('writingTopic').value;
        const level = document.getElementById('writingLevel').value;
        const style = document.getElementById('writingStyle').value;
        const model = document.getElementById('writingAiModel').value;
        const prompt = (document.getElementById('writingPrompt').value || '').trim();

        // 随机主题处理
        let finalTopic = topic;
        if (topic === '随机') {
            const topicSelect = document.getElementById('writingTopic');
            const options = Array.from(topicSelect.options).filter(o => o.value !== '随机');
            if (options.length > 0) {
                finalTopic = options[Math.floor(Math.random() * options.length)].value;
            }
        }

        const btn = document.getElementById('generateWritingBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner-small"></span>生成中...';

        // 显示刷新旋转动画
        const topicEl = document.getElementById('writingTopicContent');
        if (topicEl) {
            topicEl.classList.add('topic-refreshing');
            topicEl.classList.remove('topic-fade-in');
        }

        try {
            const userPrompt = this.buildWritingPrompt(finalTopic, level, style, prompt);
            const content = await AIService.callModel(model, userPrompt, {
                max_tokens: 500,
                temperature: 0.5
            });

            // 清理可能的markdown标记
            const cleanContent = content
                .replace(/^```[\s\S]*?\n/, '')
                .replace(/```$/, '')
                .trim();

            // 填充命题到topic-content，先移除刷新动画再渐变显现
            if (topicEl) {
                topicEl.classList.remove('topic-refreshing');
                topicEl.textContent = cleanContent;
                // 触发重排后添加渐变动画
                void topicEl.offsetHeight;
                topicEl.classList.add('topic-fade-in');
            }
        } catch (error) {
            console.error('AI命题生成失败:', error);
            if (topicEl) {
                topicEl.classList.remove('topic-refreshing');
                topicEl.classList.add('topic-fade-in');
            }
            alert('AI命题生成失败：' + error.message + '\n\n请检查API密钥是否配置正确。');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    // 构建AI写作命题Prompt
    buildWritingPrompt(topic, level, style, userPrompt) {
        const levelDesc = {
            A1: '初级（词汇简单，句子简短，日常话题）',
            A2: '初中级（基础词汇，简单句为主）',
            B1: '中级（常用词汇，复合句适当使用）',
            B2: '中高级（较丰富词汇，复杂句式）',
            C1: '高级（高级词汇，复杂句式，地道表达）',
            C2: '精通级（极高难度词汇，丰富句式变化）'
        };

        return `请生成一个英文写作命题（writing prompt），主题方向为"${topic}"。
要求：
1. 目标CEFR等级为${level}（${levelDesc[level] || ''}）；
2. 文体为${style}；
3. 命题应包含具体的写作指引和要求，字数建议等；
4. 直接输出命题内容，不要解释、不要markdown格式；
5. ${userPrompt ? '额外要求：' + userPrompt + '；' : ''}命题应具有启发性，适合英语学习者练习。`;
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
    async callStoryGenerationAPI(genre, theme, keywords, difficulty, aiModel) {
        const keywordsStr = keywords.join(', ');
        
        // 根据题材定义角色和风格
        const genreRoles = {
            '外文刊物': '你是一个英语刊物主编，擅长根据给出的若干单词，生成可读性强的各种题材的英语外刊',
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
1. ${contentType}必须自然地使用所有关键词；其中约50%的关键词请以合理的词形/词性变化形式呈现（如单复数、动词时态变化、动名词/分词、派生形容词/副词等），而不是一律使用原形，让学习者能从不同角度认出该词（例如关键词"undergo"可在文中呈现为"underwent"/"undergone"/"undergoing"）
2. 难度等级为 ${difficulty}
3. 生成4-5个阅读理解题，其中至少1个填空题、1个选择题
4. 题目要有一定难度，可以包含英语阅读题常用的同义替换、熟词生义等陷阱
5. 填空题的答案应该是从文章提取的单个一模一样的单词（无任何形态、词性变化）
6. 确保JSON格式正确，可被解析`;

        const userPrompt = `请根据以下信息生成一个英文${contentType}：

题材：${genre}
主题：${theme}
关键词：${keywordsStr}
难度等级：${difficulty}
词数：800-1200单词

请生成一个完整的${contentType}内容，并附带4-5个阅读理解题目。`;

        console.log('🤖 调用AI API生成阅读...');

        const content = await AIService.callModel(aiModel, '', {
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
        });
        
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

    // 启动阅读计时器
    startReadingTimer() {
        // 如果已有计时器，先清除
        this.stopReadingTimer();
        
        // 重置为5分钟（300秒）
        this.readingTimerSeconds = 300;
        
        // 更新显示
        this.updateReadingTimerDisplay();
        
        // 启动定时器
        this.readingTimer = setInterval(() => {
            this.readingTimerSeconds--;
            this.updateReadingTimerDisplay();
        }, 1000);
    }
    
    // 停止阅读计时器
    stopReadingTimer() {
        if (this.readingTimer) {
            clearInterval(this.readingTimer);
            this.readingTimer = null;
        }
    }
    
    // 更新阅读计时器显示
    updateReadingTimerDisplay() {
        const timerElement = document.getElementById('readingTimer');
        if (!timerElement) return;
        
        const isNegative = this.readingTimerSeconds < 0;
        const absSeconds = Math.abs(this.readingTimerSeconds);
        
        // 计算分、秒
        const minutes = Math.floor((absSeconds % 3600) / 60);
        const seconds = absSeconds % 60;
        
        // 格式化为 分:秒
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // 如果是负值，添加负号
        const displayString = isNegative ? `-${timeString}` : timeString;
        
        timerElement.textContent = displayString;
        
        // 如果是负值，添加红色样式
        if (isNegative) {
            timerElement.classList.add('negative');
        } else {
            timerElement.classList.remove('negative');
        }
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

        // 高亮关键词（兼容 AI 糅合时输出的词形/词性变化，如 undergo → underwent）
        const highlightedContent = this.highlightKeywordVariants(cleanContent, story.keywords);

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
        
        // 启动阅读计时器
        this.startReadingTimer();
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
    
    // 初始化关键词点击委托（幂等，可反复调用）：
    // 统一挂载到 document 上，阅读故事 / 文字游戏消息 / 选项 / 右页场景 等所有动态高亮词
    // 无论出现在哪个容器都能响应点击弹窗
    initKeywordHighlightClick() {
        // document 级委托只绑一次
        if (!this._kwClickBound) {
            this._kwClickBound = true;
            document.addEventListener('click', (e) => {
                const target = e.target.closest('.keyword-highlight');
                if (target) {
                    e.stopPropagation();
                    this.showKeywordToolbar(target, target.textContent.trim());
                }
            });
        }
        // 点击其他区域隐藏toolbar的监听只绑一次
        if (!this._kwDocHideBound) {
            this._kwDocHideBound = true;
            document.addEventListener('click', (e) => {
                const toolbar = document.getElementById('keywordHighlightToolbar');
                if (toolbar && !toolbar.contains(e.target) && !e.target.closest('.keyword-highlight')) {
                    toolbar.classList.add('hidden');
                }
            });
        }
    }
    
    // 显示关键词工具栏
    showKeywordToolbar(element, word) {
        const toolbar = document.getElementById('keywordHighlightToolbar');
        if (!toolbar) return;
        
        // 获取单词信息
        const wordInfo = this.getWordInfo(word);
        
        // 更新toolbar内容（单词右侧附带CEFR等级标识，如果命中）
        const kwWordEl = document.getElementById('keywordToolbarWord');
        kwWordEl.innerHTML = this.escapeHtml(word) + this.getCEFRBadgeHTML(word);
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
        
        // 未直接命中时，尝试匹配词形/词性变化：点击高亮的变形词（如 underwent）时，
        // 回退到其原形关键词（如 undergo）的单词信息
        if (!wordData && typeof this.buildKeywordCandidates === 'function') {
            const surface = word.toLowerCase();
            const baseHit = allWords.find(w => {
                const base = w.word.toLowerCase();
                return base !== surface && this.buildKeywordCandidates(base).includes(surface);
            });
            if (baseHit) wordData = baseHit;
        }
        
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
            // 如果已经为该单词和口音预取了 utterance，立即播放（跳过延迟）
            if (this.preparedUtterance && this.preparedUtterance.text === word && this.preparedUtterance.lang === accent) {
                try {
                    if (speechSynthesis.speaking) speechSynthesis.cancel();
                    this.preparedUtterance.onerror = (event) => {
                        if (event.error !== 'interrupted') {
                            console.error('发音失败:', event.error);
                        }
                    };
                    this.preparedUtterance.onend = () => {
                        console.log('✅ 发音完成:', word);
                    };
                    speechSynthesis.speak(this.preparedUtterance);
                } catch (err) {
                    console.error('使用预取发音失败:', err);
                } finally {
                    this.preparedUtterance = null;
                }
            } else {
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
            }
        } catch (error) {
            console.error('发音失败:', error);
        }
    }
    
    // AI翻译方法
    async translateText(text) {
        console.log('🌐 开始翻译:', text);
        
        // 使用用户在翻译结果栏中选择的模型（默认取最近使用的自定义模型）
        const translateModelEl = document.getElementById('translateAiModel');
        const translateModel = (translateModelEl && translateModelEl.value) || this.getLastUsedModel() || '';

        try {
            const translation = await AIService.callModel(translateModel, text, {
                temperature: 0.3,
                max_tokens: 500,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的英译中翻译助手。请将用户提供的英文文本翻译成简洁准确的中文，只返回翻译结果，不要添加任何解释或额外内容。'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ]
            });
            
            const result = translation.trim();
            
            console.log('✅ 翻译完成:', result);
            return result;
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
        const favoriteTextBtn = document.getElementById('favoriteTextBtn');
        
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
        
        const oldFavoriteHandler = favoriteTextBtn._favoriteClickHandler;
        if (oldFavoriteHandler) {
            favoriteTextBtn.removeEventListener('click', oldFavoriteHandler);
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
                
                // 清空原文区域（稍后根据类型填充）
                translationOriginal.textContent = '';
                
                // 显示加载状态
                translationText.innerHTML = '<span class="translation-loading">翻译中...</span>';
                
                try {
                    // 如果是单个英文单词，使用结构化补全以返回更多释义
                    const isSingleWord = /^[A-Za-z'-]+$/.test(selectedText);
                    if (isSingleWord) {
                        // 先在本地词单/收藏中检索，命中则使用本地数据，未命中再调用AI
                        const localFound = this.findWordInAllBooks(selectedText);
                        let item = null;
                        if (localFound && localFound.word) {
                            item = localFound.word;
                            this.lastTranslationResults = [{
                                word: item.word || selectedText,
                                phonetic: item.phonetic || '',
                                definitions: item.definitions || [{ meaning: item.meaning || '', example: item.example || '' }]
                            }];
                        } else {
                            // 翻译优先展示英文词典（englishwords-dict.js）中的数据，未命中再调用AI
                            const dictEntry = await this.findDictionaryWord(selectedText);
                            if (dictEntry && dictEntry.meaning) {
                                item = {
                                    word: selectedText,
                                    phonetic: dictEntry.pronunciation,
                                    definitions: [{ meaning: dictEntry.meaning, example: '' }]
                                };
                                this.lastTranslationResults = [item];
                            } else {
                                // 使用用户在翻译结果栏中下拉选择的模型（含用户自定义模型）
                                const translateModelEl = document.getElementById('translateAiModel');
                                const translateModel = (translateModelEl && translateModelEl.value) || this.getLastUsedModel();
                                const enriched = await AIService.enrichWordsWithLight([{ word: selectedText }], null, null, translateModel);
                                item = (enriched && enriched[0]) || null;
                                this.lastTranslationResults = enriched || [];
                            }
                        }

                        // 显示原文并附加收藏按钮（不在 translationText 重复显示原文）；单词右侧附带CEFR等级标识（如果命中）
                        const alreadyFav = this.isWordFavorited(selectedText);
                        const favHtml = alreadyFav ? '⭐' : '<span class="favorite-gray">⭐</span>';
                        translationOriginal.innerHTML = `<strong>${this.escapeHtml(selectedText)}</strong>${this.getCEFRBadgeHTML(selectedText)} <button id="translationFavoriteBtn" class="translation-fav" title="${alreadyFav ? '已收藏' : '将此次翻译结果加入收藏'}">${favHtml}</button>`;

                        // 构建翻译结果：音标 + 各项释义与例句
                        let html = '';
                        if (item && item.phonetic) {
                            html += `<div class="translation-phonetic">${this.escapeHtml(item.phonetic)}</div>`;
                        }
                        const defs = (item && item.definitions && item.definitions.length > 0) ? item.definitions : [{ meaning: '', example: '' }];
                        html += '<ul style="margin:0; padding-left:1rem;">';
                        defs.forEach(def => {
                            const meaning = def.meaning || def.mean || '';
                            const example = def.example || '';
                            html += `<li style="margin-bottom:0.5rem;"><div class="translation-meaning">${this.escapeHtml(meaning)}</div>`;
                            if (example) {
                                // 例句中高亮对应单词（复用 keyword-highlight 涂色样式，支持词形变化匹配）
                                const highlightedExample = this.highlightWordInExample(example, selectedText, 'keyword');
                                html += `<div class="translation-example" style="color:var(--text-secondary); font-size:0.9rem; margin-top:4px;">${highlightedExample}</div>`;
                            }
                            html += `</li>`;
                        });
                        html += '</ul>';
                        translationText.innerHTML = html;

                        // 绑定收藏按钮事件（切换收藏：已收藏 -> 取消收藏；未收藏 -> 添加收藏）
                        const favBtn = document.getElementById('translationFavoriteBtn');
                        if (favBtn) {
                            const oldHandler = favBtn._clickHandler;
                            if (oldHandler) favBtn.removeEventListener('click', oldHandler);
                            const favHandler = () => {
                                const lower = selectedText.trim().toLowerCase();
                                const alreadyFavNow = this.isWordFavorited(selectedText);
                                if (alreadyFavNow) {
                                    // 先尝试从全局收藏中移除
                                    let favs = Storage.loadFavoriteItems() || [];
                                    const filtered = favs.filter(f => !(f.word && f.word.trim().toLowerCase() === lower));
                                    if (filtered.length !== favs.length) {
                                        Storage.saveFavoriteItems(filtered);
                                        this.loadBooks();
                                        favBtn.innerHTML = '<span class="favorite-gray">⭐</span>';
                                        favBtn.title = '将此次翻译结果加入收藏';
                                        this.showToast('已取消收藏', 'success');
                                        return;
                                    }

                                    // 如果没有在全局收藏中，则尝试在词书中查找并取消收藏标记
                                    const books = Storage.loadBooks();
                                    for (const book of books) {
                                        if (!book || !Array.isArray(book.words)) continue;
                                        const idx = (book.words || []).findIndex(w => w.word && w.word.trim().toLowerCase() === lower && w.favorite);
                                        if (idx >= 0) {
                                            book.words[idx].favorite = false;
                                            Storage.updateBook(book.id, book);
                                            this.loadBooks();
                                            favBtn.innerHTML = '<span class="favorite-gray">⭐</span>';
                                            favBtn.title = '将此次翻译结果加入收藏';
                                            this.showToast('已取消收藏', 'success');
                                            return;
                                        }
                                    }

                                    // 兜底提示
                                    this.showToast('该单词已在收藏中（已处理）', 'info');
                                } else {
                                    // 添加到全局收藏（使用现有的批量方法）
                                    this.addTranslationsToFavoritesBook(this.lastTranslationResults || []);
                                    favBtn.innerHTML = '⭐';
                                    favBtn.title = '已收藏';
                                }
                            };
                            favBtn.addEventListener('click', favHandler);
                            favBtn._clickHandler = favHandler;
                        }
                    } else {
                        // 非单词文本，使用普通翻译接口
                        const translation = await this.translateText(selectedText);
                        // 原文保持为斜体展示
                        translationOriginal.innerHTML = `<em>${this.escapeHtml(selectedText)}</em>`;
                        translationText.textContent = translation;
                        this.lastTranslationResults = null;
                    }
                } catch (error) {
                    console.error('翻译失败:', error);
                    translationText.innerHTML = `<span class="translation-error">翻译失败: ${error.message}</span>`;
                }
            }
        };
        translateBtn.addEventListener('click', translateHandler);
        translateBtn._translateClickHandler = translateHandler;

        // 切换 AI 模型后：关闭下拉面板但保留工具栏，并用新模型重新发起翻译
        const translateModelEl = document.getElementById('translateAiModel');
        if (translateModelEl) {
            const oldModelChange = translateModelEl._translationModelChangeHandler;
            if (oldModelChange) translateModelEl.removeEventListener('change', oldModelChange);
            const modelChangeHandler = () => {
                // 仅当已展示翻译结果、且有待翻译文本时，用新模型重新请求
                const result = document.getElementById('toolbarTranslationResult');
                const buttons = document.getElementById('toolbarButtons');
                if (result && !result.classList.contains('hidden') && buttons && buttons.classList.contains('hidden') && selectedText) {
                    translateHandler();
                }
            };
            translateModelEl.addEventListener('change', modelChangeHandler);
            translateModelEl._translationModelChangeHandler = modelChangeHandler;
        }
        
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
        
        // 收藏功能
        const favoriteHandler = () => {
            if (selectedText) {
                this.favoriteSelectedWord(selectedText);
                toolbar.classList.add('hidden');
                window.getSelection().removeAllRanges();
            }
        };
        // 隐藏选择工具栏中的收藏按钮（取消双击/划词弹出的收藏入口）
        // 仍保留函数绑定以兼容其它交互，但不向用户展示该按钮
        if (favoriteTextBtn) {
            favoriteTextBtn.style.display = 'none';
            // do not attach visible favorite interaction
        }
        favoriteTextBtn._favoriteClickHandler = favoriteHandler;
        
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

    // 切换文字游戏双页展示模式
    toggleTextGameDualView() {
        const isDualView = document.body.classList.contains('textgame-dual-view');
        const toggleBtn = document.getElementById('toggleTextGameDualViewBtn');

        // 检测设备宽度，仅开启时限制（退出操作不受影响）
        if (window.innerWidth < 1024 && !isDualView) {
            alert('双页展示功能需要更大的屏幕空间，请在PC端使用');
            return;
        }

        if (!isDualView) {
            // 开启双页展示
            document.body.classList.add('textgame-dual-view');
            toggleBtn.classList.add('active');
            toggleBtn.querySelector('span').textContent = '退出双页';
            // 自动折叠两侧栏，聚焦双页内容
            try { if (typeof this._setBothCollapsed === 'function') this._setBothCollapsed(true); } catch (e) {}
        } else {
            // 退出双页展示
            document.body.classList.remove('textgame-dual-view');
            toggleBtn.classList.remove('active');
            toggleBtn.querySelector('span').textContent = '双页展示';
            // 恢复展开两侧栏
            try { if (typeof this._setBothCollapsed === 'function') this._setBothCollapsed(false); } catch (e) {}
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
        
        // 移动端：自动关闭统计面板弹窗
        this.closeMobileStats();

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
    // 暴露全局实例，供 ai-service.js 等模块读取当前选择的 AI 模型
    window.app = app;
    // 后台静默加载英文词典（Web Worker 解析，不阻塞主线程）
    app.initEnglishDictionaryLoader();
});

