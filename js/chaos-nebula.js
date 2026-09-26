// ============================================
// 混沌星云封面（原生 Three.js 移植自 js/word-nebula---单词混沌星云）
// 核心：WebGL 流场粒子（Curl Noise）+ 3D 弹性阻尼物理 + 语义星团聚类 + 语义动态连线
// 数据：用户词书/收藏；语义星团取自 data/englishwords-dict.json 的词义分类路径
// 依赖：lib/three.min.js、Storage
// 独立模块，避免污染主应用类
// ============================================
(function (global) {
    'use strict';

    var Storage = global.Storage;

    /* ========================================================
       着色器（移植自 src/webgl/shaders.ts）
       ======================================================== */

    // 流场粒子顶点着色器：3D Simplex Noise 派生的无散度 Curl 流场 + 鼠标吸引涡旋
    var flowFieldVertexShader = `
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform vec3 uMouse3D;
  uniform float uMouseActive;
  uniform float uAttractionStrength;
  uniform float uPixelRatio;
  uniform float uParticleSize;
  uniform int uTheme;

  attribute vec3 aInitialPos;
  attribute float aSpeed;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vDistToMouse;

  vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  // 3D Curl 噪声：无散度流体速度场
  vec3 computeCurl(vec3 p) {
    float eps = 0.005;
    float n1, n2, a, b;
    vec3 curl;

    n1 = snoise(vec3(p.x, p.y + eps, p.z));
    n2 = snoise(vec3(p.x, p.y - eps, p.z));
    a = (n1 - n2) / (2.0 * eps);

    n1 = snoise(vec3(p.x, p.y, p.z + eps));
    n2 = snoise(vec3(p.x, p.y, p.z - eps));
    b = (n1 - n2) / (2.0 * eps);
    curl.x = a - b;

    n1 = snoise(vec3(p.x, p.y, p.z + eps));
    n2 = snoise(vec3(p.x, p.y, p.z - eps));
    a = (n1 - n2) / (2.0 * eps);

    n1 = snoise(vec3(p.x + eps, p.y, p.z));
    n2 = snoise(vec3(p.x - eps, p.y, p.z));
    b = (n1 - n2) / (2.0 * eps);
    curl.y = a - b;

    n1 = snoise(vec3(p.x + eps, p.y, p.z));
    n2 = snoise(vec3(p.x - eps, p.y, p.z));
    a = (n1 - n2) / (2.0 * eps);

    n1 = snoise(vec3(p.x, p.y + eps, p.z));
    n2 = snoise(vec3(p.x, p.y - eps, p.z));
    b = (n1 - n2) / (2.0 * eps);
    curl.z = a - b;

    return curl;
  }

  void main() {
    float time = uTime * 0.25 * uFlowSpeed * aSpeed + aPhase;
    vec3 baseP = aInitialPos;

    vec3 samplePos = baseP * 0.0022 + vec3(time * 0.35, time * 0.25, time * 0.28);
    float amplitudeFactor = 0.7 + uFlowSpeed * 0.6;
    vec3 flow = computeCurl(samplePos) * 120.0 * amplitudeFactor;
    vec3 secondaryFlow = computeCurl(samplePos * 2.3 - vec3(time * 0.15)) * 40.0 * amplitudeFactor;

    vec3 currentPos = baseP + flow + secondaryFlow;

    float distToMouse = length(currentPos - uMouse3D);
    vDistToMouse = distToMouse;

    if (uMouseActive > 0.5 && distToMouse < 550.0 && uAttractionStrength > 0.01) {
      float attractFactor = 1.0 - smoothstep(10.0, 550.0, distToMouse);
      attractFactor = pow(attractFactor, 1.5);

      vec3 toMouse = normalize(uMouse3D - currentPos);
      currentPos += toMouse * (attractFactor * 160.0 * uAttractionStrength);

      vec3 tangent = cross(toMouse, vec3(0.0, 0.0, 1.0));
      currentPos += tangent * (attractFactor * 130.0 * uAttractionStrength);
    }

    vColor = aColor;
    if (uTheme == 1) {
      vColor = mix(aColor, vec3(0.75, 0.35, 0.98), 0.35);
    } else if (uTheme == 2) {
      vColor = mix(aColor, vec3(0.18, 0.88, 0.65), 0.45);
    } else if (uTheme == 3) {
      vColor = mix(aColor, vec3(0.15, 0.45, 0.75), 0.3);
    }

    if (uMouseActive > 0.5 && distToMouse < 260.0) {
      float boost = (1.0 - distToMouse / 260.0) * 0.5;
      vColor += vec3(boost * 0.6, boost * 0.8, boost * 1.0);
    }

    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float depthFactor = 280.0 / (-mvPosition.z);
    gl_PointSize = max(1.5, aSize * depthFactor * uPixelRatio * uParticleSize);

    vAlpha = clamp(0.25 + 0.55 * sin(time * 2.0 + aPhase * 6.28), 0.15, 0.95);
  }
`;

    // 流场粒子片元着色器：高斯衰减柔和圆形光点
    var flowFieldFragmentShader = `
  uniform float uGlow;
  uniform int uTheme;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vDistToMouse;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) {
      discard;
    }

    float core = 1.0 - smoothstep(0.0, 0.2, dist);
    float halo = 1.0 - smoothstep(0.1, 0.5, dist);
    float alpha = (core * 0.6 + halo * 0.4) * vAlpha * uGlow;

    vec3 finalColor = vColor + vec3(core * 0.5);

    if (uTheme == 3) {
      gl_FragColor = vec4(finalColor * 0.85, alpha * 0.8);
    } else {
      gl_FragColor = vec4(finalColor, alpha);
    }
  }
`;

    var cosmicBackgroundVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

    // 宇宙背景片元着色器：径向星云渐变 + 稀疏微星点（浅色主题用中性冷白调）
    var cosmicBackgroundFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform int uTheme;

  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspectUv = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

    vec3 colA, colB, colC;

    if (uTheme == 1) {
      colA = vec3(0.03, 0.015, 0.08);
      colB = vec3(0.12, 0.04, 0.22);
      colC = vec3(0.01, 0.02, 0.05);
    } else if (uTheme == 2) {
      colA = vec3(0.01, 0.04, 0.04);
      colB = vec3(0.03, 0.14, 0.12);
      colC = vec3(0.005, 0.02, 0.03);
    } else if (uTheme == 3) {
      // 浅色主题：中性冷白（中心近白 → 两侧极浅灰），不带绿色倾向
      colA = vec3(0.96, 0.97, 0.98);
      colB = vec3(0.90, 0.92, 0.94);
      colC = vec3(0.88, 0.90, 0.92);
    } else {
      colA = vec3(0.02, 0.03, 0.07);
      colB = vec3(0.05, 0.08, 0.16);
      colC = vec3(0.01, 0.015, 0.03);
    }

    float dist = length(aspectUv);
    float vignette = smoothstep(1.3, 0.2, dist);

    float drift = sin(uTime * 0.05 + aspectUv.x * 2.0) * 0.1;
    vec3 baseBg = mix(colC, colA, vignette + drift);

    vec3 centerGlow = colB * (1.0 - smoothstep(0.0, 0.9, dist)) * 0.6;
    vec3 finalBg = baseBg + centerGlow;

    if (uTheme != 3) {
      vec2 starGrid = uv * 380.0;
      vec2 cellId = floor(starGrid);
      vec2 cellFract = fract(starGrid) - vec2(0.5);
      float starRand = hash(cellId);

      if (starRand > 0.9945) {
        vec2 starOffset = (vec2(hash(cellId + 1.2), hash(cellId + 3.7)) - 0.5) * 0.4;
        float starDist = length(cellFract - starOffset);
        float starIntensity = smoothstep(0.16, 0.02, starDist);
        float twinkle = sin(uTime * 1.6 + starRand * 120.0) * 0.35 + 0.65;
        vec3 starCol = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.96, 0.88), fract(starRand * 17.0));
        finalBg += starCol * (starIntensity * starRand * 0.45 * twinkle);
      }
    }

    gl_FragColor = vec4(finalBg, 1.0);
  }
