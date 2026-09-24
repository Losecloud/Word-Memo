const { Plugin, ItemView, Notice, addIcon, PluginSettingTab, Setting, setIcon } = require('obsidian');
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const VIEW_TYPE = 'word-memo-view';
// 右侧栏「查单词」视图（复用同一入口页的 dict-lookup 引擎，?wmView=dict 切换为侧栏模式）
const DICT_VIEW_TYPE = 'word-memo-dict-view';
// 封面视窗（?wmView=cover）：只渲染可视化封面，供其它可视化插件内嵌为独立窗口
const COVER_VIEW_TYPE = 'word-memo-cover-view';
// vault 内的入口文件（相对 vault 根目录）。发行版从内嵌包加载，此项仅开发态回退时使用
const ENTRY_FILE = 'index - 词忆.html';
// 内嵌应用包的解压目录（相对 vault 根目录）。以点开头，Obsidian 不索引，保持 vault 根目录整洁
const APP_DIR = '.word-memo';
// 固定端口：localStorage 按 origin（含端口）隔离，端口必须跨会话稳定，否则数据会丢
const DEFAULT_PORT = 39217;
const PORT_TRIES = 10;
// 悬浮取词：鼠标在笔记单词上停留多久后取词（毫秒）
const HOVER_DELAY = 500;
// 悬浮取词的取词节流间隔（毫秒），降低 caretRangeFromPoint 的调用开销
const HOVER_TICK = 80;
// 内部桥接接口前缀（供页面读写 user/ 目录）
const BRIDGE_PREFIX = '/__wm__/';
// 用户配置目录（相对 vault 根目录）
const USER_DIR = 'user';
// 「查单词（词忆）」统一图标：static/image/search.svg 的内联副本。
// addIcon 要求传入「不含 <svg> 外层标签」的内容，且内容须落在 0 0 100 100 视图框内，
// 故用 <g transform> 把原图 80.14 的坐标系等比缩放到 100。fill 取 currentColor 以适配深浅主题，
// 并显式写 fill/stroke 覆盖 Obsidian .svg-icon 默认的描边样式
const SEARCH_ICON_ID = 'word-memo-search';
const SEARCH_ICON_CONTENT = '<g transform="scale(1.24782)" fill="currentColor">'
    + '<path fill="currentColor" stroke="none" d="M35.2,2.25c17.23-.63,32.04,11.58,35.83,27.85,1.6,6.96,1.04,14.22-1.61,20.86-1.11,2.71-2.3,4.76-3.86,7.19,4.11,4.12,8.27,8.19,12.34,12.35,1.03,1.06,1.7,1.98,1.64,3.52-.04,1.09-.52,2.12-1.34,2.86-.74.67-1.77,1.06-2.79,1.03-2.03-.07-3.13-1.52-4.44-2.84-.97-.96-1.94-1.93-2.91-2.9l-5.14-5.2c-.86-.86-1.91-1.83-2.71-2.69-.81.84-1.52,1.35-2.43,2.06-5.8,4.42-12.85,6.96-20.19,7.28-9.41.3-18.55-3.07-25.43-9.38C5.41,58.09,1.01,48.84.65,39.78c-.06-1.42-.06-3.4.04-4.78.54-6.97,3.16-13.64,7.53-19.17.81-1.03,1.67-1.94,2.57-2.89,6.37-6.6,15.15-10.45,24.41-10.69ZM37.53,65.54c.92-.02,1.95-.15,2.85-.28,5.98-.86,11.47-3.8,15.62-8.08,5.43-5.61,8.16-13.21,7.88-20.9-.04-1.15-.3-2.74-.55-3.87-1.19-5.59-4.08-10.7-8.28-14.66-5.16-4.88-12.08-7.55-19.24-7.42-.14,0-.39,0-.53.02-7.74.32-14.32,3.34-19.48,9.02-5.14,5.66-7.56,12.75-7.12,20.29.45,7.61,3.8,14.02,9.46,19.12,4.5,4,10.25,6.38,16.31,6.74.96.06,2.1.05,3.07.03Z"/>'
    + '<path fill="currentColor" stroke="none" d="M35.53,33.56c2.39-.4,4.65,1.22,5.04,3.61.39,2.39-1.24,4.65-3.64,5.03-2.38.38-4.62-1.24-5-3.62-.39-2.38,1.22-4.62,3.6-5.02Z"/>'
    + '<path fill="currentColor" stroke="none" d="M20.95,33.59c2.38-.47,4.69,1.08,5.15,3.46.46,2.38-1.1,4.68-3.49,5.13-2.37.45-4.65-1.1-5.11-3.47-.46-2.36,1.08-4.65,3.44-5.12Z"/>'
    + '<path fill="currentColor" stroke="none" d="M49.91,33.58c2.39-.45,4.68,1.14,5.11,3.53.43,2.39-1.17,4.67-3.57,5.08-2.37.4-4.62-1.18-5.04-3.54-.42-2.36,1.14-4.63,3.5-5.07Z"/>'
    + '</g>';
