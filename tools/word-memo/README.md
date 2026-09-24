# 词忆 (Word Memo)

Look up words and translate selected text from notes and PDFs, backed by an in-app dictionary, semantic word nebula, spaced repetition review, and AI explanations.

词忆是一款专攻难词、趣味高效的单词记忆工具，并深度集成到 Obsidian：悬浮取词、划词翻译、右侧栏查词。

## Features

- **Hover lookup** — hover a word in a note or a text-based PDF and it is sent to the 词忆 sidebar.
- **Selection translate** — select a word for its dictionary entry, or a sentence for an AI translation. Works in Markdown notes and PDFs (floating button and right-click menu).
- **Sidebar lookup** — a dedicated 词忆 panel in the right sidebar, powered by the built-in dictionary engine.
- **Full app view** — open the complete 词忆 app (word books, semantic word nebula, review, AI workshop) in a tab.

## Requirements

- Obsidian **1.4.0** or newer, on desktop (Windows / macOS / Linux).
- No extra files needed: the 词忆 app is bundled inside `main.js`. On first run the plugin extracts it to `.word-memo/` in your vault and serves it through a local `127.0.0.1` server, so the app runs in a proper origin and can store its configuration.

## Installation

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Put them in `<your-vault>/.obsidian/plugins/word-memo/`.
3. Enable **word-memo** in **Settings → Community plugins**.

## Usage

| Action | How |
| --- | --- |
| Open the 词忆 sidebar | Click the search icon in the ribbon, or run the **查单词（词忆）** command |
| Open the full app | Click the layers icon in the ribbon, or run the **打开词忆 Word Memo** command |
| Look up a word | Hover it in a note or PDF, or select it and use the floating button / right-click **查询** |
| Translate a sentence | Select the sentence and use the floating button / right-click **查询** |

Hover lookup and selection translate can be turned off in **Settings → word-memo**.

## Dictionary data

This plugin ships **without** dictionary data. The built-in engine covers the core lookup flow; larger
词典数据 packs (Oxford, Collins, word roots, synonym lists, …) are optional. Open **AI 工坊 → 词典**
inside the plugin and click **下载** on the pack you want: it is fetched from this project's public
GitHub repository (or, for the largest Oxford pack, from the `word-memo` release assets), written to
`.word-memo/data/` inside your vault, and enabled automatically.

Each pack is a single **JSON data file** (`<name>-dict.json`) containing dictionary text only. It is read
with `fetch` + `JSON.parse` — never executed as code — and it is stored locally and never uploaded
anywhere. The filename maps to a dictionary variable name (e.g. `collins-dict.json` → `COLLINS_DICT`),
which is recorded in `data/dict-manifest.js` inside the vault.

Downloaded packs are re-scanned on startup, so you can also drop your own `*-dict.json` files into
`.word-memo/data/` and they will be picked up.

## Network use

词忆 works fully offline for local lookup, review and the word nebula. The following remote services are
used **only** when you explicitly trigger the corresponding feature, and are listed here for
transparency:

| Service | When | Notes |
| --- | --- | --- |
| GitHub (`raw.githubusercontent.com`, `github.com/.../releases/download/...`) | When you click **下载** on a 词典数据 pack in AI 工坊 | Public read-only download of the dictionary data file you asked for. No data is sent. |
| Your AI provider (OpenAI, SiliconFlow, or any OpenAI-compatible endpoint) | When you request a translation or an AI explanation | Endpoint and API key are configured by you and stored locally. Nothing is sent without your action. |
| 欧路词典 OpenAPI (`api.frdic.com`) | When you use the 欧路词典 lookup integration | Requires your own token. |
| 微信读书 (`i.weread.qq.com`) | When you load the English classics ranking | Requires your own key. |
| Project Gutenberg metadata (`gutendex.com`) | When you browse the English classics list | Public metadata only. |
| Google Fonts (`fonts.googleapis.com`) | On app load | Web font for the app UI. |
| cdnjs (`cdnjs.cloudflare.com`) | On app load | Spreadsheet / Word document parsing libraries used by the import feature. |
| Google Translate TTS (`translate.google.com`) | Only as a pronunciation fallback | Used when no local audio is available. |

**No telemetry, no analytics, no ads, no auto-update mechanism.** The plugin never contacts any server
unless one of the features above is invoked.

## Data & privacy

- All settings, word books and review progress live in your vault (`.word-memo/user/`) and on your
  machine. They are never uploaded.
- API keys are stored locally in your vault configuration, not in this plugin's `data.json`.
- The plugin accesses files **inside your vault only** (`.word-memo/`), plus nothing else on disk.

## Development

This plugin is generated from the 词忆 web app. Source lives in `src/` (`plugin.js` is the host,
`styles.css` the plugin styles). The web app core is packed into a single `WM_APP_BUNDLE` string in
`main.js` by `tools/web2ob.py` in the main repository — the container is plain `WMB1` framing followed
by gzip and base64, with **no encryption or obfuscation**:

```
python tools/web2ob.py                     # bundle the app core (default, no dictionary)
python tools/web2ob.py --with-englishwords # also bundle the englishwords dictionary (103,812 entries)
```

Do not edit `main.js` by hand — edit `src/plugin.js` and rebuild.

## Support

- Issues and feature requests: <https://github.com/Losecloud/word-memo/issues>
- Main project: <https://github.com/Losecloud/reciting>

## License

[MIT](LICENSE)
