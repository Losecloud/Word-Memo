// ============================================
// 单词星云封面（基于 Three.js 的 3D 星云渲染）
// 依赖：lib/three.min.js、Storage
// 独立模块，避免污染主应用类
// ============================================
(function (global) {
    'use strict';

    var Storage = global.Storage;

    // 解析主题主色（canvas fillStyle 不支持 CSS var()，需解析为具体色值）
    function primaryColor() {
        try {
            var v = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
            v = (v || '').trim();
            if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
        } catch (e) { /* 忽略 */ }
        return '#4a9d9a';
    }

    var state = {
        renderer: null,
        scene: null,
        camera: null,
        group: null,
        tip: null,
        raf: null,
        animTime: 0,
        themeOverride: null, // 临时主题覆盖（按目标主题重建文字色，不改变页面 data-theme）
        selected: [], // 默认词单在 apply()/switchFromImport() 中按新用户默认“示例单词”解析
        favoritesLoaded: false,
        controlsBound: false,
        levelCache: null,
        dragging: false, // 中键拖拽旋转状态
        dragX: 0,
        dragY: 0,
        touchMoved: false, // 触屏本次按下是否已拖动过（用于区分点击与旋转手势）
        zoom: 1, // 滚轮缩放倍率（仅影响星云结构，不影响文字大小）
        zoomTextScale: 1, // 文字补偿系数，抵消整体缩放
        details: [], // 显示详情：phonetic/meaning/example（单词为基础行，星云/词卡始终显示）
        fontSize: 2.5, // 字体大小倍率（新用户/游客默认 2.5）
        speed: 0.1, // 旋转速度倍率（默认 0.1）
        initialized: false, // 星云是否已成功初始化（避免切回封面时重复重建）
        wordColor: primaryColor(), // 单词文字颜色（默认跟随主题主色 var(--primary-color)）
        invertZoom: false, // 缩放反向：开启后滚轮上下方向反转
        cluster: 'none', // 单词聚类（多选，逗号分隔）：none=无, root=词根, similar=形近词，如 'root,similar'
        layout: 'natural', // 排布风格：natural=自然（无序错开）, spiral=螺旋 Spiral（同心旋转轨道分层均布）
        rootDict: null, // 词根词缀词典数据（data/英语词根词缀词频-dict.js），惰性加载
        rootDictLoaded: false,
        rootFamilyCache: {}, // word -> { root, family }
        simKeys: null, // 形近词索引：基础词典全部键（惰性构建一次，只存引用）
        simLenIndex: null, // 形近词索引：Map<长度, [键,...]>（长度分桶粗筛）
        simCache: {}, // word -> [{ w, sim }]（形近词匹配结果内存缓存，相似度降序；收藏词等无词单归属的词用）
        simBookCache: {}, // bookId -> { word: [{w,sim}] }（从词单 similarCache 加载的持久化缓存，优先读取）
        simDirty: {}, // bookId -> { word: [{w,sim}] }（本次渲染新计算、待写回词单的缓存）
        zhCache: {}, // 中文逆向查词缓存：q -> [{w, phonetic, meaning}]
        connections: null, // 词根聚类激活连线：{ lines:[{line,satPos}], progress, start, dur }，从主词中心向四周延展动画
        mainSprites: null, // 主词 Sprite 列表 [{ spr, w, s, drawSize }]，聚类卫星在其上分帧追加
        satellitesPending: false, // 聚类卫星是否仍在分帧渲染中（期间不启动播放动画）
        satChunkTimer: null, // 聚类卫星分帧渲染的 rAF id（重建时取消防重复）
        lastBuildKey: null, // 上次 build 的输入指纹（词单内容 + 配置），用于判断返回封面时是否真的需要重建
        cardTimer: null, // 卡片 1 分钟自动隐藏的定时器
        lastCardWord: null, // 当前正在展示卡片的单词，避免重复重建
        cardSprite: null, // 当前展示卡片的 Sprite，用于跟随旋转
        cardWidth: null, // 卡片的实际渲染宽度缓存（用于水平居中定位）
        cardHeight: null // 卡片的实际渲染高度缓存（用于判断上/下方翻转）
    };

    // 星云封面右下角配置的存储键（已迁移到用户配置 aiWorkspace.nebulaCover，此处不再使用）

    // 读取缓存配置（仅读按用户隔离的用户配置；全局旧键是跨用户共享的残留，不再回退，避免新用户/游客被旧值污染）
    function loadConfig() {
        try {
            if (Storage && typeof Storage.loadNebulaConfig === 'function') {
                var userCfg = Storage.loadNebulaConfig();
                if (userCfg) return userCfg;
            }
        } catch (e) { /* 忽略 */ }
        return null;
    }

    // 保存缓存配置（写入按用户隔离的用户配置；不再写跨用户共享的全局键）
    function saveConfig(config) {
        try {
            // 统一附带当前单词颜色与缩放反向，避免各调用点遗漏
            if (typeof state.wordColor === 'string') config.wordColor = state.wordColor;
            config.invertZoom = !!state.invertZoom;
            config.cluster = state.cluster;
            config.layout = state.layout;
            if (Storage && typeof Storage.saveNebulaConfig === 'function') {
                Storage.saveNebulaConfig(config);
            }
        } catch (e) { /* 忽略 */ }
    }

    // 构建 CEFR 等级快速查找（Set 加速）
    function ensureLevelCache() {
        if (state.levelCache) return state.levelCache;
        var cache = { A1: null, A2: null, B1: null, B2: null, C1: null, C2: null };
        try {
            // CEFR_DATA 以 const 声明（挂在全局词法环境，而非 window 属性），需直接引用标识符
            var data = typeof global.CEFR_DATA !== 'undefined' ? global.CEFR_DATA
                : (typeof CEFR_DATA !== 'undefined' ? CEFR_DATA : null);
            var levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
            if (data) {
                levels.forEach(function (lv) {
                    var arr = data[lv];
                    if (Array.isArray(arr)) {
                        cache[lv] = new Set(arr.map(function (s) { return String(s).toLowerCase(); }));
                    }
                });
            }
        } catch (e) { /* 忽略 */ }
        state.levelCache = cache;
        return cache;
    }

    // Three.js 是否可用
    function threeReady() {
        return typeof global.THREE !== 'undefined';
    }

    // 读取当前用户的 defaultCover 设置
    function getDefaultCover() {
        try {
            var cfg = Storage.getUserConfig();
            if (cfg && cfg.basicSettings && cfg.basicSettings.defaultCover) {
                return cfg.basicSettings.defaultCover;
            }
        } catch (e) { /* 忽略 */ }
        return 'import';
    }

    // 构建当前星云输入的指纹（词单内容 + 全部配置）：用于判断返回封面时输入是否真的变化，
    // 避免关闭浏览词单等无修改操作触发重复 build（loader + 形近词/附属词重新渲染）
    function makeBuildKey(words, sort) {
        var parts = [
            'sort=' + sort,
            'sel=' + state.selected.join(','),
            'details=' + state.details.join(','),
            'font=' + state.fontSize,
            'speed=' + state.speed,
            'color=' + state.wordColor,
            'invert=' + (state.invertZoom ? 1 : 0),
            'cluster=' + state.cluster,
            'layout=' + state.layout,
            'theme=' + (isDarkMode() ? 'dark' : 'light'),
            'rootDict=' + (state.rootDictLoaded ? 1 : 0),
            'baseDict=' + (global.ENGLISHWORDS_DICT ? 1 : 0)
        ];
        (words || []).forEach(function (w) {
            parts.push((w.word || '') + '|' + (w.phonetic || '') + '|' + (w.meaning || '') + '|' + (w.bookId || ''));
        });
        return parts.join('\u0001');
    }

    // 根据设置的默认封面切换欢迎页两种封面
    function apply() {
        var importEl = document.getElementById('coverImport');
        var nebulaEl = document.getElementById('coverNebula');
        if (!importEl || !nebulaEl) return;

        var cover = getDefaultCover();
        if (cover === 'nebula') {
            importEl.classList.add('hidden');
            nebulaEl.classList.remove('hidden');
            // 恢复缓存配置：选中的词单集合
            var cfg = loadConfig();
            if (cfg && Array.isArray(cfg.selected) && cfg.selected.length) {
                state.selected = cfg.selected.slice();
                var sortSelect = document.getElementById('nebulaSortBy');
                if (sortSelect && cfg.sort) { sortSelect.value = cfg.sort; syncPicker(sortSelect); }
            } else {
                // 新用户/游客默认：选中内置“示例单词”词单（不存在则自动创建）
                var demo = ensureDemoBook();
                state.selected = demo ? [String(demo.id)] : [];
            }
            // 恢复缓存配置：显示详情（旧配置中的 word 为必显基础项，不再作为选项，过滤掉）
            if (cfg && Array.isArray(cfg.details) && cfg.details.length) {
                state.details = cfg.details.filter(function (k) { return k !== 'word'; });
            }
            // 恢复缓存配置：字体大小、旋转速度
            if (cfg && typeof cfg.fontSize === 'number') {
                state.fontSize = cfg.fontSize;
            }
            if (cfg && typeof cfg.speed === 'number') {
                state.speed = cfg.speed;
            }
            // 恢复缓存配置：单词颜色
            if (cfg && typeof cfg.wordColor === 'string') {
                state.wordColor = cfg.wordColor;
            }
            // 恢复缓存配置：缩放反向
            if (cfg && typeof cfg.invertZoom === 'boolean') {
                state.invertZoom = cfg.invertZoom;
            }
            // 恢复缓存配置：单词聚类（多选，逗号分隔：root=词根 / similar=形近词）
            if (cfg && typeof cfg.cluster === 'string') {
                var parts = String(cfg.cluster).split(',').filter(function (p) { return p === 'root' || p === 'similar'; });
                state.cluster = parts.length ? parts.join(',') : 'none';
            }
            // 恢复缓存配置：排布风格（natural/spiral）
            if (cfg && typeof cfg.layout === 'string') {
                state.layout = (cfg.layout === 'spiral') ? 'spiral' : 'natural';
            }
            // 等待容器可见后再初始化/恢复渲染
            setTimeout(function () {
                bindControls();
                // 词根聚类需词根词典（词族/词根说明）；词根与形近词的附属词音标/释义都来自基础英文词典
                var ensureDicts = function (done) {
                    var tasks = [];
                    if (clusterActive('root') && !state.rootDictLoaded) {
                        tasks.push(loadRootDict());
                    }
                    if (hasClusterOf() && (typeof global.ENGLISHWORDS_DICT === 'undefined' || !global.ENGLISHWORDS_DICT)) {
                        tasks.push(loadBaseDict());
                    }
                    if (!tasks.length) { done(); return; }
                    showLoader(true);
                    Promise.all(tasks).then(function () {
                        showLoader(false);
                        // 基础词典就绪后预热形近词索引（位掩码桶），避免首次分帧渲染时构建索引卡顿
                        if (global.ENGLISHWORDS_DICT && hasClusterOf()) ensureSimIndexes();
                        done();
                    });
                };
                // 统一加载流程：先确保星云所需词条（词根/基础词典）就绪，再渲染主词 + 分帧补卫星，
                // 全部就绪后才播放动画，避免"先播放 → 后加载词条 → 再重建"造成的 3D 卡顿
                ensureDicts(function () {
                    if (state.initialized) {
                        // 输入无变化（如关闭浏览词单且未做任何修改）：场景已就绪，无需重建/重算形近词，
                        // 仅确保动画在运行即可，避免 loader + 附属词重新渲染造成"重新拉取"的错觉
                        var sortNow = document.getElementById('nebulaSortBy') ? document.getElementById('nebulaSortBy').value : 'cefr';
                        if (state.group && state.lastBuildKey === makeBuildKey(collectWords(), sortNow)) {
                            if (!state.raf && !state.satellitesPending) animate();
                            return;
                        }
                        // 已初始化过：重建主词 + 分帧卫星（loader 遮罩阻塞式重建），播放由 afterSatellites 统一接管
                        runWithLoader(function () { build(); }, function () {
                            if (!state.satellitesPending && !state.raf) animate();
                        });
                    } else {
                        // 首次构建：主词渲染完成即可见，卫星分帧跟进渲染，全部就绪后播放
                        runWithLoader(function () { init(); }, function () {
                            if (!state.satellitesPending && !state.raf) animate();
                        });
                    }
                });
            }, 80);
        } else {
            importEl.classList.remove('hidden');
            nebulaEl.classList.add('hidden');
            stop();
        }
    }

    // 生成文字纹理（无描边），按设备像素比放大以获得高清/自适应清晰度
    // 支持多行：text 可为数组，元素可为字符串或 { text, size }（size 为该行字号相对比例）
    function makeTextTexture(text, opts) {
        opts = opts || {};
        var fontSize = opts.fontSize || 64;
        var fontFamily = opts.fontFamily || 'Inter, system-ui, sans-serif';
        var fontWeight = opts.fontWeight || '700';
        var color = opts.color || '#ffffff';
        // 规范化多行：统一为 { text, size } 对象
        var lines = Array.isArray(text) ? text : String(text).split('\n');
        lines = lines.map(function (l) {
            if (typeof l === 'object' && l !== null) {
                return { text: l.text || ' ', size: l.size || 1 };
            }
            return { text: l || ' ', size: 1 };
        });
        // 高清倍率：随设备像素比自适应，上限 3 避免过大纹理拖慢性能
        var dpr = Math.min(global.devicePixelRatio || 1, 3);
        var scale = opts.scale || dpr;

        // 用主字号测量行高
        var measureCtx = document.createElement('canvas').getContext('2d');
        var maxW = 0;
        lines.forEach(function (line) {
            measureCtx.font = fontWeight + ' ' + (fontSize * line.size * scale) + 'px ' + fontFamily;
            maxW = Math.max(maxW, measureCtx.measureText(line.text).width);
        });
        var lineHeight = Math.round(fontSize * 0.92 * scale);
        var tw = Math.ceil(Math.max(64, maxW + 24));
        var th = Math.ceil(lineHeight * lines.length + 16);
        var canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        var ctx = canvas.getContext('2d');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        lines.forEach(function (line, i) {
            var px = fontSize * line.size * scale;
            ctx.font = fontWeight + ' ' + px + 'px ' + fontFamily;
            if (opts.outline) {
                // 描边以突出显示（仅选中时）：深色模式用白色，浅色模式用黑色
                ctx.strokeStyle = isDarkMode() ? '#ffffff' : '#000000';
                ctx.lineWidth = Math.max(2, Math.round(scale * 0.35));
                ctx.lineJoin = 'round';
                ctx.strokeText(line.text, tw / 2, (16 + lineHeight * (i + 0.5)));
            }
            ctx.fillText(line.text, tw / 2, (16 + lineHeight * (i + 0.5)));
        });
        var tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4; // 各向异性过滤，旋转时文字更清晰
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.needsUpdate = true;
        return { texture: tex, aspect: tw / th };
    }

    // 根据显示详情设置，组装单词的多行标签文本
    // 返回 [{ text, size }]，size 为该行相对主字号的比例（单词100%、音标80%、释义50%）
    function buildWordLines(w) {
        var lines = [];
        // 单词（必显基础行，作为主行），100%
        if (w.word) {
            lines.push({ text: w.word, size: 1 });
        }
        // 音标，80%
        if (state.details.indexOf('phonetic') !== -1 && w.phonetic) {
            lines.push({ text: w.phonetic, size: 0.8 });
        }
        // 释义：默认显示最多10个汉字，后面用 ... 替代（词性前缀如 adj.），50%
        if (state.details.indexOf('meaning') !== -1 && w.meaning) {
            var posPrefix = w.pos ? w.pos.trim() : '';
            var m = String(w.meaning).trim();
            // 释义若已带词性则不重复前缀
            var full = (posPrefix && m.indexOf(posPrefix) !== 0) ? posPrefix + m : m;
            var cut = 10;
            var meaningLine = full;
            if (full.length > cut) {
                meaningLine = full.slice(0, cut) + '..';
            }
            lines.push({ text: meaningLine, size: 0.5 });
        }
        // 至少显示一个词单，若全未勾选词则退化为主行
        if (lines.length === 0) {
            lines.push({ text: w.word || '?', size: 1 });
        }
        return lines;
    }

    // 收集选中的词
    function collectWords() {
        var words = [];
        var seen = {};
        var books = Storage.loadBooks();
        var hasFav = state.selected.indexOf('favorites') !== -1;

        function pushWord(w, createdAt, source, bookId) {
            var key = String((w.word || (w.name || '')).trim()).toLowerCase();
            if (!key || seen[key]) return;
            seen[key] = true;
            var errRate = -1;
            if ((w.totalAttempts || 0) > 0) {
                errRate = Math.round(((w.wrongTimes || 0) / w.totalAttempts) * 100);
            }
            var def0 = (w.definitions && w.definitions[0]) || {};
            words.push({
                word: w.word || w.name || '',
                phonetic: w.phonetic || '',
                pos: def0.pos || '',
                meaning: def0.meaning || '',
                example: def0.example || '',
                createdAt: createdAt || '',
                errorRate: errRate,
                source: source || '',
                bookId: bookId || '' // 所属词单 id（形近词结果持久化到该词单缓存）；收藏固定 'favorites'
            });
        }

        if (hasFav) {
            (Storage.loadFavoriteItems() || []).forEach(function (f) { pushWord(f, f.createdAt, '收藏', 'favorites'); });
        }
        state.selected.forEach(function (id) {
            if (id === 'favorites') return;
            var book = books.find(function (b) { return String(b.id) === String(id); });
            if (book) {
                (book.words || []).forEach(function (w) { pushWord(w, book.createdAt, book.name, book.id); });
            }
        });
        return words;
    }

    // 程序化回填下拉值后，同步自绘下拉（setting-select）的触发器文字。
    // 封面模块可能早于 app.js 初始化，故存在性判断后再调用
    function syncPicker(id) {
        if (window.app && window.app.refreshSettingPicker) window.app.refreshSettingPicker(id);
    }

    // 词量过大的静默提示：只说明可能掉帧，无需任何操作
    function updateScaleWarn(total) {
        var el = document.getElementById('nebulaScaleWarn');
        if (!el) return;
        if (total > 1000) {
            el.textContent = '已选 ' + total + ' 词。单词量超过 1000 个同时显示时，可能会降低动画帧率与体验效果';
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    // 依据排序计算每个词离核心的远近（closeness，越大越靠里）
    function computeCloseness(words, sortBy) {
        var levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

        // 第一步：按排序维度计算每个词的原始内聚度 raw（0=最外，1=最里）
        if (sortBy === 'cefr') {
            words.forEach(function (w) {
                var lv = getWordLevel(w.word);
                // 无等级则取 0~1 的随机值，避免全部落在中间层
                if (lv === -1) {
                    w._raw = Math.random();
                } else {
                    w._raw = 1 - lv / 5; // 等级越低越靠里
                }
            });
        } else if (sortBy === 'error') {
            words.forEach(function (w) {
                var er = w.errorRate < 0 ? Math.random() * 60 : w.errorRate; // 未练习按随机 0-60%
                w._raw = Math.max(0, Math.min(1, 1 - er / 100));
            });
        } else { // imported：越旧越靠里，按加入时间相对归一
            var times = words.map(function (w) {
                var t = new Date(w.createdAt).getTime();
                return isNaN(t) ? 0 : t;
            });
            var minT = times.length ? Math.min.apply(null, times) : 0;
            var maxT = times.length ? Math.max.apply(null, times) : 0;
            words.forEach(function (w) {
                var t = new Date(w.createdAt).getTime();
                var v = isNaN(t) ? minT : t;
                var frac = (maxT - minT) > 0 ? (v - minT) / (maxT - minT) : Math.random();
                w._raw = 1 - frac;
            });
        }

        // 第二步：raw 分档为若干同心球壳，档内再加微扰，保证每层单词都能看清里外关系
        // 档位越多层次越密，档数 = 0.5 + n/6 自适应词量，防止词多都挤一层
        var n = words.length;
        var bands = n <= 6 ? 6 : Math.min(20, Math.ceil(n * 0.6));
        // 为避免同档粘连，用 (band + 微小偏移)/bands 落在球壳上
        words.forEach(function (w) {
            var band = Math.max(0, Math.min(bands - 1, Math.floor(w._raw * bands)));
            // 档内 0~1 微扰，进一步分散同档词；同时保留档位主导（权重 0.7）
            var inBand = Math.random();
            w.closeness = (1 / bands) * (band + inBand * 0.85);
        });
        // 归一化，确保贴近 0~1
        var minC = Math.min.apply(null, words.map(function (w) { return w.closeness; }));
        var maxC = Math.max.apply(null, words.map(function (w) { return w.closeness; }));
        var denom = (maxC - minC) || 1;
        words.forEach(function (w) {
            w.closeness = (w.closeness - minC) / denom;
        });
    }

    // 获取单词 CEFR 等级索引（用引擎的 cefrData；找不到返回 -1）
    function getWordLevel(word) {
        var levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        var cache = ensureLevelCache();
        var lw = String(word || '').toLowerCase();
        for (var i = 0; i < levels.length; i++) {
            var set = cache[levels[i]];
            if (set && set.has(lw)) return i;
        }
        return -1;
    }

    // 获取单词 CEFR 等级字符串（'A1'~'C2'，未命中返回 ''）
    function cefrOf(word) {
        var idx = getWordLevel(word);
        if (idx === -1) return '';
        return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][idx];
    }

    // 根据排序方式生成半径
    function sortLabel(count) {
        return '共 ' + count + ' 词';
    }

    // 核心文字
    function coreText() {
        var names = [];
        if (state.selected.indexOf('favorites') !== -1) names.push('收藏');
        state.selected.forEach(function (id) {
            if (id === 'favorites') return;
            var b = Storage.loadBooks().find(function (x) { return String(x.id) === String(id); });
            if (b && b.name) names.push(b.name);
        });
        return names.slice(0, 2).join(' · ') || '词星';
    }

    // 是否深色模式（优先读主题覆盖值，便于"按新主题重建但不改页面 theme"）
    function isDarkMode() {
        if (state.themeOverride) return state.themeOverride === 'dark';
        try {
            return (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
        } catch (e) { return false; }
    }

    // 核心文字颜色：让词单名融入背景、弱化存在感，不喧宾夺主
    // 浅色模式用近似背景的白色（背景浅灰），深色模式用近似背景的黑色（背景深灰）
    function coreTextColor() {
        return isDarkMode() ? '#000000' : '#ffffff';
    }

    // 惰性加载词根词缀词典（data/英语词根词缀词频-dict.js，约13MB，仅启用词根聚类时加载一次）
    function loadRootDict() {
        if (state.rootDictLoaded) return Promise.resolve(state.rootDict);
        return new Promise(function (resolve) {
            var s = document.createElement('script');
            s.src = 'data/英语词根词缀词频-dict.js?v=2';
            s.onload = function () {
                state.rootDictLoaded = true;
                try {
                    // var 顶层声明同时挂 window，两种途径兜底
                    state.rootDict = (typeof 英语词根词缀词频_DICT !== 'undefined') ? 英语词根词缀词频_DICT
                        : (global['英语词根词缀词频_DICT'] || null);
                } catch (e) { state.rootDict = null; }
                resolve(state.rootDict);
            };
            s.onerror = function () { state.rootDictLoaded = true; state.rootDict = null; resolve(null); };
            document.head.appendChild(s);
        });
    }

    // 惰性加载基础英文词典（data/englishwords-dict.js，提供音标与释义，约4.6MB；词根聚类附属词词卡/3D详情用）
    function loadBaseDict() {
        if (global.ENGLISHWORDS_DICT) return Promise.resolve(global.ENGLISHWORDS_DICT);
        return new Promise(function (resolve) {
            var s = document.createElement('script');
            s.src = 'data/englishwords-dict.js';
            s.onload = function () { resolve(global.ENGLISHWORDS_DICT || null); };
            s.onerror = function () { resolve(null); };
            document.head.appendChild(s);
        });
    }

    // 从基础词典查询单词的音标与释义：数据格式 { word: [音标, 释义] }，未命中返回 null
    function lookupBaseDict(word) {
        var d = global.ENGLISHWORDS_DICT;
        if (!d) return null;
        var entry = d[String(word || '').toLowerCase()];
        if (entry && Array.isArray(entry)) return { phonetic: entry[0] || '', meaning: entry[1] || '', category: entry[2] || '' };
        return null;
    }

    // 聚类是否启用（多选逗号分隔）：clusterActive('root') / clusterActive('similar')
    function clusterActive(name) {
        return String(state.cluster || 'none').split(',').indexOf(name) !== -1;
    }

    // 是否启用了任意聚类（星云有卫星）
    function hasClusterOf() {
        return clusterActive('root') || clusterActive('similar');
    }

    // 从词根词条单行原始 HTML 中提取词频指数：
    // 优先 <font color=blue> N </font>（COCA 词频排名），其次 ★N；无则返回 null
    function extractRootFreq(rawLine) {
        if (!rawLine) return null;
        var bm = /<font[^>]*color\s*=\s*['"]?blue['"]?[^>]*>\s*(\d+)\s*<\/font>/i.exec(rawLine);
        if (bm) return parseInt(bm[1], 10);
        var sm = /★\s*(\d+)/.exec(rawLine);
        if (sm) return parseInt(sm[1], 10);
        return null;
    }

    // 解析词根词典词条：提取词根说明（teal 行）与同根词族（其后每行行首单词，附词频指数与成员行释义数据）
    // family: [{ w, freq, data }]，freq 为词频指数（数字越小越常用），无词频时 freq=null；
    // data 为该成员行解析出的 { word, pos, meaning, ... }，供卫星词词卡显示（无独立键的成员词也能取到释义）
    function parseRootEntry(html) {
        var root = '';
        var family = [];
        if (!html) return { root: root, family: family };
        var m = /<font[^>]*color\s*=\s*['"]?teal['"]?[^>]*>([^<]*)<\/font>/i.exec(String(html));
        if (!m) return { root: root, family: family };
        root = m[1].replace(/<[^>]+>/g, '').trim();
        var body = String(html).slice(m.index + m[0].length);
        body.split(/(?:\\r\\n|\\n|<br\s*\/?>)/gi).forEach(function (line) {
            var raw = String(line);
            var plain = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
            var wm = /^([A-Za-z][A-Za-z'-]*)/.exec(plain);
            if (wm) {
                var w = wm[1].toLowerCase();
                if (w && family.every(function (it) { return it.w !== w; })) {
                    family.push({ w: w, freq: extractRootFreq(raw), data: parseRootLineData(raw, w) });
                }
            }
        });
        return { root: root, family: family };
    }

    // 获取某词的同根词族（带缓存）
    function getRootFamily(word) {
        if (!state.rootDict) return null;
        var key = String(word || '').toLowerCase();
        if (state.rootFamilyCache[key] !== undefined) return state.rootFamilyCache[key];
        var info = state.rootDict[key] != null ? parseRootEntry(state.rootDict[key]) : null;
        state.rootFamilyCache[key] = info;
        return info;
    }

    // 同根词族显示优先级（词根聚类专用）：
    // 词频指数越低（越常用）越优先显示；无词频的排最后。
    // 提醒：其他聚类可能采用不同优先级，扩展时按聚类分别实现排序即可。
    function sortRootFamily(fam) {
        return fam.slice().sort(function (a, b) {
            var fa = (a.freq == null) ? Infinity : a.freq;
            var fb = (b.freq == null) ? Infinity : b.freq;
            return fa - fb;
        });
    }

    // 从词根词典单行原始 HTML 中提取"构成解释"（词源括号说明）：
    // 优先取 <font color=indianred> 内的括号内容，如 perfect 行的 "(per 全部+fect=全部做完=完美的)"
    function extractStructure(raw) {
        if (!raw) return '';
        var im = /<font[^>]*color\s*=\s*['"]?indianred['"]?[^>]*>\s*\(?([\s\S]*?)\)?\s*<\/font>/i.exec(String(raw));
        if (im) return im[1].replace(/<[^>]+>/g, '').trim();
        // 兜底：纯文本中取第一个半角括号组
        var plain = String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        var pm = /\(([^()]*)\)/.exec(plain);
        return pm ? pm[1].trim() : '';
    }

    // 从词根词典单行原始 HTML 解析词性/释义/构成解释/词频指数（词卡显示用）
    // 形如 "oracle n 神谕,先知(ora+acle 东西=神说出的东西=神谕)27055"
    function parseRootLineData(raw, fallbackWord) {
        if (!raw) return null;
        var plain = String(raw).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
        if (!plain) return null;
        var word = fallbackWord || '';
        var wm = /^([A-Za-z][A-Za-z'-]*)\s*/.exec(plain);
        if (wm) {
            word = wm[1];
            plain = plain.slice(wm[0].length);
        }
        var pos = '';
        var pm = /^([a-zA-Z]+\.?)\s*/.exec(plain);
        if (pm) { pos = pm[1]; plain = plain.slice(pm[0].length); }
        // 中文释义：取连续中文（含引号/逗号/顿号），再截掉词源括号与词频尾巴
        var rest = plain.trim();
        var mm = /^([\u4e00-\u9fa5“”‘’]+(?:[，,、·:：；;\s][\u4e00-\u9fa5“”‘’]+)*)/.exec(rest);
        var meaning = '';
        if (mm) {
            meaning = mm[1].replace(/[“”‘’]/g, '').split('(')[0].split('（')[0].trim();
        }
        return { word: word, phonetic: '', pos: pos, meaning: meaning, structure: extractStructure(raw), example: '', source: '同根词', freq: extractRootFreq(String(raw)) };
    }

    // 从词根词典词条（独立键）解析卫星词的词性/释义/词频指数（词卡显示用）
    function parseRootWordData(word) {
        if (!state.rootDict) return null;
        var html = state.rootDict[word];
        if (html == null) return null;
        var first = String(html).split(/<br\s*\/?>/i)[0] || '';
        return parseRootLineData(first, word);
    }

    // ==================== 形近词匹配模块 ====================
    // 匹配规则（final = 0.45×位序一致率 + 0.35×连续匹配度 + 0.20×长度接近度）：
    // 1) 位序一致率 = LCS长度 / max(len)：如 dominate/nominate（第一位不同，其余可为公共子序列对齐）≈ 87%
    // 2) 连续匹配度 = 最长连续公共子串 / max(len)：如 impose/purpose 共享中间词干
    // 3) 长度接近度 = 1 - |Δlen| / max(len)：如 condemn/conduct
    // 粗筛（分层漏斗，避免 15 万词全量精算）：
    //   ① 长度分桶 ±2（与"序号接近/前缀雷同"基本等价：字典序相邻的词长度也大多相近）
    //   ② 公共字符数快速剔除（≥ max(3, round(L×0.5))），仅剩几十~几百候选
    //   ③ 精算 LCS + 最长公共子串（O(L²) 廉价）
    // 阈值：相似度 < 0.30 不显示；最多返回 top maxN（默认 8）；结果按 word 缓存（内存占小，重复查询零成本）
    // 单词字母位掩码（去重 a-z，用于 O(1) 粗筛，忽略非字母）
    function letterMask(word) {
        var m = 0;
        for (var i = 0; i < word.length; i++) {
            var c = word.charCodeAt(i);
            if (c >= 97 && c <= 122) m |= 1 << (c - 97);
        }
        return m;
    }
    function bitCount(x) {
        x = x - ((x >> 1) & 0x55555555);
        x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
        return ((x + (x >> 4) & 0x0F0F0F0F) * 0x01010101) >> 24;
    }
    function ensureSimIndexes() {
        if (state.simKeys) return;
        var d = global.ENGLISHWORDS_DICT;
        if (!d) { state.simKeys = []; state.simLenIndex = new Map(); return; }
        var keys = Object.keys(d);
        var lenIndex = new Map();
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var len = k.length;
            var bucket = lenIndex.get(len);
            if (!bucket) { bucket = { keys: [], masks: [] }; lenIndex.set(len, bucket); }
            bucket.keys.push(k);
            bucket.masks.push(letterMask(k));
        }
        state.simKeys = keys;
        state.simLenIndex = lenIndex;
    }
    // LCS 长度（滚动一维 DP）
    function lcsLength(a, b) {
        var bCodes = new Array(b.length);
        for (var j = 0; j < b.length; j++) bCodes[j] = b.charCodeAt(j);
        var prev = new Array(b.length + 1).fill(0);
        for (var i = 1; i <= a.length; i++) {
            var cur = new Array(b.length + 1).fill(0);
            var aCh = a.charCodeAt(i - 1);
            for (var j1 = 1; j1 <= b.length; j1++) {
                if (aCh === bCodes[j1 - 1]) cur[j1] = prev[j1 - 1] + 1;
                else cur[j1] = cur[j1 - 1] > prev[j1] ? cur[j1 - 1] : prev[j1];
            }
            prev = cur;
        }
        return prev[b.length];
    }
    // 最长连续公共子串长度（滚动一维 DP）
    function longestCommonSubstring(a, b) {
        var bCodes = new Array(b.length);
        for (var j = 0; j < b.length; j++) bCodes[j] = b.charCodeAt(j);
        var prev = new Array(b.length + 1).fill(0);
        var best = 0;
        for (var i = 1; i <= a.length; i++) {
            var cur = new Array(b.length + 1).fill(0);
            var aCh = a.charCodeAt(i - 1);
            for (var j1 = 1; j1 <= b.length; j1++) {
                if (aCh === bCodes[j1 - 1]) { cur[j1] = prev[j1 - 1] + 1; if (cur[j1] > best) best = cur[j1]; }
            }
            prev = cur;
        }
        return best;
    }
    // 综合相似度：0.45 位序一致率 + 0.35 连续匹配度 + 0.20 长度接近度
    function computeSimilarity(a, b) {
        var maxLen = Math.max(a.length, b.length) || 1;
        var r1 = lcsLength(a, b) / maxLen;
        var r2 = longestCommonSubstring(a, b) / maxLen;
        var r3 = 1 - Math.abs(a.length - b.length) / maxLen;
        return 0.45 * r1 + 0.35 * r2 + 0.20 * r3;
    }
    // 从词单加载某词已缓存的形近词结果（bookId 为空或 'favorites' 时无持久化缓存，返回 null）
    function loadSimFromBook(bookId, word) {
        if (!bookId || bookId === 'favorites') return null;
        var bookCache = state.simBookCache[bookId];
        if (bookCache === undefined) {
            // 首次访问该词单：从词单数据加载 similarCache（bookId 校验，避免脏数据）
            var book = Storage.loadBooks().find(function (b) { return String(b.id) === String(bookId); });
            bookCache = (book && book.similarCache && typeof book.similarCache === 'object') ? book.similarCache : {};
            state.simBookCache[bookId] = bookCache;
        }
        var hit = bookCache[word];
        return hit ? hit : null;
    }

    // 记录本次新计算的形近词缓存，渲染完成后统一写回词单（避免逐词 saveBooks 拖慢分帧）
    function noteSimDirty(bookId, word, results) {
        if (!bookId || bookId === 'favorites') return; // 收藏词仅用内存 simCache
        if (!state.simDirty[bookId]) state.simDirty[bookId] = {};
        state.simDirty[bookId][word] = results;
        // 同步到读缓存，本次渲染内后续同词直接命中
        if (!state.simBookCache[bookId]) state.simBookCache[bookId] = {};
        state.simBookCache[bookId][word] = results;
    }

    // 渲染全部完成后：把本次新增的形近词缓存合并写回各词单并保存（每词单一次 saveBooks）
    function flushSimCache() {
        var dirtyBooks = Object.keys(state.simDirty);
        if (!dirtyBooks.length) return;
        var books = Storage.loadBooks();
        var changed = false;
        dirtyBooks.forEach(function (bookId) {
            var book = books.find(function (b) { return String(b.id) === String(bookId); });
            if (!book) return;
            if (!book.similarCache || typeof book.similarCache !== 'object') book.similarCache = {};
            var dirty = state.simDirty[bookId];
            Object.keys(dirty).forEach(function (word) {
                book.similarCache[word] = dirty[word];
            });
            changed = true;
        });
        if (changed) Storage.saveBooks(books);
        state.simDirty = {};
    }

    // 查找形近词：优先词单持久化缓存 → 粗筛（长度桶±2 + 字母位掩码）→ 精算（LCS 体系）→ 阈值 0.30 → top maxN。
    // 新计算的结果记录到 state.simDirty，由 flushSimCache 在渲染完成后统一写回词单，后续无需再计算
    function findSimilarWords(word, maxN, bookId) {
        maxN = maxN || 8;
        var d = global.ENGLISHWORDS_DICT;
        if (!d) return [];
        var w = String(word || '').toLowerCase();
        if (!w) return [];
        // ① 词单持久化缓存：命中直接返回（跟随词单走，跨会话复用，零计算）
        var fromBook = loadSimFromBook(bookId, w);
        if (fromBook) return (maxN >= fromBook.length) ? fromBook : fromBook.slice(0, maxN);
        // ② 内存缓存（无词单归属的词，如收藏）
        if (state.simCache[w] !== undefined) {
            var cached = state.simCache[w];
            return (maxN >= cached.length) ? cached : cached.slice(0, maxN);
        }
        ensureSimIndexes();
        var len = w.length;
        var minChar = Math.max(3, Math.round(len * 0.5));
        var candidates = [];
        var seen = {};
        var maskW = letterMask(w);
        // ③ 长度分桶 ±2（桶遍历顺序 dl=-2..2，长度更接近的候选在前）
        for (var dl = -2; dl <= 2; dl++) {
            var bucket = state.simLenIndex.get(len + dl);
            if (!bucket) continue;
            var bkeys = bucket.keys, bmasks = bucket.masks;
            for (var i = 0; i < bkeys.length; i++) {
                var k = bkeys[i];
                if (k === w || seen[k]) continue;
                seen[k] = true;
                // ④ 去重字母位掩码粗筛（O(1) popcount，远快于逐字符计数）
                if (bitCount(maskW & bmasks[i]) >= minChar) candidates.push(k);
            }
        }
        // ⑤ 精算并过滤低于阈值的（候选规模受位掩码粗筛约束，全量精算成本 O(几百~几千 × L²)，毫秒级，不截断以免漏掉高分词）
        var results = [];
        for (var c = 0; c < candidates.length; c++) {
            var k2 = candidates[c];
            var sim = computeSimilarity(w, k2);
            if (sim >= 0.30) results.push({ w: k2, sim: sim });
        }
        results.sort(function (a, b) { return b.sim - a.sim; });
        results = results.slice(0, maxN);
        // ⑥ 记录缓存：词单归属的词持久化写回，无归属的进内存缓存
        if (bookId && bookId !== 'favorites') noteSimDirty(bookId, w, results);
        else state.simCache[w] = results;
        return results;
    }

    // 为主单词生成同根卫星词：字号约为主词一半，紧贴主词周围环绕（间距随字体大小自适应）
    function addRootSatellites(spr, w, scale, drawSize) {
        if (!clusterActive('root') || !state.rootDict) return;
        var info = getRootFamily(w.word);
        if (!info || !info.family.length) return;
        var self = String(w.word || '').toLowerCase();
        // 词根聚类：将词根说明（teal 行）挂到主词与卫星上，词卡聚类信息区显示用
        var rootInfo = info.root || '';
        spr.userData.clusterInfo = rootInfo;
        // 词根聚类显示优先级：词频指数越低越优先（无词频排最后），排除自身后取前 8 个
        var fam = sortRootFamily(info.family).filter(function (x) { return x.w !== self; }).slice(0, 8);
        if (!fam.length) return;
        var satColor = isDarkMode() ? '#8fa3c4' : '#5a6b7d';
        // 卫星字号 = 主词绘制字号的一半；卫星 sprite 高度略小于主词
        var satFontSize = Math.max(10, Math.round((drawSize || 20) * 0.5));
        var ss = Math.max(5, scale * 0.6);
        var half = scale * 0.5; // 主词半高
        // 距离因子：词频越小越靠近主词；无词频 = 最远(1.0)。
        // 按簇内相对词频线性映射到 [MIN_F, 1]；基础半径放大到 1.4 倍，
        // 保证最近的卫星（factor=MIN_F）与主词间仍保留清晰可见的连线长度
        var MIN_F = 0.72;
        var fMin = Infinity, fMax = -Infinity;
        fam.forEach(function (f) { if (f.freq != null) { if (f.freq < fMin) fMin = f.freq; if (f.freq > fMax) fMax = f.freq; } });
        // 卫星角度步长：按卫星大小预留弧长，避免卫星之间重叠拥挤
        var nSat = fam.length;
        // 270° 扇区弧长（左右上三扇区，z=0 平面；排除正下 90°：方向角从 -45°(右下) 经 右/上/左 到 225°(左下)）
        var S = Math.PI * 1.5;
        // 相邻卫星连线夹角要求：不小于 15°（后续可逐步调大）
        var minAngle = Math.PI / 12;
        // 均匀占满扇区：step = max(15°, 扇区弧长/卫星数)，保证彼此夹角 ≥ 15° 且不重叠
        var step = Math.max(minAngle, S / nSat);
        var span = (nSat - 1) * step; // 总跨度（≤ 270°）
        var start = -Math.PI / 4 + (S - span) / 2; // 扇区起点（-45°）居中 + 随机偏移
        start += Math.random() * step * 0.5;
        fam.forEach(function (f, i) {
            // 方向角线性均布于 270° 扇区，相邻夹角恒 ≥ step ≥ 15°
            var th = start + i * step;
            var dx = Math.cos(th);
            var dy = Math.sin(th);
            var dz = 0; // 贴主词左右/上下平面，避免前后与主词重叠
            var dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            dx /= dl; dy /= dl; dz /= dl;
            // 该卫星的距离因子：无词频 → 最远(1.0)；有词频 → 按簇内相对词频映射 [MIN_F, 1]
            var factor = 1;
            if (f.freq != null) {
                var t = (fMax === fMin) ? 0 : (f.freq - fMin) / (fMax - fMin);
                factor = MIN_F + (1 - MIN_F) * t;
            }
            // 环绕半径：主词半高 + 卫星半高，基础放大 1.4 倍，再乘词频距离因子（词频小 → 近，无词频 → 最远）
            var r = (half + ss) * 1.4 * factor;
            // 附属词词卡/3D详情数据：优先取基础词典（音标/释义），未命中再回退词根词典成员行解析；
            // 构成解释始终从词根词典成员行提取（基础词典不提供词源说明）
            var bd = lookupBaseDict(f.w);
            var data;
            if (bd) {
                data = { word: f.w, phonetic: bd.phonetic || '', pos: '', meaning: bd.meaning || '', structure: (f.data && f.data.structure) || '', example: '', source: '同根词', freq: f.freq };
            } else {
                data = f.data || parseRootWordData(f.w) || { word: f.w, phonetic: '', pos: '', meaning: '', structure: '', example: '', source: '同根词', freq: f.freq };
            }
            // 3D 视图：附属词按显示详情勾选组装多行（单词/音标/释义），数据来自基础词典
            var sLines = buildWordLines(data);
            var sTx = makeTextTexture(sLines, { fontSize: satFontSize, color: satColor, fontWeight: '500' });
            var sat = new THREE.Sprite(new THREE.SpriteMaterial({ map: sTx.texture, transparent: true, depthWrite: false, opacity: 0.85 }));
            // 与 applyZoomVisual 的标定公式一致（scale=(s, s/aspect)），避免卫星因 aspect>1 被横向放大、看起来与主词同大
            sat.scale.set(ss, ss / sTx.aspect, 1);
            sat.position.set(
                spr.position.x + dx * r,
                spr.position.y + dy * r,
                spr.position.z + dz * r
            );
            sat.userData.baseScale = ss;
            sat.userData.baseAspect = sTx.aspect;
            sat.userData.baseOpacity = 1;
            // 动态 billboard：记录方向角与半径，每帧让分布面始终平行相机平面
            sat.userData.th = th;
            sat.userData.satR = r;
            // 开放词卡：卫星词同样可点击显示完整信息卡片
            sat.userData.isWord = true;
            sat.userData.isSatellite = true;
            sat.userData.word = data;
            sat.userData.tex = sTx.texture;
            sat.userData.texOutlined = makeTextTexture(sLines, { fontSize: satFontSize, color: satColor, fontWeight: '500', outline: true }).texture;
            sat.userData.rootOf = spr; // 卫星词指向其主词（点击卫星时定位连线）
            sat.userData.clusterKind = 'root'; // 聚类类型：root=词根
            sat.userData.clusterInfo = rootInfo; // 卫星词同样携带词根说明，供词卡聚类信息区显示
            state.group.add(sat);
            // 主词登记其卫星（点击主词时激活连线）
            if (!spr.userData.satellites) spr.userData.satellites = [];
            spr.userData.satellites.push(sat);
        });
    }

    // 为主单词生成形近词卫星（仅用于"无法查询到词根的单词"）：排布规则参考词根聚类，
    // 距离因子按相似度：相似度越高越靠近主词（sim=1 → 最近 MIN_F；sim=0.3 → 最远 1.0）
    function addSimilarSatellites(spr, w, scale, drawSize) {
        if (!clusterActive('similar')) return;
        // 形近词结果跟随词单持久化缓存（bookId 定位词单），首次计算、后续零计算
        var sims = findSimilarWords(w.word, 8, w.bookId);
        if (!sims.length) return;
        // 形近词颜色：比词根卫星（#8fa3c4 / #5a6b7d）更淡的灰色，弱化存在感
        var satColor = isDarkMode() ? '#5e6878' : '#a9b2bf';
        var satFontSize = Math.max(10, Math.round((drawSize || 20) * 0.5));
        var ss = Math.max(5, scale * 0.6);
        var half = scale * 0.5; // 主词半高
        var MIN_F = 0.72;
        var nSat = sims.length;
        var S = Math.PI * 1.5;
        var minAngle = Math.PI / 12;
        var step = Math.max(minAngle, S / nSat);
        var span = (nSat - 1) * step;
        var start = -Math.PI / 4 + (S - span) / 2;
        start += Math.random() * step * 0.5;
        sims.forEach(function (r, i) {
            var th = start + i * step;
            var dx = Math.cos(th);
            var dy = Math.sin(th);
            var dz = 0;
            // 距离因子：相似度越高越靠近主词（sim 越高 factor 越小）
            var factor = 1 - ((r.sim - 0.3) / 0.7) * (1 - MIN_F);
            var rad = (half + ss) * 1.4 * factor;
            var bd = lookupBaseDict(r.w);
            var data;
            if (bd) data = { word: r.w, phonetic: bd.phonetic || '', pos: '', meaning: bd.meaning || '', structure: '', example: '', source: '形近词', sim: r.sim };
            else data = { word: r.w, phonetic: '', pos: '', meaning: '', structure: '', example: '', source: '形近词', sim: r.sim };
            var sLines = buildWordLines(data);
            var sTx = makeTextTexture(sLines, { fontSize: satFontSize, color: satColor, fontWeight: '500' });
            var sat = new THREE.Sprite(new THREE.SpriteMaterial({ map: sTx.texture, transparent: true, depthWrite: false, opacity: 0.85 }));
            sat.scale.set(ss, ss / sTx.aspect, 1);
            sat.position.set(
                spr.position.x + dx * rad,
                spr.position.y + dy * rad,
                spr.position.z + dz * rad
            );
            sat.userData.baseScale = ss;
            sat.userData.baseAspect = sTx.aspect;
            sat.userData.baseOpacity = 1;
            sat.userData.th = th;
            sat.userData.satR = rad;
            sat.userData.isWord = true;
            sat.userData.isSatellite = true;
            sat.userData.word = data;
            sat.userData.tex = sTx.texture;
            sat.userData.texOutlined = makeTextTexture(sLines, { fontSize: satFontSize, color: satColor, fontWeight: '500', outline: true }).texture;
            sat.userData.rootOf = spr; // 卫星词指向其主词（点击卫星时定位连线）
            sat.userData.clusterKind = 'similar'; // 聚类类型：similar=形近词
            sat.userData.clusterInfo = '相似度 ' + Math.round(r.sim * 100) + '%'; // 供词卡聚类信息区显示
            state.group.add(sat);
            if (!spr.userData.satellites) spr.userData.satellites = [];
            spr.userData.satellites.push(sat);
        });
    }

    // 聚类卫星总调度：优先词根（语义更强），主词无词根且启用了形近词 → 形近词卫星
    function addSatellites(spr, w, scale, drawSize) {
        var hasRoot = false;
        if (clusterActive('root') && state.rootDict) {
            var info = getRootFamily(w.word);
            var self = String(w.word || '').toLowerCase();
            if (info && info.family && info.family.some(function (x) { return x.w !== self; })) {
                hasRoot = true;
            }
        }
        if (hasRoot) {
            addRootSatellites(spr, w, scale, drawSize);
        } else if (clusterActive('similar')) {
            addSimilarSatellites(spr, w, scale, drawSize);
        }
    }

    // 构建/重建星云
    function build() {
        if (!state.renderer || !state.group) return;
        // 取消上一次未完成的卫星分帧渲染，避免与本次重建的卫星重复
        if (state.satChunkTimer) { cancelAnimationFrame(state.satChunkTimer); state.satChunkTimer = null; }
        state.satellitesPending = false;
        state.mainSprites = [];
        // 清空场景群
        while (state.group.children.length) state.group.remove(state.group.children[0]);
        // 重建时清除聚类连线（其 Line 随 children 清空，引用一并置空）
        state.connections = null;
        // 移除旧背景星点，避免重复叠加
        if (state.stars) {
            state.scene.remove(state.stars);
            state.stars = null;
        }

        var sortBy = document.getElementById('nebulaSortBy').value || 'cefr';
        var words = collectWords();
        // 记录本次构建的输入指纹：返回封面时若指纹一致则跳过重建（避免无修改操作重算/重绘形近词）
        state.lastBuildKey = makeBuildKey(words, sortBy);
        computeCloseness(words, sortBy);
        var count = words.length;
        updateScaleWarn(count);

        // 核心：词库名（无描边）
        var ct = coreText();
        var coreTx = makeTextTexture(ct, { fontSize: 80, color: coreTextColor(), fontWeight: '700' });
        var coreSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: coreTx.texture, transparent: true, depthWrite: false
        }));
        var base = 120;
        coreSprite.scale.set(base, base / coreTx.aspect, 1);
        coreSprite.userData.baseScale = base;
        coreSprite.userData.baseAspect = coreTx.aspect;
        state.group.add(coreSprite);

        // 词汇点
        if (count === 0) {
            var tipTx = makeTextTexture('请选择词单', { fontSize: 56, color: '#9aa7ff', fontWeight: '600' });
            var tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: tipTx.texture, transparent: true, depthWrite: false }));
            tip.scale.set(150, 60, 1);
            tip.position.set(0, -150, 0);
            state.group.add(tip);
            return;
        }

        var innerR = 28;      // 最内层半径
        var outterR = 330;    // 最外层半径
        var golden = 2.39996323;

        // ===== 排布风格 =====
        // 预计算每个词的簇信息（无簇=小球 occR=s/2，带簇=大球 occR=卫星整体范围）
        function clusterMetaOf(w) {
            var c = w.closeness;
            var s = (16 + c * 18) * 0.48 * state.fontSize;
            var occR = s * 0.5;
            var hasCluster = false;
            if ((clusterActive('root') && state.rootDict) || clusterActive('similar')) {
                // 词根：按实际词根族判定；形近词：基础词典基本总能找到相似词（阈值30%），视为带簇。
                // 同时启用时无词根的词走形近词，有词根的走词根，二者之一成立即视为带簇
                var fi = (clusterActive('root') && state.rootDict) ? getRootFamily(w.word) : null;
                var hasRootCluster = !!(fi && fi.family.length > 1);
                if (hasRootCluster || clusterActive('similar')) {
                    hasCluster = true;
                    var ss = Math.max(5, s * 0.6);
                    occR = (s * 0.5 + ss) * 1.15 + ss;
                }
            }
            return { c: c, s: s, occR: occR, hasCluster: hasCluster };
        }

        // 自然（无序中有序）：Fibonacci 球面均布骨架——纬度按面积均分（含两极），
        // 经度用黄金角螺旋 + 随机扰动（无簇词扰动大、簇词扰动小以保间距），
        // 半径按 closeness 体积插值、带簇主词按簇占用外移。看似无序，实际整球面间距适当
        function layoutNatural() {
            var positions = [];
            var n = words.length;
            var innerCube = innerR * innerR * innerR;
            var outerCube = outterR * outterR * outterR;
            var goldenAngle = Math.PI * (3 - Math.sqrt(5)); // 黄金角 ≈137.5°，螺旋均布经度
            words.forEach(function (w, idx) {
                var m = clusterMetaOf(w);
                // 纬度：Fibonacci y 均布（从北极 +1 到南极 -1，面积等分），顶部/底部区域同样有词分布
                var y = 1 - (2 * (idx + 0.5)) / n;
                // 经度：黄金角螺旋 + 随机扰动产生"无序"感；簇词扰动收窄避免挤压到相邻词
                var theta = idx * goldenAngle + (Math.random() * 2 - 1) * (m.hasCluster ? 0.15 : 0.45);
                // 半径：体积均匀分配（r³ 空间插值），带簇词按簇占用外移保证个人空间
                var baseR = Math.cbrt(innerCube + (1 - m.c) * (outerCube - innerCube));
                var radius = Math.max(baseR, m.occR * 2.8);
                var phi = Math.acos(Math.max(-1, Math.min(1, y)));
                positions[idx] = {
                    x: radius * Math.sin(phi) * Math.cos(theta),
                    y: radius * Math.cos(phi),
                    z: radius * Math.sin(phi) * Math.sin(theta)
                };
            });
            return positions;
        }

        // 螺旋 Spiral（同心旋转轨道分层均布）：按 closeness 分若干球壳轨道，
        // 轨道内纬度高等面积条带均分、经度按"占用角度加权"分配，不同轨道相位错开
        function layoutSpiral() {
            // 1) 簇信息
            var meta = words.map(function (w, idx) {
                var m = clusterMetaOf(w);
                return { w: w, idx: idx, c: m.c, occR: m.occR, hasCluster: m.hasCluster };
            });
            // 2) 按 closeness 分旋转轨道（同心球壳）
            var layerCount = Math.max(6, Math.min(14, Math.round(words.length / 6)));
            var layers = [];
            for (var li = 0; li < layerCount; li++) layers.push([]);
            meta.forEach(function (m) {
                layers[Math.min(layerCount - 1, Math.floor(m.c * layerCount))].push(m);
            });
            // 3) 每轨道半径：按层心 closeness 体积插值；同时保证 ≥ 该层最大簇占用的 2.8 倍，
            //    使带簇主词（大球+卫星）不侵入相邻轨道，不同轨道间自然错开
            var innerCube = innerR * innerR * innerR;
            var outerCube = outterR * outterR * outterR;
            var layerR = layers.map(function (arr, li) {
                var t = (li + 0.5) / layerCount; // 层心 closeness（0 最外 ~ 1 最里）
                var base = Math.cbrt(innerCube + (1 - t) * (outerCube - innerCube));
                var maxOcc = 0;
                arr.forEach(function (m) { if (m.occR > maxOcc) maxOcc = m.occR; });
                return Math.max(base, maxOcc * 2.8);
            });
            // 4) 轨道内球面均布：纬度按等面积条带（Fibonacci 式 y 均分，避免两极扎堆），
            //    经度按"占用角度加权"分配——带簇词占更大弧长，与相邻词保持更大间距
            var positions = [];
            layers.forEach(function (arr, li) {
                var R = layerR[li];
                var m = arr.length;
                if (!m) return;
                var occs = arr.map(function (it) { return Math.max(it.occR / R, 0.05); }); // 最小占用角
                var sumOcc = 0;
                occs.forEach(function (o) { sumOcc += o; });
                var gap = (Math.PI * 2 - sumOcc) / m; // 均匀填充的间隙
                var angle = li * golden + gap / 2; // 每轨道相位错开，避免径向重叠
                arr.forEach(function (it, j) {
                    var y = 1 - (2 * (j + 0.5)) / m; // 纬度条带：从北极到南极面积均分
                    var phi = Math.acos(Math.max(-1, Math.min(1, y)));
                    var a = angle + occs[j] / 2;
                    positions[it.idx] = {
                        x: R * Math.sin(phi) * Math.cos(a),
                        y: R * Math.cos(phi),
                        z: R * Math.sin(phi) * Math.sin(a)
                    };
                    angle += occs[j] + gap;
                });
            });
            return positions;
        }

        var positions = (state.layout === 'spiral') ? layoutSpiral() : layoutNatural();

        words.forEach(function (w, idx) {
            var c = w.closeness; // 0=最外, 1=最里
            var pos = positions[idx] || { x: 0, y: 0, z: 0 };
            var px = pos.x, py = pos.y, pz = pos.z;
            var s = (16 + c * 18) * 0.48 * state.fontSize;

            // 单词 Sprite（越靠核心越亮、越大）；颜色由 nebula-controls 的 state.wordColor 决定
            var fontSize = (28 + c * 40) * state.fontSize;
            // 组装多行标签（单词/音标/释义），小字号绘制以容纳多行
            var lines = buildWordLines(w);
            var lineCount = lines.length;
            var drawSize = Math.max(16, Math.round(fontSize / (1 + lineCount * 0.35)));
            var tx = makeTextTexture(lines, { fontSize: drawSize, color: state.wordColor, fontWeight: '500' });
            var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx.texture, transparent: true, depthWrite: false, opacity: 0.5 + c * 0.5 }));
            spr.scale.set(s * tx.aspect, s, 1);
            spr.position.set(px, py, pz);
            spr.userData.baseScale = s;
            spr.userData.baseAspect = tx.aspect;
            spr.userData.isWord = true;
            spr.userData.word = w; // 供点击显示完整卡片
            spr.userData.baseOpacity = 0.9; // 供按深度更新透明度
            // 缓存普通纹理与“选中”白色描边纹理（用户点击该单词时切换为其选中态）
            spr.userData.tex = tx.texture;
            spr.userData.texOutlined = makeTextTexture(lines, { fontSize: drawSize, color: state.wordColor, fontWeight: '500', outline: true }).texture;
            state.group.add(spr);
            // 记录主词 Sprite：聚类卫星改为 build 后分帧追加（避免一次性生成大量纹理阻塞主线程）
            state.mainSprites.push({ spr: spr, w: w, s: s, drawSize: drawSize });
        });

        // 背景星点
        if (state.scene) {
            var starCount = 260;
            var pos = new Float32Array(starCount * 3);
            for (var i = 0; i < starCount; i++) {
                pos[i * 3] = (Math.random() - 0.5) * 1400;
                pos[i * 3 + 1] = (Math.random() - 0.5) * 800;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 900;
            }
            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            var stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.7 }));
            state.scene.add(stars);
            state.stars = stars;
        }

        // 保持当前缩放倍率（整体缩放 + 文字补偿）
        applyZoomVisual();

        // 聚类卫星分帧渲染（每帧少量主词，主线程不卡顿）
        renderSatellitesChunked();
    }

    // 聚类卫星分帧渲染：将主词的同根卫星词按帧少量追加，避免一次性生成上千纹理阻塞主线程（造成 3D 卡顿）。
    // 全部完成后通过 afterSatellites 启动/恢复播放动画。
    function renderSatellitesChunked() {
        if (state.satChunkTimer) { cancelAnimationFrame(state.satChunkTimer); state.satChunkTimer = null; }
        var mains = state.mainSprites || [];
        // 任一聚类激活（词根需词根词典就绪，形近词需基础词典就绪）且有主词才分帧
        var activeRoot = clusterActive('root') && !!state.rootDict;
        var activeSim = clusterActive('similar') && !!global.ENGLISHWORDS_DICT;
        if ((!activeRoot && !activeSim) || !mains.length) {
            state.satellitesPending = false;
            afterSatellites();
            return;
        }
        state.satellitesPending = true;
        var BUDGET_MS = 30; // 每帧卫星渲染时间预算：超时交给下一帧（形近词首次匹配查询可能耗时几十ms）
        var i = 0;
        function step() {
            var t0 = performance.now();
            var spent = 0;
            while (i < mains.length && spent < BUDGET_MS) {
                addSatellites(mains[i].spr, mains[i].w, mains[i].s, mains[i].drawSize);
                i++;
                spent = performance.now() - t0;
            }
            if (i < mains.length) {
                state.satChunkTimer = requestAnimationFrame(step);
            } else {
                state.satChunkTimer = null;
                state.satellitesPending = false;
                afterSatellites();
            }
        }
        step();
    }

    // 聚类卫星全部渲染完成：若星云已初始化且可见但尚未播放（等卫星就绪），此刻启动动画
    function afterSatellites() {
        // 本次渲染新增的形近词缓存统一写回词单（跟随词单持久化，下次零计算）
        flushSimCache();
        var wrap = document.getElementById('coverNebula');
        var visible = wrap && !wrap.classList.contains('hidden');
        if (state.initialized && !state.raf && visible) {
            animate();
        }
    }

    function init() {
        if (!threeReady()) {
            console.warn('⚠️ 单词星云需要 Three.js，请将 three.min.js 放到 lib/ 目录');
            return;
        }
        var canvas = document.getElementById('nebulaCanvas');
        var wrapper = document.getElementById('coverNebula');
        if (!canvas || !wrapper) return;
        var w = wrapper.clientWidth || window.innerWidth;
        var h = wrapper.clientHeight || window.innerHeight;
        if (w <= 0 || h <= 0) return;

        if (!state.renderer) {
            state.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
            state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
            state.renderer.setClearColor(0x000000, 0);
            state.scene = new THREE.Scene();
            state.camera = new THREE.PerspectiveCamera(60, w / h, 1, 5000);
            state.camera.position.z = 330;
            state.group = new THREE.Group();
            state.scene.add(state.group);
            window.addEventListener('resize', resize);
            bindDrag(canvas);
            bindWheel(canvas);
            bindTouch(canvas);
            bindClick(canvas);
            bindOutsideClick(canvas);
            bindHover(canvas);
        }
        state.renderer.setSize(w, h, false);
        resizeCamera();

        build();
        state.initialized = true;
        // 渲染就绪：由 runWithLoader 统一调用 finishLoader 收尾，此处不再重复

        // 聚类卫星仍在分帧渲染时暂不播放，待 renderSatellitesChunked 全部完成后由 afterSatellites 启动
        if (!state.raf && !state.satellitesPending) {
            animate();
        }
    }

    function resize() {
        var wrapper = document.getElementById('coverNebula');
        if (!state.renderer || !wrapper) return;
        var w = wrapper.clientWidth || window.innerWidth;
        var h = wrapper.clientHeight || window.innerHeight;
        state.renderer.setSize(w, h, false);
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
    }

    function resizeCamera() {
        var wrapper = document.getElementById('coverNebula');
        var w = wrapper.clientWidth || window.innerWidth;
        var h = wrapper.clientHeight || window.innerHeight;
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
    }

    // 轨道球旋转：旋转施加于世界空间（四元数左乘），使星云表面始终跟随手指/鼠标方向，
    // 与当前视角无关——无论星云转到哪个朝向，往右拖都看到表面向右转
    function orbitBy(dx, dy) {
        if (!state.group) return;
        _dragQ.identity();
        if (dx) { _yAxisQ.setFromAxisAngle(_AXIS_Y, dx * 0.006); _dragQ.multiply(_yAxisQ); }
        if (dy) { _yAxisQ.setFromAxisAngle(_AXIS_X, dy * 0.006); _dragQ.multiply(_yAxisQ); }
        state.group.quaternion.premultiply(_dragQ);
        // 完全无限制，允许任意旋转角度
    }

    // 鼠标中键（按下）拖拽旋转星云
    function bindDrag(canvas) {
        if (!canvas) return;
        canvas.style.cursor = 'grab';

        canvas.addEventListener('mousedown', function (e) {
            // 仅响应中键（button === 1）
            if (e.button !== 1) return;
            e.preventDefault();
            state.dragging = true;
            state.dragX = e.clientX;
            state.dragY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', function (e) {
            if (!state.dragging || !state.group) return;
            var dx = e.clientX - state.dragX;
            var dy = e.clientY - state.dragY;
            state.dragX = e.clientX;
            state.dragY = e.clientY;
            orbitBy(dx, dy);
        });

        window.addEventListener('mouseup', function (e) {
            if (e.button !== 1) return;
            state.dragging = false;
            canvas.style.cursor = 'grab';
        });

        // 阻止中键默认行为（如自动滚动）
        canvas.addEventListener('auxclick', function (e) {
            if (e.button === 1) e.preventDefault();
        });
    }

    // 鼠标滚轮缩放星云整体（文字大小不受影响，实时更新）
    function bindWheel(canvas) {
        if (!canvas) return;
        canvas.addEventListener('wheel', function (e) {
            e.preventDefault();
            // 滚轮向上放大、向下缩小；开启"缩放反向"后方向反转
            var factor = (e.deltaY < 0) !== state.invertZoom ? 1.1 : 1 / 1.1;
            updateZoom(state.zoom * factor);
        }, { passive: false });
    }

    // 触屏：单指拖动旋转（对应桌面中键拖拽），双指捏合缩放（对应滚轮）
    function bindTouch(canvas) {
        if (!canvas) return;
        var pinchDist = 0;      // 双指手势上一帧的间距

        function twoFingerDist(e) {
            var dx = e.touches[0].clientX - e.touches[1].clientX;
            var dy = e.touches[0].clientY - e.touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        canvas.addEventListener('touchstart', function (e) {
            if (e.touches.length >= 2) {
                pinchDist = twoFingerDist(e);
                state.touchMoved = true;    // 手势不算点击，避免顺带打开词卡
                return;
            }
            pinchDist = 0;
            state.touchMoved = false;
            state.dragX = e.touches[0].clientX;
            state.dragY = e.touches[0].clientY;
        }, { passive: true });

        canvas.addEventListener('touchmove', function (e) {
            e.preventDefault();
            if (e.touches.length >= 2) {
                var d = twoFingerDist(e);
                // 两指拉开 → 放大。与滚轮共用 updateZoom，缩放范围一致
                if (pinchDist > 0 && d > 0) updateZoom(state.zoom * (d / pinchDist));
                pinchDist = d;
                return;
            }
            var t = e.touches[0];
            var dx = t.clientX - state.dragX;
            var dy = t.clientY - state.dragY;
            state.dragX = t.clientX;
            state.dragY = t.clientY;
            if (Math.abs(dx) + Math.abs(dy) > 1) state.touchMoved = true;
            orbitBy(dx, dy);
        }, { passive: false });

        canvas.addEventListener('touchend', function (e) {
            if (e.touches.length < 2) pinchDist = 0;
            // 只剩一指时重新对位，否则接着拖会跳一下
            if (e.touches.length === 1) {
                state.dragX = e.touches[0].clientX;
                state.dragY = e.touches[0].clientY;
            }
        });
        canvas.addEventListener('touchcancel', function () { pinchDist = 0; });
    }

    // 左键点击单词：在原处显示该词完整卡片，1 分钟后恢复精简词条显示
    function bindClick(canvas) {
        if (!canvas) return;
        canvas.addEventListener('click', function (e) {
            if (e.button !== 0 || !state.renderer || !state.camera || !state.group) return;
            // 触屏上旋转/缩放手势之后浏览器仍会补发 click，
            // 用移动标记把它挡掉，避免转一下视角就弹出词卡
            if (state.touchMoved) { state.touchMoved = false; return; }
            var rect = canvas.getBoundingClientRect();
            var ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            var ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            var ray = new THREE.Raycaster();
            ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), state.camera);
            // 仅命中单词词条（userData.isWord），核心、背景星点、提示忽略
            var hits = ray.intersectObjects(state.group.children, false);
            for (var i = 0; i < hits.length; i++) {
                var spr = hits[i].object;
                if (spr.isSprite && spr.userData && spr.userData.isWord) {
                    // 词根聚类：点击主词/卫星，激活该簇的主词-卫星连线（从中心延展动画）
                    activateConnections(spr);
                    if (state.lastCardWord !== spr.userData.word) {
                        showWordCard(spr, e);
                    }
                    return;
                }
            }
            // 点击空白处：恢复所有单词的描边为普通态，并清除聚类连线
            if (state.cardSprite) setWordOutline(state.cardSprite, false);
            clearConnections();
        });
    }

    // 鼠标悬浮主词/附属词超 500ms：自动激活该簇连线（不改变指针逻辑，仅连线），同时鼠标变为 👆 点击符号
    function bindHover(canvas) {
        if (!canvas) return;
        var HOVER_MS = 500;
        var hoverTimer = null;
        var hoverSpr = null; // 当前悬浮的单词 sprite
        var hoverActive = false; // 悬浮期间已触发连线（同一簇不重复触发）

        function pickWord(e) {
            if (!state.renderer || !state.camera || !state.group) return null;
            var rect = canvas.getBoundingClientRect();
            var ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            var ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            var ray = new THREE.Raycaster();
            ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), state.camera);
            var hits = ray.intersectObjects(state.group.children, false);
            for (var i = 0; i < hits.length; i++) {
                var spr = hits[i].object;
                if (spr.isSprite && spr.userData && spr.userData.isWord) return spr;
            }
            return null;
        }

        function cancelHover() {
            if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
            hoverSpr = null;
            hoverActive = false;
            canvas.style.cursor = 'grab';
        }

        canvas.addEventListener('mousemove', function (e) {
            if (state.dragging) { cancelHover(); return; }
            var spr = pickWord(e);
            if (spr === hoverSpr) {
                // 仍在同一单词上悬浮：维持计时
                return;
            }
            // 换了单词 / 移出：重置
            if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
            hoverSpr = spr;
            hoverActive = false;
            if (spr) {
                // 悬浮在单词上：指针变为 👆（点击符号）
                canvas.style.cursor = 'pointer';
                hoverTimer = setTimeout(function () {
                    hoverActive = true;
                    activateConnections(hoverSpr);
                }, HOVER_MS);
            } else {
                canvas.style.cursor = 'grab';
            }
        });
        canvas.addEventListener('mouseleave', cancelHover);
    }

    // 显示单词完整卡片（原位置，不跟随旋转）
    function setWordOutline(spr, on) {
        if (!spr || !spr.userData) return;
        var map = on ? spr.userData.texOutlined : spr.userData.tex;
        if (spr.material && spr.material.map !== map) {
            spr.material.map = map;
            spr.material.needsUpdate = true;
        }
    }

    // 激活主词-卫星连线：点击主词或任一卫星，从主词中心向四周延展动画渐变
    function activateConnections(spr) {
        if (!hasClusterOf()) return;
        // 卫星点击：定位其所属主词；主词点击：直接用自身
        var main = (spr && spr.userData && spr.userData.isSatellite) ? spr.userData.rootOf : spr;
        if (!main || !main.userData || !main.userData.satellites || !main.userData.satellites.length) return;
        // 已激活同一簇：不重播动画（仅更新主词引用）
        if (state.connections && state.connections.main === main) {
            state.connections.progress = 1;
            return;
        }
        clearConnections();
        var mainPos = main.position.clone();
        var lines = [];
        main.userData.satellites.forEach(function (sat) {
            var geo = new THREE.BufferGeometry().setFromPoints([mainPos, mainPos]); // 初始两端都收拢在中心
            // 形近词连线用虚线，与词根实线区分
            var isSim = sat.userData.clusterKind === 'similar';
            var mat;
            if (isSim) {
                mat = new THREE.LineDashedMaterial({
                    color: state.wordColor,
                    transparent: true,
                    opacity: 0,
                    depthTest: false, // 保证连线上浮可见
                    dashSize: 1.5,
                    gapSize: 1
                });
            } else {
                mat = new THREE.LineBasicMaterial({
                    color: state.wordColor,
                    transparent: true,
                    opacity: 0,
                    depthTest: false // 保证连线上浮可见
                });
            }
            var line = new THREE.Line(geo, mat);
            line.userData.isConnection = true;
            line.userData.isSimilar = isSim;
            state.group.add(line);
            lines.push({ line: line, satPos: sat.position.clone(), sat: sat });
        });
        state.connections = { lines: lines, main: main, progress: 0, start: performance.now(), dur: 700 };
    }

    // 移除激活连线（释放几何与材质）
    function clearConnections() {
        if (!state.connections) return;
        state.connections.lines.forEach(function (item) {
            if (item.line.parent) item.line.parent.remove(item.line);
            if (item.line.geometry) item.line.geometry.dispose();
            if (item.line.material) item.line.material.dispose();
        });
        state.connections = null;
    }

    // 临时向量（矩形消隐计算用，避免每帧 GC）
    // 轨道球拖拽/自转所需的世界轴常量与临时四元数
    var _AXIS_Y = new THREE.Vector3(0, 1, 0);
    var _AXIS_X = new THREE.Vector3(1, 0, 0);
    var _yAxisQ = new THREE.Quaternion();
    var _dragQ = new THREE.Quaternion();
    var _clipRight = new THREE.Vector3(), _clipUp = new THREE.Vector3(), _clipFwd = new THREE.Vector3();
    // 计算单词 sprite 的当前显示矩形（长×宽）沿指定单位方向(dir)的边界距离：
    // 使用 sprite 当前的 scale.x/scale.y（已含字体大小、zoom 文字补偿的实时值）作为矩形宽高，
    // 把方向投影到相机的右/上轴与轴对齐矩形求交，返回从中心到矩形边缘的距离（世界单位）。
    // 正上/正下方连线因矩形高度窄而消隐小、连线长；调整字体大小后自动适应新矩形范围。
    function spriteRectClip(s, dir) {
        if (!s || !s.scale) return 0;
        var hw = Math.abs(s.scale.x) / 2; // 半宽：当前显示宽度的一半
        var hh = Math.abs(s.scale.y) / 2; // 半高：当前显示高度的一半
        if (hw <= 0 || hh <= 0) return 0;
        var dx = dir.dot(_clipRight);
        var dy = dir.dot(_clipUp);
        var m = Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
        return m > 0 ? 1 / m : 0;
    }

    // 连线动画：从主词中心向卫星延展（ease-out），透明度同步渐入，到达后保持
    // 两端消隐：起始段（主词矩形范围内）+ 末端（卫星矩形范围内）不显示，各多消隐 3% 留出 gap
    // 卫星动态 billboard：附属词的均布面始终平行相机平面（相机位于 z 轴、视线沿 -z，
    // 屏幕平面 = x-y 平面），无论星云绕任何轴旋转，看到的附属词始终均布铺开，不会"由面变线"
    var _billMain = new THREE.Vector3();
    var _billPos = new THREE.Vector3();
    function updateSatelliteBillboards() {
        if (!state.group) return;
        var children = state.group.children;
        for (var i = 0; i < children.length; i++) {
            var spr = children[i];
            if (!spr.isSprite || !spr.userData || !spr.userData.isSatellite) continue;
            var ud = spr.userData;
            var main = ud.rootOf;
            if (!main) continue;
            main.getWorldPosition(_billMain);
            var th = ud.th || 0;
            var R = ud.satR || 1;
            // 世界空间偏移恒定在 x-y 平面（平行相机屏幕），旋转星云不影响该分布面
            _billPos.set(_billMain.x + Math.cos(th) * R, _billMain.y + Math.sin(th) * R, _billMain.z);
            state.group.worldToLocal(_billPos);
            spr.position.copy(_billPos);
        }
    }

    function updateConnections(now) {
        var c = state.connections;
        if (!c) return;
        var t = Math.min(1, (now - c.start) / c.dur);
        var ease = 1 - Math.pow(1 - t, 3); // ease-out 先快后慢，延展感
        var mx = c.main.position.x, my = c.main.position.y, mz = c.main.position.z;
        // 相机右/上轴：sprite 始终面向相机，其宽度沿右轴、高度沿上轴
        state.camera.getWorldDirection(_clipFwd);
        _clipRight.crossVectors(_clipFwd, state.camera.up).normalize();
        _clipUp.crossVectors(_clipRight, _clipFwd).normalize();
        c.lines.forEach(function (item) {
            var pos = item.line.geometry.attributes.position;
            // 卫星位置实时读取（卫星分布面随相机动态 billboard），不依赖激活时的快照
            var sp = item.sat.position;
            var dx = sp.x - mx, dy = sp.y - my, dz = sp.z - mz;
            var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            var ux = dx / len, uy = dy / len, uz = dz / len;
            // 主词矩形沿连线方向边界距离（从中心到边缘）+ 卫星矩形沿反向边界距离，各多 3% gap
            var dirMain = _clipRight.set(ux, uy, uz); // 主词→卫星方向（单位）
            var mainClip = spriteRectClip(c.main, dirMain);
            var dirSat = dirMain.clone().negate(); // 卫星→主词方向
            var satClip = spriteRectClip(item.sat, dirSat);
            var a = Math.min((mainClip / len) + 0.03, 0.4);
            var b = Math.max(0.6, 1 - (satClip / len) - 0.03);
            var e1 = Math.min(1, Math.max(0, (ease - a) / (b - a)));
            var s0 = ease * a;              // 可见段起点（主词矩形边缘外）
            var s1 = ease * b;              // 可见段终点（卫星矩形边缘外）
            // 起始端随生长进度推进（消隐主词矩形范围），末端收在卫星矩形边缘前
            if (s1 > s0) {
                pos.setXYZ(0, mx + ux * s0 * len, my + uy * s0 * len, mz + uz * s0 * len);
                pos.setXYZ(1, mx + ux * s1 * len, my + uy * s1 * len, mz + uz * s1 * len);
            } else {
                pos.setXYZ(0, mx, my, mz);
                pos.setXYZ(1, mx, my, mz);
            }
            pos.needsUpdate = true;
            // 虚线需在端点更新后重算线长分段，否则 dash/gap 显示异常
            if (item.line.userData.isSimilar) item.line.computeLineDistances();
            // 透明度随"可见段覆盖比例"渐入，动画结束保持
            item.line.material.opacity = 0.85 * e1;
        });
        c.progress = t;
    }

    function showWordCard(spr, e) {
        var card = document.getElementById('nebulaCard');
        var wrap = document.getElementById('coverNebula');
        if (!card || !wrap) return;
        // 选中该单词：切换为白色描边态，并复位先前选中的描边
        if (state.cardSprite && state.cardSprite !== spr) setWordOutline(state.cardSprite, false);
        setWordOutline(spr, true);
        state.cardSprite = spr;
        var w = spr.userData.word || {};

        // 填充内容：第一行 单词(加粗)+发音，第二行 音标+CEFR等级，第三行 释义，第四行 例句
        var wordEl = document.getElementById('nebulaCardWord');
        var phoEl = document.getElementById('nebulaCardPhonetic');
        var lvlEl = document.getElementById('nebulaCardLevel');
        var meanEl = document.getElementById('nebulaCardMean');
        var exEl = document.getElementById('nebulaCardExample');
        if (wordEl) {
            wordEl.textContent = w.word || '';
            // 点击单词：在主页查词下拉中展开首选词典的详细释义
            wordEl.onclick = function (ev) {
                if (ev && ev.stopPropagation) ev.stopPropagation();
                if (global.openDictLookupWord) global.openDictLookupWord(w.word || '');
            };
        }
        // 音标：词卡常驻显示（有数据即显示，不依赖"显示详情"勾选）；主词词单缺音标时从基础词典兜底
        var cardPhonetic = w.phonetic;
        if (!cardPhonetic && !spr.userData.isSatellite && global.ENGLISHWORDS_DICT) {
            var bdPho = lookupBaseDict(w.word);
            if (bdPho) cardPhonetic = bdPho.phonetic;
        }
        if (phoEl) {
            if (cardPhonetic) {
                phoEl.textContent = cardPhonetic;
                phoEl.style.display = '';
            } else {
                phoEl.textContent = '';
                phoEl.style.display = 'none';
            }
        }
        // CEFR 等级：复用已有着色逻辑（不同等级不同颜色）
        if (lvlEl) {
            var lvls = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
            var lvIdx = getWordLevel(w.word);
            if (lvIdx !== -1) {
                // 与 app.js 的 CEFR_THEME_COLORS 保持一致；WordMemoryApp 为 class 全局声明（不挂 window），故内置兜底色
                var NEBULA_LEVEL_COLORS = { A1: '#57912b', A2: '#93a418', B1: '#b9780f', B2: '#b6620e', C1: '#b32e27', C2: '#b1296d' };
                var lvColor = NEBULA_LEVEL_COLORS[lvls[lvIdx]] || '#99a7ff';
                lvlEl.textContent = lvls[lvIdx];
                lvlEl.style.color = lvColor;
                lvlEl.style.display = '';
                lvlEl.style.borderColor = lvColor;
            } else {
                lvlEl.textContent = '';
                lvlEl.style.display = 'none';
            }
        }
        // 释义：勾选"释义"且有数据才显示（无数据不显示占位文本）
        if (meanEl) {
            if (state.details.indexOf('meaning') !== -1 && w.meaning) {
                var posPrefix = (w.pos || '').trim();
                // 词频指数仅主词显示在释义前；附属词的词频拼接到来源位置
                var freqPrefix = (!spr.userData.isSatellite && w.freq != null) ? '★' + w.freq + ' ' : '';
                var full = posPrefix ? posPrefix + (w.meaning ? ' ' + w.meaning : '') : (w.meaning || '');
                meanEl.textContent = (freqPrefix + full).trim();
                meanEl.style.display = '';
            } else {
                meanEl.textContent = '';
                meanEl.style.display = 'none';
            }
        }
        // 例句：勾选"例句"且有数据才显示（附属词等无例句时不显示占位文本）
        if (exEl) {
            if (state.details.indexOf('example') !== -1 && w.example) {
                exEl.innerHTML = '“' + highlightExampleWord(w.example, w.word) + '”';
                exEl.style.display = '';
            } else {
                exEl.innerHTML = '';
                exEl.style.display = 'none';
            }
        }
        // 单词来源：右对齐，如《词单ABC》；附属词（同根词）拼上词频指数，如《同根词》★9023
        var srcEl = document.getElementById('nebulaCardSource');
        if (srcEl) {
            var srcText = w.source ? '《' + w.source + '》' : '';
            if (spr.userData.isSatellite && w.freq != null) srcText += '★' + w.freq;
            srcEl.textContent = srcText;
        }
        // 聚类信息区：开启聚类且存在聚类信息时显示。
        // 词根聚类 → 显示词根说明（如 "miss,mit= send,cast"）；形近词聚类 → 显示相似度
        var clusterEl = document.getElementById('nebulaCardCluster');
        if (clusterEl) {
            var kind = spr.userData.clusterKind;
            var ci = spr.userData.clusterInfo ||
                     (spr.userData.rootOf ? spr.userData.rootOf.userData.clusterInfo : '');
            // 主词的聚类说明仅由词根聚类写入（rootInfo），故主词有说明即视为词根聚类
            if (!kind && !spr.userData.isSatellite && spr.userData.clusterInfo) kind = 'root';
            var showCluster = (kind === 'root' && clusterActive('root')) || (kind === 'similar' && clusterActive('similar'));
            if (showCluster && ci) {
                clusterEl.innerHTML = '';
                var lbl = document.createElement('span');
                lbl.className = 'nebula-card-cluster-label';
                lbl.textContent = (kind === 'root') ? '词根' : '形近';
                clusterEl.appendChild(lbl);
                clusterEl.appendChild(document.createTextNode(' ' + ci));
                clusterEl.style.display = '';
            } else {
                clusterEl.style.display = 'none';
            }
        }
        // 构成解释区：开启词根聚类时显示词源括号说明（如 perfect 的 "per 全部+fect=全部做完=完美的"）。
        // 主词从词根词典首行提取；附属词取成员行解析出的 structure
        var structEl = document.getElementById('nebulaCardStructure');
        if (structEl) {
            var structure = '';
            if (clusterActive('root')) {
                if (spr.userData.isSatellite) {
                    structure = w.structure || '';
                } else if (state.rootDict) {
                    var rh = state.rootDict[String(w.word || '').toLowerCase()];
                    if (rh) structure = extractStructure(String(rh).split(/<br\s*\/?>/i)[0] || '');
                }
            }
            if (structure) {
                structEl.innerHTML = '';
                var slbl = document.createElement('span');
                slbl.className = 'nebula-card-structure-label';
                slbl.textContent = '构成';
                structEl.appendChild(slbl);
                structEl.appendChild(document.createTextNode(' ' + structure));
                structEl.style.display = '';
            } else {
                structEl.style.display = 'none';
            }
        }

        // 发音按钮
        var speakBtn = document.getElementById('nebulaCardSpeak');
        if (speakBtn) {
            speakBtn.onclick = function () {
                speakWord(w.word || '', speakBtn);
            };
        }
        // 收藏按钮：切换全局收藏状态（参考 translation-fav）
        var favBtn = document.getElementById('nebulaCardFav');
        if (favBtn) {
            favBtn.classList.toggle('favorited', isWordFavorited(w.word));
            favBtn.title = isWordFavorited(w.word) ? '取消收藏' : '收藏';
            favBtn.onclick = function () {
                toggleCardFavorite(w, favBtn);
            };
        }
        // 点击单词后自动发音
        speakWord(w.word || '', document.getElementById('nebulaCardSpeak'));

        // 设置卡片主题色（跟随右下角 nebulaWordColor 选择的主题）
        var card = document.getElementById('nebulaCard');
        var accent = state.wordColor;
        document.body.classList.add('nebula-word-themed');
        if (card) card.style.setProperty('--nebula-accent', accent);

        state.lastCardWord = w;
        state.cardSprite = spr;
        card.classList.remove('hidden');
        // 定位到点击单词的屏幕投影位置（以 coverNebula 容器为坐标基准）
        positionCard();

        // 1 分钟后自动恢复：隐藏卡片
        if (state.cardTimer) clearTimeout(state.cardTimer);
        state.cardTimer = setTimeout(function () {
            setWordOutline(state.cardSprite, false);
            card.classList.add('hidden');
            state.lastCardWord = null;
            state.cardSprite = null;
        }, 60000);
    }

    // 点击空白处隐藏卡片
    function bindOutsideClick(canvas) {
        if (!canvas) return;
        canvas.addEventListener('click', function (e) {
            // 仅命中单词词条（userData.isWord）时显示；否则为空白处，隐藏卡片
            if (e.button !== 0 || !state.renderer || !state.camera || !state.group) return;
            var rect = canvas.getBoundingClientRect();
            var ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            var ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            var ray = new THREE.Raycaster();
            ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), state.camera);
            var hits = ray.intersectObjects(state.group.children, false);
            var hitCard = false;
            for (var i = 0; i < hits.length; i++) {
                var spr = hits[i].object;
                if (spr.isSprite && spr.userData && spr.userData.isWord) {
                    hitCard = true;
                    break;
                }
            }
            // 空白处：隐藏卡片
            var card = document.getElementById('nebulaCard');
            if (!hitCard && card) {
                card.classList.add('hidden');
                state.lastCardWord = null;
                state.cardSprite = null;
            }
        });
    }

    // 把卡片定位到当前展示单词的 3D 投影位置（跟随旋转）
    function positionCard() {
        var card = document.getElementById('nebulaCard');
        var wrap = document.getElementById('coverNebula');
        if (!card || !wrap || !state.cardSprite || !state.camera) return;
        var v = state.cardSprite.getWorldPosition(new THREE.Vector3()).clone().project(state.camera);
        var wrapRect = wrap.getBoundingClientRect();
        // 卡片的实际渲染宽/高（隐藏时 offsetWidth/offsetHeight 为 0，退化为缓存值/默认）
        if (!card.classList.contains('hidden')) {
            state.cardWidth = card.offsetWidth || state.cardWidth || 220;
            state.cardHeight = card.offsetHeight || state.cardHeight || 140;
        }
        var cardW = state.cardWidth || 220;
        var cardH = state.cardHeight || 140;
        var x = (v.x * 0.5 + 0.5) * wrapRect.width;
        var y = (-v.y * 0.5 + 0.5) * wrapRect.height;
        // 计算单词在世界空间的实际高度，并投影到屏幕，用于把卡片放到单词正下方且不遮挡
        var pos = state.cardSprite.getWorldPosition(new THREE.Vector3());
        var dist = pos.distanceTo(state.camera.position);
        var worldH = state.cardSprite.getWorldScale(new THREE.Vector3()).y;
        var fov = state.camera.fov * Math.PI / 180;
        // 屏幕每单位世界长度对应的像素数（透视投影）
        var pxPerWorld = wrapRect.height / (2 * Math.tan(fov / 2) * dist);
        // 单词在屏幕上的半高（px），下方/上方再加 6px 间隙，确保卡片不遮挡单词
        var halfH = (worldH / 2) * pxPerWorld + 6;
        var topBelow = y + halfH; // 卡片放单词正下方时的 top
        var topAbove = y - halfH - cardH; // 卡片放单词正上方时的 top
        var minTop = 8, maxBottom = wrapRect.height - 8;
        // 单词太靠底部（下方放不下卡片）且上方有足够空间时，翻转到正上方显示；否则默认在下方
        var useAbove = (topBelow + cardH > maxBottom) && (topAbove >= minTop);
        var top = useAbove ? topAbove : topBelow;
        top = Math.round(Math.max(minTop, Math.min(maxBottom, top)));
        // 水平居中：卡片垂直中心线与单词垂直中心线对齐
        card.style.left = Math.round(Math.max(8, Math.min(wrapRect.width - cardW - 8, x - cardW / 2))) + 'px';
        card.style.top = top + 'px';
    }

    // 应用缩放倍率：调整整体缩放，并对文字标签反向补偿保持大小恒定
    function updateZoom(newZoom) {
        // 限定缩放范围，避免过大/过小
        newZoom = Math.max(0.4, Math.min(3, newZoom));
        state.zoom = newZoom;
        applyZoomVisual();
    }

    // 无条件把当前 zoom 应用到场景（整体缩放 + 文字反向补偿）
    function applyZoomVisual() {
        if (!state.group) return;
        var zoom = state.zoom;

        // 整体缩放（影响球体结构和距离）
        state.group.scale.set(zoom, zoom, zoom);

        // 文字补偿系数：文字要抵消整体缩放，保持屏幕尺寸不变
        var textScale = 1 / zoom;
        state.group.children.forEach(function (child) {
            if (child.isSprite && child.userData && child.userData.baseScale) {
                var s = child.userData.baseScale * textScale;
                var aspect = child.userData.baseAspect || 1;
                child.scale.set(s, s / aspect, 1);
            }
        });
    }

    function animate() {
        state.raf = requestAnimationFrame(animate);
        state.animTime += 1;
        if (state.group) {
            // 拖拽期间暂停自动旋转，交由鼠标手动控制
            if (!state.dragging) {
                // 世界空间 Y 轴自转（四元数左乘），与拖拽同坐标系：任意视角下自转方向一致
                _yAxisQ.setFromAxisAngle(_AXIS_Y, 0.0002 * state.speed);
                state.group.quaternion.premultiply(_yAxisQ);
            }
            state.group.updateMatrixWorld(true);
            // 卫星均布面始终平行相机（先于连线，保证连线端点取到最新卫星位置）
            updateSatelliteBillboards();
            // 聚类连线动画：从主词中心向四周延展渐变
            updateConnections(performance.now());

            // 按深度更新词条透明度：越靠近摄像机（世界 Z 越大）越不透明，越远越透明（50%~100%）
            // 摄像机位于 z=正方向远处向原点看，离相机近的物体世界 Z 更大
            if (state.camera) {
                var camZ = state.camera.position.z;
                var depthRange = 700; // 期望映射的深度范围（覆盖星云近端~远端）
                var wrapRect = (document.getElementById('coverNebula') || { getBoundingClientRect: function () { return { height: window.innerHeight }; } }).getBoundingClientRect();
                var wrapH = wrapRect.height;
                var fov = state.camera.fov * Math.PI / 180;
                var camPos = state.camera.position;
                state.group.children.forEach(function (child) {
                    if (!child.isSprite || !child.userData || !child.userData.baseOpacity) return;
                    var pos = child.getWorldPosition(new THREE.Vector3());
                    var worldZ = pos.z;

                    // ---- 可见性裁剪：离相机过近 / 占据屏幕过高（>50%）的单词隐藏 ----
                    // 仅对单词 Sprite 生效
                    if (child.userData.isWord) {
                        var dist = pos.distanceTo(camPos);
                        var worldH = child.getWorldScale(new THREE.Vector3()).y;
                        var fovHalf = Math.tan(fov / 2);
                        // 单词在屏幕上的像素高度（投影）
                        var screenH = dist > 0 ? (worldH * wrapH) / (2 * fovHalf * dist) : Infinity;
                        // 屏幕占比超过 50% 视为过大、无法完整查看，隐藏
                        if (screenH > wrapH * 0.5) {
                            child.visible = false;
                            return;
                        }
                        // 中心点投影出画布则隐藏，保证单词在屏幕内可完整显示
                        var vp = pos.clone().project(state.camera);
                        var isInBounds = vp.x >= -1 && vp.x <= 1 && vp.y >= -1 && vp.y <= 1 && vp.z < 1;
                        if (!isInBounds) {
                            child.visible = false;
                            return;
                        }
                        child.visible = true;
                    }

                    // 深度比例：越大越接近相机 => 越不透明
                    var t = (worldZ - (camZ - depthRange)) / depthRange;
                    t = Math.max(0, Math.min(1, t));
                    child.material.opacity = 0.5 + 0.5 * t;
                });
            }
            // 卡片跟随单词旋转实时更新位置
            if (state.cardSprite) {
                positionCard();
            }
        }
        if (state.renderer && state.scene && state.camera) {
            state.renderer.render(state.scene, state.camera);
        }
    }

    function stop() {
        if (state.raf) {
            cancelAnimationFrame(state.raf);
            state.raf = null;
        }
        // 停止时清除聚类连线，避免切走封面后残留
        clearConnections();
    }

    // 绑定右下角控件（词单选择 + 等级类别）
    function bindControls() {
        if (state.controlsBound) return;
        state.controlsBound = true;

        var wrap = document.getElementById('nebulaControls');
        if (!wrap) return;

        // 渲染词单下拉多选
        renderBookOptions();
        // 渲染显示详情下拉多选
        renderDetailOptions();
        // 渲染单词聚类多选（词根/形近词）
        renderClusterOptions();

        var trigger = document.getElementById('nebulaBookTrigger');
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var panel = document.getElementById('nebulaBookSelect');
            panel.classList.toggle('hidden');
            document.getElementById('nebulaDetailSelect').classList.add('hidden');
        });

        var detailTrigger = document.getElementById('nebulaDetailTrigger');
        detailTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var panel = document.getElementById('nebulaDetailSelect');
            panel.classList.toggle('hidden');
            document.getElementById('nebulaBookSelect').classList.add('hidden');
        });

        // 点击面板外关闭下拉
        document.addEventListener('click', function (e) {
            var picker = document.querySelector('.nebula-bookpicker');
            if (picker && !picker.contains(e.target)) {
                var panel = document.getElementById('nebulaBookSelect');
                if (panel) panel.classList.add('hidden');
                var dPanel = document.getElementById('nebulaDetailSelect');
                if (dPanel) dPanel.classList.add('hidden');
                var cPanel = document.getElementById('nebulaClusterSelect');
                if (cPanel) cPanel.classList.add('hidden');
            }
        });

        var sortSelect = document.getElementById('nebulaSortBy');
        sortSelect.addEventListener('change', function () {
            saveConfig({ selected: state.selected.slice(), sort: sortSelect.value, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
            if (state.group) build();
        });

        // 单词聚类（多选：词根/形近词）：词根需惰性加载词根词缀词典，形近词需基础英文词典，加载完成后再重建星云
        var clusterTrigger = document.getElementById('nebulaClusterTrigger');
        var clusterPanel = document.getElementById('nebulaClusterSelect');
        if (clusterTrigger && clusterPanel) {
            renderClusterOptions();
            clusterTrigger.addEventListener('click', function (e) {
                e.stopPropagation();
                clusterPanel.classList.toggle('hidden');
                document.getElementById('nebulaBookSelect').classList.add('hidden');
                document.getElementById('nebulaDetailSelect').classList.add('hidden');
            });
        }

        // 排布风格：natural（无序错开）/ spiral（螺旋 Spiral）
        var layoutSelect = document.getElementById('nebulaLayout');
        if (layoutSelect) {
            layoutSelect.value = state.layout === 'spiral' ? 'spiral' : 'natural';
            syncPicker(layoutSelect);
            layoutSelect.addEventListener('change', function () {
                state.layout = layoutSelect.value === 'spiral' ? 'spiral' : 'natural';
                saveConfig({ selected: state.selected.slice(), sort: sortSelect.value, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
                if (state.group) runWithLoader(function () { build(); });
            });
        }

        // 字体大小滑条：拖动时只更新数值显示，松开鼠标（change）才保存并重建
        var fontRange = document.getElementById('nebulaFontSize');
        if (fontRange) {
            fontRange.value = state.fontSize;
            var fontValueEl = document.getElementById('nebulaFontSizeValue');
            if (fontValueEl) fontValueEl.textContent = state.fontSize;
            fontRange.addEventListener('input', function () {
                state.fontSize = parseFloat(fontRange.value) || 1;
                if (fontValueEl) fontValueEl.textContent = state.fontSize;
            });
            fontRange.addEventListener('change', function () {
                saveConfig({ selected: state.selected.slice(), sort: sortSelect.value, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
                if (state.group) build();
            });
        }

        // 单词颜色选择器：拖动时仅更新颜色值，松开（change）才应用主题并重建
        var colorInput = document.getElementById('nebulaWordColor');
        if (colorInput) {
            colorInput.value = state.wordColor;
            colorInput.addEventListener('input', function () {
                state.wordColor = colorInput.value;
            });
            colorInput.addEventListener('change', function () {
                // 应用卡片主题色（边框/高亮跟随所选主题）
                document.body.classList.add('nebula-word-themed');
                var card = document.getElementById('nebulaCard');
                if (card) card.style.setProperty('--nebula-accent', colorInput.value);
                saveConfig({ selected: state.selected.slice(), sort: sortSelect.value, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
                if (state.group) build();
            });
        }

        // 旋转速度滑条：拖动时只更新数值显示，松开鼠标（change）才保存
        var speedRange = document.getElementById('nebulaSpeed');
        if (speedRange) {
            speedRange.value = state.speed;
            var speedValueEl = document.getElementById('nebulaSpeedValue');
            if (speedValueEl) speedValueEl.textContent = state.speed;
            speedRange.addEventListener('input', function () {
                state.speed = parseFloat(speedRange.value) || 0;
                if (speedValueEl) speedValueEl.textContent = state.speed;
            });
            speedRange.addEventListener('change', function () {
                saveConfig({ selected: state.selected.slice(), sort: sortSelect.value, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
            });
        }

        // 缩放反向开关
        var invertZoomInput = document.getElementById('nebulaInvertZoom');
        if (invertZoomInput) {
            invertZoomInput.checked = !!state.invertZoom;
            invertZoomInput.addEventListener('change', function () {
                state.invertZoom = invertZoomInput.checked;
                saveConfig({ selected: state.selected.slice(), sort: sortSelect.value, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
            });
        }
    }

    // 渲染"显示详情"下拉多选（单词/音标/释义）
    function renderDetailOptions() {
        var panel = document.getElementById('nebulaDetailSelect');
        var trigger = document.getElementById('nebulaDetailTrigger');
        if (!panel || !trigger) return;
        panel.innerHTML = '';

        // 单词为星云必有的基础行，不提供勾选；仅音标/释义/例句可选
        var opts = [
            { key: 'phonetic', label: '音标' },
            { key: 'meaning', label: '释义' },
            { key: 'example', label: '例句' }
        ];

        opts.forEach(function (o) {
            var checked = state.details.indexOf(o.key) !== -1;
            var label = document.createElement('label');
            label.className = 'nebula-bookopt';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = checked;
            cb.addEventListener('change', function () { selectDetail(o.key, cb.checked); });
            label.appendChild(cb);
            var span = document.createElement('span');
            span.textContent = o.label;
            label.appendChild(span);
            panel.appendChild(label);
        });

        // 更新触发按钮文字（逗号拼接已选详情）
        var names = {
            phonetic: '音标',
            meaning: '释义',
            example: '例句'
        };
        var shown = state.details.length ? state.details.map(function (k) { return names[k] || k; }).join(' ') : '仅单词';
        trigger.textContent = shown;
    }

    function selectDetail(key, checked) {
        var idx = state.details.indexOf(key);
        if (checked && idx === -1) {
            state.details.push(key);
        } else if (!checked && idx !== -1) {
            state.details.splice(idx, 1);
        }
        // 单词为必显基础行，不参与勾选
        var sort = document.getElementById('nebulaSortBy') ? document.getElementById('nebulaSortBy').value : 'cefr';
        saveConfig({ selected: state.selected.slice(), sort: sort, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
        renderDetailOptions();
        if (state.group) build();
    }

    // 渲染单词聚类多选（词根/形近词）checkbox 面板 + 触发按钮文字
    function renderClusterOptions() {
        var panel = document.getElementById('nebulaClusterSelect');
        var trigger = document.getElementById('nebulaClusterTrigger');
        if (!panel || !trigger) return;
        panel.innerHTML = '';
        var opts = [
            { key: 'root', label: '词根' },
            { key: 'similar', label: '形近词' }
        ];
        opts.forEach(function (o) {
            var checked = clusterActive(o.key);
            var label = document.createElement('label');
            label.className = 'nebula-bookopt';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = checked;
            cb.addEventListener('change', function () { selectCluster(o.key, cb.checked); });
            label.appendChild(cb);
            var span = document.createElement('span');
            span.textContent = o.label;
            label.appendChild(span);
            panel.appendChild(label);
        });
        // 更新触发按钮文字：多选用 + 连接，如 "词根+形近词"
        var names = { root: '词根', similar: '形近词' };
        var active = String(state.cluster || '').split(',').filter(function (p) { return p === 'root' || p === 'similar'; });
        trigger.textContent = active.length ? active.map(function (k) { return names[k] || k; }).join('+') : '无';
    }

    function selectCluster(key, checked) {
        var active = String(state.cluster || '').split(',').filter(function (p) { return p === 'root' || p === 'similar'; });
        var idx = active.indexOf(key);
        if (checked && idx === -1) active.push(key);
        else if (!checked && idx !== -1) active.splice(idx, 1);
        state.cluster = active.join(',') || 'none';
        var sort = document.getElementById('nebulaSortBy') ? document.getElementById('nebulaSortBy').value : 'cefr';
        saveConfig({ selected: state.selected.slice(), sort: sort, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
        renderClusterOptions();
        // 确保所需词典就绪后重建（词根→词根词典；形近词→基础词典）
        var tasks = [];
        if (clusterActive('root') && !state.rootDictLoaded) tasks.push(loadRootDict());
        if (hasClusterOf() && (typeof global.ENGLISHWORDS_DICT === 'undefined' || !global.ENGLISHWORDS_DICT)) tasks.push(loadBaseDict());
        if (!tasks.length) {
            if (state.group) runWithLoader(function () { build(); });
            return;
        }
        showLoader(true);
        Promise.all(tasks).then(function () {
            showLoader(false);
            if (state.group) runWithLoader(function () { build(); });
        });
    }

    // 渲染词单下拉多选列表（词书 + 收藏），checkbox 形式
    function renderBookOptions() {
        var panel = document.getElementById('nebulaBookSelect');
        var trigger = document.getElementById('nebulaBookTrigger');
        if (!panel || !trigger) return;
        panel.innerHTML = '';

        var books = Storage.loadBooks();
        // 已选词单名：仅统计当前存在的词书 + 收藏，避免 state.selected 中的过期/无效 id
        // 使按钮显示不存在的词单名
        var names = [];
        books.forEach(function (book) {
            if (state.selected.indexOf(String(book.id)) !== -1) names.push(book.name || '未命名');
        });
        var favPicked = state.selected.indexOf('favorites') !== -1;

        // 词单选项
        books.forEach(function (book) {
            var id = String(book.id);
            var checked = state.selected.indexOf(id) !== -1;
            var label = document.createElement('label');
            label.className = 'nebula-bookopt';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = checked;
            cb.addEventListener('change', function () { selectBook(id, cb.checked); });
            label.appendChild(cb);
            var span = document.createElement('span');
            span.textContent = book.name || '未命名';
            label.appendChild(span);
            panel.appendChild(label);
        });

        // 收藏选项（虚拟词单）
        var fav = document.createElement('label');
        fav.className = 'nebula-bookopt';
        var favCb = document.createElement('input');
        favCb.type = 'checkbox';
        favCb.checked = favPicked;
        favCb.addEventListener('change', function () { selectBook('favorites', favCb.checked); });
        fav.appendChild(favCb);
        var favSpan = document.createElement('span');
        favSpan.textContent = '♡ 收藏';
        fav.appendChild(favSpan);
        panel.appendChild(fav);

        // 触发按钮直接显示已选词单名（多个以顿号相连），比"已选 N 个词单"更直观
        if (favPicked) names.push('收藏');
        trigger.textContent = names.length ? names.join('、') : '选择词单';
        // 面板最宽 240px，词单多时按钮文字会被省略号截断，故悬停显示完整名单
        trigger.title = names.join('、');
    }

    function selectBook(id, checked) {
        var idx = state.selected.indexOf(id);
        if (checked && idx === -1) {
            state.selected.push(id);
        } else if (!checked && idx !== -1) {
            state.selected.splice(idx, 1);
        }
        if (state.selected.length === 0) {
            // 至少保留一个词单，避免星云为空；默认用收藏
            state.selected.push('favorites');
        }
        var sort = document.getElementById('nebulaSortBy') ? document.getElementById('nebulaSortBy').value : 'cefr';
        saveConfig({ selected: state.selected.slice(), sort: sort, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
        renderBookOptions();
        if (state.group) build();
    }

    // 在例句中高亮目标单词（忽略大小写，匹配常见词形变化后缀）
    function highlightExampleWord(example, word) {
        if (!example) return '';
        var esc = function (s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };
        var target = String(word || '').trim();
        if (!target) return esc(example);
        // 保留原例句可读性：按词边界匹配目标词（含大小写无关及常见后缀）
        var candidates = [target];
        ['s', 'es', 'ed', 'd', 'ing', 'ies', 'er', 'est'].forEach(function (suf) {
            candidates.push(target + suf);
        });
        // 转义例句中所有可能干扰正则的字符
        var template = esc(example);
        var reParts = candidates.map(function (c) { return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
        var re = new RegExp('\\b(' + reParts + ')\\b', 'gi');
        return template.replace(re, '<mark class="nebula-card-hl">$1</mark>');
    }

    // 是否已收藏（全局收藏夹 + 各词书收藏标记，忽略大小写）
    function isWordFavorited(word) {
        if (!word) return false;
        var key = String(word).trim().toLowerCase();
        // 首选为自建收藏词单时，收藏态以该词单为准
        if (global.app && typeof global.app.getFavoriteTargetList === 'function' && global.app.getFavoriteTargetList()) {
            return !!global.app.isFavoriteInTarget(key);
        }
        // 全局收藏
        var globals = Storage.loadFavoriteItems() || [];
        for (var i = 0; i < globals.length; i++) {
            if (globals[i] && String(globals[i].word || '').trim().toLowerCase() === key) return true;
        }
        // 词书中带收藏标记的词
        var books = Storage.loadBooks() || [];
        for (var b = 0; b < books.length; b++) {
            var ws = (books[b].words || []);
            for (var w = 0; w < ws.length; w++) {
                if (ws[w] && ws[w].favorite && String(ws[w].word || '').trim().toLowerCase() === key) return true;
            }
        }
        return false;
    }

    // 切换收藏：收藏/取消收藏当前单词（写入全局收藏夹）
    function toggleCardFavorite(w, favBtn) {
        if (!w || !w.word) return;
        var lower = String(w.word).trim().toLowerCase();
        // 首选为自建收藏词单时，收藏写入该词单（并静默同步到已链接的欧路生词本）
        if (global.app && typeof global.app.getFavoriteTargetList === 'function' && global.app.getFavoriteTargetList()) {
            var addedT = global.app.toggleFavoriteInTarget({
                word: w.word,
                phonetic: w.phonetic || '',
                definitions: (w.definitions && w.definitions.length) ? w.definitions : [{ meaning: w.meaning || '', example: w.example || '' }]
            });
            if (favBtn) {
                favBtn.classList.toggle('favorited', !!addedT);
                favBtn.title = addedT ? '取消收藏' : '收藏';
            }
            if (typeof global.app.renderBookList === 'function') global.app.renderBookList();
            return;
        }
        var favs = Storage.loadFavoriteItems() || [];
        var idx = -1;
        for (var i = 0; i < favs.length; i++) {
            if (favs[i] && String(favs[i].word || '').trim().toLowerCase() === lower) { idx = i; break; }
        }
        // 统一重置词书收藏标记及全局收藏（英文词去重）
        var appeared = favs[idx] ? true : isWordFavorited(w.word);
        if (appeared) {
            // 先移除全局收藏
            if (idx !== -1) {
                favs.splice(idx, 1);
                Storage.saveFavoriteItems(favs);
            }
            // 同时在所有词书里取消收藏标记
            var books = Storage.loadBooks() || [];
            var changed = false;
            for (var b = 0; b < books.length; b++) {
                var ws = (books[b].words || []);
                var bookChanged = false;
                for (var j = 0; j < ws.length; j++) {
                    if (ws[j] && ws[j].favorite && String(ws[j].word || '').trim().toLowerCase() === lower) {
                        ws[j].favorite = false;
                        bookChanged = true;
                    }
                }
                if (bookChanged) Storage.updateBook(books[b].id, books[b]);
            }
            if (favBtn) {
                favBtn.classList.remove('favorited');
                favBtn.title = '收藏';
            }
        } else {
            // 添加全局收藏
            favs.push({
                word: w.word,
                phonetic: w.phonetic || '',
                definitions: (w.definitions && w.definitions.length) ? w.definitions : [{ meaning: w.meaning || '', example: w.example || '' }],
                createdAt: new Date().toISOString()
            });
            Storage.saveFavoriteItems(favs);
            if (favBtn) {
                favBtn.classList.add('favorited');
                favBtn.title = '取消收藏';
            }
        }
        // 同步主应用视图（收藏侧栏等），若存在
        try {
            if (global.app && typeof global.app.scheduleEudicSync === 'function') global.app.scheduleEudicSync();
            if (global.app && typeof global.app.loadBooks === 'function') global.app.loadBooks();
        } catch (e) {}
    }

    // 发音：优先复用主应用 speak()（读取用户基本设置中选的 voiceModel/voiceAccent），
    // 未就绪时回退为系统语音合成
    // btn 可选：传入 nebula-card-speak 按钮时，加载期间按钮显示省略号跳动动画，播放前切回发音图标
    function speakWord(word, btn) {
        try {
            if (!word) return;
            var cb = null;
            if (btn && btn.classList) {
                var self = btn;
                cb = {
                    onReady: function () {
                        self.classList.remove('loading');
                        // 发音开始：icon 轻微膨胀
                        self.classList.add('speaking');
                    },
                    onEnd: function () {
                        self.classList.remove('speaking');
                    },
                    onError: function () {
                        self.classList.remove('loading');
                        self.classList.remove('speaking');
                    }
                };
                btn.classList.add('loading');
            }
            if (global.app && typeof global.app.speak === 'function') {
                global.app.speak(word, cb);
                return;
            }
            // 回退系统语音：立即播放，无加载等待
            if (cb && cb.onReady) cb.onReady();
            if (!window.speechSynthesis) return;
            speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(word);
            u.lang = 'en-US';
            u.onend = function () { if (cb && cb.onEnd) cb.onEnd(); };
            speechSynthesis.speak(u);
        } catch (err) { /* 忽略 */ }
    }

    // 兼容属性访问（供外部读取）
    function getState() { return state; }

    // ---- 星云封面加载动画控制 ----
    // 进度条为"不定进度"流光动画（CSS 驱动），加载层显示即在动，
    // 隐藏即消失，无需 JS 推进或重启动画，不受 build() 阻塞影响。

    // 获取加载器元素
    function loaderEl() {
        return document.getElementById('nebulaLoader');
    }

    // 显隐统一走内联不透明度，并由 CSS 过渡平滑淡入淡出；
    // 用指针置空避免内联 style 与 class 状态互相覆盖导致"完全不显示"。
    function setLoaderVisible(visible) {
        var el = loaderEl();
        if (!el) return;
        el.style.opacity = visible ? '1' : '0';
        el.style.visibility = visible ? 'visible' : 'hidden';
        if (visible) {
            // 每次显示都重新播放进度条（0→99% 硬编码动画）
            var fill = el.querySelector('.nebula-loader-bar-fill');
            if (fill) {
                fill.style.animation = 'none';
                void fill.offsetWidth;  // 强制 reflow 以便动画重置
                fill.style.animation = '';
            }
        }
    }

    // 显示/隐藏加载动画（含最少展示时长，保证可见）
    function showLoader(visible) {
        if (visible) {
            setLoaderVisible(true);
        } else {
            // 淡出（CSS transition 由 opacity 触发）
            setLoaderVisible(false);
        }
    }

    // 通用：显示加载层，让出两帧后执行阻塞重建（build），并保证加载层至少可见片刻
    function runWithLoader(buildFn, onDone) {
        setLoaderVisible(true);
        var shownAt = Date.now();
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                // 防御：确保加载层已被浏览器实际绘制
                requestAnimationFrame(function () {
                    buildFn();
                    // 至少展示 600ms，避免 build 过快时一闪而过
                    var elapsed = Date.now() - shownAt;
                    var wait = Math.max(0, 600 - elapsed);
                    setTimeout(function () {
                        showLoader(false);
                        if (typeof onDone === 'function') onDone();
                    }, wait);
                });
            });
        });
    }

    // 重建星云。可传入 pendingTheme（新主题），用于"先按新主题重建文字色，但页面主题色等加载完再切"。
    // 通过 themeOverride 让 build 配色用目标主题，而不触碰页面 data-theme，
    // 因此加载期间 sidebar/statsbar 等页面主题色不会提前跳变。
    // onDone 在加载动画结束后回调（此时才切换页面主题）。
    function refresh(pendingTheme, onDone) {
        if (!state.renderer || !state.group) {
            if (typeof onDone === 'function') onDone();
            return;
        }
        if (pendingTheme) state.themeOverride = pendingTheme;
        runWithLoader(function () {
            build();
            state.themeOverride = null; // build 后清除覆盖，页面 data-theme 始终未动
        }, function () {
            if (typeof onDone === 'function') onDone();
        });
    }

    // 确保内置“示例单词”词单存在，返回其词书对象（不存在则自动创建）
    function ensureDemoBook() {
        var books = Storage.loadBooks() || [];
        var demo = books.find(function (b) { return String(b.name) === '示例单词'; });
        if (!demo) {
            var demoWords = (global.WordParser && global.WordParser.getDemoWords) ? global.WordParser.getDemoWords() : [];
            if (demoWords.length) demo = Storage.addBook({ name: '示例单词', words: demoWords });
        }
        return demo || null;
    }

    // 从单词导入封面一键切换到星云封面：按默认配置展示单词；
    // 若默认配置无可展示内容，回退到内置示例单词词单，避免星云为空
    function switchFromImport() {
        var cfg = loadConfig();
        if (cfg && Array.isArray(cfg.selected) && cfg.selected.length) {
            state.selected = cfg.selected.slice();
        } else {
            // 新用户/游客默认：选中内置“示例单词”词单
            var demo = ensureDemoBook();
            state.selected = demo ? [String(demo.id)] : [];
        }
        if (collectWords().length === 0) {
            var demo2 = ensureDemoBook();
            if (demo2 && state.selected.indexOf(String(demo2.id)) === -1) {
                state.selected.push(String(demo2.id));
            }
        }
        var sort = document.getElementById('nebulaSortBy') ? document.getElementById('nebulaSortBy').value : 'cefr';
        saveConfig({ selected: state.selected.slice(), sort: sort, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
        apply();
    }

    // 中文逆向查词：扫描基础词典释义（englishwords-dict.js 的 [音标, 释义] 格式），
    // 返回释义中包含该中文片段的英文单词；按释义中匹配位置排序（越靠前越相关），结果内存缓存
    function searchChinese(q, maxN, callback) {
        var w = String(q || '').trim();
        if (!w) { if (callback) callback([]); return; }
        var run = function () {
            if (state.zhCache[w] === undefined) {
                var res = [];
                var d = global.ENGLISHWORDS_DICT;
                if (d) {
                    var keys = Object.keys(d);
                    for (var i = 0; i < keys.length; i++) {
                        var k = keys[i];
                        var e = d[k];
                        if (!Array.isArray(e)) continue;
                        var meaning = e[1] ? String(e[1]) : '';
                        if (meaning.indexOf(w) !== -1) {
                            res.push({ w: k, phonetic: e[0] ? String(e[0]) : '', meaning: meaning });
                        }
                    }
                    res.sort(function (a, b) {
                        var pa = a.meaning.indexOf(w), pb = b.meaning.indexOf(w);
                        return (pa - pb) || (a.w.length - b.w.length);
                    });
                    res = res.slice(0, maxN || 8);
                }
                state.zhCache[w] = res;
            }
            if (callback) callback(state.zhCache[w]);
        };
        if (global.ENGLISHWORDS_DICT) run();
        else loadBaseDict().then(run);
    }

    // 供主页查词下拉补充"形近词"：整体一致性（LCS）+ 字母连贯一致性（最长公共子串）加权，
    // 确保基础词典就绪后计算（首次调用惰性加载）；结果走内存缓存（无词单归属，不写词单）
    function similarWordsOf(word, maxN, callback) {
        var w = String(word || '').trim();
        if (!w) { if (callback) callback([]); return; }
        var run = function () {
            if (global.ENGLISHWORDS_DICT) ensureSimIndexes();
            if (callback) callback(findSimilarWords(w, maxN || 6, null));
        };
        if (global.ENGLISHWORDS_DICT) run();
        else loadBaseDict().then(run);
    }

    global.NebulaCover = {
        apply: apply,
        init: init,
        stop: stop,
        getState: getState,
        refresh: refresh,
        switchFromImport: switchFromImport,
        similar: similarWordsOf,
        lookup: lookupBaseDict, // 基础词典查询（{phonetic, meaning}），供主页形近词展示释义
        searchZh: searchChinese, // 中文逆向查词：扫描基础词典释义返回英文单词
        cefr: cefrOf // CEFR 等级查询（'A1'~'C2'，未命中 ''），供主页查词下拉显示等级 tag
    };
})(window);