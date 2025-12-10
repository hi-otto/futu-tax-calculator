# GitHub Pages 部署指南

本文档指导你如何将富途税务计算器部署到 GitHub Pages。

## 前置条件

- 拥有 GitHub 账号
- 已将代码推送到 GitHub 仓库

## 部署步骤

### 1. 推送代码到 GitHub

如果还没有创建远程仓库：

```bash
# 在 GitHub 上创建新仓库（不要初始化 README）
# 然后执行以下命令

git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

### 2. 启用 GitHub Pages

1. 打开你的 GitHub 仓库页面
2. 点击 **Settings**（设置）
3. 在左侧菜单找到 **Pages**
4. 在 **Source** 下拉菜单中选择 **GitHub Actions**

![GitHub Pages Settings](https://docs.github.com/assets/cb-28701/images/help/pages/pages-settings-source.png)

### 3. 触发部署

代码已配置自动部署，以下情况会自动触发：

- **推送到 main 分支**：每次 `git push` 到 main 分支
- **手动触发**：在仓库的 Actions 页面点击 "Run workflow"

首次部署：
```bash
git add .
git commit -m "feat: 配置 GitHub Pages 自动部署"
git push origin main
```

### 4. 查看部署状态

1. 打开仓库的 **Actions** 标签页
2. 可以看到 "Deploy to GitHub Pages" 工作流的运行状态
3. 绿色 ✓ 表示部署成功

### 5. 访问网站

部署成功后，网站地址为：

```
https://你的用户名.github.io/仓库名/
```

例如：`https://hellohy.github.io/tax-cal/`

## 自定义域名（可选）

如果你有自己的域名：

1. 在 **Settings > Pages** 中填写自定义域名
2. 在你的域名 DNS 配置中添加 CNAME 记录，指向 `你的用户名.github.io`
3. 等待 DNS 生效（通常几分钟到几小时）

## 常见问题

### Q: 部署失败怎么办？

1. 检查 **Actions** 页面的错误日志
2. 确认 `bun.lockb` 文件已提交
3. 确认构建命令 `bun run build` 在本地能正常运行

### Q: 页面显示 404？

1. 确认 GitHub Pages 的 Source 设置为 **GitHub Actions**
2. 等待几分钟让部署生效
3. 清除浏览器缓存后重试

### Q: 如何手动触发部署？

1. 进入仓库的 **Actions** 页面
2. 点击左侧的 "Deploy to GitHub Pages"
3. 点击 "Run workflow" 按钮
4. 选择 main 分支，点击绿色 "Run workflow"

### Q: 如何回滚到之前的版本？

1. 在 **Actions** 页面找到之前成功的部署
2. 点击进入详情
3. 点击 "Re-run all jobs" 重新运行

## 工作流配置说明

`.github/workflows/deploy.yml` 文件定义了自动部署流程：

1. **触发条件**：推送到 main 分支或手动触发
2. **构建环境**：Ubuntu + Bun
3. **构建步骤**：
   - 安装依赖 (`bun install`)
   - 构建项目 (`bun run build`)
   - 上传构建产物到 GitHub Pages

## 本地预览构建结果

在部署前，可以本地预览构建结果：

```bash
# 构建
bun run build

# 预览（需要安装 serve）
bunx serve dist
```

然后访问 http://localhost:3000 查看效果。
