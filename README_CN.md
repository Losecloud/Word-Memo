# 词忆 - 高效背单词工具

<div align="center">

![词忆](static/image/book.svg)

专注、高效、现代化的背单词工具

[![GitHub Pages](https://img.shields.io/badge/demo-online-brightgreen)](https://your-username.github.io/reciting)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-enabled-orange)](manifest.json)

[English](README.md) | 简体中文

</div>

---

## 🎯 项目简介

词忆是一个完全基于浏览器的背单词应用，无需安装、无需注册、无需服务器。所有数据都保存在你的设备本地，隐私安全有保障。

### 为什么选择词忆？

- 🚫 **无需注册** - 打开即用，没有任何门槛
- 💾 **数据本地** - 所有信息保存在浏览器，绝对隐私
- 📱 **多端支持** - 手机、平板、电脑都能完美使用
- ✈️ **离线可用** - 添加到桌面后可离线使用
- 🎨 **界面美观** - 现代化设计，深色模式
- 🆓 **完全免费** - 开源项目，永久免费

## ✨ 核心功能

### 📚 多词书管理
- 支持导入多个词书
- CSV、TXT、Excel格式
- 自由切换学习内容
- 词书进度独立管理

### 🎯 多种学习模式
- **选择题模式** - 从选项中选择正确答案
- **拼写题模式** - 完整拼写单词
- **同义词练习** - 同义词替换训练（适合考试）

### 🧠 智能复习系统
- 基于艾宾浩斯遗忘曲线
- 自动计算复习时间
- 重点复习错误单词
- 个性化复习间隔

### ✨ AI工坊
- AI生成故事串联单词
- 智能题目生成
- 趣味性学习体验

### 📊 学习统计
- 详细的学习数据
- 可视化进度展示
- 学习时长统计
- 正确率分析

### 🎨 个性化设置
- 暗黑/明亮主题
- 每组学习数量
- 显示内容定制
- 语音朗读设置
- 音效开关

## 🚀 快速开始

### 在线使用

**方式1：直接访问**

👉 [点击这里开始使用](https://your-username.github.io/reciting)

**方式2：安装到手机桌面**

#### iPhone/iPad
1. 用Safari打开网站
2. 点击底部"分享"按钮 📤
3. 选择"添加到主屏幕"
4. 点击"添加"

#### Android手机
1. 用Chrome打开网站
2. 点击菜单（⋮）
3. 选择"添加到主屏幕"或"安装应用"
4. 点击"安装"

### 本地运行

```bash
# 克隆项目
git clone https://github.com/your-username/reciting.git
cd reciting

# Windows用户：双击运行
start-server.bat

# Mac/Linux用户：
bash start-server.sh

# 或使用Python
python -m http.server 8000

# 访问 http://localhost:8000
```

## 📖 使用教程

### 1️⃣ 导入词书

点击"添加词书"按钮，选择文件上传：

**CSV格式示例：**
```csv
单词,音标,词性,释义,例句,词根词缀,例句翻译
abandon,[ə'bændən],v.,放弃；抛弃,He abandoned his wife.,a-(加强) + bandon(控制),他抛弃了妻子。
```

**TXT格式示例：**
```
abandon 放弃
ability 能力
about 关于
```

**Excel格式：**
支持 `.xlsx` 文件，格式同CSV

### 2️⃣ 开始学习

1. 从左侧选择词书
2. 点击"开始学习"
3. 选择学习模式
4. 开始背单词！

### 3️⃣ 复习单词

- 顶部会显示待复习数量
- 系统自动安排复习时间
- 点击"开始复习"巩固记忆

### 4️⃣ 查看统计

- 点击底部"统计"按钮
- 查看学习数据和进度
- 分析学习效果

## 🎨 功能演示

### 学习界面
- 清晰的单词卡片
- 实时进度显示
- 流畅的动画效果

### 移动端适配
- 响应式布局
- 触控优化
- 手势支持

### 暗黑模式
- 护眼配色
- 自动跟随系统
- 手动切换

## 🛠️ 部署指南

想要部署自己的词忆？

📚 **详细教程：** [DEPLOYMENT.md](DEPLOYMENT.md)
⚡ **快速清单：** [QUICK_START.md](QUICK_START.md)
🎨 **图标制作：** [ICON_GUIDE.md](ICON_GUIDE.md)

### 超简版部署

1. Fork 这个项目
2. 创建图标文件（`icon-192.png`, `icon-512.png`）
3. 在仓库设置中启用 GitHub Pages
4. 完成！🎉

## 📂 项目结构

```
reciting/
├── index.html              # 主页面
├── manifest.json          # PWA配置
├── service-worker.js      # 离线支持
├── css/
│   └── styles.css         # 样式文件
├── js/
│   ├── app.js             # 核心逻辑
│   ├── storage.js         # 数据存储
│   ├── word-parser.js     # 词书解析
│   └── dictionary-api.js  # 词典接口
├── data/
│   └── cefr-data.js       # CEFR词汇数据
├── static/
│   └── image/             # 图片资源
├── examples/              # 示例词书
└── docs/                  # 文档
```

## 🔧 技术栈

| 技术 | 说明 |
|------|------|
| HTML5 | 结构层 |
| CSS3 | 样式层（含Flexbox/Grid） |
| JavaScript (ES6+) | 逻辑层 |
| localStorage | 本地数据存储 |
| Service Worker | PWA离线支持 |
| Web Speech API | 语音朗读 |

### 特点

- ✅ 无框架依赖（纯原生）
- ✅ 零构建步骤
- ✅ 体积小（< 500KB）
- ✅ 加载快
- ✅ SEO友好

## 🤝 参与贡献

欢迎各种形式的贡献！

- 🐛 [报告Bug](https://github.com/your-username/reciting/issues/new?template=bug_report.md)
- 💡 [提出想法](https://github.com/your-username/reciting/issues/new?template=feature_request.md)
- 📝 改进文档
- 💻 贡献代码

详见 [贡献指南](CONTRIBUTING.md)

## 📊 开发路线

### 已完成 ✅
- [x] 基础学习功能
- [x] 多词书管理
- [x] 智能复习系统
- [x] PWA支持
- [x] 暗黑模式
- [x] AI工坊
- [x] 同义词练习

### 计划中 🚧
- [ ] 云端同步（可选）
- [ ] 单词分组标签
- [ ] 更多学习模式
- [ ] 学习报告导出
- [ ] 单词卡片自定义
- [ ] 社区词书分享

### 未来展望 💭
- [ ] 语音识别练习
- [ ] AR/VR学习模式
- [ ] 多语言支持
- [ ] 游戏化元素

## ❓ 常见问题

<details>
<summary><strong>Q: 数据会丢失吗？</strong></summary>
<br>
A: 数据保存在浏览器localStorage中，除非手动清除浏览器数据，否则不会丢失。建议定期导出备份。
</details>

<details>
<summary><strong>Q: 可以多设备同步吗？</strong></summary>
<br>
A: 目前不支持自动同步，每个设备的数据独立。可以通过导出/导入来手动同步。未来可能添加云同步功能。
</details>

<details>
<summary><strong>Q: 支持哪些浏览器？</strong></summary>
<br>
A: 支持所有现代浏览器：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+。
</details>

<details>
<summary><strong>Q: 可以离线使用吗？</strong></summary>
<br>
A: 可以！添加到主屏幕后，即使断网也能正常使用（已访问过的功能）。
</details>

<details>
<summary><strong>Q: 是否收集用户数据？</strong></summary>
<br>
A: 不收集！所有数据都在本地，我们无法也不会访问你的任何数据。
</details>

<details>
<summary><strong>Q: 如何导出学习数据？</strong></summary>
<br>
A: 在词书设置中可以导出单词列表和学习进度（CSV格式）。
</details>

## 📜 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

这意味着你可以：
- ✅ 商业使用
- ✅ 修改源码
- ✅ 分发
- ✅ 私有使用

只需保留版权声明即可。

## 🙏 致谢

- 感谢所有贡献者
- 感谢使用词忆的每一位用户
- 图标来源：[设计师名称]
- CEFR数据来源：[数据来源]

## 📞 联系方式

- 💬 [GitHub Discussions](https://github.com/your-username/reciting/discussions) - 交流讨论
- 🐛 [GitHub Issues](https://github.com/your-username/reciting/issues) - 问题反馈
- 📧 Email: your-email@example.com
- 🐦 Twitter: [@your-twitter](https://twitter.com/your-twitter)

## ⭐ Star History

如果这个项目对你有帮助，请给个 Star ⭐️ 支持一下！

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/reciting&type=Date)](https://star-history.com/#your-username/reciting&Date)

---

<div align="center">

**用心做一个好用的背单词工具** ❤️

[开始使用](https://your-username.github.io/reciting) • [查看文档](DEPLOYMENT.md) • [参与贡献](CONTRIBUTING.md)

</div>

