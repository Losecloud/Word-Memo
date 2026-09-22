// ============================================
// 蒲公英聚类封面（原生 Canvas 2D 移植自 js/dandelion-vocabulary-cluster）
// 核心：仿生蒲公英冠毛聚类 + 自研力导向（径向弹簧 / 电荷斥力 / 碰撞分离）
//      + 植物学草地场景（起伏草坪、野花、莲座叶、飘散种子）+ 悬臂微风摇曳
// 数据：用户词书 / 收藏；语义聚类取词义一级分类，种子大小取 CEFR 词频，重点难词取高错误率
// 依赖：Storage（无第三方库）
// 独立模块，避免污染主应用类
// ============================================
(function (global) {
    'use strict';

    var Storage = global.Storage;
    var TAU = Math.PI * 2;

    var MAX_FLOAT_SEEDS = 10;   // 空中飘散种子（未掌握词）上限
    var FLOAT_SEED_MARGIN = 70; // 种子回卷边界相对视野外扩的世界单位（略出屏即从对侧回卷）
    var ROOT_X = 10;            // 蒲公英根部世界坐标
    var ROOT_Y = 590;
    var STEM_LEN = 544;         // 基准茎长（悬臂挠度计算用）
    // 茎长随词量自适应：花冠越密（词越多）视觉重量越大，茎需相应加长，
    // 否则显得"头重脚轻"。以 100 词为基准长度，按 √N 增长（约 400 词 → 2 倍）
    var STEM_BASE_WORDS = 100;
    var STEM_MAX_SCALE = 2.2;   // 茎长放大上限（约 480 词触及）
    var CANOPY_REF = 300;       // 花冠（外圈）参考半径，用于取景与茎长比例
    // 花冠尺寸的基准词量：词数正好这么多时花冠保持原先调好的尺寸（layoutScale = 1）
    var LAYOUT_BASE_WORDS = 360;
    var CORE_R = 52;            // 花托圆盘半径
    var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

    /* 外圈元素（分类徽标 / 圈层文字 / 同心圈）的渐隐阈值
       以「适屏缩放」为基准的倍率 k = zoom / fitZoom 判定：
       整朵蒲公英刚好铺满屏幕时 k = 1，向外缩到 hide 倍率以下即完全消隐。
       想让它们更早消失就调大 hide；过渡更柔和就调大 span（单位同为倍率）。 */
    var FADE_BADGE = { hide: 0.95, span: 0.16 };        // 分类徽标：最先消失
    var FADE_RING_LABEL = { hide: 0.95, span: 0.16 };   // 圈层文字
    var FADE_RING_LINE = { hide: 0.58, span: 0.16 };    // 同心圈 / 导引环 / 光束：最后消失

    // 倍率 → 透明度（1 = 完全可见，0 = 完全消隐）
    function fadeByZoom(zoom, rule) {
        var z = state.fitZoom > 0 ? zoom / state.fitZoom : 1;
        return Math.max(0, Math.min(1, (z - rule.hide) / rule.span));
    }

    // 当前「激活」的聚类名：优先取点击分类标签锁定的聚类，其次选中词所属聚类，
    // 再次悬停词，最后悬停的分类标签（点击前的预览）；用于高亮外圈对应徽标与整条分支
    function activeClusterName() {
        if (state.pinnedCluster) return state.pinnedCluster;
        var sel = state.selectedWord;
        if (sel && sel.cluster) return sel.cluster;
        var hov = state.hoveredWord;
        if (hov && hov.cluster) return hov.cluster;
        return state.hoveredBadge || '';
    }

    // 某词是否属于当前激活的聚类（游丝、冠毛等聚类级高亮统一走这里）
    function inActiveCluster(w, cmp) {
        if (!w) return false;
        var act = activeClusterName();
        if (act) return w.cluster === act;
        // 无激活聚类时退化为原有的「同一词或同一悬停词」判定
        if (cmp === w) return true;
        return !!(cmp && cmp.cluster && w.cluster === cmp.cluster);
    }

    /* ========================================================
       主题配色（深浅双模式；画布不支持 CSS 变量，需取具体色值）
       ======================================================== */
    var THEMES = {
        light: {
            bg: '#faf9f5',
            farHill: ['rgba(207, 233, 227, 0.7)', 'rgba(180, 220, 211, 0.6)', 'rgba(237, 247, 244, 0.9)'],
            farHillStroke: 'rgba(112, 182, 168, 0.3)',
            midHill: ['rgba(152, 206, 194, 0.85)', 'rgba(110, 180, 166, 0.85)', 'rgba(64, 141, 128, 0.9)'],
            lawn: ['#4a9b8a', '#3b8777', '#2d7365', '#216153', '#184e43'],
            turfRim: 'rgba(186, 241, 230, 0.5)',
            engraving: 'rgba(54, 124, 112, 0.2)',
            grass: ['#327f70', '#3c8f7e', '#2a6b5b', '#4a9d8c', '#22604f'],
            floraStem: '#3f8d80',
            floraClover: '#2c6f62',
            floraBell: '#7ec4b6',
            floraOat: '#5cad9e',
            floraCore: '#1e4b42',
            leaf: ['#265f55', '#2d6c61', '#20564c', '#357265', '#1b5045'],
            midrib: ['#8fe0d1', '#abebe0', '#6cc9b9'],
            leafStroke: 'rgba(24, 72, 63, 0.42)',
            stemDark: '#1c5048',
            stemBody: '#2b6b60',
            stemLight: '#428f81',
            stemNode: 'rgba(146, 214, 204, 0.45)',
            sepalDark: '#1f544a',
            sepalLight: '#358b7c',
            filament: '68, 133, 123',
            filamentActive: '#2b7a78',
            bristle: '116, 199, 187',
            bristleActive: 'rgba(43, 122, 120, 0.55)',
            ringOuter: '#1d5c52',
            ringCore: '#0d443c',
            coreGlow: ['rgba(48, 112, 100, ', 'rgba(90, 162, 148, ', 'rgba(247, 246, 240, 0)'],
            receptacle: ['#1e4f46', '#266056', '#357368'],
            seed: { hotspot: '#e68a1d', high: '#145c50', medium: '#2b7a78', low: '#4f9d69' },
            badgeBg: 'rgba(255, 255, 255, 0.88)',
            badgeStroke: 'rgba(29, 92, 82, 0.25)',
            badgeSub: 'rgba(27, 52, 48, 0.55)',
            badgeBgActive: 'rgba(255, 255, 255, 0.99)',
            badgeSubActive: 'rgba(18, 40, 36, 0.88)',
            // 激活态参数：浅色底下深饱和描边会显得扎眼，故描边半透明、光晕更收敛
            badgeActive: { strokeA: 0.6, width: 1.5, blur: 12, glowA: 0.32, beamA: 0.4 },
            coreLabel: '199, 237, 231',
            pitting: 'rgba(120, 197, 186, 0.65)'
        },
        dark: {
            bg: '#0e1416',
            farHill: ['rgba(32, 62, 57, 0.6)', 'rgba(24, 50, 46, 0.65)', 'rgba(16, 34, 32, 0.9)'],
            farHillStroke: 'rgba(72, 134, 122, 0.28)',
            midHill: ['rgba(28, 68, 61, 0.85)', 'rgba(19, 54, 48, 0.88)', 'rgba(10, 36, 32, 0.92)'],
            lawn: ['#1f5a50', '#164a41', '#103c35', '#0a2b26', '#061c19'],
            turfRim: 'rgba(110, 190, 176, 0.3)',
            engraving: 'rgba(18, 62, 55, 0.35)',
            grass: ['#17544a', '#1d6455', '#123f36', '#286e5f', '#0d332c'],
            floraStem: '#39897c',
            floraClover: '#1d6b5c',
            floraBell: '#87cbbc',
            floraOat: '#5fb3a2',
            floraCore: '#0e2b27',
            leaf: ['#0c352e', '#114239', '#082a24', '#154a40', '#06211c'],
            midrib: ['#6cc0b1', '#84d3c5', '#4fa899'],
            leafStroke: 'rgba(3, 22, 19, 0.55)',
            stemDark: '#0b3a33',
            stemBody: '#155c50',
            stemLight: '#2f8b7b',
            stemNode: 'rgba(120, 197, 186, 0.35)',
            sepalDark: '#0a2f2a',
            sepalLight: '#2a7a6c',
            filament: '120, 197, 186',
            filamentActive: '#5bbcb0',
            bristle: '120, 197, 186',
            bristleActive: 'rgba(120, 197, 186, 0.55)',
            ringOuter: '#3d8a7d',
            ringCore: '#57a89a',
            coreGlow: ['rgba(24, 96, 84, ', 'rgba(30, 110, 98, ', 'rgba(14, 20, 22, 0)'],
            receptacle: ['#0a2f2a', '#0e413a', '#1b5c53'],
            seed: { hotspot: '#f0a03a', high: '#2f9c8a', medium: '#3d8f88', low: '#5cb87a' },
            badgeBg: 'rgba(22, 38, 35, 0.9)',
            badgeStroke: 'rgba(120, 197, 186, 0.28)',
            badgeSub: 'rgba(190, 225, 218, 0.6)',
            badgeBgActive: 'rgba(11, 23, 21, 0.99)',
            badgeSubActive: 'rgba(216, 243, 237, 0.92)',
            // 激活态参数：深色底本身对比足够，保留原本的实色描边与较亮光晕
            badgeActive: { strokeA: 1, width: 2.2, blur: 24, glowA: 1, beamA: 0.75 },
            coreLabel: '160, 220, 210',
            pitting: 'rgba(120, 197, 186, 0.5)'
        }
    };

    function isDarkMode() {
        try {
            return (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
        } catch (e) { return false; }
    }

    // 配色方案：仅保留 2 套，每套各自带深浅主题两份色值
    // （仅覆盖种子色与花托环色，草坪/茎叶等植物学配色始终随主题）
    var PRESET_THEMES = [
        {
            name: '经典墨绿',
            desc: '暖橙高频搭配深青、墨绿与鼠尾草色',
            light: {
                hotspot: '#e68a1d', high: '#145c50', medium: '#2b7a78', low: '#4f9d69',
                ringOuter: '#1d5c52', ringCore: '#0d443c'
            },
            dark: {
                hotspot: '#f0a03a', high: '#2f9c8a', medium: '#3d8f88', low: '#5cb87a',
                ringOuter: '#3d8a7d', ringCore: '#57a89a'
            }
        },
        {
            name: '纯白绒毛',
            desc: '轻盈白色绒毛，浅底显素雅、深底显通透',
            light: {
                hotspot: '#fbf8f4', high: '#f1f8f7', medium: '#dee8e7', low: '#dde7d0',
                ringOuter: '#8fb5ab', ringCore: '#2d6d61'
            },
            dark: {
                hotspot: '#fff4e4', high: '#eef9f7', medium: '#d8e6e5', low: '#dfead0',
                ringOuter: '#a8cfc5', ringCore: '#e2f1ed'
            }
        }
    ];

    // 深浅主题各自默认应用的色调：浅色 → 纯白绒毛，深色 → 经典墨绿
    var AUTO_PALETTE = { light: 1, dark: 0 };

    // 当前深浅主题键
    function themeKey() { return isDarkMode() ? 'dark' : 'light'; }

    // 取某套预设（idx）在当前深浅主题下应使用的颜色
    function presetConfig(idx, dark) {
        var p = PRESET_THEMES[idx] || PRESET_THEMES[0];
        return normalizeColorConfig(dark ? p.dark : p.light);
    }

    // 6 个可自定义色位（与源项目一致）
    var COLOR_FIELDS = [
        { key: 'hotspot', label: '重点难词' },
        { key: 'high', label: '高频（大圈）' },
        { key: 'medium', label: '中频（中圈）' },
        { key: 'low', label: '低频（小圈）' },
        { key: 'ringOuter', label: '轨道外环' },
        { key: 'ringCore', label: '花托内环' }
    ];

    // 校验配色配置：仅接受 #rgb/#rrggbb，缺失或非法项回落到「经典墨绿（浅色）」
    function normalizeColorConfig(raw) {
        var fb = PRESET_THEMES[0].light;
        var cfg = {};
        for (var i = 0; i < COLOR_FIELDS.length; i++) {
            var k = COLOR_FIELDS[i].key;
            var v = raw ? raw[k] : null;
            cfg[k] = (typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim()))
                ? v.trim() : fb[k];
        }
        return cfg;
    }

    // 当前主题生效的方案索引：手动选择（仅记住在其所处的深浅主题）优先，否则用该主题的自动方案
    function activePalette() {
        var k = themeKey();
        var sel = state.paletteSel ? state.paletteSel[k] : null;
        return sel == null ? AUTO_PALETTE[k] : sel;
    }

    // 当前主题是否处于自动跟随（未手动选色/未自定义）
    function isAutoPalette() {
        var k = themeKey();
        return !(state.paletteCustom && state.paletteCustom[k]) && state.paletteSel[k] == null;
    }

    // 当前生效配色：该主题有自定义色值则用它，否则用生效方案在当前主题下的色值
    function effectiveColorConfig() {
        var k = themeKey();
        var custom = state.paletteCustom ? state.paletteCustom[k] : null;
        if (custom) return custom;
        return presetConfig(activePalette(), isDarkMode());
    }

    // 主题缓存：键为「深浅模式 + 生效配色指纹」，避免每帧重建对象
    var themeCache = { key: null, val: null };

    function theme() {
        var dark = isDarkMode();
        var c = effectiveColorConfig();
        var key = (dark ? 'D|' : 'L|') + [c.hotspot, c.high, c.medium, c.low, c.ringOuter, c.ringCore].join(',');
        if (themeCache.key === key) return themeCache.val;
        var val = Object.assign({}, dark ? THEMES.dark : THEMES.light);
        val.seed = { hotspot: c.hotspot, high: c.high, medium: c.medium, low: c.low };
        val.ringOuter = c.ringOuter;
        val.ringCore = c.ringCore;
        themeCache.key = key;
        themeCache.val = val;
        return val;
    }

    /* ========================================================
       颜色工具（移植自 src/utils/colorUtils.ts）
       ======================================================== */
    function hexToRgba(hex) {
        var clean = String(hex || '').trim().replace(/^#/, '');
        if (clean.length === 3) {
            clean = clean.split('').map(function (c) { return c + c; }).join('');
        }
        if (clean.length === 6) {
            var num = parseInt(clean, 16);
            return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
        }
        return { r: 30, g: 90, b: 80 };
    }

    // 十六进制色 + 透明度 → rgba 字符串
    function rgbaFrom(hex, a) {
        var c = hexToRgba(hex);
        return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + a + ')';
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    // 解析 'rgba(r, g, b, a)' 或十六进制色值为 rgb 分量
    function rgbaStrToRgb(str) {
        var m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(String(str || ''));
        if (m) return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]) };
        return hexToRgba(str);
    }

    function hslToRgbaStr(h, s, l, a) {
        a = a === undefined ? 1 : a;
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;
        var c = (1 - Math.abs(2 * l - 1)) * s;
        var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        var m = l - c / 2;
        var r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        return 'rgba(' + Math.round((r + m) * 255) + ', ' + Math.round((g + m) * 255) + ', ' + Math.round((b + m) * 255) + ', ' + a + ')';
    }

    // 由种子主题色派生同色系明暗层级（深色模式反转为深底浅字）
    // 结果按「色值 + 深浅模式」缓存：每帧逐节点调用，缓存可避免大量临时字符串与 GC 压力
    var seedPaletteCache = {};
    function getDerivedSeedPalette(hexColor, dark) {
        var cacheKey = hexColor + '|' + (dark ? 1 : 0);
        var cached = seedPaletteCache[cacheKey];
        if (cached) return cached;
        var pal = buildSeedPalette(hexColor, dark);
        seedPaletteCache[cacheKey] = pal;
        return pal;
    }

    function buildSeedPalette(hexColor, dark) {
        var rgb = hexToRgba(hexColor);
        var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        var h = hsl.h, s = hsl.s, l = hsl.l;

        var centerPipColor = hslToRgbaStr(h, Math.min(100, s + 15), dark ? Math.max(45, Math.min(70, l * 1.3)) : Math.max(10, Math.min(30, l * 0.45)), dark ? 0.85 : 0.7);
        var darkOutline = hslToRgbaStr(h, Math.min(100, s + 10), dark ? Math.max(20, l * 0.5) : Math.max(8, l * 0.4), 0.85);
        var selectedBodyColor = hslToRgbaStr(h, Math.min(100, s + 10), dark ? Math.max(30, l * 1.1) : Math.max(12, l * 0.6), 1);
        var selectedHaloColor = hslToRgbaStr(h, Math.min(100, s + 20), dark ? Math.max(50, l * 1.2) : Math.max(10, l * 0.45), 0.95);
        var hoverHaloColor = hslToRgbaStr(h, Math.min(100, s + 10), dark ? Math.max(55, l * 1.25) : Math.max(18, l * 0.75), 0.9);
        var proficiencyRingColor = hslToRgbaStr(h, Math.min(100, s + 5), dark ? Math.max(45, l * 1.2) : Math.max(15, l * 0.6), 0.65);
        var pappusRayColor = hslToRgbaStr(h, Math.min(80, s + 10), dark ? Math.max(45, Math.min(80, l * 1.3)) : Math.max(20, Math.min(60, l * 0.8)), dark ? 0.6 : 0.5);

        // 标签胶囊：浅色模式用浅纸底 + 深字；深色模式用深底 + 浅字
        var labelBg = dark
            ? hslToRgbaStr(h, Math.min(45, s * 0.5), 12, 0.92)
            : hslToRgbaStr(h, Math.min(30, s * 0.4), 97, 0.94);
        var labelBorder = dark
            ? hslToRgbaStr(h, Math.min(70, s), 46, 0.5)
            : hslToRgbaStr(h, Math.min(60, s), Math.max(25, l * 0.7), 0.35);
        var labelTextColor = dark
            ? hslToRgbaStr(h, Math.min(60, s + 10), 88, 1)
            : hslToRgbaStr(h, Math.min(90, s + 10), Math.max(8, Math.min(22, l * 0.32)), 1);
        var labelTextColorSelected = dark
            ? hslToRgbaStr(h, Math.min(70, s + 20), 94, 1)
            : hslToRgbaStr(h, Math.min(100, s + 20), Math.max(5, Math.min(15, l * 0.2)), 1);
        var phoneticColor = dark
            ? hslToRgbaStr(h, Math.min(70, s), 70, 0.9)
            : hslToRgbaStr(h, Math.min(80, s), Math.max(18, l * 0.45), 0.85);

        return {
            themeColor: hexColor,
            darkOutline: darkOutline,
            centerPipColor: centerPipColor,
            selectedBodyColor: selectedBodyColor,
            selectedHaloColor: selectedHaloColor,
            hoverHaloColor: hoverHaloColor,
            proficiencyRingColor: proficiencyRingColor,
            labelBg: labelBg,
            labelBorder: labelBorder,
            labelBorderHover: hexColor,
            labelBorderSelected: dark ? '#ffffff' : hslToRgbaStr(h, Math.min(100, s + 15), Math.max(15, l * 0.5), 1),
            labelTextColor: labelTextColor,
            labelTextColorSelected: labelTextColorSelected,
            phoneticColor: phoneticColor,
            pappusRayColor: pappusRayColor
        };
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // 种子辐射绒毛预渲染精灵：每个节点每帧描 30 条线开销极大，
    // 改为按「描边色 + 半径 + 像素比」缓存离屏画布，绘制时仅一次 drawImage
    var hairSpriteCache = {};
    function hairSprite(strokeColor, radius, dpr) {
        var r = Math.max(1, Math.round(radius));
        var ratio = Math.max(1, Math.round((dpr || 1) * 100) / 100);
        var key = strokeColor + '|' + r + '|' + ratio;
        var hit = hairSpriteCache[key];
        if (hit) return hit;
        if (Object.keys(hairSpriteCache).length > 600) hairSpriteCache = {};

        var pad = 2;
        var half = r + pad;
        var cv = document.createElement('canvas');
        cv.width = Math.max(2, Math.round(half * 2 * ratio));
        cv.height = cv.width;
        var c = cv.getContext('2d');
        c.setTransform(ratio, 0, 0, ratio, 0, 0);
        c.translate(half, half);
        var rgb = rgbaStrToRgb(strokeColor);
        c.strokeStyle = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.22)';
        c.lineWidth = 0.6;
        for (var i = 0; i < 30; i++) {
            var a = (i / 30) * TAU;
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            c.stroke();
        }
        var sprite = { cv: cv, half: half };
        hairSpriteCache[key] = sprite;
        return sprite;
    }

    // 文本宽度缓存：measureText 会触发布局度量，标签较多的场景下逐帧调用开销明显
    var textWidthCache = {};
    function textWidth(ctx, font, text) {
        var key = font + '|' + text;
        var w = textWidthCache[key];
        if (w === undefined) {
            if (Object.keys(textWidthCache).length > 4000) textWidthCache = {};
            ctx.font = font;
            w = ctx.measureText(text).width;
            textWidthCache[key] = w;
        }
        return w;
    }

    /* ========================================================
       状态
       ======================================================== */
    var state = {
        raf: null,
        canvas: null,
        ctx: null,
        dpr: 1,
        width: 0,
        height: 0,
        nodes: [],
        words: [],
        hoveredWord: null,
        selectedWord: null,
        pinnedCluster: '',      // 点击分类标签锁定的聚类名（空 = 未锁定）
        hoveredBadge: '',       // 当前悬停的分类标签名（用于光标与悬停强调）
        badgeHit: null,         // 上一帧徽标的屏幕命中区域（供点击分类标签用）
        cardNode: null,
        cardTimer: null,
        sim: { alpha: 0, alphaTarget: 0, alphaDecay: 0.022, velocityDecay: 0.35 },
        transform: { x: 0, y: 0, k: 0.9 },
        fitZoom: 0,             // 适屏缩放（整朵蒲公英铺满屏幕的比例），外圈渐隐以此为基准
        viewTouched: false,     // 用户是否手动平移/缩放过视角
        panning: false,
        panStart: null,
        // 多点触控：pointerId → 该指最近的画布坐标。双指同时按下时进入
        // pinch 手势（间距变化缩放、中点移动平移），见 applyPinch
        pointers: {},
        pinch: null,
        dragNode: null,
        clusters: [],
        clusterAngleMap: {},
        meadow: null,
        // 配置（按用户持久化）
        selected: [],
        layout: 'dandelion-cluster',
        // 忘记词（空中飘散种子）的取词口径：proficiency / ebbinghaus / error / favorite
        forgetMode: 'proficiency',
        forgotten: [],          // 本次重建挑出的忘记词（按紧急度排序，见 computeForgotten）
        floatWords: [],         // 其中真正会飘到空中的那几颗（与花头节点互斥）
        // 拖拽产生的会话级覆盖：仅本次打开有效，刷新即清空（收藏结果本身已落盘）。
        // 键为 wordKey，值为 true
        forcedOut: {},          // 手动拽出花头 → 强制飘在空中（并收藏）
        forcedIn: {},           // 手动拽回花头 → 强制不再飘（并取消收藏）
        dragSeed: null,         // 正在拖拽的飘散种子
        dragMoved: false,       // 本次按下是否已拖出足够距离（区分点击与拖拽）
        dragStart: null,
        dragGrab: null,         // 抓取时指针与节点中心的偏移（世界坐标），拖动时保持它不跳位
        dragPointer: null,      // 拖拽中的指针屏幕坐标（画落点提示环用）
        // 花头在世界坐标中的中心与半径（每帧由 render/drawReceptacle 写入，拖拽落点判定用）
        headX: 0,
        headY: 0,
        headRadius: 0,
        nodeSeq: 0,             // 拖回花头时新增节点的 id 序号
        showClusterLabels: true,// 是否绘制外圈分类徽标（类别名称），可由控制面板关闭
        gravity: 2.5,
        repulsion: -55,
        breeze: 0.2,
        breezeActive: true,
        // 配色（按深浅主题分别记忆；null = 自动跟随该主题的默认色调）
        paletteSel: { light: null, dark: null },
        paletteCustom: { light: null, dark: null },
        initialized: false,
        // 当前词单词量：茎长按它自适应增高（见 stemScale）
        wordCount: 0,
        lastBuildKey: null,
        controlsBound: false,
        resizeBound: false,
        themeObserved: false
    };

    function coverEl() { return document.getElementById('coverDandelion'); }

    function coverVisible() {
        var el = coverEl();
        return !!(el && !el.classList.contains('hidden') && el.offsetWidth > 0 && el.offsetHeight > 0);
    }

    function loadConfig() {
        try {
            if (Storage && typeof Storage.loadDandelionConfig === 'function') {
                return Storage.loadDandelionConfig();
            }
        } catch (e) { /* 忽略 */ }
        return null;
    }

    function saveConfig() {
        try {
            if (Storage && typeof Storage.saveDandelionConfig === 'function') {
                Storage.saveDandelionConfig({
                    selected: state.selected.slice(),
                    layout: state.layout,
                    forgetMode: state.forgetMode,
                    showClusterLabels: state.showClusterLabels,
                    gravity: state.gravity,
                    repulsion: state.repulsion,
                    breeze: state.breeze,
                    breezeActive: state.breezeActive,
                    paletteSel: { light: state.paletteSel.light, dark: state.paletteSel.dark },
                    paletteCustom: {
                        light: state.paletteCustom.light ? Object.assign({}, state.paletteCustom.light) : null,
                        dark: state.paletteCustom.dark ? Object.assign({}, state.paletteCustom.dark) : null
                    }
                });
            }
        } catch (e) { /* 忽略 */ }
    }

    function currentCover() {
        try {
            var cfg = Storage.getUserConfig();
            if (cfg && cfg.basicSettings && cfg.basicSettings.defaultCover) {
                return cfg.basicSettings.defaultCover;
            }
        } catch (e) { /* 忽略 */ }
        return 'import';
    }

    /* ========================================================
       数据：词条收集、语义聚类、词频/熟练度映射
       ======================================================== */

    // 确保内置「示例单词」词单存在（与其它封面一致的新用户兜底）
    function ensureDemoBook() {
        var books = Storage.loadBooks() || [];
        var demo = books.find(function (b) { return String(b.name) === '示例单词'; });
        if (!demo) {
            var demoWords = (global.WordParser && global.WordParser.getDemoWords) ? global.WordParser.getDemoWords() : [];
            if (demoWords.length) demo = Storage.addBook({ name: '示例单词', words: demoWords });
        }
        return demo || null;
    }

    // CEFR 等级 → 词频（越基础越"高频"，种子越大越靠内）
    var CEFR_FREQ = { A1: 96, A2: 86, B1: 71, B2: 56, C1: 36, C2: 21 };
    var levelCache = null;

    function ensureLevelCache() {
        if (levelCache) return levelCache;
        var cache = {};
        try {
            var data = typeof global.CEFR_DATA !== 'undefined' ? global.CEFR_DATA
                : (typeof CEFR_DATA !== 'undefined' ? CEFR_DATA : null);
            if (data) {
                ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].forEach(function (lv) {
                    if (Array.isArray(data[lv])) {
                        cache[lv] = new Set(data[lv].map(function (s) { return String(s).toLowerCase(); }));
                    }
                });
            }
        } catch (e) { /* 忽略 */ }
        levelCache = cache;
        return cache;
    }

    function freqOf(word) {
        var cache = ensureLevelCache();
        var lw = String(word || '').toLowerCase();
        var levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        for (var i = 0; i < levels.length; i++) {
            if (cache[levels[i]] && cache[levels[i]].has(lw)) return CEFR_FREQ[levels[i]];
        }
        // 未命中：按长度粗略估计（越长越生僻）
        var n = lw.replace(/[^a-z]/g, '').length;
        return Math.max(20, Math.min(80, 92 - n * 4));
    }

    // CEFR 等级（词卡等级角标用）与等级配色（与单词星云保持一致）
    var CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    var CEFR_LEVEL_COLORS = { A1: '#57912b', A2: '#93a418', B1: '#b9780f', B2: '#b6620e', C1: '#b32e27', C2: '#b1296d' };

    function levelOf(word) {
        var cache = ensureLevelCache();
        var lw = String(word || '').trim().toLowerCase();
        for (var i = 0; i < CEFR_LEVELS.length; i++) {
            if (cache[CEFR_LEVELS[i]] && cache[CEFR_LEVELS[i]].has(lw)) return CEFR_LEVELS[i];
        }
        return '';
    }

    // 熟练度 1~5：由练习正确率推导（无练习记录视为陌生）
    function proficiencyOf(total, wrong, learned) {
        if (!total) return learned ? 2 : 1;
        var acc = Math.max(0, (total - wrong) / total);
        var p = 1 + Math.round(acc * 4);
        if (learned && p < 3) p += 1;
        return Math.max(1, Math.min(5, p));
    }

    /* ---------------- 忘记词：空中飘散种子取自哪些词（可由控制面板切换口径） ----------------
       几种口径都只影响「哪些词飘在空中」这个复习提示，不影响星团聚类与节点本身：
         proficiency 熟练度低（默认）：正确率推得的熟练度 <= 2，含尚无练习记录的词。
                     词书刚导入时几乎全是它，属于"还没背"而非真的"忘了"
         ebbinghaus  艾宾浩斯到期：SM-2 记忆表里已到期的词（nextReviewDate 早于今日零点，
                      含逾期），按到期时间升序 —— 最该复习的排最前，封面即复习清单。
                      取法刻意与 Storage.getDueWords 一致：封面提示的词，在「待复习」里
                      一定数得出来，否则两边对不上会让人以为封面在乱标
         error       错误率最高 10%：只统计真正练过的词，同错误率时练习次数多的更可信
         favorite    收藏单词：用户主动加星的词。收藏这个动作本身就说明"这个我记不住"，
                      与练习数据无关，故不过滤、不排序，沿用 list 的难词优先次序

       口径之外还可直接拖拽（见 dropNodeToSeed / dropSeedToNode）：
       把花头里的词拽到花头外松手 = 收藏并让它随风飘走；把空中的种子拽回花头内松手
       = 取消收藏并归位。这两个动作只覆盖本次会话（state.forcedOut / forcedIn），
       刷新即失效、恢复成上面各口径的挑选结果；但收藏/取消收藏本身已写入收藏表，
       是长期生效的 —— 刷新后若正好用 favorite 口径，拽出过的词会照样飘在空中 */
    var FORGET_MODES = ['proficiency', 'ebbinghaus', 'error', 'favorite'];

    // 词形归一化：收藏表、记忆表、拖拽覆盖集都以它作键，
    // 避免大小写与首尾空格差异让同一个词在两处认不出是同一个
    function wordKey(v) {
        var s = (v && typeof v === 'object') ? (v.word || v.name || '') : v;
        return String(s || '').trim().toLowerCase();
    }

    // 池子中按当前口径挑出忘记词，并按紧急度排序（createMeadowScene 再截到 MAX_FLOAT_SEEDS）
    function pickForgotten(list) {
        var mode = state.forgetMode;
        if (mode === 'favorite') {
            return list.filter(function (w) { return w.favorite === true; });
        }
        if (mode === 'ebbinghaus') {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var due = list.filter(function (w) { return w.due > 0 && w.due <= today.getTime(); });
            due.sort(function (a, b) { return a.due - b.due; });
            return due;
        }
        if (mode === 'error') {
            var practiced = list.filter(function (w) { return w.total > 0 && w.errorRate > 0; });
            practiced.sort(function (a, b) {
                if (b.errorRate !== a.errorRate) return b.errorRate - a.errorRate;
                return b.total - a.total;
            });
            return practiced.slice(0, Math.ceil(practiced.length * 0.1));
        }
        return list.filter(function (w) { return w.proficiency <= 2; });
    }

    // 口径挑选 + 会话级手动覆盖，得到最终「会飘在空中」的候选（顺序即截断优先级）。
    // 手动拖拽只改本次会话的归位结果，故不写配置、不落盘：刷新后回到纯口径挑选；
    // 但收藏本身已写入收藏表，长期有效
    function computeForgotten(list) {
        var byKey = {};
        list.forEach(function (w) { byKey[wordKey(w)] = w; });
        var picked = {};
        var out = [];
        // 1. 手动拽出的词排最前：MAX_FLOAT_SEEDS 截断时优先保住用户亲手挑的那几个
        for (var k in state.forcedOut) {
            if (!state.forcedOut.hasOwnProperty(k)) continue;
            var w = byKey[k];
            // 词不在当前词池（换了词单）或已被手动拽回时，覆盖失效
            if (!w || state.forcedIn[k]) continue;
            picked[k] = true;
            out.push(w);
        }
        // 2. 口径挑出的词依次追加，跳过已入列与被手动拽回的
        pickForgotten(list).forEach(function (w) {
            var key = wordKey(w);
            if (picked[key] || state.forcedIn[key]) return;
            picked[key] = true;
            out.push(w);
        });
        return out;
    }

    // 词条自带标签规范化：旧标签迁移到当前分类树，对不上的一律丢弃（返回空串）
    function normalizeCategory(raw) {
        var cat = String(raw || '').replace(/／/g, '/').replace(/\s*\/\s*/g, '/').trim();
        if (!cat) return '';
        var ai = global.AIService;
        if (ai && typeof ai.getCategoryPathSet === 'function' && typeof ai.migrateLegacyCategory === 'function') {
            var set = ai.getCategoryPathSet();
            if (set && set.size) {
                cat = ai.migrateLegacyCategory(cat);
                if (!cat) return '';
            }
        }
        return cat;
    }

    // 聚类取词义一级分类（外圈分类）：词条自身标签优先，其次汉英类义词典，取不到归入「未分类」
    function categoryOf(word, ownCategory) {
        var own = normalizeCategory(ownCategory);
        if (own) return own.split('/').filter(Boolean)[0] || '';
        var d = global.ENGLISHWORDS_DICT;
        if (!d) return '';
        var entry = d[String(word || '').trim().toLowerCase()];
        if (!Array.isArray(entry) || !entry[2]) return '';
        var path = String(entry[2]).split('/').filter(Boolean);
        return path.length ? path[0] : '';
    }

    // 无分类词的统一星团名（collectWords 与 buildClusters 共用同一常量，避免口径不一致）
    var UNCLASSIFIED = '未分类';

    // 聚类配色：按一级分类名固定映射，保证同一分类在不同词单下颜色一致
    var CLUSTER_COLOR_BY_NAME = {
        '政法与军事': '#3d9988',
        '经济与产业': '#2b7a78',
        '空间与交通': '#37718e',
        '科学与技术': '#4a7c94',
        '语言与沟通': '#456990',
        '生活与休闲': '#4f9d69',
        '医疗与身心': '#68a67d',
        '感知与运动': '#5a8f7b',
        '时间与数量': '#2d6a4f',
        '思维与意志': '#6b8e5a',
        '未分类': '#8a9a6b'
    };
    // 分类树之外的兜底名（理论上不再产生）配色池
    var CLUSTER_FALLBACK_COLORS = ['#7a9e7e', '#39657a', '#55806b', '#6aa05c', '#567a8c'];
    var CLUSTER_EN = {
        // 词义分类树的 10 个一级分类
        '政法与军事': 'Law, Politics & Military',
        '经济与产业': 'Economy & Industry',
        '空间与交通': 'Space & Transport',
        '科学与技术': 'Science & Technology',
        '语言与沟通': 'Language & Communication',
        '生活与休闲': 'Life & Leisure',
        '医疗与身心': 'Health & Mind',
        '感知与运动': 'Perception & Motion',
        '时间与数量': 'Time & Quantity',
        '思维与意志': 'Mind & Will',
        '未分类': 'Unclassified'
    };

    // 收集选中词单 + 收藏中的词条
    function collectWords() {
        var list = [];
        var seen = {};
        var books = Storage.loadBooks() || [];
        // SM-2 记忆表：按词形索引（跨词单合并，同一个词在任一册到期即算到期）。
        // 词与词单无关地共用一份记忆状态，故这里不区分 bookId
        var memByWord = {};
        try {
            var memMap = (Storage.loadAllMemory && Storage.loadAllMemory()) || {};
            for (var mk in memMap) {
                if (!memMap.hasOwnProperty(mk)) continue;
                var colon = mk.indexOf(':');
                var mw = (colon >= 0 ? mk.slice(colon + 1) : mk).trim().toLowerCase();
                if (mw) memByWord[mw] = memMap[mk];
            }
        } catch (e) { /* 记忆表不可用时退化为无到期词 */ }

        // 收藏词集合：独立于「词单选择」是否勾了收藏 —— 收藏词可能同时也属于某个词书，
        // 那种情况下它由词书的 push 进入列表，若不单独标记就认不出它被收藏过
        var favSet = {};
        try {
            (Storage.loadFavoriteItems() || []).forEach(function (f) {
                var fk = String((f && f.word) || '').trim().toLowerCase();
                if (fk) favSet[fk] = true;
            });
        } catch (e) { /* 收藏表不可用时视为无收藏 */ }

        function push(w, bookId, idx) {
            var key = String(w.word || w.name || '').trim().toLowerCase();
            if (!key || seen[key]) return;
            seen[key] = true;
            var def0 = (w.definitions && w.definitions[0]) || {};
            var total = w.totalAttempts || 0;
            var wrong = w.wrongTimes || 0;
            // 已学过：位于词书进度游标之前（早于当前学习位置的词视为已过一遍）
            var learned = false;
            if (bookId && bookId !== 'favorites' && idx != null) {
                var bk = books.find(function (b) { return String(b.id) === String(bookId); });
                if (bk && bk.progress) learned = idx < (bk.progress.currentIndex || 0);
            }
            var category = categoryOf(key, w.category);
            var freq = freqOf(key);
            var errRate = total > 0 ? Math.round((wrong / total) * 100) : 0;
            // 艾宾浩斯到期时间（毫秒）：无记忆记录或时间戳非法时为 0，即"谈不上到期"
            var mem = memByWord[key];
            var due = mem && mem.nextReviewDate ? Date.parse(mem.nextReviewDate) : 0;
            list.push({
                word: w.word || w.name || '',
                phonetic: w.phonetic || '',
                pos: def0.pos || '',
                meaning: def0.meaning || '',
                frequency: freq,
                errorRate: errRate,
                total: total,
                due: isFinite(due) ? due : 0,
                proficiency: proficiencyOf(total, wrong, learned),
                // 重点难词：练过且错误率偏高（"专供难词"的视觉重心）
                isHotspot: total >= 2 && errRate >= 50,
                // 是否被收藏（忘记词的 favorite 口径据此挑选）
                favorite: favSet[key] === true,
                // 与 buildClusters 的星团名保持同一口径：无分类统一落为「未分类」，
                // 否则空串既对不上星团名（徽标高亮失效），也取不到角向目标（词会堆向 0 弧度）
                cluster: category || UNCLASSIFIED
            });
        }

        if (state.selected.indexOf('favorites') !== -1) {
            (Storage.loadFavoriteItems() || []).forEach(function (f) { push(f, 'favorites'); });
        }
        state.selected.forEach(function (id) {
            if (id === 'favorites') return;
            var book = books.find(function (b) { return String(b.id) === String(id); });
            if (book) (book.words || []).forEach(function (w, i) { push(w, book.id, i); });
        });

        // 排序只为视觉重心与点击优先级：重点难词（红点、更大的种子）排前面先画，
        // 于是它们落在他词之下不被遮挡；同时也让难词在命中检测里排在最后、优先被点到
        list.sort(function (a, b) {
            if (a.isHotspot !== b.isHotspot) return a.isHotspot ? -1 : 1;
            if (a.proficiency !== b.proficiency) return a.proficiency - b.proficiency;
            return 0;
        });
        state.wordCount = list.length;
        updateScaleWarn(state.wordCount);
        // 忘记词挑选（口径见 FORGET_MODES）
        state.forgotten = computeForgotten(list);
        // 真正会飘到空中的那几颗（顺序即优先级，createMeadowScene 也按同一上限取）
        state.floatWords = state.forgotten.slice(0, MAX_FLOAT_SEEDS);
        // 一个词要么在花头、要么在空中，不能两边都有：把要飘的词从节点里摘掉。
        // 摘的是「已飘出来的那几颗」而非整个遗忘候选 —— 熟练度口径下候选可能覆盖
        // 全表，照单全摘会让花头一个词都不剩
        var floating = {};
        state.floatWords.forEach(function (w) { floating[wordKey(w)] = true; });
        // 不截断：选中的词全部上图。词条越多花冠按 layoutScale 越大（见 makeNode），
        // 节点密度因此不随词量变化，既不重叠也不会让力导向的开销暴涨
        return list.filter(function (w) { return !floating[wordKey(w)]; });
    }

    // 程序化回填下拉值后，同步自绘下拉（setting-select）的触发器文字。
    // 封面模块可能早于 app.js 初始化，故存在性判断后再调用
    function syncPicker(idOrEl) {
        if (window.app && window.app.refreshSettingPicker) window.app.refreshSettingPicker(idOrEl);
    }

    // 词量过大的静默提示：只说明可能掉帧，无需任何操作
    function updateScaleWarn(total) {
        var el = document.getElementById('dandelionScaleWarn');
        if (!el) return;
        if (total > 1000) {
            el.textContent = '已选 ' + total + ' 词。单词量超过 1000 个同时显示时，可能会降低动画帧率与体验效果';
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    // 构建聚类：分类为星团，角度均布
    function buildClusters(words) {
        var order = [];
        var names = {};
        words.forEach(function (w) {
            var name = w.cluster || UNCLASSIFIED;
            if (!names[name]) { names[name] = 0; order.push(name); }
            names[name]++;
        });
        var clusters = order.map(function (name, i) {
            return {
                id: 'c' + i,
                name: name,
                englishName: CLUSTER_EN[name] || 'Semantic Cluster',
                baseColor: CLUSTER_COLOR_BY_NAME[name] || CLUSTER_FALLBACK_COLORS[i % CLUSTER_FALLBACK_COLORS.length],
                count: names[name],
                targetAngle: -Math.PI / 2 + (i / Math.max(1, order.length)) * TAU
            };
        });
        var angleMap = {};
        clusters.forEach(function (c) { angleMap[c.name] = c.targetAngle; });
        state.clusters = clusters;
        state.clusterAngleMap = angleMap;
        // 换词单/改筛选后原锁定分类可能已不存在，避免高亮悬空
        if (state.pinnedCluster && !angleMap.hasOwnProperty(state.pinnedCluster)) {
            state.pinnedCluster = '';
        }
        if (state.hoveredBadge && !angleMap.hasOwnProperty(state.hoveredBadge)) {
            state.hoveredBadge = '';
        }
        return clusters;
    }

    /* ========================================================
       力导向模拟（d3-force 简化原生实现）
       ======================================================== */
    function hashWord(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
        return h;
    }

    function gravityScale() {
        return Math.max(0.24, 1.0 - (state.gravity - 1.0) * 0.19);
    }

    /* ---------------- 茎长自适应（按词量） ---------------- */
    // 茎长放大系数：以 STEM_BASE_WORDS 词为基准 1 倍，按词量平方根增长并封顶。
    // 用平方根而非线性，是因为花冠面积（视觉重量）约与词量成正比，径长只随 √N 变化。
    function stemScale() {
        var n = Math.max(STEM_BASE_WORDS, state.wordCount || 0);
        return Math.min(STEM_MAX_SCALE, Math.sqrt(n / STEM_BASE_WORDS));
    }

    // 花头相对基准位置的上抬量（世界单位）：茎加长即把花头整体抬高，根部不动
    function stemLift() {
        return STEM_LEN * (stemScale() - 1);
    }

    /* ---------------- 花冠尺寸自适应（按词量，不截断词条） ----------------
       词条全量上图，节点就不能永远挤在同一个盘里：盘的面积要随词量增长，
       半径才只需随 √N 增长。以 LAYOUT_BASE_WORDS 为基准（该词量下 = 原先的尺寸），
       下限锁在 1，小词单保持原样、不会被缩小。
       副作用是节点密度不随词量变化 —— 力导向的邻域开销也就不会随词量暴涨 */
    function layoutScale() {
        var n = Math.max(LAYOUT_BASE_WORDS, state.wordCount || 0);
        return Math.sqrt(n / LAYOUT_BASE_WORDS);
    }

    // 画面内容的世界纵向范围（花冠顶 → 地面下沿），随茎长与花冠增长，用于取景
    function contentBounds() {
        var top = -(stemLift() + CANOPY_REF * layoutScale());
        var bottom = ROOT_Y + 80;
        return { top: top, bottom: bottom, center: (top + bottom) * 0.5, height: bottom - top };
    }

    // 适屏缩放：整朵蒲公英（含茎与花冠）刚好铺满屏幕的比例。
    // 1.216 为取景留白系数（沿用原先 h/1180 相对内容高 970 的留白比例）。
    // 下限压到 0.12：词单很大时花冠会显著变大，若沿用 0.22 会被夹住导致取景装不下
    function computeFitZoom(w, h) {
        var b = contentBounds();
        return Math.max(0.12, Math.min(1.15, Math.min(w / 1150, h / (b.height * 1.216))));
    }

    // 由词条构造一个力导向节点：径向目标距离与角向目标按当前排布算出。
    // buildSimulation 批量建点与「拖回花头」即时补点共用，避免两处公式走偏
    function makeNode(w, id, prev) {
        var gs = gravityScale();
        var ls = layoutScale();
        var angleBase = state.clusterAngleMap[w.cluster] || 0;
        var hash = hashWord(w.word);
        var distOffset = (Math.abs(hash) % 120) - 60;
        var targetDist = (240 + distOffset) * gs * ls;
        if (state.layout === 'proficiency-radial') {
            targetDist = (80 + (6 - w.proficiency) * 45 + (Math.abs(hash) % 25)) * gs * ls;
        } else if (state.layout === 'frequency-gravity') {
            targetDist = (75 + (100 - w.frequency) * 2.4 + (Math.abs(hash) % 18)) * gs * ls;
        }
        targetDist = Math.max(CORE_R + 6, targetDist);

        var baseRadius = 6 + (w.frequency / 100) * 11;
        var radius = w.isHotspot ? baseRadius * 1.35 : baseRadius;
        var angle = angleBase + ((hash % 100) / 100 - 0.5) * 0.9;

        return {
            id: id,
            x: prev ? prev.x : Math.cos(angle) * targetDist * 0.8,
            y: prev ? prev.y : Math.sin(angle) * targetDist * 0.8,
            vx: prev ? prev.vx : 0,
            vy: prev ? prev.vy : 0,
            radius: radius,
            word: w,
            targetDistance: targetDist,
            targetAngle: angle,
            isHotspot: w.isHotspot
        };
    }

    function buildSimulation() {
        var words = state.words || [];
        var old = {};
        state.nodes.forEach(function (n) { old[n.id] = n; });

        var nodes = words.map(function (w, i) {
            return makeNode(w, 'n' + i, old['n' + i]);
        });

        state.nodes = nodes;
        state.sim.alpha = state.initialized ? 0.5 : 0.9;
        state.sim.alphaTarget = 0;
    }

    // 单步积分：径向弹簧 + 聚类角向收敛 + 电荷斥力（网格加速）+ 碰撞分离
    function stepSimulation() {
        var sim = state.sim;
        if (sim.alpha < 0.004 && sim.alphaTarget === 0) return;

        sim.alpha += (sim.alphaTarget - sim.alpha) * sim.alphaDecay;
        var alpha = sim.alpha;
        var nodes = state.nodes;
        var nlen = nodes.length;
        if (!nlen) return;

        var gs = gravityScale();
        var radialStrength = state.layout === 'dandelion-cluster'
            ? Math.min(0.85, 0.35 * Math.sqrt(state.gravity))
            : Math.min(0.9, 0.45 * Math.sqrt(state.gravity));
        var angularStrength = state.layout === 'dandelion-cluster' ? 0.5 : 0;

        var i, j, n, m, dx, dy, d, k;

        // 1. 径向弹簧 + 聚类角向收敛
        for (i = 0; i < nlen; i++) {
            n = nodes[i];
            dx = n.x;
            dy = n.y;
            d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            k = ((n.targetDistance - d) / d) * alpha * radialStrength;
            n.vx += dx * k;
            n.vy += dy * k;

            if (angularStrength > 0) {
                var ang = Math.atan2(n.y, n.x);
                var diff = n.targetAngle - ang;
                while (diff > Math.PI) diff -= TAU;
                while (diff < -Math.PI) diff += TAU;
                if (diff > 0.6) diff = 0.6;
                if (diff < -0.6) diff = -0.6;
                var tf = diff * alpha * angularStrength * 0.12;
                n.vx += -Math.sin(ang) * tf;
                n.vy += Math.cos(ang) * tf;
            }
        }

        // 2. 电荷斥力（均匀网格邻域加速，避免 O(n²) 全量遍历）
        // cell 与 distanceMax 必须一同取小：搜索固定只看 3×3 个格子，若 cell 明显小于
        // distanceMax，作用距离内的邻点会被漏掉（力的方向随格子边界跳变，节点会抖）。
        // 两值又共同决定每个节点要考察多少邻点（≈ 9·cell²·词密度）。花冠面积随词量
        // 增长、密度恒定，而网格按世界坐标划分，于是这个邻点数与词量无关 ——
        // 单帧开销随词量线性增长。取 80 是为了让单帧邻点数落在百这个量级：
        // 原先 380 超过整片花冠的半径，等于每个节点都和全表两两配对，词量一大就卡
        var cell = 80;
        var grid = {};
        for (i = 0; i < nlen; i++) {
            n = nodes[i];
            var gx = Math.floor(n.x / cell);
            var gy = Math.floor(n.y / cell);
            var key = gx + ',' + gy;
            (grid[key] || (grid[key] = [])).push(n);
        }
        var distanceMax = 80;
        for (i = 0; i < nlen; i++) {
            n = nodes[i];
            var cx = Math.floor(n.x / cell);
            var cy = Math.floor(n.y / cell);
            for (var ox = -1; ox <= 1; ox++) {
                for (var oy = -1; oy <= 1; oy++) {
                    var bucket = grid[(cx + ox) + ',' + (cy + oy)];
                    if (!bucket) continue;
                    for (j = 0; j < bucket.length; j++) {
                        m = bucket[j];
                        if (m === n) continue;
                        dx = n.x - m.x;
                        dy = n.y - m.y;
                        d = Math.sqrt(dx * dx + dy * dy);
                        if (d === 0) { dx = (Math.random() - 0.5) * 2; dy = (Math.random() - 0.5) * 2; d = Math.sqrt(dx * dx + dy * dy); }
                        if (d > distanceMax) continue;
                        var strength = m.isHotspot ? state.repulsion * 1.6 : state.repulsion;
                        k = (strength * alpha) / (d * d);
                        n.vx += dx * k;
                        n.vy += dy * k;
                    }
                }
            }
        }

        // 3. 碰撞分离（同网格邻域，两轮直接位置修正）
        var collideOffset = state.gravity > 2.5 ? Math.max(4, 12 - (state.gravity - 2.5) * 3) : 12;
        for (var iter = 0; iter < 2; iter++) {
            for (i = 0; i < nlen; i++) {
                n = nodes[i];
                var gx2 = Math.floor(n.x / cell);
                var gy2 = Math.floor(n.y / cell);
                for (var ax = -1; ax <= 1; ax++) {
                    for (var ay = -1; ay <= 1; ay++) {
                        var bk = grid[(gx2 + ax) + ',' + (gy2 + ay)];
                        if (!bk) continue;
                        for (j = 0; j < bk.length; j++) {
                            m = bk[j];
                            if (m === n) continue;
                            var rr = n.radius + m.radius + collideOffset * 2;
                            dx = n.x - m.x;
                            dy = n.y - m.y;
                            d = Math.max(1e-4, Math.sqrt(dx * dx + dy * dy));
                            if (d >= rr) continue;
                            var push = ((rr - d) / d) * 0.5 * alpha;
                            var nPinned = n.fx != null || n.fy != null;
                            var mPinned = m.fx != null || m.fy != null;
                            if (nPinned && mPinned) continue;
                            if (nPinned) {
                                m.x -= dx * push * 2;
                                m.y -= dy * push * 2;
                            } else if (mPinned) {
                                n.x += dx * push * 2;
                                n.y += dy * push * 2;
                            } else {
                                n.x += dx * push;
                                n.y += dy * push;
                                m.x -= dx * push;
                                m.y -= dy * push;
                            }
                        }
                    }
                }
            }
        }

        // 4. 位置积分（速度阻尼后一次性推进）
        for (i = 0; i < nlen; i++) {
            n = nodes[i];
            if (n.fx != null) { n.x = n.fx; n.vx = 0; }
            else { n.vx *= sim.velocityDecay; n.x += n.vx; }
            if (n.fy != null) { n.y = n.fy; n.vy = 0; }
            else { n.vy *= sim.velocityDecay; n.y += n.vy; }
        }
    }

    /* ========================================================
       草地场景（移植自 src/utils/meadowRenderer.ts）
       ======================================================== */
    function groundY(x) {
        var rel = (x - ROOT_X) / 480;
        var knoll = Math.exp(-rel * rel) * 42;
        var roll = Math.sin(x * 0.0032) * 32 + Math.cos(x * 0.0068) * 16;
        return ROOT_Y + 16 - knoll + roll;
    }

    function createMeadowScene(forgottenWords) {
        var leaves = [];
        var flowers = [];
        var tufts = [];
        var seeds = [];
        var t = theme();

        // 1. 基部莲座状锯齿叶（蒲公英特征叶）
        var leafCount = 20;
        for (var i = 0; i < leafCount; i++) {
            var ratio = i / leafCount;
            var baseAngle = -Math.PI * 0.95 + ratio * Math.PI * 1.9;
            var angle = baseAngle + Math.sin(i * 3.7) * 0.15;
            leaves.push({
                angle: angle,
                length: 110 + (Math.sin(i * 2.1) * 38 + Math.cos(i * 5.3) * 22),
                width: 22 + (i % 4) * 4,
                lobes: 4 + (i % 3),
                color: t.leaf[i % t.leaf.length],
                midribColor: t.midrib[i % t.midrib.length],
                layer: Math.sin(angle) > -0.2 ? 'front' : 'back'
            });
        }

        // 2. 草原野花点缀（洋甘菊 / 三叶草 / 风铃草 / 野燕麦）
        var floraTypes = ['chamomile', 'clover', 'wild_oat', 'bluebell'];
        var flowerCount = 38;
        for (var f = 0; f < flowerCount; f++) {
            var fx = -1200 + (f / flowerCount) * 2600 + Math.sin(f * 6.3) * 35;
            if (Math.abs(fx - ROOT_X) < 45) continue;
            flowers.push({
                x: fx,
                y: groundY(fx) + (f % 2 === 0 ? 8 : 18),
                stemHeight: 35 + (f % 6) * 14,
                type: floraTypes[f % floraTypes.length],
                size: 9 + (f % 4) * 3,
                tilt: Math.sin(f * 4.9) * 0.22
            });
        }

        // 3. 散落草丛
        var tuftCount = 85;
        for (var g = 0; g < tuftCount; g++) {
            var tx = -1300 + (g / tuftCount) * 2800 + Math.sin(g * 8.7) * 20;
            tufts.push({
                x: tx,
                y: groundY(tx) + 10,
                height: 35 + (g % 5) * 16,
                bladeCount: 4 + (g % 4),
                spread: 0.28 + (g % 3) * 0.08,
                tilt: Math.sin(g * 5.3) * 0.25,
                color: t.grass[g % t.grass.length],
                isForeground: g % 2 === 1
            });
        }

        // 4. 飘散种子（未掌握的词作为"被遗忘的词"随风飘走）
        // 生成范围取「当前视野对应的世界矩形」（与 drawFloatingSeeds 的回卷边界同源）：
        // 种子一上来就散布在看得见的区域里，而不是落在视野外的固定世界坐标上、
        // 要靠回卷才被"折"进来。横向按序均布再加哈希抖动（避免整齐排队），
        // 纵向只占视野上部 —— 种子该飘在花朵周围的空中，不该一出现就压在草坪上
        var floatList = (forgottenWords || []).slice(0, MAX_FLOAT_SEEDS);
        var vr = viewWorldRect(0);
        var vrx = Math.max(1, vr.right - vr.left);
        var vry = Math.max(1, vr.bottom - vr.top);
        var vTop = 0.08, vBottom = 0.70;   // 纵向生成区间（相对视野上边缘的比例）
        floatList.forEach(function (fw, idx) {
            var hash = Math.abs(hashWord(fw.word));
            var ux = (floatList.length > 1 ? idx / floatList.length : 0) + (hash % 97) / 970;
            var uy = (hash % 997) / 997;
            seeds.push({
                x: vr.left + (ux % 1) * vrx,
                y: vr.top + (vTop + uy * (vBottom - vTop)) * vry,
                vx: 0.20 + (hash % 4) * 0.04,
                vy: -0.04 + ((hash % 3) * 0.03),
                scale: 0.85 + (fw.frequency / 250),
                rotation: (hash % 360) * (Math.PI / 180),
                rotSpeed: (hash % 2 === 0 ? 1 : -1) * 0.003,
                phase: (hash % 10) * 0.6,
                word: fw
            });
        });
        for (var s = 0; s < 10; s++) {
            seeds.push({
                x: -600 + Math.random() * 1800,
                y: 100 + Math.random() * 500,
                vx: 0.18 + Math.random() * 0.35,
                vy: -0.04 + Math.random() * 0.08,
                scale: 0.65 + Math.random() * 0.45,
                rotation: Math.random() * TAU,
                rotSpeed: (Math.random() - 0.5) * 0.008,
                phase: Math.random() * TAU
            });
        }

        return { leaves: leaves, flowers: flowers, tufts: tufts, seeds: seeds };
    }

    function drawRollingMeadow(ctx) {
        var t = theme();
        // A. 远处淡色起伏丘陵
        ctx.beginPath();
        ctx.moveTo(-1800, 1200);
        ctx.lineTo(-1800, ROOT_Y - 45);
        ctx.bezierCurveTo(-900, ROOT_Y - 115, -100, ROOT_Y + 15, 750, ROOT_Y - 75);
        ctx.bezierCurveTo(1200, ROOT_Y - 130, 1600, ROOT_Y - 55, 2200, ROOT_Y - 25);
        ctx.lineTo(2200, 1200);
        ctx.closePath();
        var farGrad = ctx.createLinearGradient(0, ROOT_Y - 120, 0, ROOT_Y + 400);
        farGrad.addColorStop(0, t.farHill[0]);
        farGrad.addColorStop(0.4, t.farHill[1]);
        farGrad.addColorStop(1, t.farHill[2]);
        ctx.fillStyle = farGrad;
        ctx.fill();
        ctx.strokeStyle = t.farHillStroke;
        ctx.lineWidth = 1;
        ctx.stroke();

        // B. 中景草坡
        ctx.beginPath();
        ctx.moveTo(-1800, 1200);
        ctx.lineTo(-1800, ROOT_Y - 5);
        ctx.bezierCurveTo(-800, ROOT_Y - 60, -200, ROOT_Y - 10, 400, ROOT_Y - 40);
        ctx.bezierCurveTo(900, ROOT_Y - 70, 1500, ROOT_Y - 15, 2200, ROOT_Y - 10);
        ctx.lineTo(2200, 1200);
        ctx.closePath();
        var midGrad = ctx.createLinearGradient(0, ROOT_Y - 60, 0, ROOT_Y + 300);
        midGrad.addColorStop(0, t.midHill[0]);
        midGrad.addColorStop(0.4, t.midHill[1]);
        midGrad.addColorStop(1, t.midHill[2]);
        ctx.fillStyle = midGrad;
        ctx.fill();

        // C. 前景主草坪
        ctx.beginPath();
        ctx.moveTo(-1800, 1200);
        ctx.lineTo(-1800, ROOT_Y + 45);
        ctx.bezierCurveTo(-600, ROOT_Y + 18, ROOT_X - 260, ROOT_Y - 42, ROOT_X, ROOT_Y - 18);
        ctx.bezierCurveTo(ROOT_X + 280, ROOT_Y + 8, 1000, ROOT_Y - 32, 2200, ROOT_Y + 35);
        ctx.lineTo(2200, 1200);
        ctx.closePath();
        var lawnGrad = ctx.createLinearGradient(0, ROOT_Y - 40, 0, ROOT_Y + 350);
        lawnGrad.addColorStop(0, t.lawn[0]);
        lawnGrad.addColorStop(0.12, t.lawn[1]);
        lawnGrad.addColorStop(0.4, t.lawn[2]);
        lawnGrad.addColorStop(0.8, t.lawn[3]);
        lawnGrad.addColorStop(1, t.lawn[4]);
        ctx.fillStyle = lawnGrad;
        ctx.fill();

        // D. 草皮边缘高光
        ctx.beginPath();
        ctx.moveTo(-1800, ROOT_Y + 45);
        ctx.bezierCurveTo(-600, ROOT_Y + 18, ROOT_X - 260, ROOT_Y - 42, ROOT_X, ROOT_Y - 18);
        ctx.bezierCurveTo(ROOT_X + 280, ROOT_Y + 8, 1000, ROOT_Y - 32, 2200, ROOT_Y + 35);
        ctx.strokeStyle = t.turfRim;
        ctx.lineWidth = 2;
        ctx.stroke();

        // E. 坡面刻线纹理
        ctx.strokeStyle = t.engraving;
        ctx.lineWidth = 0.8;
        for (var hx = -800; hx <= 1400; hx += 45) {
            var gy = groundY(hx);
            ctx.beginPath();
            ctx.moveTo(hx, gy + 8);
            ctx.lineTo(hx - 22, gy + 65);
            ctx.stroke();
        }
    }

    function drawTufts(ctx, foreground, wind, breeze, time) {
        var list = state.meadow ? state.meadow.tufts : [];
        for (var i = 0; i < list.length; i++) {
            var tuft = list[i];
            if (tuft.isForeground !== foreground) continue;
            if (perf.lowDetail && (i % 2)) continue;
            var half = (tuft.bladeCount - 1) * 0.5;
            var sway = wind * 0.16 * breeze + Math.sin(time * 2.2 + tuft.x * 0.008 + tuft.y * 0.005) * 0.04 * breeze;
            for (var b = 0; b < tuft.bladeCount; b++) {
                var rel = half === 0 ? 0 : (b - half) / half;
                var bladeAngle = tuft.tilt + rel * tuft.spread + sway * (1 - Math.abs(rel) * 0.2);
                var h = tuft.height * (1 - Math.abs(rel) * 0.28);
                var bw = foreground ? 2.6 : 1.8;
                var tipX = tuft.x + Math.sin(bladeAngle) * (h * 0.55);
                var tipY = tuft.y - h;
                var cpX = tuft.x + Math.sin(bladeAngle) * (h * 0.25) + sway * 4;
                var cpY = tuft.y - h * 0.5;
                ctx.beginPath();
                ctx.moveTo(tuft.x - bw * 0.5, tuft.y);
                ctx.quadraticCurveTo(cpX - bw * 0.2, cpY, tipX, tipY);
                ctx.quadraticCurveTo(cpX + bw * 0.2, cpY, tuft.x + bw * 0.5, tuft.y);
                ctx.closePath();
                ctx.fillStyle = tuft.color;
                ctx.fill();
            }
        }
    }

    function drawFlora(ctx, wind, breeze, time) {
        var t = theme();
        var list = state.meadow ? state.meadow.flowers : [];
        for (var i = 0; i < list.length; i++) {
            var f = list[i];
            if (perf.lowDetail && (i % 2)) continue;
            var tilt = f.tilt + wind * 0.20 * breeze + Math.sin(time * 1.9 + f.x * 0.006 + f.y * 0.004) * 0.05 * breeze;
            var tipX = f.x + Math.sin(tilt) * (f.stemHeight * 0.45);
            var tipY = f.y - f.stemHeight;

            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.quadraticCurveTo(f.x + Math.sin(tilt) * (f.stemHeight * 0.2), f.y - f.stemHeight * 0.55, tipX, tipY);
            ctx.strokeStyle = t.floraStem;
            ctx.lineWidth = 1.4;
            ctx.stroke();

            var p, ang, lx, ly;
            if (f.type === 'chamomile') {
                var pLen = f.size * 0.6;
                for (p = 0; p < 8; p++) {
                    ang = (p / 8) * TAU + tilt * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX + Math.cos(ang) * pLen, tipY + Math.sin(ang) * pLen);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
                    ctx.lineWidth = 2.4;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(tipX, tipY, f.size * 0.26, 0, TAU);
                ctx.fillStyle = t.floraCore;
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 0.8;
                ctx.stroke();
            } else if (f.type === 'clover') {
                for (p = 0; p < 3; p++) {
                    ang = (p / 3) * TAU - Math.PI / 2 + tilt * 0.4;
                    lx = tipX + Math.cos(ang) * f.size * 0.42;
                    ly = tipY + Math.sin(ang) * f.size * 0.42;
                    ctx.beginPath();
                    ctx.arc(lx, ly, f.size * 0.32, 0, TAU);
                    ctx.fillStyle = t.floraClover;
                    ctx.fill();
                }
            } else if (f.type === 'bluebell') {
                ctx.beginPath();
                ctx.arc(tipX, tipY - 2, f.size * 0.45, tilt * 0.3, Math.PI + tilt * 0.3);
                ctx.fillStyle = t.floraBell;
                ctx.fill();
                ctx.strokeStyle = t.floraStem;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            } else {
                for (p = 0; p < 3; p++) {
                    ctx.beginPath();
                    ctx.ellipse(tipX + (p - 1) * 3 + tilt * 2, tipY + p * 6, 2.2, 5, Math.PI / 5 + tilt * 0.3, 0, TAU);
                    ctx.fillStyle = t.floraOat;
                    ctx.fill();
                }
            }
        }
    }

    function drawRosette(ctx, layer, wind, breeze, time) {
        var t = theme();
        var list = state.meadow ? state.meadow.leaves : [];
        for (var i = 0; i < list.length; i++) {
            var leaf = list[i];
            if (leaf.layer !== layer) continue;
            ctx.save();
            ctx.translate(ROOT_X, ROOT_Y);
            var microSway = (wind * 0.08 + Math.sin(time * 1.6 + leaf.angle * 2) * 0.02) * breeze;
            ctx.rotate(leaf.angle + microSway);

            var len = leaf.length;
            var halfW = leaf.width * 0.5;
            var lobes = leaf.lobes;
            var step = (len * 0.72) / lobes;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            var l;
            for (l = 1; l <= lobes; l++) {
                var segX = l * step;
                var notchW = halfW * (0.35 + (l / lobes) * 0.65);
                ctx.lineTo(segX - step * 0.65, notchW * 0.35);
                ctx.lineTo(segX - step * 0.15, notchW);
                ctx.lineTo(segX, notchW * 0.45);
            }
            ctx.lineTo(len * 0.88, halfW * 0.35);
            ctx.lineTo(len, 0);
            ctx.lineTo(len * 0.88, -halfW * 0.35);
            for (l = lobes; l >= 1; l--) {
                var segX2 = l * step;
                var notchW2 = halfW * (0.35 + (l / lobes) * 0.65);
                ctx.lineTo(segX2, -notchW2 * 0.45);
                ctx.lineTo(segX2 - step * 0.15, -notchW2);
                ctx.lineTo(segX2 - step * 0.65, -notchW2 * 0.35);
            }
            ctx.closePath();
            ctx.fillStyle = leaf.color;
            ctx.fill();
            ctx.strokeStyle = t.leafStroke;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(len * 0.94, 0);
            ctx.strokeStyle = leaf.midribColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }
    }

    // 当前视野（平移 + 缩放后）对应的世界坐标矩形，margin 为四边外扩量。
    // 飘散种子的「生成范围」与「回卷边界」都取自这里，保证种子始终待在看得见的区域
    function viewWorldRect(margin) {
        var tr = state.transform;
        var zk = tr.k || 1;
        var m = margin || 0;
        var w = state.width, h = state.height;
        // 画布尺寸尚未取到（首次构建早于 resizeCanvas）时，退化为花头周围一块区域
        if (!w || !h) {
            return { left: -600 - m, right: 600 + m, top: -300 - m, bottom: 300 + m };
        }
        return {
            left: (0 - tr.x) / zk - m,
            right: (w - tr.x) / zk + m,
            top: (0 - tr.y) / zk - m,
            bottom: (h - tr.y) / zk + m
        };
    }

    function drawFloatingSeeds(ctx, wind, breeze, time) {
        var t = theme();
        var list = state.meadow ? state.meadow.seeds : [];
        // 以当前视野（平移 + 缩放后的可见世界坐标）为界：种子从视野最左侧进入、最右侧退出
        var vr = viewWorldRect(FLOAT_SEED_MARGIN);
        var viewLeft = vr.left;
        var viewRight = vr.right;
        var viewTop = vr.top;
        var viewBottom = vr.bottom;
        var spanX = Math.max(1, viewRight - viewLeft);
        var spanY = Math.max(1, viewBottom - viewTop);
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            // 拖拽中的种子跟随指针：暂停风漂与越界回卷，否则它会被"折"回对侧、跑离手指
            if (s.dragging) {
                // 位置由 onPointerMove 直接写入，这里什么都不做
            } else {
                s.x += s.vx + wind * 0.7 * breeze;
                s.y += s.vy + Math.sin(time + s.phase) * 0.15;
                s.rotation += s.rotSpeed;
                // 越界回卷：右侧出界即从最左侧重新进入，上下同理，保证始终横穿当前视野
                s.x = viewLeft + (((s.x - viewLeft) % spanX) + spanX) % spanX;
                s.y = viewTop + (((s.y - viewTop) % spanY) + spanY) % spanY;
            }

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);
            ctx.scale(s.scale, s.scale);

            var hasWord = !!s.word;
            var seedColor = t.seed.low;
            var palette = null;
            if (hasWord) {
                var freq = s.word.frequency;
                if (s.word.isHotspot) seedColor = t.seed.hotspot;
                else if (freq >= 70) seedColor = t.seed.high;
                else if (freq >= 40) seedColor = t.seed.medium;
                else seedColor = t.seed.low;
                palette = getDerivedSeedPalette(seedColor, isDarkMode());
            }

            ctx.beginPath();
            ctx.ellipse(0, 10, hasWord ? 1.6 : 1.2, hasWord ? 5.2 : 4.5, 0, 0, TAU);
            ctx.fillStyle = palette ? palette.darkOutline : t.stemDark;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.lineTo(0, -8);
            ctx.strokeStyle = palette ? palette.darkOutline : t.stemLight;
            ctx.lineWidth = hasWord ? 1.1 : 0.8;
            ctx.stroke();

            var rays = hasWord ? 12 : 8;
            var rayLen = hasWord ? 16 : 12;
            for (var r = 0; r < rays; r++) {
                var ang = -Math.PI / 2 + ((r - rays / 2 + 0.5) / rays) * (Math.PI * 0.92);
                ctx.beginPath();
                ctx.moveTo(0, -8);
                ctx.lineTo(Math.cos(ang) * rayLen, -8 + Math.sin(ang) * rayLen);
                ctx.strokeStyle = palette ? palette.pappusRayColor : 'rgba(255, 255, 255, 0.55)';
                ctx.lineWidth = hasWord ? 0.9 : 0.7;
                ctx.stroke();
            }

            if (hasWord) {
                ctx.rotate(-s.rotation);
                ctx.scale(1 / s.scale, 1 / s.scale);
                var labelText = s.word.word;
                ctx.font = '700 10.5px ' + FONT;
                var tw = ctx.measureText(labelText).width;
                roundRect(ctx, -tw / 2 - 5, -22, tw + 10, 15, 4);
                ctx.fillStyle = palette.labelBg;
                ctx.fill();
                ctx.strokeStyle = palette.labelBorder;
                ctx.lineWidth = 0.9;
                ctx.stroke();
                ctx.fillStyle = palette.labelTextColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(labelText, 0, -14);
            }
            ctx.restore();
        }
    }

    /* ========================================================
       蒲公英主体绘制
       ======================================================== */
    function drawStem(ctx, headX, headY, headAngle) {
        var t = theme();
        var tipX = headX - Math.sin(headAngle) * 44;
        var tipY = headY + Math.cos(headAngle) * 44;
        var stemHeight = ROOT_Y - tipY;

        var cp1X = ROOT_X;
        var cp1Y = ROOT_Y - stemHeight * 0.44;
        var cp2X = tipX - Math.sin(headAngle) * (stemHeight * 0.42);
        var cp2Y = tipY + Math.cos(headAngle) * (stemHeight * 0.42);

        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ROOT_X, ROOT_Y);
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tipX, tipY);
        ctx.lineWidth = 26;
        ctx.strokeStyle = t.stemDark;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ROOT_X, ROOT_Y);
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tipX, tipY);
        ctx.lineWidth = 20;
        ctx.strokeStyle = t.stemBody;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ROOT_X, ROOT_Y);
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tipX, tipY);
        ctx.lineWidth = 5;
        ctx.strokeStyle = t.stemLight;
        ctx.stroke();

        var steps = 16;
        for (var s = 1; s < steps; s++) {
            var p = s / steps;
            var bx = Math.pow(1 - p, 3) * ROOT_X + 3 * Math.pow(1 - p, 2) * p * cp1X + 3 * (1 - p) * p * p * cp2X + Math.pow(p, 3) * tipX;
            var by = Math.pow(1 - p, 3) * ROOT_Y + 3 * Math.pow(1 - p, 2) * p * cp1Y + 3 * (1 - p) * p * p * cp2Y + Math.pow(p, 3) * tipY;
            ctx.beginPath();
            ctx.arc(bx, by, 1.6, 0, TAU);
            ctx.fillStyle = t.stemNode;
            ctx.fill();
        }
    }

    function drawCalyx(ctx, headX, headY, headAngle) {
        var t = theme();
        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(headAngle);
        var sepals = [
            { sx: -24, sy: 42, cx: -48, cy: 76, ex: -26, ey: 96 },
            { sx: 0, sy: 48, cx: -8, cy: 88, ex: 12, ey: 104 },
            { sx: 24, sy: 44, cx: 52, cy: 78, ex: 42, ey: 98 },
            { sx: -12, sy: 45, cx: -28, cy: 82, ex: -16, ey: 108 },
            { sx: 14, sy: 46, cx: 32, cy: 86, ex: 28, ey: 110 }
        ];
        ctx.lineCap = 'round';
        sepals.forEach(function (s) {
            ctx.beginPath();
            ctx.moveTo(s.sx, s.sy);
            ctx.quadraticCurveTo(s.cx, s.cy, s.ex, s.ey);
            ctx.lineWidth = 7;
            ctx.strokeStyle = t.sepalDark;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(s.sx, s.sy);
            ctx.quadraticCurveTo(s.cx, s.cy, s.ex, s.ey);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = t.sepalLight;
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawReceptacle(ctx, headX, headY, headAngle, zoom) {
        var t = theme();
        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(headAngle);

        var ringLineAlpha = fadeByZoom(zoom, FADE_RING_LINE);
        var ringLabelAlpha = fadeByZoom(zoom, FADE_RING_LABEL);
        var labelAlpha = fadeByZoom(zoom, FADE_BADGE);
        // 外圈分类徽标（类别名称）的透明度：开关关闭时恒为 0。
        // 只作用于徽标本身，同心圈、导引环与结构光束仍按 labelAlpha/ringLineAlpha 渐隐
        var badgeAlpha = state.showClusterLabels ? labelAlpha : 0;
        // 当前激活的聚类：其外圈徽标同步高亮
        var activeCluster = activeClusterName();
        var gs = gravityScale();
        // 圈层与徽标随花冠一起按词量放大，才能与节点的落位半径保持对齐（见 layoutScale）
        var ls = layoutScale();

        // 同心圈定义（与节点目标半径层级一致）
        var ringDefs = [{ radius: CORE_R, label: '' }];
        var idx;
        if (state.layout === 'proficiency-radial') {
            var profTiers = [
                { prof: 5, baseR: 125, name: '5★ 精通' },
                { prof: 4, baseR: 170, name: '4★ 熟练' },
                { prof: 3, baseR: 215, name: '3★ 掌握' },
                { prof: 2, baseR: 260, name: '2★ 浅识' },
                { prof: 1, baseR: 305, name: '1★ 待复习' }
            ];
            profTiers.forEach(function (tier) {
                ringDefs.push({ radius: Math.max(tier.baseR * gs * ls, CORE_R + (6 - tier.prof) * 16), label: tier.name });
            });
        } else if (state.layout === 'frequency-gravity') {
            var freqTiers = [
                { baseR: 110, name: '90-100% 极高频' },
                { baseR: 170, name: '70-89% 高频词' },
                { baseR: 235, name: '40-69% 中频词' },
                { baseR: 305, name: '15-39% 进阶词' },
                { baseR: 380, name: '0-14% 低频词' }
            ];
            freqTiers.forEach(function (tier, i2) {
                ringDefs.push({ radius: Math.max(tier.baseR * gs * ls, CORE_R + (i2 + 1) * 18), label: tier.name });
            });
        } else {
            var clusterTiers = [
                { baseR: 120, name: 'CORE 核心词环' },
                { baseR: 200, name: 'MID 扩展语义层' },
                { baseR: 280, name: 'OUTER 联想羽毛层' },
                { baseR: 360, name: 'PERIPHERY 边缘星丛' }
            ];
            clusterTiers.forEach(function (tier, i3) {
                ringDefs.push({ radius: Math.max(tier.baseR * gs * ls, CORE_R + (i3 + 1) * 20), label: tier.name });
            });
        }

        var maxRing = 0;
        ringDefs.forEach(function (r) { if (r.radius > maxRing) maxRing = r.radius; });
        // 整式同乘 ls：词量正好为基准时与原先逐像素一致
        var outerRadius = Math.max(maxRing + 42 * ls, (380 * gs + 25) * ls);
        // 花冠外圈半径：拖拽时用来判定落点在不在花头范围内（见 insideHead）
        state.headRadius = outerRadius;

        if (ringLineAlpha > 0.02) {
            // 1. 花托背后的柔和辐射光晕
            var glowRadius = Math.max(120, outerRadius + 30);
            var glow = ctx.createRadialGradient(0, 0, 10, 0, 0, glowRadius);
            glow.addColorStop(0, t.coreGlow[0] + (0.08 * ringLineAlpha) + ')');
            glow.addColorStop(0.6, t.coreGlow[1] + (0.03 * ringLineAlpha) + ')');
            glow.addColorStop(1, t.coreGlow[2]);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, TAU);
            ctx.fill();

            // 2. 同心圈与圈层文字（缩放越远越淡，避免糊成一团）
            ringDefs.forEach(function (def, i) {
                ctx.beginPath();
                ctx.arc(0, 0, def.radius, 0, TAU);
                if (i === 0) {
                    ctx.strokeStyle = t.ringCore;
                    ctx.globalAlpha = ringLineAlpha;
                    ctx.lineWidth = 3;
                    ctx.setLineDash([]);
                } else {
                    ctx.strokeStyle = t.ringOuter;
                    ctx.globalAlpha = 0.28 * ringLineAlpha;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;

                if (i > 0 && ringLabelAlpha > 0.02) {
                    ctx.font = '600 10px ' + FONT;
                    ctx.fillStyle = t.ringOuter;
                    ctx.globalAlpha = 0.75 * ringLabelAlpha;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(def.label, 0, -def.radius - 3);
                    ctx.globalAlpha = 1;
                }
            });

            // 3. 外圈虚线导引环
            ctx.beginPath();
            ctx.arc(0, 0, outerRadius, 0, TAU);
            ctx.strokeStyle = t.ringOuter;
            ctx.globalAlpha = 0.2 * ringLineAlpha;
            ctx.lineWidth = 0.85;
            ctx.setLineDash([2, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        // 4. 深色花托圆盘（蒲公英花托）
        var centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, CORE_R);
        centerGrad.addColorStop(0, t.receptacle[0]);
        centerGrad.addColorStop(0.75, t.receptacle[1]);
        centerGrad.addColorStop(1, t.receptacle[2]);
        ctx.beginPath();
        ctx.arc(0, 0, CORE_R, 0, TAU);
        ctx.fillStyle = centerGrad;
        ctx.fill();
        ctx.strokeStyle = t.ringCore;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 花托上的斐波那契螺旋点阵
        var goldenAngle = Math.PI * (3 - Math.sqrt(5));
        for (idx = 0; idx < 48; idx++) {
            var rr = Math.sqrt(idx) * 6.5;
            var theta = idx * goldenAngle;
            ctx.beginPath();
            ctx.arc(Math.cos(theta) * rr, Math.sin(theta) * rr, 1.4, 0, TAU);
            ctx.fillStyle = t.pitting;
            ctx.fill();
        }

        // 花托中心文字（较晚淡出，缩到看不清圈层文字时才隐去）
        if (ringLabelAlpha > 0.1) {
            ctx.font = '700 9px ' + FONT;
            ctx.fillStyle = 'rgba(' + t.coreLabel + ', ' + ringLabelAlpha + ')';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('词忆', 0, -4);
            ctx.font = '500 7px ' + FONT;
            ctx.fillStyle = 'rgba(' + t.coreLabel + ', ' + (0.75 * ringLabelAlpha) + ')';
            ctx.fillText('VOCABULARY', 0, 6);
        }

        // 5. 放射状结构光束 + 冠毛绒毛 + 分类徽标
        var clusters = state.clusters;
        // 点击分类标签后用于命中的区域集合（每帧重建，坐标为画布 CSS 像素）
        var hitRects = [];
        for (idx = 0; idx < clusters.length; idx++) {
            var c = clusters[idx];
            var angle = c.targetAngle;
            var clusterDist = Math.max(75, 250 * gs * ls);
            var clusterX = Math.cos(angle) * clusterDist;
            var clusterY = Math.sin(angle) * clusterDist;
            var isActive = !!activeCluster && c.name === activeCluster;
            var actParams = t.badgeActive;

            if (ringLineAlpha > 0.02) {
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * CORE_R, Math.sin(angle) * CORE_R);
                ctx.lineTo(Math.cos(angle) * (outerRadius - 16), Math.sin(angle) * (outerRadius - 16));
                // 激活聚类的结构光束以其分类色点亮，与标签高亮呼应
                ctx.strokeStyle = isActive
                    ? rgbaFrom(c.baseColor, actParams.beamA * labelAlpha * ringLineAlpha)
                    : 'rgba(29, 92, 82, ' + (0.22 * ringLineAlpha) + ')';
                ctx.lineWidth = isActive ? 2 : 1.1;
                ctx.stroke();

                var bristleBase = Math.max(30, 90 * gs * ls);
                for (var b = 0; b < 22; b++) {
                    var bAngle = angle + ((b - 11) / 11) * 0.75;
                    var bLen = bristleBase + ((b * 17) % Math.max(15, 55 * gs * ls));
                    ctx.beginPath();
                    ctx.moveTo(clusterX, clusterY);
                    ctx.lineTo(clusterX + Math.cos(bAngle) * bLen, clusterY + Math.sin(bAngle) * bLen);
                    ctx.strokeStyle = isActive
                        ? rgbaFrom(c.baseColor, actParams.beamA * 0.7 * labelAlpha * ringLineAlpha)
                        : 'rgba(91, 188, 174, ' + (0.15 * ringLineAlpha) + ')';
                    ctx.lineWidth = 0.75;
                    ctx.stroke();
                }
            }

            if (badgeAlpha > 0.02) {
                var badgeX = Math.cos(angle) * outerRadius;
                var badgeY = Math.sin(angle) * outerRadius;

                ctx.font = '700 11px ' + FONT;
                var nameW = ctx.measureText(c.name).width;
                ctx.font = '500 8.5px ' + FONT;
                var engW = ctx.measureText(c.englishName).width;
                // 激活的聚类：徽标略微外扩，给外围光晕留出空间
                var pillW = Math.max(nameW, engW) + 22 + (isActive ? 8 : 0);
                var pillH = 34 + (isActive ? 8 : 0);

                // 记录命中区域：徽标足够可见（半透明以上）时才可点击
                if (badgeAlpha > 0.35 && state.transform.k > 0) {
                    var cosA2 = Math.cos(headAngle);
                    var sinA2 = Math.sin(headAngle);
                    var localX = headX + badgeX * cosA2 - badgeY * sinA2;
                    var localY = headY + badgeX * sinA2 + badgeY * cosA2;
                    hitRects.push({
                        name: c.name,
                        cx: state.transform.x + localX * state.transform.k,
                        cy: state.transform.y + localY * state.transform.k,
                        w: pillW * state.transform.k,
                        h: pillH * state.transform.k
                    });
                }

                ctx.save();
                ctx.translate(badgeX, badgeY);
                // 整枚徽标（底、描边、色点、文字）统一随阈值淡出，
                // 否则描边与色点不透明，淡出时会残留一圈"鬼影"轮廓
                ctx.globalAlpha = badgeAlpha;

                if (isActive) {
                    // 矩形框外围近似色光：以聚类色为阴影色向外扩散柔光，再叠一层加实
                    ctx.shadowColor = rgbaFrom(c.baseColor, actParams.glowA);
                    ctx.shadowBlur = actParams.blur;
                    roundRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, 9);
                    ctx.fillStyle = t.badgeBgActive;
                    ctx.fill();
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    // 提高对比度：聚类色描边（浅色模式下降低不透明度以免过于扎眼）
                    ctx.strokeStyle = rgbaFrom(c.baseColor, actParams.strokeA);
                    ctx.lineWidth = actParams.width;
                    ctx.stroke();
                } else {
                    roundRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, 8);
                    ctx.fillStyle = t.badgeBg;
                    ctx.fill();
                    ctx.strokeStyle = t.badgeStroke;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.arc(-pillW / 2 + (isActive ? 12 : 10), -3, isActive ? 3.6 : 3, 0, TAU);
                ctx.fillStyle = c.baseColor;
                ctx.fill();

                ctx.font = '700 ' + (isActive ? 11.5 : 11) + 'px ' + FONT;
                ctx.fillStyle = c.baseColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.name, 4, -5);

                ctx.font = '500 8px ' + FONT;
                ctx.fillStyle = isActive ? t.badgeSubActive : t.badgeSub;
                ctx.fillText(c.englishName, 4, 8);
                ctx.restore();
            }
        }
        state.badgeHit = hitRects;

        ctx.restore();
    }

    // 花托到种子的游丝连线 + 每个种子背后的羽状冠毛
    function drawFilaments(ctx, headX, headY) {
        var t = theme();
        var hovered = state.hoveredWord;
        var selected = state.selectedWord;
        var nodes = state.nodes;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var nx = node.renderX !== undefined ? node.renderX : node.x;
            var ny = node.renderY !== undefined ? node.renderY : node.y;
            var w = node.word;

            var isHi = inActiveCluster(w, hovered) || inActiveCluster(w, selected) || w === selected;

            ctx.beginPath();
            ctx.moveTo(headX, headY);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = isHi ? t.filamentActive : 'rgba(' + t.filament + ', ' + (isHi ? 0.48 : 0.14) + ')';
            ctx.lineWidth = isHi ? 1.3 : 0.65;
            ctx.stroke();

            var seedAngle = Math.atan2(ny - headY, nx - headX);
            var bLen = node.radius * 1.8;
            for (var b = 0; b < 5; b++) {
                var spread = (b - 2) * 0.22;
                ctx.beginPath();
                ctx.moveTo(nx, ny);
                ctx.lineTo(nx + Math.cos(seedAngle + spread) * bLen, ny + Math.sin(seedAngle + spread) * bLen);
                ctx.strokeStyle = isHi ? t.bristleActive : 'rgba(' + t.bristle + ', 0.22)';
                ctx.lineWidth = 0.55;
                ctx.stroke();
            }
        }
    }

    // 种子节点（词条）：颜色与大小取词频层级，重点难词用暖橘色
    function drawNodes(ctx, zoom) {
        var dark = isDarkMode();
        var t = theme();
        var hovered = state.hoveredWord;
        var selected = state.selectedWord;
        var nodes = state.nodes;

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var x = node.renderX !== undefined ? node.renderX : node.x;
            var y = node.renderY !== undefined ? node.renderY : node.y;
            var w = node.word;

            var isSelected = selected === w;
            var isHovered = hovered === w;

            var seedColor;
            if (w.isHotspot) seedColor = t.seed.hotspot;
            else if (w.frequency >= 80) seedColor = t.seed.high;
            else if (w.frequency >= 50) seedColor = t.seed.medium;
            else seedColor = t.seed.low;
            var pal = getDerivedSeedPalette(seedColor, dark);

            ctx.save();

            if (isSelected) {
                ctx.beginPath();
                ctx.arc(x, y, node.radius + 6, 0, TAU);
                ctx.strokeStyle = pal.selectedHaloColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (isHovered) {
                ctx.beginPath();
                ctx.arc(x, y, node.radius + 4.5, 0, TAU);
                ctx.strokeStyle = pal.hoverHaloColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // 种子主体
            ctx.beginPath();
            ctx.arc(x, y, node.radius, 0, TAU);
            ctx.fillStyle = isSelected ? pal.selectedBodyColor : pal.themeColor;
            ctx.fill();

            // 边缘线
            ctx.lineWidth = isSelected ? 2.5 : (isHovered ? 2 : 1);
            ctx.strokeStyle = isSelected ? '#ffffff' : (isHovered ? pal.darkOutline : 'rgba(' + (dark ? '200, 240, 232' : '12, 50, 44') + ', 0.35)');
            ctx.stroke();

            // 辐射状绒毛（离屏精灵一次性绘制，替代逐帧 30 条描线）
            var spr = hairSprite(pal.darkOutline, node.radius, state.dpr);
            ctx.drawImage(spr.cv, x - spr.half, y - spr.half, spr.half * 2, spr.half * 2);

            // 中心微孔
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1.2, node.radius * 0.26), 0, TAU);
            ctx.fillStyle = pal.centerPipColor;
            ctx.fill();

            // 熟练度 4 星以上的虚线外环
            if (w.proficiency >= 4) {
                ctx.beginPath();
                ctx.arc(x, y, node.radius + 3.2, 0, TAU);
                ctx.strokeStyle = pal.proficiencyRingColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // 标签：悬停 / 选中 / 重点难词 / 放大时显示。
            // 字号处于世界坐标、会随缩放变小，故再按屏幕像素判定可读性：
            // 词量大时适屏缩放更小，此时不画标签（否则糊成一团），放大后自然出现
            var fontSize = Math.max(9, Math.min(13, node.radius * 0.85 + ((isHovered || isSelected) ? 2 : 0)));
            var legible = fontSize * zoom >= 6.5;
            var showLabel = isSelected || isHovered ||
                ((w.isHotspot || zoom >= 1.1 || node.radius >= 12) && legible);
            if (showLabel) {
                var font = (isSelected || isHovered || w.isHotspot ? '700 ' : '600 ') + fontSize + 'px ' + FONT;

                var textW = textWidth(ctx, font, w.word);
                ctx.font = font;
                var labelY = y + node.radius + fontSize + 3;
                roundRect(ctx, x - textW / 2 - 4, labelY - fontSize + 1 - 2, textW + 8, fontSize + 4, 4);
                ctx.fillStyle = pal.labelBg;
                ctx.fill();
                ctx.strokeStyle = isSelected ? pal.labelBorderSelected : (isHovered ? pal.labelBorderHover : pal.labelBorder);
                ctx.lineWidth = isSelected ? 1.2 : 0.85;
                ctx.stroke();

                ctx.fillStyle = isSelected ? pal.labelTextColorSelected : pal.labelTextColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(w.word, x, labelY - fontSize / 2 + 1);

                if (isHovered || isSelected) {
                    ctx.font = '400 9px ' + FONT;
                    ctx.fillStyle = pal.phoneticColor;
                    ctx.fillText((w.pos || '') + ' ' + (w.phonetic || ''), x, labelY + fontSize + 2);
                }
            }

            ctx.restore();
        }
    }

    // 命中检测（考虑平移、缩放与摇曳后的渲染坐标）
    function nodeAtPoint(screenX, screenY) {
        var tr = state.transform;
        var wx = (screenX - tr.x) / tr.k;
        var wy = (screenY - tr.y) / tr.k;
        var nodes = state.nodes;
        for (var i = nodes.length - 1; i >= 0; i--) {
            var n = nodes[i];
            var nx = n.renderX !== undefined ? n.renderX : n.x;
            var ny = n.renderY !== undefined ? n.renderY : n.y;
            var dx = wx - nx, dy = wy - ny;
            var hit = n.radius + 7;
            if (dx * dx + dy * dy <= hit * hit) return n;
        }
        return null;
    }

    // 命中飘动种子。种子本体只有几个世界单位、缩得小远小于节点，故按屏幕像素判定：
    // 以种子在屏幕上的位置为心、至少 16px 半径，够手指与鼠标点中；重叠时取最近的一颗。
    // 只认带词的种子（装饰性种子不是真的词，拖它没有语义）
    function seedAtPoint(screenX, screenY) {
        var list = state.meadow ? state.meadow.seeds : [];
        var tr = state.transform;
        var best = null;
        var bestD = Infinity;
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            if (!s.word) continue;
            var sx = tr.x + s.x * tr.k;
            var sy = tr.y + s.y * tr.k;
            var dx = screenX - sx;
            var dy = screenY - sy;
            var d = dx * dx + dy * dy;
            var r = Math.max(16, 30 * tr.k);
            if (d <= r * r && d < bestD) { bestD = d; best = s; }
        }
        return best;
    }

    // 指针是否落在花头范围内：落点用世界坐标判定，故缩放平移都不影响手感。
    // 半径取花冠外圈（花头里放节点的那片区域），拽到花朵上松手才算"归位"
    function insideHead(p) {
        if (!p) return false;
        var tr = state.transform;
        var r = state.headRadius || (380 * gravityScale() + 25) * layoutScale();
        var dx = (p.x - tr.x) / tr.k - state.headX;
        var dy = (p.y - tr.y) / tr.k - state.headY;
        return dx * dx + dy * dy <= r * r;
    }

    /* ---------------- 拖拽：花头 ↔ 空中，改写忘记词的归位（并收藏/取消收藏） ----------------
       两个方向共用的约定：
         · 会话级覆盖写在 state.forcedOut / forcedIn，不进配置，刷新即恢复口径结果；
         · 收藏本身走 Storage 落盘，长期有效；
         · 节点的增删立即生效（不整场重建），拖完就能看到结果，也不会把已摆好的阵型打散。
       注意 MAX_FLOAT_SEEDS 仍是空中种子的总上限，手工拽出很多个时超出部分会在
       下次重建时被截断（收藏记录不受影响） */

    // 花头里的词被拖到花头外松手：摘出花头、转为飘散种子，并标记收藏
    function dropNodeToSeed(node, p) {
        var w = node.word;
        if (!w) return;
        var key = wordKey(w);
        var tr = state.transform;

        var ni = state.nodes.indexOf(node);
        if (ni >= 0) state.nodes.splice(ni, 1);
        for (var i = state.words.length - 1; i >= 0; i--) {
            if (wordKey(state.words[i]) === key) state.words.splice(i, 1);
        }
        if (state.selectedWord === w) hideCard();

        state.forcedOut[key] = true;
        delete state.forcedIn[key];
        state.forgotten.push(w);
        state.floatWords.push(w);

        // 就地生成种子：位置即松手处，速度沿用自动种子的量级，松手后自然随风起漂
        var hash = Math.abs(hashWord(w.word));
        state.meadow.seeds.push({
            x: (p.x - tr.x) / tr.k,
            y: (p.y - tr.y) / tr.k,
            vx: 0.20 + (hash % 4) * 0.04,
            vy: -0.04 + ((hash % 3) * 0.03),
            scale: 0.85 + (w.frequency / 250),
            rotation: (hash % 360) * (Math.PI / 180),
            rotSpeed: (hash % 2 === 0 ? 1 : -1) * 0.003,
            phase: (hash % 10) * 0.6,
            word: w
        });
        setFavorite(w, true);
        notify('⭐ 已收藏，' + w.word + ' 随风飘走', 'success');
    }

    // 空中的种子被拖回花头内松手：归位成节点，并取消收藏
    function dropSeedToNode(seed) {
        var w = seed.word;
        if (!w) return;
        var key = wordKey(w);

        var si = state.meadow.seeds.indexOf(seed);
        if (si >= 0) state.meadow.seeds.splice(si, 1);
        [state.floatWords, state.forgotten].forEach(function (arr) {
            for (var i = arr.length - 1; i >= 0; i--) {
                if (wordKey(arr[i]) === key) arr.splice(i, 1);
            }
        });
        state.forcedIn[key] = true;
        delete state.forcedOut[key];

        // 该词可能本就被别的口径摆在空中（未在花头），已在则只改归位、不重复补点
        var exists = state.nodes.some(function (n) { return wordKey(n.word) === key; });
        if (!exists) {
            var node = makeNode(w, 'm' + (state.nodeSeq++), null);
            // 落在松手处（世界坐标 → 花头局部坐标），让力导向把它收进阵型，
            // 而不是在花心突然冒出来
            node.x = seed.x - state.headX;
            node.y = seed.y - state.headY;
            state.nodes.push(node);
            state.words.push(w);
            // 给一点温度把新点推进阵型；已有扰动时不打扰
            if (state.sim.alpha < 0.35) state.sim.alpha = 0.35;
        }
        setFavorite(w, false);
        notify('✓ ' + w.word + ' 已回到蒲公英，标记为熟悉', 'info');
    }

    // 拖拽种子经过花头时，在花冠范围描一圈虚线环：示意"松手即可归位"
    function drawDropHint(ctx) {
        if (!state.dragSeed || !state.headRadius || !insideHead(state.dragPointer)) return;
        var t = theme();
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(state.headX, state.headY);
        ctx.beginPath();
        ctx.arc(0, 0, state.headRadius, 0, TAU);
        ctx.setLineDash([12, 9]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = t.seed.high;
        ctx.stroke();
        ctx.restore();
    }

    /* ========================================================
       词卡（点击种子附近弹出，样式与单词星云/混沌星云共用）
       ======================================================== */
    function openCard(node) {
        if (!node) return;
        state.cardNode = node;
        state.selectedWord = node.word;
        renderCard(node);
        var card = document.getElementById('dandelionCard');
        if (card) {
            card.classList.remove('hidden');
            positionCard(node);
        }
        if (state.cardTimer) clearTimeout(state.cardTimer);
        state.cardTimer = setTimeout(hideCard, 60000);
    }

    function hideCard() {
        state.cardNode = null;
        state.selectedWord = null;
        if (state.cardTimer) {
            clearTimeout(state.cardTimer);
            state.cardTimer = null;
        }
        var card = document.getElementById('dandelionCard');
        if (card) card.classList.add('hidden');
    }

    // 词卡跟随种子（采用微风摇曳后的渲染坐标，摇曳时紧随不放）
    function followCard() {
        if (!state.cardNode) return;
        positionCard(state.cardNode);
    }

    function positionCard(node) {
        var card = document.getElementById('dandelionCard');
        var root = coverEl();
        if (!card || !root || !node) return;
        var tr = state.transform;
        var nx = node.renderX !== undefined ? node.renderX : node.x;
        var ny = node.renderY !== undefined ? node.renderY : node.y;
        var sx = tr.x + nx * tr.k;
        var sy = tr.y + ny * tr.k;
        var cw = root.clientWidth;
        var ch = root.clientHeight;
        var w = card.offsetWidth || 220;
        var h = card.offsetHeight || 120;
        var gap = node.radius * tr.k + 16;
        // 默认放在种子右侧；右侧放不下则翻到左侧，仍放不下则贴边
        var left = sx + gap;
        if (left + w > cw - 8) left = sx - gap - w;
        if (left < 8) left = 8;
        if (left + w > cw - 8) left = Math.max(8, cw - w - 8);
        var top = sy - h / 2;
        if (top + h > ch - 8) top = ch - h - 8;
        if (top < 8) top = 8;
        card.style.left = left.toFixed(0) + 'px';
        card.style.top = top.toFixed(0) + 'px';
    }

    function renderCard(node) {
        var w = node.word || {};
        var card = document.getElementById('dandelionCard');
        // 词卡主色跟随所属聚类色，与种子配色一致
        if (card) {
            var cluster = state.clusters.find(function (c) { return c.name === w.cluster; });
            card.style.setProperty('--nebula-accent', cluster ? cluster.baseColor : '#1d5c52');
        }

        var wordBtn = document.getElementById('dandelionCardWord');
        if (wordBtn) {
            wordBtn.textContent = w.word || '';
            wordBtn.onclick = function (ev) {
                if (ev && ev.stopPropagation) ev.stopPropagation();
                if (global.openDictLookupWord) global.openDictLookupWord(w.word || '');
            };
        }
        // 音标/释义兜底：词单缺项时从基础词典补全（与单词星云一致）
        var phonetic = w.phonetic || '';
        var meaning = w.meaning || '';
        if ((!phonetic || !meaning) && global.ENGLISHWORDS_DICT) {
            var entry = global.ENGLISHWORDS_DICT[String(w.word || '').toLowerCase()];
            if (Array.isArray(entry)) {
                if (!phonetic) phonetic = entry[0] || '';
                if (!meaning) meaning = entry[1] || '';
            }
        }
        setText('dandelionCardPhonetic', phonetic);

        var lvlEl = document.getElementById('dandelionCardLevel');
        if (lvlEl) {
            var lv = levelOf(w.word);
            if (lv) {
                var lvColor = CEFR_LEVEL_COLORS[lv] || '#99a7ff';
                lvlEl.textContent = lv;
                lvlEl.style.color = lvColor;
                lvlEl.style.borderColor = lvColor;
                lvlEl.style.display = '';
            } else {
                lvlEl.textContent = '';
                lvlEl.style.display = 'none';
            }
        }

        setText('dandelionCardMean', meaning || '暂无释义');
        setText('dandelionCardCluster', '语义聚类：' + (w.cluster || UNCLASSIFIED));

        var stars = '';
        for (var s = 0; s < 5; s++) stars += (s < w.proficiency ? '★' : '☆');
        var meta = [];
        if (w.pos) meta.push(w.pos);
        meta.push('词频 ★' + w.frequency);
        meta.push(stars);
        meta.push(w.total > 0 ? ('错误率 ' + w.errorRate + '%') : '尚未练习');
        setText('dandelionCardSource', meta.join(' · '));

        var favBtn = document.getElementById('dandelionCardFav');
        if (favBtn) {
            favBtn.classList.toggle('favorited', isFavorite(w.word));
            favBtn.onclick = function (ev) {
                if (ev && ev.stopPropagation) ev.stopPropagation();
                toggleCardFav(node);
            };
        }
        var speakBtn = document.getElementById('dandelionCardSpeak');
        if (speakBtn) {
            speakBtn.onclick = function (ev) {
                if (ev && ev.stopPropagation) ev.stopPropagation();
                speakCard(w.word || '', speakBtn);
            };
        }
    }

    function speakCard(word, btn) {
        if (!word) return;
        var cb = null;
        if (btn && btn.classList) {
            cb = {
                onReady: function () {
                    btn.classList.remove('loading');
                    btn.classList.add('speaking');
                },
                onEnd: function () { btn.classList.remove('speaking'); },
                onError: function () {
                    btn.classList.remove('loading');
                    btn.classList.remove('speaking');
                }
            };
            btn.classList.add('loading');
        }
        if (global.app && typeof global.app.speak === 'function') {
            global.app.speak(word, cb);
        } else if (btn) {
            btn.classList.remove('loading');
        }
    }

    function isFavorite(word) {
        var lower = wordKey(word);
        // 首选为自建收藏词单时，收藏态以该词单为准
        if (global.app && typeof global.app.getFavoriteTargetList === 'function' && global.app.getFavoriteTargetList()) {
            return !!global.app.isFavoriteInTarget(lower);
        }
        return (Storage.loadFavoriteItems() || []).some(function (f) {
            return wordKey(f) === lower;
        });
    }

    // 统一的收藏写入：按词形去重，on 为 true 表示收藏、false 表示取消。
    // 词卡按钮与拖拽（拽出=收藏 / 拽回=取消）共用，保证两条路径口径一致
    function setFavorite(w, on) {
        var key = wordKey(w);
        if (!key) return;
        // 首选为自建收藏词单时，收藏写入该词单（并静默同步到已链接的欧路生词本）
        if (global.app && typeof global.app.getFavoriteTargetList === 'function' && global.app.getFavoriteTargetList()) {
            global.app.setFavoriteInTarget({
                word: w.word,
                phonetic: w.phonetic || '',
                definitions: [{ meaning: w.meaning || '', example: '' }]
            }, on);
            if (typeof global.app.renderBookList === 'function') global.app.renderBookList();
            return;
        }
        var favs = Storage.loadFavoriteItems() || [];
        var idx = -1;
        for (var i = 0; i < favs.length; i++) {
            if (wordKey(favs[i]) === key) { idx = i; break; }
        }
        if (on) {
            if (idx >= 0) return;
            favs.push({
                word: w.word,
                phonetic: w.phonetic || '',
                definitions: [{ meaning: w.meaning || '', example: '' }],
                createdAt: new Date().toISOString()
            });
        } else {
            if (idx < 0) return;
            favs.splice(idx, 1);
        }
        Storage.saveFavoriteItems(favs);
        // 收藏表是各封面与词书列表的公共数据源，改完要让它们刷新
        if (global.app && typeof global.app.scheduleEudicSync === 'function') global.app.scheduleEudicSync();
        if (global.app && typeof global.app.renderBookList === 'function') global.app.renderBookList();
    }

    function notify(msg, type) {
        if (global.app && typeof global.app.showToast === 'function') global.app.showToast(msg, type || 'info');
    }

    function toggleCardFav(node) {
        var w = node.word || {};
        if (!wordKey(w)) return;
        var added = !isFavorite(w.word);
        setFavorite(w, added);
        var favBtn = document.getElementById('dandelionCardFav');
        if (favBtn) favBtn.classList.toggle('favorited', added);
        notify(added ? '⭐ 已收藏' : '已取消收藏', added ? 'success' : 'info');
    }

    /* ========================================================
       交互：平移 / 缩放 / 拖拽节点 / 悬停
       ======================================================== */
    function pointerPos(e) {
        var rect = state.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    // ---- 双指手势（触屏）----
    function pointerCount() { return Object.keys(state.pointers).length; }

    // 取当前两根手指的间距与中点（画布坐标，与 transform 同一坐标系）
    function pinchSnapshot() {
        var ids = Object.keys(state.pointers);
        if (ids.length < 2) return { valid: false, dist: 0, midX: 0, midY: 0 };
        var a = state.pointers[ids[0]];
        var b = state.pointers[ids[1]];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return {
            valid: true,
            dist: Math.sqrt(dx * dx + dy * dy),
            midX: (a.x + b.x) / 2,
            midY: (a.y + b.y) / 2
        };
    }

    // 两指间距变化 → 以两指中点为锚缩放；中点移动 → 平移
    function applyPinch() {
        var cur = pinchSnapshot();
        var prev = state.pinch;
        if (!cur.valid || !prev || !prev.valid) return;
        var tr = state.transform;
        if (prev.dist > 0 && cur.dist > 0) {
            var k = Math.min(3.5, Math.max(0.3, tr.k * (cur.dist / prev.dist)));
            var r = k / tr.k;
            // 锚点取「上一帧的两指中点」：缩放这一步只负责比例，中点的位移在下面
            // 统一平移。两步合起来恰好等价于"旧中点下的世界点跟到新中点"，
            // 若这里改用当前中点，位移会被算两遍，手指移动距离会翻倍
            tr.x = prev.midX - (prev.midX - tr.x) * r;
            tr.y = prev.midY - (prev.midY - tr.y) * r;
            tr.k = k;
        }
        tr.x += cur.midX - prev.midX;
        tr.y += cur.midY - prev.midY;
        state.viewTouched = true;
        state.pinch = cur;
    }

    // 抬起/离开时把该指移出手势表；不足两指即结束手势，
    // 否则剩下的单指会带着陈旧的 pinch 基准继续缩放
    function forgetPointer(e) {
        delete state.pointers[e.pointerId];
        if (pointerCount() < 2) state.pinch = null;
        // 手势后还剩一指：以它为新起点接着单指平移，手指不必抬起重按
        var ids = Object.keys(state.pointers);
        if (ids.length === 1) {
            var rect = state.canvas.getBoundingClientRect();
            var p = state.pointers[ids[0]];
            state.dragStart = null;
            state.panning = true;
            state.panStart = { x: p.x + rect.left, y: p.y + rect.top, tx: state.transform.x, ty: state.transform.y };
        }
    }

    // 命中外圈分类标签（坐标为画布 CSS 像素，与渲染时记录的一致）
    function badgeAtPoint(screenX, screenY) {
        var list = state.badgeHit || [];
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            if (Math.abs(screenX - r.cx) <= r.w / 2 && Math.abs(screenY - r.cy) <= r.h / 2) return r;
        }
        return null;
    }

    function onPointerDown(e) {
        var p = pointerPos(e);
        // 第二根手指落下：转入手势模式。先把单指动作就地收尾（allowDrop=false，
        // 否则拖拽中的种子/节点会当场掉落），再记录手势初值
        if (pointerCount() + 1 >= 2) {
            if (state.dragSeed || state.dragNode) onPointerUp(e, false);
            state.panning = false;
            state.pointers[e.pointerId] = p;
            state.pinch = pinchSnapshot();
            return;
        }
        state.pointers[e.pointerId] = p;
        // 分类标签优先于词节点：命中则锁定该聚类（再次点同一标签取消）
        var badge = badgeAtPoint(p.x, p.y);
        if (badge) {
            state.pinnedCluster = state.pinnedCluster === badge.name ? '' : badge.name;
            hideCard();
            state.hoveredWord = null;
            state.hoveredBadge = '';
            return;
        }
        state.dragStart = { x: e.clientX, y: e.clientY };
        state.dragPointer = p;
        state.dragMoved = false;
        // 飘动种子先于花头节点判定：种子更小更难命中，且它一定在花头之外，
        // 两者不会重叠，先测种子不会抢走节点的点击
        var seed = seedAtPoint(p.x, p.y);
        if (seed) {
            state.pinnedCluster = '';
            hideCard();
            state.hoveredWord = null;
            state.dragSeed = seed;
            seed.dragging = true;
            state.canvas.style.cursor = 'grabbing';
            if (state.canvas.setPointerCapture) {
                try { state.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
            }
            return;
        }
        var hit = nodeAtPoint(p.x, p.y);
        if (hit) {
            // 点词即切到该词所属聚类，撤销标签锁定以免两者冲突
            state.pinnedCluster = '';
            state.dragNode = hit;
            // 钉在「当前渲染位置」而非 sim 位置：渲染位置含风力偏移，
            // 从它起拖才不会在按下的一瞬先弹回无风位置
            var hx = hit.renderX !== undefined ? hit.renderX : hit.x;
            var hy = hit.renderY !== undefined ? hit.renderY : hit.y;
            hit.fx = hx;
            hit.fy = hy;
            // 记下抓取点与节点中心的偏移，拖动全程保持它：
            // 否则节点会在第一次移动时"吸附"到指针正下方，跳一下才开始跟手
            var trg = state.transform;
            state.dragGrab = {
                dx: (p.x - trg.x) / trg.k - hx,
                dy: (p.y - trg.y) / trg.k - hy
            };
            // 拖拽期间不加热力导向：以前把 alpha 顶在 0.3，整朵花冠会持续互相
            // 排斥、所有词一起挪动，手感就像被"吸"着乱晃。这里只把目标温度归零，
            // 让力导向自然冷却（若上一轮收敛还没结束，就让它平静地跑完）。
            // 被拖节点的跟手不依赖力导向积分：onPointerMove 会直接写它的 x/y
            state.sim.alphaTarget = 0;
            openCard(hit);
        } else {
            // 点击空白处：收起词卡并解除标签锁定
            state.pinnedCluster = '';
            hideCard();
            state.panning = true;
            state.panStart = { x: e.clientX, y: e.clientY, tx: state.transform.x, ty: state.transform.y };
        }
        if (state.canvas.setPointerCapture) {
            try { state.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
        }
    }

    // 是否已把指针拖出足够距离：用来区分「点一下打开词卡」与「真的在拖拽」
    function dragDistanceExceeded(e) {
        if (!state.dragStart) return false;
        var dx = e.clientX - state.dragStart.x;
        var dy = e.clientY - state.dragStart.y;
        return dx * dx + dy * dy > 16;   // 4px 阈值，避开手抖
    }

    function onPointerMove(e) {
        var p = pointerPos(e);
        if (state.pointers[e.pointerId]) state.pointers[e.pointerId] = p;
        // 双指手势优先：缩放/平移由两指的间距与中点决定，不走单指分支
        if (state.pinch && pointerCount() >= 2) {
            applyPinch();
            return;
        }
        if (state.dragSeed) {
            state.dragPointer = p;
            if (!state.dragMoved) state.dragMoved = dragDistanceExceeded(e);
            var tr0 = state.transform;
            var ds = state.dragSeed;
            ds.x = (p.x - tr0.x) / tr0.k;
            ds.y = (p.y - tr0.y) / tr0.k;
            return;
        }
        if (state.dragNode) {
            if (!state.dragMoved) state.dragMoved = dragDistanceExceeded(e);
            state.dragPointer = p;
            var tr = state.transform;
            var node = state.dragNode;
            var grab = state.dragGrab || { dx: 0, dy: 0 };
            // 直接钉到指针位置（保留按下时的抓取偏移）。该节点在渲染时已排除风力摇曳，
            // 指针的世界坐标就是它的落点，不必再像以前那样补偿渲染偏移 ——
            // 补偿值逐帧随风力变化，正是拖动手感发飘的来源
            node.fx = (p.x - tr.x) / tr.k - grab.dx;
            node.fy = (p.y - tr.y) / tr.k - grab.dy;
            // 同时直接写 x/y：拖拽期间力导向是冷却的（不跑积分），
            // 靠这里赋值才能保证每一帧都精确跟手
            node.x = node.fx;
            node.y = node.fy;
            return;
        }
        if (state.panning) {
            state.transform.x = state.panStart.tx + (e.clientX - state.panStart.x);
            state.transform.y = state.panStart.ty + (e.clientY - state.panStart.y);
            state.viewTouched = true;
            return;
        }
        var hit = nodeAtPoint(p.x, p.y);
        var next = hit ? hit.word : null;
        if (state.hoveredWord !== next) {
            state.hoveredWord = next;
            state.canvas.style.cursor = next ? 'pointer' : 'grab';
        }
        // 悬停分类标签时给出可点击提示，并让该标签呈现与选中一致的强调
        var badge = badgeAtPoint(p.x, p.y);
        var badgeName = badge ? badge.name : '';
        if (state.hoveredBadge !== badgeName) {
            state.hoveredBadge = badgeName;
            if (!next) state.canvas.style.cursor = badgeName ? 'pointer' : 'grab';
        }
    }

    // allowDrop：只有真正的 pointerup 才判定落点；pointerleave 只做收尾，
    // 避免指针滑出画布时误把词转成种子
    function onPointerUp(e, allowDrop) {
        if (state.dragSeed) {
            var seed = state.dragSeed;
            seed.dragging = false;
            state.dragSeed = null;
            // 拖进花头范围松手 → 归位为花头里的词，并取消收藏
            if (allowDrop && state.dragMoved && insideHead(state.dragPointer)) dropSeedToNode(seed);
        }
        if (state.dragNode) {
            var node = state.dragNode;
            node.fx = null;
            node.fy = null;
            state.dragNode = null;
            state.sim.alphaTarget = 0;
            // 松手给一次收敛脉冲：被拖走的词停在松手处，需要弹簧把它收回自己的
            // 位置，并把腾出的空位填好，随后自然冷却回静止。
            // 只按不拖（原地点击看词卡）不打扰已经静止的阵型
            if (state.dragMoved) state.sim.alpha = Math.max(state.sim.alpha, 0.4);
            // 拖到花头之外松手 → 收藏该词并让它飘走
            if (allowDrop && state.dragMoved && !insideHead(state.dragPointer)) dropNodeToSeed(node, state.dragPointer);
        }
        state.panning = false;
        state.dragStart = null;
        state.dragGrab = null;
        state.dragPointer = null;
        state.dragMoved = false;
        if (state.canvas) state.canvas.style.cursor = 'grab';
    }

    function onWheel(e) {
        e.preventDefault();
        var p = pointerPos(e);
        var tr = state.transform;
        var factor = e.deltaY < 0 ? 1.12 : 0.89;
        var k = Math.min(3.5, Math.max(0.3, tr.k * factor));
        tr.x = p.x - (p.x - tr.x) * (k / tr.k);
        tr.y = p.y - (p.y - tr.y) * (k / tr.k);
        tr.k = k;
        state.viewTouched = true;
    }

    function zoomBy(factor) {
        var tr = state.transform;
        var cx = state.width / 2;
        var cy = state.height / 2;
        var k = Math.min(3.5, Math.max(0.3, tr.k * factor));
        tr.x = cx - (cx - tr.x) * (k / tr.k);
        tr.y = cy - (cy - tr.y) * (k / tr.k);
        tr.k = k;
        state.viewTouched = true;
    }

    function resetView() {
        state.viewTouched = false;
        state.pinnedCluster = '';
        hideCard();
        computeTransform();
        if (state.sim.alpha < 0.3) state.sim.alpha = 0.3;
    }

    function bindPointer() {
        var canvas = state.canvas;
        if (!canvas || canvas._dandelionBound) return;
        canvas._dandelionBound = true;
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        // 松手才判定拖拽落点；指针滑出画布只做收尾（见 onPointerUp 的 allowDrop）。
        // 顺序不能反：onPointerUp 会把 panning 归零，forgetPointer 再按"还剩一指"
        // 重新起头，双指手势后剩下的那根手指才能接着平移
        canvas.addEventListener('pointerup', function (e) { onPointerUp(e, true); forgetPointer(e); });
        canvas.addEventListener('pointercancel', function (e) { onPointerUp(e, false); forgetPointer(e); });
        canvas.addEventListener('pointerleave', function (e) { onPointerUp(e, false); forgetPointer(e); });
        canvas.addEventListener('wheel', onWheel, { passive: false });
    }

    /* ========================================================
       画布尺寸与视角
       ======================================================== */
    function computeTransform() {
        var w = state.width;
        var h = state.height;
        if (!w || !h) return;
        // 适屏缩放依赖茎长（词量），统一在此重算，避免沿用旧词量下的取景比例
        state.fitZoom = computeFitZoom(w, h);
        var k = state.fitZoom;
        // 以内容（花冠+茎+地面）的纵向中心对齐视口中心，茎加长后自动重新居中
        var b = contentBounds();
        state.transform.x = w * 0.5 - ROOT_X * k;
        state.transform.y = h * 0.5 - b.center * k;
        state.transform.k = k;
    }

    // 渲染质量自适应：以 60fps 为基准，持续掉帧时降低渲染分辨率与细节密度，
    // 恢复流畅后再逐级升回，避免高 DPI / 弱 GPU 下卡顿
    var perf = { last: 0, slow: 0, fast: 0, factor: 1, lowDetail: false };

    function resizeCanvas() {
        var el = coverEl();
        if (!el) return;
        var w = el.clientWidth;
        var h = el.clientHeight;
        if (!w || !h) return;
        // 像素比上限 2：4K/Retina 下按原始 DPR 渲染会使填充开销成倍增长
        var dpr = Math.max(1, Math.min(global.devicePixelRatio || 1, 2) * perf.factor);
        state.width = w;
        state.height = h;
        // 适屏缩放：整朵蒲公英（含茎与花冠）刚好铺满屏幕的比例，
        // 既是默认视角也是外圈渐隐阈值的参照；茎随词量加长后该比例自动变小
        state.fitZoom = computeFitZoom(w, h);
        state.dpr = dpr;
        var canvas = state.canvas;
        if (!canvas) return;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        if (!state.viewTouched) computeTransform();
    }

    // 依据帧间隔动态调节渲染质量：连续掉帧降档，长时间流畅再升档
    function adaptQuality() {
        var now = performance.now();
        var dt = now - perf.last;
        perf.last = now;
        if (dt <= 0 || dt > 200) return;    // 首帧与长时间挂起（切后台）不计入

        if (dt > 26) { perf.slow++; perf.fast = 0; }
        else if (dt < 17) { perf.fast++; perf.slow = 0; }
        else { perf.slow = 0; perf.fast = 0; }

        var f = perf.factor;
        if (perf.slow >= 45 && f > 0.5) {
            f = f > 0.75 ? 0.75 : 0.5;
            perf.slow = 0;
        } else if (perf.fast >= 240 && f < 1) {
            f = f < 0.75 ? 0.75 : 1;
            perf.fast = 0;
        }
        if (f !== perf.factor) {
            perf.factor = f;
            perf.lowDetail = f <= 0.75;
            resizeCanvas();
        }
    }

    /* ========================================================
       主渲染循环
       ======================================================== */
    function render() {
        var canvas = state.canvas;
        var ctx = state.ctx;
        if (!canvas || !ctx) return;
        // 离开欢迎页（容器不可见）时跳过绘制，仅保留轻量的帧调度
        if (!coverVisible()) return;
        adaptQuality();
        var t = theme();
        var w = state.width;
        var h = state.height;

        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, w, h);

        // 时间与宏观自然风（风向由滑块符号决定，阵风与间歇性静风调制风力大小）
        var time = performance.now() * 0.001;
        // 滑块：0 为无风，负值向左吹、正值向右吹；取绝对值作为风力幅度
        var breeze = Math.abs(state.breezeActive ? state.breeze : 0);
        var windSign = state.breeze < 0 ? -1 : 1;
        var breath = 0.55 + 0.35 * Math.sin(time * 0.28) + 0.15 * Math.cos(time * 0.62 + 0.4);
        var lull = Math.max(0, Math.sin(time * 0.09) * 0.8 + 0.2);
        var gust = Math.pow(Math.max(0, Math.sin(time * 0.18 - 0.3)), 2.5) * 0.85;
        var windMag = Math.max(0, breath * lull + gust) * breeze;
        var wind = windSign * windMag;

        // 悬臂梁挠度：根部固定，花头随位移与倾角整体刚性偏转。
        // 茎加长后花头整体上抬（根部坐标不变），并按加长后的有效茎长计算挠度与倾角
        var lift = stemLift();
        var stemLen = STEM_LEN * stemScale();
        var headSwayX = wind * 58;
        var headSwayY = -lift + (headSwayX * headSwayX) / (2 * stemLen) + Math.abs(wind) * 3.5;
        var headAngle = Math.atan2(headSwayX * 1.45, stemLen);
        var cosA = Math.cos(headAngle);
        var sinA = Math.sin(headAngle);
        // 花头中心的世界坐标：花托/同心圈都是以它为中心画的，拖拽落点判定要用
        state.headX = headSwayX;
        state.headY = headSwayY;

        // 逐节点叠加刚性偏转 + 弹性微颤（越靠外越柔）
        var nodes = state.nodes;
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            var bx = n.x || 0;
            var by = n.y || 0;
            if (breeze === 0) { n.renderX = bx; n.renderY = by; continue; }

            // 拖拽中的节点直接钉在指针落点，不参与后续的风力摇曳与弹性微颤。
            // 它已被 fx 钉在指针处，若这里再叠加逐帧变化的风力偏移，渲染坐标每帧
            // 都会从指针偏开一点再被下一帧拉回 —— 手势上就是"发飘、乱晃、像被吸附"
            if (n === state.dragNode) { n.renderX = bx; n.renderY = by; continue; }

            var rigidX = headSwayX + (bx * cosA - by * sinA);
            var rigidY = headSwayY + (bx * sinA + by * cosA);

            var dist = Math.sqrt(bx * bx + by * by);
            var flex = Math.pow(Math.min(1.6, dist / 240), 1.25);
            var lag = dist * 0.0028;
            var dt2 = time - lag;
            var dBreath = 0.55 + 0.35 * Math.sin(dt2 * 0.28) + 0.15 * Math.cos(dt2 * 0.62 + 0.4);
            var dLull = Math.max(0, Math.sin(dt2 * 0.09) * 0.8 + 0.2);
            var dGust = Math.pow(Math.max(0, Math.sin(dt2 * 0.18 - 0.3)), 2.5) * 0.85;
            var dWind = windSign * Math.max(0, dBreath * dLull + dGust) * breeze;

            var hash = Math.abs(hashWord(n.word.word));
            var fFx = 1.8 + ((hash % 10) / 10) * 0.8;
            var fFy = 1.4 + (((hash >> 3) % 10) / 10) * 0.9;
            var fPx = ((hash >> 5) % 100) / 100 * TAU;
            var fPy = ((hash >> 9) % 100) / 100 * TAU;
            var amp = (dist / 240) * breeze * Math.pow(Math.min(1.5, Math.abs(wind)), 1.2);

            n.renderX = rigidX + (Math.sin(time * fFx + fPx) * 4.2 + Math.sin(time * fFx * 2.1 + fPx) * 1.8) * amp + (dWind - wind) * 12 * flex;
            n.renderY = rigidY + (Math.cos(time * fFy + fPy) * 3.2 + Math.sin(time * fFy * 1.8 + fPy) * 1.4) * amp;
        }

        stepSimulation();

        var tr = state.transform;
        ctx.save();
        ctx.translate(tr.x, tr.y);
        ctx.scale(tr.k, tr.k);

        drawRollingMeadow(ctx);
        drawTufts(ctx, false, wind, breeze, time);
        drawFlora(ctx, wind, breeze, time);
        drawRosette(ctx, 'back', wind, breeze, time);
        drawStem(ctx, headSwayX, headSwayY, headAngle);
        drawRosette(ctx, 'front', wind, breeze, time);
        // 前景草丛（覆盖在茎基部之前，与背景草丛分两趟以保证层次）
        drawTufts(ctx, true, wind, breeze, time);
        drawFloatingSeeds(ctx, wind, breeze, time);
        drawCalyx(ctx, headSwayX, headSwayY, headAngle);
        drawReceptacle(ctx, headSwayX, headSwayY, headAngle, tr.k);
        drawFilaments(ctx, headSwayX, headSwayY);
        // 落点提示环画在花头与节点之间：既盖住同心圈，又不遮挡词的标签
        drawDropHint(ctx);
        drawNodes(ctx, tr.k);

        ctx.restore();

        // 词卡跟随被点击的种子（世界坐标 → 屏幕坐标，随摇曳实时更新）
        followCard();
    }

    function loop() {
        render();
        state.raf = requestAnimationFrame(loop);
    }

    function start() {
        if (state.raf) return;
        state.raf = requestAnimationFrame(loop);
    }

    function stop() {
        if (state.raf) {
            cancelAnimationFrame(state.raf);
            state.raf = null;
        }
        setLoaderVisible(false);
        hideCard();
        state.hoveredWord = null;
        // 拖拽中途离开封面时收尾，否则被拖的那颗种子会一直停在 dragging、不再随风漂
        if (state.dragSeed) state.dragSeed.dragging = false;
        state.dragSeed = null;
        state.dragNode = null;
        state.dragStart = null;
        state.dragGrab = null;
        state.dragPointer = null;
        state.dragMoved = false;
        state.panning = false;
    }

    /* ========================================================
       加载层
       ======================================================== */
    function setLoaderVisible(v) {
        var el = document.getElementById('dandelionLoader');
        if (!el) return;
        el.classList.toggle('visible', !!v);
    }

    // 输入指纹：词单选择 + 排布 + 词条本身，用于避免无变化的重复重建
    function inputKey(words) {
        var parts = [
            'sel=' + state.selected.join(','),
            'layout=' + state.layout,
            // 忘记词口径决定空中飘散的是哪些词，属可见输出，变了就得重建
            'forget=' + state.forgetMode,
            // 词量影响茎长与花冠尺寸（见 stemScale / layoutScale），
            // 同一份词表因口径不同也会让词数变化，故词数变了就要重建
            'n=' + (state.wordCount || 0)
        ];
        (words || []).forEach(function (w) {
            parts.push(w.word + '|' + w.frequency + '|' + w.proficiency + '|' + w.isHotspot + '|' + w.cluster);
        });
        return parts.join('\u0001');
    }

    // 依据当前配置与词单重建场景（words 为已收集的词条数组）
    function rebuildWith(words) {
        // 节点全部重建，旧词卡引用的节点已失效，先收起
        hideCard();
        state.words = words;
        buildClusters(state.words);
        // 先定取景再建草地：飘散种子的生成范围取自当前视野（见 createMeadowScene），
        // 若沿用上一次的取景就会撒在旧视野里，只能靠回卷"折"回来、分布变乱。
        // contentBounds 只依赖词量推出的茎长与花冠尺寸（state.wordCount 已在
        // collectWords 写入），与聚类、草地无关，故提前调用不会少算
        if (!state.viewTouched) computeTransform();
        // 用已定好的 floatWords 而非整个忘记词候选：节点列表正是照它摘掉了对应词，
        // 两边取同一份数据才能保证同一个词不会既在花头又飘在空中
        state.meadow = createMeadowScene(state.floatWords);
        buildSimulation();
        state.lastBuildKey = inputKey(words);
    }

    function rebuild() {
        rebuildWith(collectWords());
    }

    function runWithLoader(fn) {
        setLoaderVisible(true);
        var txt = document.querySelector('#dandelionLoader .nebula-loader-text');
        if (txt) txt.textContent = '正在生成蒲公英…';
        // 让加载层先绘制一帧，再做同步构建
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                try {
                    fn();
                } catch (e) {
                    if (global.console) console.error('[蒲公英聚类] 构建失败', e);
                }
                setLoaderVisible(false);
                start();
            });
        });
    }

    /* ========================================================
       控制面板
       ======================================================== */
    function setText(id, txt) {
        var el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    // 风向风力显示：0 为无风，负值向左吹、正值向右吹
    function formatBreeze(v) {
        var n = Math.round(v * 100) / 100;
        if (!n) return '0 · 无风';
        return (n < 0 ? '← ' : '→ ') + Math.abs(n);
    }

    function bindRange(id, apply, fmt) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function () {
            var v = parseFloat(el.value);
            setText(id + 'Value', fmt(v));
            apply(v);
        });
        el.addEventListener('change', function () { saveConfig(); });
    }

    /* ---------------- 色调选择（移植自源项目 SettingsModal） ---------------- */

    // 实时预览用的种子样例（与源项目一致）
    var PREVIEW_SAMPLES = [
        { label: '重点高频', word: 'ephemeral', key: 'hotspot', radius: 9 },
        { label: '高频大圈', word: 'resilient', key: 'high', radius: 8 },
        { label: '中频中圈', word: 'lucid', key: 'medium', radius: 7 },
        { label: '低频小圈', word: 'petrichor', key: 'low', radius: 6 }
    ];

    // 取色片（4 个圆点）作为色板缩略
    function paletteDots(cfg) {
        var wrap = document.createElement('span');
        wrap.className = 'dandelion-palette-dots';
        ['hotspot', 'high', 'medium', 'low'].forEach(function (k) {
            var dot = document.createElement('i');
            dot.style.background = cfg[k];
            wrap.appendChild(dot);
        });
        return wrap;
    }

    function renderPalette() {
        var row = document.getElementById('dandelionPaletteRow');
        if (!row) return;
        var cfg = effectiveColorConfig();
        var dark = isDarkMode();
        var active = activePalette();
        var auto = isAutoPalette();

        // 色板列表：2 套预设（每套按当前深浅主题取色）
        row.innerHTML = '';
        PRESET_THEMES.forEach(function (p, i) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'dandelion-palette-chip' + (active === i ? ' is-active' : '');
            chip.setAttribute('data-palette', String(i));
            chip.title = p.name + '：' + p.desc + '（自动适配深/浅主题）';
            var name = document.createElement('span');
            name.className = 'dandelion-palette-name';
            name.textContent = p.name;
            chip.appendChild(name);
            chip.appendChild(paletteDots(presetConfig(i, dark)));
            row.appendChild(chip);
        });

        setText('dandelionPaletteName',
            (auto ? '自动 · ' : '') + PRESET_THEMES[active].name);

        // 自定义取色器（正在拖动的那一项不回写，避免打断取色）
        COLOR_FIELDS.forEach(function (f) {
            var el = document.getElementById('dandelionColor_' + f.key);
            if (el && el !== document.activeElement) el.value = cfg[f.key];
        });

        // 实时预览：种子主体 + 中心微孔 + 同色系标签
        var pv = document.getElementById('dandelionPreview');
        if (pv) {
            pv.innerHTML = '';
            PREVIEW_SAMPLES.forEach(function (s) {
                var pal = getDerivedSeedPalette(cfg[s.key], dark);
                var item = document.createElement('div');
                item.className = 'dandelion-preview-item';
                item.title = s.label;

                var seed = document.createElement('span');
                seed.className = 'dandelion-preview-seed';
                seed.style.width = seed.style.height = (s.radius * 2) + 'px';
                seed.style.background = pal.themeColor;
                seed.style.borderColor = pal.darkOutline;
                var pip = document.createElement('i');
                var pipSize = Math.max(3, Math.round(s.radius * 0.4));
                pip.style.width = pip.style.height = pipSize + 'px';
                pip.style.background = pal.centerPipColor;
                seed.appendChild(pip);

                var label = document.createElement('span');
                label.className = 'dandelion-preview-word';
                label.style.background = pal.labelBg;
                label.style.borderColor = pal.labelBorder;
                label.style.color = pal.labelTextColor;
                label.textContent = s.word;

                item.appendChild(seed);
                item.appendChild(label);
                pv.appendChild(item);
            });
        }

        // 图例色点跟随当前配色
        var legHot = document.getElementById('dandelionLegendHot');
        var legHigh = document.getElementById('dandelionLegendHigh');
        var legLow = document.getElementById('dandelionLegendLow');
        if (legHot) legHot.style.background = cfg.hotspot;
        if (legHigh) legHigh.style.background = cfg.high;
        if (legLow) legLow.style.background = cfg.low;
    }

    function bindPalette() {
        var row = document.getElementById('dandelionPaletteRow');
        if (row) {
            row.addEventListener('click', function (e) {
                e.stopPropagation();
                var btn = e.target && e.target.closest ? e.target.closest('[data-palette]') : null;
                if (!btn) return;
                var idx = parseInt(btn.getAttribute('data-palette'), 10);
                if (isNaN(idx)) return;
                // 手动选择只记录在当前深浅主题下
                var k = themeKey();
                state.paletteSel[k] = idx;
                state.paletteCustom[k] = null;
                saveConfig();
                renderPalette();
            });
        }

        COLOR_FIELDS.forEach(function (f) {
            var el = document.getElementById('dandelionColor_' + f.key);
            if (!el) return;
            el.addEventListener('input', function () {
                var cfg = normalizeColorConfig(effectiveColorConfig());
                cfg[f.key] = el.value;
                var k = themeKey();
                state.paletteCustom[k] = cfg;
                state.paletteSel[k] = null;
                saveConfig();
                renderPalette();
            });
        });

        var toggle = document.getElementById('dandelionCustomToggle');
        var panel = document.getElementById('dandelionCustom');
        if (toggle && panel) {
            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                panel.classList.toggle('hidden');
                toggle.classList.toggle('is-on', !panel.classList.contains('hidden'));
            });
        }

        var reset = document.getElementById('dandelionResetColors');
        if (reset) {
            reset.addEventListener('click', function (e) {
                e.stopPropagation();
                // 仅重置当前主题，回到该主题的自动默认色调
                var k = themeKey();
                state.paletteSel[k] = null;
                state.paletteCustom[k] = null;
                saveConfig();
                renderPalette();
            });
        }
    }

    function renderBookOptions() {
        var panel = document.getElementById('dandelionBookSelect');
        var trigger = document.getElementById('dandelionBookTrigger');
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

    function selectBook(id, checked) {
        var idx = state.selected.indexOf(id);
        if (checked && idx === -1) state.selected.push(id);
        else if (!checked && idx !== -1) state.selected.splice(idx, 1);
        saveConfig();
        renderBookOptions();
        if (collectWords().length === 0) {
            hideCard();
            state.nodes = [];
            state.words = [];
            state.clusters = [];
            return;
        }
        runWithLoader(rebuild);
    }

    function applyControlValues() {
        var g = document.getElementById('dandelionGravity');
        if (g) { g.value = state.gravity; setText('dandelionGravityValue', (Math.round(state.gravity * 10) / 10).toString()); }
        var r = document.getElementById('dandelionRepulsion');
        if (r) { r.value = Math.abs(state.repulsion); setText('dandelionRepulsionValue', String(Math.abs(state.repulsion))); }
        var b = document.getElementById('dandelionBreeze');
        if (b) { b.value = state.breeze; setText('dandelionBreezeValue', formatBreeze(state.breeze)); }
        var l = document.getElementById('dandelionLayout');
        if (l) { l.value = state.layout; syncPicker(l); }
        var fm = document.getElementById('dandelionForgetMode');
        if (fm) { fm.value = state.forgetMode; syncPicker(fm); }
        var lb = document.getElementById('dandelionLabelToggle');
        if (lb) lb.checked = state.showClusterLabels;
        var w = document.getElementById('dandelionWindBtn');
        if (w) w.classList.toggle('is-on', state.breezeActive);
        renderPalette();
    }

    function bindControls() {
        if (state.controlsBound) return;
        state.controlsBound = true;
        var wrap = document.getElementById('dandelionControls');
        if (!wrap) return;

        renderBookOptions();

        var trigger = document.getElementById('dandelionBookTrigger');
        var panel = document.getElementById('dandelionBookSelect');
        if (trigger && panel) {
            trigger.addEventListener('click', function (e) {
                e.stopPropagation();
                panel.classList.toggle('hidden');
            });
            panel.addEventListener('click', function (e) { e.stopPropagation(); });
            document.addEventListener('click', function () { panel.classList.add('hidden'); });
        }

        // 折叠 / 展开
        var toggle = document.getElementById('dandelionControlsToggle');
        var header = wrap.querySelector('.nebula-controls-header');
        var onToggle = function (e) {
            e.stopPropagation();
            wrap.classList.toggle('collapsed');
        };
        if (toggle) toggle.addEventListener('click', onToggle);
        if (header) header.addEventListener('click', onToggle);

        // 排布风格：切换后需重建（目标半径层级变化）
        var layoutEl = document.getElementById('dandelionLayout');
        if (layoutEl) {
            layoutEl.addEventListener('change', function () {
                state.layout = layoutEl.value;
                saveConfig();
                runWithLoader(rebuild);
            });
        }

        // 忘记词口径：只改空中飘散种子取自哪些词，重建后即可看出新的复习提示
        var forgetEl = document.getElementById('dandelionForgetMode');
        if (forgetEl) {
            forgetEl.addEventListener('change', function () {
                state.forgetMode = FORGET_MODES.indexOf(forgetEl.value) !== -1 ? forgetEl.value : 'proficiency';
                saveConfig();
                runWithLoader(rebuild);
            });
        }

        // 显示类别名称：只控制外圈徽标是否绘制，每帧生效，无需重建
        var labelToggle = document.getElementById('dandelionLabelToggle');
        if (labelToggle) {
            labelToggle.addEventListener('change', function () {
                state.showClusterLabels = labelToggle.checked;
                // 徽标不再绘制时清掉命中区域，避免点到已经看不见的标签
                if (!state.showClusterLabels) state.badgeHit = null;
                saveConfig();
            });
        }

        bindRange('dandelionGravity', function (v) {
            state.gravity = v;
            // 引力只改变目标半径，实时重建节点目标并重新加热，不重绘草地
            rebuildTargets();
        }, function (v) { return (Math.round(v * 10) / 10).toString(); });

        bindRange('dandelionRepulsion', function (v) {
            state.repulsion = -v;
            if (state.sim.alpha < 0.3) state.sim.alpha = 0.3;
        }, function (v) { return String(Math.round(v)); });

        bindRange('dandelionBreeze', function (v) {
            state.breeze = v;
        }, formatBreeze);

        // 微风开关
        var windBtn = document.getElementById('dandelionWindBtn');
        if (windBtn) {
            windBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                state.breezeActive = !state.breezeActive;
                windBtn.classList.toggle('is-on', state.breezeActive);
                saveConfig();
            });
        }

        // 色调选择
        bindPalette();

        // 缩放与复位
        var zi = document.getElementById('dandelionZoomIn');
        if (zi) zi.addEventListener('click', function (e) { e.stopPropagation(); zoomBy(1.2); });
        var zo = document.getElementById('dandelionZoomOut');
        if (zo) zo.addEventListener('click', function (e) { e.stopPropagation(); zoomBy(0.83); });
        var rv = document.getElementById('dandelionResetView');
        if (rv) rv.addEventListener('click', function (e) { e.stopPropagation(); resetView(); });
    }

    // 引力/熟练度等变化时，只重算目标半径并重新加热模拟（不动草地与词卡）
    function rebuildTargets() {
        var gs = gravityScale();
        state.nodes.forEach(function (n) {
            var w = n.word;
            var hash = Math.abs(hashWord(w.word));
            var distOffset = (hash % 120) - 60;
            var targetDist = (240 + distOffset) * gs;
            if (state.layout === 'proficiency-radial') {
                targetDist = (80 + (6 - w.proficiency) * 45 + (hash % 25)) * gs;
            } else if (state.layout === 'frequency-gravity') {
                targetDist = (75 + (100 - w.frequency) * 2.4 + (hash % 18)) * gs;
            }
            n.targetDistance = Math.max(CORE_R + 6, targetDist);
        });
        if (state.sim.alpha < 0.4) state.sim.alpha = 0.4;
    }

    /* ========================================================
       对外 API
       ======================================================== */
    function apply() {
        var importEl = document.getElementById('coverImport');
        var nebulaEl = document.getElementById('coverNebula');
        var chaosEl = document.getElementById('coverChaos');
        var selfEl = coverEl();
        if (!selfEl) return;

        if (currentCover() !== 'dandelion') {
            selfEl.classList.add('hidden');
            stop();
            return;
        }

        if (importEl) importEl.classList.add('hidden');
        if (nebulaEl) nebulaEl.classList.add('hidden');
        if (chaosEl) chaosEl.classList.add('hidden');
        selfEl.classList.remove('hidden');

        // 恢复缓存配置
        var c = loadConfig();
        if (c) {
            if (Array.isArray(c.selected)) state.selected = c.selected.slice();
            if (typeof c.layout === 'string' && ['dandelion-cluster', 'proficiency-radial', 'frequency-gravity'].indexOf(c.layout) !== -1) {
                state.layout = c.layout;
            }
            if (FORGET_MODES.indexOf(c.forgetMode) !== -1) state.forgetMode = c.forgetMode;
            if (typeof c.showClusterLabels === 'boolean') state.showClusterLabels = c.showClusterLabels;
            if (typeof c.gravity === 'number') state.gravity = c.gravity;
            if (typeof c.repulsion === 'number') state.repulsion = c.repulsion;
            if (typeof c.breeze === 'number') state.breeze = c.breeze;
            if (typeof c.breezeActive === 'boolean') state.breezeActive = c.breezeActive;
            if (typeof c.paletteSel === 'object' && c.paletteSel) {
                ['light', 'dark'].forEach(function (k) {
                    var v = c.paletteSel[k];
                    state.paletteSel[k] = (typeof v === 'number' && v >= 0 && v < PRESET_THEMES.length) ? v : null;
                });
            }
            if (typeof c.paletteCustom === 'object' && c.paletteCustom) {
                ['light', 'dark'].forEach(function (k) {
                    var v = c.paletteCustom[k];
                    state.paletteCustom[k] = (v && typeof v === 'object') ? normalizeColorConfig(v) : null;
                });
            }
        }
        // 新用户/游客兜底：默认展示内置「示例单词」词单
        if (!Array.isArray(state.selected) || !state.selected.length) {
            var demo = ensureDemoBook();
            state.selected = demo ? [String(demo.id)] : [];
        }
        if (collectWords().length === 0) {
            var demo2 = ensureDemoBook();
            if (demo2 && state.selected.indexOf(String(demo2.id)) === -1) state.selected.push(String(demo2.id));
        }

        state.canvas = document.getElementById('dandelionCanvas');
        if (state.canvas) {
            // alpha:false 让画布不参与透明混合（背景每帧全幅填充，无透明需求），
            // 交给 GPU 合成的开销更低
            state.ctx = state.canvas.getContext('2d', { alpha: false });
            if (!state.ctx) state.ctx = state.canvas.getContext('2d');
        }

        bindControls();
        bindThemeObserver();
        bindPointer();
        bindResize();
        applyControlValues();
        renderBookOptions();

        // 等容器可见后再取值尺寸并初始化/重建
        setTimeout(function () {
            if (!coverVisible()) return;
            resizeCanvas();
            var fresh = collectWords();
            if (state.initialized) {
                if (state.lastBuildKey === inputKey(fresh)) {
                    start();
                    return;
                }
                runWithLoader(function () { rebuildWith(fresh); });
            } else {
                runWithLoader(function () {
                    rebuildWith(fresh);
                    state.initialized = true;
                });
            }
        }, 60);
    }

    // 主题切换等场景下的刷新：配色按 data-theme 每帧自动适配，这里仅同步控件
    function refresh(pendingTheme, onDone) {
        if (coverVisible()) applyControlValues();
        if (typeof onDone === 'function') onDone();
    }

    function getState() { return state; }

    function onResize() {
        if (!coverVisible()) return;
        resizeCanvas();
    }

    function bindResize() {
        if (state.resizeBound) return;
        state.resizeBound = true;
        global.addEventListener('resize', onResize);
    }

    // 深浅主题变化时同步控制面板（主题由别处异步写入 data-theme，外部 refresh 可能早于写入）
    function bindThemeObserver() {
        if (state.themeObserved || typeof MutationObserver === 'undefined') return;
        state.themeObserved = true;
        try {
            var mo = new MutationObserver(function () {
                if (coverVisible()) applyControlValues();
            });
            mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        } catch (e) { /* 忽略 */ }
    }

    global.DandelionCover = {
        apply: apply,
        stop: stop,
        refresh: refresh,
        resetView: resetView,
        getState: getState
    };
})(window);