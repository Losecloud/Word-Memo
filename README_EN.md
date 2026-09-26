<div align="center">

# Word Memo · 词忆

**Hard words only. Efficiently, enjoyably.**

A permanently free, co-created vocabulary tool: open in the browser and go, or plug it into your notes as an Obsidian plugin.

[Live demo](https://Losecloud.github.io/VocRec/) 🔗 | [Obsidian plugin](https://github.com/Losecloud/Obsidian-Word-Memo) 🔌 | [Docs](#-quick-start) ⭐️ | [Issues](https://github.com/Losecloud/VocRec/issues) 📝

[中文](README.md) | [English](README_EN.md)

`Obsidian 1.4.0+` · `Vanilla front-end` · `MIT`

![Word Memo](https://raw.githubusercontent.com/Losecloud/reciting/main/static/cover/%E9%98%85%E8%AF%BB%E8%81%94%E6%83%B3%E8%AE%B0%E5%BF%86.png)

</div>

Word Memo is not a pile of lookup popups — it closes the loop of **look up → save → review → play**: look words up and save them straight from your notes, see your vocabulary landscape through interactive visual covers, let SM-2 schedule every review, and let AI turn repetition into something you actually want to do.

## 🚀 Quick start

**Use it online (zero install)**

Open [https://Losecloud.github.io/VocRec/](https://Losecloud.github.io/VocRec/). Your data stays in the browser.

**Run it locally**

```bash
git clone https://github.com/Losecloud/VocRec.git
cd reciting
python -m http.server 8000     # or start-server.bat on Windows / start-server.sh on macOS & Linux
# open http://localhost:8000
```

**Use it as an Obsidian plugin**

Search for `Word Memo` in Obsidian under **Settings → Community plugins → Browse**, then look words up directly in your notes with hover lookup and selection translate — see the [plugin repository](https://github.com/Losecloud/Obsidian-Word-Memo).

📱 **Mobile**: open it in your phone browser and "Add to Home Screen" to run it as a standalone app with offline support (PWA).

<!-- SHARED:BEGIN -->

## ✨ Highlights

### 1️⃣ Hard-word visualization: Dandelion Clustering and Chaos Nebula

> Two self-built covers — a 2D force-directed biomimetic dandelion, and a WebGL flow-field particle nebula

**Dandelion Clustering** groups words into an outer ring by top-level meaning category, sizes each seed by CEFR frequency and flags focus words with an accuracy ≤ 50% in red; switch the "forgotten word" criterion and words due for review drift out of the flower head into the air — what stays is what you know, what drifts is what to review, and you can drag them to tidy the list.
**Chaos Nebula** drives tens of thousands of particles through a divergence-free flow field; click any word to link its strongest relations with Bézier curves (word-root and similar-form links may cross clusters), each labelled with the reason. Hard words stop being scattered points and become a network with priorities and associative paths.

![Dandelion clustering](https://raw.githubusercontent.com/Losecloud/reciting/main/static/md-image/%E8%92%B2%E5%85%AC%E8%8B%B1%E8%81%9A%E7%B1%BB.png)

![Chaos nebula](https://raw.githubusercontent.com/Losecloud/reciting/main/static/md-image/%E6%B7%B7%E6%B2%8C%E6%98%9F%E4%BA%91.png)

### 2️⃣ Smart word-list import × five study modes × SM-2 review

> Drop in any word list, pick the mode that fits, and let the algorithm handle the rest

Import TXT / CSV / Excel / DOCX with automatic table-structure detection; when phonetics or definitions are missing, the words are extracted by regex and imported right away, then filled in by AI in the background. Five modes — word → meaning, meaning → spelling, do you remember, synonym substitution, unusual senses — escalate from "recognize it" to "tell it apart". Review is scheduled automatically by SM-2 following the Ebbinghaus curve, with weakness self-check to find the words that need work most, and any OpenAI-compatible API can step in to assist your memory.

![Study modes and review](https://raw.githubusercontent.com/Losecloud/reciting/main/static/md-image/%E5%AD%A6%E4%B9%A0%E6%A8%A1%E5%BC%8F%E4%B8%8E%E5%A4%8D%E4%B9%A0.png)

### 3️⃣ 130K+ CEFR-graded words × community dictionary workshop × your own dictionary import

> 130,000+ entries with CEFR level tags · dictionaries downloaded free on demand · your own MDX / JSON dictionaries work too

Built in are **130,000+ vocabulary entries tagged with CEFR levels**: writing assessment, cover coloring and word grading all sit on top of this scale. The **community workshop freely collects Oxford, Collins**, word-root and synonym dictionaries — install one with a single click. Nothing is pre-bundled.

You can also import your own **MDX / JSON / JS dictionaries** (with companion MDD styles and real-voice audio) — see "Dictionary data" below.

![Dictionary workshop](https://raw.githubusercontent.com/Losecloud/reciting/main/static/md-image/%E8%AF%8D%E5%85%B8%E5%B7%A5%E5%9D%8A.png)

### 4️⃣ A co-created ecosystem of English-learning plugins

> Released, and growing

The AI workshop is open to everyone: anyone can contribute a plugin for English learning. Official releases so far include, but are not limited to —

- **Reading association (word-threading)** — turns your saved words into readable passages and questions, so you remember them in context
- **CEFR writing assessment** — highlights your English by CEFR level in real time, so you can see the level of the words you use
- **Graded English classics** — pulls the Project Gutenberg ranking and suggests what to read next by difficulty
- **WeRead highlight export** — exports your highlights and notes from WeRead to Markdown, or extracts them into a word book
- **Text game** — learn words inside an immersive horror / sci-fi / romance story

![Plugin ecosystem](https://raw.githubusercontent.com/Losecloud/reciting/main/static/md-image/%E6%8F%92%E4%BB%B6%E5%85%B1%E5%88%9B%E7%94%9F%E6%80%81.png)

### 5️⃣ Save words to Eudic in one click

> Direct Eudic OpenAPI · incremental, silent sync

Link a word book to your **Eudic vocabulary book**, and every save afterwards is pushed incrementally and silently to Eudic. Words you meet in a note are then ready for review in the Eudic mobile app — the two tools finally share one pipeline.

![Eudic integration](https://raw.githubusercontent.com/Losecloud/reciting/main/static/md-image/%E6%AC%A7%E8%B7%AF%E8%AF%8D%E5%85%B8%E8%81%94%E5%8A%A8.png)

## 📖 Dictionary data

**① Community workshop (optional, free on-demand download)**

No dictionary data is pre-bundled — the built-in engine already covers everyday lookup; larger packs (Collins, word roots, synonyms) are optional. Open **AI workshop → Dictionaries** and click **下载** on a pack: it is fetched from this project's public GitHub repository and enabled automatically (stored in your browser on the web, or in `.word-memo/data/` inside your vault under Obsidian).

Every pack is a **single JSON data file** (`<name>-dict.json`) containing dictionary text only; it is read with `fetch` + `JSON.parse` and is **never executed as code**. It stays local and is never uploaded. The file name maps to a dictionary variable name (e.g. `collins-dict.json` → `COLLINS_DICT`), recorded in `data/dict-manifest.js`.

**② Import your own dictionaries (MDX / JSON / JS)**

A **MDictionary (MDX) parser** is built in, and **JSON / JS dictionaries** can be imported directly too:

- **Import directly**: click **导入** in the lookup panel and pick a `.mdx` / `.json` / `.js` file; under Obsidian you can also **drag the file into the import area in the right sidebar**. MDX is parsed locally — v1 / v2 headers, UTF-8 / UTF-16 encodings, LZO and zlib blocks, and even key-block encrypted dictionaries are detected automatically; JSON is read as-is, and JS has only its outer `var NAME = {...}` assignment stripped (**no script is ever executed**; script dictionaries containing functions are not accepted). All three are written to `data/` as plain JSON and enabled immediately, keeping the `oaldpe-dict.json` → `OALDPE_DICT` naming convention.
- **Keep the original styling and real-voice audio**: a companion **MDD resource pack** (original CSS layout, mp3 audio, images) is recognised once unpacked into a same-named resource folder, and images / audio / CSS inside entry HTML are resolved against it — styled dictionaries keep their original look, and the pronunciation button uses the dictionary's own recorded audio, falling back to TTS only when it is missing.

Parsing only ever reads text with `fetch` + `JSON.parse`; dictionary content is **never executed as code**.

## 🌐 Network use

Word Memo is fully offline for local lookup, review and visual covers. The remote services below are contacted **only** when you trigger the matching feature, and are listed here for transparency:

| Service | Triggered when | Notes |
| --- | --- | --- |
| GitHub (`raw.githubusercontent.com`, `github.com/.../releases/download/...`) | Opening the About page, or clicking **下载** on a dictionary pack | Public read-only download of the documentation and the dictionary data file you asked for. No data is sent. |
| Your AI provider (OpenAI, SiliconFlow, or any OpenAI-compatible endpoint) | When you request a translation or an AI explanation, or when entries are filled in after an import | Endpoint and API key are configured by you and stored locally. Nothing is sent without your action. |
| Eudic OpenAPI (`api.frdic.com`) | When you use the Eudic integration | Requires your own token. |
| WeRead (`i.weread.qq.com`) | When you load the English classics ranking, or export highlights | Requires your own key. |
| Project Gutenberg metadata (`gutendex.com`) | When you browse the English classics list | Public metadata only. |
| Hot-topic ranking (`zj.v.api.aa1.cn`) | Only when you click **搜索热点** in the English corner feature | Public ranking data for Weibo / Baidu. No data is sent. |
| tianapi (`apis.tianapi.com`) | Only when you click **搜索热点** in the English corner feature, **and** you have entered your own tianapi key in its ☰ settings | Requires your own key. Skipped entirely when no key is set. |
| Google Translate TTS (`translate.google.com`) | Only as a pronunciation fallback | Used when no local audio is available. |

**No telemetry, no analytics, no ads, no auto-update mechanism.** The app never contacts any server unless one of the features above is invoked.

## 🔒 Data & privacy

- All settings, word books and review progress live locally: browser storage on the web, `.word-memo/user/` inside your vault under Obsidian. They are never uploaded.
- API keys are stored in local configuration, not in the plugin's `data.json`.
- The plugin accesses files **inside your vault only** (`.word-memo/`), plus nothing else on disk.

## 🤝 Contributing

Code, bug reports and suggestions are all welcome. Want to add a plugin for English learners? The **AI workshop** is open to everyone — fork this project, drop your plugin into the workshop directory and open a PR (see "Highlights · A co-created ecosystem of English-learning plugins").

1. Fork this project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- SHARED:END -->

## 🛠️ Development

A vanilla front-end project with no build step. Clone it and serve it with any static server:

```bash
git clone https://github.com/Losecloud/reciting.git
cd reciting
python -m http.server 8000     # or start-server.bat / start-server.sh
```

The Obsidian plugin is packed by `tools/web2ob.py` in this repository; the plugin host source lives in the plugin repository. Do not edit `main.js` by hand.

## 💡 FAQ

**Will my data be lost?** No. It is kept in browser storage unless you clear browser data. Exporting a backup occasionally is still a good habit.

**Can I sync across devices?** Not automatically — each device stores its own data.

**Which browsers are supported?** Chrome / Edge 90+, Firefox 88+, Safari 14+, and mainstream mobile browsers.

**How do I export study data?** Word lists and progress can be exported as CSV from the word book settings.

## 💬 Contact & support

- Bug reports: [GitHub Issues (bug report template)](https://github.com/Losecloud/VocRec/issues/new?template=bug_report.md)
- Feature suggestions: [GitHub Discussions](https://github.com/Losecloud/VocRec/discussions)

## 📄 License

[MIT](LICENSE)

---

<div align="center">

**If this project helps you, please give it a ⭐️ Star!**

Made with ❤️ by [Losecloud]

</div>

![Word Memo · vocabulary plugin for Obsidian](https://raw.githubusercontent.com/Losecloud/reciting/main/static/md-image/%E6%96%87%E6%A1%A3%E5%B0%81%E5%BA%95.png)
