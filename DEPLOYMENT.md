# 词忆 - GitHub Pages 部署指南

本指南将详细说明如何将词忆项目部署到GitHub Pages，让用户可以在任何设备上访问。

## 📋 前置准备

### 1. 注册GitHub账号
如果还没有GitHub账号，请访问 [github.com](https://github.com) 注册。

### 2. 安装Git
- **Windows**: 下载 [Git for Windows](https://git-scm.com/download/win)
- **Mac**: 通过 Homebrew 安装 `brew install git`
- **Linux**: `sudo apt-get install git` 或 `sudo yum install git`

### 3. 配置Git
打开终端或命令提示符，执行：
```bash
git config --global user.name "你的用户名"
git config --global user.email "你的邮箱"
```

## 🚀 部署步骤

### 步骤1: 创建GitHub仓库

1. 登录GitHub，点击右上角的 `+` 号
2. 选择 `New repository`
3. 填写仓库信息：
   - **Repository name**: `reciting` （或其他你喜欢的名称）
   - **Description**: `词忆 - 高效背单词工具`
   - **Public**: 选择Public（公开）
   - ❌ **不要**勾选 "Add a README file"
   - ❌ **不要**勾选 "Add .gitignore"
   - **License**: 可以选择 MIT License
4. 点击 `Create repository`

### 步骤2: 准备项目文件

#### 2.1 创建PWA图标

词忆需要两个图标文件用于PWA（渐进式Web应用）功能。你需要准备一个正方形的图标：

1. 打开 `static/image/` 目录
2. 创建两个PNG格式的图标：
   - `icon-192.png` (192x192 像素)
   - `icon-512.png` (512x512 像素)

**图标制作方法**：
- 使用在线工具：[favicon.io](https://favicon.io/favicon-converter/)
- 使用PS、Figma等设计软件
- 或使用现有的 `book.svg` 转换为PNG格式

#### 2.2 更新README.md

打开 `README.md`，将以下内容替换为你的实际信息：
- `your-username` → 你的GitHub用户名
- `Your Name` → 你的名字

### 步骤3: 上传代码到GitHub

#### 方法A: 使用命令行（推荐）

在项目根目录（reciting文件夹）打开终端/命令提示符：

```bash
# 1. 初始化Git仓库
git init

# 2. 添加所有文件
git add .

# 3. 创建第一次提交
git commit -m "首次提交：词忆背单词项目"

# 4. 关联远程仓库（替换your-username为你的GitHub用户名）
git remote add origin https://github.com/your-username/reciting.git

# 5. 推送到GitHub
git branch -M main
git push -u origin main
```

#### 方法B: 使用GitHub Desktop（适合新手）

1. 下载安装 [GitHub Desktop](https://desktop.github.com/)
2. 登录你的GitHub账号
3. 点击 `File` → `Add Local Repository`
4. 选择项目文件夹
5. 点击 `Publish repository`
6. 确认信息后点击 `Publish Repository`

### 步骤4: 启用GitHub Pages

1. 在GitHub仓库页面，点击 `Settings`（设置）
2. 在左侧菜单找到 `Pages`
3. 在 `Source` 部分：
   - **Branch**: 选择 `main`
   - **Folder**: 选择 `/ (root)`
4. 点击 `Save` 保存
5. 等待1-2分钟，页面会显示访问链接：
   ```
   Your site is live at https://your-username.github.io/reciting/
   ```

### 步骤5: 验证部署

1. 访问 `https://your-username.github.io/reciting/`
2. 检查功能：
   - ✅ 页面正常加载
   - ✅ 可以导入词书
   - ✅ 暗黑模式切换正常
   - ✅ 移动端显示正常
   - ✅ 离线功能正常（断网后刷新页面）

## 📱 移动端访问

### iOS设备

1. 使用Safari浏览器打开网站
2. 点击底部的"分享"按钮
3. 向下滚动，选择"添加到主屏幕"
4. 点击"添加"
5. 现在可以像原生App一样使用了！

### Android设备

1. 使用Chrome浏览器打开网站
2. 点击菜单（三个点）
3. 选择"添加到主屏幕"或"安装应用"
4. 点击"安装"
5. 应用会出现在桌面上

### 其他移动浏览器

大部分现代移动浏览器都支持添加到主屏幕，查找类似"添加到主屏幕"的选项即可。

## 🔄 更新项目

当你对项目做了修改后，需要重新部署：

```bash
# 1. 添加修改的文件
git add .

# 2. 提交修改
git commit -m "描述你的修改内容"

# 3. 推送到GitHub
git push origin main
```

GitHub Pages会自动更新，通常在1-2分钟内生效。

## 🎨 自定义域名（可选）

如果你有自己的域名，可以绑定到GitHub Pages：

### 1. 添加域名

1. 在仓库的 `Settings` → `Pages` 中
2. 在 `Custom domain` 输入你的域名（如：`word.yourdomain.com`）
3. 点击 `Save`
4. GitHub会自动创建一个 `CNAME` 文件

### 2. 配置DNS

在你的域名提供商处添加DNS记录：

**如果是子域名（推荐）**：
```
类型: CNAME
名称: word (或你的子域名)
值: your-username.github.io
```

**如果是根域名**：
```
类型: A
名称: @
值: 185.199.108.153
值: 185.199.109.153
值: 185.199.110.153
值: 185.199.111.153
```

### 3. 启用HTTPS

GitHub Pages会自动为自定义域名提供免费的SSL证书，等待几分钟后勾选 `Enforce HTTPS`。

## 🛠️ 常见问题

### 1. 页面显示404

**原因**：GitHub Pages未正确配置或还在部署中。

**解决**：
- 等待2-3分钟
- 检查 `Settings` → `Pages` 是否选择了正确的分支
- 确保仓库是Public（公开的）

### 2. CSS/JS文件加载失败

**原因**：文件路径问题。

**解决**：
- 检查 `index.html` 中的资源路径
- 确保使用相对路径（`./css/styles.css`）而不是绝对路径

### 3. Service Worker注册失败

**原因**：HTTPS要求或路径问题。

**解决**：
- GitHub Pages默认使用HTTPS，确保访问时使用 `https://`
- 检查 `service-worker.js` 文件是否在根目录

### 4. 移动端无法添加到主屏幕

**原因**：PWA配置不完整。

**解决**：
- 确保 `manifest.json` 文件存在且配置正确
- 确保图标文件（`icon-192.png`, `icon-512.png`）存在
- 使用HTTPS访问

### 5. 数据丢失

**原因**：清除了浏览器数据。

**解决**：
- 提醒用户定期导出数据备份
- localStorage数据与浏览器和域名绑定
- 不同设备、不同浏览器的数据是独立的

### 6. 无法离线使用

**原因**：Service Worker未正常工作。

**解决**：
- 打开浏览器开发者工具（F12）
- 查看Console是否有错误信息
- 检查 `Application` → `Service Workers` 是否注册成功

## 📊 监控和分析（可选）

### 添加Google Analytics

1. 注册 [Google Analytics](https://analytics.google.com/)
2. 获取跟踪ID
3. 在 `index.html` 的 `</head>` 前添加：

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 🔒 安全建议

1. **不要提交敏感信息**
   - API密钥应使用环境变量
   - 个人数据不要硬编码

2. **定期更新依赖**
   - 检查外部CDN库的版本
   - 关注安全公告

3. **备份数据**
   - 定期导出词书和学习进度
   - 使用GitHub的Release功能标记稳定版本

## 🎯 优化建议

### 性能优化

1. **图片优化**
   - 使用WebP格式
   - 压缩图片大小
   - 使用适当的尺寸

2. **代码压缩**
   - 使用工具压缩CSS和JS（可选）
   - 移除不必要的注释

3. **缓存策略**
   - Service Worker已实现基本缓存
   - 可根据需要调整缓存策略

### SEO优化

1. **添加meta标签**（已在index.html中）
   - description
   - keywords
   - og:tags（社交媒体分享）

2. **创建sitemap.xml**（可选）
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://your-username.github.io/reciting/</loc>
       <lastmod>2024-01-01</lastmod>
       <changefreq>weekly</changefreq>
       <priority>1.0</priority>
     </url>
   </urlset>
   ```

## 📞 获取帮助

如果遇到问题：

1. 查看 [GitHub Pages文档](https://docs.github.com/pages)
2. 在项目Issues中提问
3. 访问 [Stack Overflow](https://stackoverflow.com/questions/tagged/github-pages)

## 🎉 完成！

恭喜！你的词忆项目现在已经成功部署到GitHub Pages，任何人都可以通过链接访问了。

记得：
- ⭐ 分享你的项目链接
- 📢 在社交媒体宣传
- 🐛 持续改进和修复bug
- 💬 收集用户反馈

---

**祝你的开源项目获得更多Star！⭐**