// 完整内联 <svg>（供自绘 DOM，如浮出按钮 / 右键菜单项图标使用）
const SEARCH_ICON_INLINE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + SEARCH_ICON_CONTENT + '</svg>';
// 插件仓库地址（与 manifest.authorUrl 一致），设置页「关于」分区的链接目标
const REPO_URL = 'https://github.com/Losecloud/word-memo';
// 与 js/storage.js 中 _userFile 保持一致的非法字符替换规则
const sanitizeUser = (name) => String(name || 'default').replace(/[\\/:*?"<>|]/g, '_');
// Obsidian 当前主题：body / html 上的 theme-dark / theme-light 类
const hostTheme = () => {
    const cls = (document.body ? document.body.classList : null) || document.documentElement.classList;
    if (cls.contains('theme-dark')) return 'dark';
    if (cls.contains('theme-light')) return 'light';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// 词典导入落盘：与 tools/serve.js 的 POST /save-dict 对齐，使插件内置服务可直接替代本地服务
const sanitizeDictVarName = (varName) => String(varName || '')
    .replace(/[^\p{L}\p{N}_-]/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'DICT';
const dictFileName = (varName, ext) => sanitizeDictVarName(varName).replace(/_DICT$/i, '').toLowerCase()
    + '-dict.' + (ext === 'json' ? 'json' : 'js');
// JSON 词典没有 var 声明，按文件名约定推导变量名：word-roots-dict.json → WORD_ROOTS_DICT
const dictVarNameFromFile = (fname) => String(fname).replace(/-dict\.json$/i, '').replace(/-/g, '_').toUpperCase() + '_DICT';
// 词典清单里的显示名覆盖（文件名保持英文，供路径与变量名推导）
const DICT_DISPLAY_NAMES = { 'englishwords-dict.json': '基础词典' };
// 更新 data/dict-manifest.js：只 upsert 本次导入的词典条目，保留其余条目原样。
// 不用整表重扫，避免抹掉已有条目的 mdd 资源目录（如 oaldpe 的样式/发音）等字段
// varNameHint：JSON 内容无法解析出变量名，由调用方（/save-dict 请求）显式提供
function upsertDictManifest(dataDir, fname, content, varNameHint) {
    let varName = varNameHint || '';
    if (!varName) {
        const mv = /var\s+([\p{L}_$][\p{L}\p{N}_$]*)\s*=\s*\{/u.exec(String(content || '').slice(0, 4096));
        if (mv) varName = mv[1];
    }
    if (!varName && /-dict\.json$/i.test(fname)) varName = dictVarNameFromFile(fname);
    if (!varName) return 0;
    const mf = path.join(dataDir, 'dict-manifest.js');
    let list = [];
    try {
        const arr = /\[[\s\S]*\]/.exec(fs.readFileSync(mf, 'utf8'));
        if (arr) list = JSON.parse(arr[0]);
    } catch (e) { /* 无清单或格式异常：从空表开始 */ }
    if (!Array.isArray(list)) list = [];
    const name = DICT_DISPLAY_NAMES[fname] || fname.replace(/-dict\.(js|json)$/i, '');
    const entry = { file: fname, name: name, varName: varName };
    if (/-dict\.json$/i.test(fname)) entry.format = 'json';
    // 同名资源目录存在则记录 mdd（词条 HTML 中的图片/音频/CSS 均相对该目录解析）
    const dir = path.join(dataDir, name);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) entry.mdd = name;
    const i = list.findIndex((x) => x && x.file === fname);
    if (i >= 0) list[i] = Object.assign({}, list[i], entry);
    else list.push(entry);
    list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    fs.writeFileSync(mf, '// 自动生成：浏览器导入或 tools/convert-mdx.js 更新，请勿手改\nvar DICT_MANIFEST = ' + JSON.stringify(list, null, 1) + ';\n', 'utf8');
    return list.length;
}

// 从 data/dict-manifest.js 移除指定文件的条目（卸载词典时用），保留其余条目原样
function removeDictManifestEntry(dataDir, fname) {
    const mf = path.join(dataDir, 'dict-manifest.js');
    let list = [];
    try {
        const arr = /\[[\s\S]*\]/.exec(fs.readFileSync(mf, 'utf8'));
        if (arr) list = JSON.parse(arr[0]);
    } catch (e) { /* 无清单：无需处理 */ }
    if (!Array.isArray(list)) return 0;
    const next = list.filter((x) => !x || x.file !== fname);
    if (next.length === list.length) return list.length;
    fs.writeFileSync(mf, '// 自动生成：浏览器导入或 tools/convert-mdx.js 更新，请勿手改\nvar DICT_MANIFEST = ' + JSON.stringify(next, null, 1) + ';\n', 'utf8');
    return next.length;
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.wasm': 'application/wasm',
    '.map': 'application/json; charset=utf-8'
};

// 悬浮取词：取鼠标位置所在的英文单词（Chromium/Electron 提供 caretRangeFromPoint）
const WORD_CHAR = /[A-Za-z'’-]/;

// 两个节点是否处于同一视觉行：PDF 文本层一个词常被拆进同一行的相邻 span，
// 跨行必须断开，否则会把上一行行尾与下一行行首误拼成一个词
function sameVisualLine(a, b) {
    if (!a || !b || typeof a.getBoundingClientRect !== 'function') return true;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    if (!ra.height || !rb.height) return true;
    return Math.abs(ra.top - rb.top) < Math.max(ra.height, rb.height, 4);
}

// 取元素内某一端的连续词字符（dir=-1 取尾部、dir=1 取头部）
function textRun(el, dir) {
    const t = el.textContent || '';
    if (!t) return '';
    if (dir < 0) {
        let i = t.length - 1, s = '';
        while (i >= 0 && WORD_CHAR.test(t.charAt(i))) { s = t.charAt(i) + s; i -= 1; }
        return s;
    }
    let i = 0, s = '';
    while (i < t.length && WORD_CHAR.test(t.charAt(i))) { s += t.charAt(i); i += 1; }
    return s;
}

// 单词触到文本节点边界时，沿同行的相邻兄弟元素继续扩展。
// PDF 文本层常把一个单词拆进多个 span（甚至逐字符一个 span），
// 仅在同一个文本节点内取词会把单词截断，故需按元素兄弟关系向外拼接
function extendAcrossSiblings(node, start, end) {
    const text = node.nodeValue || '';
    let word = text.slice(start, end + 1);
    if (start > 0 && end < text.length - 1) return word; // 未触边界，无需扩展
    const origin = node.nodeType === 1 ? node : node.parentElement;
    if (!origin) return word;
    let guard = 24; // 最多跨 24 个兄弟元素，逐字符 span 的长单词也能拼齐
    let cur = origin;
    while (start === 0 && guard-- > 0) {
        const prev = cur.previousSibling;
        if (!prev) break;
        if (prev.nodeType !== 1 || !(prev.textContent || '')) { cur = prev; continue; }
        if (!sameVisualLine(prev, origin)) break; // 跨行断开，避免行尾行首误拼
        const add = textRun(prev, -1);
        word = add + word;
        if (add.length < (prev.textContent || '').length) break; // 该节点还有非词字符，词首已到
        cur = prev;
    }
    guard = 24;
    cur = origin;
    while (end === text.length - 1 && guard-- > 0) {
        const next = cur.nextSibling;
        if (!next) break;
        if (next.nodeType !== 1 || !(next.textContent || '')) { cur = next; continue; }
        if (!sameVisualLine(next, origin)) break;
        const full = next.textContent || '';
        const add = textRun(next, 1);
        word += add;
        if (add.length < full.length) break; // 该节点还有非词字符，词尾已到
        cur = next;
    }
    return word;
}

function wordAtPoint(x, y) {
    let range = null;
    if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos && pos.offsetNode) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
        }
    }
    if (!range) return '';
    const node = range.startContainer;
    if (!node || node.nodeType !== 3) return ''; // 非文本节点（图片/组件等）不取词
    const text = node.nodeValue || '';
    let i = range.startOffset;
    // 光标常停在词尾：当前字符非字母时向左回退一位再判定
    if (!WORD_CHAR.test(text.charAt(i)) && i > 0 && WORD_CHAR.test(text.charAt(i - 1))) i -= 1;
    if (!WORD_CHAR.test(text.charAt(i))) return '';
    let start = i;
    let end = i;
    while (start > 0 && WORD_CHAR.test(text.charAt(start - 1))) start -= 1;
    while (end < text.length - 1 && WORD_CHAR.test(text.charAt(end + 1))) end += 1;
    // 去掉首尾的连字符/撇号，只保留单词本体；单词被拆分到相邻节点时继续扩展
    const word = extendAcrossSiblings(node, start, end).replace(/^['’-]+|['’-]+$/g, '');
    return /^[A-Za-z][A-Za-z'’-]*$/.test(word) ? word : '';
}

// 悬浮取词的上下文：按叶子视图类型分流，不依赖各版本易变的容器类名
// 返回 { kind: 'note' | 'pdf' }；仅文本取词（笔记正文与 PDF 文本层），图片等非文本内容不处理
function hoverContext(el) {
    if (!el || typeof el.closest !== 'function') return null;
    const leaf = el.closest('.workspace-leaf-content');
    const dtype = leaf && leaf.getAttribute('data-type');
    // PDF：内置 PDF 视图，或笔记内嵌的 PDF（此时叶子类型仍是 markdown）
    if (dtype === 'pdf' || el.closest('.pdf-embed, .pdf-viewer, .pdf-container')) return { kind: 'pdf' };
    if (el.closest('.markdown-source-view, .markdown-reading-view')) return { kind: 'note' };
    return null;
}

// 解压内嵌应用包（发行版由 tools/web2ob.py 注入 WM_APP_BUNDLE）到 vault 内的 APP_DIR，
// 返回该目录绝对路径；开发态（未注入）返回 null，调用方回退到 vault 根目录。
// 包格式：WMB1 + 条目数(4) + [路径长(2) 路径 内容长(4) 内容] * N，整体 gzip 后 base64
function extractAppBundle(vaultBase) {
    if (typeof WM_APP_BUNDLE !== 'string' || !WM_APP_BUNDLE) return null;
    const target = path.join(vaultBase, APP_DIR);
    const marker = path.join(target, '.wm-version');
    // 指纹 = 版本号 + 包内容哈希：只要应用包变了就必须重新解压，
    // 否则开发期改了应用文件、版本号没动，vault 里会一直跑旧副本
    const stamp = WM_APP_VERSION + '-' + crypto.createHash('sha1').update(WM_APP_BUNDLE).digest('hex').slice(0, 12);
    try {
        if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === stamp) return target;
    } catch (e) { /* 读取失败则重新解压 */ }

    const raw = zlib.gunzipSync(Buffer.from(WM_APP_BUNDLE, 'base64'));
    if (raw.slice(0, 4).toString('ascii') !== 'WMB1') throw new Error('内嵌应用包格式不正确');

    let off = 4;
    const count = raw.readUInt32BE(off); off += 4;
    const written = new Set();
    for (let i = 0; i < count; i++) {
        const nameLen = raw.readUInt16BE(off); off += 2;
        const name = raw.slice(off, off + nameLen).toString('utf8'); off += nameLen;
        const size = raw.readUInt32BE(off); off += 4;
        const content = raw.slice(off, off + size); off += size;

        // 防目录穿越：解压目标必须仍落在 target 内
        const filePath = path.resolve(target, name);
        if (filePath !== target && !filePath.startsWith(target + path.sep)) continue;
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content);
        written.add(name);
    }
    fs.writeFileSync(marker, stamp, 'utf8');

    // 保留用户此前导入的词典：把非内嵌的 data/*-dict.js / *-dict.json 重新并入清单（内嵌文件已被本次写入覆盖）
    try {
        const dataDir = path.join(target, 'data');
        fs.readdirSync(dataDir).forEach((f) => {
            if (!/-dict\.(js|json)$/i.test(f) || f === 'dict-manifest.js' || written.has('data/' + f)) return;
            upsertDictManifest(dataDir, f, fs.readFileSync(path.join(dataDir, f), 'utf8'));
        });
    } catch (e) { /* 忽略：无 data 目录或读取失败 */ }

    return target;
}

// 内置静态服务：把 vault 根目录以 http://127.0.0.1:<随机端口> 暴露，
// 供 iframe 使用真实 origin 加载（app:// 下外部样式表/脚本会被 Obsidian CSP 拦截）。
class StaticServer {
    constructor(root) {
        this.root = path.resolve(root);
        this.server = null;
        this.port = 0;
    }

    start(preferredPort) {
        const base = preferredPort || DEFAULT_PORT;
        const candidates = [];
        for (let i = 0; i < PORT_TRIES; i++) candidates.push(base + i);
        return candidates.reduce(
            (chain, port) => chain.catch(() => this.listen(port)),
            Promise.reject()
        ).then(() => this.port);
    }

    // 仅监听回环地址，不对外暴露
    listen(port) {
        return new Promise((resolve, reject) => {
            const server = http.createServer((req, res) => this.handle(req, res));
            const onError = (err) => { try { server.close(); } catch (e) { /* 忽略 */ } reject(err); };
            server.once('error', onError);
            server.listen(port, '127.0.0.1', () => {
                server.removeListener('error', onError);
                this.server = server;
                this.port = port;
                resolve(port);
            });
        });
    }

    stop() {
        if (this.server) {
            try { this.server.close(); } catch (e) { /* 忽略关闭异常 */ }
            this.server = null;
        }
    }

    // 内部桥接：列用户 / 读配置 / 写配置 / 删配置，仅操作 user/ 目录下的 user_*.json
    handleBridge(req, res, pathname) {
        const send = (code, body) => {
            res.writeHead(code, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            });
            res.end(body);
        };
        const action = pathname.slice(BRIDGE_PREFIX.length);
        const userDir = path.join(this.root, USER_DIR);

        if (action === 'ping') { send(200, JSON.stringify({ ok: true })); return; }

        if (action === 'users') {
            fs.readdir(userDir, (err, files) => {
                if (err) { send(200, JSON.stringify([])); return; }
                const names = files
                    .filter((f) => /^user_.+\.json$/i.test(f))
                    .map((f) => f.slice('user_'.length, -'.json'.length))
                    .filter((n) => n && n !== 'template');
                send(200, JSON.stringify(names));
            });
            return;
        }

        if (action === 'user') {
            // 用户名经清洗后拼接，并校验最终路径仍在 user/ 目录内，防止目录穿越
            const query = (req.url || '').split('?')[1] || '';
            const name = sanitizeUser(new URLSearchParams(query).get('name'));
            const filePath = path.join(userDir, 'user_' + name + '.json');
            if (path.dirname(filePath) !== userDir) { send(400, JSON.stringify({ error: 'invalid name' })); return; }

            if (req.method === 'GET') {
                fs.readFile(filePath, 'utf8', (err, text) => {
                    if (err) { send(404, JSON.stringify({ error: 'not found' })); return; }
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                    res.end(text);
                });
                return;
            }

            if (req.method === 'POST') {
                let body = '';
                req.on('data', (c) => { body += c; if (body.length > 64 * 1024 * 1024) req.destroy(); });
                req.on('end', () => {
                    try { JSON.parse(body); } catch (e) { send(400, JSON.stringify({ error: 'invalid json' })); return; }
                    fs.mkdir(userDir, { recursive: true }, () => {
                        fs.writeFile(filePath, body, 'utf8', (err) => {
                            if (err) { send(500, JSON.stringify({ error: 'write failed' })); return; }
                            send(200, JSON.stringify({ ok: true }));
                        });
                    });
                });
                return;
            }

            if (req.method === 'DELETE') {
                fs.unlink(filePath, () => send(200, JSON.stringify({ ok: true })));
                return;
            }
        }

        send(404, JSON.stringify({ error: 'unknown action' }));
    }

    // 词典导入落盘：写入 data/<name>-dict.json 并重建 data/dict-manifest.js
    // （与 tools/serve.js 的 POST /save-dict 行为一致）
    handleSaveDict(req, res) {
        const send = (code, obj) => {
            res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(obj));
        };
        if (req.method !== 'POST') { send(405, { ok: false, error: 'method not allowed' }); return; }
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 512 * 1024 * 1024) req.destroy(); });
        req.on('end', () => {
            try {
                const { varName, content, file } = JSON.parse(body);
                if (!varName || typeof content !== 'string') throw new Error('参数缺失');
                const dataDir = path.join(this.root, 'data');
                // 目标文件名：调用方指定优先（须为不含路径分隔符的 -dict.js / -dict.json），否则按变量名推导
                const safe = typeof file === 'string'
                    && /^[^\\/:*?"<>|]+-dict\.(js|json)$/i.test(file) && file.charAt(0) !== '.' ? file : '';
                const fname = safe || dictFileName(varName, /-dict\.json$/i.test(String(file || '')) ? 'json' : 'js');
                fs.mkdirSync(dataDir, { recursive: true });
                fs.writeFileSync(path.join(dataDir, fname), content, 'utf8');
                const count = upsertDictManifest(dataDir, fname, content, varName);
                send(200, { ok: true, file: fname, count: count });
            } catch (e) {
                send(400, { ok: false, error: e.message });
            }
        });
    }

    // 卸载词典：删除 vault 内 data/<name>-dict.json 并更新 data/dict-manifest.js
    // （与 tools/serve.js 的 POST /delete-dict 行为一致）
    handleDeleteDict(req, res) {
        const send = (code, obj) => {
            res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(obj));
        };
        if (req.method !== 'POST') { send(405, { ok: false, error: 'method not allowed' }); return; }
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 64 * 1024) req.destroy(); });
        req.on('end', () => {
            try {
                const { file } = JSON.parse(body);
                // 只接受 data/ 直属的词典文件名，杜绝路径穿越
                const safe = typeof file === 'string'
                    && /^[^\\/:*?"<>|]+-dict\.(js|json)$/i.test(file) && file.charAt(0) !== '.' ? file : '';
                if (!safe) throw new Error('文件名不合法');
                const dataDir = path.join(this.root, 'data');
                const fp = path.join(dataDir, safe);
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
                const count = removeDictManifestEntry(dataDir, safe);
                send(200, { ok: true, file: safe, count: count });
            } catch (e) {
                send(400, { ok: false, error: e.message });
            }
        });
    }

    handle(req, res) {
        let pathname;
        try {
            pathname = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
        } catch (e) {
            res.writeHead(400);
            res.end('Bad Request');
            return;
        }

        // 内部桥接接口：Obsidian 不开放 File System Access API，页面改用这些接口读写 user/ 目录
        if (pathname.indexOf(BRIDGE_PREFIX) === 0) {
            this.handleBridge(req, res, pathname);
            return;
        }

        // 词典导入落盘：与 tools/serve.js 的 POST /save-dict 同路径同行为，
        // 使页面（Obsidian 右侧栏拖入区）导入 MDX 后可直接写入 vault 的 data/ 目录
        if (pathname === '/save-dict') {
            this.handleSaveDict(req, res);
            return;
        }

        // 词典卸载：删除 vault 内词典文件并更新清单
        if (pathname === '/delete-dict') {
            this.handleDeleteDict(req, res);
            return;
        }

        if (pathname === '/') pathname = '/' + ENTRY_FILE;

        const filePath = path.resolve(this.root, '.' + pathname);
        // 防目录穿越：解析后必须仍在 vault 根目录内
        if (filePath !== this.root && !filePath.startsWith(this.root + path.sep)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            const headers = {
                'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
                'Cache-Control': 'no-cache',
                'Accept-Ranges': 'bytes'
            };

            // 支持 Range 请求（音频/视频拖动播放）
            const range = req.headers.range;
            const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
            if (m) {
                let start = m[1] ? parseInt(m[1], 10) : 0;
                let end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
                if (isNaN(start)) start = 0;
                if (isNaN(end) || end >= stat.size) end = stat.size - 1;
                if (start > end) {
                    res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
                    res.end();
                    return;
                }
                headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stat.size;
                headers['Content-Length'] = end - start + 1;
                res.writeHead(206, headers);
                if (req.method === 'HEAD') { res.end(); return; }
                fs.createReadStream(filePath, { start, end }).pipe(res);
                return;
            }

            headers['Content-Length'] = stat.size;
            res.writeHead(200, headers);
            if (req.method === 'HEAD') { res.end(); return; }
            fs.createReadStream(filePath).pipe(res);
        });
    }
}

