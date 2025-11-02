# ⚡ 快速部署清单

按照这个清单，10分钟内完成部署！

## ✅ 部署前检查

### 1. 准备图标 (必需)
- [ ] 创建 `static/image/icon-192.png` (192x192像素)
- [ ] 创建 `static/image/icon-512.png` (512x512像素)
- 📖 不知道如何制作？查看 [ICON_GUIDE.md](ICON_GUIDE.md)
- ⚡ 快速方案：使用在线工具 [favicon.io](https://favicon.io/favicon-converter/) 上传 `book.svg` 生成

### 2. 更新项目信息 (推荐)
- [ ] 打开 `README.md`，替换 `your-username` 为你的GitHub用户名
- [ ] 修改 `Your Name` 为你的名字
- [ ] 可选：更新项目描述和特性

### 3. 检查文件完整性
- [ ] 确认 `manifest.json` 存在
- [ ] 确认 `service-worker.js` 存在
- [ ] 确认 `index.html` 已更新（包含PWA代码）
- [ ] 确认 `.gitignore` 已更新

## 🚀 部署步骤

### 步骤1: 创建GitHub仓库 (5分钟)

1. [ ] 访问 [github.com/new](https://github.com/new)
2. [ ] 填写信息：
   - Repository name: `reciting`
   - Public（公开）
   - ❌ 不要勾选 "Add a README"
3. [ ] 点击 "Create repository"

### 步骤2: 上传代码 (3分钟)

**选择方式 A 或 B：**

#### 方式A: 命令行（推荐）

在项目文件夹打开终端，依次执行：

```bash
git init
git add .
git commit -m "首次提交：词忆项目"
git remote add origin https://github.com/你的用户名/reciting.git
git branch -M main
git push -u origin main
```

💡 记得替换 `你的用户名`！

#### 方式B: GitHub Desktop（新手友好）

1. [ ] 下载 [GitHub Desktop](https://desktop.github.com/)
2. [ ] 打开并登录
3. [ ] File → Add Local Repository → 选择项目文件夹
4. [ ] Publish repository

### 步骤3: 启用GitHub Pages (2分钟)

1. [ ] 进入仓库页面
2. [ ] 点击 `Settings` 
3. [ ] 左侧菜单点击 `Pages`
4. [ ] Source选择：
   - Branch: `main`
   - Folder: `/ (root)`
5. [ ] 点击 `Save`
6. [ ] 等待1-2分钟，获取访问链接

## 🎉 部署成功！

你的网站地址是：
```
https://你的用户名.github.io/reciting/
```

## 📱 移动端安装测试

### iOS (Safari)
1. [ ] 用手机打开网站
2. [ ] 点击底部"分享"按钮
3. [ ] 选择"添加到主屏幕"
4. [ ] 确认添加
5. [ ] 从桌面打开，测试离线功能

### Android (Chrome)
1. [ ] 用手机打开网站
2. [ ] 点击菜单（三个点）
3. [ ] 选择"添加到主屏幕"
4. [ ] 确认安装
5. [ ] 从桌面打开，测试离线功能

## ✅ 功能测试清单

部署后测试这些功能：

### 基础功能
- [ ] 页面正常加载
- [ ] 暗黑模式切换
- [ ] 响应式布局（调整浏览器窗口大小）

### 词书功能
- [ ] 导入CSV词书
- [ ] 导入TXT词书
- [ ] 词书列表显示
- [ ] 切换词书

### 学习功能
- [ ] 开始学习
- [ ] 选择题模式
- [ ] 拼写题模式
- [ ] 答题反馈

### PWA功能
- [ ] Service Worker注册（F12 → Console查看）
- [ ] 离线访问（断网后刷新页面）
- [ ] 添加到主屏幕（移动端）

### 数据持久化
- [ ] 导入词书后刷新页面，数据仍在
- [ ] 学习进度保存
- [ ] 设置保存

## 🐛 遇到问题？

### 页面404错误
- 等待2-3分钟再试
- 检查Settings → Pages设置
- 确保仓库是Public

### CSS/JS加载失败
- 清除浏览器缓存
- 检查浏览器Console错误信息
- 确认所有文件都已上传

### Service Worker报错
- 确保使用HTTPS访问
- 检查service-worker.js是否在根目录
- F12 → Application → Service Workers查看状态

### 图标不显示
- 确认图标文件存在且命名正确
- 检查manifest.json路径
- 清除缓存后重试

## 📚 下一步

- [ ] 阅读完整文档：[DEPLOYMENT.md](DEPLOYMENT.md)
- [ ] 自定义主题和样式
- [ ] 导入你的词书
- [ ] 分享给朋友 ⭐
- [ ] 给项目点Star支持

## 🔄 更新代码

以后修改代码后，使用以下命令更新：

```bash
git add .
git commit -m "描述你的修改"
git push
```

GitHub Pages会自动更新（1-2分钟生效）。

## 💡 提示

- **数据存储**：所有数据保存在用户本地浏览器，不需要数据库
- **多设备**：每个设备的数据独立，不会自动同步
- **备份**：建议定期导出数据备份
- **分享**：可以分享网址给其他人使用

## 🎯 快捷方式

### 快速制作图标
最简单的方式：
1. 访问 [favicon.io](https://favicon.io/favicon-converter/)
2. 上传 `static/image/book.svg`
3. 下载生成的图标包
4. 重命名为 `icon-192.png` 和 `icon-512.png`
5. 放入 `static/image/` 目录

### 快速测试PWA
在Chrome浏览器：
1. F12 打开开发者工具
2. 切换到 `Lighthouse` 标签
3. 勾选 `Progressive Web App`
4. 点击 `Generate report`

### 快速分享
生成二维码让用户扫码访问：
- 使用 [草料二维码](https://cli.im/)
- 或 [QR Code Generator](https://www.qr-code-generator.com/)

---

**🎊 恭喜！你的词忆应用已经成功上线了！**

有问题？查看 [常见问题](DEPLOYMENT.md#常见问题) 或提交 [Issue](https://github.com/你的用户名/reciting/issues)