`;

    /* ========================================================
       常量与状态
       ======================================================== */

    var MAX_CLUSTERS = 14;      // 语义星团上限（超出归入「其他」）
    var MAX_LINKS = 6;          // 单次高亮显示的语义连线上限
    var CLUSTER_RADIUS = 320;   // 星团中心到原点的距离
    var SEMANTIC_SPREAD = 2.2;  // 星团内语义向量扩散倍率（同原应用）
    var CLOUD_RADIUS = 480;     // 粒子云半径（同原应用）

    // 星团配色（A 方案「清透霓虹」，深浅主题通用，按星团名稳定取色）
    // 理性物质派（冷色调）：01政法与军事 / 02经济与产业 / 03空间与交通 / 04科学与技术 / 09时间与数量
    // 感性意识派（暖色调）：05语言与沟通 / 06生活与休闲 / 07医疗与身心 / 08感知与运动 / 10思维与意志
    var CLUSTER_COLOR_BY_NAME = {
        // 理性物质派（冷）
        '政法与军事': '#3b82f6',
        '经济与产业': '#14b8a6',
        '空间与交通': '#22d3ee',
        '科学与技术': '#6366f1',
        '时间与数量': '#0ea5e9',
        // 感性意识派（暖）
        '语言与沟通': '#f59e0b',
        '生活与休闲': '#f97316',
        '医疗与身心': '#ec4899',
        '感知与运动': '#fbbf24',
        '思维与意志': '#d946ef'
    };
    // 兜底色（未分类 / 其他 / 未知分类）：中性色，避免抢占两派语义
    var CLUSTER_FALLBACK_COLORS = ['#7a9e9e', '#8a9aa6', '#6f9a8e'];

    var state = {
        renderer: null, scene: null, camera: null,
        bgScene: null, bgCamera: null, bgMesh: null, bgMaterial: null,
        particleSystem: null, particleMaterial: null, particleGeo: null,
        lineSegments: null, lineGeo: null, lineMaterial: null,
        nodesWrap: null, svg: null, svgGroup: null,
        nodes: [], clusters: [],
        clock: null, raf: null, lastTheme: null,
        selected: [],
        flowSpeed: 0.3,
        particleCount: 18000,
        particleGlow: 1.2,
        rotateSpeed: 0.3,
        autoRotate: true,
        showLinks: true,
        fontSize: 15,
        dragging: false, dragMode: null, prevX: 0, prevY: 0,
        // 触屏双指手势：手势初值快照与扭动累积量（见 applyTouchGesture）
        touchGesture: null, touchTwist: 0,
        theta: 0, phi: Math.PI / 2.35, radius: 820,
        tTheta: 0, tPhi: Math.PI / 2.35, tRadius: 820,
        pendingView: null, // 预置视口（封面视窗恢复视角用）：在初始化完成时套用，避免先默认视角再跳变
        lookAt: null, tLookAt: null,
        mouse3D: null, mouseActive: false, raycaster: null, planeZ: null,
        hoverId: null, selectedId: null,
        activeLinks: [], linkT: 0,
        cardNodeId: null, cardTimer: null,
        movedFar: false, downX: 0, downY: 0,
        maxLines: 0,
        initialized: false, controlsBound: false, eventsBound: false,
        lastBuildKey: null
    };

    /* ========================================================
       工具
       ======================================================== */

    // 字符串 → 32 位散列（用于给单词生成稳定的语义向量，保证每次重建位置一致）
    function hashStr(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = (h * 16777619) >>> 0;
        }
        return h >>> 0;
    }

    // mulberry32：由种子生成 [0,1) 伪随机序列（可复现）
    function rngOf(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function isDarkMode() {
        try {
            return (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
        } catch (e) { return true; }
    }

    // 页面主题 → 着色器主题索引：深色用默认深空，浅色用曙光浅绿
    function themeIndex() {
        return isDarkMode() ? 0 : 3;
    }

    function threeReady() {
        return typeof global.THREE !== 'undefined';
    }

    function coverEl() { return document.getElementById('coverChaos'); }

    function coverVisible() {
        var el = coverEl();
        return !!(el && !el.classList.contains('hidden') && el.offsetWidth > 0 && el.offsetHeight > 0);
    }

    // 读取已保存的封面配置（按用户隔离）
    function loadConfig() {
        try {
            if (Storage && typeof Storage.loadChaosConfig === 'function') {
                return Storage.loadChaosConfig();
            }
        } catch (e) { /* 忽略 */ }
        return null;
    }

    function saveConfig() {
        try {
            if (Storage && typeof Storage.saveChaosConfig === 'function') {
                Storage.saveChaosConfig({
                    selected: state.selected.slice(),
                    flowSpeed: state.flowSpeed,
                    particleCount: state.particleCount,
                    particleGlow: state.particleGlow,
                    rotateSpeed: state.rotateSpeed,
                    autoRotate: state.autoRotate,
                    showLinks: state.showLinks,
                    fontSize: state.fontSize
                });
            }
        } catch (e) { /* 忽略 */ }
    }

    /* ========================================================
       数据：词条、语义星团
       ======================================================== */

    // 确保内置「示例单词」词单存在（与单词星云封面一致的新用户兜底）
    function ensureDemoBook() {
        var books = Storage.loadBooks() || [];
        var demo = books.find(function (b) { return String(b.name) === '示例单词'; });
        if (!demo) {
            var demoWords = (global.WordParser && global.WordParser.getDemoWords) ? global.WordParser.getDemoWords() : [];
            if (demoWords.length) demo = Storage.addBook({ name: '示例单词', words: demoWords });
        }
        return demo || null;
    }

    // 收集选中词单 + 收藏中的词条
    function collectWords() {
        var words = [];
        var seen = {};
        var books = Storage.loadBooks() || [];

        function pushWord(w, source, bookId) {
            var key = String(w.word || w.name || '').trim().toLowerCase();
            if (!key || seen[key]) return;
            seen[key] = true;
            var def0 = (w.definitions && w.definitions[0]) || {};
            var accuracyRate = -1;
            if ((w.totalAttempts || 0) > 0) {
                accuracyRate = Math.round(((w.totalAttempts - (w.wrongTimes || 0)) / w.totalAttempts) * 100);
            }
            words.push({
                word: w.word || w.name || '',
                phonetic: w.phonetic || '',
                pos: def0.pos || '',
                meaning: def0.meaning || '',
                accuracyRate: accuracyRate,
                source: source || '',
                bookId: bookId || ''
            });
        }

        if (state.selected.indexOf('favorites') !== -1) {
            (Storage.loadFavoriteItems() || []).forEach(function (f) { pushWord(f, '收藏', 'favorites'); });
        }
        state.selected.forEach(function (id) {
            if (id === 'favorites') return;
            var book = books.find(function (b) { return String(b.id) === String(id); });
            if (book) {
                (book.words || []).forEach(function (w) { pushWord(w, book.name, book.id); });
            }
        });
        return words;
    }

    // 词义分类路径（如「专业学科/生物/植物」），来自基础汉英类义词典；无则返回空串
    function categoryOf(word) {
        var d = global.ENGLISHWORDS_DICT;
        if (!d) return '';
        var entry = d[String(word || '').trim().toLowerCase()];
        if (!Array.isArray(entry)) return '';
        return entry[2] ? String(entry[2]) : '';
    }

    // 语义星团取词义分类路径，而该路径字段位于基础词典 ENGLISHWORDS_DICT——
    // 它由查词引擎在 Worker 线程内加载，主线程全局并不存在，故此处补一次惰性加载：
    // 复用 nebula.js 的加载器（同一份数据、同一份「基础词典」开关），未就绪期间先按
    // 「未分类」正常渲染，数据到位后再重建一次补齐星团，避免为等 8.8MB 卡住白屏。
    var categoryDictPending = false;
    function ensureCategoryDict() {
        if (global.ENGLISHWORDS_DICT || categoryDictPending) return;
        var nc = global.NebulaCover;
        if (!nc || typeof nc.loadBaseDict !== 'function') return;
        categoryDictPending = true;
        nc.loadBaseDict().then(function (d) {
            categoryDictPending = false;
            if (!d) return; // 加载失败或用户已停用基础词典：保持未分类
            if (coverVisible() && state.initialized && collectWords().length) { build(); if (!state.raf) animate(); }
            else state.lastBuildKey = ''; // 不在前台或尚未初始化：作废构建键，下次进入封面时重建
        });
    }

    // 名称 → 稳定色（同名星团颜色恒定）
    function colorOf(name, idx) {
        if (CLUSTER_COLOR_BY_NAME[name]) return CLUSTER_COLOR_BY_NAME[name];
        return CLUSTER_FALLBACK_COLORS[idx % CLUSTER_FALLBACK_COLORS.length];
    }

    // 构建语义星团：一级分类为星团，中心按斐波那契球均匀分布
    function buildClusters(words) {
        var counts = {};
        var order = [];
        words.forEach(function (w) {
            var name = w.cluster || '未分类';
            if (counts[name] === undefined) { counts[name] = 0; order.push(name); }
            counts[name]++;
        });
        // 词量降序，保证主要星团优先保留
        order.sort(function (a, b) {
            return (counts[b] - counts[a]) || (a < b ? -1 : 1);
        });

        var kept = order.slice(0, MAX_CLUSTERS);
        var merged = order.length > MAX_CLUSTERS;
        if (merged && kept.indexOf('其他') === -1) kept.push('其他');
        var map = {};
        kept.forEach(function (name, i) { map[name] = i; });

        var clusters = kept.map(function (name, i) {
            var y = kept.length > 1 ? 1 - (i / (kept.length - 1)) * 2 : 0;
            var r = Math.sqrt(Math.max(0, 1 - y * y));
            var th = i * Math.PI * (3 - Math.sqrt(5));
            return {
                name: name,
                color: colorOf(name, i),
                center: [
                    Math.cos(th) * r * CLUSTER_RADIUS,
                    y * CLUSTER_RADIUS,
                    Math.sin(th) * r * CLUSTER_RADIUS
                ],
                count: counts[name] || 0
            };
        });

        return { clusters: clusters, map: map, merged: merged };
    }

    // 选取参与渲染的词：选中的词全量上图，不做数量截断。
    // 仍按星团轮询展开：相邻数组下标落在不同星团，而近邻互斥只在相邻下标间
    // 取样（见 updatePhysics 第 5 步），轮询可让这种近似配对尽量跨星团、
    // 避免同团词被成片硬挤在一起
    function pickNodes(words) {
        var buckets = {};
        var order = [];
        words.forEach(function (w) {
            var n = w.cluster || '未分类';
            if (!buckets[n]) { buckets[n] = []; order.push(n); }
            buckets[n].push(w);
        });
        var maxLen = 0;
        order.forEach(function (k) { if (buckets[k].length > maxLen) maxLen = buckets[k].length; });
        var picked = [];
        for (var i = 0; i < maxLen; i++) {
            for (var b = 0; b < order.length; b++) {
                if (i < buckets[order[b]].length) picked.push(buckets[order[b]][i]);
            }
        }
        return picked;
    }

    /* ========================================================
       Three.js 场景
       ======================================================== */

    function init() {
        if (!threeReady()) {
            console.warn('⚠️ 混沌星云需要 Three.js，请确认 lib/three.min.js 已加载');
            return;
        }
        var root = coverEl();
        var canvas = document.getElementById('chaosCanvas');
        if (!root || !canvas) return;
        var w = root.clientWidth || window.innerWidth;
        var h = root.clientHeight || window.innerHeight;
        if (w <= 0 || h <= 0) return;

        state.nodesWrap = document.getElementById('chaosNodes');
        state.svg = document.getElementById('chaosLinks');
        state.svgGroup = document.getElementById('chaosLinkGroup');

        if (!state.renderer) {
            state.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            state.renderer.autoClear = false;

            state.camera = new THREE.PerspectiveCamera(55, w / h, 1, 4000);

            state.scene = new THREE.Scene();

            // 背景宇宙氛围四边形
            state.bgScene = new THREE.Scene();
            state.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            state.bgMaterial = new THREE.ShaderMaterial({
                vertexShader: cosmicBackgroundVertexShader,
                fragmentShader: cosmicBackgroundFragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uResolution: { value: new THREE.Vector2(w, h) },
                    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                    uTheme: { value: themeIndex() }
                },
                depthWrite: false,
                depthTest: false
            });
            state.bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), state.bgMaterial);
            state.bgScene.add(state.bgMesh);

            // 交互与相机状态
            state.clock = new THREE.Clock();
            state.lookAt = new THREE.Vector3(0, 0, 0);
            state.tLookAt = new THREE.Vector3(0, 0, 0);
            state.mouse3D = new THREE.Vector3(0, 0, 0);
            state.raycaster = new THREE.Raycaster();
            state.planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            state.lastTheme = themeIndex();

            bindEvents();
        }

        state.renderer.setSize(w, h, false);
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        if (state.bgMaterial) state.bgMaterial.uniforms.uResolution.value.set(w, h);

        build();
        state.initialized = true;

        // 封面视窗恢复视角：预置视角在初始化完成时立即套用，首帧即缓存视角（避免跳变）
        if (state.pendingView) {
            var pv = state.pendingView;
            state.pendingView = null;
            state.tTheta = state.theta = pv.theta;
            state.tPhi = state.phi = pv.phi;
            state.tRadius = state.radius = pv.radius;
            if (pv.lookAt && state.lookAt) {
                state.tLookAt.set(pv.lookAt[0], pv.lookAt[1], pv.lookAt[2]);
                state.lookAt.set(pv.lookAt[0], pv.lookAt[1], pv.lookAt[2]);
            }
        }

        if (!state.raf) animate();
    }

    function resize() {
        if (!state.renderer) return;
        var root = coverEl();
        if (!root) return;
        var w = root.clientWidth || window.innerWidth;
        var h = root.clientHeight || window.innerHeight;
        if (w <= 0 || h <= 0) return;
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(w, h, false);
        if (state.bgMaterial) state.bgMaterial.uniforms.uResolution.value.set(w, h);
    }

    // 词单输入指纹：选中词单 + 各自词条数（用于判断是否需要重建）
    function inputKey() {
        var books = Storage.loadBooks() || [];
        var parts = ['fav:' + (Storage.loadFavoriteItems() || []).length];
        state.selected.forEach(function (id) {
            if (id === 'favorites') return;
            var b = books.find(function (x) { return String(x.id) === String(id); });
            parts.push(id + ':' + (b ? (b.words || []).length : 0));
        });
        return parts.join(',');
    }

    // 构建：星团 → 词节点 → 粒子流场 → 语义连线几何
    function build() {
        var words = collectWords();

        // 标注每个词的星团、子分类与释义字集（供语义连线强度计算）
        words.forEach(function (w) {
            var path = categoryOf(w.word);
            w.path = path;
            var segs = path ? path.split('/') : [];
            w.cluster = segs[0] || '未分类';
            w.path0 = segs[0] || ''; // 一级分类原文（供孤立词判定，不受星团合并影响）
            w.sub = segs[1] || '';
            // 释义优先取词单数据，缺失时回落到基础词典，保证释义重合度有足够覆盖
            var mean = w.meaning;
            if (!mean) {
                var e = global.ENGLISHWORDS_DICT &&
                    global.ENGLISHWORDS_DICT[String(w.word || '').trim().toLowerCase()];
                if (Array.isArray(e) && e[1]) mean = e[1];
            }
            w.units = glossUnits(mean);
            // 词根分解（词根词缀词典，覆盖常见学术词约六成；无数据不影响其他指标）
            var R = global.WORD_ROOTS_DICT;
            w.roots = (R && R[String(w.word || '').trim().toLowerCase()]) || null;
        });

        // 依据标注结果构建语义星团（超出上限的一级分类并入「其他」）
        var built = buildClusters(words);
        state.clusters = built.clusters;
        var cmap = built.map;
        var merged = built.merged;
        words.forEach(function (w) {
            var name = w.cluster;
            if (merged && cmap[name] === undefined) name = '其他';
            var idx = cmap[name];
            if (idx === undefined) idx = 0;
            w.clusterIdx = idx;
            w.clusterName = state.clusters[idx].name;
            w.clusterColor = state.clusters[idx].color;
            w.clusterCenter = state.clusters[idx].center;
        });

        buildNodes(pickNodes(words));
        applyIsolation();
        buildParticles(state.particleCount);
        buildLines();
        rebuildLinks();
        updateStatLine(words.length);
        state.lastBuildKey = inputKey();
    }

    function buildNodes(list) {
        var wrap = state.nodesWrap;
        if (!wrap) return;
        wrap.innerHTML = '';
        state.nodes = [];
        state.hoverId = null;
        state.selectedId = null;
        hideCard();

        var frag = document.createDocumentFragment();
        list.forEach(function (w) {
            var cls = state.clusters[w.clusterIdx] || state.clusters[0];
            var center = cls ? cls.center : [0, 0, 0];
            var rnd = rngOf(hashStr(w.word.toLowerCase()));

            // 语义向量：由单词名散列稳定生成，保证重建后位置一致
            var sv = [
                (rnd() - 0.5) * 120,
                (rnd() - 0.5) * 120,
                (rnd() - 0.5) * 120
            ];
            var targetPos = [
                center[0] + sv[0] * SEMANTIC_SPREAD,
                center[1] + sv[1] * SEMANTIC_SPREAD,
                center[2] + sv[2] * SEMANTIC_SPREAD
            ];
            var currentPos = [
                targetPos[0] + (rnd() - 0.5) * 60,
                targetPos[1] + (rnd() - 0.5) * 60,
                targetPos[2] + (rnd() - 0.5) * 60
            ];

            var el = document.createElement('div');
            el.className = 'chaos-word-node';
            el.style.setProperty('--chaos-node-color', w.clusterColor || CLUSTER_FALLBACK_COLORS[0]);
            var wordSpan = document.createElement('span');
            wordSpan.className = 'chaos-word';
            wordSpan.textContent = w.word;
            el.appendChild(wordSpan);
            if (w.pos || w.meaning) {
                var meta = document.createElement('span');
                meta.className = 'chaos-word-meta';
                if (w.pos) {
                    var posEl = document.createElement('i');
                    posEl.className = 'chaos-pos';
                    posEl.textContent = w.pos;
                    meta.appendChild(posEl);
                }
                var meanEl = document.createElement('em');
                meanEl.className = 'chaos-mean';
                meanEl.textContent = String(w.meaning || '').split('；')[0].slice(0, 14);
                meta.appendChild(meanEl);
                el.appendChild(meta);
            }
            var dot = document.createElement('i');
            dot.className = 'chaos-node-dot';
            el.appendChild(dot);
            frag.appendChild(el);

            var node = {
                id: w.word.toLowerCase(),
                data: w,
                el: el,
                targetPos: targetPos,
                currentPos: currentPos,
                velocity: [0, 0, 0],
                screenX: 0, screenY: 0, screenZ: 0, scale: 1,
                visible: false, hovered: false, selected: false, isNeighbor: false,
                domVisible: null, lastState: ''
            };
            el.addEventListener('mouseenter', function () { setHover(node.id); });
            el.addEventListener('mouseleave', function () { setHover(null); });
            el.addEventListener('click', function (e) {
                e.stopPropagation();
                // 拖拽超过阈值视为视角拖动，不弹出词卡
                var dx = e.clientX - state.prevX;
                var dy = e.clientY - state.prevY;
                if (state.movedFar) return;
                openCard(node);
            });
            state.nodes.push(node);
        });
        wrap.appendChild(frag);
    }

    function buildParticles(count) {
        if (state.particleGeo) {
            state.scene.remove(state.particleSystem);
            state.particleGeo.dispose();
            state.particleMaterial.dispose();
            state.particleGeo = null;
            state.particleMaterial = null;
            state.particleSystem = null;
        }

        var positions = new Float32Array(count * 3);
        var initialPos = new Float32Array(count * 3);
        var colors = new Float32Array(count * 3);
        var speeds = new Float32Array(count);
        var sizes = new Float32Array(count);
        var phases = new Float32Array(count);

        // 粒子按星团配色着色，星团缺失时回退到内置调色板
        var palette = (state.clusters.length ? state.clusters.map(function (c) { return c.color; }) : CLUSTER_FALLBACK_COLORS);

        for (var i = 0; i < count; i++) {
            var i3 = i * 3;
            var u = Math.random();
            var v = Math.random();
            var theta = u * 2.0 * Math.PI;
            var phi = Math.acos(2.0 * v - 1.0);
            var r = Math.cbrt(Math.random()) * CLOUD_RADIUS + 30;

            var x = r * Math.sin(phi) * Math.cos(theta) * 1.3;
            var y = r * Math.sin(phi) * Math.sin(theta);
            var z = r * Math.cos(phi) * 0.9;

            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;
            initialPos[i3] = x;
            initialPos[i3 + 1] = y;
            initialPos[i3 + 2] = z;

            var hex = palette[i % palette.length];
            var rgb = hexToRgb(hex);
            var vary = 0.8 + Math.random() * 0.4;
            colors[i3] = (rgb[0] / 255) * vary;
            colors[i3 + 1] = (rgb[1] / 255) * vary;
            colors[i3 + 2] = (rgb[2] / 255) * vary;

            speeds[i] = 0.5 + Math.random() * 1.2;
            sizes[i] = 1.2 + Math.random() * 2.8;
            phases[i] = Math.random();
        }

        state.particleGeo = new THREE.BufferGeometry();
        state.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        state.particleGeo.setAttribute('aInitialPos', new THREE.BufferAttribute(initialPos, 3));
        state.particleGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        state.particleGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
        state.particleGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        state.particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

        var light = !isDarkMode();
        state.particleMaterial = new THREE.ShaderMaterial({
            vertexShader: flowFieldVertexShader,
            fragmentShader: flowFieldFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uFlowSpeed: { value: state.flowSpeed },
                uMouse3D: { value: state.mouse3D || new THREE.Vector3() },
                uMouseActive: { value: 0 },
                uAttractionStrength: { value: 0.35 },
                uPixelRatio: { value: state.renderer.getPixelRatio() },
                uParticleSize: { value: 1.0 },
                uGlow: { value: state.particleGlow },
                uTheme: { value: themeIndex() }
            },
            transparent: true,
            depthWrite: false,
            blending: light ? THREE.NormalBlending : THREE.AdditiveBlending
        });

        state.particleSystem = new THREE.Points(state.particleGeo, state.particleMaterial);
        state.scene.add(state.particleSystem);
    }

    function hexToRgb(hex) {
        var h = String(hex || '').replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        if (isNaN(n)) return [120, 180, 220];
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    // 星团高亮连线在 GPU 层是 LineSegments（此处用于未高亮时的近邻星尘线）
    function buildLines() {
        var maxLines = 1200;
        if (state.lineGeo) {
            state.scene.remove(state.lineSegments);
            state.lineGeo.dispose();
            state.lineMaterial.dispose();
        }
        var positions = new Float32Array(maxLines * 2 * 3);
        var colors = new Float32Array(maxLines * 2 * 3);
        state.lineGeo = new THREE.BufferGeometry();
        state.lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        state.lineGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        state.lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            linewidth: 1.5
        });
        state.lineSegments = new THREE.LineSegments(state.lineGeo, state.lineMaterial);
        state.scene.add(state.lineSegments);
        state.maxLines = maxLines;
    }

    /* ========================================================
       物理与渲染
       ======================================================== */

    function updatePhysics(dt, time) {
        var stiffness = 0.12;
        var damping = 0.5;
        var attraction = 0.35;
        var flowSpeed = state.flowSpeed;
        var nodes = state.nodes;

        var active = null;
        if (state.hoverId) active = findNode(state.hoverId);
        else if (state.selectedId) active = findNode(state.selectedId);

        var neighborIds = {};
        if (active) {
            relatedOf(active).forEach(function (r) { neighborIds[r.node.id] = true; });
        }

        var camW = state.nodesWrap ? (state.nodesWrap.clientWidth || 1) : 1;
        var camH = state.nodesWrap ? (state.nodesWrap.clientHeight || 1) : 1;
        var camPos = state.camera.position;

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var isHovered = node.id === state.hoverId;
            var isSelected = node.id === state.selectedId;
            var isNeighbor = !!neighborIds[node.id];
            node.hovered = isHovered;
            node.selected = isSelected;
            node.isNeighbor = isNeighbor;

            // 1. 弹性回位
            var fx = -stiffness * (node.currentPos[0] - node.targetPos[0]);
            var fy = -stiffness * (node.currentPos[1] - node.targetPos[1]);
            var fz = -stiffness * (node.currentPos[2] - node.targetPos[2]);

            // 2. 有机流场漂移
            if (flowSpeed > 0.05) {
                var scale = 0.0022;
                var flowScale = flowSpeed * 38.0;
                fx += Math.sin(node.targetPos[1] * scale + time * 0.9 * flowSpeed) * Math.cos(node.targetPos[2] * scale + time * 0.7 * flowSpeed) * flowScale;
                fy += Math.cos(node.targetPos[0] * scale + time * 1.1 * flowSpeed) * Math.sin(node.targetPos[2] * scale + time * 0.8 * flowSpeed) * flowScale;
                fz += Math.sin(node.targetPos[0] * scale + time * 0.8 * flowSpeed) * Math.cos(node.targetPos[1] * scale + time * 1.0 * flowSpeed) * (flowScale * 0.6);
            }

            // 3. 鼠标引力 + 切向涡旋
            if (state.mouseActive && attraction > 0.005 && state.mouse3D) {
                var dx = state.mouse3D.x - node.currentPos[0];
                var dy = state.mouse3D.y - node.currentPos[1];
                var dz = state.mouse3D.z - node.currentPos[2];
                var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                var influenceRadius = 320;
                var deadzone = 30;
                if (dist < influenceRadius && dist > deadzone) {
                    var normDist = (dist - deadzone) / (influenceRadius - deadzone);
                    var factor = Math.sin(normDist * Math.PI) * 18.0 * attraction;
                    var invD = 1 / dist;
                    fx += dx * invD * factor;
                    fy += dy * invD * factor;
                    fz += dz * invD * factor * 0.3;
                } else if (dist <= deadzone && dist > 1) {
                    var cushion = (deadzone - dist) * 0.15 * Math.max(0.2, attraction);
                    var invD2 = 1 / dist;
                    fx -= dx * invD2 * cushion;
                    fy -= dy * invD2 * cushion;
                }
            }

            // 4. 语义近邻向高亮词弹性靠拢
            if (active && isNeighbor) {
                var ndx = active.currentPos[0] - node.currentPos[0];
                var ndy = active.currentPos[1] - node.currentPos[1];
                var ndz = active.currentPos[2] - node.currentPos[2];
                var ndist = Math.sqrt(ndx * ndx + ndy * ndy + ndz * ndz);
                if (ndist > 70) {
                    fx += ndx * 0.05;
                    fy += ndy * 0.05;
                    fz += ndz * 0.05;
                }
            }

            // 5. 近邻互斥，避免词节点重叠
            for (var j = i + 1; j < Math.min(nodes.length, i + 6); j++) {
                var other = nodes[j];
                var rx = node.currentPos[0] - other.currentPos[0];
                var ry = node.currentPos[1] - other.currentPos[1];
                var rz = node.currentPos[2] - other.currentPos[2];
                var rDist = Math.sqrt(rx * rx + ry * ry + rz * rz);
                if (rDist < 38 && rDist > 0.1) {
                    var repForce = (38 - rDist) * 0.06;
                    var invR = 1 / rDist;
                    fx += rx * invR * repForce;
                    fy += ry * invR * repForce;
                    fz += rz * invR * repForce;
                }
            }

            // 6. 阻尼积分
            node.velocity[0] = (node.velocity[0] + fx * dt) * damping;
            node.velocity[1] = (node.velocity[1] + fy * dt) * damping;
            node.velocity[2] = (node.velocity[2] + fz * dt) * damping;

            node.currentPos[0] += node.velocity[0] * dt * 60;
            node.currentPos[1] += node.velocity[1] * dt * 60;
            node.currentPos[2] += node.velocity[2] * dt * 60;

            // 7. 位移钳制（随引力与流场速度自适应）
            var dispX = node.currentPos[0] - node.targetPos[0];
            var dispY = node.currentPos[1] - node.targetPos[1];
            var dispZ = node.currentPos[2] - node.targetPos[2];
            var dispDist = Math.sqrt(dispX * dispX + dispY * dispY + dispZ * dispZ);
            var maxDisp = 30 + attraction * 85 + flowSpeed * 35;
            if (dispDist > maxDisp) {
                var ratio = maxDisp / dispDist;
                node.currentPos[0] = node.targetPos[0] + dispX * ratio;
                node.currentPos[1] = node.targetPos[1] + dispY * ratio;
                node.currentPos[2] = node.targetPos[2] + dispZ * ratio;
                node.velocity[0] *= 0.5;
                node.velocity[1] *= 0.5;
                node.velocity[2] *= 0.5;
            }

            // 8. 投影到屏幕
            var v = projectVec(node, state.camera);
            node.screenX = (v.x * 0.5 + 0.5) * camW;
            node.screenY = (-v.y * 0.5 + 0.5) * camH;
            node.screenZ = v.z;
            node.visible = v.z < 1.0;

            var dcx = camPos.x - node.currentPos[0];
            var dcy = camPos.y - node.currentPos[1];
            var dcz = camPos.z - node.currentPos[2];
            var distToCamera = Math.sqrt(dcx * dcx + dcy * dcy + dcz * dcz);
            node.scale = Math.max(0.65, Math.min(1.45, 680 / distToCamera));
        }
    }

    var _projVec = null;
    function projectVec(node, camera) {
        if (!_projVec) _projVec = new THREE.Vector3();
        _projVec.set(node.currentPos[0], node.currentPos[1], node.currentPos[2]);
        _projVec.project(camera);
        return _projVec;
    }

    function findNode(id) {
        for (var i = 0; i < state.nodes.length; i++) {
            if (state.nodes[i].id === id) return state.nodes[i];
        }
        return null;
    }

    /* ---------------- 关联强度：四项可核验的指标，取最强的一项作为连线理由 ----------------
       旧实现把 strength 写死为 0.9 / 0.6（其实是"同二级分类"的代号），标签上却
       呈现为百分比，读起来像相似度，实际没有算过任何东西。改为下面四项真算：
         ① 分类共祖深度：分类路径的公共前缀级数（1=同一级，2=同二级，3=同三级）
         ② 释义重合度：两词释义中文字集的 Dice 系数
         ③ 词根同源：词根词缀词典里共享的词根，按 IDF 加权（共享稀有词根才算数）
         ④ 形近易混：拼写编辑距离相似度，需达 SPELL_MIN 以上
       强度取四者最大值，"最强的那项"决定标签文案，标签因此说明了关联的理由。
       实测（300 词真实词单）：语义紧密 70% / 场景关联 42% / 星团同类 26% /
       词根同源 73% / 形近易混 71% / 释义相通 23% */

    var W_CAT = 0.6;         // 分类共祖深度权重
    var W_MEAN = 0.4;        // 释义重合度权重
    var PATH_MAX_DEPTH = 3;  // 词典分类路径最深三级
    var SPELL_MIN = 0.7;     // 形近门槛：实测 0.7 时随机词对的误报率为 0%
    var SPELL_MIN_LEN = 4;   // 太短的词形近不可靠（cat/car 之类）
    var ROOT_BASE = 0.5;     // 共享一个可用词根的基础强度
    var ROOT_RARITY_W = 0.4; // 稀有度权重：共享的词根越稀有，同源越可信
    var ROOT_IDF_FLOOR = 5;  // IDF 低于此值的词根出现太普遍（con/dis/pre…），共享它不足以说明同源
    var ROOT_IDF_SPAN = 2;   // IDF 的归一化跨度
    var ROOT_BONUS = 0.05;   // 每多共享一个词根的加成
    var ROOT_CAP = 0.85;     // 词根同源度上限
    var MIN_LINK = 0.2;      // 低于此强度不成连线，避免释义里的常用字造成虚假关联

    // 分类共祖深度 → 权重（W_CAT × depth/PATH_MAX_DEPTH）：理想值 0 / 0.2 / 0.4 / 0.6。
    // 必须查表，不能现算 W_CAT×depth/PATH_MAX_DEPTH：JS 浮点下 depth=1 得 0.19999999999999998，
    // 刚好低于 MIN_LINK(0.2)。后果是「仅一级分类相同」（标签为「星团同类」）的词对全部被判为
    // 不成连线 —— 而 applyIsolation 按「一级分类计数」却认定它们有关联，两者自相矛盾：
    // 圆标不灰（有同类）却画不出任何连线。×1e12 取整用于消掉这点浮点误差
    var CAT_W = (function () {
        var t = [];
        for (var d = 0; d <= PATH_MAX_DEPTH; d++) {
            t.push(Math.round(W_CAT * d / PATH_MAX_DEPTH * 1e12) / 1e12);
        }
        return t;
    })();
    function catScore(depth) {
        if (depth <= 0) return 0;
        return CAT_W[depth < PATH_MAX_DEPTH ? depth : PATH_MAX_DEPTH];
    }

    // 释义 → 用于比对的字集合。
    // 先剥离 [植]/[军]/[医] 这类领域标记与括号补充：它们是分类信息的重复，
    // 当作词义内容会人为抬高任意两词的相似度（同领域词都带同一个标记字）
    function glossUnits(str) {
        var set = {};
        if (!str) return set;
        var s = String(str)
            .replace(/\[[^\]]*\]/g, ' ')
            .replace(/\([^)]*\)/g, ' ')
            .replace(/[^\u4e00-\u9fa5]+/g, '');
        for (var i = 0; i < s.length; i++) set[s.charAt(i)] = 1;
        return set;
    }

    // 两词释义的重合度：Dice 系数 = 2·交集 / (|A|+|B|)，取值 0~1。
    // 用 Dice 而非 Jaccard：释义很短，Jaccard 对并集过大的惩罚过重，实测区分度更差
    function meaningSim(ga, gb) {
        if (!ga || !gb) return 0;
        var ka = Object.keys(ga), kb = Object.keys(gb);
        if (!ka.length || !kb.length) return 0;
        var inter = 0;
        for (var i = 0; i < ka.length; i++) if (gb[ka[i]]) inter++;
        return 2 * inter / (ka.length + kb.length);
    }

    // 分类路径的公共前缀级数（如「科学/生物/植物」与「科学/生物/动物」= 2 级）
    function pathDepth(pa, pb) {
        if (!pa || !pb) return 0;
        var a = String(pa).split('/'), b = String(pb).split('/');
        var n = Math.min(a.length, b.length, PATH_MAX_DEPTH), d = 0;
        while (d < n && a[d] && a[d] === b[d]) d++;
        return d;
    }

    // 拼写相似度：1 - 编辑距离 / 较长词长（迭代 DP，避免递归栈开销）。
    // 未达门槛返回 0，这样"形近"只在真正易混时才成为理由
    function spellingSim(a, b) {
        var s = String(a || '').toLowerCase(), t = String(b || '').toLowerCase();
        if (!s || !t || s === t) return 0;
        if (s.length < SPELL_MIN_LEN || t.length < SPELL_MIN_LEN) return 0;
        var m = s.length, n = t.length, i, j;
        var prev = new Array(n + 1), cur = new Array(n + 1);
        for (j = 0; j <= n; j++) prev[j] = j;
        for (i = 1; i <= m; i++) {
            cur[0] = i;
            for (j = 1; j <= n; j++) {
                var cost = s.charAt(i - 1) === t.charAt(j - 1) ? 0 : 1;
                var v = prev[j] + 1;
                if (cur[j - 1] + 1 < v) v = cur[j - 1] + 1;
                if (prev[j - 1] + cost < v) v = prev[j - 1] + cost;
                cur[j] = v;
            }
            var swap = prev; prev = cur; cur = swap;
        }
        var ratio = 1 - prev[n] / Math.max(m, n);
        return ratio >= SPELL_MIN ? ratio * 0.95 : 0;
    }

    // 词根 → IDF 权重（全局只统计一次）。
    // 减去下限后，ion/ate/re 这类高频构词虚词权重归零 —— 共享它们不算"同源"
    var _rootIdf = null;
    function rootIdf() {
        if (_rootIdf) return _rootIdf;
        var D = global.WORD_ROOTS_DICT;
        var freq = {}, n = 0, w, i, k;
        if (D) {
            for (w in D) {
                if (!D.hasOwnProperty(w)) continue;
                n++;
                for (i = 0; i < D[w].length; i++) freq[D[w][i]] = (freq[D[w][i]] || 0) + 1;
            }
        }
        _rootIdf = {};
        for (k in freq) {
            if (!freq.hasOwnProperty(k)) continue;
            _rootIdf[k] = Math.max(0, Math.log(1 + n / (1 + freq[k])) - ROOT_IDF_FLOOR);
        }
        return _rootIdf;
    }

    // 词根同源度：以共享词根中最稀有的那个定基线，多共享一个再小幅加成
    function rootSim(a, b) {
        var A = a.data.roots, B = b.data.roots;
        if (!A || !B || !A.length || !B.length) return 0;
        var idf = rootIdf(), best = 0, cnt = 0;
        for (var i = 0; i < A.length; i++) {
            if (B.indexOf(A[i]) === -1) continue;
            var v = idf[A[i]] || 0;
            if (v <= 0) continue;
            cnt++;
            if (v > best) best = v;
        }
        if (!cnt) return 0;
        return Math.min(ROOT_CAP,
            ROOT_BASE + ROOT_RARITY_W * best / ROOT_IDF_SPAN + ROOT_BONUS * (cnt - 1));
    }

    // 一对词的关联：强度（0~1）+ 最强的那项理由 + 分类共祖深度
    function pairStrength(a, b) {
        var depth = pathDepth(a.data.path, b.data.path);
        var sem = catScore(depth) +
            W_MEAN * meaningSim(a.data.units, b.data.units);
        var root = rootSim(a, b);
        var spell = spellingSim(a.data.word, b.data.word);
        var strength = sem, reason = 'sem';
        if (root > strength) { strength = root; reason = 'root'; }
        if (spell > strength) { strength = spell; reason = 'spell'; }
        return { strength: strength > 1 ? 1 : strength, reason: reason, depth: depth };
    }

    // 理由 + 分类共祖深度 → 标签文案（说明这段关联究竟依凭什么）
    function reasonTag(reason, depth) {
        if (reason === 'root') return '词根同源';
        if (reason === 'spell') return '形近易混';
        if (depth >= 3) return '语义紧密';
        if (depth === 2) return '场景关联';
        if (depth === 1) return '星团同类';
        return '释义相通';
    }

    // 与当前词关联最强的若干词：不限星团（词根/形近允许跨星团，如 act/action/react
    // 可能分属不同分类），按强度取前 MAX_LINKS 个
    function relatedOf(node) {
        if (!node) return [];
        var res = [];
        for (var i = 0; i < state.nodes.length; i++) {
            var o = state.nodes[i];
            if (o === node) continue;
            // 旋转到相机背离面的词不参与：否则连线会指向画面外的节点
            if (!o.visible) continue;
            var m = pairStrength(node, o);
            if (m.strength < MIN_LINK) continue;
            res.push({
                node: o,
                strength: m.strength,
                reason: m.reason,
                depth: m.depth,
                dist: dist3(o, node)
            });
        }
        // 强度降序；强度相同时按 3D 距离近者优先（距离仅作同分裁决）
        res.sort(function (a, b) {
            if (a.strength !== b.strength) return b.strength - a.strength;
            return a.dist - b.dist;
        });
        return res.slice(0, MAX_LINKS);
    }

    function dist3(a, b) {
        var dx = a.currentPos[0] - b.currentPos[0];
        var dy = a.currentPos[1] - b.currentPos[1];
        var dz = a.currentPos[2] - b.currentPos[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // 星团内部近邻星尘线（弱化的常驻连线，营造星云结构感）
    function updateSemanticLines() {
        if (!state.lineGeo) return;
        if (!state.showLinks) {
            state.lineSegments.visible = false;
            return;
        }
        state.lineSegments.visible = true;

        var positions = state.lineGeo.attributes.position.array;
        var colors = state.lineGeo.attributes.color.array;
        var maxSegments = state.maxLines;
        var lineIndex = 0;
        var threshold = 130;
        var nodes = state.nodes;

        for (var i = 0; i < nodes.length && lineIndex < maxSegments; i++) {
            var a = nodes[i];
            if (!a.visible) continue;
            for (var j = i + 1; j < nodes.length && lineIndex < maxSegments; j++) {
                var b = nodes[j];
                if (!b.visible) continue;
                if (a.data.clusterName !== b.data.clusterName) continue;
                var d = dist3(a, b);
                if (d >= threshold) continue;
                var pIdx = lineIndex * 6;
                positions[pIdx] = a.currentPos[0];
                positions[pIdx + 1] = a.currentPos[1];
                positions[pIdx + 2] = a.currentPos[2];
                positions[pIdx + 3] = b.currentPos[0];
                positions[pIdx + 4] = b.currentPos[1];
                positions[pIdx + 5] = b.currentPos[2];

                var rgb = hexToRgb(a.data.clusterColor);
                var fade = Math.pow(1.0 - d / threshold, 0.75) * 0.45;
                colors[pIdx] = (rgb[0] / 255) * fade;
                colors[pIdx + 1] = (rgb[1] / 255) * fade;
                colors[pIdx + 2] = (rgb[2] / 255) * fade;
                colors[pIdx + 3] = (rgb[0] / 255) * fade;
                colors[pIdx + 4] = (rgb[1] / 255) * fade;
                colors[pIdx + 5] = (rgb[2] / 255) * fade;
                lineIndex++;
            }
        }

        for (var k = lineIndex * 6; k < maxSegments * 6; k++) {
            positions[k] = 0;
            colors[k] = 0;
        }
        state.lineGeo.attributes.position.needsUpdate = true;
        state.lineGeo.attributes.color.needsUpdate = true;
        state.lineGeo.setDrawRange(0, lineIndex * 2);
    }

    // 两词是否成连线：条件同 pairStrength 的 strength ≥ MIN_LINK，但按「先便宜后昂贵」
    // 早退，避免构建期批量判定孤立词时为形近项付出编辑距离的代价
    function hasLink(a, b) {
        var cat = catScore(pathDepth(a.data.path, b.data.path));
        if (cat >= MIN_LINK) return true;
        if (cat + W_MEAN * meaningSim(a.data.units, b.data.units) >= MIN_LINK) return true;
        if (rootSim(a, b) >= MIN_LINK) return true;
        return spellingSim(a.data.word, b.data.word) >= MIN_LINK;
    }

    // 孤立词的圆标常驻灰色：与词单中任何其他词都不成连线时点亮，
    // 无需悬停即可一眼看出（悬停/选中态的周圈发光由 CSS 一并转灰）。
    // 判定走语义口径（与视角无关），避免相机旋转导致标记闪变。
    function applyIsolation() {
        var nodes = state.nodes, i, j;
        // 同「一级分类」的两词必然构成共祖深度 1（catScore(1) = 0.2 ≥ MIN_LINK），
        // 故只有一级分类唯一的词才需逐对精算，避免大词单退化为 O(n²)
        var firstCount = {};
        for (i = 0; i < nodes.length; i++) {
            var p0 = nodes[i].data.path0;
            if (p0) firstCount[p0] = (firstCount[p0] || 0) + 1;
        }
        for (i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            var iso = !(n.data.path0 && firstCount[n.data.path0] > 1);
            if (iso) {
                for (j = 0; j < nodes.length; j++) {
                    if (nodes[j] === n) continue;
                    if (hasLink(n, nodes[j])) { iso = false; break; }
                }
            }
            if (iso && n.el) n.el.classList.add('is-isolated');
        }
    }

    // 高亮语义连线（SVG 贝塞尔 + 流光光子 + 关系标签）
    function rebuildLinks() {
        var group = state.svgGroup;
        if (!group) return;
        group.innerHTML = '';
        state.activeLinks = [];

        var active = null;
        if (state.hoverId) active = findNode(state.hoverId);
        else if (state.selectedId) active = findNode(state.selectedId);
        if (!active || !state.showLinks) return;

        var rels = relatedOf(active);
        rels.forEach(function (r) {
            // 强度同时驱动视觉：越强的关联，连线越实、越粗、光晕越亮
            var s = Math.max(0, Math.min(1, r.strength));

            var glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            glow.setAttribute('fill', 'none');
            glow.setAttribute('stroke', r.node.data.clusterColor);
            glow.setAttribute('stroke-width', '5');
            glow.setAttribute('stroke-opacity', (0.12 + 0.26 * s).toFixed(2));
            glow.setAttribute('filter', 'url(#chaos-link-glow)');
            group.appendChild(glow);

            var core = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            core.setAttribute('fill', 'none');
            core.setAttribute('stroke', r.node.data.clusterColor);
            core.setAttribute('stroke-width', (1.6 + 1.4 * s).toFixed(2));
            core.setAttribute('stroke-opacity', (0.5 + 0.45 * s).toFixed(2));
            core.setAttribute('stroke-dasharray', '6 4');
            group.appendChild(core);

            var photon = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            photon.setAttribute('r', '4');
            photon.setAttribute('fill', '#ffffff');
            photon.setAttribute('filter', 'url(#chaos-link-glow)');
            group.appendChild(photon);

            // 关系标签：说明这段关联依凭什么（语义紧密 / 场景关联 / 星团同类 /
            // 词根同源 / 形近易混 / 释义相通），百分比是该项指标的真实强度
            var label = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '-40');
            rect.setAttribute('y', '-10');
            rect.setAttribute('width', '80');
            rect.setAttribute('height', '20');
            rect.setAttribute('rx', '10');
            rect.setAttribute('fill', 'rgba(15, 23, 42, 0.85)');
            rect.setAttribute('stroke', r.node.data.clusterColor);
            rect.setAttribute('stroke-width', '1.2');
            label.appendChild(rect);
            var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '0');
            text.setAttribute('y', '3.5');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#f1f5f9');
            text.setAttribute('font-size', '10');
            text.textContent = reasonTag(r.reason, r.depth) + ' ' + Math.round(r.strength * 100) + '%';
            label.appendChild(text);
            group.appendChild(label);

            state.activeLinks.push({
                target: r.node,
                phase: Math.random(),
                glow: glow, core: core, photon: photon, label: label
            });
        });
    }

    // 语义连线：每帧按当前 3D 位置更新贝塞尔路径与流光位置
    function updateLinks(dt) {
        if (!state.activeLinks.length) return;
        var active = null;
        if (state.hoverId) active = findNode(state.hoverId);
        if (!active && state.selectedId) active = findNode(state.selectedId);
        if (!active) return;

        state.linkT += dt;
        var x1 = active.screenX, y1 = active.screenY;

        state.activeLinks.forEach(function (link, idx) {
            var x2 = link.target.screenX, y2 = link.target.screenY;
            var dx = x2 - x1, dy = y2 - y1;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            var nx = -dy / dist, ny = dx / dist;
            var off = Math.sin(idx * 1.5) * Math.min(60, dist * 0.2);
            var cx = (x1 + x2) / 2 + nx * off;
            var cy = (y1 + y2) / 2 + ny * off;
            var d = 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
                ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
                ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
            link.glow.setAttribute('d', d);
            link.core.setAttribute('d', d);
            link.core.setAttribute('stroke-dashoffset', String((state.linkT * 20) % 10));

            // 光子沿贝塞尔曲线往返流动
            var period = 2.2 - 0.8 * 0.6;
            var t = ((state.linkT / period + link.phase) % 1 + 1) % 1;
            var mt = 1 - t;
            var px = mt * mt * x1 + 2 * mt * t * cx + t * t * x2;
            var py = mt * mt * y1 + 2 * mt * t * cy + t * t * y2;
            link.photon.setAttribute('cx', px.toFixed(1));
            link.photon.setAttribute('cy', py.toFixed(1));

            // 标签置于路径中点，仅在足够长时显示
            link.label.style.display = dist > 90 ? '' : 'none';
            link.label.setAttribute('transform', 'translate(' + cx.toFixed(1) + ', ' + cy.toFixed(1) + ')');
        });
    }

    // 词节点 DOM 同步（transform 由物理结果驱动）
    function syncNodesDom() {
        var wrap = state.nodesWrap;
        if (!wrap) return;
        var w = wrap.clientWidth || 1;
        var h = wrap.clientHeight || 1;

        for (var i = 0; i < state.nodes.length; i++) {
            var n = state.nodes[i];
            var out = !n.visible || n.screenX < -140 || n.screenX > w + 140 || n.screenY < -90 || n.screenY > h + 90;
            if (out) {
                if (n.domVisible !== false) {
                    n.el.style.display = 'none';
                    n.domVisible = false;
                }
                continue;
            }
            if (n.domVisible !== true) {
                n.el.style.display = '';
                n.domVisible = true;
            }

            var hot = n.hovered || n.selected;
            var scale = n.scale * (hot ? 1.22 : (n.isNeighbor ? 1.1 : 1));
            var tf = 'translate3d(' + n.screenX.toFixed(1) + 'px,' + n.screenY.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + scale.toFixed(3) + ')';
            if (n.lastTf !== tf) {
                n.el.style.transform = tf;
                n.lastTf = tf;
            }
            // opacity / zIndex 变化缓慢，仅在数值真正改变时写入，避免逐帧触发样式重算与重排层序
            var op = hot ? '1' : (n.isNeighbor ? '0.95' : Math.max(0.35, Math.min(1, 1.2 - n.screenZ * 0.7)).toFixed(2));
            if (n.lastOp !== op) {
                n.el.style.opacity = op;
                n.lastOp = op;
            }
            var zi = String(hot ? 60 : (n.isNeighbor ? 40 : Math.floor((1 - n.screenZ) * 30) + 10));
            if (n.lastZi !== zi) {
                n.el.style.zIndex = zi;
                n.lastZi = zi;
            }

            var st = hot ? 'hot' : (n.isNeighbor ? 'nbr' : '');
            if (n.lastState !== st) {
                n.el.classList.toggle('is-active', st === 'hot');
                n.el.classList.toggle('is-neighbor', st === 'nbr');
                n.lastState = st;
            }
        }
    }

    function animate() {
        state.raf = requestAnimationFrame(animate);
        if (!coverVisible()) {
            // 封面不可见（切到学习页等）：暂停物理与渲染，避免后台空转
            state.clock.getDelta();
            return;
        }
        var dt = Math.min(state.clock.getDelta(), 0.1);
        var elapsed = state.clock.getElapsedTime();

        // 自动旋转
        if (state.autoRotate && !state.dragging) {
            state.tTheta += 0.0018 * state.rotateSpeed;
        }

        // 相机平滑跟随
        state.lookAt.lerp(state.tLookAt, 0.05);
        state.theta += (state.tTheta - state.theta) * 0.08;
        state.phi += (state.tPhi - state.phi) * 0.08;
        state.radius += (state.tRadius - state.radius) * 0.08;
        var sinPhi = Math.sin(state.phi);
        state.camera.position.set(
            state.lookAt.x + state.radius * sinPhi * Math.sin(state.theta),
            state.lookAt.y + state.radius * Math.cos(state.phi),
            state.lookAt.z + state.radius * sinPhi * Math.cos(state.theta)
        );
        state.camera.lookAt(state.lookAt);

        // 主题切换：更新着色器主题与粒子混合模式，无需重建场景
        var ti = themeIndex();
        if (ti !== state.lastTheme) {
            state.lastTheme = ti;
            if (state.bgMaterial) state.bgMaterial.uniforms.uTheme.value = ti;
            if (state.particleMaterial) {
                state.particleMaterial.uniforms.uTheme.value = ti;
                state.particleMaterial.blending = ti === 3 ? THREE.NormalBlending : THREE.AdditiveBlending;
                state.particleMaterial.needsUpdate = true;
            }
        }

        if (state.particleMaterial) {
            state.particleMaterial.uniforms.uTime.value = elapsed;
            state.particleMaterial.uniforms.uFlowSpeed.value = state.flowSpeed;
            state.particleMaterial.uniforms.uGlow.value = state.particleGlow;
            state.particleMaterial.uniforms.uMouseActive.value = state.mouseActive ? 1.0 : 0.0;
        }
        if (state.bgMaterial) {
            state.bgMaterial.uniforms.uTime.value = elapsed;
        }

        updatePhysics(dt, elapsed);
        updateSemanticLines();
        syncNodesDom();
        updateLinks(dt);
        followCard();

        state.renderer.clear();
        state.renderer.render(state.bgScene, state.bgCamera);
        state.renderer.render(state.scene, state.camera);
    }

    /* ========================================================
       交互
       ======================================================== */

    function setHover(id) {
        if (state.dragging) return;
        if (state.hoverId === id) return;
        state.hoverId = id;
        rebuildLinks();
    }

    function bindEvents() {
        if (state.eventsBound) return;
        state.eventsBound = true;

        var root = coverEl();
        if (!root) return;

        var nonDraggable = function (t) {
            if (!t || !t.closest) return false;
            return !!t.closest('#chaosControls, #chaosCard, button, input, select, label');
        };

        root.addEventListener('mousedown', function (e) {
            if (nonDraggable(e.target)) return;
            state.dragging = true;
            state.movedFar = false;
            state.dragMode = (e.button === 0) ? 'pan' : 'rotate';
            state.prevX = e.clientX;
            state.prevY = e.clientY;
            state.downX = e.clientX;
            state.downY = e.clientY;
        });

        root.addEventListener('wheel', function (e) {
            if (!e.target.closest || e.target.closest('#chaosControls, #chaosCard')) return;
            e.preventDefault();
            var f = e.deltaY > 0 ? 1.08 : 0.92;
            state.tRadius = Math.max(260, Math.min(2200, state.tRadius * f));
        }, { passive: false });

        root.addEventListener('contextmenu', function (e) {
            if (!nonDraggable(e.target)) e.preventDefault();
        });

        // 触屏：单指平移（沿用桌面左键语义）；双指捏合缩放、双指中点平移、
        // 双指扭动环绕旋转 —— 桌面上的中键旋转在触屏上无从触发，由扭动补上
        root.addEventListener('touchstart', function (e) {
            if (nonDraggable(e.target) || !e.touches.length) return;
            if (e.touches.length >= 2) {
                state.dragging = false;
                state.movedFar = true;      // 手势不算点击，避免顺带收起词卡
                state.touchTwist = 0;
                state.touchGesture = touchSnapshot(e);
                return;
            }
            state.touchGesture = null;
            state.dragging = true;
            state.movedFar = false;
            state.dragMode = 'pan';
            state.prevX = e.touches[0].clientX;
            state.prevY = e.touches[0].clientY;
            state.downX = e.touches[0].clientX;
            state.downY = e.touches[0].clientY;
        }, { passive: true });

        root.addEventListener('touchmove', function (e) {
            if (e.touches.length >= 2 && state.touchGesture) {
                e.preventDefault();
                applyTouchGesture(e);
                return;
            }
            if (!state.dragging || !e.touches.length) return;
            var t = e.touches[0];
            moveDrag(t.clientX, t.clientY);
        }, { passive: false });

        root.addEventListener('touchend', function (e) {
            if (e.touches.length >= 2) return;
            state.touchGesture = null;
            state.touchTwist = 0;
            if (!e.touches.length) { onUp(); return; }
            // 手势后还剩一指：就地接着单指平移，手指不必抬起重按
            state.dragging = true;
            state.dragMode = 'pan';
            state.prevX = e.touches[0].clientX;
            state.prevY = e.touches[0].clientY;
            state.downX = e.touches[0].clientX;
            state.downY = e.touches[0].clientY;
        });
        root.addEventListener('touchcancel', function (e) {
            if (e.touches.length >= 2) return;
            state.touchGesture = null;
            state.touchTwist = 0;
            if (!e.touches.length) onUp();
        });

        root.addEventListener('click', function (e) {
            // 点击空白处：优先关闭词卡，其次取消选中并清除连线
            if (nonDraggable(e.target)) return;
            if (state.movedFar) return;
            if (state.cardNodeId) { hideCard(); return; }
            if (state.selectedId) {
                state.selectedId = null;
                rebuildLinks();
            }
        });

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('blur', onUp);
        window.addEventListener('resize', resize);

        // 词卡内按钮
        var favBtn = document.getElementById('chaosCardFav');
        if (favBtn) favBtn.addEventListener('click', toggleCardFav);
        var wordBtn = document.getElementById('chaosCardWord');
        if (wordBtn) wordBtn.addEventListener('click', function () {
            var n = findNode(state.cardNodeId);
            if (n && global.app && typeof global.app.speak === 'function') global.app.speak(n.data.word);
        });
        var cardSpeak = document.getElementById('chaosCardSpeak');
        if (cardSpeak) cardSpeak.addEventListener('click', function () {
            var n = findNode(state.cardNodeId);
            if (n && global.app && typeof global.app.speak === 'function') global.app.speak(n.data.word);
        });
    }

    function onMove(e) {
        if (!coverVisible()) return;
        var root = coverEl();
        var rect = root.getBoundingClientRect();
        var lx = e.clientX - rect.left;
        var ly = e.clientY - rect.top;
        state.mouseActive = lx >= 0 && ly >= 0 && lx <= rect.width && ly <= rect.height;

        if (state.mouseActive && state.raycaster && state.camera) {
            var ndcX = (lx / rect.width) * 2 - 1;
            var ndcY = -(ly / rect.height) * 2 + 1;
            state.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), state.camera);
            var hit = new THREE.Vector3();
            if (state.raycaster.ray.intersectPlane(state.planeZ, hit)) state.mouse3D.copy(hit);
        }

        if (state.dragging) moveDrag(e.clientX, e.clientY);
    }

    function moveDrag(clientX, clientY) {
        var dx = clientX - state.prevX;
        var dy = clientY - state.prevY;
        if (Math.abs(clientX - state.downX) > 6 || Math.abs(clientY - state.downY) > 6) {
            state.movedFar = true;
        }
        if (state.dragMode === 'pan') {
            // 沿相机当前切面平移视点焦点
            var panFactor = (state.tRadius / 900) * 0.95;
            var rx = Math.cos(state.theta);
            var rz = -Math.sin(state.theta);
            state.tLookAt.x -= rx * dx * panFactor;
            state.tLookAt.z -= rz * dx * panFactor;
            state.tLookAt.y += dy * panFactor;
        } else if (state.dragMode === 'rotate') {
            // 中键/右键拖动：环绕旋转
            state.tTheta -= dx * 0.005;
            state.tPhi = Math.max(0.15, Math.min(Math.PI - 0.15, state.tPhi - dy * 0.005));
        }
        state.prevX = clientX;
        state.prevY = clientY;
    }

    function onUp() {
        state.dragging = false;
        state.dragMode = null;
    }

    // 取两指的间距、中点与夹角（屏幕坐标）
    function touchSnapshot(e) {
        var a = e.touches[0];
        var b = e.touches[1];
        var dx = a.clientX - b.clientX;
        var dy = a.clientY - b.clientY;
        return {
            dist: Math.sqrt(dx * dx + dy * dy),
            midX: (a.clientX + b.clientX) / 2,
            midY: (a.clientY + b.clientY) / 2,
            angle: Math.atan2(dy, dx)
        };
    }

    // 双指手势：捏合 → 缩放（拉开放大）；中点移动 → 平移；扭动 → 环绕旋转
    function applyTouchGesture(e) {
        var cur = touchSnapshot(e);
        var prev = state.touchGesture;
        state.touchGesture = cur;
        if (!prev) return;

        // 捏合缩放：两指拉开则半径变小（放大），与滚轮同一套限幅
        if (prev.dist > 0 && cur.dist > 0) {
            state.tRadius = Math.max(260, Math.min(2200, state.tRadius * (prev.dist / cur.dist)));
        }
        // 中点位移：复用单指平移的换算（沿相机当前切面移动视点焦点）
        var mdx = cur.midX - prev.midX;
        var mdy = cur.midY - prev.midY;
        var panFactor = (state.tRadius / 900) * 0.95;
        var rx = Math.cos(state.theta);
        var rz = -Math.sin(state.theta);
        state.tLookAt.x -= rx * mdx * panFactor;
        state.tLookAt.z -= rz * mdx * panFactor;
        state.tLookAt.y += mdy * panFactor;

        // 扭动旋转：夹角变化 → 环绕旋转（对应桌面中键拖拽）。
        // 夹角在 ±π 处会跳变，先归一化；捏合时两指难免轻微错动，
        // 用一个小死区累积后再施加，避免缩放时视角自己慢慢漂走
        var dAngle = cur.angle - prev.angle;
        if (dAngle > Math.PI) dAngle -= Math.PI * 2;
        if (dAngle < -Math.PI) dAngle += Math.PI * 2;
        state.touchTwist += dAngle;
        if (Math.abs(state.touchTwist) > 0.06) {
            state.tTheta -= state.touchTwist;
            state.touchTwist = 0;
        }
    }

    /* ========================================================
       词卡
       ======================================================== */

    function openCard(node) {
        if (!node) return;
        state.selectedId = node.id;
        state.cardNodeId = node.id;
        rebuildLinks();
        renderCard(node);
        var card = document.getElementById('chaosCard');
        if (card) {
            card.classList.remove('hidden');
            positionCard(node);
        }
        if (state.cardTimer) clearTimeout(state.cardTimer);
        state.cardTimer = setTimeout(hideCard, 60000);
    }

    function hideCard() {
        state.cardNodeId = null;
        if (state.cardTimer) {
            clearTimeout(state.cardTimer);
            state.cardTimer = null;
        }
        var card = document.getElementById('chaosCard');
        if (card) card.classList.add('hidden');
    }

    // 词卡跟随词节点移动
    function followCard() {
        if (!state.cardNodeId) return;
        var node = findNode(state.cardNodeId);
        if (node) positionCard(node);
    }

    function positionCard(node) {
        var card = document.getElementById('chaosCard');
        var root = coverEl();
        if (!card || !root) return;
        var w = card.offsetWidth || 220;
        var h = card.offsetHeight || 140;
        var cw = root.clientWidth;
        var ch = root.clientHeight;
        var left = node.screenX + 18;
        var top = node.screenY - h / 2;
        if (left + w > cw - 8) left = node.screenX - w - 18;
        if (left < 8) left = 8;
        if (top + h > ch - 8) top = ch - h - 8;
        if (top < 8) top = 8;
        card.style.left = left.toFixed(0) + 'px';
        card.style.top = top.toFixed(0) + 'px';
    }

    function renderCard(node) {
        var w = node.data;
        setText('chaosCardWord', w.word);
        setText('chaosCardPhonetic', w.phonetic || '');
        setText('chaosCardLevel', w.clusterName || '');
        setText('chaosCardMean', w.meaning || '');
        setText('chaosCardCluster', '语义星团：' + (w.clusterName || '未分类') + (w.sub ? ' · ' + w.sub : ''));
        var extra = [];
        if (w.pos) extra.push(w.pos);
        if (w.source) extra.push(w.source);
        if (w.accuracyRate >= 0) extra.push('正确率 ' + w.accuracyRate + '%');
        setText('chaosCardSource', extra.join(' · '));
        var favBtn = document.getElementById('chaosCardFav');
        if (favBtn) favBtn.classList.toggle('favorited', isFavorite(w.word));
    }

    function isFavorite(word) {
        var lower = String(word || '').trim().toLowerCase();
        // 首选为自建收藏词单时，收藏态以该词单为准
        if (global.app && typeof global.app.getFavoriteTargetList === 'function' && global.app.getFavoriteTargetList()) {
            return !!global.app.isFavoriteInTarget(lower);
        }
        return (Storage.loadFavoriteItems() || []).some(function (f) {
            return String(f.word || '').trim().toLowerCase() === lower;
        });
    }

    function toggleCardFav() {
        var node = findNode(state.cardNodeId);
        if (!node) return;
        var w = node.data;
        var lower = String(w.word).trim().toLowerCase();
        // 首选为自建收藏词单时，收藏写入该词单（并静默同步到已链接的欧路生词本）
        if (global.app && typeof global.app.getFavoriteTargetList === 'function' && global.app.getFavoriteTargetList()) {
            var addedInTarget = global.app.toggleFavoriteInTarget({
                word: w.word,
                phonetic: w.phonetic || '',
                definitions: [{ meaning: w.meaning || '', example: '' }]
            });
            var favBtnT = document.getElementById('chaosCardFav');
            if (favBtnT) favBtnT.classList.toggle('favorited', !!addedInTarget);
            if (typeof global.app.renderBookList === 'function') global.app.renderBookList();
            if (typeof global.app.showToast === 'function') {
                global.app.showToast(addedInTarget ? '⭐ 已收藏' : '已取消收藏', addedInTarget ? 'success' : 'info');
            }
            return;
        }
        var favs = Storage.loadFavoriteItems() || [];
        var idx = -1;
        for (var i = 0; i < favs.length; i++) {
            if (String(favs[i].word || '').trim().toLowerCase() === lower) { idx = i; break; }
        }
        var added;
        if (idx >= 0) {
            favs.splice(idx, 1);
            added = false;
        } else {
            favs.push({
                word: w.word,
                phonetic: w.phonetic || '',
                definitions: [{ meaning: w.meaning || '', example: '' }],
                createdAt: new Date().toISOString()
            });
            added = true;
        }
        Storage.saveFavoriteItems(favs);
        if (global.app && typeof global.app.scheduleEudicSync === 'function') global.app.scheduleEudicSync();
        var favBtn = document.getElementById('chaosCardFav');
        if (favBtn) favBtn.classList.toggle('favorited', added);
        if (global.app) {
            if (typeof global.app.renderBookList === 'function') global.app.renderBookList();
            if (typeof global.app.showToast === 'function') {
                global.app.showToast(added ? '⭐ 已收藏' : '已取消收藏', added ? 'success' : 'info');
            }
        }
    }

    /* ========================================================
       加载层与控件
       ======================================================== */

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text == null ? '' : String(text);
    }

    function setLoaderVisible(v) {
        var el = document.getElementById('chaosLoader');
        if (!el) return;
        el.classList.toggle('visible', !!v);
    }

    // 显示加载层 → 让出若干帧后执行阻塞构建 → 保证加载层至少可见片刻
    function runWithLoader(fn, onDone) {
        setLoaderVisible(true);
        var shownAt = Date.now();
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    if (fn) fn();
                    var wait = Math.max(0, 600 - (Date.now() - shownAt));
                    setTimeout(function () {
                        setLoaderVisible(false);
                        if (typeof onDone === 'function') onDone();
                        ensureCategoryDict();
                    }, wait);
                });
            });
        });
    }

    function updateStatLine(total) {
        var clusters = state.clusters.length;
        setText('chaosStat', '共 ' + total + ' 词 · ' + clusters + ' 个语义星团');
        updateScaleWarn(total);
    }

    // 词量过大的静默提示：只说明可能掉帧，无需任何操作
    function updateScaleWarn(total) {
        var el = document.getElementById('chaosScaleWarn');
        if (!el) return;
        if (total > 1000) {
            el.textContent = '已选 ' + total + ' 词。单词量超过 1000 个同时显示时，可能会降低动画帧率与体验效果';
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    function bindControls() {
        if (state.controlsBound) return;
        state.controlsBound = true;
        var wrap = document.getElementById('chaosControls');
        if (!wrap) return;

        renderBookOptions();

        var trigger = document.getElementById('chaosBookTrigger');
        var panel = document.getElementById('chaosBookSelect');
        if (trigger && panel) {
            trigger.addEventListener('click', function (e) {
                e.stopPropagation();
                panel.classList.toggle('hidden');
            });
            panel.addEventListener('click', function (e) { e.stopPropagation(); });
            document.addEventListener('click', function () { panel.classList.add('hidden'); });
        }

        // 折叠 / 展开
        var toggle = document.getElementById('chaosControlsToggle');
        var header = wrap.querySelector('.nebula-controls-header');
        var onToggle = function (e) {
            e.stopPropagation();
            wrap.classList.toggle('collapsed');
        };
        if (toggle) toggle.addEventListener('click', onToggle);
        if (header) header.addEventListener('click', onToggle);

        // 流场速度
        bindRange('chaosFlow', function (v) {
            state.flowSpeed = v;
        }, true);
        bindRange('chaosGlow', function (v) {
            state.particleGlow = v;
            if (state.particleMaterial) state.particleMaterial.uniforms.uGlow.value = v;
        }, true);
        bindRange('chaosRotate', function (v) {
            state.rotateSpeed = v;
        }, true);
        bindRange('chaosFont', function (v) {
            state.fontSize = v;
            setText('chaosFontValue', v + 'px');
            applyFontSize();
        }, true);

        // 粒子数量：释放滑块后才重建粒子（避免拖动过程反复重建）
        var countEl = document.getElementById('chaosCount');
        if (countEl) {
            countEl.addEventListener('input', function () {
                setText('chaosCountValue', String(parseInt(countEl.value, 10)));
            });
            countEl.addEventListener('change', function () {
                state.particleCount = parseInt(countEl.value, 10) || 18000;
                buildParticles(state.particleCount);
                saveConfig();
            });
        }

        var linksChk = document.getElementById('chaosLinksToggle');
        if (linksChk) {
            linksChk.addEventListener('change', function () {
                state.showLinks = linksChk.checked;
                rebuildLinks();
                saveConfig();
            });
        }

        var autoChk = document.getElementById('chaosAutoToggle');
        if (autoChk) {
            autoChk.addEventListener('change', function () {
                state.autoRotate = autoChk.checked;
                saveConfig();
            });
        }

        var resetBtn = document.getElementById('chaosResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                resetView();
            });
        }
    }

    function bindRange(id, onChange, saveOnChange) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function () {
            var v = parseFloat(el.value);
            setText(id + 'Value', formatRangeValue(v));
            onChange(v);
        });
        if (saveOnChange) {
            el.addEventListener('change', function () { saveConfig(); });
        }
    }

    function formatRangeValue(v) {
        return (Math.round(v * 100) / 100).toString();
    }

    function applyFontSize() {
        var root = coverEl();
        if (root) root.style.setProperty('--chaos-font', state.fontSize + 'px');
    }

    function resetView() {
        state.tTheta = 0;
        state.tPhi = Math.PI / 2.35;
        state.tRadius = 820;
        if (state.tLookAt) state.tLookAt.set(0, 0, 0);
        hideCard();
        state.selectedId = null;
        rebuildLinks();
    }

    // 词单下拉（多选，含收藏虚拟词单）
    function renderBookOptions() {
        var panel = document.getElementById('chaosBookSelect');
        var trigger = document.getElementById('chaosBookTrigger');
        if (!panel || !trigger) return;
        panel.innerHTML = '';

        var books = Storage.loadBooks() || [];
        // 触发按钮直接显示已选词单名（多个以顿号相连），比"已选 N 个词单"更直观
        var names = [];
        books.forEach(function (b) {
            if (state.selected.indexOf(String(b.id)) !== -1) names.push(b.name || '未命名');
        });

        books.forEach(function (book) {
            panel.appendChild(bookOption(String(book.id), book.name || '未命名'));
        });
        panel.appendChild(bookOption('favorites', '♡ 收藏'));
        if (state.selected.indexOf('favorites') !== -1) names.push('收藏');
        trigger.textContent = names.length ? names.join('、') : '选择词单';
        // 面板最宽 240px，词单多时按钮文字会被省略号截断，故悬停显示完整名单
        trigger.title = names.join('、');
    }

    function bookOption(id, name) {
        var label = document.createElement('label');
        label.className = 'nebula-bookopt';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = state.selected.indexOf(id) !== -1;
        cb.addEventListener('change', function () { selectBook(id, cb.checked); });
        label.appendChild(cb);
        var span = document.createElement('span');
        span.textContent = name;
        label.appendChild(span);
        return label;
    }

    function selectBook(id, on) {
        var i = state.selected.indexOf(id);
        if (on && i === -1) state.selected.push(id);
        if (!on && i !== -1) state.selected.splice(i, 1);
        saveConfig();
        renderBookOptions();
        rebuildFromBooks();
    }

    // 词单变化后重建场景（保留当前相机视角）
    function rebuildFromBooks() {
        if (!state.renderer || !coverVisible()) return;
        runWithLoader(function () { build(); });
    }

    // 将 state 同步到控件显示
    function applyControlValues() {
        var set = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.value = v;
        };
        set('chaosFlow', state.flowSpeed);
        setText('chaosFlowValue', formatRangeValue(state.flowSpeed));
        set('chaosCount', state.particleCount);
        setText('chaosCountValue', String(state.particleCount));
        set('chaosGlow', state.particleGlow);
        setText('chaosGlowValue', formatRangeValue(state.particleGlow));
        set('chaosRotate', state.rotateSpeed);
        setText('chaosRotateValue', formatRangeValue(state.rotateSpeed));
        set('chaosFont', state.fontSize);
        setText('chaosFontValue', state.fontSize + 'px');
        var linksChk = document.getElementById('chaosLinksToggle');
        if (linksChk) linksChk.checked = state.showLinks;
        var autoChk = document.getElementById('chaosAutoToggle');
        if (autoChk) autoChk.checked = state.autoRotate;
        applyFontSize();
        renderBookOptions();
    }

    /* ========================================================
       封面切换（对外 API）
       ======================================================== */

    function currentCover() {
        // 封面视窗（?wmView=cover）覆盖当前封面：只内存生效，不写回用户配置
        if (global.__wmCoverOverride) return global.__wmCoverOverride;
        try {
            var cfg = Storage.getUserConfig();
            if (cfg && cfg.basicSettings && cfg.basicSettings.defaultCover) {
                return cfg.basicSettings.defaultCover;
            }
        } catch (e) { /* 忽略 */ }
        return 'import';
    }

    // 依据「默认封面」设置切换欢迎页封面
    function apply() {
        var importEl = document.getElementById('coverImport');
        var nebulaEl = document.getElementById('coverNebula');
        var chaosEl = coverEl();
        if (!chaosEl) return;

        if (currentCover() !== 'chaos') {
            chaosEl.classList.add('hidden');
            stop();
            return;
        }

        if (importEl) importEl.classList.add('hidden');
        if (nebulaEl) nebulaEl.classList.add('hidden');
        chaosEl.classList.remove('hidden');

        // 恢复缓存的配置
        var c = loadConfig();
        if (c) {
            if (Array.isArray(c.selected)) state.selected = c.selected.slice();
            if (typeof c.flowSpeed === 'number') state.flowSpeed = c.flowSpeed;
            if (typeof c.particleCount === 'number') state.particleCount = c.particleCount;
            if (typeof c.particleGlow === 'number') state.particleGlow = c.particleGlow;
            if (typeof c.rotateSpeed === 'number') state.rotateSpeed = c.rotateSpeed;
            if (typeof c.autoRotate === 'boolean') state.autoRotate = c.autoRotate;
            if (typeof c.showLinks === 'boolean') state.showLinks = c.showLinks;
            if (typeof c.fontSize === 'number') state.fontSize = c.fontSize;
        }
        // 新用户/游客兜底：默认展示内置「示例单词」词单
        if (!Array.isArray(state.selected) || !state.selected.length) {
            var demo = ensureDemoBook();
            state.selected = demo ? [String(demo.id)] : [];
        }
        if (collectWords().length === 0) {
            var demo2 = ensureDemoBook();
            if (demo2 && state.selected.indexOf(String(demo2.id)) === -1) {
                state.selected.push(String(demo2.id));
            }
        }

        bindControls();
        applyControlValues();

        // 等容器可见后再初始化/重建渲染
        setTimeout(function () {
            if (!coverVisible()) return;
            if (state.initialized) {
                // 词单内容未变化时不重建（避免每次返回封面都出现加载动画）
                if (state.lastBuildKey === inputKey()) {
                    if (!state.raf) animate();
                    return;
                }
                runWithLoader(function () { build(); });
            } else {
                runWithLoader(function () { init(); });
            }
        }, 60);
    }

    function stop() {
        if (state.raf) {
            cancelAnimationFrame(state.raf);
            state.raf = null;
        }
        if (state.cardTimer) {
            clearTimeout(state.cardTimer);
            state.cardTimer = null;
        }
        state.cardNodeId = null;
        state.activeLinks = [];
        if (state.svgGroup) state.svgGroup.innerHTML = '';
        setLoaderVisible(false);
    }

    // 主题切换等场景下的刷新：着色器与节点配色按 data-theme 自动适配，
    // 此处仅同步控件（保留签名与单词星云封面一致，便于统一调用）
    function refresh(pendingTheme, onDone) {
        if (coverVisible()) applyControlValues();
        if (typeof onDone === 'function') onDone();
    }

    function getState() { return state; }

    global.ChaosNebulaCover = {
        apply: apply,
        init: init,
        stop: stop,
        refresh: refresh,
        getState: getState,
        // 预置视口（封面视窗恢复视角用）：在下次初始化完成时套用
        primeView: function (v) { state.pendingView = v || null; }
    };
})(window);