// 视图基类：把 vault 根目录的入口页以 iframe 形式加载，并同步宿主主题。
// 子类必须覆写 getViewType / getDisplayText / getIcon —— 因为 ItemView 构造函数会在
// super(leaf) 期间就调用 getViewType()，那时本类的 this.opts 尚未赋值，读它会抛错。
class FrameView extends ItemView {
    constructor(leaf, plugin, opts) {
        super(leaf);
        this.plugin = plugin;
        this.opts = opts || {};
        this.frame = null;
        this.loaded = false; // iframe 文档是否已加载完成（未完成时 postMessage 会丢，需排队）
        this.pending = []; // iframe 未就绪时排队的消息，load 后补发
    }

    getIcon() {
        return 'book';
    }

    async onOpen() {
        // 服务尚未监听时先占位，待 onload 完成后由 reloadFrame 补载
        this.frame = this.contentEl.createEl('iframe', { cls: this.opts.frameClasses });
        this.frame.setAttribute('allow', 'clipboard-read; clipboard-write; microphone');
        this.mountFrame();

        // 主题实时同步：iframe 加载完成后推送一次，并在 Obsidian 主题变化时持续推送
        this.frame.addEventListener('load', () => {
            this.loaded = true;
            this.pushTheme();
            this.flushPending();
        });
        this.observer = new MutationObserver(() => this.pushTheme());
        const obsOpts = { attributes: true, attributeFilter: ['class'] };
        this.observer.observe(document.body, obsOpts);
        this.observer.observe(document.documentElement, obsOpts);
    }

