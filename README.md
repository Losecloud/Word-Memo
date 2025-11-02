# 词忆 - 高效背单词工具

<div align="center">

![词忆](static/image/book.svg)

一个专注、高效、现代化的背单词工具，支持多词书管理、智能复习、AI工坊等功能。

[在线体验](https://Losecloud.github.io/reciting) | [使用文档](#使用指南) | [问题反馈](https://github.com/Losecloud/reciting/issues)

</div>

## ✨ 主要特性

- 📚 **多词书管理** - 支持导入多个词书，自由切换学习
- 🎯 **多种学习模式** - 选择题、拼写题、同义词练习
- 🧠 **智能复习系统** - 艾宾浩斯遗忘曲线，科学复习
- 🎨 **现代化界面** - 响应式设计，完美支持移动端
- 🌙 **暗黑模式** - 保护眼睛，随心切换
- 💾 **本地存储** - 所有数据保存在本地，无需服务器
- 📱 **PWA支持** - 可安装为APP，支持离线使用
- ✨ **AI工坊** - 智能生成故事、题目，趣味学习
- 🔊 **语音朗读** - 支持单词发音
- 📊 **学习统计** - 详细的学习数据分析

## 🚀 快速开始

### 在线使用

直接访问：[https://Losecloud.github.io/reciting](https://Losecloud.github.io/reciting)

### 本地运行

```bash
# 1. 克隆项目
git clone https://github.com/Losecloud/reciting.git

# 2. 进入项目目录
cd reciting

# 3. 使用本地服务器打开（推荐）
# Windows用户：
start-server.bat

# Mac/Linux用户：
bash start-server.sh

# 或者使用Python
python -m http.server 8000

# 4. 在浏览器中访问
# http://localhost:8000
```

## 📖 使用指南

### 1. 导入词书

支持多种格式的词书导入：

- **CSV格式** - 推荐格式，结构清晰
- **TXT格式** - 简单文本，每行一个单词
- **Excel格式** - 支持.xlsx文件

#### CSV格式示例
```csv
单词,音标,词性,释义,例句,词根词缀,例句翻译
abandon,[ə'bændən],v.,放弃；抛弃,He abandoned his wife and children.,a-(加强) + bandon(控制),他抛弃了妻子和孩子。
```

#### TXT格式示例
```
abandon 放弃
ability 能力
```

### 2. 开始学习

1. 在左侧词书列表中选择要学习的词书
2. 点击"开始学习"按钮
3. 选择学习模式：
   - **选择题模式** - 从4个选项中选择正确答案
   - **拼写题模式** - 输入完整单词拼写
4. 根据记忆程度选择"认识"、"不认识"或"模糊"

### 3. 智能复习

- 系统会根据艾宾浩斯遗忘曲线自动安排复习
- 顶部会显示待复习单词数量
- 点击即可开始复习

### 4. 学习设置

点击右上角设置按钮，可以配置：

- **每组单词数量** - 每次学习的单词数
- **显示选项** - 音标、例句、词根等
- **语音设置** - 选择发音声优
- **复习间隔** - 自定义复习时间
- **音效开关** - 答题音效

## 📱 移动端使用

### 添加到主屏幕（PWA）

#### iOS (Safari)
1. 点击浏览器底部的"分享"按钮
2. 选择"添加到主屏幕"
3. 确认添加

#### Android (Chrome)
1. 点击浏览器菜单
2. 选择"添加到主屏幕"
3. 确认添加

添加后，词忆将作为独立APP运行，支持离线使用！

## 🛠️ 技术栈

- **纯前端** - HTML5 + CSS3 + Vanilla JavaScript
- **存储** - localStorage（本地存储）
- **PWA** - Service Worker（离线支持）
- **UI** - 响应式设计，无依赖框架

## 📂 项目结构

```
reciting/
├── index.html              # 主页面
├── css/
│   └── styles.css         # 样式文件
├── js/
│   ├── app.js             # 主应用逻辑
│   ├── storage.js         # 本地存储管理
│   ├── word-parser.js     # 词书解析
│   └── dictionary-api.js  # 词典API
├── data/
│   └── cefr-data.js       # CEFR词汇数据
├── static/
│   └── image/             # 图片资源
├── examples/              # 示例词书
├── manifest.json          # PWA配置
├── service-worker.js      # Service Worker
└── README.md              # 说明文档
```

## 🎯 路线图

- [ ] 更多学习模式（听写、造句等）
- [ ] 单词分组标签功能
- [ ] 学习数据导出
- [ ] 云端同步（可选）
- [ ] 更多AI功能
- [ ] 单词卡片样式自定义

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 💡 常见问题

### 数据会丢失吗？
不会。所有数据都保存在浏览器的localStorage中，除非手动清除浏览器数据。建议定期导出数据备份。

### 可以在多个设备间同步吗？
目前不支持自动同步。每个设备的数据独立存储。未来可能会添加云同步功能。

### 支持哪些浏览器？
支持所有现代浏览器：
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 移动端浏览器

### 如何导出学习数据？
在词书设置中可以导出单词列表和学习进度（CSV格式）。

## 📮 联系方式

- 问题反馈：[GitHub Issues](https://github.com/Losecloud/reciting/issues)
- 功能建议：[GitHub Discussions](https://github.com/Losecloud/reciting/discussions)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by [Losecloud]

</div>

