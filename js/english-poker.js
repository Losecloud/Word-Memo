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
 *   （当普通词还是炸弹都算），出炸弹时亮音标释义；
 * - 一个墩要「其余人全过」才收，有人跟得上就继续绕圈跟 —— 所以牌权归最后出牌者，不是一轮就定；
 * - 普通单词查全量基础词典（10 万词），所以小词书也不会把对局卡死；
 * - AI 强弱 = 词汇视野（CEFR 档）× 选牌策略（贪短 / 适中 / 抢长）× 失误率，
 *   它只看得见自己的手牌与桌面公开信息，绝不偷看。
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
    var HAND_SIZE = 27; // 108 / 4，掼蛋原版发牌数
    var SEAT_NAMES = ['你', '下家', '对家', '上家'];
    var AI_NAMES = ['你', '阿禾', '老 K', '小满'];
    var MAX_WORD_LEN = 12;
    var BOMB_HOLD_MS = 3000;   // 出炸弹后，亮出音标释义并停顿的时长（不看清楚就容易误以为被普通牌压了）

    // 三档 AI：词汇视野（CEFR 档位）× 选牌策略 × 失误率。
    // 「愚蠢度」不靠单一维度：限词 + 只会贪心 + 会看走眼，三样叠加才像人菜。
    var LEVELS = {
        easy: {
            label: '简单', cefr: ['A1', 'A2'],
            leadPick: 'short', maxLead: 3, singleLead: 0.30,
            passChance: 0.28, blunder: 0.25, bombChance: 0.35
        },
        normal: {
            label: '普通', cefr: ['A1', 'A2', 'B1', 'B2'],
            leadPick: 'mid', maxLead: 6, singleLead: 0.10,
            passChance: 0.08, blunder: 0.08, bombChance: 0.65
        },
        hard: {
            label: '困难', cefr: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            leadPick: 'long', maxLead: 10, singleLead: 0,
            passChance: 0, blunder: 0, bombChance: 1
        }
    };

    var DEFAULT_CFG = { bookIds: [], level: 'normal', bombMin: 4, hints: false };

    /* ============================ 词库数据 ============================ */

    var DATA = {
        ready: false,
        wordSet: null,      // 全部合法单词（基础词典 ∪ CEFR ∪ 词书）
        byLen: null,        // 长度 -> 单词数组
        cefr: null,         // { A1: [words], ... }
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

        if (dict) { for (var k in dict) add(k); }
        if (cefr) {
            for (var lv in cefr) cefr[lv].forEach(add);
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

    function dictEntry(w) {
        var d = DATA.dict;
        if (!d) return null;
        var e = d[w];
        if (e && Array.isArray(e)) return { phonetic: e[0] || '', meaning: e[1] || '' };
        return null;
    }

    // 日志 / 悬浮提示里附一段释义，复盘时不用再查（词典没收录就什么都不加）
    function meaningSuffix(w, max) {
        var de = dictEntry(w);
        if (!de || !de.meaning) return '';
        var m = de.meaning;
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

    // 手牌里所有能凑出的炸弹：长度 ≥ max(炸弹门槛, 台面炸弹长度)、在词书里、且本局没用过
    function findBombs(hand, bombMin, used, minLen, known) {
        var min = Math.max(bombMin || 4, minLen || 0);
        var out = findAll(hand, min, MAX_WORD_LEN, known).filter(isBookWord);
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
        hintWords: null,
        dataReady: false,
        timers: [],
        busy: false
    };

    /* —— 选牌（有序）：点选加入、再点移出，拖动 / 键盘可改顺序 —— */

    // 浮层进行中（炸弹展示 / 王的多词选择）：牌桌输入一律封住，先处理浮层
    function frozen() { return !!(S.reveal || S.jokerPick); }

    function isJokerCard(c) { return !!c && (c.code === JOKER_C || c.code === JOKER_V); }

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

    // 从一把牌里解析出词：手动模式看选牌顺序，提示模式看字母组合
    function findWordFor(cards) {
        if (isOrdered()) return resolveOrdered(cards);
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
        var err = levelCheck(pack.word, !!pack.isBomb, { isLead: g.phase === 'lead' });
        if (err) { toast(err, 'info'); return; }
        var byId = {};
        g.players[0].hand.forEach(function (c) { byId[c.id] = c; });
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
            aiBombs: [],
            roundNo: 1
        };
        S.selected = [];
        S.packs = [];
        S.packPick = null;
        S.reveal = null;
        S.jokerPick = null;
        S.hintWords = null;
        S.view = 'game';
        logLine('发牌完毕，每人 ' + HAND_SIZE + ' 张。你先出牌。');
        beginRound(0);
        render();
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
        S.selected = [];
        S.packPick = null;
        S.hintWords = null;
        logLine('—— 第 ' + g.roundNo + ' 墩：' + seatName(leader) + '先出 ——');
    }

    function seatName(s) {
        return s === 0 ? '你' : (SEAT_NAMES[s] + ' ' + AI_NAMES[s]);
    }

    function logLine(text) {
        if (!S.game) return;
        S.game.logs.push(text);
        if (S.game.logs.length > 60) S.game.logs.shift();
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
     * 按「选牌顺序」解析单词：真实字母必须落在它被选中的那个位置上（顺序即词形）。
     * 含王时，列出**所有**匹配的词（王位类型也要匹配）—— 同一个字母组合常能拼出好几个词，
     * 该由玩家自己挑（见 jokerChoices 的弹窗）；无王时最多一个。
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
            var ok = true;
            for (var p = 0; p < n; p++) {
                var c = codes[p];
                if (c === JOKER_C) { if (isVowel(cand.charAt(p))) { ok = false; break; } }
                else if (c === JOKER_V) { if (!isVowel(cand.charAt(p))) { ok = false; break; } }
                else if (cand.charAt(p) !== c) { ok = false; break; }
            }
            if (ok) out.push(cand);
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
        if (g.level <= 1) {
            return g.singleTop
                ? '单牌要比 ' + singleTopText(g.singleTop) + ' 更大'
                : '本墩是单牌局，只能跟单牌';
        }
        return '本墩要跟 ' + g.level + ' 个字母的单词';
    }

    // 出牌门槛：普通词必须同字数；炸弹能压任何普通牌，且炸弹之间「同长或更长」即可压
    function levelCheck(word, useBomb, opts) {
        var g = S.game;
        // 本局出过的词不能再用（不管当时是当普通词还是炸弹出的）
        if (g.usedWords[word]) return '「' + word.toUpperCase() + '」本局已经用过了';
        if (useBomb) {
            if (g.bombLevel > 0 && word.length < g.bombLevel) {
                return '炸弹要同样长或更长才能压过（当前 ' + g.bombLevel + ' 字母炸弹）';
            }
        } else {
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

        // 单张：只能跟「台面就是单牌」的局面，或自己是领出者；跟单牌还必须比台面的大
        if (n === 1) {
            if (g.bombLevel > 0) return { ok: false, err: '台面上有炸弹，只能用炸弹压' };
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
            for (var i = 0; i < bucket.length; i++) {
                var w = bucket[i];
                if (canForm(w, hc)) { normal = w; break; }
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
            len: res.len,
            count: removed.length,
            codes: codes,   // 牌河要照着这几张牌、按词的顺序画出来
            jokerFor: res.jokerFor || []
        };
        g.roundPlays.push(play);
        g.lastPlayer = seat;
        g.passCount = 0;   // 有人成功出牌，「连续不出」从头数
        p.lastPlay = play;
        p.plays.push(play);

        if (res.isBomb) {
            g.usedWords[res.word] = 1;
            g.bombLevel = res.len;
            if (seat === 0) g.humanWords.push(res.word); else g.aiBombs.push(res.word);
            logLine(seatName(seat) + ' 打出炸弹 ' + res.word.toUpperCase() + '（' + res.len + ' 字母）' +
                meaningSuffix(res.word));
        } else {
            // 单牌也要记门槛（=1）：这样「单牌只能跟单牌」才立得住
            g.level = Math.max(g.level, res.len);
            if (res.len > 1) {
                g.usedWords[res.word] = 1;
                if (seat === 0) g.humanWords.push(res.word);
                logLine(seatName(seat) + ' 出 ' + res.word.toUpperCase() + '（' + res.len + ' 字母）' +
                    meaningSuffix(res.word));
            } else {
                // 单牌只能越出越大：记下本墩最高的一张，别人要么出更大的、要么用炸弹
                if (!g.singleTop || singleRank(codes[0]) > singleRank(g.singleTop)) g.singleTop = codes[0];
                logLine(seatName(seat) + ' 出单牌 ' + displayCode(removed[0]));
            }
        }

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
        easy: [450, 900],
        normal: [1000, 1800],
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
            render();
            advance();
            return;
        }
        var res = validate(decision.cards, { isLead: g.phase === 'lead' });
        if (!res.ok) {
            // 兜底：AI 算错就退回「过」，绝不把对局卡住
            g.passCount++;
            logLine(seatName(seat) + ' 不出');
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

    function decideLead(p, lv, g) {
        var hand = p.hand;
        var known = DATA.known[S.cfg.level];
        var bombMin = S.cfg.bombMin || 4;
        var maxNormal = Math.max(2, Math.min(lv.maxLead, bombMin - 1));

        // 笨的一档偶尔领出单张甩废牌（像人犯懒）
        if (Math.random() < lv.singleLead) {
            var junk = worstSingle(hand);
            if (junk) return { action: 'play', cards: [junk], asBomb: false };
        }

        // 普通领出只走「门槛以下」的短词；够门槛的长词是炸弹，留着压人
        var words = freshWords(findAll(hand, 2, maxNormal, known));
        if (!words.length) words = freshWords(findAll(hand, 2, Math.max(2, bombMin - 1), known));

        if (!words.length) {
            var bombs = findBombs(hand, bombMin, g.usedWords, 0, known);
            if (bombs.length) {
                bombs.sort(function (a, b) { return a.length - b.length; });
                return { action: 'play', cards: makeCards(hand, bombs[0]), asBomb: true };
            }
            var s = worstSingle(hand);
            return { action: 'play', cards: s ? [s] : [], asBomb: false };
        }

        words.sort(function (a, b) { return a.length - b.length; });
        var pick;
        if (lv.blunder > 0 && Math.random() < lv.blunder) {
            pick = words[Math.floor(Math.random() * words.length)];
        } else if (lv.leadPick === 'long') {
            pick = words[words.length - 1];
        } else if (lv.leadPick === 'mid') {
            pick = pickLongestAtMost(words, 3) || words[0];
        } else {
            pick = words[0];
        }
        return { action: 'play', cards: makeCards(hand, pick), asBomb: false };
    }

    function decideFollow(p, lv, g) {
        var hand = p.hand;
        var known = DATA.known[S.cfg.level];
        var bombMin = S.cfg.bombMin || 4;
        var bombOnTable = g.bombLevel > 0;

        // 台面是单牌时能跟，但只能跟**更大**的单牌（王与 z 同级，出到 z 就封顶了）
        var canSingle = !bombOnTable && g.level <= 1;
        var single = canSingle
            ? singleAbove(hand, g.singleTop ? singleRank(g.singleTop) : -1)
            : null;

        // 台面是 N 字母普通词：只能跟同样字数的词（不能拿更长的去压，那是炸弹的活）
        var words = [];
        if (!bombOnTable && g.level >= 2) words = freshWords(findAll(hand, g.level, g.level, known));

        var bombs = findBombs(hand, bombMin, g.usedWords, g.bombLevel, known);
        bombs.sort(function (a, b) { return a.length - b.length; });

        var canPlay = !!(words.length || single);

        // 能跟却选择过（失误 / 保守）
        if (canPlay && Math.random() < lv.passChance) return { action: 'pass' };

        if (canPlay) {
            if (single) return { action: 'play', cards: [single], asBomb: false };
            words.sort(function (a, b) { return a.length - b.length; });
            var pick = words[0];
            if (lv.blunder > 0 && Math.random() < lv.blunder) pick = words[Math.floor(Math.random() * words.length)];
            return { action: 'play', cards: makeCards(hand, pick), asBomb: false };
        }

        // 只能靠炸弹
        if (bombs.length && Math.random() < lv.bombChance) {
            var b = (lv.leadPick === 'short') ? bombs[0] : bombs[bombs.length - 1];
            return { action: 'play', cards: makeCards(hand, b), asBomb: true };
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

    function pickLongestAtMost(words, cap) {
        var best = null;
        for (var i = 0; i < words.length; i++) {
            if (words[i].length <= cap) best = words[i];
        }
        return best;
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

    function settle() {
        var g = S.game;
        if (g.over) return;
        g.over = true;
        clearTimers();
        g.finalRanks = rankAll();
        g.missed = computeMissed();
        logLine('—— 本局结束 ——');
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
        // 字母牌：大写居中 + 下方一行不起眼的小写（认牌更顺手）；
        // 王没有小写，改标它的「万能范围」。
        var sub = code === JOKER_C ? '辅音' : (code === JOKER_V ? '元音' : code);
        var attrs = opts.attrs || '';
        return '<div class="' + cls + '" ' + attrs + '>' +
            '<span class="ep-card-letter">' + label + '</span>' +
            '<span class="ep-card-sub">' + sub + '</span>' +
            '</div>';
    }

    // 一次出牌渲染成牌面：照着实际打出的那几张牌画（单牌也画成牌，不写「单牌」两个字）
    function playHTML(play) {
        if (!play) return '<span class="ep-none">—</span>';
        var codes = (play.codes && play.codes.length) ? play.codes
            : (play.word ? play.word.split('') : []);
        if (!codes.length) return '<span class="ep-none">—</span>';
        var tiles = '<span class="ep-word-tiles">' + codes.map(function (c) {
            return cardHTML({ code: c }, { small: true });
        }).join('') + '</span>';
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
        return '<div class="' + cls + '">' +
            '<div class="ep-avatar"><span>' + esc(initial) + '</span></div>' +
            '<div class="ep-seat-name">' + esc(p.name) + '</div>' +
            '<div class="ep-seat-meta"><span class="ep-seat-count">' + p.hand.length + ' 张</span>' +
            '<span class="ep-seat-state">' + state + '</span></div>' +
            '</div>';
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
        if (S.view === 'config') { root.innerHTML = renderConfig(); return; }
        if (S.view === 'result') { root.innerHTML = renderResult(); return; }
        root.innerHTML = renderGame();
        markOverlaps();
    }

    function renderConfig() {
        var S_ = window.Storage;
        var books = (S_ && S_.loadBooks) ? (S_.loadBooks() || []) : [];
        var favs = (S_ && S_.loadFavoriteItems) ? (S_.loadFavoriteItems() || []) : [];
        var ids = S.cfg.bookIds;

        var rows = '';
        if (favs.length) {
            rows += '<label class="ep-book"><input type="checkbox" data-ep-book="favorites"' +
                (ids.indexOf('favorites') >= 0 ? ' checked' : '') + '>' +
                '<span class="ep-book-name"><i class="fi-rr-star"></i>收藏单词</span>' +
                '<span class="ep-book-count">' + favs.length + ' 词</span></label>';
        }
        books.forEach(function (b) {
            var n = (b.words || []).length;
            rows += '<label class="ep-book"><input type="checkbox" data-ep-book="' + esc(b.id) + '"' +
                (ids.indexOf(String(b.id)) >= 0 ? ' checked' : '') + '>' +
                '<span class="ep-book-name">' + esc(b.name || '未命名词书') + '</span>' +
                '<span class="ep-book-count">' + n + ' 词</span></label>';
        });
        if (!rows) {
            rows = '<div class="ep-empty">还没有词书。请先在主界面导入词书，再来开局——' +
                '词书决定 AI 与提示能想到的词，也决定哪些长词算炸弹。</div>';
        }

        var bombCount = BOOK_WORDS.filter(function (w) { return w.length >= S.cfg.bombMin; }).length;

        var lvOpts = '';
        for (var k in LEVELS) {
            lvOpts += '<option value="' + k + '"' + (S.cfg.level === k ? ' selected' : '') + '>' +
                LEVELS[k].label + '</option>';
        }
        var bombOpts = '';
        [4, 5, 6].forEach(function (v) {
            bombOpts += '<option value="' + v + '"' + (S.cfg.bombMin === v ? ' selected' : '') + '>' +
                v + ' 个字母起</option>';
        });

        return '<div class="ep-config">' +
            '<div class="ep-config-head"><h3>开桌设置</h3>' +
            '<span>选好词书与难度，坐庄开局</span></div>' +
            '<div class="ep-rule-brief">' +
            '<b>玩法</b>：领出者拼一个单词（或甩单牌），其余人必须跟「字数相同」的单词，跟不动就过。' +
            '一圈下来（其余人都过）本墩才收，有人跟得上就继续循环跟下去。' +
            '够 ' + S.cfg.bombMin + ' 字母<b>且在你词书里</b>的词是<b class="ep-gold">金色炸弹</b>，' +
            '能压掉任何普通牌，且要拿同样长或更长的炸弹来压。每个词全场只能用一次（当普通词还是炸弹都算）。' +
            '甩单牌只能<b>越出越大</b>（A→Z），出到 Z 之后只能用炸弹夺回牌权 —— 尾牌也好借此出手。' +
            '先出完手牌者胜，血战到底排完 4 名。' +
            '</div>' +
            '<div class="ep-field">' +
            '<div class="ep-field-label">词书（决定 AI 与提示的词库，也决定哪些长词算炸弹）</div>' +
            '<div class="ep-books" id="epBooks">' + rows + '</div>' +
            '<div class="ep-books-foot" id="epBombCount">词书里够门槛的炸弹词：<b>' + bombCount + '</b> 个（≥' +
            S.cfg.bombMin + ' 字母）；词书外的长词只能当普通牌出</div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">AI 难度</label>' +
            '<select class="form-select setting-select" id="epLevel">' + lvOpts + '</select>' +
            '<div class="ep-hint-text">难度 = 词汇视野 × 选牌策略 × 失误率，越简单越容易看走眼。</div></div>' +
            '<div class="form-group"><label class="form-label">炸弹门槛</label>' +
            '<select class="form-select setting-select" id="epBombMin">' + bombOpts + '</select>' +
            '<div class="ep-hint-text">越长越难凑，也越难被压。</div></div>' +
            '</div>' +
            '<label class="ep-book ep-inline"><input type="checkbox" id="epHints"' +
            (S.cfg.hints ? ' checked' : '') + '><span class="ep-book-name">开启提示（列出可出的词、点了自动选牌）；关闭时按「选牌顺序」拼词，更考验手法</span></label>' +
            (S.dataReady ? '' : '<div class="ep-loading">词库加载中，请稍候…</div>') +
            '<div class="ep-actions"><button class="ep-btn ep-btn-gold ep-btn-big" id="epStartBtn"' +
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

        var req = g.bombLevel > 0
            ? '台面炸弹 ' + g.bombLevel + ' 字母，需同样长或更长的炸弹'
            : (g.level === 0 ? '等你领出'
                : (g.level <= 1
                    ? (g.singleTop ? '单牌需大于 ' + singleTopText(g.singleTop) : '单牌局')
                    : '需 ' + g.level + ' 字母'));

        var handHTML = '';
        me.hand.forEach(function (c) {
            var packed = isPacked(c.id);
            handHTML += cardHTML(c, {
                sel: !packed && pickIndexOf(c.id) >= 0,
                cls: packed ? 'ep-card-packed' : '',
                attrs: 'data-ep-card="' + c.id + '"'
            });
        });

        var myTurn = (g.turn === 0 && !g.over);
        var ordered = isOrdered();

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
            var perr = levelCheck(dealt.word, !!dealt.isBomb, { isLead: g.phase === 'lead' });
            check = perr
                ? '<span class="ep-check ep-check-bad"><i class="fi-rr-cross-small"></i>' + esc(perr) + '</span>'
                : '<span class="ep-check ep-check-ok"><b>' + esc(dealt.word.toUpperCase()) + '</b>' +
                '<em>' + dealt.codes.length + ' 字母</em>' +
                (dealt.isBomb ? '<span class="ep-bomb-tag">炸弹</span>' : '') +
                '<em class="ep-check-note">点「' + (g.phase === 'lead' ? '出牌' : '跟牌') + '」放出</em></span>';
        } else if (picked.length) {
            var res = validate(picked, { isLead: g.phase === 'lead', ordered: ordered });
            if (res.ok) {
                check = '<span class="ep-check ep-check-ok">' +
                    '<b>' + (res.word ? esc(res.word.toUpperCase()) : '单牌 ' + esc(displayCode(picked[0]))) + '</b>' +
                    '<em>' + res.len + ' 字母</em>' +
                    (res.isBomb ? '<span class="ep-bomb-tag">炸弹</span>' : '') +
                    '</span>';
            } else {
                check = '<span class="ep-check ep-check-bad"><i class="fi-rr-cross-small"></i>' + esc(res.err) + '</span>';
            }
        } else {
            check = '<span class="ep-check ep-check-idle">' + (g.turn === 0
                ? (g.phase === 'lead' ? '选牌后点「出牌」领出这一墩' : needText() + '，或点「不出」')
                : esc(seatName(g.turn)) + ' 出牌中…可先把你的牌备好') + '</span>';
        }

        var preview = '<div class="ep-preview"><span class="ep-word-tiles ep-pickzone" id="epPickZone">' +
            pickTiles + '</span>' + check + '</div>';

        // 编组好的牌组：堆在操作区最右侧，点它选中、再点「跟牌」放出。
        // 炸弹组金色高亮；词书外的普通词组保持素色 —— 它只能按普通牌的门槛打出。
        var packsHTML = S.packs.map(function (pk, i) {
            var tiles = pk.codes.map(function (code) {
                return cardHTML({ code: code }, { small: true });
            }).join('');
            return '<span class="ep-pack' + (pk.isBomb ? ' ep-pack-bomb' : ' ep-pack-plain') +
                (S.packPick === i ? ' ep-pack-on' : '') + '" data-ep-pack="' + i + '"' +
                ' title="' + esc(wordTip(pk.word)) + '">' +
                '<span class="ep-pack-cards">' + tiles + '</span>' +
                '<span class="ep-pack-word">' + esc(pk.word.toUpperCase()) + '<em>' + pk.codes.length + '</em>' +
                (pk.isBomb ? '' : '<b class="ep-pack-tag">普通</b>') + '</span>' +
                '<span class="ep-pack-x" data-ep-unpack="' + i + '" title="解散这一组"><i class="fi-rr-cross-small"></i></span>' +
                '</span>';
        }).join('');

        var actions = '';
        var canPack = !dealt && !!packableWord(picked);
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
            if (S.cfg.hints) {
                actions += '<button class="ep-btn ep-btn-hint" id="epHintBtn"><i class="fi-rr-bulb"></i>提示</button>';
            }
        } else {
            actions = '<div class="ep-wait">' + esc(seatName(g.turn)) + ' 正在思考…</div>';
            if (canPack) {
                actions += '<button class="ep-btn ep-btn-pack" id="epPackBtn"><i class="fi-rr-layers"></i>编组</button>';
            }
        }
        if (packsHTML) actions += '<div class="ep-packs" id="epPacks">' + packsHTML + '</div>';

        var hints = '';
        if (S.hintWords && S.hintWords.length) {
            hints = '<div class="ep-hints">' + S.hintWords.map(function (h) {
                return '<button class="ep-hint-chip' + (h.bomb ? ' ep-hint-bomb' : '') +
                    '" data-ep-hint="' + esc(h.token) + '">' + esc(h.label) +
                    '<em>' + h.len + '</em></button>';
            }).join('') + '</div>';
        } else if (S.hintWords && !S.hintWords.length) {
            hints = '<div class="ep-hints ep-hints-empty">没有能跟上的词，只能不出或用炸弹。</div>';
        }

        // 对局记录按发生顺序自上而下排（最新一条在最下面）：和牌河的左→右同向，
        // 免得把「谁最后出牌、牌权归谁」看反。
        var logs = g.logs.slice(-6).map(function (t) {
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
            revealHTML +
            jokerHTML +
            rz[2] + rz[3] + rz[1] + rz[0] +
            '<div class="ep-slot ep-slot-top">' + seatPanelHTML(g.players[2], g) + '</div>' +
            '<div class="ep-slot ep-slot-left">' + seatPanelHTML(g.players[3], g) + '</div>' +
            '<div class="ep-slot ep-slot-right">' + seatPanelHTML(g.players[1], g) + '</div>' +
            '</div>' +

            '<div class="ep-my">' +
            '<div class="ep-my-head"><span class="ep-my-name">你的手牌</span>' +
            '<span class="ep-my-count">' + me.hand.length + ' 张</span>' +
            (me.finished ? '<span class="ep-done-tag">已出完 · 第 ' + me.rank + ' 名</span>' : '') +
            '</div>' +
            '<div class="ep-hand" id="epHand">' + handHTML + '</div>' +
            '<div class="ep-under">' + preview + '</div>' +
            '<div class="ep-actions">' + actions + '</div>' +
            hints +
            '</div>' +

            '<div class="ep-logs"><div class="ep-log-h">对局记录</div>' +
            '<div class="ep-log">' + logs + '</div></div>' +
            '</div>';
    }

    function renderResult() {
        var g = S.game;
        var ranks = g.finalRanks || [];
        var rows = ranks.map(function (p) {
            var meCls = p.isHuman ? ' ep-rank-me' : '';
            var medal = p.rank === 1 ? '🥇' : (p.rank === 2 ? '🥈' : (p.rank === 3 ? '🥉' : '4'));
            return '<div class="ep-rank-row' + meCls + '">' +
                '<span class="ep-rank-medal">' + medal + '</span>' +
                '<span class="ep-rank-name">' + esc(p.name) + (p.isHuman ? '（你）' : '') + '</span>' +
                '<span class="ep-rank-state">' + (p.finished ? '已出完' : '剩 ' + p.hand.length + ' 张') + '</span>' +
                '<span class="ep-rank-words">' + (p.plays.filter(function (x) { return x.word; }).length) + ' 词</span>' +
                '</div>';
        }).join('');

        var mine = g.humanWords.slice();
        var myWordsHTML = '';
        if (mine.length) {
            myWordsHTML = mine.map(function (w) {
                var e = dictEntry(w);
                var bomb = isBombWord(w, S.cfg.bombMin);
                return '<div class="ep-review-item' + (bomb ? ' ep-review-bomb' : '') + '">' +
                    '<span class="ep-review-word">' + esc(w.toUpperCase()) + (bomb ? '<i class="fi-sr-bolt"></i>' : '') + '</span>' +
                    (e && e.phonetic ? '<span class="ep-review-ph">' + esc(e.phonetic) + '</span>' : '') +
                    (e && e.meaning ? '<span class="ep-review-mean">' + esc(e.meaning) + '</span>' : '') +
                    '</div>';
            }).join('');
        } else {
            myWordsHTML = '<div class="ep-empty">这一局你一个单词都没出。</div>';
        }

        var missedHTML = '';
        if (g.missed && g.missed.length) {
            missedHTML = g.missed.map(function (m) {
                var e = dictEntry(m.word);
                return '<div class="ep-review-item' + (m.bomb ? ' ep-review-bomb' : '') + '">' +
                    '<span class="ep-review-word">' + esc(m.word.toUpperCase()) + '</span>' +
                    (e && e.phonetic ? '<span class="ep-review-ph">' + esc(e.phonetic) + '</span>' : '') +
                    (e && e.meaning ? '<span class="ep-review-mean">' + esc(e.meaning) + '</span>' : '') +
                    (m.bomb ? '<span class="ep-review-tag">词书炸弹</span>' : '') +
                    '</div>';
            }).join('');
        } else {
            missedHTML = '<div class="ep-empty">起手牌里没漏掉什么像样的词，打得不错。</div>';
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
            '<div class="ep-review">' +
            '<h4><i class="fi-rr-star"></i>复盘 · 你拼出的词</h4>' + myWordsHTML +
            '<h4><i class="fi-rr-bulb"></i>复盘 · 你本来还能拼出这些</h4>' + missedHTML +
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
                applyHint(hint.dataset.epHint);
                return;
            }
            var t = e.target.closest('button');
            if (!t) return;
            if (t.id === 'epStartBtn') { startMatch(); return; }
            if (t.id === 'epPlayBtn') {
                if (S.packPick !== null && S.packs[S.packPick]) humanPlayPack();
                else humanPlay();
                return;
            }
            if (t.id === 'epPackBtn') { packBomb(); return; }
            if (t.id === 'epPassBtn') { humanPass(); return; }
            if (t.id === 'epHintBtn') { showHints(); return; }
            if (t.id === 'epQuitBtn') { settle(); return; }
            if (t.id === 'epAgainBtn') { startMatch(); return; }
            if (t.id === 'epConfigBtn') { S.view = 'config'; render(); return; }
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
            if (t.dataset && t.dataset.epBook !== undefined) {
                var id = t.dataset.epBook;
                var list = S.cfg.bookIds.slice();
                var at = list.indexOf(id);
                if (t.checked && at < 0) list.push(id);
                if (!t.checked && at >= 0) list.splice(at, 1);
                S.cfg.bookIds = list;
                saveCfg(S.cfg);
                refreshBookPool();
                render();
                return;
            }
            if (t.id === 'epLevel') { S.cfg.level = t.value; saveCfg(S.cfg); render(); return; }
            if (t.id === 'epBombMin') {
                S.cfg.bombMin = Number(t.value) || 4;
                saveCfg(S.cfg);
                refreshBookPool();
                render();
                return;
            }
            if (t.id === 'epHints') { S.cfg.hints = !!t.checked; saveCfg(S.cfg); render(); return; }
        });

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

    function showHints() {
        var g = S.game;
        if (!g || g.turn !== 0) return;
        var known = DATA.known && DATA.known[S.cfg.level];
        var hand = g.players[0].hand;
        var bombMin = S.cfg.bombMin || 4;
        var out = [];

        function addBombs(minLen) {
            findBombs(hand, bombMin, g.usedWords, minLen, known)
                .sort(function (a, b) { return a.length - b.length; })
                .slice(0, 4).forEach(function (w) {
                    out.push({ token: '__bomb__' + w, label: w.toUpperCase(), len: w.length, bomb: true });
                });
        }

        if (g.bombLevel > 0) {
            // 台面是炸弹：只能拿同样长或更长的炸弹压
            addBombs(g.bombLevel);
        } else if (g.level >= 2) {
            // 台面是 N 字母普通词：只能跟同字数，或拿炸弹压
            freshWords(findAll(hand, g.level, g.level, known)).sort(function (a, b) { return a.length - b.length; })
                .slice(0, 8).forEach(function (w) {
                    out.push({ token: w, label: w.toUpperCase(), len: w.length });
                });
            addBombs(0);
        } else {
            // 领出（level 0）或台面是单牌（level 1）：能甩更大的单牌
            var top = g.singleTop ? singleRank(g.singleTop) : -1;
            if (g.level === 0 ? !!worstSingle(hand) : !!singleAbove(hand, top)) {
                out.push({ token: '__single__', label: '甩单牌', len: 1 });
            }
            if (g.level === 0) {
                freshWords(findAll(hand, 2, Math.max(2, bombMin - 1), known))
                    .sort(function (a, b) { return a.length - b.length; })
                    .slice(0, 8).forEach(function (w) {
                        out.push({ token: w, label: w.toUpperCase(), len: w.length });
                    });
            }
            addBombs(0);
        }
        S.hintWords = out;
        render();
    }

    function applyHint(token) {
        var g = S.game;
        if (!g) return;
        var hand = g.players[0].hand;
        if (token === '__single__') {
            var s = g.phase === 'lead' || !g.singleTop
                ? worstSingle(hand)
                : singleAbove(hand, singleRank(g.singleTop));
            S.selected = s ? [s.id] : [];
            render();
            return;
        }
        var isBomb = token.indexOf('__bomb__') === 0;
        var word = isBomb ? token.slice(8) : token;
        var picked = pickCards(hand, word);
        if (!picked) { toast('手牌凑不出这个词了', 'info'); return; }
        S.selected = picked.ids.slice();
        render();
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
