/**
 * 英文扑克 —— AI 工坊「趣味娱乐」里的掼蛋式拼词扑克。
 *
 * 一句话规则：领出者用字母牌拼出一个单词（或甩单牌），其余人跟「字数完全相同」的单词，
 * 跟不动就过；甩单牌只能越出越大（A→Z），出到 Z 之后只能用炸弹夺回牌权。
 * 够 N 字母门槛、且在你词书里的词是「炸弹」，能压掉任何普通牌，
 * 炸弹之间「同样长或更长」即可压。谁先出完手牌谁赢（血战到底，继续排完 4 名；你先出完则直接快进到结算）。
 *
 * 设计取舍（与英语麻将同源，但换成扑克节奏）：
 * - 不比字母大小：拼得出来就能跟，拼不出来就得过 —— 输赢归因于「词汇量」而不是运气；
 * - 炸弹 = 词书里 ≥N 字母的真词（词书外的长词只能当普通牌），每个词全场只能用一次
 *   （当普通词还是炸弹都算），出炸弹时亮音标释义；同一个词的炸弹全场每天只能出一次，
 *   次日重置 —— 免得当天被同一种大词反复压制；
 * - 出牌赋分：长牌 / B2 以上高级词 / 炸弹各有加权，与胜负分开计，结算评选 MVP；
 * - 一个墩要「其余人全过」才收，有人跟得上就继续绕圈跟 —— 所以牌权归最后出牌者，不是一轮就定；
 * - 普通单词查全量基础词典（10 万词），所以小词书也不会把对局卡死；
 *   CEFR 表里词典未收录的缩写 / 专名不作为合法词（出了也查不到释义）；
 * - AI 强弱 = 词汇视野（CEFR 档）× 选牌策略（按权重随机出 1~N 字）× 失误率；
 *   它还会避开手里的炸弹材料，不会为了跟小牌把攒好的炸弹拆了；只看得见自己的手牌与桌面公开信息。
 *   困难模式首墩由随机一位人机先出。
 * - 音效（出牌 / 炸弹 / 牌权切换 / 胜负）放在仓库 static/audio/poker/：web 端直接读本地文件，
 *   OB 发行包不含该目录，回退到设置页下载的缓存或 GitHub raw 直链（见文件末尾「音效」段）。
 */
