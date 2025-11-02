# 贡献指南

感谢你对词忆项目的关注！我们欢迎任何形式的贡献。

## 🤝 如何贡献

### 报告Bug

如果你发现了bug，请：

1. 检查 [Issues](https://github.com/your-username/reciting/issues) 中是否已有相关报告
2. 如果没有，创建新的Issue，包含：
   - Bug的详细描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 截图（如果适用）
   - 浏览器版本和操作系统

### 提出新功能

1. 先在 [Issues](https://github.com/your-username/reciting/issues) 中讨论你的想法
2. 说明功能的用途和价值
3. 等待维护者的反馈

### 提交代码

1. **Fork 项目**
   ```bash
   # 在GitHub上点击Fork按钮
   git clone https://github.com/你的用户名/reciting.git
   cd reciting
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/你的功能名称
   # 或
   git checkout -b fix/bug描述
   ```

3. **编写代码**
   - 遵循项目的代码风格
   - 添加必要的注释
   - 确保代码可读性

4. **测试**
   - 在多个浏览器测试
   - 测试移动端适配
   - 确保PWA功能正常

5. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   # 或
   git commit -m "fix: 修复bug描述"
   ```

6. **推送到你的Fork**
   ```bash
   git push origin feature/你的功能名称
   ```

7. **创建 Pull Request**
   - 在GitHub上打开你的Fork
   - 点击 "Pull Request"
   - 填写详细的PR描述
   - 等待代码审查

## 📝 代码规范

### JavaScript

- 使用ES6+语法
- 使用驼峰命名法
- 函数和变量名要有意义
- 添加适当的注释

```javascript
// 好的例子
function calculateWordProgress(currentIndex, totalWords) {
    return Math.round((currentIndex / totalWords) * 100);
}

// 不好的例子
function calc(a, b) {
    return a / b * 100;
}
```

### CSS

- 使用BEM命名规范（可选）
- 保持选择器简洁
- 合理使用CSS变量
- 注意移动端适配

```css
/* 好的例子 */
.word-card {
    padding: 20px;
    border-radius: 8px;
}

.word-card__title {
    font-size: 24px;
    font-weight: bold;
}

/* 不好的例子 */
div.card div span {
    /* 选择器太复杂 */
}
```

### HTML

- 语义化标签
- 适当的ARIA属性
- 保持结构清晰

## 🎯 提交信息规范

使用约定式提交（Conventional Commits）：

- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建/工具相关

例如：
```
feat: 添加单词分组功能
fix: 修复拼写模式下的输入bug
docs: 更新部署文档
style: 统一代码缩进为2空格
```

## 🔍 代码审查

我们会审查所有的Pull Request，关注：

- 代码质量
- 功能完整性
- 性能影响
- 用户体验
- 文档完善

请耐心等待反馈，并及时回应审查意见。

## 📚 开发建议

### 本地开发

```bash
# 启动本地服务器
python -m http.server 8000
# 或
php -S localhost:8000
# 或使用项目提供的脚本
./start-server.sh
```

### 浏览器开发者工具

- F12 打开开发者工具
- 使用 Console 调试
- 使用 Application 查看localStorage和Service Worker
- 使用 Lighthouse 检查性能和PWA

### 推荐的开发工具

- VS Code + Prettier + ESLint
- Chrome DevTools
- Git + GitHub Desktop

## 🐛 测试清单

提交PR前，请确保：

- [ ] 代码在Chrome、Firefox、Safari中测试
- [ ] 移动端显示正常
- [ ] 深色模式工作正常
- [ ] 所有功能按预期工作
- [ ] 没有Console错误
- [ ] Service Worker正常注册
- [ ] localStorage数据保存正常

## 💡 需要帮助？

- 查看已有的 [Issues](https://github.com/your-username/reciting/issues)
- 查看 [Pull Requests](https://github.com/your-username/reciting/pulls)
- 在Issue中提问

## 📜 许可证

通过贡献代码，你同意你的贡献将在 [MIT License](LICENSE) 下发布。

---

**感谢你的贡献！让词忆变得更好！** 🎉

