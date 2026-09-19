// 词忆词典浏览服务器
// 用法: node tools/serve.js [port]（默认 8377）
// 功能:
//  1. 扫描 data/ 目录下所有 *-dict.js 词典文件，供浏览页动态加载
//  2. 提供 /dict-list.json 接口返回词典清单 {name, varName, file, size, count}
//  3. 静态文件服务（浏览页/词典脚本）
//  4. 提供 POST /weread 转发微信读书官方 Agent Gateway（供「英文原著榜」拉取热门划线，密钥经 X-Weread-Key 头传入）
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PORT = parseInt(process.argv[2], 10) || 8377;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json; charset=utf-8'
};

// 从 JS 文件头部提取全局变量名：var XXX_DICT = {...}（兼容中文变量名）
const VAR_RE = /var\s+([\p{L}_$][\p{L}\p{N}_$]*)\s*=\s*\{/u;

// CORS：允许 file:// 直接打开浏览页时也能调用本服务的保存接口
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Weread-Key');
}

function sanitizeVarName(varName) {
  return String(varName || '')
    .replace(/[^\p{L}\p{N}_-]/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'DICT';
}
// 与浏览器端一致的文件名：varName 去 _DICT 后缀 → 小写 + -dict.js
function fnameOf(varName) {
  return sanitizeVarName(varName).replace(/_DICT$/i, '').toLowerCase() + '-dict.js';
}

// 重建 dict-manifest.js（扫描 data/ 下所有 *-dict.js）
function rebuildManifest() {
  if (!fs.existsSync(DATA_DIR)) return 0;
  const list = [];
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (!/^.+?-dict\.js$/i.test(f) || f === 'dict-manifest.js') continue;
    const fp = path.join(DATA_DIR, f);
    let head = '';
    try { head = fs.readFileSync(fp, 'utf8').slice(0, 4096); } catch (e) { continue; }
    const m = VAR_RE.exec(head);
    if (!m) continue;
    list.push({ file: f, name: f.replace(/-dict\.js$/i, ''), varName: m[1] });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  const out = '// 自动生成：浏览器导入或 tools/convert-mdx.js 更新，请勿手改\nvar DICT_MANIFEST = ' + JSON.stringify(list, null, 1) + ';\n';
  fs.writeFileSync(path.join(DATA_DIR, 'dict-manifest.js'), out, 'utf8');
  return list.length;
}

function scanDicts() {
  if (!fs.existsSync(DATA_DIR)) return [];
  const list = [];
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (!/^.+?-dict\.js$/i.test(f)) continue;
    const fp = path.join(DATA_DIR, f);
    let head = '';
    try { head = fs.readFileSync(fp, 'utf8').slice(0, 4096); } catch (e) { continue; }
    const m = VAR_RE.exec(head);
    if (!m) continue;
    const stat = fs.statSync(fp);
    const item = {
      file: f,
      name: f.replace(/-dict\.js$/i, ''),
      varName: m[1],
      size: stat.size,
      url: '/data/' + encodeURIComponent(f)
    };
    // 关联同名资源目录（若 data/<name>/ 是目录）
    const cand = path.join(DATA_DIR, item.name);
    if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) item.mdd = item.name;
    list.push(item);
  }
  return list;
}

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);

  // CORS 预检
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }
  cors(res);

  if (url === '/' ) url = '/tools/browse-dict.html';

  if (url === '/dict-list.json') {
    const list = scanDicts();
    res.writeHead(200, { 'Content-Type': MIME['.json'] });
    res.end(JSON.stringify(list));
    return;
  }

  // 微信读书 Agent Gateway 转发：POST /weread
  // 请求体为官方网关的 JSON（{"api_name":"/store/search", ...业务参数}），密钥经 X-Weread-Key 头传入。
  // 官方网关 https://i.weread.qq.com/api/agent/gateway 的 CORS 仅放行 weread.qq.com，
  // 浏览器无法直连，故由本服务代填 Authorization 后转发。
  if (url === '/weread') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      const key = String(req.headers['x-weread-key'] || '').trim();
      if (key.indexOf('wrk-') !== 0) {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ errcode: -1, errmsg: '缺少微信读书 API Key（X-Weread-Key，格式 wrk-xxxxxxxx）' }));
        return;
      }
      const up = require('https').request('https://i.weread.qq.com/api/agent/gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
          'Content-Length': Buffer.byteLength(body)
        }
      }, upstream => {
        res.writeHead(upstream.statusCode || 502, { 'Content-Type': 'application/json; charset=utf-8' });
        upstream.pipe(res);
      });
      up.on('error', e => {
        res.writeHead(502, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ errcode: -1, errmsg: '转发微信读书失败: ' + e.message }));
      });
      up.end(body);
    });
    return;
  }

  // 保存词典到 data/ 目录：{varName, content} → 写入 data/<fname> 并重建 dict-manifest.js
  if (req.method === 'POST' && url === '/save-dict') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 500 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const { varName, content } = JSON.parse(body);
        if (!varName || typeof content !== 'string') throw new Error('参数缺失');
        const fname = fnameOf(varName);
        fs.writeFileSync(path.join(DATA_DIR, fname), content, 'utf8');
        const count = rebuildManifest();
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: true, file: fname, count: count }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': MIME['.json'] });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  const fp = path.join(ROOT, url);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('词忆词典浏览: http://localhost:' + PORT + '/');
  console.log('已检测词典: ' + scanDicts().map(d => d.name).join(', ') || '（无）');
});