(function () {
    'use strict';

    /* ============================ 常量 ============================ */

    // 104 张字母牌按英文词频配张 + 4 张王 = 108 张，与掼蛋牌数同构。
    // 但张数上下限按英语麻将的口径压平（最多 8 张、最少 2 张，元音 33 张）：
    // 纯词频配张会出现 e:12 这种极端，手牌一抓一大把同字母，拼词体验很差。
    // 再配合 startMatch 的「轮转发牌」，同一字母每人最多 ceil(张数/4) 张（≤2）。
    var LETTER_POOL = {
        a: 8, e: 8, i: 7, o: 7, u: 3,
        t: 8, n: 7, s: 7, h: 6, r: 6,
        d: 4, l: 4, c: 3, m: 2, p: 2,
        w: 2, f: 2, g: 2, y: 2, b: 2, v: 2,
        k: 2, j: 2, x: 2, q: 2, z: 2
    };
    var VOWELS = 'aeiou';
    var JOKER_C = '1';  // 大王：可当任意辅音
    var JOKER_V = '2';  // 小王：可当任意元音
    // 大王 + 小王 一起出 = 王炸：优先级最高的炸弹，能压任何牌，且只有王炸能压王炸。
    // 它不成词、没有字数，所以用一个大于 MAX_WORD_LEN 的哨兵值塞进 g.bombLevel 表示「台面是王炸」。
    var JOKER_BOMB = 99;
    var JOKER_BOMB_SCORE = 12;   // 王炸的赋分（不计字母数）
    var JOKER_BOMB_FINISH = 10;  // 收官奖励：最后出的一手是王炸，固定加 10 分（它没有字母数）
    var PANIC_HAND = 8;          // 有玩家手牌少于这个数，其他人就「恐慌」抢牌权
    var BOMB_ENDGAME_HAND = 6;   // 自己手牌 ≤ 这个数就进入收官冲刺，炸弹不再留着当储备
    var PANIC_BUBBLE_HAND = 5;   // 手牌 ≤ 这个数就在座位旁冒气泡「我就剩 N 张牌了」
    var PANIC_BUBBLE_MS = 5000;  // 气泡只喊一次，持续 5 秒后淡出（记在 S.panicBubbles 里，避免每次渲染重放）
    var HAND_SIZE = 27; // 108 / 4，掼蛋原版发牌数
    var SEAT_NAMES = ['你', '下家', '对家', '上家'];
    var AI_NAMES = ['你', '阿禾', '老 K', '小满'];
    var MAX_WORD_LEN = 12;
    var BOMB_HOLD_MS = 3000;   // 出炸弹后，亮出音标释义并停顿的时长（不看清楚就容易误以为被普通牌压了）

    // 三档 AI：词汇视野（CEFR 档位）× 选牌策略 × 失误率。
    // 「愚蠢度」不靠单一维度：限词 + 只会贪心 + 会看走眼，三样叠加才像人菜。
    // bombChance = 手里有炸弹时顺势甩出的倾向；bombKeep = 中途硬性预留几手炸弹留到收官翻盘。
    // icon / tag / desc 供设置页的富文本典雅下拉（.ai-picker）取用
    var LEVELS = {
        easy: {
            label: '简单', cefr: ['A1', 'A2'],
            icon: 'fi-rr-leaf', tag: 'A1–A2',
            desc: '词汇视野 A1–A2 · 常看走眼，失误率高',
            maxLead: 3,
            passChance: 0.28, blunder: 0.25, bombChance: 0.35, bombKeep: 1
        },
        normal: {
            label: '普通', cefr: ['A1', 'A2', 'B1', 'B2'],
            icon: 'fi-rr-star', tag: 'A1–B2',
            desc: '词汇视野 A1–B2 · 会打配合，偶有失误',
            maxLead: 6,
            passChance: 0.08, blunder: 0.08, bombChance: 0.65, bombKeep: 1
        },
        hard: {
            label: '困难', cefr: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            icon: 'fi-rr-flame', tag: 'A1–C2',
            desc: '词汇视野 A1–C2 · 零失误，首墩随机先出',
            maxLead: 10,
            passChance: 0, blunder: 0, bombChance: 1, bombKeep: 2
        }
    };

    // 领出时的「字数权重」（键 = 字母数，值 = 相对权重）：
    // 过去领出固定挑某个长度（normal/hard 的 maxLead 又都被「炸弹门槛-1」截到 3），
    // 于是人机几乎永远出 3 字母词，单调且好猜。改成按权重随机挑长度，
    // 单张 / 双字母 / 三字母…都有出场机会；难度越高越偏向长一点的词。
    var LEAD_LEN_WEIGHTS = {
        easy:   { 1: 0.9, 2: 1.2, 3: 0.5 },
        normal: { 1: 0.4, 2: 1.1, 3: 0.9, 4: 0.5, 5: 0.3 },
        hard:   { 1: 0.2, 2: 0.8, 3: 1.0, 4: 0.9, 5: 0.6, 6: 0.4 }
    };

    var DEFAULT_CFG = { bookIds: [], level: 'normal', bombMin: 4, hints: false, sound: true };

    /* ============================ 词库数据 ============================ */

    var DATA = {
        ready: false,
        wordSet: null,      // 全部合法单词（基础词典 ∪ CEFR ∪ 词书）
        byLen: null,        // 长度 -> 单词数组
        cefr: null,         // { A1: [words], ... }
        cefrLevel: null,    // 单词 -> CEFR 档位（结算赋分用）
        known: null,        // 难度 -> Set（AI 认得哪些词）
        dict: null          // 基础词典（取音标/释义）
    };

    function isVowel(ch) { return VOWELS.indexOf(ch) >= 0; }

    function countLetters(word) {
        var c = {};
        for (var i = 0; i < word.length; i++) {
            var ch = word[i];
            c[ch] = (c[ch] || 0) + 1;
        }
        return c;
    }

    // 手牌 → 真实字母计数 + 两类王各几张
    function handCounts(hand) {
        var avail = {}, jv = 0, jc = 0;
        hand.forEach(function (card) {
            if (card.code === JOKER_V) jv++;
            else if (card.code === JOKER_C) jc++;
            else avail[card.code] = (avail[card.code] || 0) + 1;
        });
        return { avail: avail, jv: jv, jc: jc };
    }

    // 这副手牌（含王）能否拼出 word
    function canForm(word, hc) {
        var c = countLetters(word), needV = 0, needC = 0;
        for (var ch in c) {
            var def = c[ch] - (hc.avail[ch] || 0);
            if (def > 0) {
                if (isVowel(ch)) needV += def;
                else needC += def;
            }
        }
        return needV <= hc.jv && needC <= hc.jc;
    }

    /**
     * 从手牌中挑出一组能拼成 word 的牌，返回 { ids, jokerFor }；拼不出返回 null。
     * 按「单词的字母顺序」逐个位置取牌（ids 与 word 同序，界面才能照着摆牌），
     * 优先用真实字母，缺的才动用王（免得白白烧掉万能牌）。
     * jokerFor 与 ids 等长：真实字母为 ''，王为 '大王' / '小王'。
     */
    function pickCards(hand, word) {
        var byLetter = {}, jvIds = [], jcIds = [];
        hand.forEach(function (card) {
            if (card.code === JOKER_V) jvIds.push(card.id);
            else if (card.code === JOKER_C) jcIds.push(card.id);
            else (byLetter[card.code] || (byLetter[card.code] = [])).push(card.id);
        });
        var ids = [], jokerFor = [];
        for (var i = 0; i < word.length; i++) {
            var ch = word.charAt(i);
            var pool = byLetter[ch];
            if (pool && pool.length) {
                ids.push(pool.shift());
                jokerFor.push('');
            } else if (isVowel(ch)) {
                if (!jvIds.length) return null;
                ids.push(jvIds.shift());
                jokerFor.push('小王');
            } else {
                if (!jcIds.length) return null;
                ids.push(jcIds.shift());
                jokerFor.push('大王');
            }
        }
        return { ids: ids, jokerFor: jokerFor };
    }

    // 只在基础词典里建一次「长度 -> 词表」索引（供判词与找词共用）
    function buildIndex(dict, cefr, bookWords) {
        var set = Object.create(null);
        var buckets = [];
        for (var i = 0; i <= MAX_WORD_LEN; i++) buckets.push([]);

        function add(w) {
            if (typeof w !== 'string') return;
            w = w.toLowerCase();
            if (w.length < 2 || w.length > MAX_WORD_LEN) return;
            if (!/^[a-z]+$/.test(w)) return;
            if (set[w]) return;
            set[w] = 1;
            buckets[w.length].push(w);
        }

        var hasDict = !!dict;
        if (dict) { for (var k in dict) add(k); }
        // CEFR 表里混着词典未收录的缩写 / 专名（如 lin），过去一律当合法词，
        // 玩家出牌后查不到任何释义 —— 对局记录里就是一个光秃秃的词。
        // 词典可用时只收词典也收录的词；词典不可用才整表兜底。
        // 同时记下每个词的 CEFR 档位，供结算赋分识别 B2/C1/C2 等高级词。
        DATA.cefrLevel = Object.create(null);
        if (cefr) {
            for (var lv in cefr) {
                cefr[lv].forEach(function (w) {
                    if (!DATA.cefrLevel[w]) DATA.cefrLevel[w] = lv;
                    if (!hasDict || dict[w]) add(w);
                });
            }
        }
        (bookWords || []).forEach(add);

        DATA.wordSet = set;
        DATA.byLen = buckets;
    }

    var BOOK_WORDS = [];   // 所选词书（含收藏）里的词，全部小写 —— 决定 AI 词汇视野、提示候选与「哪些长词算炸弹」
    var BOOK_SET = Object.create(null);

    function setBookWords(list) {
        BOOK_WORDS = list || [];
        BOOK_SET = Object.create(null);
        BOOK_WORDS.forEach(function (w) { BOOK_SET[w] = 1; });
    }

    // 读用户词书 + 收藏，拼出 AI 与提示的候选词池
    function loadBookWords(bookIds) {
        var out = [], seen = Object.create(null);
        var S = window.Storage;
        var books = (S && S.loadBooks) ? (S.loadBooks() || []) : [];
        var favs = (S && S.loadFavoriteItems) ? (S.loadFavoriteItems() || []) : [];
        var ids = bookIds || [];

        function push(w) {
            w = String((w && (w.word || w.name)) || w || '').trim().toLowerCase();
            if (!w || !/^[a-z]+$/.test(w) || seen[w]) return;
            seen[w] = 1;
            out.push(w);
        }

        books.forEach(function (b) {
            if (ids.indexOf(String(b.id)) < 0) return;
            (b.words || []).forEach(push);
        });
        if (ids.indexOf('favorites') >= 0) favs.forEach(push);
        return out;
    }

    async function ensureData(cfg) {
        setBookWords(loadBookWords(cfg && cfg.bookIds));

        if (DATA.ready) return DATA.ready;

        var app = window.app;
        if (!window.ENGLISHWORDS_DICT && app && typeof app.ensureBaseDictLoaded === 'function') {
            try { await app.ensureBaseDictLoaded(); } catch (e) { /* 词典不可用则退到词书词表 */ }
        }
        DATA.dict = window.ENGLISHWORDS_DICT || null;

        var cefr = null;
        try {
            var raw = (typeof CEFR_DATA !== 'undefined') ? CEFR_DATA : window.CEFR_DATA;
            if (raw) {
                // 清洗一下：CEFR 表里混着 "TRUE"、"gonna" 这类脏数据
                cefr = {};
                for (var lv in raw) {
                    cefr[lv] = (raw[lv] || []).map(function (w) {
                        return String(w || '').trim().toLowerCase();
                    }).filter(function (w) { return /^[a-z]{2,12}$/.test(w); });
                }
            }
        } catch (e) { cefr = null; }
        DATA.cefr = cefr;

        buildIndex(DATA.dict, cefr, BOOK_WORDS.concat(favAllWordsSafely()));

        // AI 的词汇视野：按 CEFR 档位取并集，再与「真正存在的词」求交
        DATA.known = {};
        for (var key in LEVELS) {
            var set = Object.create(null);
            var levels = LEVELS[key].cefr;
            if (cefr) {
                levels.forEach(function (l) {
                    (cefr[l] || []).forEach(function (w) { if (DATA.wordSet[w]) set[w] = 1; });
                });
            } else {
                // 没有 CEFR 数据：全体词都认得，只靠策略与失误率拉开差距
                for (var w2 in DATA.wordSet) set[w2] = 1;
            }
            DATA.known[key] = set;
        }

        DATA.ready = true;
        return true;
    }

    function favAllWordsSafely() {
        try {
            var S = window.Storage;
            var favs = (S && S.loadFavoriteItems) ? (S.loadFavoriteItems() || []) : [];
            return favs.map(function (f) { return String((f && f.word) || '').trim().toLowerCase(); });
        } catch (e) { return []; }
    }

    function isWord(w) { return !!(DATA.wordSet && DATA.wordSet[w]); }

    /**
     * 炸弹判定：够「炸弹门槛」的长词**且在你所选词书（含收藏）里**才算炸弹。
     * 词书外的长词仍可以正常出（当普通牌，跟牌同样要求字数一致），只是不享受炸弹的压制力 ——
     * 这样「我认识的词才有杀伤力」，玩家不会莫名其妙被 10 万词典里的生僻长词炸掉。
     * 判定只依赖「词是否在词书里」这一件事，所以同一个词不会时而是炸弹时而是普通牌。
     */
    function isBombWord(w, bombMin) {
        return !!w && w.length >= (bombMin || 4) && !!BOOK_SET[w];
    }

    function isBookWord(w) { return !!BOOK_SET[w]; }

    /* —— 炸弹的「每日一次」限制 ——
       同一个词当炸弹全场每天只能出一次，次日重置：免得当天被同一种大词反复压制，
       逼着玩家（和 AI）换别的炸弹打。按「词」记录、不分玩家，规则适用全场。
       存 localStorage 的 epDailyBombs（已列入 storage.js 的 MIRROR_KEYS，
       会随用户配置一起落盘 / 换端加载）。 */
    function todayStamp() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    var DAILY = null;   // 内存缓存，避免在 findBombs 的循环里反复解析 localStorage

    function dailyBombs() {
        if (DAILY && DAILY.date === todayStamp()) return DAILY;
        var data = null;
        try { data = JSON.parse(localStorage.getItem('epDailyBombs') || 'null'); } catch (e) { data = null; }
        // 跨天（或首次）：视为空表，等价于「第二天重置」
        if (!data || data.date !== todayStamp() || !data.words || typeof data.words !== 'object') {
            data = { date: todayStamp(), words: {} };
        }
        DAILY = data;
        return data;
    }

    function isBombUsedToday(w) {
        return !!dailyBombs().words[w];
    }

    function markBombUsedToday(w) {
        var data = dailyBombs();
        if (data.words[w]) return;
        data.words[w] = 1;
        try { localStorage.setItem('epDailyBombs', JSON.stringify(data)); } catch (e) { /* 忽略 */ }
    }

    /* —— 出牌赋分 ——
       分值只衡量「这手牌有多难出、多有分量」，与胜负（谁先出完）分开计：
       长牌更难凑、高级词（B2 以上）更难想、炸弹最能扭转牌权，各给不同权重。
       结算时按总分评选 MVP。 */
    var CEFR_BONUS = { B1: 1, B2: 2, C1: 4, C2: 6 };

    function playScore(word, isBomb, len) {
        if (!word) return 1;                              // 单牌：1 分
        var s = len;                                      // 每出一张牌 1 分
        if (len >= 5) s += (len - 4) * 2;                 // 5 字母起，每多一个字母再加 2 分
        s += CEFR_BONUS[(DATA.cefrLevel || {})[word]] || 0;
        if (isBomb) s += 4 + Math.min(len - 3, 4);        // 炸弹：加 5~8 分（不按字母数线性放大，
                                                          //        免得人机为了压一手小牌就把长炸弹打出去）
        return s;
    }

    function dictEntry(w) {
        var d = DATA.dict;
        if (!d) return null;
        var e = d[w];
        if (e && Array.isArray(e)) return { phonetic: e[0] || '', meaning: e[1] || '' };
        return null;
    }

    // 日志 / 悬浮提示里附一段释义，复盘时不用再查（词典没收录就什么都不加）。
    // 释义前带上该词的 CEFR 档位（如 [C1]），一眼看出这个炸弹/单词的难度。
    function meaningSuffix(w, max) {
        var de = dictEntry(w);
        if (!de || !de.meaning) return '';
        var lv = (DATA.cefrLevel || {})[w];
        var m = (lv ? '[' + lv + '] ' : '') + de.meaning;
        var cap = max || 42;
        if (m.length > cap) m = m.slice(0, cap) + '…';
        return ' · ' + m;
    }

    // 悬浮提示：词形 + 音标 + 释义（编组好的牌组用得上）
    function wordTip(w) {
        var de = dictEntry(w);
        var tip = w.toUpperCase();
        if (de && de.phonetic) tip += ' /' + de.phonetic + '/';
        tip += meaningSuffix(w, 60);
        return tip;
    }

    /* ============================ 找词（AI 与提示共用） ============================ */

    // 返回手牌里所有能拼出的词（限 minLen..maxLen），known 为 null 表示不限词汇视野
    function findAll(hand, minLen, maxLen, known) {
        var hc = handCounts(hand);
        var out = [];
        if (!DATA.byLen) return out;
        var top = Math.min(maxLen || MAX_WORD_LEN, MAX_WORD_LEN);
        for (var L = Math.max(2, minLen); L <= top; L++) {
            var bucket = DATA.byLen[L];
            if (!bucket) continue;
            for (var i = 0; i < bucket.length; i++) {
                var w = bucket[i];
                if (known && !known[w]) continue;
                if (canForm(w, hc)) out.push(w);
            }
        }
        return out;
    }

    // 过滤掉本局已经打过的词 —— 同一个词全场只能用一次（当普通词或炸弹都算）
    function freshWords(list) {
        var used = S.game && S.game.usedWords;
        if (!used) return list;
        return list.filter(function (w) { return !used[w]; });
    }

    // 手牌里所有能凑出的炸弹：长度 ≥ max(炸弹门槛, 台面炸弹长度)、在词书里、且本局没用过；
    // 「今天已经出过的炸弹」也不再列出（全场每日一次，见 isBombUsedToday）。
    function findBombs(hand, bombMin, used, minLen, known) {
        var min = Math.max(bombMin || 4, minLen || 0);
        var out = findAll(hand, min, MAX_WORD_LEN, known).filter(isBookWord);
        out = out.filter(function (w) { return !isBombUsedToday(w); });
        if (!used) return out;
        return out.filter(function (w) { return !used[w]; });
    }

    /* ============================ 对局状态 ============================ */

    var S = {
        cfg: null,
        game: null,
        view: 'config',   // config | game | result
        selected: [],     // 已选手牌 id 的**有序**数组：顺序即组词顺序
        packs: [],        // 已编组的牌组：[{ word, ids, codes, isBomb }]；牌仍在手里，随时可放出
        packPick: null,   // 当前「待放出」的编组下标（点了编组牌、还差一下「跟牌」）
        reveal: null,     // 正在展示的炸弹（出炸弹后停顿 3 秒用的浮层）
        jokerPick: null,  // 含王选牌的「多词候选」弹窗：{ cards, cands, mode: 'play' | 'pack' }
        charm: null,      // 炸弹锦囊弹层：{ word, ids, jokerFor, example, sentence, phase:'quiz'|'win', input, err }
        hintWords: null,
        dataReady: false,
        timers: [],
        busy: false,
        audio: {}         // 音效名 -> Audio 实例（用完复用，避免重复解码）
    };

    /* —— 选牌（有序）：点选加入、再点移出，拖动 / 键盘可改顺序 —— */

    // 浮层进行中（炸弹展示 / 王的多词选择 / 炸弹锦囊）：牌桌输入一律封住，先处理浮层
    function frozen() { return !!(S.reveal || S.jokerPick || S.charm); }

    function isJokerCard(c) { return !!c && (c.code === JOKER_C || c.code === JOKER_V); }

    // 一手牌是不是「王炸」：大王 + 小王 恰好各一张、且**只有这两张**。
    // 关键限制：大小王一旦被当作字母牌去凑单词（与真实字母混成 ≥4 张的单词炸弹），
    // 就失去王炸身份、退化为普通炸弹 —— 只有「光出两张王」才是王炸。
    // 因此这里用 length===2 卡死：炸弹门槛最低 4 字母，两张王永远凑不出词炸弹，
    // 不存在「既是词炸弹又是王炸」的歧义。
    function isJokerBombCards(cards) {
        if (!cards || cards.length !== 2) return false;
        return isJokerCard(cards[0]) && isJokerCard(cards[1]) && cards[0].code !== cards[1].code;
    }

    // 手里有没有现成的王炸：返回 { cards, ids }，没有则 null
    function jokerBombOf(hand) {
        var big = null, small = null;
        for (var i = 0; i < hand.length; i++) {
            if (!big && hand[i].code === JOKER_C) big = hand[i];
            else if (!small && hand[i].code === JOKER_V) small = hand[i];
        }
        return (big && small) ? { cards: [big, small], ids: [big.id, small.id] } : null;
    }

    // 恐慌判定：除自己外有人手牌已少于 PANIC_HAND 张 —— 不能再让他拿到牌权
    function hasPanicField(g, seat) {
        for (var i = 0; i < 4; i++) {
            if (i === seat) continue;
            var p = g.players[i];
            if (p.finished) continue;
            if (p.hand.length < PANIC_HAND) return true;
        }
        return false;
    }

    function pickIndexOf(id) { return S.selected.indexOf(id); }

    // 已被编组的牌不再参与普通选牌（它在编组里等着当炸弹放）
    function isPacked(id) {
        for (var i = 0; i < S.packs.length; i++) {
            if (S.packs[i].ids.indexOf(id) >= 0) return true;
        }
        return false;
    }

    function pickToggle(id) {
        if (isPacked(id)) { toast('这张牌已编组，先解散再用', 'info'); return; }
        S.packPick = null;
        var at = pickIndexOf(id);
        if (at >= 0) S.selected.splice(at, 1); else S.selected.push(id);
    }

    // 把第 from 张选牌插到第 to 个**缝**里（to 是「插入前数组」中的插入位 0..len）。
    // 直接 splice(to) 是错的：抽走 from 后，from 后面的下标都会前移一格，于是
    // 「往后拖」总是差一位、拖拽插不进去 —— 这里先抽牌再把插入位补正。
    function pickReorder(from, to) {
        var len = S.selected.length;
        if (from < 0 || from >= len || to < 0 || to > len) return;
        var v = S.selected.splice(from, 1)[0];
        var at = (to > from) ? to - 1 : to;
        if (at > S.selected.length) at = S.selected.length;
        S.selected.splice(at, 0, v);
    }

    // 键盘敲字母：挑手里第一张「该字母且还没被选」的牌接在末尾
    function pickByLetter(letter) {
        var hand = S.game.players[0].hand;
        for (var i = 0; i < hand.length; i++) {
            var c = hand[i];
            if (c.code === letter && pickIndexOf(c.id) < 0 && !isPacked(c.id)) {
                S.packPick = null;
                S.selected.push(c.id);
                return true;
            }
        }
        return false;
    }

    /* —— 编组：把凑好的词先存起来，等时机到了再点它 + 跟牌放出 —— */

    // 从一把牌里解析出词。手动模式一律看选牌顺序；提示模式也**先**认选牌顺序拼出的词
    // （玩家是照着提示把牌摆成 laser 的，编组/出牌就不该再自作主张改成同字母的 ARLES），
    // 顺序拼不出词时才按字母组合兜底找词。
    function findWordFor(cards) {
        var ordered = resolveOrdered(cards);
        if (ordered) return ordered;
        if (isOrdered()) return null;
        var bucket = DATA.byLen && DATA.byLen[cards.length];
        if (!bucket || !bucket.length) return null;
        var hc = handCounts(cards);
        for (var i = 0; i < bucket.length; i++) {
            if (canForm(bucket[i], hc)) return bucket[i];
        }
        return null;
    }

    // 这手牌能拼出的**所有**词：手动模式按「选牌顺序」定形（含王位类型匹配），提示模式只看字母组合
    function wordChoices(cards) {
        if (isOrdered()) return resolveOrderedAll(cards);
        var bucket = DATA.byLen && DATA.byLen[cards.length];
        if (!bucket || !bucket.length) return [];
        var hc = handCounts(cards);
        var out = [];
        for (var i = 0; i < bucket.length; i++) {
            if (canForm(bucket[i], hc)) out.push(bucket[i]);
        }
        return out;
    }

    // 王的「多词候选」清单：标出哪个是炸弹、哪个当前出不了及原因。
    // 排序：能出的在前 → 在你词书里的在前（更该认识）→ 炸弹优先 → 字典序。
    function jokerChoices(cards, mode) {
        var bombMin = S.cfg.bombMin || 4;
        var isLead = S.game.phase === 'lead';
        var list = wordChoices(cards).map(function (w) {
            var bomb = isBombWord(w, bombMin);
            var err = (mode === 'pack')
                ? (S.game.usedWords[w] ? '本局已经用过了' : null)
                : levelCheck(w, bomb, { isLead: isLead });
            return { word: w, isBomb: bomb, isBook: isBookWord(w), err: err };
        });
        list.sort(function (a, b) {
            if (!!a.err !== !!b.err) return a.err ? 1 : -1;
            if (a.isBook !== b.isBook) return a.isBook ? -1 : 1;
            if (a.isBomb !== b.isBomb) return a.isBomb ? -1 : 1;
            return a.word < b.word ? -1 : 1;
        });
        return list;
    }

    // 这手牌能不能编组：够门槛、拼得出词、本局还没人用过。够门槛+在词书里 = 炸弹组，否则普通组。
    // 不看台面能不能压 —— 编组的意义正是「先收着，等能压的时候再放」。
    function packableWord(cards) {
        if (cards.length < (S.cfg.bombMin || 4)) return null;
        var w = findWordFor(cards);
        if (!w || S.game.usedWords[w]) return null;
        return { word: w, isBomb: isBombWord(w, S.cfg.bombMin || 4) };
    }

    function packBomb() {
        var g = S.game;
        if (!g || g.over || frozen()) return;   // 编组只是「备牌」，不必等轮到自己
        var cards = selectedCards();
        var min = S.cfg.bombMin || 4;
        // 王炸也能编组：两张大小王即可，不成词、也不看炸弹门槛
        if (isJokerBombCards(cards)) { doPackJokerBomb(cards); return; }
        if (cards.length < min) {
            toast('这几张牌凑不成炸弹（要 ≥' + min + ' 字母，且本局没人用过）', 'info');
            return;
        }
        // 含王：同一个字母组合往往能拼出好几个词，弹窗让玩家自己挑
        if (cards.some(isJokerCard)) {
            var cands = jokerChoices(cards, 'pack');
            if (!cands.length) { toast('这几张牌拼不出单词', 'info'); return; }
            if (cands.length > 1) { S.jokerPick = { cards: cards, cands: cands, mode: 'pack' }; render(); return; }
            if (cands[0].err) { toast(cands[0].err, 'info'); return; }
            doPack(cards, cands[0].word);
            return;
        }
        var pw = packableWord(cards);
        if (!pw) {
            toast('这几张牌凑不成炸弹（要 ≥' + min + ' 字母，且本局没人用过）', 'info');
            return;
        }
        doPack(cards, pw.word);
    }

    function doPack(cards, word) {
        var bomb = isBombWord(word, S.cfg.bombMin || 4);
        var picked = pickCards(cards, word);
        var ids = picked ? picked.ids : cards.map(function (c) { return c.id; });
        var byId = {};
        cards.forEach(function (c) { byId[c.id] = c; });
        S.packs.push({
            word: word, ids: ids, codes: ids.map(function (id) { return byId[id].code; }),
            isBomb: bomb
        });
        S.selected = [];
        S.packPick = S.packs.length - 1;
        toast('已编组「' + word.toUpperCase() + '」' + (bomb ? '（炸弹）' : '（词书外的普通词，只能当普通牌打）') +
            '——轮到你时点它，再点「跟牌」放出', 'info');
        render();
    }

    function doPackJokerBomb(cards) {
        var ids = cards.map(function (c) { return c.id; });
        var byId = {};
        cards.forEach(function (c) { byId[c.id] = c; });
        S.packs.push({
            word: null, ids: ids, codes: ids.map(function (id) { return byId[id].code; }),
            isBomb: true, isJokerBomb: true
        });
        S.selected = [];
        S.packPick = S.packs.length - 1;
        toast('已编组「王炸」——轮到你时点它，再点「跟牌」放出', 'info');
        render();
    }

    function unpackBomb(i) {
        if (i < 0 || i >= S.packs.length) return;
        S.packs.splice(i, 1);
        if (S.packPick === i) S.packPick = null;
        else if (S.packPick !== null && S.packPick > i) S.packPick--;
        render();
    }

    // 放出编组好的牌组：点编组牌选中，再点「出牌 / 跟牌」走这里。
    // 炸弹组按炸弹放行（能压台面），普通组只能按普通牌的门槛放（同字数跟牌）。
    function humanPlayPack() {
        var g = S.game;
        if (!g || g.over || g.turn !== 0 || frozen()) return;
        var i = S.packPick;
        if (i === null || !S.packs[i]) { S.packPick = null; render(); return; }
        var pack = S.packs[i];
        var byId = {};
        g.players[0].hand.forEach(function (c) { byId[c.id] = c; });
        // 王炸组：不走 levelCheck，它本就能压任何牌（只有另一副王炸能压它）
        if (pack.isJokerBomb) {
            var jcards = pack.ids.map(function (id) { return byId[id]; });
            if (jcards.some(function (c) { return !c; })) { unpackBomb(i); return; }
            S.packs.splice(i, 1);
            S.packPick = null;
            S.selected = [];
            S.hintWords = null;
            applyPlay(0, {
                len: 2, word: null, isBomb: true, isJokerBomb: true,
                cards: jcards, ids: pack.ids,
                jokerFor: jcards.map(function (c) { return c.code === JOKER_C ? '大王' : '小王'; })
            });
            render();
            afterPlay(0);
            return;
        }
        var err = levelCheck(pack.word, !!pack.isBomb, { isLead: g.phase === 'lead' });
        if (err) { toast(err, 'info'); return; }
        var cards = pack.ids.map(function (id) { return byId[id]; });
        if (cards.some(function (c) { return !c; })) { unpackBomb(i); return; }
        S.packs.splice(i, 1);
        S.packPick = null;
        S.selected = [];
        S.hintWords = null;
        applyPlay(0, {
            len: pack.codes.length, word: pack.word, isBomb: !!pack.isBomb,
            cards: cards, ids: pack.ids, jokerFor: jokerLabels(cards)
        });
        render();
        afterPlay(0);
    }


    function clearTimers() {
        S.timers.forEach(function (t) { clearTimeout(t); });
        S.timers = [];
    }

    function later(fn, ms) {
        var t = setTimeout(function () {
            S.timers = S.timers.filter(function (x) { return x !== t; });
            fn();
        }, ms);
        S.timers.push(t);
    }

    /**
     * 牌堆按「字母」分组返回（每组是该字母的全部副本，连续排列）。
     * 分组是为了发牌时把同一字母的副本摊给四家 —— 见 dealBalanced。
     */
    function buildDeck() {
        var groups = [];
        for (var ch in LETTER_POOL) {
            var g = [];
            for (var i = 0; i < LETTER_POOL[ch]; i++) g.push(ch);
            groups.push(g);
        }
        // 两种王各成一组（各 2 张）：两张同款王不会落到同一个人手里
        groups.push([JOKER_C, JOKER_C]);
        groups.push([JOKER_V, JOKER_V]);
        return shuffle(groups); // 只打散「组的先后」，组内仍连续
    }

    /**
     * 轮转发牌：第 k 张牌发给第 k % 4 家。
     * 字母组的副本连续排列，于是同一字母的副本按座位循环落位 ——
     * 每人最多 ceil(张数 / 4) 张（本牌堆 ≤ 2 张），抓不到 6 张 E 那种手牌；
     * 又因为 108 = 4 × 27，一轮下来每人正好 27 张。
     * 随机性来自 buildDeck 里「字母组先后顺序」的打散（谁能拿到奇数组的
     * 那多出来的一张，取决于该组落在哪个座位起点）。
     */
    function dealBalanced(groups) {
        var hands = [[], [], [], []];
        var k = 0;
        groups.forEach(function (grp) {
            for (var i = 0; i < grp.length; i++) {
                hands[k % 4].push({ id: k + 1, code: grp[i] });
                k++;
            }
        });
        return hands;
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    function sortHand(hand) {
        // 王排最前（好辨认），其余按字母序；同字母按 id 稳定
        hand.sort(function (a, b) {
            var ra = (a.code === JOKER_C || a.code === JOKER_V) ? 0 : 1;
            var rb = (b.code === JOKER_C || b.code === JOKER_V) ? 0 : 1;
            if (ra !== rb) return ra - rb;
            if (a.code !== b.code) return a.code < b.code ? -1 : 1;
            return a.id - b.id;
        });
    }

    function startMatch() {
        if (!S.dataReady) { toast('词库还在加载，稍候一下…', 'info'); return; }
        clearTimers();
        // 上一局的「AI 思考中」定时器可能刚被清掉：busy 必须一起解锁，
        // 否则重新开局后没人再排 AI 出牌，牌桌会永远停在「XX 正在思考…」。
        S.busy = false;
        var hands = dealBalanced(buildDeck());
        var players = [];
        for (var s = 0; s < 4; s++) {
            var hand = hands[s];
            sortHand(hand);
            players.push({
                seat: s,
                name: s === 0 ? '你' : AI_NAMES[s],
                isHuman: s === 0,
                hand: hand,
                finished: false,
                rank: 0,
                score: 0,     // 出牌赋分累计（长牌 / 高级词 / 炸弹），结算据此评选 MVP
                lastPlay: null,
                plays: []
            });
        }

        S.game = {
            players: players,
            leader: 0,
            turn: 0,
            phase: 'lead',
            level: 0,
            bombLevel: 0,
            passCount: 0,
            roundPlays: [],
            lastPlayer: null,
            usedWords: Object.create(null),   // 本局打过的所有词（含炸弹）—— 同一个词不能出现第二次
            singleTop: '',                    // 本墩台面单牌的最大字母（单牌只能越出越大）
            order: [],
            logs: [],
            over: false,
            humanInitial: players[0].hand.slice(),
            humanWords: [],
            charmGaveUp: [],   // 打开炸弹锦囊却没拼出来就「放弃」的词（结算时单独复盘）
            aiBombs: [],
            roundNo: 1
        };
        S.selected = [];
        S.packs = [];
        S.packPick = null;
        S.reveal = null;
        S.jokerPick = null;
        S.charm = null;
        S.panicBubbles = Object.create(null);   // 「我就剩 N 张牌了」气泡的首次出声时间戳，每局清空
        charmCache.key = '';
        charmCache.list = null;
        S.hintWords = null;
        S.view = 'game';
        // 困难模式：由随机一位人机先手领出（不再总是玩家坐庄先出）。
        // 只在本局第一墩生效；后续牌权按规则自然流转。
        var firstLeader = 0;
        if (S.cfg.level === 'hard') firstLeader = 1 + Math.floor(Math.random() * 3);
        logLine('发牌完毕，每人 ' + HAND_SIZE + ' 张。');
        beginRound(firstLeader);
        announceSfx();   // 音效已就绪则闪 3 秒提示；未就绪则显示「正在加载音效包…」
        render();
        // 领出者是人机时要主动推动对局（beginRound 只摆状态，不排 AI 行动）
        if (S.game.turn !== 0) scheduleAi();
    }

    function beginRound(leader) {
        var g = S.game;
        g.leader = leader;
        g.level = 0;
        g.bombLevel = 0;
        g.passCount = 0;
        g.singleTop = '';
        g.roundPlays = [];
        g.lastPlayer = null;
        g.phase = 'lead';
        g.turn = leader;
        // 保留玩家已选好的牌与编组：对手出牌期间可以先备好牌，
        // 不能因为本墩收束、轮回到自己领出就把拼牌条清空（选牌只在真正出牌后清）。
        S.hintWords = null;
        logLine('—— 第 ' + g.roundNo + ' 墩：' + seatName(leader) + '先出 ——');
    }

    function seatName(s) {
        return s === 0 ? '你' : (SEAT_NAMES[s] + ' ' + AI_NAMES[s]);
    }

    function logLine(text) {
        if (!S.game) return;
        S.game.logs.push(text);   // 不再截断：结算/复盘时对局记录要能完整回看
    }

    /* ============================ 出牌校验 ============================ */

    // 每张牌对应的「王顶位」标注（真实字母为 ''），与 cards 同序
    function jokerLabels(cards) {
        return cards.map(function (c) {
            if (c.code === JOKER_C) return '大王';
            if (c.code === JOKER_V) return '小王';
            return '';
        });
    }

    /**
     * 含王的一手牌能否拼成 cand —— 王的「位置」不固定。
     * 规则：真实字母必须按「选牌顺序」在 cand 里依次出现（相对顺序不变），
     * 被跳过的位置由王补：大王补辅音、小王补元音。
     * 旧实现要求王必须正好坐在它替换的那个格子上（例如要把王排在第 5 位才能替掉 N），
     * 玩家习惯把王排在末尾，于是「用替代牌经常拼不出单词」——这是根因。
     */
    function jokerCanMatch(cand, codes) {
        var n = cand.length;
        var reals = [], jv = 0, jc = 0;
        for (var i = 0; i < n; i++) {
            var c = codes[i];
            if (c === JOKER_C) jc++;
            else if (c === JOKER_V) jv++;
            else reals.push(c);
        }
        // 为真实字母按序挑选落点；相邻落点之间的空隙交给王按类型补齐
        function walk(from, ri, vLeft, cLeft) {
            if (ri >= reals.length) {
                var needV = 0, needC = 0;
                for (var p = from; p < n; p++) {
                    if (isVowel(cand.charAt(p))) needV++; else needC++;
                }
                return needV <= vLeft && needC <= cLeft;
            }
            for (var p = from; p < n; p++) {
                if (cand.charAt(p) !== reals[ri]) continue;
                var skipV = 0, skipC = 0;
                for (var q = from; q < p; q++) {
                    if (isVowel(cand.charAt(q))) skipV++; else skipC++;
                }
                if (skipV > vLeft || skipC > cLeft) continue;
                if (walk(p + 1, ri + 1, vLeft - skipV, cLeft - skipC)) return true;
            }
            return false;
        }
        return walk(0, 0, jv, jc);
    }

    /**
     * 按「选牌顺序」解析单词：真实字母必须按选牌顺序出现（顺序即词形）。
     * 含王时，王的落点自由（由 jokerCanMatch 判定），列出**所有**匹配的词 ——
     * 同一个字母组合常能拼出好几个词，该由玩家自己挑（见 jokerChoices 的弹窗）；无王时最多一个。
     */
    function resolveOrderedAll(cards) {
        var codes = cards.map(function (c) { return c.code; });
        var n = codes.length;
        var hasJoker = false;
        for (var i = 0; i < n; i++) {
            if (codes[i] === JOKER_C || codes[i] === JOKER_V) { hasJoker = true; break; }
        }
        if (!hasJoker) {
            var w = codes.join('');
            return isWord(w) ? [w] : [];
        }
        var bucket = DATA.byLen && DATA.byLen[n];
        if (!bucket || !bucket.length) return [];
        var hc = handCounts(cards);
        var out = [];
        for (var b = 0; b < bucket.length; b++) {
            var cand = bucket[b];
            if (!canForm(cand, hc)) continue;
            if (jokerCanMatch(cand, codes)) out.push(cand);
        }
        return out;
    }

    // 取第一个匹配（非交互路径：AI、提示、预览都用它）
    function resolveOrdered(cards) {
        var list = resolveOrderedAll(cards);
        return list.length ? list[0] : null;
    }

    /* —— 单牌的大小：a < b < … < z（王与 z 同级）。
       单牌必须越出越大，出到 z 之后没人还能拿单牌跟 —— 只能靠炸弹夺回牌权。
       这条规则是为了让人有机会把「难组词的尾牌」甩出去。 —— */

    var SINGLE_TOP = 25;   // z 的位次；王也算在这里（不能越过封顶）

    function singleRank(code) {
        if (code === JOKER_C || code === JOKER_V) return SINGLE_TOP;
        return code.charCodeAt(0) - 97;   // a=0 … z=25
    }

    function singleTopText(code) {
        return code === JOKER_C ? '大王' : (code === JOKER_V ? '小王' : String(code).toUpperCase());
    }

    // 「本墩要跟什么」的提示语
    function needText() {
        var g = S.game;
        if (g.bombLevel === JOKER_BOMB) return '台面上是王炸，只有王炸能压';
        if (g.level <= 1) {
            return g.singleTop
                ? '单牌要比 ' + singleTopText(g.singleTop) + ' 更大'
                : '本墩是单牌局，只能跟单牌';
        }
        return '本墩要跟 ' + g.level + ' 个字母的单词';
    }

    // 空闲引导语：轮到玩家却没选牌时，先看他手里到底有没有能压台面的牌。
    // 台面已封顶（王炸 / 更大的单牌 / 更长的炸弹）时直接点明「没有更大的牌了」，
    // 免得玩家对着「只有王炸能压」这类干巴巴的门槛反复空选、找不到出路。
    function idleHintText(me, g) {
        var hand = me.hand || [];
        var bombMin = S.cfg.bombMin || 4;
        var jb = jokerBombOf(hand);

        if (g.bombLevel === JOKER_BOMB) {
            return jb ? '台面上是王炸，你目前只有王炸能压' : '台面上是王炸，手牌里没有更大的牌了';
        }
        if (g.bombLevel > 0) {
            var holdBomb = !!jb || findBombs(hand, bombMin, g.usedWords, g.bombLevel, null).length > 0;
            return holdBomb ? needText() + '，或点「不出」' : '手牌里没有更大的牌了';
        }
        if (g.level <= 1) {
            var topR = g.singleTop ? singleRank(g.singleTop) : -1;
            var up = false;
            for (var i = 0; i < hand.length; i++) {
                if (singleRank(hand[i].code) > topR) { up = true; break; }
            }
            if (!up && !jb && !findBombs(hand, bombMin, g.usedWords, 0, null).length) {
                return '手牌里没有更大的牌了';
            }
        }
        return needText() + '，或点「不出」';
    }

    // 出牌门槛：普通词必须同字数；炸弹能压任何普通牌，且炸弹之间「同长或更长」即可压；
    // 王炸（大王+小王）是唯一的例外：它能压任何牌，且只有另一副王炸能压它。
    function levelCheck(word, useBomb, opts) {
        var g = S.game;
        // 本局出过的词不能再用（不管当时是当普通词还是炸弹出的）
        if (g.usedWords[word]) return '「' + word.toUpperCase() + '」本局已经用过了';
        if (useBomb) {
            // 全场每日一次：同一个词当炸弹今天已经出过就不再可用（次日重置）
            if (isBombUsedToday(word)) return '「' + word.toUpperCase() + '」今天的炸弹已经用过了（次日重置）';
            if (g.bombLevel === JOKER_BOMB) return '台面上是王炸，词炸弹压不动，只能出王炸';
            if (g.bombLevel > 0 && word.length < g.bombLevel) {
                return '炸弹要同样长或更长才能压过（当前 ' + g.bombLevel + ' 字母炸弹）';
            }
        } else {
            if (g.bombLevel === JOKER_BOMB) return '台面上是王炸，只有王炸能压';
            if (g.bombLevel > 0) return '台面上有炸弹，只能用炸弹压';
            if (!opts.isLead && word.length !== g.level) return needText();
        }
        return null;
    }

    /**
     * 校验一次出牌。返回 { ok, err, len, word, isBomb, cards, ids, jokerFor }
     * cards 为牌对象数组；word 为解析出的单词（单牌为 null）。
     * opts.ordered = true 时按「选牌顺序」定词（玩家手动拼法），否则由牌面自动找词（提示通道）。
     * 是不是炸弹只看长度（≥ 炸弹门槛），不由玩家选 —— 同一手牌的每个拼法字数相同，
     * 所以「以炸弹出牌」这种开关本身就是多余的。
     */
    function validate(cards, opts) {
        opts = opts || {};
        var g = S.game;
        var n = cards.length;
        if (!n) return { ok: false, err: '至少选一张牌' };
        var bombMin = S.cfg.bombMin || 4;

        // 王炸：大王 + 小王 一起出。最高优先级 —— 领出、跟牌都能打，能压任何牌，
        // 台面已是王炸时也允许再出王炸（否则「只有王炸能压王炸」就无从实现）。
        if (isJokerBombCards(cards)) {
            return {
                ok: true, len: 2, word: null, isBomb: true, isJokerBomb: true,
                cards: cards, ids: cards.map(function (c) { return c.id; }),
                jokerFor: ['大王', '小王']
            };
        }

        // 单张：只能跟「台面就是单牌」的局面，或自己是领出者；跟单牌还必须比台面的大
        if (n === 1) {
            if (g.bombLevel > 0) return { ok: false, err: needText() };
            if (!opts.isLead && g.level !== 1) return { ok: false, err: needText() };
            if (!opts.isLead && g.singleTop && singleRank(cards[0].code) <= singleRank(g.singleTop)) {
                return { ok: false, err: '单牌要比 ' + singleTopText(g.singleTop) + ' 更大（或用炸弹夺回）' };
            }
            return { ok: true, len: 1, word: null, isBomb: false, cards: cards, ids: [cards[0].id], jokerFor: [''] };
        }

        // 手动拼法：顺序即词形。含王时玩家已在弹窗里选定（forceWord），直接用那个词。
        if (opts.ordered) {
            var found = opts.forceWord || resolveOrdered(cards);
            if (!found) return { ok: false, err: '按这个顺序拼不出单词' };
            var foundBomb = isBombWord(found, bombMin);
            var foundErr = levelCheck(found, foundBomb, opts);
            if (foundErr) return { ok: false, err: foundErr };
            return {
                ok: true, len: n, word: found, isBomb: foundBomb, cards: cards,
                ids: cards.map(function (c) { return c.id; }),
                jokerFor: jokerLabels(cards)
            };
        }

        var bucket = DATA.byLen && DATA.byLen[n];
        if (!bucket || !bucket.length) return { ok: false, err: '牌数没有对应的单词' };

        var hc = handCounts(cards);
        var normal = opts.forceWord || null;
        if (normal) {
            if (!canForm(normal, hc)) return { ok: false, err: '这几张牌拼不出单词' };
        } else {
            // 提示模式（ordered=false）也不再粗暴忽略顺序：若当前「选牌顺序」本身就能拼出词，
            // 先尊重玩家手动拼出的那个词（提示区的高亮/选项也是按这个顺序算的），
            // 只有顺序拼不出词时才回退到「按牌面自动找词」的智能托底。
            normal = resolveOrdered(cards);
        }
        if (!normal) {
            for (var j = 0; j < bucket.length; j++) {
                if (canForm(bucket[j], hc)) { normal = bucket[j]; break; }
            }
        }
        if (!normal) return { ok: false, err: '这几张牌拼不出单词' };

        var useBomb = isBombWord(normal, bombMin);
        var err = levelCheck(normal, useBomb, opts);
        if (err) return { ok: false, err: err };

        var picked = pickCards(cards, normal);
        return {
            ok: true, len: n, word: normal, isBomb: useBomb,
            cards: cards, ids: picked ? picked.ids : cards.map(function (c) { return c.id; }),
            jokerFor: picked ? picked.jokerFor : []
        };
    }

    /* ============================ 落子 ============================ */

    function applyPlay(seat, res) {
        var g = S.game;
        var p = g.players[seat];
        var ids = res.ids || [];
        var idSet = {};
        ids.forEach(function (id) { idSet[id] = 1; });

        // 从手牌里摘掉这几张（ids 可能少于 cards，去重后按 id 移除）
        var removed = [];
        var codeById = {};
        p.hand = p.hand.filter(function (c) {
            codeById[c.id] = c.code;
            if (idSet[c.id]) { removed.push(c); delete idSet[c.id]; return false; }
            return true;
        });

        // 牌河按**单词顺序**摊牌：ids 本身就是组词顺序（手牌是按字母排的，不能拿它当顺序）
        var codes = ids.map(function (id) { return codeById[id]; });
        if (codes.length !== removed.length) codes = removed.map(function (c) { return c.code; });

        var play = {
            seat: seat,
            word: res.word,
            isBomb: !!res.isBomb,
            isJokerBomb: !!res.isJokerBomb,   // 王炸不成词（word 为 null），渲染必须靠这个标记分岔
            len: res.len,
            count: removed.length,
            codes: codes,   // 牌河要照着这几张牌、按词的顺序画出来
            jokerFor: res.jokerFor || []
        };
        // 赋分：长牌 / 高级词 / 炸弹各有权重（见 playScore），累计到玩家总分，结算评选 MVP
        play.score = res.isJokerBomb ? JOKER_BOMB_SCORE : playScore(res.word, !!res.isBomb, res.len);
        p.score = (p.score || 0) + play.score;
        g.roundPlays.push(play);
        g.lastPlayer = seat;
        g.passCount = 0;   // 有人成功出牌，「连续不出」从头数
        p.lastPlay = play;
        p.plays.push(play);

        if (res.isJokerBomb) {
            // 王炸：不算词，所以不进 usedWords、也不受「每日一次」限制；
            // 但它把台面封到最高级，此后只有另一副王炸能压。
            g.bombLevel = JOKER_BOMB;
            if (seat !== 0) g.aiBombs.push('王炸');
            logLine(seatName(seat) + ' 打出王炸（大王+小王 · 最高优先级 · +' + play.score + ' 分）');
        } else if (res.isBomb) {
            g.usedWords[res.word] = 1;
            g.bombLevel = res.len;
            markBombUsedToday(res.word);   // 全场每日一次：记下这个词今天已经当过炸弹
            if (seat === 0) g.humanWords.push(res.word); else g.aiBombs.push(res.word);
            logLine(seatName(seat) + ' 打出炸弹 ' + res.word.toUpperCase() + '（' + res.len + ' 字母 · +' +
                play.score + ' 分）' + meaningSuffix(res.word));
        } else {
            // 单牌也要记门槛（=1）：这样「单牌只能跟单牌」才立得住
            g.level = Math.max(g.level, res.len);
            if (res.len > 1) {
                g.usedWords[res.word] = 1;
                if (seat === 0) g.humanWords.push(res.word);
                logLine(seatName(seat) + ' 出 ' + res.word.toUpperCase() + '（' + res.len + ' 字母 · +' +
                    play.score + ' 分）' + meaningSuffix(res.word));
            } else {
                // 单牌只能越出越大：记下本墩最高的一张，别人要么出更大的、要么用炸弹
                if (!g.singleTop || singleRank(codes[0]) > singleRank(g.singleTop)) g.singleTop = codes[0];
                logLine(seatName(seat) + ' 出单牌 ' + displayCode(removed[0]));
            }
        }

        // 音效：炸弹有独立的爆响，普通出牌（含单牌）是纸牌落桌的一声
        sfx(res.isBomb ? 'bomb' : 'play');

        if (p.hand.length === 0) {
            p.finished = true;
            g.order.push(seat);
            p.rank = g.order.length;
            logLine('🏆 ' + seatName(seat) + ' 出完手牌，第 ' + p.rank + ' 名');
        }
    }

    function displayCode(card) {
        if (!card) return '?';
        if (card.code === JOKER_C) return '大王';
        if (card.code === JOKER_V) return '小王';
        return card.code.toUpperCase();
    }

    // 一位玩家出牌后：终局判定 → 推进应答序。炸弹先亮出来停顿 3 秒，让大家看清发生了什么
    // （否则本墩随后就被「三家全过」收掉，牌河一清，根本不知道刚才被什么压了）。
    function afterPlay(seat) {
        var g = S.game;
        if (g.over) return;
        var last = g.roundPlays[g.roundPlays.length - 1];
        if (last && last.isBomb) {
            S.reveal = last;
            render();
            later(function () {
                S.reveal = null;
                proceedAfterPlay(seat);
            }, BOMB_HOLD_MS);
            return;
        }
        proceedAfterPlay(seat);
    }

    function proceedAfterPlay(seat) {
        var g = S.game;
        if (g.over) return;
        if (g.players[0].finished) { settle(); return; }   // 你先出完：快进到结算
        if (g.order.length >= 3) { settle(); return; }      // 只剩一人：直接收场
        advance();
    }

    // 绕圈找下一个还没出完的座位（不含自己）
    function nextActiveSeat(from) {
        for (var i = 1; i <= 4; i++) {
            var s = (from + i) % 4;
            if (!S.game.players[s].finished) return s;
        }
        return from;
    }

    // 本墩还该有几个人应答：除「最后成功出牌者」之外的活跃玩家
    function countResponders() {
        var g = S.game;
        var n = 0;
        for (var i = 0; i < 4; i++) {
            if (g.players[i].finished) continue;
            if (i === g.lastPlayer) continue;
            n++;
        }
        return n;
    }

    /**
     * 推进到下一个应答者。
     * 本墩按「连续不出」收束：只有「最后出牌者以外的活跃玩家全都过了」本墩才结束，
     * 期间任何一次成功出牌都把计数清零 —— 所以只要还有人跟得上，就能一圈圈循环跟下去；
     * 三家全过时才把牌权交给最后出牌的那个人，由他领出下一墩。
     */
    function advance() {
        var g = S.game;
        if (g.over) return;
        if (g.passCount >= countResponders()) { endRound(); return; }
        g.turn = nextActiveSeat(g.turn);
        g.phase = 'follow';
        // 台面换了，提示要重算；但**保留玩家的选牌与编组** —— 对手思考时可以先备好牌，
        // 不能因为对手出了一手就把你正在拼的牌清空。
        S.hintWords = null;
        render();
        if (g.turn !== 0) scheduleAi();
    }

    function endRound() {
        var g = S.game;
        g.roundNo++;
        // 最后成功出牌的人拿到下一墩的出牌权；全过则领出者留权
        var next = (g.lastPlayer !== null) ? g.lastPlayer : g.leader;
        if (g.players[next].finished) next = firstActiveSeat(next);
        // 音效：牌权易主（本墩收给了另一个人）单独给一声提示
        if (next !== g.leader) sfx('lead');
        beginRound(next);
        render();
        if (g.turn !== 0) scheduleAi();
    }

    function firstActiveSeat(from) {
        for (var i = 0; i < 4; i++) {
            var s = (from + i) % 4;
            if (!S.game.players[s].finished) return s;
        }
        return from;
    }

    /* ============================ 人类操作 ============================ */

    // 已选的牌，**保持选择顺序**（顺序即组词顺序）
    function selectedCards() {
        var hand = S.game.players[0].hand;
        var byId = {};
        hand.forEach(function (c) { byId[c.id] = c; });
        return S.selected.map(function (id) { return byId[id]; }).filter(Boolean);
    }

    // 玩家这次拼牌是否按「手动顺序」定词：开提示时为自动找词
    function isOrdered() { return !S.cfg.hints; }

    function humanPlay() {
        var g = S.game;
        if (!g || g.over || g.turn !== 0 || frozen()) return;
        var cards = selectedCards();
        if (!cards.length) return;
        // 大王 + 小王 一起出 = 王炸：最高优先级的炸弹，不走下面「含王找词」的弹窗
        if (isJokerBombCards(cards)) {
            var jres = validate(cards, { isLead: g.phase === 'lead' });
            if (!jres.ok) { toast(jres.err, 'info'); return; }
            applyPlay(0, jres);
            S.selected = [];
            S.hintWords = null;
            render();
            afterPlay(0);
            return;
        }
        // 选牌里有王：同一个字母组合往往能拼出好几个词，弹窗让玩家自己挑（并标出哪个是炸弹）。
        // 单张不走这里 —— 单牌本来就不成词，直接按单牌规则出。
        if (cards.length > 1 && cards.some(isJokerCard)) {
            var cands = jokerChoices(cards, 'play');
            if (!cands.length) { toast('这几张牌拼不出单词', 'info'); return; }
            if (cands.length > 1) {
                S.jokerPick = { cards: cards, cands: cands, mode: 'play' };
                render();
                return;
            }
        }
        var res = validate(cards, { isLead: g.phase === 'lead', ordered: isOrdered() });
        if (!res.ok) { toast(res.err, 'info'); return; }
        applyPlay(0, res);
        S.selected = [];
        S.hintWords = null;
        render();
        afterPlay(0);
    }

    // 弹窗里选定了某个词：play 直接出牌，pack 则编组
    function chooseJokerWord(i) {
        var jp = S.jokerPick;
        if (!jp || !jp.cands[i]) return;
        var c = jp.cands[i];
        S.jokerPick = null;
        if (c.err) { toast(c.err, 'info'); render(); return; }
        if (jp.mode === 'pack') { doPack(jp.cards, c.word); return; }
        var g = S.game;
        var res = validate(jp.cards, { isLead: g.phase === 'lead', ordered: isOrdered(), forceWord: c.word });
        if (!res.ok) { toast(res.err, 'info'); render(); return; }
        applyPlay(0, res);
        S.selected = [];
        S.hintWords = null;
        render();
        afterPlay(0);
    }

    function humanPass() {
        var g = S.game;
        if (!g || g.over || g.turn !== 0 || g.phase === 'lead' || frozen()) return;
        g.passCount++;
        logLine('你 不出');
        sfx('pass');
        render();
        advance();
    }

    function toast(msg, type) {
        var app = window.app;
        if (app && typeof app.showToast === 'function') app.showToast(msg, type || 'info');
    }

    /* ============================ AI ============================ */

    // 「思考时长」区间（毫秒）：难度越高想得越久，像真人一样掂量
    var AI_PACE = {
        easy: [1500, 2200],
        normal: [1650, 2600],
        hard: [1800, 3000]
    };

    // 出牌越大 / 动炸弹，额外多想一会儿
    function aiDelayMs(decision) {
        var r = AI_PACE[S.cfg.level] || AI_PACE.normal;
        var ms = r[0] + Math.random() * (r[1] - r[0]);
        if (decision) {
            ms += Math.min((decision.cards || []).length, 8) * 90;
            if (decision.asBomb) ms += 450;
        }
        return Math.round(ms);
    }

    function scheduleAi() {
        if (S.busy) return;
        var g = S.game;
        if (!g || g.over || g.turn === 0) return;
        S.busy = true;
        var seat = g.turn;
        var lv = LEVELS[S.cfg.level] || LEVELS.normal;
        // 先决策、后计时：这样「牌越大想越久」才有的放矢；
        // 等待期间轮到谁出是锁死的（人类输入被 turn!==0 挡住），状态不会变。
        var decision = decide(g.players[seat], lv, g);
        later(function () {
            S.busy = false;
            aiTurn(seat, decision);
        }, aiDelayMs(decision));
    }

    function aiTurn(seat, decision) {
        var g = S.game;
        if (!g || g.over || g.turn !== seat) return;

        if (decision.action === 'pass') {
            g.passCount++;
            logLine(seatName(seat) + ' 不出');
            sfx('pass');
            render();
            advance();
            return;
        }
        // forceWord：按 AI 选定的词出牌。validate 的默认通道是「在这几张牌能拼的词里取第一个」，
        // 那可能解析成另一个词（甚至不是炸弹）—— AI 明明选好了炸弹/某长度的词，却可能被换掉或直接作废。
        var res = validate(decision.cards, { isLead: g.phase === 'lead', forceWord: decision.word || null });
        if (!res.ok) {
            // 兜底：AI 算错就退回「过」，绝不把对局卡住
            g.passCount++;
            logLine(seatName(seat) + ' 不出');
            sfx('pass');
            render();
            advance();
            return;
        }
        applyPlay(seat, res);
        render();
        afterPlay(seat);
    }

    function decide(p, lv, g) {
        var hand = p.hand;
        var isLead = g.phase === 'lead';

        if (isLead) {
            return decideLead(p, lv, g);
        }
        return decideFollow(p, lv, g);
    }

    // 领出的目标字数：按难度权重在 1..maxNormal 里随机挑（见 LEAD_LEN_WEIGHTS）
    function pickLeadLength(maxNormal) {
        var weights = LEAD_LEN_WEIGHTS[S.cfg.level] || LEAD_LEN_WEIGHTS.normal;
        var upto = [];
        var total = 0;
        for (var L = 1; L <= maxNormal; L++) {
            // 权重表里没列出的长度（炸弹门槛放宽时会出现）给一个递减的默认值
            var v = weights[L];
            if (v == null) v = L <= 2 ? 1 : 0.7 / (L - 1);
            total += v;
            upto.push({ len: L, acc: total });
        }
        if (!total) return 2;
        var r = Math.random() * total;
        for (var i = 0; i < upto.length; i++) {
            if (r < upto[i].acc) return upto[i].len;
        }
        return upto[upto.length - 1].len;
    }

    function decideLead(p, lv, g) {
        var hand = p.hand;
        var known = DATA.known[S.cfg.level];
        var bombMin = S.cfg.bombMin || 4;
        // 普通领出的字数上限：难度越高越能领长词。关键是「只出不是炸弹的词」——
        // 词书外的长词只是普通牌，出了不亏，也让人机不至于永远只会出 2~3 字
        //（旧版固定取最长、上限又被门槛截到 3，于是几乎总是 3 字）。
        var cap = Math.min(MAX_WORD_LEN, Math.max(lv.maxLead, bombMin));
        var target = pickLeadLength(cap);

        // 炸弹规划：手里正好有一颗能一次出完的炸弹 → 直接领出去收官（顺便拿「炸弹收官」奖励）
        var plan = aiBombPlan(p, g, lv, 0);
        if (plan.finish) {
            return { action: 'play', cards: makeCards(hand, plan.finish), asBomb: true, word: plan.finish };
        }

        // 恐慌：有人快出完了，甩一颗**最长**的炸弹封台 —— 逼别人拿更长的炸弹来跟，
        // 手牌少的那位基本跟不动，牌权就留在自己手里。
        // 但只能花「非储备」的那几颗（plan.spend），压箱底的雷要留到结尾翻盘。
        if (hasPanicField(g, p.seat) && plan.spend.length && Math.random() < 0.45) {
            var seal = plan.spend.slice().sort(function (a, b) { return b.length - a.length; });
            return { action: 'play', cards: makeCards(hand, seal[0]), asBomb: true, word: seal[0] };
        }

        // 目标 1 字：甩一张废牌（单牌只能越出越大）
        if (target === 1) {
            var junk = worstSingle(hand);
            if (junk) return { action: 'play', cards: [junk], asBomb: false };
        }

        var words = normalLeads(hand, target, target, known, g, bombMin);
        if (!words.length) words = normalLeads(hand, 2, cap, known, g, bombMin);

        if (!words.length) {
            // 没有普通词可领：花掉一颗非储备炸弹（挑**最短**的，省长牌留着封台）
            if (plan.spend.length) {
                return { action: 'play', cards: makeCards(hand, plan.spend[0]), asBomb: true, word: plan.spend[0] };
            }
            var s = worstSingle(hand);
            return { action: 'play', cards: s ? [s] : [], asBomb: false };
        }

        // 挑词时一并护住手里的炸弹材料（见 chooseKeepBest）：领出也不该随手拆掉炸弹
        var pick = chooseKeepBest(hand, words, g, lv) || words[0];
        return { action: 'play', cards: makeCards(hand, pick), asBomb: false, word: pick };
    }

    // 可领出的普通词：字数在 [minLen, maxLen]、非炸弹（词书外的长词只是普通牌）、本局没用过
    function normalLeads(hand, minLen, maxLen, known, g, bombMin) {
        return findAll(hand, minLen, maxLen, known).filter(function (w) {
            return !isBombWord(w, bombMin) && !g.usedWords[w];
        });
    }

    // AI 的炸弹规划：炸弹是留给收官的「底牌」，甩出去能夺权，但一把甩光结尾就只剩普通牌。
    // 先算清三件事 —— 手里有几颗炸弹、哪颗能一次出完剩余手牌、此刻允许花掉几颗。
    // 出现「一把出完」的炸弹，或自己已进入收官阶段（手牌很少）时，预留数直接归零：
    // 先把胜利和「炸弹收官」的额外分拿到手，其余情况按难度留 1~2 手（见 LEVELS.bombKeep）。
    function aiBombPlan(p, g, lv, minLen) {
        var known = DATA.known[S.cfg.level];
        var bombs = findBombs(p.hand, S.cfg.bombMin || 4, g.usedWords, minLen || 0, known);
        bombs.sort(function (a, b) { return a.length - b.length; });

        var finish = null;
        for (var i = 0; i < bombs.length; i++) {
            var picked = pickCards(p.hand, bombs[i]);
            if (picked && picked.ids.length === p.hand.length) { finish = bombs[i]; break; }
        }

        var keep = 0;
        if (!finish && p.hand.length > BOMB_ENDGAME_HAND) {
            keep = Math.max(0, (lv && lv.bombKeep) || 0);
            // 只够留几颗 / 只有一颗时不留：否则人机会攥着炸弹一路过牌，把牌权全送出去
            if (keep >= bombs.length) keep = Math.max(0, bombs.length - 1);
        }

        return {
            finish: finish,                              // 能一次出完手牌的炸弹：有就立刻甩
            spend: bombs.slice(0, Math.max(0, bombs.length - keep))  // 此刻允许花掉的炸弹（留最长的压箱底）
        };
    }

    // 手上的炸弹材料：返回「牌 id → 该炸弹的分值」。
    // 挑普通词时用它避开这些牌，免得人机为了跟一手小牌，把攒好的炸弹拆了。
    function bombReserve(hand, g) {
        var reserve = {};
        var known = DATA.known[S.cfg.level];
        var bombs = findBombs(hand, S.cfg.bombMin || 4, g.usedWords, 0, known);
        bombs.forEach(function (w) {
            var picked = pickCards(hand, w);
            if (!picked) return;
            var val = playScore(w, true, w.length);
            picked.ids.forEach(function (id) {
                if (!reserve[id] || reserve[id] < val) reserve[id] = val;
            });
        });
        return reserve;
    }

    // 出这个单词会拆掉多少「炸弹材料」（按被占用的牌的炸弹分值累加）
    function wordBreakCost(hand, word, reserve) {
        var picked = pickCards(hand, word);
        if (!picked) return 0;
        var cost = 0;
        picked.ids.forEach(function (id) { if (reserve[id]) cost += reserve[id]; });
        return cost;
    }

    // 从候选词里挑一手：优先「出牌有价值」（长牌 / 高级词，见 playScore），
    // 同时重罚拆炸弹的选法 —— 等价于让人机学会保住手里的炸弹。
    function chooseKeepBest(hand, words, g, lv, reserve) {
        if (!reserve) reserve = bombReserve(hand, g);
        var best = null, bestVal = -Infinity;
        for (var i = 0; i < words.length; i++) {
            var w = words[i];
            var val = playScore(w, false, w.length) - wordBreakCost(hand, w, reserve);
            if (lv && lv.blunder > 0 && Math.random() < lv.blunder) val += Math.random() * 3; // 菜档看走眼
            if (val > bestVal) { bestVal = val; best = w; }
        }
        return best;
    }

    function decideFollow(p, lv, g) {
        var hand = p.hand;
        var known = DATA.known[S.cfg.level];
        var bombOnTable = g.bombLevel > 0;
        var jokerBomb = jokerBombOf(hand);
        // 恐慌：有人快出完了，不能再让他轻松拿到牌权 —— 提高出炸弹的意愿
        var panic = hasPanicField(g, p.seat);
        var bombChance = Math.min(1, (lv.bombChance || 0) + (panic ? 0.65 : 0));

        // 台面上是王炸：只有王炸能压，别的什么都不行
        if (g.bombLevel === JOKER_BOMB) {
            return jokerBomb
                ? { action: 'play', cards: jokerBomb.cards, asBomb: true, isJokerBomb: true }
                : { action: 'pass' };
        }

        // 台面是单牌时能跟，但只能跟**更大**的单牌（王与 z 同级，出到 z 就封顶了）
        var canSingle = !bombOnTable && g.level <= 1;
        var single = canSingle
            ? singleAbove(hand, g.singleTop ? singleRank(g.singleTop) : -1)
            : null;

        // 台面是 N 字母普通词：只能跟同样字数的词（不能拿更长的去压，那是炸弹的活）
        var words = [];
        if (!bombOnTable && g.level >= 2) words = freshWords(findAll(hand, g.level, g.level, known));

        // 炸弹规划：能一次出完手牌的那颗优先甩（直接收官 + 拿「炸弹收官」奖励）；
        // 其余情况按难度留 1~2 手到结尾，只有 plan.spend 里的炸弹才允许中途花掉。
        var plan = aiBombPlan(p, g, lv, g.bombLevel);
        if (plan.finish && plan.finish.length >= g.bombLevel) {
            return { action: 'play', cards: makeCards(hand, plan.finish), asBomb: true, word: plan.finish };
        }

        // 挑普通牌时先算好手里的炸弹材料：跟一手小牌若会拆掉炸弹，就得掂量值不值
        var reserve = bombReserve(hand, g);
        var chosen = words.length ? chooseKeepBest(hand, words, g, lv, reserve) : null;
        var breakCost = (chosen && words.length) ? wordBreakCost(hand, chosen, reserve) : 0;

        // 恐慌：不惜动用炸弹抢回牌权，把出牌权从快出完的人手里夺过来。
        // 只从 plan.spend 里挑 —— 压箱底的那几手留给结尾翻盘。
        if (panic && !bombOnTable && plan.spend.length && Math.random() < bombChance) {
            var seize = plan.spend.slice().sort(function (a, b) { return b.length - a.length; });
            return { action: 'play', cards: makeCards(hand, seize[0]), asBomb: true, word: seize[0] };
        }

        // 跟这手普通牌会拆掉手里的炸弹，而台面只是一手小牌（≤3 字母）：保守起见宁可不跟，
        // 把炸弹留着，也别拿一颗更长的炸弹去压小牌（牛刀杀鸡）。恐慌时不缩手。
        if (!panic && chosen && breakCost > 0 && !bombOnTable && g.level <= 3 && Math.random() < 0.6) {
            return { action: 'pass' };
        }

        var canPlay = !!(words.length || single);

        // 能跟却选择过（失误 / 保守）
        if (canPlay && Math.random() < lv.passChance) return { action: 'pass' };

        if (single) return { action: 'play', cards: [single], asBomb: false };
        if (chosen) return { action: 'play', cards: makeCards(hand, chosen), asBomb: false, word: chosen };

        // 只能靠炸弹：挑**刚好够用**的那颗（最省），把更长的炸弹留给以后。
        // plan.spend 已按「难度预留 1~2 手 / 收官阶段全放行」算好，这里不再看全部炸弹。
        if (plan.spend.length && Math.random() < bombChance) {
            var b = plan.spend[0];
            return { action: 'play', cards: makeCards(hand, b), asBomb: true, word: b };
        }
        // 词炸弹也压不动、手里又没别的牌：平时宁可过牌把王炸留着，
        // 只有「有人快出完了」时才动用王炸夺权 —— 免得为了压一张单牌就烧掉最高优先级。
        if (jokerBomb && panic) {
            return { action: 'play', cards: jokerBomb.cards, asBomb: true, isJokerBomb: true };
        }
        return { action: 'pass' };
    }

    function makeCards(hand, word) {
        var picked = pickCards(hand, word);
        if (!picked) return [];
        var byId = {};
        hand.forEach(function (c) { byId[c.id] = c; });
        return picked.ids.map(function (id) { return byId[id]; }).filter(Boolean);
    }

    // 甩废牌用：优先甩掉没有王、且元音/常见字母之外的散牌
    function worstSingle(hand) {
        if (!hand.length) return null;
        var cands = hand.filter(function (c) { return c.code !== JOKER_C && c.code !== JOKER_V; });
        if (!cands.length) return hand[0];
        var freq = 'etaoinshrdlucmfwypvbgkjqxz';
        cands.sort(function (a, b) {
            return freq.indexOf(b.code) - freq.indexOf(a.code); // 越罕见越先甩
        });
        return cands[0];
    }

    // 跟单牌用：挑一张**比台面单牌更大**的牌，同样优先甩最没用的那张；没有则 null
    function singleAbove(hand, topRank) {
        var ok = hand.filter(function (c) { return singleRank(c.code) > topRank; });
        if (!ok.length) return null;
        var plain = ok.filter(function (c) { return c.code !== JOKER_C && c.code !== JOKER_V; });
        var cands = plain.length ? plain : ok;
        var freq = 'etaoinshrdlucmfwypvbgkjqxz';
        cands.sort(function (a, b) {
            return freq.indexOf(b.code) - freq.indexOf(a.code);
        });
        return cands[0];
    }

    /* ============================ 结算与复盘 ============================ */

    function computeMissed() {
        var g = S.game;
        if (!DATA.byLen) return [];
        var hand = g.humanInitial;
        // 复盘用「最广的一档」当门槛，避免漏词列表全是生僻词
        var known = DATA.known && DATA.known.hard;
        var played = Object.create(null);
        g.humanWords.forEach(function (w) { played[w] = 1; });
        var hc = handCounts(hand);
        var out = [];
        for (var L = 5; L <= MAX_WORD_LEN; L++) {
            var bucket = DATA.byLen[L];
            if (!bucket) continue;
            for (var i = 0; i < bucket.length; i++) {
                var w = bucket[i];
                if (played[w]) continue;
                if (!canForm(w, hc)) continue;
                var bomb = isBombWord(w, S.cfg.bombMin);
                if (!bomb && !(known && known[w])) continue; // 只报「档位内」的漏词，避免全是生僻词
                if (bomb && isBombUsedToday(w)) continue;     // 今日已当炸弹出过的词，再推荐也无法出
                out.push({ word: w, bomb: bomb });
            }
        }
        out.sort(function (a, b) {
            if (a.bomb !== b.bomb) return a.bomb ? -1 : 1;
            return b.word.length - a.word.length;
        });
        return out.slice(0, 8);
    }

    function rankAll() {
        var g = S.game;
        // 谁先打完谁赢：手牌已空（=出完）的一律按 g.order 记录的真实先后排在最前，
        // 账目漏记「已出完」的也兜底认作出完 —— 绝不会出现「出完了却排在还有牌的人后面」。
        var done = g.players.filter(function (p) { return p.finished || p.hand.length === 0; });
        var head = [];
        g.order.forEach(function (s) {
            var p = g.players[s];
            if (p && done.indexOf(p) >= 0 && head.indexOf(p) < 0) head.push(p);
        });
        done.forEach(function (p) { if (head.indexOf(p) < 0) head.push(p); });
        var rest = g.players.filter(function (p) { return done.indexOf(p) < 0; });
        rest.sort(function (a, b) { return a.hand.length - b.hand.length; });
        var ordered = head.concat(rest);
        ordered.forEach(function (p, i) { p.rank = i + 1; });
        return ordered;
    }

    // 本局 MVP：出牌赋分最高者（同分时名次靠前者优先）。赋分与胜负分开，鼓励出长难词与炸弹。
    function mvpOf(players) {
        var best = null;
        players.forEach(function (p) {
            if (!best) { best = p; return; }
            var ps = p.score || 0, bs = best.score || 0;
            if (ps > bs || (ps === bs && p.rank < best.rank)) best = p;
        });
        return best;
    }

    function settle() {
        var g = S.game;
        if (g.over) return;
        g.over = true;
        clearTimers();
        S.charm = null;   // 牌局可能是在锦囊拼写途中结束的，收尾时一并关掉浮层
        // 收尾奖励：不管是不是赢家，只要「最后出的一手」是炸弹，就额外加「炸弹字母数」的分；
        // 最后出的是王炸则固定 +10（它不成词、没有字母数可算）。
        g.players.forEach(function (p) {
            var lp = p.lastPlay;
            if (!lp || !lp.isBomb) return;
            var bonus = lp.isJokerBomb ? JOKER_BOMB_FINISH : lp.len;
            p.score = (p.score || 0) + bonus;
            logLine('💥 ' + seatName(p.seat) + ' 以' + (lp.isJokerBomb ? '王炸' : '炸弹') +
                '收官，额外 +' + bonus + ' 分');
        });
        g.finalRanks = rankAll();
        g.mvp = mvpOf(g.players);
        g.missed = computeMissed();
        logLine('—— 本局结束 ——');
        // 音效：你先出完算胜，否则按失败收尾（血战到底，只论头名）
        sfx(g.players[0].rank === 1 ? 'win' : 'lose');
        S.view = 'result';
        render();
    }

    /* ============================ 配置读写 ============================ */

    function loadCfg() {
        var cfg = null;
        try {
            var S_ = window.Storage;
            if (S_ && S_.loadSection) {
                var ws = S_.loadSection('aiWorkspace') || {};
                if (ws.englishPoker) cfg = ws.englishPoker;
            }
        } catch (e) { /* 落到 localStorage */ }
        if (!cfg) {
            try { cfg = JSON.parse(localStorage.getItem('epConfig') || 'null'); } catch (e) { cfg = null; }
        }
        var out = {};
        for (var k in DEFAULT_CFG) out[k] = DEFAULT_CFG[k];
        if (cfg) {
            if (Array.isArray(cfg.bookIds)) out.bookIds = cfg.bookIds.map(String);
            if (LEVELS[cfg.level]) out.level = cfg.level;
            if (cfg.bombMin === 4 || cfg.bombMin === 5 || cfg.bombMin === 6) out.bombMin = cfg.bombMin;
            out.hints = !!cfg.hints;
            // 音效开关只由牌桌自己的音量按钮控制，不再跟随「主设置 · 音效提示」
            out.sound = cfg.sound !== false;
        }
        return out;
    }

    function saveCfg(cfg) {
        S.cfg = cfg;
        var done = false;
        try {
            var S_ = window.Storage;
            if (S_ && S_.saveSection) done = !!S_.saveSection('aiWorkspace', { englishPoker: cfg });
        } catch (e) { done = false; }
        if (!done) {
            try { localStorage.setItem('epConfig', JSON.stringify(cfg)); } catch (e) { /* ignore */ }
        }
    }

    /* ============================ 渲染 ============================ */

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function cardHTML(card, opts) {
        opts = opts || {};
        var code = card.code;
        var cls = 'ep-card';
        if (code === JOKER_C) cls += ' ep-card-joker-c';
        else if (code === JOKER_V) cls += ' ep-card-joker-v';
        else if (isVowel(code)) cls += ' ep-card-vowel';
        if (opts.small) cls += ' ep-card-sm';
        if (opts.sel) cls += ' ep-card-sel';
        if (opts.cls) cls += ' ' + opts.cls;
        var label = code === JOKER_C ? '大' : (code === JOKER_V ? '小' : code.toUpperCase());
        // 字母牌：大写 + 下方一行不起眼的小写（认牌顺手）；王没有小写，改标它的「万能范围」。
        // 小牌只在「打到牌桌上」（opts.table）时与手牌一致 —— 竖排 辅/元 音 + 花牌图标；
        // 拼牌条、编组等词面小牌则保持横排、不摆花牌图标，免得挤在一起。
        var isJoker = (code === JOKER_C || code === JOKER_V);
        var decked = !opts.small || !!opts.table;
        var sub = code === JOKER_C ? (decked ? '辅\n音' : '辅音')
            : (code === JOKER_V ? (decked ? '元\n音' : '元音') : code);
        var subCls = 'ep-card-sub' + ((isJoker && decked) ? ' ep-card-sub-v' : '');
        var attrs = opts.attrs || '';
        return '<div class="' + cls + '" ' + attrs + '>' +
            '<span class="ep-card-letter">' + label + '</span>' +
            '<span class="' + subCls + '">' + sub + '</span>' +
            (decked ? '<i class="fi-rr-playing-cards ep-card-suit" aria-hidden="true"></i>' : '') +
            '</div>';
    }

    // 一次出牌渲染成牌面：照着实际打出的那几张牌画（单牌也画成牌，不写「单牌」两个字）
    function playHTML(play) {
        if (!play) return '<span class="ep-none">—</span>';
        var codes = (play.codes && play.codes.length) ? play.codes
            : (play.word ? play.word.split('') : []);
        if (!codes.length) return '<span class="ep-none">—</span>';
        var tiles = '<span class="ep-word-tiles">' + codes.map(function (c) {
            return cardHTML({ code: c }, { small: true, table: true });
        }).join('') + '</span>';
        if (play.isJokerBomb) {
            return '<span class="ep-word ep-word-bomb ep-word-jokerbomb">' + tiles +
                '<span class="ep-bomb-lv"><i class="fi-sr-bolt"></i>王炸</span></span>';
        }
        if (play.isBomb) {
            return '<span class="ep-word ep-word-bomb">' + tiles +
                '<span class="ep-bomb-lv"><i class="fi-sr-bolt"></i>' + play.len + '</span></span>';
        }
        return '<span class="ep-word">' + tiles + '</span>';
    }

    // 桌面上的一个座位卡：圆形形象 + 名字 + 手牌数/状态（英语麻将的席位卡语言）
    function seatPanelHTML(p, g) {
        var cls = 'ep-seat';
        if (g.turn === p.seat && !g.over) cls += ' ep-seat-active';
        if (p.finished) cls += ' ep-seat-done';
        var state = p.finished ? ('第 ' + p.rank + ' 名')
            : (g.turn === p.seat ? (g.phase === 'lead' ? '领出' : '跟牌') : '等待');
        var initial = String(p.name).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '').charAt(0) || '?';
        // 手牌不多时冒个气泡「喊一嗓子」——既是心理战，也让快出完的人一眼可见。
        // 每位玩家只在**首次**降到阈值以下时喊一次，5 秒后自行淡出（见 panicBubbleHTML）。
        var bubble = panicBubbleHTML(p, g);
        return '<div class="' + cls + '">' + bubble +
            '<div class="ep-avatar"><span>' + esc(initial) + '</span></div>' +
            '<div class="ep-seat-name">' + esc(p.name) + '</div>' +
            '<div class="ep-seat-meta"><span class="ep-seat-count">' + p.hand.length + ' 张</span>' +
            '<span class="ep-seat-state">' + state + '</span></div>' +
            '</div>';
    }

    // 「我就剩 N 张牌了」气泡：首次满足条件时记下时间戳，之后交给 CSS 动画自行淡出。
    // 用 animation-delay 的负值把动画快进到当前进度，故中途重渲染也不会让气泡「重新计时」。
    function panicBubbleHTML(p, g) {
        if (p.finished || g.over || p.hand.length > PANIC_BUBBLE_HAND) return '';
        if (!S.panicBubbles) S.panicBubbles = Object.create(null);
        var shown = S.panicBubbles[p.seat];
        var now = Date.now();
        if (!shown) shown = S.panicBubbles[p.seat] = now;
        var elapsed = now - shown;
        if (elapsed >= PANIC_BUBBLE_MS) return '';
        return '<div class="ep-seat-bubble ep-seat-bubble-once" style="animation-delay:-' +
            Math.round(elapsed) + 'ms">我就剩 ' + p.hand.length + ' 张牌了</div>';
    }

    // 桌面上的四家出牌区是各自绝对的固定占位，牌多时允许互相叠在一起。
    // 叠住时把压在**下面**（z 更低）的一方暗淡化，一眼看出上面还盖着一张。
    function markOverlaps() {
        var root = document.getElementById('epBody');
        if (!root || !root.querySelectorAll) return;
        var zones = root.querySelectorAll('[data-ep-zone]');
        if (!zones || !zones.length) return;
        var list = [];
        for (var i = 0; i < zones.length; i++) {
            var el = zones[i];
            if (!el.getBoundingClientRect || !el.classList) continue;
            el.classList.remove('ep-rz-under');
            var r = el.getBoundingClientRect();
            if (r && r.width && r.height) list.push({ el: el, r: r });
        }
        for (var a = 0; a < list.length; a++) {
            for (var b = a + 1; b < list.length; b++) {
                var A = list[a], B = list[b];
                var ox = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
                var oy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
                if (ox <= 2 || oy <= 2) continue;   // 没真叠上
                var za = parseInt(A.el.style.zIndex, 10) || 0;
                var zb = parseInt(B.el.style.zIndex, 10) || 0;
                if (za <= zb) A.el.classList.add('ep-rz-under');
                else B.el.classList.add('ep-rz-under');
            }
        }
    }

    function render() {
        var root = document.getElementById('epBody');
        if (!root || !S.cfg) return;
        if (S.view === 'config') { root.innerHTML = renderConfig(); autoLoadSfx(); return; }
        if (S.view === 'result') { root.innerHTML = renderResult(); return; }
        // 对局记录按「最新在底部」排列，重绘前先记住滚动位置：
        // 贴底时重绘后继续贴底（跟随最新一条），用户往回翻看历史时则保持原位不被拽回
        var prevLog = root.querySelector('.ep-log');
        var stickBottom = prevLog ? (prevLog.scrollTop + prevLog.clientHeight >= prevLog.scrollHeight - 8) : true;
        var prevTop = prevLog ? prevLog.scrollTop : 0;
        root.innerHTML = renderGame();
        markOverlaps();
        paintSfxStatus();   // 音效状态提示（音量按钮左侧）
        var newLog = root.querySelector('.ep-log');
        if (newLog) newLog.scrollTop = stickBottom ? newLog.scrollHeight : prevTop;
        // 锦囊拼写题打开时，重画后把焦点还回输入框（避免误丢输入）
        if (S.charm && S.charm.phase === 'quiz') focusCharmInput();
    }

    // 词书图标：与主应用的 bookIconHtml 同款 —— 极简图标（fi-rr/sr/br/tr）输出 <i>，
    // emoji 直接输出字符。词书没自带图标时，按序号回退到一组封面 emoji。
    var BOOK_ICON_FALLBACK = ['📕', '📗', '📘', '📙', '📔', '📓', '📒', '📖', '📚', '📑'];
    function bookIconHtml(icon, fallback) {
        var ic = icon || fallback || '📖';
        return /^fi-(rr|sr|br|tr)-/.test(ic) ? '<i class="' + ic + '"></i>' : ic;
    }

    // 词书选项：参考阅读联想记忆应用的 .book-selector 选择器（胶囊按钮，选中=实底强调色）
    function bookPill(id, iconHTML, name, count, on, title) {
        return '<button type="button" class="ep-book-pill' + (on ? ' selected' : '') + '"' +
            ' data-ep-book="' + esc(id) + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
            (title ? ' title="' + esc(title) + '"' : '') + '>' +
            '<span class="ep-book-pill-icon">' + iconHTML + '</span>' +
            '<span class="ep-book-pill-name">' + name + '</span>' +
            '<span class="ep-book-pill-count">' + count + ' 词</span></button>';
    }

    // 点词书胶囊切换是否纳入（选中集存进用户配置）
    function toggleBookId(id) {
        var list = S.cfg.bookIds.slice();
        var at = list.indexOf(id);
        if (at < 0) list.push(id); else list.splice(at, 1);
        S.cfg.bookIds = list;
        saveCfg(S.cfg);
        refreshBookPool();
        render();
    }

    // 富文本典雅下拉：复用网页既有 .ai-picker 样式（trigger / panel / item / lead /
    // icon-box / badge / desc / item-check），参考阅读联想记忆的难度选择器 ——
    // 左侧图标方块 + 徽标 + 名称 + 浅色说明。english-poker 独立渲染、不走 app.js 的
    // initSettingSelects，故在此自建（结构与之保持一致）。
    function pickerFaceHtml(variant, o) {
        var idCls = variant === 'trigger' ? 'ai-picker-trigger-id' : 'ai-picker-item-id';
        var icon = '';
        if (o.icon) {
            icon = '<span class="ai-picker-icon-box">' +
                (/^fi-(rr|sr|br|tr)-/.test(o.icon) ? '<i class="' + o.icon + '"></i>' : esc(o.icon)) +
                '</span>';
        }
        return '<span class="ai-picker-lead">' + icon +
            '<span class="ai-picker-text">' +
            //移除badge
            '<span class="' + idCls + '">' + esc(o.name) + '</span>' +
            (o.desc ? '<span class="ai-picker-desc">' + esc(o.desc) + '</span>' : '') +
            '</span></span>';
    }

    // id: 落库字段（epLevel / epBombMin）；opts: [{value,icon,tag,name,desc}]；current: 当前值
    function pickerHtml(id, opts, current) {
        var cur = opts[0];
        opts.forEach(function (o) { if (o.value === current) cur = o; });
        var items = '';
        opts.forEach(function (o) {
            var on = o.value === current;
            items += '<div class="ai-picker-item' + (on ? ' ai-picker-item-active' : '') +
                '" role="option" aria-selected="' + (on ? 'true' : 'false') +
                '" data-ep-opt="' + esc(id) + '" data-ep-val="' + esc(String(o.value)) + '">' +
                pickerFaceHtml('item', o) +
                (on ? '<i class="ai-picker-item-check fi-rr-check"></i>' : '') +
                '</div>';
        });
        return '<div class="ai-picker ep-picker" data-ep-picker="' + esc(id) + '">' +
            '<button type="button" class="ai-picker-trigger" data-ep-trigger="' + esc(id) + '">' +
            pickerFaceHtml('trigger', cur) +
            '</button>' +
            '<div class="ai-picker-panel" style="display:none" role="listbox">' + items + '</div>' +
            '</div>';
    }

    // 选中落库（等价于原先 <select> 的 change → saveCfg + render）
    function pickPickerOption(id, val) {
        if (id === 'epLevel') {
            if (S.cfg.level !== val) { S.cfg.level = val; saveCfg(S.cfg); }
        } else if (id === 'epBombMin') {
            var v = Number(val) || 4;
            if (S.cfg.bombMin !== v) { S.cfg.bombMin = v; saveCfg(S.cfg); refreshBookPool(); }
        }
        render();
    }

    // 收起全部典雅下拉面板
    function closePickers() {
        var ps = document.querySelectorAll('.ep-picker .ai-picker-panel');
        for (var i = 0; i < ps.length; i++) ps[i].style.display = 'none';
        var os = document.querySelectorAll('.ep-picker.open');
        for (var j = 0; j < os.length; j++) os[j].classList.remove('open');
    }

    function renderConfig() {
        var S_ = window.Storage;
        var books = (S_ && S_.loadBooks) ? (S_.loadBooks() || []) : [];
        var favs = (S_ && S_.loadFavoriteItems) ? (S_.loadFavoriteItems() || []) : [];
        var ids = S.cfg.bookIds;

        var rows = '';
        if (favs.length) {
            rows += bookPill('favorites', '<i class="fi-rr-star"></i>', '收藏单词', favs.length,
                ids.indexOf('favorites') >= 0, '收藏单词');
        }
        books.forEach(function (b, i) {
            var n = (b.words || []).length;
            var nm = b.name || '未命名词书';
            rows += bookPill(String(b.id), bookIconHtml(b.icon, BOOK_ICON_FALLBACK[i % BOOK_ICON_FALLBACK.length]),
                esc(nm), n, ids.indexOf(String(b.id)) >= 0, nm);
        });
        if (!rows) {
            rows = '<div class="ep-empty">还没有词书。请先在主界面导入词书，再来开局——' +
                '词书决定 AI 与提示能想到的词，也决定哪些长词算炸弹。</div>';
        }

        var bombCount = BOOK_WORDS.filter(function (w) { return w.length >= S.cfg.bombMin; }).length;

        var lvOpts = [];
        for (var k in LEVELS) {
            lvOpts.push({ value: k, icon: LEVELS[k].icon, tag: LEVELS[k].tag,
                name: LEVELS[k].label, desc: LEVELS[k].desc });
        }
        var bombOpts = [
            { value: 4, icon: 'fi-rr-bomb', tag: '4+', name: '4 个字母起', desc: '容易凑成，炸弹频出，节奏快' },
            { value: 5, icon: 'fi-rr-bomb', tag: '5+', name: '5 个字母起', desc: '攻守均衡，长词才有压制力' },
            { value: 6, icon: 'fi-rr-bomb', tag: '6+', name: '6 个字母起', desc: '极难凑成，炸弹稀少，更拼手法' }
        ];

        return '<div class="ep-config">' +
            '<div class="ep-rule-brief">' +
            '<b>玩法</b>：领出者拼一个单词（或甩单牌），其余人必须跟「字数相同」的单词，跟不动就过。' +
            '一圈下来（其余人都过）本墩才收，有人跟得上就继续循环跟下去。' +
            '够 ' + S.cfg.bombMin + ' 字母<b>且在你词书里</b>的词是<b class="ep-gold">金色炸弹</b>，' +
            '能压掉任何普通牌，且要拿同样长或更长的炸弹来压。每个词全场只能用一次（当普通词还是炸弹都算），' +
            '同一个词的炸弹<b>每天全场只能出一次</b>（次日重置）。' +
            '甩单牌只能<b>越出越大</b>（A→Z），出到 Z 之后只能用炸弹夺回牌权 —— 尾牌也好借此出手。' +
            '先出完手牌者胜，血战到底排完 4 名；长牌、B2 以上高级词、炸弹各有赋分，结算按总分评选 MVP。' +
            '</div>' +
            '<div class="ep-field">' +
            '<div class="ep-field-label">词书</div>' +
            '<div class="ep-books" id="epBooks">' + rows + '</div>' +
            '<div class="ep-books-foot" id="epBombCount">词书炸弹词：<b>' + bombCount + '</b> 个（≥' +
            S.cfg.bombMin + ' 字母）；词书外的长词只能当普通牌出</div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">AI 难度</label>' +
            pickerHtml('epLevel', lvOpts, S.cfg.level) +
            '<div class="ep-hint-text">难度 = 词汇视野 × 选牌策略 × 失误率，越简单越容易看走眼；困难模式下首墩由随机一位人机先出。</div></div>' +
            '<div class="form-group"><label class="form-label">炸弹门槛</label>' +
            pickerHtml('epBombMin', bombOpts, S.cfg.bombMin) +
            '<div class="ep-hint-text">越长越难凑，也越难被压。</div></div>' +
            '</div>' +
            '<label class="ep-switch-row">' +
            '<span class="ep-switch-text"><i class="fi-rr-bulb"></i>开启提示' +
            '<em class="ep-switch-note">选中牌后自动提示可编组的牌组，点了即编组；关闭时按「选牌顺序」拼词，更考验手法</em></span>' +
            '<span class="switch-wrap"><input type="checkbox" id="epHints"' +
            (S.cfg.hints ? ' checked' : '') + '><span class="switch-slider"></span></span></label>' +
            (S.dataReady ? '' : '<div class="ep-loading">词库加载中，请稍候…</div>') +
            '<div class="ep-actions ep-actions-center"><button class="ep-btn ep-btn-gold ep-btn-big" id="epStartBtn"' +
            (S.dataReady ? '' : ' disabled') + '>' +
            '<i class="fi-rr-play"></i>开始对局</button></div>' +
            '</div>';
    }

    function renderGame() {
        var g = S.game;
        var me = g.players[0];

        // 本墩的出牌**直接摊在桌面上**：四个座位各有固定方位的 absolute 占位 ——
        // 对家(2)在上、上家(3)在左、下家(1)在右、你(0)在下。不再用一个会「被撑开」的盒子圈住它们。
        // 每人只展示本墩**最后那一手**，新的叠在旧的上（角标 ×N），区域尺寸恒定。
        function lastPlayIdx(seat) {
            for (var i = g.roundPlays.length - 1; i >= 0; i--) {
                if (g.roundPlays[i].seat === seat) return i;
            }
            return -1;
        }
        // 出手越晚 z 越高：后出的压住先出的（左右两家叠在一起时，被压的一方由 markOverlaps 暗淡化）
        var ziOf = {};
        g.players.slice().sort(function (a, b) {
            return lastPlayIdx(a.seat) - lastPlayIdx(b.seat) || a.seat - b.seat;
        }).forEach(function (p, i) { ziOf[p.seat] = 10 + i; });

        var rz = { 0: '', 1: '', 2: '', 3: '' };
        g.players.forEach(function (p) {
            var mine = g.roundPlays.filter(function (pl) { return pl.seat === p.seat; });
            var holds = (g.lastPlayer === p.seat);
            var acting = (g.turn === p.seat && !g.over);
            var piled = mine.length > 1;
            var body;
            if (mine.length) {
                var last = mine[mine.length - 1];
                body = playHTML(last) + (piled
                    ? '<span class="ep-rz-pile" title="本墩已出 ' + mine.length + ' 手">×' + mine.length + '</span>' : '');
            } else if (p.finished) {
                body = '<span class="ep-rz-empty">已出完</span>';
            } else if (acting) {
                body = '<span class="ep-rz-empty">' + (g.phase === 'lead' ? '领出中…' : '出牌中…') + '</span>';
            } else {
                body = '<span class="ep-rz-empty">—</span>';
            }
            rz[p.seat] = '<div class="ep-rz ep-rz-seat' + p.seat + (holds ? ' ep-rz-lead' : '') +
                (acting ? ' ep-rz-turn' : '') + (piled ? ' ep-rz-has-pile' : '') +
                '" data-ep-zone="' + p.seat + '" style="z-index:' + ziOf[p.seat] + '">' +
                '<span class="ep-river-who">' + esc(p.name) + '</span>' +
                '<span class="ep-rz-plays">' + body + '</span>' +
                (holds ? '<span class="ep-river-flag">牌权</span>' : '') +
                '</div>';
        });

        // 炸弹浮层：亮出这个词、音标、释义，并说明它在不在你的词书里（停 3 秒）
        var revealHTML = '';
        if (S.reveal) {
            var rv = S.reveal;
            if (rv.isJokerBomb) {
                // 王炸不成词，没有音标/释义/字数可亮，只强调它是最高优先级
                revealHTML = '<div class="ep-reveal"><div class="ep-reveal-box">' +
                    '<div class="ep-reveal-who"><i class="fi-sr-bolt"></i>' + esc(seatName(rv.seat)) + ' 打出王炸</div>' +
                    '<div class="ep-reveal-word">大王 + 小王</div>' +
                    '<div class="ep-reveal-mean">最高优先级的炸弹，能压任何牌；只有另一副王炸才能压过它</div>' +
                    '<div class="ep-reveal-tags"><span>王炸</span></div>' +
                    '</div></div>';
            } else {
                var de = dictEntry(rv.word);
                revealHTML = '<div class="ep-reveal"><div class="ep-reveal-box">' +
                    '<div class="ep-reveal-who"><i class="fi-sr-bolt"></i>' + esc(seatName(rv.seat)) + ' 打出炸弹</div>' +
                    '<div class="ep-reveal-word">' + esc(rv.word.toUpperCase()) + '</div>' +
                    (de && de.phonetic ? '<div class="ep-reveal-ipa">/' + esc(de.phonetic) + '/</div>' : '') +
                    '<div class="ep-reveal-mean">' + esc((de && de.meaning) || '（词典里没有收录释义）') + '</div>' +
                    '<div class="ep-reveal-tags"><span>' + rv.len + ' 字母</span>' +
                    (isBookWord(rv.word)
                        ? '<span class="ep-reveal-in">在你的词书里</span>'
                        : '<span class="ep-reveal-out">不在你的词书里</span>') +
                    '</div></div></div>';
            }
        }

        // 炸弹锦囊浮层：先「拼对例句里的单词」，再切到祝贺画面并播放自动选牌动画
        var charmHTML = '';
        if (S.charm) {
            var ch = S.charm;
            if (ch.phase === 'quiz') {
                charmHTML = '<div class="ep-reveal ep-charm"><div class="ep-reveal-box ep-charm-box">' +
                    '<div class="ep-reveal-who"><i class="fi-rr-gift"></i>炸弹锦囊 · 拼出例句里的单词</div>' +
                    '<div class="ep-charm-sent">' + ch.sentence + '</div>' +
                    
                    '<div class="ep-charm-row">' +
                    '<input id="epCharmInput" class="ep-charm-input" type="text" autocomplete="off" ' +
                    'autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="' + ch.word.length + '" ' +
                    'placeholder="' + esc(ch.placeholder || '输入单词') + '" value="' + esc(ch.input) + '">' +
                    '</div>' +
                    (ch.hint ? '<div class="ep-charm-hint">' + esc(ch.hint) + '</div>' : '') +
                    '<div class="ep-charm-btns">' +
                    '<button class="ep-btn ep-btn-ghost" data-ep-charm="reroll">' +
                    '<i class="fi-rr-dice" id="epCharmDice"></i>换一个</button>' +
                    '<button class="ep-btn ep-btn-ghost" data-ep-charm="cancel">放弃</button>' +
                    '</div>' +
                    '</div></div>';
            } else {
                var cde = dictEntry(ch.word);
                charmHTML = '<div class="ep-reveal ep-charm"><div class="ep-reveal-box ep-charm-box">' +
                    '<div class="ep-reveal-who"><i class="fi-rr-sparkles"></i>锦囊到手 · 正在组牌</div>' +
                    '<div class="ep-reveal-word">' + esc(ch.word.toUpperCase()) + '</div>' +
                    (cde && cde.phonetic ? '<div class="ep-reveal-ipa">/' + esc(cde.phonetic) + '/</div>' : '') +
                    '<div class="ep-reveal-mean">' + esc((cde && cde.meaning) || '（词典里没有收录释义）') + '</div>' +
                    '<div class="ep-reveal-tags"><span>' + ch.word.length + ' 字母</span>' +
                    '<span class="ep-reveal-in">炸弹</span></div>' +
                    '</div></div>';
            }
        }

        // 王的选牌弹窗：同一个字母组合能拼出好几个词，列出全部供玩家自选，并标出哪个是炸弹
        var jokerHTML = '';
        if (S.jokerPick) {
            var jp = S.jokerPick;
            jokerHTML = '<div class="ep-reveal"><div class="ep-reveal-box ep-jw-box">' +
                '<div class="ep-reveal-who"><i class="fi-sr-club"></i>' +
                (jp.mode === 'pack' ? '这张王能拼成这些词，选一个编组' : '这张王能拼成这些词，选一个打出') +
                '<em class="ep-jw-count">共 ' + jp.cands.length + ' 个</em></div>' +
                jp.cands.map(function (c, i) {
                    return '<button class="ep-jw' + (c.isBomb ? ' ep-jw-bomb' : '') +
                        (c.err ? ' ep-jw-bad' : '') + '" data-ep-jw="' + i + '">' +
                        '<b>' + esc(c.word.toUpperCase()) + '</b>' +
                        (c.isBomb ? '<span class="ep-bomb-tag">炸弹</span>' : '') +
                        (c.isBook ? '<span class="ep-jw-book">词书</span>' : '') +
                        '<em>' + (c.err ? esc(c.err)
                            : (c.isBomb ? c.word.length + ' 字母 · 能压台面' : '普通 ' + c.word.length + ' 字母')) + '</em>' +
                        '</button>';
                }).join('') +
                '<button class="ep-btn ep-btn-ghost" data-ep-jw-cancel="1">取消</button>' +
                '</div></div>';
        }

        var req = g.bombLevel === JOKER_BOMB
            ? '台面是王炸，只有王炸能压'
            : (g.bombLevel > 0
                ? '台面炸弹 ' + g.bombLevel + ' 字母，需同样长或更长的炸弹'
                : (g.level === 0 ? '等你领出'
                    : (g.level <= 1
                        ? (g.singleTop ? '单牌需大于 ' + singleTopText(g.singleTop) : '单牌局')
                        : '需 ' + g.level + ' 字母')));

        var myTurn = (g.turn === 0 && !g.over);

        // 跟单牌时：只有「比台面更大」的单牌（含王）和手上还能凑出的炸弹牌可以点，
        // 其余单牌点了也出不掉，灰置不可选 —— 免得白白选一串又被打回。
        var deadIds = {};
        if (myTurn && g.phase === 'follow' && g.bombLevel === 0 && g.level === 1) {
            var topR = g.singleTop ? singleRank(g.singleTop) : -1;
            var keep = {};
            var jb = jokerBombOf(me.hand);
            if (jb) jb.ids.forEach(function (id) { keep[id] = 1; });
            findBombs(me.hand, S.cfg.bombMin || 4, g.usedWords, 0, null).forEach(function (w) {
                var pk = pickCards(me.hand, w);
                if (pk) pk.ids.forEach(function (id) { keep[id] = 1; });
            });
            me.hand.forEach(function (c) {
                if (singleRank(c.code) > topR) keep[c.id] = 1;
                // 已选中的牌不灰（不然没法点回来取消，只能走拼牌条）
                if (!keep[c.id] && pickIndexOf(c.id) < 0) deadIds[c.id] = 1;
            });
        }

        var handHTML = '';
        me.hand.forEach(function (c) {
            var packed = isPacked(c.id);
            var dead = !packed && !!deadIds[c.id];
            handHTML += cardHTML(c, {
                sel: !packed && pickIndexOf(c.id) >= 0,
                cls: packed ? 'ep-card-packed' : (dead ? 'ep-card-dis' : ''),
                // 拿掉 data-ep-card，点它就不会进选牌 —— 灰牌是「真的点不动」
                attrs: dead ? '' : 'data-ep-card="' + c.id + '"'
            });
        });

        var ordered = isOrdered();

        // 炸弹锦囊按钮：手上有「可压台面 + 有例句」的炸弹组合才可点，否则灰置（提示还能再想想）
        var charmReady = !frozen() && !me.finished && !g.over && charmCandidates().length > 0;

        // 拼牌条：左边是「按选择顺序」摆开的牌（可拖动改序），
        // 右边才是校验结论 —— 结论永远不遮牌面（此前错误文案会整条替换掉牌，导致看不见）。
        var picked = selectedCards();
        var dealt = (S.packPick !== null && S.packs[S.packPick]) ? S.packs[S.packPick] : null;
        var pickTiles = '';
        if (dealt) {
            // 点了编组牌：拼牌条上先亮出这一把，再点「跟牌 / 出牌」放出
            dealt.codes.forEach(function (code) {
                pickTiles += cardHTML({ code: code }, {
                    small: true, cls: 'ep-pick-card' + (dealt.isBomb ? ' ep-pick-bomb' : '')
                });
            });
        } else {
            picked.forEach(function (c, i) {
                pickTiles += cardHTML(c, {
                    small: true, cls: 'ep-pick-card',
                    attrs: 'data-ep-pick="' + i + '" draggable="true"'
                });
            });
        }
        // 下一张牌的空位：底部一条呼吸的划线，像拼写输入的光标
        if (myTurn && !dealt) pickTiles += '<span class="ep-pick-next" aria-hidden="true"></span>';

        var check;
        if (dealt) {
            if (dealt.isJokerBomb) {
                // 王炸组没有 word（不能拿 null 去过 levelCheck / toUpperCase）
                check = '<span class="ep-check ep-check-ok"><b>王炸</b>' +
                    '<em class="ep-check-note">能压任何牌，点「' + (g.phase === 'lead' ? '出牌' : '跟牌') + '」放出</em></span>';
            } else {
                var perr = levelCheck(dealt.word, !!dealt.isBomb, { isLead: g.phase === 'lead' });
                check = perr
                    ? '<span class="ep-check ep-check-bad"><i class="fi-rr-cross-small"></i>' + esc(perr) + '</span>'
                    : '<span class="ep-check ep-check-ok"><b>' + esc(dealt.word.toUpperCase()) + '</b>' +
                    '<em>' + dealt.codes.length + ' 字母</em>' +
                    (dealt.isBomb ? '<span class="ep-bomb-tag">炸弹</span>' : '') +
                    '<em class="ep-check-note">点「' + (g.phase === 'lead' ? '出牌' : '跟牌') + '」放出</em></span>';
            }
        } else if (picked.length) {
            var res = validate(picked, { isLead: g.phase === 'lead', ordered: ordered });
            if (res.ok) {
                if (res.isJokerBomb) {
                    check = '<span class="ep-check ep-check-ok"><b>王炸</b>' +
                        '<em class="ep-check-note">能压任何牌，只有王炸能压</em></span>';
                } else {
                    check = '<span class="ep-check ep-check-ok">' +
                        '<b>' + (res.word ? esc(res.word.toUpperCase()) : '单牌 ' + esc(displayCode(picked[0]))) + '</b>' +
                        '<em>' + res.len + ' 字母</em>' +
                        (res.isBomb ? '<span class="ep-bomb-tag">炸弹</span>' : '') +
                        '</span>';
                }
            } else {
                check = '<span class="ep-check ep-check-bad"><i class="fi-rr-cross-small"></i>' + esc(res.err) + '</span>';
            }
        } else {
            check = '<span class="ep-check ep-check-idle">' + (g.turn === 0
                ? (g.phase === 'lead' ? '选牌后点「出牌」领出这一墩' : idleHintText(me, g))
                : esc(seatName(g.turn)) + ' 出牌中…可先把你的牌备好') + '</span>';
        }

        // 提示模式：拼牌条右侧列一行「这手牌能拼出的词」供点选重排（见 previewOrderOptions）；
        // 与校验结论同款 pill 样式，非提示模式不产出。
        var orderOptions = dealt ? [] : previewOrderOptions(picked, g);
        var orderHTML = orderOptions.length
            ? '<div class="ep-order-opts">' + orderOptions.map(function (o) {
                return '<button class="ep-check ep-order-opt' + (o.bomb ? ' ep-order-bomb' : '') +
                    '" data-ep-hint="' + esc(o.word) + '">' +
                    '<b>' + esc(o.word.toUpperCase()) + '</b><em>' + o.word.length + '</em></button>';
            }).join('') + '</div>'
            : '';

        var preview = '<div class="ep-preview"><span class="ep-word-tiles ep-pickzone" id="epPickZone">' +
            pickTiles + '</span>' + check + orderHTML + '</div>';

        // 编组好的牌组：堆在操作区最右侧，点它选中、再点「跟牌」放出。
        // 炸弹组金色高亮；词书外的普通词组保持素色 —— 它只能按普通牌的门槛打出。
        var packsHTML = S.packs.map(function (pk, i) {
            var tiles = pk.codes.map(function (code) {
                return cardHTML({ code: code }, { small: true });
            }).join('');
            // 王炸组不成词：名字固定「王炸」，不给字数字，也不带「普通」标签
            var pkName = pk.isJokerBomb ? '王炸' : esc(pk.word.toUpperCase());
            var pkTip = pk.isJokerBomb
                ? '王炸（大王+小王）· 能压任何牌，只有王炸能压'
                : esc(wordTip(pk.word));
            return '<span class="ep-pack' + (pk.isBomb ? ' ep-pack-bomb' : ' ep-pack-plain') +
                (pk.isJokerBomb ? ' ep-pack-jokerbomb' : '') +
                (S.packPick === i ? ' ep-pack-on' : '') + '" data-ep-pack="' + i + '"' +
                ' title="' + pkTip + '">' +
                '<span class="ep-pack-cards">' + tiles + '</span>' +
                '<span class="ep-pack-word">' + pkName +
                (pk.isJokerBomb ? '' : '<em>' + pk.codes.length + '</em>') +
                (pk.isBomb ? '' : '<b class="ep-pack-tag">普通</b>') + '</span>' +
                '<span class="ep-pack-x" data-ep-unpack="' + i + '" title="解散这一组"><i class="fi-rr-cross-small"></i></span>' +
                '</span>';
        }).join('');

        var actions = '';
        // 编组：普通炸弹要过 packableWord；两张大小王则直接认作王炸
        var canPack = !dealt && (!!packableWord(picked) || isJokerBombCards(picked));
        if (myTurn) {
            actions += '<button class="ep-btn ep-btn-gold" id="epPlayBtn" ' +
                ((picked.length || dealt) ? '' : 'disabled') + '>' +
                (g.phase === 'lead' ? '<i class="fi-rr-play"></i>出牌' : '<i class="fi-rr-play"></i>跟牌') + '</button>';
            if (g.phase === 'follow') {
                actions += '<button class="ep-btn" id="epPassBtn"><i class="fi-rr-forward"></i>不出</button>';
            }
            // 「编组」是备牌动作，不必等轮到——下面 else 分支同样给出这个按钮
            if (canPack) {
                actions += '<button class="ep-btn ep-btn-pack" id="epPackBtn"><i class="fi-rr-layers"></i>编组</button>';
            }
        } else {
            actions = '<div class="ep-wait">' + esc(seatName(g.turn)) + ' 正在思考…</div>';
            if (canPack) {
                actions += '<button class="ep-btn ep-btn-pack" id="epPackBtn"><i class="fi-rr-layers"></i>编组</button>';
            }
        }
        if (packsHTML) actions += '<div class="ep-packs" id="epPacks">' + packsHTML + '</div>';

        // 对局记录按发生顺序自上而下排（最新一条在最下面）：和牌河的左→右同向，
        // 免得把「谁最后出牌、牌权归谁」看反。整段完整展示，不再截取末尾几条。
        var logs = g.logs.map(function (t) {
            return '<div class="ep-log-line">' + esc(t) + '</div>';
        }).join('');

        return '' +
            '<div class="ep-game">' +
            '<div class="ep-top">' +
            '<div class="ep-brand">英文扑克<span>ENGLISH POKER</span></div>' +
            '<div class="ep-top-info"><span class="ep-chip">第 ' + g.roundNo + ' 墩</span>' +
            '<span class="ep-chip ep-chip-req">' + esc(req) + '</span></div>' +
            '<button class="ep-btn ep-btn-ghost" id="epQuitBtn"><i class="fi-rr-exit"></i>结束对局</button>' +
            '</div>' +

            '<div class="ep-stage">' +
            '<div class="ep-surface"></div>' +
            // 音量按钮左侧的音效状态：仅在加载/刚就绪时闪现，随后淡出
            '<span class="ep-vol-hint" id="epVolHint" aria-live="polite"></span>' +
            // 桌面右上角的音量按钮：控制对局音效（独立于主设置的「音效提示」）
            '<button class="ep-vol" id="epVolBtn" type="button" title="' +
            (S.cfg.sound === false ? '音效已静音，点击开启' : '音效开启，点击静音') + '"' +
            ' aria-label="对局音效开关" aria-pressed="' + (S.cfg.sound === false ? 'true' : 'false') + '">' +
            '<i class="' + (S.cfg.sound === false ? 'fi-rr-volume-slash' : 'fi-rr-volume') + '"></i>' +
            '</button>' +
            revealHTML +
            jokerHTML +
            charmHTML +
            rz[2] + rz[3] + rz[1] + rz[0] +
            '<div class="ep-slot ep-slot-top">' + seatPanelHTML(g.players[2], g) + '</div>' +
            '<div class="ep-slot ep-slot-left">' + seatPanelHTML(g.players[3], g) + '</div>' +
            '<div class="ep-slot ep-slot-right">' + seatPanelHTML(g.players[1], g) + '</div>' +
            '</div>' +

            '<div class="ep-my">' +
            '<div class="ep-my-head"><span class="ep-my-name">你的手牌</span>' +
            '<span class="ep-my-count">' + me.hand.length + ' 张</span>' +
            (me.finished ? '<span class="ep-done-tag">已出完 · 第 ' + me.rank + ' 名</span>' : '') +
            '<button class="ep-btn ep-btn-charm" id="epCharmBtn"' + (charmReady ? '' : ' disabled') +
            ' title="' + (charmReady
                ? '拼对一句例句，手牌自动组好一组炸弹（优先给不熟的词）'
                : '手上暂时凑不出可用的炸弹') + '">' +
            '<i class="fi-rr-gift"></i>炸弹锦囊</button>' +
            '</div>' +
            '<div class="ep-hand" id="epHand">' + handHTML + '</div>' +
            '<div class="ep-under">' + preview + '</div>' +
            '<div class="ep-actions">' + actions + '</div>' +
            '</div>' +

            '<div class="ep-logs"><div class="ep-log-h">对局记录</div>' +
            '<div class="ep-log">' + logs + '</div></div>' +
            '</div>';
    }

    function renderResult() {
        var g = S.game;
        var ranks = g.finalRanks || [];
        var mvpSeat = g.mvp ? g.mvp.seat : -1;
        var rows = ranks.map(function (p) {
            var meCls = p.isHuman ? ' ep-rank-me' : '';
            var medal = p.rank === 1 ? '🥇' : (p.rank === 2 ? '🥈' : (p.rank === 3 ? '🥉' : '4'));
            return '<div class="ep-rank-row' + meCls + '">' +
                '<span class="ep-rank-medal">' + medal + '</span>' +
                '<span class="ep-rank-name">' + esc(p.name) + (p.isHuman ? '（你）' : '') +
                (p.seat === mvpSeat ? '<span class="ep-rank-mvp">MVP</span>' : '') + '</span>' +
                '<span class="ep-rank-state">' + (p.finished ? '已出完' : '剩 ' + p.hand.length + ' 张') + '</span>' +
                '<span class="ep-rank-words">' + (p.plays.filter(function (x) { return x.word; }).length) + ' 词</span>' +
                '<span class="ep-rank-score">' + (p.score || 0) + ' 分</span>' +
                '</div>';
        }).join('');

        var mvpLine = '';
        if (g.mvp) {
            mvpLine = '<div class="ep-mvp-line">' +
                '<i class="fi-sr-trophy"></i>本局 MVP：<b>' + esc(g.mvp.name) +
                (g.mvp.isHuman ? '（你）' : '') + '</b>' +
                '<em>' + (g.mvp.score || 0) + ' 分</em>' +
                '<span>长牌、B2 以上高级词、炸弹各有加权，与胜负分开计</span></div>';
        }

        var mine = g.humanWords.slice();
        var myWordsHTML = '';
        if (mine.length) {
            myWordsHTML = mine.map(function (w) {
                var e = dictEntry(w);
                var bomb = isBombWord(w, S.cfg.bombMin);
                return '<div class="ep-review-item' + (bomb ? ' ep-review-bomb' : '') + '">' +
                    (bomb ? '<i class="fi-rr-bomb ep-review-icon"></i>' : '') +
                    '<span class="ep-review-word">' + esc(w.toUpperCase()) + '</span>' +
                    (e && e.phonetic ? '<span class="ep-review-ph">' + esc(e.phonetic) + '</span>' : '') +
                    (e && e.meaning ? '<span class="ep-review-mean">' + esc(e.meaning) + '</span>' : '') +
                    '</div>';
            }).join('');
        } else {
            myWordsHTML = '<div class="ep-empty">这一局你一个单词都没出。</div>';
        }

        // 锦囊复盘：优先贴出「开了锦囊却没拼出来就放弃」的词（带例句，不显示音标）；
        // 一局都没用过锦囊，就拿漏掉的炸弹词补位（不显示例句）。
        // 注意要剔掉「后来真在牌局里拼出来过」的词：锦囊只是给了例句提示，
        // 玩家照着例句真把这个炸弹打出来了，就不算「没拼出来」。
        var playedSet = {};
        mine.forEach(function (w) { playedSet[w] = 1; });
        var charmGiveUp = (g.charmGaveUp || []).filter(function (x) { return !playedSet[x.word]; });
        var charmHTML;
        if (charmGiveUp.length) {
            charmHTML = charmGiveUp.map(function (x) {
                var e = dictEntry(x.word);
                return '<div class="ep-review-item ep-review-bomb">' +
                    '<i class="fi-rr-bomb ep-review-icon"></i>' +
                    '<span class="ep-review-word">' + esc(x.word.toUpperCase()) + '</span>' +
                    (e && e.phonetic ? '<span class="ep-review-ph">' + esc(e.phonetic) + '</span>' : '') +
                    (e && e.meaning ? '<span class="ep-review-mean">' + esc(e.meaning) + '</span>' : '') +
                    (x.example ? '<span class="ep-review-eg">' + esc(x.example) + '</span>' : '') +
                    '</div>';
            }).join('');
        } else {
            var filler = (g.missed || []).filter(function (m) { return m.bomb; });
            charmHTML = filler.length
                ? filler.map(function (m) {
                    var e = dictEntry(m.word);
                    return '<div class="ep-review-item ep-review-bomb">' +
                        '<i class="fi-rr-bomb ep-review-icon"></i>' +
                        '<span class="ep-review-word">' + esc(m.word.toUpperCase()) + '</span>' +
                        (e && e.phonetic ? '<span class="ep-review-ph">' + esc(e.phonetic) + '</span>' : '') +
                        (e && e.meaning ? '<span class="ep-review-mean">' + esc(e.meaning) + '</span>' : '') +
                        '</div>';
                }).join('')
                : '<div class="ep-empty">这局没用上炸弹锦囊，也没漏掉什么炸弹。</div>';
        }

        var aiBombHTML = g.aiBombs.length
            ? '本局被对手用炸弹压过：' + g.aiBombs.map(function (w) { return esc(w.toUpperCase()); }).join('、')
            : '本局对手没打出炸弹。';

        // 谁先打完谁赢：把「出完顺序」明写出来，免得对局记录只留最后几条时看不出谁先出完
        var finishOrder = g.order.map(function (s) { return esc(g.players[s].name); }).join(' → ');

        return '<div class="ep-result">' +
            '<div class="ep-result-head"><h3 class="ep-result-title">对局结束</h3>' +
            '<span class="ep-result-sub">血战到底 · 排完 4 名' +
            (finishOrder ? ' · 出完顺序：' + finishOrder : '') + '</span></div>' +
            '<div class="ep-ranks">' + rows + '</div>' +
            mvpLine +
            '<div class="ep-review">' +
            '<h4><i class="fi-rr-star"></i>复盘 · 你拼出的词</h4>' + myWordsHTML +
            '<h4><i class="fi-rr-bulb"></i>复盘 · 锦囊里没拼出来的炸弹</h4>' + charmHTML +
            '<div class="ep-ai-bombs">' + aiBombHTML + '</div>' +
            '</div>' +
            '<div class="ep-actions">' +
            '<button class="ep-btn ep-btn-gold" id="epAgainBtn"><i class="fi-rr-refresh"></i>再来一局</button>' +
            '<button class="ep-btn" id="epConfigBtn"><i class="fi-rr-settings"></i>修改设置</button>' +
            '</div>' +
            '</div>';
    }

    /* ============================ 事件 ============================ */

    function bind() {
        var closeBtn = document.getElementById('epCloseBtn');
        if (closeBtn && !closeBtn.dataset.epBound) {
            closeBtn.dataset.epBound = '1';
            closeBtn.addEventListener('click', function () {
                var app = window.app;
                if (app && typeof app.showWorkshopHome === 'function') app.showWorkshopHome();
            });
        }
        var root = document.getElementById('epBody');
        if (!root || root.dataset.epBound) return;
        root.dataset.epBound = '1';

        root.addEventListener('click', function (e) {
            // 选牌 / 编组 / 拼牌条拖动都只是「备牌」：对手出牌时也允许，只有真正出牌才等轮到自己。
            var canPick = S.game && !S.game.over && !frozen();
            // 炸弹锦囊弹层：只处理它自己的按钮，其余点击一律吃掉，别穿透到牌桌
            if (S.charm) {
                var cbtn = e.target.closest('[data-ep-charm]');
                if (cbtn) {
                    e.stopPropagation();
                    if (cbtn.dataset.epCharm === 'reroll') charmReroll();
                    else if (cbtn.dataset.epCharm === 'cancel') closeCharm();
                    return;
                }
                if (e.target && e.target.id === 'epCharmInput') return;   // 允许点输入框
                return;
            }
            // 王的选牌弹窗：先处理它，别让点击穿透到牌桌
            if (S.jokerPick) {
                var jw = e.target.closest('[data-ep-jw]');
                if (jw) { e.stopPropagation(); chooseJokerWord(Number(jw.dataset.epJw)); return; }
                if (e.target.closest('[data-ep-jw-cancel]')) {
                    e.stopPropagation();
                    S.jokerPick = null;
                    render();
                    return;
                }
                return;
            }
            // 编组的炸弹：点一下选中（差最后一下「跟牌」放出），再点一下取消
            var unp = e.target.closest('[data-ep-unpack]');
            if (unp) {
                e.stopPropagation();
                unpackBomb(Number(unp.dataset.epUnpack));
                return;
            }
            var pk = e.target.closest('[data-ep-pack]');
            if (pk) {
                if (!canPick) return;
                var pi = Number(pk.dataset.epPack);
                S.packPick = (S.packPick === pi) ? null : pi;
                S.selected = [];
                render();
                return;
            }
            // 拼牌条上的牌：点一下把它撤下（移动端没有拖拽，也能改选）
            var pit = e.target.closest('[data-ep-pick]');
            if (pit) {
                var at = Number(pit.dataset.epPick);
                if (canPick && at >= 0 && at < S.selected.length) {
                    S.selected.splice(at, 1);
                    render();
                }
                return;
            }
            var card = e.target.closest('[data-ep-card]');
            if (card) {
                if (canPick) { pickToggle(Number(card.dataset.epCard)); render(); }
                return;
            }
            var hint = e.target.closest('[data-ep-hint]');
            if (hint) {
                if (canPick) orderSelectedAs(hint.dataset.epHint);
                return;
            }
            // 典雅下拉：点选项落库重画；点触发器开合面板（浮层覆盖，不撑开下方内容）
            var optEl = e.target.closest('[data-ep-opt]');
            if (optEl) {
                e.stopPropagation();
                pickPickerOption(optEl.dataset.epOpt, optEl.dataset.epVal);
                return;
            }
            var trigEl = e.target.closest('[data-ep-trigger]');
            if (trigEl) {
                e.stopPropagation();
                var pkHost = trigEl.closest('.ai-picker');
                var pkPanel = pkHost && pkHost.querySelector('.ai-picker-panel');
                var wasOpen = pkPanel && pkPanel.style.display !== 'none';
                closePickers();
                if (pkPanel && !wasOpen && pkHost) { pkPanel.style.display = 'block'; pkHost.classList.add('open'); }
                return;
            }
            var t = e.target.closest('button');
            if (!t) return;
            if (t.dataset && t.dataset.epBook !== undefined) { toggleBookId(t.dataset.epBook); return; }
            if (t.id === 'epVolBtn') { toggleSound(); return; }
            if (t.id === 'epStartBtn') { startMatch(); return; }
            if (t.id === 'epPlayBtn') {
                if (S.packPick !== null && S.packs[S.packPick]) humanPlayPack();
                else humanPlay();
                return;
            }
            if (t.id === 'epPackBtn') { packBomb(); return; }
            if (t.id === 'epPassBtn') { humanPass(); return; }
            if (t.id === 'epCharmBtn') { openCharm(); return; }
            if (t.id === 'epQuitBtn') { settle(); return; }
            if (t.id === 'epAgainBtn') { startMatch(); return; }
            if (t.id === 'epConfigBtn') { S.view = 'config'; render(); return; }
        });

        // 锦囊拼写题：输入内容存进状态（重画不丢）；一旦拼对就自动提交，无需「确认」按钮
        root.addEventListener('input', function (e) {
            if (!(e.target && e.target.id === 'epCharmInput' && S.charm && S.charm.phase === 'quiz')) return;
            S.charm.input = e.target.value;
            var val = String(e.target.value || '').trim().toLowerCase().replace(/[^a-z]/g, '');
            if (val === S.charm.word) submitCharm();
        });
        root.addEventListener('keydown', function (e) {
            if (e.target && e.target.id === 'epCharmInput' && e.key === 'Enter') {
                e.preventDefault();
                submitCharm();
            }
        });

        // 拖动拼牌条里的牌改顺序（组词顺序即词形，换个顺序就是另一个词）。
        // 拖到两张牌中间时，在那个缝里插一个占位槽、右侧的牌自动让位 —— 槽在哪，牌就插到哪。
        var dragFrom = -1;
        var dragGap = null;

        function clearGap() {
            if (dragGap && dragGap.parentNode) dragGap.parentNode.removeChild(dragGap);
            dragGap = null;
        }

        // 占位槽在拼牌条里排第几（前面有几张牌），就是这次要插到第几位
        function gapIndex() {
            var host = dragGap && dragGap.parentNode;
            if (!host) return -1;
            var kids = host.children;
            var n = 0;
            for (var i = 0; i < kids.length; i++) {
                if (kids[i] === dragGap) return n;
                if (kids[i].dataset && kids[i].dataset.epPick !== undefined) n++;
            }
            return -1;
        }

        // 落位。drop 与 dragend 都会走到这里：
        // 部分 webview 拖拽结束只触发 dragend、不触发 drop（表现就是「拖了但没换位、源牌还半透明挂着」），
        // 所以这里不能只挂在 drop 上。
        function commitDrag() {
            if (dragFrom < 0) return false;
            var from = dragFrom;
            var to = gapIndex();
            dragFrom = -1;
            clearGap();
            if (to >= 0 && to !== from) pickReorder(from, to);
            render();   // 无论如何重画一次：清掉拖拽残留的半透明状态
            return true;
        }

        root.addEventListener('dragstart', function (e) {
            var el = e.target.closest ? e.target.closest('[data-ep-pick]') : null;
            if (!el) return;
            dragFrom = Number(el.dataset.epPick);
            el.classList.add('ep-pick-dragging');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(dragFrom));
            }
        });
        root.addEventListener('dragover', function (e) {
            if (dragFrom < 0) return;
            var zone = document.getElementById('epPickZone');
            if (!zone || !zone.contains(e.target)) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            // 指针落在哪张牌的左半 → 插到它前面；右半 → 继续往右找；都不满足则插到最末
            var cards = zone.querySelectorAll('[data-ep-pick]');
            var ref = null;
            for (var i = 0; i < cards.length; i++) {
                var r = cards[i].getBoundingClientRect();
                if (e.clientX < r.left + r.width / 2) { ref = cards[i]; break; }
            }
            if (!dragGap) {
                dragGap = document.createElement('span');
                dragGap.className = 'ep-pick-gap';
                dragGap.setAttribute('aria-hidden', 'true');
            }
            if (ref) zone.insertBefore(dragGap, ref);
            else zone.appendChild(dragGap);
        });
        root.addEventListener('drop', function (e) {
            if (dragFrom < 0) return;
            e.preventDefault();
            commitDrag();
        });
        root.addEventListener('dragend', function () { commitDrag(); });

        root.addEventListener('change', function (e) {
            var t = e.target;
            if (t.id === 'epHints') { S.cfg.hints = !!t.checked; saveCfg(S.cfg); render(); return; }
        });

        // 点击任意下拉之外的区域 → 收起所有典雅下拉面板（触发器/选项自身的点击已 stopPropagation）
        if (!bind._pickerOutside) {
            bind._pickerOutside = true;
            document.addEventListener('click', function (e) {
                if (e.target && e.target.closest && e.target.closest('.ep-picker')) return;
                closePickers();
            });
        }

        // 键盘拼牌：页面获得焦点时直接打字组词（Esc 不出 / Backspace 退一张 / Enter 出牌）。
        // 挂在 document 上，因为手牌牌面本身不可聚焦；用 view + 容器可见 + hasFocus 三重门控，
        // 保证只在牌桌开着、且没在输入框里时才接管按键。
        if (!bind._keyed) {
            bind._keyed = true;
            document.addEventListener('keydown', function (e) {
                if (S.view !== 'game' || !S.game || S.game.over) return;
                if (frozen()) return;   // 炸弹浮层 / 王的选牌弹窗展示中：先处理浮层
                var box = document.getElementById('epAppContainer');
                if (!box || box.classList.contains('hidden')) return;
                if (!document.hasFocus || !document.hasFocus()) return;
                var el = e.target;
                if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
                    el.tagName === 'SELECT' || el.isContentEditable)) return;
                if (e.ctrlKey || e.metaKey || e.altKey) return;

                if (e.key === 'Enter') {
                    if (S.game.turn !== 0) return;
                    e.preventDefault();
                    if (S.packPick !== null && S.packs[S.packPick]) humanPlayPack();
                    else humanPlay();
                    return;
                }
                if (e.key === 'Backspace') {
                    // 退一张也只是改选牌，不必等轮到自己
                    // 编组的炸弹还没点「跟牌」：退格先取消它
                    if (S.packPick !== null && !S.selected.length) {
                        e.preventDefault();
                        S.packPick = null;
                        render();
                        return;
                    }
                    if (!S.selected.length) return;
                    e.preventDefault();
                    S.selected.pop();
                    render();
                    return;
                }
                if (e.key === 'Escape') {
                    if (S.game.turn !== 0 || S.game.phase !== 'follow') return;
                    e.preventDefault();
                    humanPass();
                    return;
                }
                if (/^[a-zA-Z]$/.test(e.key)) {
                    e.preventDefault();   // 打字选牌同样是「备牌」，对手回合也能先拼
                    if (pickByLetter(e.key.toLowerCase())) render();
                    else toast('手里没有可用的「' + e.key.toUpperCase() + '」了', 'info');
                }
            });
        }

        // 窗口尺寸变了，出牌区可能由「不叠」变成「叠」：重算一次压牌暗淡化
        if (!bind._resized) {
            bind._resized = true;
            window.addEventListener('resize', function () {
                if (S.view === 'game' && S.game && !S.game.over) markOverlaps();
            });
        }
    }

    function refreshBookPool() {
        setBookWords(loadBookWords(S.cfg.bookIds));
    }

    // 提示模式：拼牌条右侧的可点选项 —— 把当前选中的牌能拼出的词列出来，点一下即按该词重排选牌。
    // 当前选牌顺序拼出的那个词（cur）已由结论牌给出，不再重复列出；其余按「炸弹优先、词越长越靠前」
    // 排序；当前台面出不了的词（用过的 / 压不过的）直接略过 —— 没价值的就不占位置。
    function previewOrderOptions(cards, g) {
        if (!S.cfg.hints || !g) return [];
        cards = cards || [];
        if (cards.length < 2) return [];
        var min = S.cfg.bombMin || 4;
        var isLead = g.phase === 'lead';
        var cur = resolveOrdered(cards);
        var list = wordChoices(cards).filter(function (w) {
            return w !== cur && !g.usedWords[w] && !levelCheck(w, isBombWord(w, min), { isLead: isLead });
        });
        list.sort(function (a, b) {
            var ab = isBombWord(a, min), bb = isBombWord(b, min);
            if (ab !== bb) return ab ? -1 : 1;
            return b.length - a.length;
        });
        return list.slice(0, 6).map(function (w) {
            return { word: w, bomb: isBombWord(w, min) };
        });
    }

    // 点某个选项：把当前选中的牌按该词重排（同一副牌换个拼法），只改顺序、不动选牌集合。
    // 缺的字母由「王」顶上：元音配小王、辅音配大王，与 pickCards 的用牌规则一致。
    function orderSelectedAs(word) {
        var cards = selectedCards();
        if (!cards.length || !word) return;
        var pool = cards.slice();
        var out = [];
        for (var i = 0; i < word.length; i++) {
            var ch = word.charAt(i);
            var at = -1, j;
            for (j = 0; j < pool.length; j++) {
                if (pool[j].code === ch) { at = j; break; }
            }
            if (at < 0) {
                var want = isVowel(ch) ? JOKER_V : JOKER_C;
                for (j = 0; j < pool.length; j++) {
                    if (pool[j].code === want) { at = j; break; }
                }
            }
            if (at < 0) { toast('这几张牌拼不出这个词', 'info'); return; }
            out.push(pool.splice(at, 1)[0]);
        }
        pool.forEach(function (c) { out.push(c); });
        S.selected = out.map(function (c) { return c.id; });
        render();
    }

    /* ============================ 炸弹锦囊 ============================ */

    // 从所选词书 / 收藏里汇总「单词 -> 正确率与例句」。
    // 锦囊按正确率优先挑词（越不熟越优先），并用词书里的例句出拼写题，所以两样都得有来源。
    function bookStatMap() {
        var out = Object.create(null);
        var S_ = window.Storage;
        var ids = (S.cfg && S.cfg.bookIds) || [];

        function add(word, attempts, wrong, example) {
            var k = String(word || '').trim().toLowerCase();
            if (!k || !/^[a-z]+$/.test(k)) return;
            // 词书里缺例句时，取「例句填充」预热到全局缓存的例句（炸弹锦囊出拼写题用）
            if (!example && window.__exFillCache && window.__exFillCache[k]) example = window.__exFillCache[k];
            var p = out[k];
            if (!p) { out[k] = { attempts: attempts || 0, wrong: wrong || 0, example: example || '' }; return; }
            p.attempts += attempts || 0;
            p.wrong += wrong || 0;
            if (!p.example && example) p.example = example;
        }

        function addItem(w) {
            if (!w) return;
            var defs = w.definitions || [];
            add(w.word || w.name, w.totalAttempts, w.wrongTimes, (defs[0] && defs[0].example) || w.example);
        }

        var books = (S_ && S_.loadBooks) ? (S_.loadBooks() || []) : [];
        books.forEach(function (b) {
            if (ids.indexOf(String(b.id)) < 0) return;
            (b.words || []).forEach(addItem);
        });
        if (ids.indexOf('favorites') >= 0 && S_ && S_.loadFavoriteItems) {
            (S_.loadFavoriteItems() || []).forEach(addItem);
        }
        return out;
    }

    // 手牌里当前可用的「炸弹锦囊」候选：能凑成、能压台面、本局与今日没用过，且有例句能出题。
    // 结果按手牌 / 编组 / 台面炸弹长度 / 已出词表缓存，避免每次重画都全量找一遍词。
    var charmCache = { key: '', list: null };
    function charmCandidates() {
        var g = S.game;
        if (!g || g.over || !DATA.ready || !DATA.wordSet) return [];
        var me = g.players[0];
        if (me.finished) return [];
        var usable = me.hand.filter(function (c) { return !isPacked(c.id); });
        // usedWords 必须进 key：对手出牌不会动我的手牌，若不算进去，
        // 对手刚打掉的那个词仍留在旧缓存里，锦囊会推荐一个本局已经用不了的炸弹。
        var key = usable.map(function (c) { return c.id; }).join(',') + '|' + (g.bombLevel || 0) + '|' +
            Object.keys(g.usedWords).sort().join(',') + '|' +
            S.packs.map(function (p) { return p.ids.join('.'); }).join(';');
        if (charmCache.key === key && charmCache.list) return charmCache.list;

        // 锦囊只认玩家自己词书里的炸弹（findBombs 已按 isBookWord 过滤），
        // 不再叠加 AI 的词汇视野 —— 那会把玩家明明拥有的炸弹挡在门外。
        var words = findBombs(usable, S.cfg.bombMin || 4, g.usedWords, g.bombLevel || 0, null);
        var stats = bookStatMap();
        // 手里捏着王炸（大王+小王）时，别推荐会烧掉其中一张王的炸弹 —— 那等于拆掉一颗
        // 能压任何牌的王炸。只有手里只剩单张王（凑不成王炸）时，才允许拿它当字母牌用。
        var keepJokers = !!jokerBombOf(usable);
        var list = [];
        words.forEach(function (w) {
            var st = stats[w];
            var ex = st && String(st.example || '').trim();
            if (!ex) return;                       // 没有例句就出不了拼写题
            var picked = pickCards(usable, w);
            if (!picked) return;
            if (keepJokers && picked.jokerFor.indexOf('大王') >= 0) return;
            if (keepJokers && picked.jokerFor.indexOf('小王') >= 0) return;
            var attempts = st.attempts || 0, wrong = st.wrong || 0;
            list.push({
                word: w, ids: picked.ids, jokerFor: picked.jokerFor, example: ex,
                // 正确率：没练过的按 0 算；练过的才进优先档（见 chooseCharmBomb）
                attempts: attempts,
                acc: attempts > 0 ? Math.max(0, (attempts - wrong) / attempts) : 0
            });
        });
        charmCache.key = key;
        charmCache.list = list;
        return list;
    }

    // 锦囊优先推荐「练过的词」（有练习记录者），只有这类词组不出炸弹时才退回没练过的。
    // 同一档内仍按「正确率越低越优先」加权随机（低正确率权重大，但保留随机性）。
    function chooseCharmBomb(list) {
        var practiced = list.filter(function (c) { return (c.attempts || 0) > 0; });
        var pool = practiced.length ? practiced : list;
        var total = 0;
        pool.forEach(function (c) { c.acc = c.acc || 0; total += (1 - c.acc) + 0.15; });
        var r = Math.random() * total;
        for (var i = 0; i < pool.length; i++) {
            r -= (1 - pool[i].acc) + 0.15;
            if (r <= 0) return pool[i];
        }
        return pool[pool.length - 1];
    }

    // 把例句里的目标词（含词形变化）挖成空格，得到一道拼写题
    function charmSentence(example, word) {
        var re = new RegExp('\\b' + word + '[a-z]*\\b', 'i');
        var m = example.match(re);
        var blank = '<b class="ep-charm-blank">' + word.length + ' 字母</b>';
        if (!m) return esc(example) + ' ' + blank;
        return esc(example.slice(0, m.index)) + blank + esc(example.slice(m.index + m[0].length));
    }

    // 锦囊拼写题的占位提示（只是 placeholder，不写进输入框，玩家仍要自己拼全）：
    // 困难档不给提示；普通档随机揭示 20% 的字母（至少 1 个）；简单档随机揭示一半。
    function charmPlaceholder(word) {
        var n = word.length;
        if (S.cfg.level === 'hard') return '输入单词';
        var reveal = S.cfg.level === 'easy'
            ? Math.round(n / 2)
            : Math.max(1, Math.round(n * 0.2));
        if (reveal >= n) reveal = n - 1;   // 至少留一个空格要自己填
        var idx = [];
        for (var i = 0; i < n; i++) idx.push(i);
        for (var j = n - 1; j > 0; j--) {  // 洗牌后取前 reveal 个位置揭示
            var k = Math.floor(Math.random() * (j + 1));
            var t = idx[j]; idx[j] = idx[k]; idx[k] = t;
        }
        var show = {};
        for (var m = 0; m < reveal; m++) show[idx[m]] = 1;
        var out = [];
        for (var p = 0; p < n; p++) out.push(show[p] ? word.charAt(p) : '_');
        return '输入 ' + out.join(' ') + ' 单词';
    }

    // 锦囊里附带的「最近练习时间」提示：翻出用户配置里该单词的记忆记录，
    // 取最近一次练习日期，按距今间隔生成一句话（今天/昨天/前天，或具体日期）。
    function charmPracticeHint(word) {
        var S_ = window.Storage;
        var mem = (S_ && S_.loadAllMemory) ? S_.loadAllMemory() : null;
        if (!mem) return '多积累练习哦，不然锦囊也帮不上你';
        var target = String(word || '').toLowerCase();
        var latest = '';
        Object.keys(mem).forEach(function (k) {
            var idx = k.indexOf(':');
            if (idx < 0) return;
            // 记忆键为「词书id:单词」，词书 id 不含冒号，故从首个冒号后取单词比对（忽略大小写）
            if (k.slice(idx + 1).toLowerCase() !== target) return;
            var m = mem[k] || {};
            var days = [];
            (m.history || []).forEach(function (h) { if (h && h.date) days.push(String(h.date)); });
            if (m.lastReviewDate) days.push(String(m.lastReviewDate));
            days.forEach(function (d) { if (d > latest) latest = d; });
        });
        if (!latest) return '多积累练习哦，不然锦囊也帮不上你';
        var parts = latest.slice(0, 10).split('-');
        var dt = new Date(+parts[0], (+parts[1]) - 1, +parts[2]);
        if (isNaN(dt.getTime())) return '多积累练习哦，不然锦囊也帮不上你';
        var now = new Date();
        var diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - dt) / 86400000);
        if (diff <= 0) return '你今天才刚练过';
        if (diff === 1) return '你昨天才刚练过';
        if (diff === 2) return '你前天才刚练过';
        return '你在' + (dt.getMonth() + 1) + '月' + dt.getDate() + '号练过这个单词';
    }

    function openCharm() {
        var g = S.game;
        if (!g || g.over || frozen()) return;
        var list = charmCandidates();
        if (!list.length) { toast('手里暂时凑不出可用的炸弹', 'info'); return; }
        var pick = chooseCharmBomb(list);
        S.charm = {
            word: pick.word,
            ids: pick.ids,
            jokerFor: pick.jokerFor,
            example: pick.example,
            sentence: charmSentence(pick.example, pick.word),
            hint: charmPracticeHint(pick.word),
            placeholder: charmPlaceholder(pick.word),
            phase: 'quiz',
            input: '',
            err: ''
        };
        render();
    }

    function submitCharm() {
        var c = S.charm;
        if (!c || c.phase !== 'quiz') return;
        var val = String(c.input || '').trim().toLowerCase().replace(/[^a-z]/g, '');
        if (val !== c.word) {
            c.err = '还不对，再想想——共 ' + c.word.length + ' 个字母';
            render();
            return;
        }
        // 拼对：切到祝贺画面，随后播放手牌自动选牌动画，组好这组炸弹
        c.phase = 'win';
        c.err = '';
        render();
        runCharmAnimation();
    }

    // 掷骰换一个锦囊：从候选里换掉当前这个词（仍然按正确率加权随机），
    // 题目与输入一并重置，并播放一次骰子旋转动画（与主程序「立即挑选」同一套动效）。
    function charmReroll() {
        var c = S.charm;
        if (!c || c.phase !== 'quiz') return;
        var others = charmCandidates().filter(function (x) { return x.word !== c.word; });
        if (!others.length) { toast('手里暂时没有别的炸弹可选了', 'info'); return; }
        // 丢开当前这题去换一个，也算锦囊未拼出：先记账，再换成新词
        recordCharmGiveUp(c);
        var pick = chooseCharmBomb(others);
        c.word = pick.word;
        c.ids = pick.ids;
        c.jokerFor = pick.jokerFor;
        c.example = pick.example;
        c.sentence = charmSentence(pick.example, pick.word);
        c.hint = charmPracticeHint(pick.word);
        c.placeholder = charmPlaceholder(pick.word);
        c.input = '';
        c.err = '';
        render();
        // render() 会重建 DOM，动画必须作用在重画后的新骰子上
        var dice = document.getElementById('epCharmDice');
        if (dice && typeof dice.animate === 'function') {
            dice.animate(
                [{ transform: 'rotate(0deg)' }, { transform: 'rotate(720deg)' }],
                { duration: 600, easing: 'ease-in-out' }
            );
        }
        focusCharmInput();
    }

    // 把一道「打开了锦囊却没拼出来」的题记进本局账（结算时单独复盘）：
    // 无论玩家是点了「放弃」，还是点了「换一个」把当前这题丢开，都算锦囊未拼出。
    function recordCharmGiveUp(c) {
        if (!c || c.phase !== 'quiz' || !c.word || !S.game) return;
        if (!S.game.charmGaveUp) S.game.charmGaveUp = [];
        var dup = S.game.charmGaveUp.some(function (x) { return x.word === c.word; });
        if (!dup) S.game.charmGaveUp.push({ word: c.word, example: c.example || '' });
    }

    function closeCharm() {
        // 还没拼出来就「放弃」：把这道题记进本局账（拼对者走的是动画自动关闭，不会记）
        recordCharmGiveUp(S.charm);
        S.charm = null;
        render();
    }

    function focusCharmInput() {
        var ci = document.getElementById('epCharmInput');
        if (!ci) return;
        try {
            ci.focus();
            ci.setSelectionRange(ci.value.length, ci.value.length);
        } catch (e) { /* 忽略 */ }
    }

    // 每 200ms 自动点亮一张牌，按单词顺序拼出这组炸弹；组好后淡出弹窗，
    // 选牌保留在拼牌条上，玩家可直接点「编组」或「打出」。
    function runCharmAnimation() {
        var c = S.charm;
        if (!c) return;
        S.selected = [];
        S.packPick = null;
        var ids = c.ids.slice();
        var i = 0;
        (function step() {
            if (S.charm !== c) return;
            if (i >= ids.length) {
                var el = document.querySelector('.ep-charm');
                if (el) el.classList.add('ep-charm-out');
                later(function () {
                    if (S.charm === c) { S.charm = null; render(); }
                }, 320);
                return;
            }
            S.selected.push(ids[i++]);
            render();
            later(step, 200);
        })();
    }

    /* ============================ 音效 ============================ */

    // 音效文件放仓库 static/audio/poker/ 下，web 端直接按相对路径读取，零下载、离线可用。
    // OB 发行包不内嵌 static/audio（避免 main.js 撑破 5MB），本地相对路径会 404，
    // 这时依次回退到「设置页下载的本地缓存 → GitHub raw 直链」。音频始终只有一份，不重复落盘。
    var AUDIO_REL_BASE = 'static/audio/poker/';
    var AUDIO_RAW_BASE = 'https://raw.githubusercontent.com/Losecloud/reciting/main/static/audio/poker/';
    var AUDIO_CACHE_KEY = 'epAudioPack';   // 只存本机（非镜像键），不进用户配置、不参与跨端同步

    var AUDIO = {
        urls: {},         // 音效名 -> data: URL
        ready: false,
        manifest: null,
        local: null       // 本地相对路径是否可用：null 未探测 / true 可用 / false 需远程
    };

    // 读本地缓存（跨会话复用，无需每次开桌都重新下载）
    function loadAudioCache() {
        if (AUDIO.ready) return true;
        try {
            var pack = JSON.parse(localStorage.getItem(AUDIO_CACHE_KEY) || 'null');
            if (!pack || !pack.files || typeof pack.files !== 'object') return false;
            var keys = Object.keys(pack.files);
            if (!keys.length) return false;
            AUDIO.urls = pack.files;
            AUDIO.ready = true;
            return true;
        } catch (e) { return false; }
    }

    // ArrayBuffer -> base64（分块处理，避免大数组展开触发调用栈上限）
    function bufToBase64(buf) {
        var bytes = new Uint8Array(buf);
        var out = '';
        var CH = 0x8000;
        for (var i = 0; i < bytes.length; i += CH) {
            out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
        }
        return btoa(out);
    }

    // 下载整包音效。onProgress(ratio, loaded, total, label)；ratio 为 null 表示总大小未知。
    // 串行下载：进度读条平滑、出错也好定位是哪一个文件。
    function downloadPokerAudio(onProgress) {
        var total = 0, loaded = 0;
        return fetch(AUDIO_RAW_BASE + 'manifest.json', { cache: 'no-store' })
            .then(function (r) {
                if (!r.ok) throw new Error('清单下载失败（HTTP ' + r.status + '）');
                return r.json();
            })
            .then(function (mf) {
                if (!mf || !Array.isArray(mf.files) || !mf.files.length) throw new Error('音效清单为空');
                AUDIO.manifest = mf;
                total = mf.bytes || 0;
                var files = {};
                var chain = Promise.resolve();
                mf.files.forEach(function (entry) {
                    chain = chain.then(function () {
                        if (onProgress) onProgress(total ? loaded / total : null, loaded, total, entry.label || entry.name);
                        return fetch(AUDIO_RAW_BASE + entry.file, { cache: 'no-store' })
                            .then(function (r) {
                                if (!r.ok) throw new Error('「' + (entry.label || entry.name) + '」下载失败（HTTP ' + r.status + '）');
                                return r.arrayBuffer();
                            })
                            .then(function (buf) {
                                files[entry.name] = 'data:audio/wav;base64,' + bufToBase64(buf);
                                loaded += buf.byteLength;
                                if (onProgress) onProgress(total ? loaded / total : null, loaded, total, entry.label || entry.name);
                            });
                    });
                });
                return chain.then(function () {
                    AUDIO.urls = files;
                    AUDIO.ready = true;
                    try {
                        localStorage.setItem(AUDIO_CACHE_KEY, JSON.stringify({ version: mf.version || 1, files: files }));
                    } catch (e) { /* 配额不足：内存里已可用，本次会话照常出声 */ }
                    return files;
                });
            });
    }

    // 探测「本地相对路径」是否可读：web 端与 OB 开发态为 true，OB 发行包为 false。
    // 只探一次并缓存结果，供 sfx 与设置页共用。
    function probeLocalAudio() {
        if (AUDIO.local !== null) return Promise.resolve(AUDIO.local);
        return new Promise(function (resolve) {
            var done = false;
            var finish = function (ok) {
                if (done) return;
                done = true;
                AUDIO.local = ok;
                resolve(ok);
            };
            var a = new Audio();
            a.addEventListener('loadedmetadata', function () { finish(true); });
            a.addEventListener('error', function () { finish(false); });
            setTimeout(function () { finish(false); }, 4000); // 兜底：个别环境不触发任何事件
            try {
                a.preload = 'metadata';
                a.src = AUDIO_REL_BASE + 'play.wav';
            } catch (e) { finish(false); }
        });
    }

    // 一个音效的候选地址，按优先级排列
    function audioSources(name) {
        if (AUDIO.local === true) return [AUDIO_REL_BASE + name + '.wav'];
        var remote = [];
        if (loadAudioCache() && AUDIO.urls[name]) remote.push(AUDIO.urls[name]); // 设置页下载的缓存
        remote.push(AUDIO_RAW_BASE + name + '.wav');                            // 未下载时在线直链
        if (AUDIO.local === false) return remote;
        return [AUDIO_REL_BASE + name + '.wav'].concat(remote);                 // 未探测：本地优先
    }

    function tryPlay(slot) {
        var a = slot.el;
        a.volume = 0.8;
        try { a.currentTime = 0; } catch (e) { /* 尚未可定位时忽略 */ }
        var p = a.play();
        if (p && p.catch) p.catch(function () { /* 自动播放策略：忽略 */ });
    }

    // 牌桌右上角音量按钮：只切对局音效，写进用户配置的 sound 字段（存哪都跟着走）。
    function toggleSound() {
        S.cfg.sound = (S.cfg.sound === false);
        saveCfg(S.cfg);
        var icon = document.querySelector('#epVolBtn i');
        var btn = document.getElementById('epVolBtn');
        if (icon) icon.className = (S.cfg.sound === false) ? 'fi-rr-volume-slash' : 'fi-rr-volume';
        if (btn) {
            btn.title = (S.cfg.sound === false) ? '音效已静音，点击开启' : '音效开启，点击静音';
            btn.setAttribute('aria-pressed', (S.cfg.sound === false) ? 'true' : 'false');
        }
        if (S.cfg.sound !== false) sfx('play');   // 开声时给一声，确认已生效
    }

    // 播放一个音效。牌桌自己的音效开关关掉、或所有候选地址都不可用时静默跳过，绝不干扰对局。
    // 注意：这里**不看**主设置的「音效提示」——英文扑克有自己的音量按钮（状态存在用户配置的 sound 字段）。
    function sfx(name) {
        if (S.cfg && S.cfg.sound === false) return;
        var slot = S.audio[name];
        if (!slot) {
            var list = audioSources(name);
            var el = new Audio();
            el.preload = 'auto';
            slot = S.audio[name] = { el: el, idx: 0, list: list };
            el.addEventListener('error', function () {
                // 本地相对路径在 OB 发行包里不存在：顺次回退到「下载缓存 → raw 直链」
                if (slot.idx + 1 < slot.list.length) {
                    slot.idx++;
                    el.src = slot.list[slot.idx];
                    tryPlay(slot);
                }
            });
            el.src = list[0];
        }
        tryPlay(slot);
    }

    // 音效包：进入英文扑克即**自动缓存**，无需用户操作，也不占用设置页文字。
    // 本地有文件就直接读（web 端 / OB 开发态），OB 发行包才从 GitHub 拉取并缓存到本机。
    // 状态只在对局中、音量按钮左侧闪现一下：加载中 → 已加载 3 秒 → 淡出。
    var SFX_HOLD_MS = 3000;
    var sfxState = { phase: 'loading', sizeKb: 0, doneAt: 0, localOk: false, busy: false, failed: false, hideTimer: null };

    function sfxReady() { return sfxState.localOk || loadAudioCache(); }

    // 把当前音效状态画到音量按钮左侧的提示上（只有牌桌视图有这个元素）
    function paintSfxStatus() {
        var el = document.getElementById('epVolHint');
        if (!el) return;
        if (sfxState.phase === 'loading') {
            el.textContent = '正在加载音效包' + (sfxState.sizeKb ? ' (' + sfxState.sizeKb + 'KB)' : '') + '…';
            el.classList.add('show');
            return;
        }
        if (sfxState.phase === 'done' && Date.now() < sfxState.doneAt) {
            el.textContent = '音效包已加载';
            el.classList.add('show');
            return;
        }
        el.classList.remove('show');   // 到点或未就绪：淡出
    }

    // 就绪后亮 3 秒再淡出；计时只在牌桌视图里起（进了牌桌才提醒）
    function holdSfxHint() {
        sfxState.phase = 'done';
        if (S.view === 'game') {
            sfxState.doneAt = Date.now() + SFX_HOLD_MS;
            if (sfxState.hideTimer) clearTimeout(sfxState.hideTimer);
            sfxState.hideTimer = setTimeout(paintSfxStatus, SFX_HOLD_MS + 60);
        }
        paintSfxStatus();
    }

    // 进入对局时调用：音效若已就绪，从现在起闪 3 秒「音效包已加载」
    function announceSfx() {
        if (sfxReady()) holdSfxHint();
        else paintSfxStatus();
    }

    // 打开英文扑克即自动缓存音效包；未下载完也不拦着开局，只是还没音效。
    function autoLoadSfx() {
        if (sfxState.busy || sfxState.failed || sfxReady()) { paintSfxStatus(); return; }
        sfxState.busy = true;
        sfxState.phase = 'loading';
        probeLocalAudio().then(function (local) {
            if (local) { sfxState.localOk = true; return; }
            if (loadAudioCache()) return;
            return downloadPokerAudio(function (ratio, loaded, total) {
                if (total) sfxState.sizeKb = Math.round(total / 1024);
                paintSfxStatus();
            });
        }).then(function () {
            sfxState.busy = false;
            holdSfxHint();
        }).catch(function () {
            sfxState.busy = false;
            sfxState.failed = true;     // 失败就静默重试退场：无音效也不影响对局
            sfxState.phase = 'idle';
            paintSfxStatus();
        });
    }

    /* ============================ 对局记录 ============================ */

    // 例句填充：为所选词书里缺例句的词，从「页面设置-例句填充」所选词典补位（后台预热）。
    // 词书经 Storage.loadBooks 每次重新解析，填充结果无法靠对象引用保留，故写入
    // window.__exFillCache 供 bookStatMap 兜底读取；预热完成后清空锦囊缓存并重绘。
    function warmBookExamples() {
        var app = window.app;
        var dictVar = app && app.settings && app.settings.exampleFillDict;
        if (!dictVar || !app || typeof app.fillMissingExample !== 'function') return;
        var ids = (S.cfg && S.cfg.bookIds) || [];
        var words = [];
        try {
            var books = (window.Storage && Storage.loadBooks) ? (Storage.loadBooks() || []) : [];
            books.forEach(function (b) {
                if (ids.indexOf(String(b.id)) < 0) return;
                (b.words || []).forEach(function (w) { if (w && w.word) words.push(w); });
            });
        } catch (e) { return; }
        var pending = words.filter(function (w) {
            var defs = w.definitions || [];
            var ex = (defs[0] && defs[0].example) || w.example || '';
            return !/[a-zA-Z]/.test(String(ex).trim());
        });
        if (!pending.length) return;
        var CAP = 200; // 上限，避免超长词书长时间占用
        var done = 0;
        (function run(i) {
            if (i >= pending.length || done >= CAP) {
                charmCache.key = ''; charmCache.list = null; // 例句可能变多：清缓存让锦囊重新计算
                if (S.dataReady) render();
                return;
            }
            done++;
            app.fillMissingExample(pending[i]).then(function () { run(i + 1); }, function () { run(i + 1); });
        })(0);
    }

    /* ============================ 对外接口 ============================ */
    var EnglishPoker = {
        open: function () {
            S.cfg = loadCfg();
            S.view = 'config';
            S.dataReady = false;
            refreshBookPool();
            DATA.ready = false; // 词书可能变过，重算一次
            ensureData(S.cfg).then(function () {
                S.dataReady = true;
                refreshBookPool();
                bind();
                render();
                warmBookExamples(); // 例句填充：为缺例句的炸弹词预热，供锦囊出拼写题
            });
            bind();
            render();
        },
        close: function () {
            clearTimers();
            S.busy = false;
            S.reveal = null;
            S.jokerPick = null;
        },
        // 供「设置」变更词书后重新开局时刷新炸弹池
        reload: function () { refreshBookPool(); }
    };

    window.EnglishPoker = EnglishPoker;
})();