    // 解析入口页地址（内置 http 服务优先，不可用时回退 app:// 资源路径）；都不可用返回 null
    resolveSrc() {
        const plugin = this.plugin;
        let src;
        if (plugin && plugin.baseUrl) {
            // 内置服务已就绪：从服务根加载（发行版为内嵌包解压目录 .word-memo/）
            src = plugin.baseUrl + '/' + encodeURIComponent(ENTRY_FILE);
        } else {
            // 开发态回退：直接读 vault 内的入口页
            const file = this.app.vault.getAbstractFileByPath(ENTRY_FILE);
            if (!file) return null;
            src = this.app.vault.adapter.getResourcePath(file.path);
        }

        // 附加查询参数：视图模式 + 宿主主题（主题随参数带入，避免首屏闪烁）
        const params = [];
        if (this.opts.query) params.push(this.opts.query);
        params.push('wmTheme=' + hostTheme());
        return src + (src.indexOf('?') === -1 ? '?' : '&') + params.join('&');
    }

    // 挂载/重载 iframe 内容（服务就绪后调用可修正首次打开时的空白）
    mountFrame() {
        const src = this.resolveSrc();
        if (!src) {
            this.contentEl.empty();
            this.contentEl.createEl('div', {
                text: `未找到入口文件：${ENTRY_FILE}（请确认它位于 vault 根目录）`
            });
            new Notice('词忆：未找到入口文件 ' + ENTRY_FILE);
            return;
        }
        if (this.frame.src === src) return;
        this.loaded = false; // 重新加载：等待新的 load 事件
        this.frame.src = src;
    }

