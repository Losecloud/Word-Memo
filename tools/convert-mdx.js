#!/usr/bin/env node
// ============================================================
// MDX → JS 词典转换工具（一次性）
// 支持 MDX v1.2（LZO1X 压缩 key block）与 v2.0（zlib 压缩 +
// 高位加密 RIPEMD-128）格式，输出为词忆可用的全局 JS 数据文件。
//
// 用法: node tools/convert-mdx.js <input.mdx> <output.js> [--key <字段名>] [--value <phon|mean|defs>]
//
// 注意：LZO 需 pure-LZO 实现（本文件内置 lzo1x_decompress），
// RIPEMD-128 为内置实现（用于解密 v2.0 的 key-block-info）。
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const miniLZO = require('./_minilzo-decompress.js');
const ripemd128Ref = require('./_ripemd128.js');

// RIPEMD-128：输入 Uint8Array，返回 16 字节 Uint8Array（参考实现）
function ripemd128(buf) {
  const input = buf instanceof Uint8Array ? buf : Uint8Array.from(buf);
  return ripemd128Ref(input);
}

// ---------------- Adler-32 ----------------
function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// ---------------- LZO1X 解压（封装 minilzo-decompress.js） ----------------
function lzo1xDecompressSafe(src, outLen) {
  // 输入必须是 Uint8Array / ArrayBuffer
  const input = src instanceof Uint8Array ? src : Uint8Array.from(src);
  const out = miniLZO.decompress(input, { initSize: Math.max(outLen || input.length, 8192), blockSize: 1308672 });
  // 转回 Buffer 以便使用 indexOf/subarray/toString 等 Buffer API
  return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

// ---------------- MDX 解密（v2 高位加密） ----------------
// key = ripemd128(comp_block[4:8] + little-endian 0x3695)
// 然后对 block[8:] 进行 fast_decrypt
function mdxDecrypt(compBlock) {
  const keyBuf = Buffer.alloc(4);
  keyBuf.writeUInt32LE(0x3695, 0);
  const key = ripemd128(Buffer.concat([compBlock.subarray(4, 8), keyBuf]));
  const b = Buffer.from(compBlock);
  const prev = new Uint8Array([0x36]);
  for (let i = 8; i < b.length; i++) {
    const j = i - 8; // _fast_decrypt 中的位置从 0 开始（相对解密数据段）
    const orig = b[i];
    let t = ((orig >> 4) | (orig << 4)) & 0xff;
    t = (t ^ prev[0] ^ (j & 0xff) ^ key[j % key.length]) & 0xff;
    prev[0] = orig;
    b[i] = t;
  }
  return b;
}

// ---------------- 头部解析 ----------------
function parseHeader(buf) {
  let o = 0;
  const hlen = buf.readUInt32BE(o); o += 4;
  const hbytes = buf.subarray(o, o + hlen); o += hlen;
  const ck = buf.readUInt32LE(o); o += 4;
  const htext = hbytes.toString('utf16le').replace(/\x00+$/, '');
  const attrs = {};
  const re = /(\w+)="(.*?)"/gs;
  let m;
  while ((m = re.exec(htext))) attrs[m[1]] = m[2];
  return { attrs, offset: o };
}

// ---------------- 主转换 ----------------
function convert(inputFile, outputFile, keyVar, valueMode) {
  const buf = fs.readFileSync(inputFile);
  const { attrs, offset: o0 } = parseHeader(buf);

  const version = parseFloat(attrs.GeneratedByEngineVersion || '1.2');
  const nw = version >= 2 ? 8 : 4;
  const enc = (attrs.Encoding || 'UTF-8').toUpperCase();
  const encrypted = attrs.Encrypted && attrs.Encrypted !== 'No' ? parseInt(attrs.Encrypted, 10) || 0 : 0;

  console.log(`[${path.basename(inputFile)}]`);
  console.log(`  version=${version} encoding=${enc} encrypted=${encrypted} compact=${attrs.Compact}`);

  const rd = (o, n, src) => {
    const b = src || buf;
    if (n === 8) {
      // readUIntBE 不支持 8 字节，手动读取高 4 字节 + 低 4 字节
      return b.readUInt32BE(o) * 4294967296 + b.readUInt32BE(o + 4);
    }
    return b.readUIntBE(o, n);
  };
  let o = o0;

  let numKeyBlocks, numEntries, kbInfoSize, kbSize, kbInfoDecompSize;
  if (version >= 2) {
    numKeyBlocks = rd(o, nw); o += nw;
    numEntries = rd(o, nw); o += nw;
    kbInfoDecompSize = rd(o, nw); o += nw;
    kbInfoSize = rd(o, nw); o += nw;
    kbSize = rd(o, nw); o += nw;
    const ck = buf.readUInt32BE(o); o += 4;
    if (ck !== adler32(buf.subarray(o0, o - 4))) throw new Error('5-num adler32 mismatch');
  } else {
    numKeyBlocks = rd(o, nw); o += nw;
    numEntries = rd(o, nw); o += nw;
    kbInfoSize = rd(o, nw); o += nw;
    kbSize = rd(o, nw); o += nw;
  }
  console.log(`  blocks=${numKeyBlocks} entries=${numEntries} kbInfoSize=${kbInfoSize} kbSize=${kbSize}`);

  // ---- key block info ----
  const kbInfoRaw = buf.subarray(o, o + kbInfoSize); o += kbInfoSize;
  let kbInfo;
  if (version >= 2) {
    const type = kbInfoRaw.readUInt32LE(0);
    const cka = kbInfoRaw.readUInt32BE(4);
    let raw = kbInfoRaw;
    if (encrypted & 2) raw = mdxDecrypt(kbInfoRaw);
    if (type === 2) {
      kbInfo = zlib.inflateSync(raw.subarray(8));
    } else if (type === 0) {
      kbInfo = raw.subarray(8);
    } else {
      kbInfo = lzo1xDecompressSafe(raw.subarray(8), kbInfoDecompSize);
    }
    if (cka !== adler32(kbInfo)) console.warn('  WARN: kbInfo adler mismatch');
  } else {
    kbInfo = kbInfoRaw; // v1.2 未压缩
  }

  // ---- 解析 key block info 列表 ----
  const isUTF16 = enc === 'UTF-16';
  const w = version >= 2 ? 2 : 1;       // 首尾词长度字段宽度（v1 为 1 字节）
  const term = version >= 2 ? 1 : 0;    // 终止符（v2 有）
  const mult = isUTF16 ? 2 : 1;
  const blocks = [];
  let i = 0, cnt = 0;
  while (i < kbInfo.length && blocks.length < numKeyBlocks) {
    cnt += rd(i, nw, kbInfo); i += nw;
    const hsz = kbInfo.readUIntBE(i, w); i += w;
    i += (hsz + term) * mult;
    const tsz = kbInfo.readUIntBE(i, w); i += w;
    i += (tsz + term) * mult;
    const cs = rd(i, nw, kbInfo); i += nw;
    const ds = rd(i, nw, kbInfo); i += nw;
    blocks.push([cs, ds]);
  }
  if (cnt !== numEntries) console.warn(`  WARN: entries count ${cnt} != ${numEntries}`);
  console.log(`  parsed block infos: ${blocks.length}`);

  // ---- 解析 key blocks ----
  const kbs = buf.subarray(o, o + kbSize); o += kbSize;
  const keys = []; // {id, text}
  for (let bi = 0; bi < blocks.length; bi++) {
    const [cs, ds] = blocks[bi];
    const start = bi === 0 ? 0 : blocks.slice(0, bi).reduce((s, b) => s + b[0], 0);
    const blk = kbs.subarray(start, start + cs);
    const type = blk.readUInt32LE(0);
    const cka = blk.readUInt32BE(4);
    let dec;
    if (type === 0) dec = blk.subarray(8);
    else if (type === 2) dec = zlib.inflateSync(blk.subarray(8));
    else if (type === 1) dec = lzo1xDecompressSafe(blk.subarray(8), ds);
    else throw new Error(`unknown key block type ${type}`);
    if (cka !== adler32(dec)) console.warn(`  WARN: key block ${bi} adler mismatch`);
    // split: [id][text][0x00]
    let p = 0;
    const delim = isUTF16 ? Buffer.from([0, 0]) : Buffer.from([0]);
    while (p < dec.length) {
      // v1: id 为 4 字节大端；v2: id 为 8 字节大端
      const id = isUTF16 ? dec.readUInt16LE(p) : rd(p, nw, dec);
      p += nw;
      const di = dec.indexOf(delim, p);
      if (di < 0) break;
      let text = dec.subarray(p, di).toString(isUTF16 ? 'utf16le' : 'utf8');
      text = text.replace(/\x00+$/, '');
      keys.push({ id, text });
      p = di + delim.length;
    }
  }
  console.log(`  key count: ${keys.length}`);

  // ---- record block info ----
  const numRecordBlocks = rd(o, nw); o += nw;
  const numRecordEntries = rd(o, nw); o += nw;
  let recInfoSize, recSize;
  if (version >= 2) {
    recInfoSize = rd(o, nw); o += nw;
    recSize = rd(o, nw); o += nw;
  } else {
    recInfoSize = rd(o, nw); o += nw;
    recSize = rd(o, nw); o += nw;
  }
  const recInfos = [];
  for (let k = 0; k < numRecordBlocks; k++) {
    const cs = rd(o, nw); o += nw;
    const ds = rd(o, nw); o += nw;
    recInfos.push([cs, ds]);
  }
  console.log(`  record blocks=${numRecordBlocks} recInfoSize=${recInfoSize} recSize=${recSize}`);

  // ---- 解析 record blocks 并映射 ----
  // key.id 是词条在“全部 record 数据拼接流”中的字节偏移，
  // record block 按顺序拼接起来即该数据流，因此直接按 id 切分。
  const recStart = o;
  const recData = Buffer.concat(recInfos.map(([, ds], bi) => {
    const start = bi === 0 ? 0 : recInfos.slice(0, bi).reduce((s, b) => s + b[0], 0);
    const blk = buf.subarray(recStart + start, recStart + start + recInfos[bi][0]);
    const type = blk.readUInt32LE(0);
    const cka = blk.readUInt32BE(4);
    let dec;
    if (type === 0) dec = blk.subarray(8);
    else if (type === 2) dec = zlib.inflateSync(blk.subarray(8));
    else if (type === 1) dec = lzo1xDecompressSafe(blk.subarray(8), recInfos[bi][1]);
    else throw new Error(`unknown record block type ${type}`);
    if (cka !== adler32(dec)) console.warn(`  WARN: record block ${bi} adler mismatch`);
    return dec;
  }));

  const dict = {};
  for (let ki = 0; ki < keys.length; ki++) {
    const k = keys[ki];
    if (k.id < 0 || k.id >= recData.length) {
      if (k.id >= recData.length) break;
      continue;
    }
    const start = k.id;
    const end = ki + 1 < keys.length ? keys[ki + 1].id : recData.length;
    if (end > recData.length) break;
    let text = recData.subarray(start, end).toString('utf8');
    text = text.replace(/\x00+$/, '');
    if (text) dict[k.text] = text;
  }

  console.log(`  decoded entries: ${Object.keys(dict).length}`);

  // ---- 输出 ----
  const out = `// 由 MDX 自动导出：${path.basename(inputFile)}\n// 转换时间: ${new Date().toISOString()}\nvar ${keyVar} = ${JSON.stringify(dict)};\n`;
  fs.writeFileSync(outputFile, out, 'utf8');
  console.log(`  → ${outputFile} (${(fs.statSync(outputFile).size / 1048576).toFixed(2)} MB)`);

  updateManifest();
}

// ---- MDD 资源提取 ----
// 用法: node tools/convert-mdx.js --mdd <input.mdd> --outdir <data/<词典名>>
// MDD 与 MDX 结构相同，但：
//  - v2.0 key block 内记录 id 为 8 字节大端；key 文本为 UTF-16（含终止空码元）
//  - kbInfo 中 head/tail 长度按 UTF-16 计（乘 2），终止符也为空码元
// 提取结果：资源路径（如 \accordion_concertina.png）→ 写入 outdir 对应文件
function extractMdd(inputMdd, outDir) {
  // 大文件（>2GB）用文件句柄分段读取，避免 Buffer 大小上限
  const fd = fs.openSync(inputMdd, 'r');
  function readAt(pos, len) {
    const b = Buffer.alloc(len);
    let off = 0;
    while (off < len) {
      const n = fs.readSync(fd, b, off, len - off, pos + off);
      if (n <= 0) break;
      off += n;
    }
    return b;
  }
  const rd = (o, n, src) => {
    if (src) {
      if (n === 8) return src.readUInt32BE(o) * 4294967296 + src.readUInt32BE(o + 4);
      return src.readUIntBE(o, n);
    }
    const b = readAt(o, n);
    if (n === 8) return b.readUInt32BE(0) * 4294967296 + b.readUInt32BE(4);
    return b.readUIntBE(0, n);
  };
  // 头部
  const hlen = readAt(0, 4).readUInt32BE(0);
  const hbytes = readAt(4, hlen);
  const attrs = {};
  const re = /(\w+)="(.*?)"/gs;
  let m;
  const htext = hbytes.toString('utf16le').replace(/\u0000+$/, '');
  while ((m = re.exec(htext))) attrs[m[1]] = m[2];
  const version = parseFloat(attrs.GeneratedByEngineVersion || '1.2');
  const nw = version >= 2 ? 8 : 4;
  const encrypted = attrs.Encrypted && attrs.Encrypted !== 'No' ? parseInt(attrs.Encrypted, 10) || 0 : 0;
  console.log(`[MDD] ${path.basename(inputMdd)}  version=${version} encrypted=${encrypted}`);

  let o = 4 + hlen + 4; // 头部文本 + adler32
  let numKeyBlocks, numEntries, kbInfoDecompSize, kbInfoSize, kbSize;
  if (version >= 2) {
    numKeyBlocks = rd(o, nw); o += nw;
    numEntries = rd(o, nw); o += nw;
    kbInfoDecompSize = rd(o, nw); o += nw;
    kbInfoSize = rd(o, nw); o += nw;
    kbSize = rd(o, nw); o += nw;
    o += 4;
  } else {
    numKeyBlocks = rd(o, nw); o += nw;
    numEntries = rd(o, nw); o += nw;
    kbInfoSize = rd(o, nw); o += nw;
    kbSize = rd(o, nw); o += nw;
  }
  console.log(`  blocks=${numKeyBlocks} entries=${numEntries}`);

  // kbInfo（v2 需解密 + zlib）
  const kbInfoRaw = readAt(o, kbInfoSize); o += kbInfoSize;
  let kbInfoData;
  if (version >= 2) {
    let raw = kbInfoRaw;
    if (encrypted & 2) raw = mdxDecrypt(kbInfoRaw);
    const type = raw.readUInt32LE(0);
    if (type === 2) kbInfoData = zlib.inflateSync(raw.subarray(8));
    else if (type === 0) kbInfoData = raw.subarray(8);
    else kbInfoData = lzo1xDecompressSafe(raw.subarray(8), kbInfoDecompSize);
  } else {
    kbInfoData = kbInfoRaw;
  }

  // 解析 block info（MDD 的 head/tail 为 UTF-16：长度乘 2、含空码元终止）
  const w = version >= 2 ? 2 : 1;
  const term = version >= 2 ? 1 : 0;
  const mult = 2; // MDD key 恒为 UTF-16
  const blocks = [];
  let i = 0, cnt = 0;
  while (i < kbInfoData.length && blocks.length < numKeyBlocks) {
    cnt += rd(i, nw, kbInfoData); i += nw;
    const hsz = rd(i, w, kbInfoData); i += w;
    i += (hsz + term) * mult;
    const tsz = rd(i, w, kbInfoData); i += w;
    i += (tsz + term) * mult;
    const cs = rd(i, nw, kbInfoData); i += nw;
    const ds = rd(i, nw, kbInfoData); i += nw;
    blocks.push([cs, ds]);
  }
  if (cnt !== numEntries) console.warn(`  WARN: entries ${cnt} != ${numEntries}`);

  // key blocks：每条 = id(大端) + key(UTF-16, 空码元终止)
  const kbs = readAt(o, kbSize); o += kbSize;
  const entries = []; // {id, path}
  let kbPos = 0;
  for (let bi = 0; bi < blocks.length; bi++) {
    const [cs, ds] = blocks[bi];
    const blk = kbs.subarray(kbPos, kbPos + cs); kbPos += cs;
    const type = blk.readUInt32LE(0);
    let dec;
    if (type === 0) dec = blk.subarray(8);
    else if (type === 2) dec = zlib.inflateSync(blk.subarray(8));
    else if (type === 1) dec = lzo1xDecompressSafe(blk.subarray(8), ds);
    else throw new Error(`unknown key block type ${type}`);
    let p = 0;
    while (p + nw <= dec.length) {
      const id = rd(p, nw, dec); p += nw;
      // 找空码元（按 2 字节步进，避免 ASCII 字符尾字节 0x00 误判）
      let di = -1;
      for (let q = p; q + 1 < dec.length; q += 2) {
        if (dec.readUInt16LE(q) === 0) { di = q; break; }
      }
      if (di < 0) break;
      const t = dec.subarray(p, di).toString('utf16le').replace(/\u0000+$/, '');
      entries.push({ id, path: t });
      p = di + 2;
    }
  }
  console.log(`  key count: ${entries.length}`);

  // record 区
  const numRecordBlocks = rd(o, nw); o += nw;
  rd(o, nw); o += nw; // numRecordEntries
  rd(o, nw); o += nw; // recInfoSize
  rd(o, nw); o += nw; // recSize
  const recInfos = [];
  for (let k = 0; k < numRecordBlocks; k++) {
    const cs = rd(o, nw); o += nw;
    const ds = rd(o, nw); o += nw;
    recInfos.push([cs, ds]);
  }
  const recStart = o;
  console.log(`  record blocks=${recInfos.length} size=${(recInfos.reduce((s, x) => s + x[1], 0) / 1048576).toFixed(1)} MB`);

  // 写入资源文件（按记录块流式处理：解压一块 → 提取该块覆盖的词条，避免超大文件整体拼接超 Buffer 上限）
  fs.mkdirSync(outDir, { recursive: true });
  let written = 0, bad = 0;
  let recPos = 0, cum = 0, ki = 0;
  for (let bi = 0; bi < recInfos.length; bi++) {
    const [cs, ds] = recInfos[bi];
    const blk = readAt(recStart + recPos, cs); recPos += cs;
    const type = blk.readUInt32LE(0);
    let dec;
    if (type === 0) dec = blk.subarray(8);
    else if (type === 2) dec = zlib.inflateSync(blk.subarray(8));
    else if (type === 1) dec = lzo1xDecompressSafe(blk.subarray(8), ds);
    else throw new Error(`unknown record block type ${type}`);
    const blockEnd = cum + dec.length;
    // 词条 id 为记录流内绝对偏移，按块顺序处理即可覆盖本块对应词条
    while (ki < entries.length && entries[ki].id < blockEnd) {
      const e = entries[ki];
      const start = e.id - cum;
      if (start < 0 || start >= dec.length) { bad++; ki++; continue; }
      const end = (ki + 1 < entries.length && entries[ki + 1].id < blockEnd) ? entries[ki + 1].id - cum : dec.length;
      if (end > dec.length) { bad++; ki++; continue; }
      const data = dec.subarray(start, end);
      const rel = e.path.replace(/^\\+/, '').replace(/\\/g, '/'); // \images\x.png → images/x.png
      if (rel && rel !== '.') {
        const fp = path.join(outDir, rel);
        fs.mkdirSync(path.dirname(fp), { recursive: true });
        fs.writeFileSync(fp, data);
        written++;
      }
      ki++;
    }
    cum = blockEnd;
  }
  fs.closeSync(fd);
  console.log(`  → 提取 ${written} 个资源到 ${outDir}（跳过 ${bad}）`);
  return { extracted: written, dirName: path.basename(outDir) };
}

// ---- 自动维护 data/dict-manifest.js（供浏览页 file:// 双击模式动态加载） ----
function updateManifest(mddDirs) {
  const dataDir = path.join(__dirname, '..', 'data');
  const VAR_RE = /var\s+([A-Za-z_$][\w$]*)\s*=\s*\{/;
  const list = [];
  if (fs.existsSync(dataDir)) {
    for (const f of fs.readdirSync(dataDir)) {
      if (!/^[\w\-（）()]+-dict\.js$/i.test(f) || f === 'dict-manifest.js') continue;
      let head = '';
      try { head = fs.readFileSync(path.join(dataDir, f), 'utf8').slice(0, 4096); } catch (e) { continue; }
      const m = VAR_RE.exec(head);
      if (!m) continue;
      const item = { file: f, name: f.replace(/-dict\.js$/i, ''), varName: m[1] };
      // 关联同名资源目录（若 data/<name>/ 是目录）
      const cand = path.join(dataDir, item.name);
      if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) item.mdd = item.name;
      list.push(item);
    }
  }
  // 允许外部显式传入资源目录
  if (mddDirs) for (const d of mddDirs) {
    const it = list.find(x => x.name === d);
    if (it) it.mdd = d;
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  const out = `// 自动生成：tools/convert-mdx.js 在转换时更新，请勿手改\nvar DICT_MANIFEST = ${JSON.stringify(list, null, 1)};\n`;
  fs.writeFileSync(path.join(dataDir, 'dict-manifest.js'), out, 'utf8');
  console.log(`  manifest: data/dict-manifest.js (${list.length} 本词典)`);
}

// ---------------- CLI ----------------
const args = process.argv.slice(2);
// MDD 提取模式: --mdd <input.mdd> --outdir <dir>
const mddIdx = args.indexOf('--mdd');
if (mddIdx >= 0) {
  const mddFile = args[mddIdx + 1];
  const outIdx = args.indexOf('--outdir');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : null;
  if (!mddFile || !outDir) {
    console.error('用法: node tools/convert-mdx.js --mdd <input.mdd> --outdir <data/词典目录>');
    process.exit(1);
  }
  try {
    const r = extractMdd(mddFile, outDir);
    updateManifest([r.dirName]);
  } catch (e) {
    console.error('MDD 提取失败:', e.message);
    if (e.stack) console.error(e.stack.split('\n').slice(0, 6).join('\n'));
    process.exit(1);
  }
  process.exit(0);
}

const input = args[0];
const output = args[1];
let keyVar = 'YOUCI_DICT';
let valueMode = 'defs';
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--key' && args[i + 1]) { keyVar = args[i + 1]; i++; }
  if (args[i] === '--value' && args[i + 1]) { valueMode = args[i + 1]; i++; }
}
if (!input || !output) {
  console.error('用法: node tools/convert-mdx.js <input.mdx> <output.js> [--key NAME] [--value phon|mean|defs]');
  console.error('  MDD 资源: node tools/convert-mdx.js --mdd <input.mdd> --outdir <data/词典目录>');
  process.exit(1);
}
try {
  convert(input, output, keyVar, valueMode);
} catch (e) {
  console.error('转换失败:', e.message);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 6).join('\n'));
  process.exit(1);
}
