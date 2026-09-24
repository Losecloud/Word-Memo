#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""web2ob.py — 把 reciting 的 web 应用核心压缩转化为 Obsidian 插件 word-memo 的轻量格式。

在 reciting 仓库根目录执行：
    python tools/web2ob.py             # 构建插件（不内嵌任何词典）
    python tools/web2ob.py --to-json all   # 把 data/ 顶层全部 *-dict.js 转为 *-dict.json

流程：
  1. 采集 web 应用核心（入口页 / 查词引擎页 / js / css / lib / static / data/internal）
  2. 打成自定义容器（WMB1）→ gzip → base64
  3. 生成 tools/word-memo/main.js = 内嵌包常量 + src/plugin.js 宿主源码
  4. 复制 styles.css，并把 main.js / styles.css / manifest.json 同步到
     .obsidian/plugins/word-memo/（Obsidian 实际加载目录）

全部词典（englishwords / oaldpe / collins / 牛津同义词 / 词根词缀 / youci 等）统一为
data/*-dict.json：纯数据、由 fetch + JSON.parse 读取、不进内嵌包，由用户在插件内按需下载。
"""

import argparse
import base64
import gzip
import json
import re
import struct
import sys
from datetime import date
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "tools" / "word-memo"
SRC_DIR = OUT_DIR / "src"
LIVE_DIR = ROOT / ".obsidian" / "plugins" / "word-memo"

ENTRY_FILE = "index - 词忆.html"
# 查词引擎页：入口页以 <iframe src="tools/browse-dict.html?mode=lookup"> 引用
ENGINE_FILE = "tools/browse-dict.html"
CONTAINER_MAGIC = b"WMB1"

RECITING_RAW = "https://raw.githubusercontent.com/Losecloud/reciting/main/data/"
WORD_MEMO_RELEASE = "https://github.com/Losecloud/word-memo/releases/download/"
# 承载超大词典（oaldpe，320MB，超出 GitHub 仓库单文件 100MB 限制）的 Release 标签
DICT_RELEASE_TAG = "dict-v1"

# 词典数据目录：安装候选清单，随 main.js 内嵌并在应用「AI 工坊」中展示。
# size 由构建时读取本地文件自动填充（进度条按它计算，不能用响应的 content-length——
# GitHub raw 对文本自动 gzip，该头部是压缩后大小，会导致进度算到 300%）。
# source：reciting = 从主仓库 raw 下载；release = 从 word-memo 的 Release 资产下载
# 全部条目均为 *-dict.json（纯数据，由 fetch + JSON.parse 读取，不经脚本执行）。
# 注意：只登记「用户可自行选装」的查词词典。词义分类 / word-roots 属应用内建数据
# （入口页硬编码引入，供场景类别筛选、AI 打标、词云词根连线使用），始终内嵌、不在此列
DICT_CATALOG = [
    {
        "file": "englishwords-dict.json",
        "varName": "ENGLISHWORDS_DICT",
        "label": "基础词典",
        # name：查词引擎词典清单里的显示名（引擎不读 catalog，故在此随清单一起下发）
        "name": "基础词典",
        "desc": "10.3 万条英汉词条，覆盖日常与学术词汇，作为默认兜底词库",
        "icon": "🔤",
        "source": "reciting",
    },
    {
        "file": "youci-dict.json",
        "varName": "YOUCI_DICT",
        "label": "优词词根",
        "desc": "优词词根词源词典，讲透单词的来龙去脉",
        "icon": "🔠",
        "source": "reciting",
    },
    {
        "file": "collins柯林斯英语同义词字典_collins_thesaurus_darkdickens-dict.json",
        "varName": "COLLINS柯林斯英语同义词字典_COLLINS_THESAURUS_DARKDICKENS_DICT",
        "label": "柯林斯同义词",
        "desc": "柯林斯英语同义词字典，扩展同义替换表达",
        "icon": "📚",
        "source": "reciting",
    },
    {
        "file": "牛津同义词词词典-dict.json",
        "varName": "牛津同义词词词典_DICT",
        "label": "牛津同义词",
        "desc": "牛津同义词词词典，辨析近义词差异",
        "icon": "📖",
        "source": "reciting",
    },
    {
        "file": "英语词根词缀词频-dict.json",
        "varName": "英语词根词缀词频_DICT",
        "label": "词根词缀词频",
        "desc": "按词根词缀拆解单词，附词频辅助记忆",
        "icon": "🧩",
        "source": "reciting",
    },
    {
        "file": "collins-dict.json",
        "varName": "COLLINS_DICT",
        "label": "柯林斯",
        "desc": "柯林斯高阶英汉词典，整句释义、语料地道",
        "icon": "📘",
        "source": "reciting",
    },
    {
        "file": "oaldpe-dict.json",
        "varName": "OALDPE_DICT",
        "label": "牛津10双解",
        "desc": "牛津高阶英汉双解词典（第10版），释义权威、例句丰富",
        "icon": "📕",
        "source": "release",
        "note": "体积较大（约 320MB），从 word-memo 的 Release 资产下载",
    },
]

# 整体纳入的目录
INCLUDE_DIRS = ("js", "css", "lib", "static/image", "static/cover")
# uicons 只保留 css 与 woff2（eot/woff/ttf 体积大且 Chromium 用不到）
UICONS_CSS_DIR = "static/flaticon-uicons-main/src/uicons/css"
UICONS_FONT_DIR = "static/flaticon-uicons-main/src/uicons/webfonts"
# 应用仅引用 regular/solid/bold/thin 的 rounded 变体（见入口页的 4 个 <link>）；
# straight 变体与 brands 在应用自身文件中零引用，故不打包（约省 2MB）
UICONS_STYLES = ("regular", "solid", "bold", "thin")

# 转换词典时超过此体积就跳过 json.loads 全量校验（oaldpe 约 320MB，解析要占数 GB 内存），
# 改为只做「整体是对象字面量」的结构检查
JSON_VALIDATE_LIMIT = 100 * 1024 * 1024


def convert_dict_to_json(name):
    """把 data/<name>-dict.js 转为 data/<name>-dict.json（剥离 var 前缀，只留纯 JSON）。

    JSON 版由 fetch + JSON.parse 加载，不执行远程代码，也不进内嵌包（按需下载）。
    变量名在 JSON 里无处存放，由 DICT_CATALOG / dict-manifest.js 另行记录。
    """
    src = ROOT / "data" / (name + "-dict.js")
    if not src.exists():
        raise SystemExit("源文件不存在：" + str(src))
    text = src.read_text(encoding="utf-8")
    m = re.search(r"var\s+[\w$]+\s*=\s*(\{[\s\S]*\})\s*;\s*$", text)
    if not m:
        raise SystemExit("未找到 var 赋值，无法转换：" + str(src))
    body = m.group(1).strip()
    if not (body.startswith("{") and body.endswith("}")):
        raise SystemExit("剥离 var 前缀后不是对象字面量：" + str(src))
    if len(body) <= JSON_VALIDATE_LIMIT:
        json.loads(body)  # 校验：必须是合法 JSON，否则应用侧 JSON.parse 会失败
    else:
        print("  （体积超过 %dMB，跳过全量 JSON 校验）" % (JSON_VALIDATE_LIMIT // 1048576))
    out = ROOT / "data" / (name + "-dict.json")
    out.write_text(body + "\n", encoding="utf-8")
    print("已生成 %s：%.2f MB（源 %.2f MB）"
          % (out.name, out.stat().st_size / 1048576, src.stat().st_size / 1048576))


def build_manifest():
    """生成内嵌包里的 data/dict-manifest.js：恒为空清单。

    发行版不内嵌任何词典（全部按需下载）。此文件仍需存在，好让查词引擎能区分
    「清单可用但为空」与「清单不可用」：前者会据此清掉 localStorage / IndexedDB 里
    跨 vault 残留的旧词典记录，否则陈旧缓存会伪装成「已安装」而绕开按需下载。
    用户下载的词典由 /save-dict 另行写回该文件，故清空不会误删已装词典。
    """
    return ("// 由 tools/web2ob.py 自动生成：发行版不内嵌词典，全部按需下载\n"
            "var DICT_MANIFEST = [];\n").encode("utf-8")


def sync_repo_manifest():
    """重建仓库 data/dict-manifest.js：列出随主仓库分发的词典（catalog 中 source=reciting）。

    GitHub Pages 等无 serve.js 的场景下，查词引擎 fetch /dict-list.json 会 404，
    转而回退读取本文件。只登记主仓库实际携带的词典——Release 专属（oaldpe）不列，
    否则页面上会出现选中却加载失败的条目。
    """
    entries = []
    for item in DICT_CATALOG:
        if item["source"] != "reciting" or not (ROOT / "data" / item["file"]).exists():
            continue
        entries.append({
            "file": item["file"],
            # 显示名优先取 catalog 的 name（如 englishwords → 基础词典），否则按文件名推导
            "name": item.get("name") or item["file"][:-len("-dict.json")],
            "varName": item["varName"],
        })
    text = ("// 自动生成：tools/web2ob.py 按 DICT_CATALOG 同步，请勿手改\n"
            "var DICT_MANIFEST = " + json.dumps(entries, ensure_ascii=False, indent=1) + ";\n")
    (ROOT / "data" / "dict-manifest.js").write_text(text, encoding="utf-8")
    return len(entries)


def build_dict_catalog():
    """生成 data/dict-catalog.js：应用内「词典数据」安装清单。

    与 dict-manifest.js 同为同步脚本（挂 window.DICT_CATALOG），使工坊卡片渲染无需改为异步。
    同时写入仓库（供 web 版读取）并内嵌进 main.js（供 Obsidian 版读取）。
    size 取本地文件真实字节数：进度条按它计算，不能用响应头 content-length——
    GitHub raw 对文本自动 gzip，该头部是压缩后大小，会导致进度算到 300%。
    """
    dicts = []
    for item in DICT_CATALOG:
        entry = dict(item)
        source = entry.pop("source")
        local = ROOT / "data" / item["file"]
        entry["size"] = local.stat().st_size if local.exists() else 0
        if source == "release":
            entry["url"] = WORD_MEMO_RELEASE + DICT_RELEASE_TAG + "/" + quote(item["file"])
        else:
            entry["url"] = RECITING_RAW + quote(item["file"])
        dicts.append(entry)
    doc = {"updated": date.today().isoformat(), "dicts": dicts}
    text = ("// 由 tools/web2ob.py 自动生成：词典数据安装清单（AI 工坊「词典」类目按此渲染）\n"
            "var DICT_CATALOG = " + json.dumps(doc, ensure_ascii=False, indent=1) + ";\n")
    data = text.encode("utf-8")
    (ROOT / "data" / "dict-catalog.js").write_bytes(data)
    return data


def collect():
    """采集需要内嵌的文件，返回 [(相对路径, bytes), ...]，相对路径统一用 / 分隔"""
    items = []

    def add(rel, data):
        items.append((str(rel).replace("\\", "/"), data))

    def add_file(p):
        add(p.relative_to(ROOT), p.read_bytes())

    add_file(ROOT / ENTRY_FILE)
    add_file(ROOT / ENGINE_FILE)

    for d in INCLUDE_DIRS:
        for p in sorted((ROOT / d).rglob("*")):
            if p.is_file():
                add_file(p)

    for style in UICONS_STYLES:
        add_file(ROOT / UICONS_CSS_DIR / style / "rounded.css")
        add_file(ROOT / UICONS_FONT_DIR / ("uicons-%s-rounded.woff2" % style))

    # data/ 顶层是词典目录：全部为按需下载的 *-dict.json，一律不内嵌
    # （内嵌会把整本词典塞进 main.js，与瘦身目标冲突）；该目录下 oaldpe 资源目录约 4GB，不遍历。

    # data/internal/ = 应用内建数据（词单、分类树、词根表），由入口页硬编码引入，
    # 是场景类别筛选/AI 打标/词云词根连线的硬依赖，必须内嵌。
    # 它们不进 dict-manifest——那是查词引擎的词库清单，收进去会出现选中却查不到词的死条目
    for p in sorted((ROOT / "data" / "internal").rglob("*")):
        if p.is_file():
            add_file(p)

    add("data/dict-manifest.js", build_manifest())
    add("data/dict-catalog.js", build_dict_catalog())
    return items


def pack(items):
    """自定义容器：MAGIC(4) + 条目数(4) + [路径长(2) 路径 内容长(4) 内容] * N"""
    buf = bytearray(CONTAINER_MAGIC)
    buf += struct.pack(">I", len(items))
    for rel, data in items:
        name = rel.encode("utf-8")
        buf += struct.pack(">H", len(name)) + name
        buf += struct.pack(">I", len(data)) + data
    return bytes(buf)


def main():
    ap = argparse.ArgumentParser(description="reciting(web) → word-memo(Obsidian) 压缩转化")
    ap.add_argument("--to-json", metavar="NAME[,NAME...]",
                    help="把 data/<NAME>-dict.js 转成同名 .json 后退出；"
                         "all = 转换 data/ 顶层全部 -dict.js（可逗号分隔多个）")
    args = ap.parse_args()

    if args.to_json:
        names = [n.strip() for n in args.to_json.split(",") if n.strip()]
        if names == ["all"]:
            names = sorted(p.name[:-len("-dict.js")] for p in (ROOT / "data").iterdir()
                           if p.is_file() and p.name.endswith("-dict.js"))
        for n in names:
            convert_dict_to_json(n)
        return 0

    sync_repo_manifest()  # 仓库清单：GitHub Pages 无 serve.js 时由查词引擎回退读取

    manifest = json.loads((OUT_DIR / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]

    items = collect()
    raw = pack(items)
    blob = base64.b64encode(gzip.compress(raw, 9)).decode("ascii")

    source = (SRC_DIR / "plugin.js").read_text(encoding="utf-8")
    header = (
        "/*\n"
        " * 词忆 (Word Memo) — Obsidian 插件。本文件由 tools/web2ob.py 自动生成，请勿手改。\n"
        " *\n"
        " * WM_APP_BUNDLE 是「词忆」web 应用（入口页 / js / css / lib / static / 核心 data）的打包产物：\n"
        " * 先按 WMB1 容器格式顺序拼接，再 gzip 压缩，最后 base64 编码为单个字符串常量。\n"
        " * 其中不含加密或混淆，仅为把多文件应用合并成一个可随插件分发的字符串；\n"
        " * 运行时由 extractAppBundle() 解压到 vault 的 .word-memo/ 目录，再经本地 127.0.0.1 服务加载。\n"
        " *\n"
        " * 可读源码：\n"
        " *   宿主逻辑  tools/word-memo/src/plugin.js\n"
        " *   应用源码  https://github.com/Losecloud/reciting\n"
        " *   构建脚本  tools/web2ob.py（可复现本文件）\n"
        " */\n"
        "const WM_APP_VERSION = " + json.dumps(version) + ";\n"
        "const WM_APP_BUNDLE = " + json.dumps(blob) + ";\n"
        "// ======== 以下为宿主源码（与 tools/word-memo/src/plugin.js 逐字节一致）========\n"
    )
    (OUT_DIR / "main.js").write_text(header + source, encoding="utf-8")
    (OUT_DIR / "styles.css").write_bytes((SRC_DIR / "styles.css").read_bytes())

    LIVE_DIR.mkdir(parents=True, exist_ok=True)
    for name in ("main.js", "styles.css", "manifest.json"):
        (LIVE_DIR / name).write_bytes((OUT_DIR / name).read_bytes())

    total = sum(len(d) for _, d in items)
    print("已打包 %d 个文件：原始 %.1f MB → gzip %.1f MB → 内嵌(base64) %.1f MB"
          % (len(items), total / 1048576, len(gzip.compress(raw, 9)) / 1048576, len(blob) / 1048576))
    print("  产物：%s" % (OUT_DIR / "main.js"))
    print("  同步：%s" % LIVE_DIR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