    // onload 中服务启动完成后回调，刷新已打开视图
    reloadFrame() {
        if (this.frame) this.mountFrame();
    }

    // 向 iframe 推送宿主主题（页面按自身「跟随系统主题」开关决定是否采纳）
    pushTheme() {
        if (!this.loaded) return; // 未加载完成时排队无意义，load 回调会补推一次
        this.postToFrame({ type: 'wm-theme', theme: hostTheme() });
    }

    // 向 iframe 推送消息；iframe 尚未加载完成时先排队，load 后补发（否则消息会丢失）
    postToFrame(msg) {
        if (!this.frame || !this.loaded) {
            this.pending.push(msg);
            return;
        }
        try {
            this.frame.contentWindow.postMessage(msg, new URL(this.frame.src, location.href).origin);
        } catch (e) {
            this.pending.push(msg);
        }
    }

    flushPending() {
        if (!this.pending.length) return;
        const msgs = this.pending;
        this.pending = [];
        msgs.forEach((m) => this.postToFrame(m));
    }

    async onClose() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.frame) {
            this.frame.remove();
            this.frame = null;
        }
    }
}

// 整页应用视图（标签页）
class WordMemoView extends FrameView {
    constructor(leaf, plugin) {
        // wmHost=1：告知页面当前运行在 Obsidian 宿主且右侧栏查词可用，
        // 页面内的「查看词典详情」跳转统一转交右侧栏承接（主页不弹结果窗口）
        super(leaf, plugin, { query: 'wmHost=1', frameClasses: ['word-memo-frame'] });
    }

    // 以下三者由 ItemView 构造函数在 super(leaf) 期间调用，必须返回常量
    getViewType() { return VIEW_TYPE; }

    getDisplayText() { return '词忆 Word Memo'; }

    getIcon() { return 'layers'; } // 与主页左上角 logo（header-left .logo-icon）同一图案，随 Obsidian 图标灰色着色
}

// 右侧栏查词引擎视图（复用 dict-lookup 查单词框架）
class DictLookupView extends FrameView {
    constructor(leaf, plugin) {
        super(leaf, plugin, {
            query: 'wmView=dict',
            frameClasses: ['word-memo-frame', 'word-memo-frame-dict']
        });
    }

    getViewType() { return DICT_VIEW_TYPE; }

    getDisplayText() { return '查单词'; }

    getIcon() { return SEARCH_ICON_ID; }
}

// 封面视窗（可视化封面独立窗口）：默认蒲公英聚类，右下角顺序切换封面
class CoverView extends FrameView {
    constructor(leaf, plugin) {
        super(leaf, plugin, {
            query: 'wmView=cover',
            frameClasses: ['word-memo-frame', 'word-memo-frame-cover']
        });
    }

    getViewType() { return COVER_VIEW_TYPE; }

    getDisplayText() { return '词忆封面'; }

    getIcon() { return 'image'; }
}

