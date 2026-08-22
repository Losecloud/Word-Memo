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
        zoom: 1, // 滚轮缩放倍率（仅影响星云结构，不影响文字大小）
        zoomTextScale: 1, // 文字补偿系数，抵消整体缩放
        details: ['word'], // 显示详情：word/phonetic/meaning，至少含 word
        fontSize: 2.5, // 字体大小倍率（新用户/游客默认 2.5）
        speed: 0.1, // 旋转速度倍率（默认 0.1）
        initialized: false, // 星云是否已成功初始化（避免切回封面时重复重建）
        wordColor: primaryColor(), // 单词文字颜色（默认跟随主题主色 var(--primary-color)）
        invertZoom: false, // 缩放反向：开启后滚轮上下方向反转
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
                if (sortSelect && cfg.sort) sortSelect.value = cfg.sort;
            } else {
                // 新用户/游客默认：选中内置“示例单词”词单（不存在则自动创建）
                var demo = ensureDemoBook();
                state.selected = demo ? [String(demo.id)] : [];
            }
            // 恢复缓存配置：显示详情
            if (cfg && Array.isArray(cfg.details) && cfg.details.length) {
                state.details = cfg.details.slice();
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
            // 等待容器可见后再初始化/恢复渲染
            setTimeout(function () {
                bindControls();
                if (state.initialized) {
                    // 已初始化过：不再重建（避免卡顿），但短暂闪现加载动画以提示正在呈现封面
                    showLoader(true);
                    if (!state.raf) animate();
                    // 渐出，保留"正在加载"的过渡观感
                    setTimeout(function () { showLoader(false); }, 320);
                    return;
                }
                // 首次构建：显示加载层，让出两帧后再执行阻塞的 init（内部含 build）
                runWithLoader(function () { init(); });
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
        // 单词（默认必须有，作为主行），100%
        if (state.details.indexOf('word') !== -1 && w.word) {
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

        function pushWord(w, createdAt, source) {
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
                source: source || ''
            });
        }

        if (hasFav) {
            (Storage.loadFavoriteItems() || []).forEach(function (f) { pushWord(f, f.createdAt, '收藏'); });
        }
        state.selected.forEach(function (id) {
            if (id === 'favorites') return;
            var book = books.find(function (b) { return String(b.id) === String(id); });
            if (book) {
                (book.words || []).forEach(function (w) { pushWord(w, book.createdAt, book.name); });
            }
        });
        return words;
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

    // 构建/重建星云
    function build() {
        if (!state.renderer || !state.group) return;
        // 清空场景群
        while (state.group.children.length) state.group.remove(state.group.children[0]);
        // 移除旧背景星点，避免重复叠加
        if (state.stars) {
            state.scene.remove(state.stars);
            state.stars = null;
        }

        var sortBy = document.getElementById('nebulaSortBy').value || 'cefr';
        var words = collectWords();
        computeCloseness(words, sortBy);
        var count = words.length;

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

        words.forEach(function (w, idx) {
            var c = w.closeness; // 0=最外, 1=最里
            // 体积均匀分配：半径在 r³ 空间均匀插值，再开立方，使每层球壳体积占比一致
            // t=(1-c) 从最外到最内，立方插值保证外层体积大、内层体积小
            var innerCube = innerR * innerR * innerR;
            var outerCube = outterR * outterR * outterR;
            var radius = Math.cbrt(innerCube + (1 - c) * (outerCube - innerCube));
            var phi = Math.acos(2 * Math.random() - 1);
            var theta = idx * golden;
            var px = radius * Math.sin(phi) * Math.cos(theta);
            var py = radius * Math.cos(phi) * 0.7;
            var pz = radius * Math.sin(phi) * Math.sin(theta);

            // 单词 Sprite（越靠核心越亮、越大）；颜色由 nebula-controls 的 state.wordColor 决定
            var fontSize = (28 + c * 40) * state.fontSize;
            // 组装多行标签（单词/音标/释义），小字号绘制以容纳多行
            var lines = buildWordLines(w);
            var lineCount = lines.length;
            var drawSize = Math.max(16, Math.round(fontSize / (1 + lineCount * 0.35)));
            var tx = makeTextTexture(lines, { fontSize: drawSize, color: state.wordColor, fontWeight: '500' });
            var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx.texture, transparent: true, depthWrite: false, opacity: 0.5 + c * 0.5 }));
            var s = (16 + c * 18) * 0.48 * state.fontSize;
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
            bindClick(canvas);
            bindOutsideClick(canvas);
        }
        state.renderer.setSize(w, h, false);
        resizeCamera();

        build();
        state.initialized = true;
        // 渲染就绪：由 runWithLoader 统一调用 finishLoader 收尾，此处不再重复

        if (!state.raf) {
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
            // 水平拖动绕 Y 轴，垂直拖动绕 X 轴
            state.group.rotation.y += dx * 0.006;
            state.group.rotation.x += dy * 0.006;
            // 完全无限制，允许任意旋转角度
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

    // 左键点击单词：在原处显示该词完整卡片，1 分钟后恢复精简词条显示
    function bindClick(canvas) {
        if (!canvas) return;
        canvas.addEventListener('click', function (e) {
            if (e.button !== 0 || !state.renderer || !state.camera || !state.group) return;
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
                    if (state.lastCardWord !== spr.userData.word) {
                        showWordCard(spr, e);
                    }
                    return;
                }
            }
            // 点击空白处：恢复所有单词的描边为普通态
            if (state.cardSprite) setWordOutline(state.cardSprite, false);
        });
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
        if (wordEl) wordEl.textContent = w.word || '';
        if (phoEl) phoEl.textContent = w.phonetic || '';
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
        if (meanEl) {
            var posPrefix = (w.pos || '').trim();
            var full = posPrefix ? posPrefix + (w.meaning ? ' ' + w.meaning : '') : (w.meaning || '');
            meanEl.textContent = full || '（暂无释义）';
        }
        // 例句：高亮其中的单词（词形忽略大小写与常见后缀）
        if (exEl) {
            exEl.innerHTML = w.example ? '“' + highlightExampleWord(w.example, w.word) + '”' : '（暂无例句）';
        }
        // 单词来源：右对齐，如《词单ABC》
        var srcEl = document.getElementById('nebulaCardSource');
        if (srcEl) {
            srcEl.textContent = w.source ? '《' + w.source + '》' : '';
        }

        // 发音按钮
        var speakBtn = document.getElementById('nebulaCardSpeak');
        if (speakBtn) {
            speakBtn.onclick = function () {
                speakWord(w.word || '');
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
        speakWord(w.word || '');

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
                // 仅 Y 轴自转（增量式，速度由滑条控制），不覆盖用户手动设置的旋转角度
                state.group.rotation.y += 0.0002 * state.speed;
            }

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
            }
        });

        var sortSelect = document.getElementById('nebulaSortBy');
        sortSelect.addEventListener('change', function () {
            saveConfig({ selected: state.selected.slice(), sort: sortSelect.value, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
            if (state.group) build();
        });

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

        var opts = [
            { key: 'word', label: '单词' },
            { key: 'phonetic', label: '音标' },
            { key: 'meaning', label: '释义' }
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
            word: '单词',
            phonetic: '音标',
            meaning: '释义'
        };
        var shown = state.details.length ? state.details.map(function (k) { return names[k] || k; }).join(' ') : '选择详情';
        trigger.textContent = shown;
    }

    function selectDetail(key, checked) {
        var idx = state.details.indexOf(key);
        if (checked && idx === -1) {
            state.details.push(key);
        } else if (!checked && idx !== -1) {
            state.details.splice(idx, 1);
        }
        // 单词不可取消（作为基础行）
        if (state.details.indexOf('word') === -1) {
            state.details.unshift('word');
        }
        var sort = document.getElementById('nebulaSortBy') ? document.getElementById('nebulaSortBy').value : 'cefr';
        saveConfig({ selected: state.selected.slice(), sort: sort, details: state.details.slice(), fontSize: state.fontSize, speed: state.speed });
        renderDetailOptions();
        if (state.group) build();
    }

    // 渲染词单下拉多选列表（词书 + 收藏），checkbox 形式
    function renderBookOptions() {
        var panel = document.getElementById('nebulaBookSelect');
        var trigger = document.getElementById('nebulaBookTrigger');
        if (!panel || !trigger) return;
        panel.innerHTML = '';

        var books = Storage.loadBooks();
        var count = state.selected.length;

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
        favCb.checked = state.selected.indexOf('favorites') !== -1;
        favCb.addEventListener('change', function () { selectBook('favorites', favCb.checked); });
        fav.appendChild(favCb);
        var favSpan = document.createElement('span');
        favSpan.textContent = '♡ 收藏';
        fav.appendChild(favSpan);
        panel.appendChild(fav);

        // 更新触发按钮文字
        if (count === 0) {
            trigger.textContent = '选择词单';
        } else {
            trigger.textContent = '已选 ' + count + ' 个词单';
        }
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
            if (global.app && typeof global.app.loadBooks === 'function') global.app.loadBooks();
        } catch (e) {}
    }

    // 发音：使用系统语音合成朗读英文单词
    function speakWord(word) {
        try {
            if (!window.speechSynthesis || !word) return;
            speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(word);
            u.lang = 'en-US';
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

    global.NebulaCover = {
        apply: apply,
        init: init,
        stop: stop,
        getState: getState,
        refresh: refresh,
        switchFromImport: switchFromImport
    };
})(window);