// 插件设置页：单页分区布局（排版参考 Hearth 的 section 结构——标题/描述在盒子外，
// 原生 .setting-item 行装在圆角描边盒子内）。当前仅「关于」分区作为打样
class WordMemoSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('word-memo-settings');
        this.renderBack(containerEl);
        // 单一分区：按社区规范不设顶层标题（尤其不使用插件名）；分区头留待出现多分区时再启用
        this.section(containerEl, null, null, (body) => this.aboutSection(body));
    }

    // 返回按钮：单页设置没有上一级，故退出到 Obsidian「第三方插件」列表
    renderBack(el) {
        const back = el.createDiv({ cls: 'word-memo-settings-back' });
        setIcon(back.createSpan({ cls: 'word-memo-settings-back-icon' }), 'chevron-left');
        back.createSpan({ text: '返回插件列表' });
        back.addEventListener('click', () => {
            try {
                this.app.setting.openTabById('community-plugins');
            } catch (e) { /* 兼容旧版 Obsidian：无该入口时忽略 */ }
        });
    }

    // 分区：标题与描述在盒子外，行内容装在圆角描边盒子内；title 为空则不渲染分区头
    section(el, title, desc, render) {
        const section = el.createDiv({ cls: 'word-memo-section' });
        if (title) {
            const head = section.createDiv({ cls: 'word-memo-section-head' });
            head.createDiv({ cls: 'word-memo-section-title', text: title });
            if (desc) head.createDiv({ cls: 'word-memo-section-desc', text: desc });
        }
        const body = section.createDiv({ cls: 'word-memo-section-body' });
        render(body);
    }

    aboutSection(body) {
        const manifest = this.plugin.manifest;
        new Setting(body)
            .setName(manifest.name)
            .setDesc('专攻难词、趣味高效的单词记忆工具。');
        new Setting(body)
            .setName('项目仓库')
            .setDesc('源码、更新日志与使用说明。')
            .addButton((btn) => this.linkButton(btn, 'github', '打开 GitHub', REPO_URL));
        new Setting(body)
            .setName('反馈问题')
            .setDesc('遇到问题或有功能建议，欢迎提交 Issue。')
            .addButton((btn) => this.linkButton(btn, 'bug', '提交 Issue', REPO_URL + '/issues'));
        new Setting(body)
            .setName('版本 ' + manifest.version)
            .setDesc('作者：' + (manifest.author || '词忆团队'));
    }

    // 带图标的链接按钮（图标 + 文案），样式对齐 Hearth 的 about 按钮
    linkButton(btn, icon, label, url) {
        btn.setTooltip(url).onClick(() => window.open(url, '_blank'));
        const el = btn.buttonEl;
        el.empty();
        el.addClass('word-memo-about-btn');
        setIcon(el.createSpan({ cls: 'word-memo-about-btn-icon' }), icon);
        el.createSpan({ text: label });
    }
}

module.exports = class WordMemoPlugin extends Plugin {
    onload() {
        this.server = null;
        this.baseUrl = null;

        // 宿主侧功能开关（悬浮取词 / 划词翻译）：由主页「页面设置」实时回传，未设置过时默认开启。
        // 同时把上次收到的值持久化，重启 Obsidian 后无需打开主页也能沿用
        this.obSettings = { hoverLookup: true, selectionTranslate: true };
        this.obSettingsFromHost = false;
        this.hoverWord = ''; // 当前悬浮所在单词（同一单词不重复查询、不重置计时）
        this.hoverTimer = null;
        this.hoverTick = 0; // 取词节流时间戳
        this.pdfBtn = null; // PDF 划词浮出的「译」按钮
        this.pdfBtnText = '';
        this.loadData().then((saved) => {
            if (!this.obSettingsFromHost && saved && saved.obSettings) Object.assign(this.obSettings, saved.obSettings);
        }).catch(() => { /* 忽略 */ });

        // 视图 / 命令必须同步注册：Obsidian 恢复上次布局时会按 workspace.json 重建标签页，
        // 若视图类型尚未注册，标签页会停留在「插件不再活动」。
        this.registerView(VIEW_TYPE, (leaf) => new WordMemoView(leaf, this));
        this.registerView(DICT_VIEW_TYPE, (leaf) => new DictLookupView(leaf, this));
        this.registerView(COVER_VIEW_TYPE, (leaf) => new CoverView(leaf, this));

        // 注册「查单词（词忆）」统一图标（static/image/search.svg），供 ribbon 与视图标签复用
        addIcon(SEARCH_ICON_ID, SEARCH_ICON_CONTENT);

        // 左侧 ribbon：查单词（右侧栏）+ 整页应用（封面视窗不占用 ribbon，仅保留命令/API 入口）
        this.addRibbonIcon(SEARCH_ICON_ID, '查单词（词忆）', () => this.activateDictView());
        this.addRibbonIcon('layers', '打开词忆 Word Memo', () => this.activateView());

        this.addCommand({
            id: 'open-dict-lookup',
            name: '打开右侧栏查单词',
            callback: () => this.activateDictView()
        });

        this.addCommand({
            id: 'open-word-memo',
            name: '打开词忆 Word Memo',
            callback: () => this.activateView()
        });

        this.addCommand({
            id: 'open-word-memo-cover',
            name: '打开词忆封面视窗',
            callback: () => this.activateCoverView()
        });

        // 设置页（单页分区布局）
        this.addSettingTab(new WordMemoSettingTab(this.app, this));

        // 划词右键菜单：选中文本后右键出现「查询」（带词忆 logo），
        // 点击即激活右侧栏并显示结果（单词走首选词典释义，句子走 AI 翻译）
        this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => {
            if (!this.obSettings.selectionTranslate) return; // 「页面设置 → 划词翻译」关闭时不出现该项
            const sel = (editor.getSelection() || '').trim();
            // 未选中内容不出现该项；过长（如误选整段文档）也跳过，避免无意义的长文本翻译
            if (!sel || sel.length > 2000) return;
            menu.addItem((item) => {
                item.setTitle('查询')
                    .setIcon(SEARCH_ICON_ID) // 与「查单词（词忆）」统一图标
                    .onClick(() => this.translateSelection(sel));
            });
        }));

        // 悬浮取词：鼠标在笔记文本上停留 0.5s 后，把该单词推给右侧栏查词面板。
        // 节流降低取词开销；拖拽/滚动/点击时立即取消，避免误触发
        this.registerDomEvent(document, 'mousemove', (e) => this.onHoverMove(e));
        this.registerDomEvent(document, 'mousedown', () => this.cancelHover());
        this.registerDomEvent(window, 'scroll', () => this.cancelHover(), true);

        // PDF 划词翻译：内置 PDF 查看器不触发 editor-menu，故自绘「浮出按钮 + 原生右键菜单项」两个入口
        this.initPdfSelection();

        // 内置服务改为后台启动，且**不 await**：onload 必须尽快返回，否则 Obsidian 会认为插件
        // 尚未激活（端口探测若卡住，await 会让插件一直处于未激活态，标签页报「插件不再活动」）。
        this.startServer();

        // 主页 iframe 发来的消息：查词跳转请求 + 「页面设置」功能开关回传
        this.registerDomEvent(window, 'message', (e) => {
            const d = e.data;
            if (!d || typeof d.type !== 'string') return;
            // 仅接受来自本插件主页 iframe 的消息，避免与其他窗口消息串扰
            const fromHost = this.app.workspace.getLeavesOfType(VIEW_TYPE).some((leaf) => {
                const v = leaf.view;
                return v && v.frame && v.frame.contentWindow === e.source;
            });
            if (!fromHost) return;
            if (d.type === 'wm-dict-lookup' && d.word) {
                // 「查看词典详情」：转交右侧栏查词视图承接，主页不弹结果窗口
                this.lookupInDictView(String(d.word));
            } else if (d.type === 'wm-ob-settings') {
                // 页面设置里的「悬浮取词」「划词翻译」开关
                this.applyHostSettings(d);
            }
        });
    }

    // 接收主页回传的功能开关：即时生效并持久化，重启后无需打开主页也能沿用
    applyHostSettings(d) {
        this.obSettingsFromHost = true;
        this.obSettings = {
            hoverLookup: d.hoverLookup !== false,
            selectionTranslate: d.selectionTranslate !== false
        };
        if (!this.obSettings.hoverLookup) this.cancelHover();
        if (!this.obSettings.selectionTranslate) this.hidePdfBtn(); // 关闭划词翻译时收起 PDF 浮出按钮
        this.loadData()
            .then((saved) => this.saveData(Object.assign({}, saved || {}, { obSettings: this.obSettings })))
            .catch(() => { /* 忽略 */ });
    }

    // 悬浮取词：笔记正文与 PDF 文本层直接取词，同一位置停留 HOVER_DELAY 后推给右侧栏
    onHoverMove(e) {
        if (!this.obSettings.hoverLookup) return;
        if (e.buttons) return; // 正在拖拽/选择文本
        const now = Date.now();
        if (now - this.hoverTick < HOVER_TICK) return; // 节流：降低取词开销
        this.hoverTick = now;
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && String(sel).trim()) { this.cancelHover(); return; } // 已有选区时不打扰
        if (!hoverContext(e.target)) { this.cancelHover(); return; } // 笔记/PDF 之外（侧栏、菜单等）不取词
        const word = wordAtPoint(e.clientX, e.clientY);
        if (word) this.onHoverWord(word);
        else this.cancelHover(); // 空白处（如扫描页无文本层）保持安静
    }

    // 文本取词：同一单词不重置计时，也不重复查询
    onHoverWord(word) {
        if (word === this.hoverWord) return;
        this.hoverWord = word;
        if (this.hoverTimer) clearTimeout(this.hoverTimer);
        this.hoverTimer = setTimeout(() => {
            this.hoverTimer = null;
            if (this.obSettings.hoverLookup && this.hoverWord) this.pushToDictView(this.hoverWord);
        }, HOVER_DELAY);
    }

    // 取消当前悬浮取词计时
    cancelHover() {
        this.hoverWord = '';
        if (this.hoverTimer) {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = null;
        }
    }

    // PDF 划词翻译：内置 PDF 查看器不触发 editor-menu 事件，故自绘两个入口
    // 入口一：选中文本后在选区旁浮出「译」按钮；入口二：把「翻译」追加进 PDF 右键菜单
    initPdfSelection() {
        const btn = document.body.createDiv({ cls: 'word-memo-pdf-translate-btn' });
        btn.innerHTML = SEARCH_ICON_INLINE_SVG;
        btn.setAttribute('aria-label', '翻译（词忆）');
        btn.style.display = 'none';
        this.pdfBtn = btn;
        btn.addEventListener('mousedown', (e) => e.preventDefault()); // 避免按下时清除选区
        btn.addEventListener('click', () => {
            const text = this.pdfBtnText;
            this.hidePdfBtn();
            if (text) this.translateSelection(text);
        });
        this.registerDomEvent(document, 'selectionchange', () => this.syncPdfBtn());
        // 按钮内含 <svg> 图标，点击时 e.target 是 svg/path 而非按钮本身，
        // 故用 contains 判定，避免误当作「点击别处」把按钮隐藏并清空待翻译文本
        this.registerDomEvent(document, 'mousedown', (e) => { if (!btn.contains(e.target)) this.hidePdfBtn(); });
        this.registerDomEvent(window, 'scroll', () => this.hidePdfBtn(), true);
        // PDF 的原生右键菜单由 Obsidian 内部实现（插件无法挂载菜单项），
        // 故在 contextmenu 之后把「翻译」追加进已弹出的菜单，原有菜单项保持不变
        this.registerDomEvent(document, 'contextmenu', (e) => this.onPdfContextMenu(e), true);
    }

    // 选区文本（仅当选区落在 PDF 文本层内且长度合理时返回，否则空串）
    pdfSelectionText() {
        if (!this.obSettings.selectionTranslate) return '';
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return '';
        const text = String(sel).trim();
        if (!text || text.length > 2000) return '';
        const node = sel.anchorNode;
        const el = node && (node.nodeType === 1 ? node : node.parentElement);
        if (!el || typeof el.closest !== 'function') return '';
        // 与悬浮取词同一套判定：PDF 视图叶子，或笔记内嵌的 PDF
        const leaf = el.closest('.workspace-leaf-content');
        const isPdf = (leaf && leaf.getAttribute('data-type') === 'pdf') || !!el.closest('.pdf-embed, .pdf-viewer, .pdf-container');
        if (!isPdf) return '';
        return text;
    }

    // 选区末尾的矩形（用于定位浮出按钮）。不用 DOM 顺序推断「末尾字符」——PDF 文本层里
    // 空格等 span 的 DOM 顺序可能与视觉顺序不一致，会导致取到段落末尾的字符。改用纯几何判定：
    // 取选区所有行矩形中最靠下、同一行最靠右者（即视觉上的选区末尾）
    selectionEndRect(range) {
        const rects = range.getClientRects();
        const list = [];
        let minH = Infinity;
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            if (r.width > 0 && r.height > 0) {
                list.push(r);
                if (r.height < minH) minH = r.height;
            }
        }
        if (!list.length) return null;
        // 选区含空格时，浏览器会把 PDF 文本层根容器（覆盖整页的块级元素）也当作一个矩形返回，
        // 其高度远大于单行，按最小行高过滤掉，避免按钮被顶到容器右上角
        const lines = list.filter((r) => r.height <= minH * 1.8);
        const pool = lines.length ? lines : list;
        const tol = Math.max(1, minH * 0.5); // 同一视觉行的高度容差
        let best = null;
        for (let i = 0; i < pool.length; i++) {
            const r = pool[i];
            if (!best || r.bottom > best.bottom + tol) best = r;
            else if (Math.abs(r.bottom - best.bottom) <= tol && r.right > best.right) best = r;
        }
        return best;
    }

    // 让浮出的「译」按钮跟随 PDF 选区末尾
    syncPdfBtn() {
        const text = this.pdfSelectionText();
        if (!text || !this.pdfBtn) { this.hidePdfBtn(); return; }
        const sel = window.getSelection();
        const rect = this.selectionEndRect(sel.getRangeAt(0));
        if (!rect || (!rect.width && !rect.height)) { this.hidePdfBtn(); return; }
        this.pdfBtnText = text;
        const btn = this.pdfBtn;
        btn.style.display = 'flex';
        btn.style.left = Math.max(4, Math.min(window.innerWidth - 40, rect.right + 6)) + 'px';
        btn.style.top = Math.max(4, rect.top - 2) + 'px';
    }

    hidePdfBtn() {
        if (this.pdfBtn) this.pdfBtn.style.display = 'none';
        this.pdfBtnText = '';
    }

    onPdfContextMenu(e) {
        const text = this.pdfSelectionText();
        if (!text) return;
        this.hidePdfBtn();
        this.injectPdfMenuItem(text);
    }

    // 等 Obsidian 的 PDF 右键菜单出现后，往其中追加「查询（词忆）」
    injectPdfMenuItem(text) {
        let tries = 0;
        const tick = () => {
            const menu = this.findOpenMenu();
            if (!menu) {
                if (++tries < 10) window.requestAnimationFrame(tick);
                return;
            }
            if (menu.querySelector('.word-memo-pdf-menu-item')) return; // 已注入过
            const item = menu.createDiv({ cls: 'menu-item tappable word-memo-pdf-menu-item' });
            // 图标 + 标题：图标结构与 Obsidian 原生菜单项一致（.menu-item-icon > .svg-icon）
            item.createDiv({ cls: 'menu-item-icon svg-icon' }).innerHTML = SEARCH_ICON_INLINE_SVG;
            item.createDiv({ cls: 'menu-item-title', text: '查询' });
            item.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                this.translateSelection(text);
                this.closeOpenMenus();
            });
        };
        window.requestAnimationFrame(tick);
    }

    // 当前可见的 Obsidian 菜单（取最后一个，即最新打开的那个）
    findOpenMenu() {
        const menus = document.querySelectorAll('.menu');
        for (let i = menus.length - 1; i >= 0; i--) {
            if (menus[i].getBoundingClientRect().width > 0) return menus[i];
        }
        return null;
    }

    // 收起菜单：Obsidian 的菜单自身监听 mousedown 来关闭
    closeOpenMenus() {
        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }

    // 悬浮取词推送：仅更新已打开的右侧栏面板，不自动展开（避免鼠标划过单词时打断编辑）
    pushToDictView(word) {
        const leaves = this.app.workspace.getLeavesOfType(DICT_VIEW_TYPE);
        if (!leaves.length) return;
        leaves.forEach((leaf) => {
            const view = leaf.view;
            if (view && typeof view.postToFrame === 'function') view.postToFrame({ type: 'wm-dict-word', word: word });
        });
    }

    // 后台启动内置静态服务（自动，无需用户手动执行任何命令）
    async startServer() {
        try {
            const saved = (await this.loadData()) || {};
            const vaultBase = this.app.vault.adapter.getBasePath();
            // 发行版：解压内嵌应用包，以其目录为服务根；开发态（无内嵌包）：回退到 vault 根目录
            let root = vaultBase;
            try {
                const extracted = extractAppBundle(vaultBase);
                if (extracted) root = extracted;
            } catch (e) {
                console.error('词忆：解压内嵌应用包失败，回退到 vault 根目录', e);
            }
            const srv = new StaticServer(root);
            const port = await srv.start(saved.port || DEFAULT_PORT);
            this.server = srv;
            this.baseUrl = 'http://127.0.0.1:' + port;
            // 记住实际端口，保证 origin 稳定（localStorage 数据不丢）
            if (saved.port !== port) await this.saveData(Object.assign({}, saved, { port }));
        } catch (e) {
            console.error('词忆：内置静态服务启动失败，将回退到 app:// 资源路径', e);
            new Notice('词忆：内置服务启动失败，页面样式与交互可能不可用');
        }

        // 服务就绪后刷新已打开的视图（首次打开时服务可能尚未监听）
        try {
            this.app.workspace.getLeavesOfType(VIEW_TYPE)
                .concat(this.app.workspace.getLeavesOfType(DICT_VIEW_TYPE))
                .concat(this.app.workspace.getLeavesOfType(COVER_VIEW_TYPE))
                .forEach((leaf) => {
                    if (leaf.view && typeof leaf.view.reloadFrame === 'function') leaf.view.reloadFrame();
                });
        } catch (e) {
            console.error('词忆：刷新视图失败', e);
        }
    }

    onunload() {
        this.cancelHover(); // 清理悬浮取词计时
        if (this.pdfBtn) { this.pdfBtn.remove(); this.pdfBtn = null; } // 移除 PDF 划词浮出按钮
        if (this.server) {
            this.server.stop();
            this.server = null;
            this.baseUrl = null;
        }
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
        if (!leaf) {
            leaf = workspace.getLeaf('tab');
            await leaf.setViewState({ type: VIEW_TYPE, active: true });
        }
        workspace.revealLeaf(leaf);
    }

    // 在右侧栏打开查单词视图（已存在则复用并展开）
    async activateDictView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(DICT_VIEW_TYPE)[0];
        if (!leaf) {
            // 优先落在右侧栏；极少数布局下可能拿不到右侧栏叶子，退回主区域避免静默失败
            leaf = workspace.getRightLeaf(false) || workspace.getLeaf('tab');
            await leaf.setViewState({ type: DICT_VIEW_TYPE, active: true });
        }
        workspace.revealLeaf(leaf);
    }

    // 打开封面视窗（已存在则复用并展开）：供其它可视化插件内嵌
    async activateCoverView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(COVER_VIEW_TYPE)[0];
        if (!leaf) {
            leaf = workspace.getLeaf('tab');
            await leaf.setViewState({ type: COVER_VIEW_TYPE, active: true });
        }
        workspace.revealLeaf(leaf);
    }

    // 把主页发来的单词交给右侧栏查词视图：先确保侧栏已展开，再把单词推入其 iframe。
    // 侧栏刚创建时 iframe 尚未加载完成，消息由视图排队、load 后补发
    async lookupInDictView(word) {
        if (!word) return;
        await this.sendToDictView({ type: 'wm-dict-word', word: word });
    }

    // 把消息交给右侧栏查词视图：先确保侧栏已展开，再推入其 iframe。
    // 侧栏刚创建时 iframe 尚未加载完成，消息由视图排队、load 后补发
    async sendToDictView(msg) {
        await this.activateDictView();
        this.app.workspace.getLeavesOfType(DICT_VIEW_TYPE).forEach((leaf) => {
            const view = leaf.view;
            if (view && typeof view.postToFrame === 'function') view.postToFrame(msg);
        });
    }

    // 划词翻译：编辑器选中的文本交给右侧栏承接（单词 → 首选词典释义，句子 → AI 翻译）
    translateSelection(text) {
        const t = String(text || '').trim();
        if (!t) return;
        this.sendToDictView({ type: 'wm-dict-translate', text: t });
    }
};
