# 富途税务计算器 (futu-tax-calculator)

[![GitHub stars](https://img.shields.io/github/stars/hi-otto/futu-tax-calculator?style=social)](https://github.com/hi-otto/futu-tax-calculator)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-blue?logo=docker)](https://github.com/hi-otto/futu-tax-calculator/pkgs/container/futu-tax-calculator)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

一款隐私友好、开源的境外证券投资税务计算工具，帮助中国大陆税务居民快速计算港美股投资收益应缴纳的个人所得税。

> ⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！

## 特性

- 🔒 **隐私优先**：所有计算在本地浏览器完成，数据不上传服务器
- 📊 **合规专业**：依据最新税法政策，20%税率计算，境外已扣税可抵免
- ⚡ **简单易用**：上传富途年度账单即可自动解析，一键计算
- 📈 **期权支持**：自动识别期权交易，按100倍乘数计算盈亏
- 💱 **币种切换**：支持 CNY/USD/HKD 显示切换，方便核对原始账单
- ⏰ **滞纳金计算**：内置滞纳金计算器，自动计算逾期缴税所需滞纳金
- 📝 **小白友好**：预扣税等专业术语配有详细解释
- 🐳 **Docker 部署**：支持容器化部署，一键启动

## 如何获取富途年度账单

在富途牛牛APP中按以下路径下载：

```
账户 → 更多 → 我的税表 → 年度账单 → 选择年份 → 点击「下载」
```

需要下载的文件：
- **年度账单.xlsx** - 包含交易流水、资金进出等完整数据（必需）
- **利息股息及其他收入汇总.xlsx** - 用于核对股息数据（可选）

## 安装

```bash
bun install
```

## 使用方式

### Web 界面

```bash
# 开发模式
bun dev

# 生产模式
bun start
```

然后访问 http://localhost:3000

### Docker 部署

**方式一：一键部署（推荐）**

无需 clone 仓库，两条命令即可启动：

```bash
# 第一步：下载配置
curl -fsSL https://raw.githubusercontent.com/hi-otto/futu-tax-calculator/main/docker-compose-setup.sh | bash

# 第二步：启动
docker-compose up -d
```

然后访问 http://localhost:3020

**方式二：直接运行镜像**

```bash
docker run -d -p 3020:80 ghcr.io/hi-otto/futu-tax-calculator:latest
```

**方式三：clone 仓库部署**

```bash
git clone https://github.com/hi-otto/futu-tax-calculator.git
cd futu-tax-calculator
docker-compose up -d
```

## 税务规则

- **资本利得税**：20%，同年度盈亏可互抵
- **股息税**：20%，境外已扣税可抵免（美股10%）
- **利息税**：20%
- **汇率**：纳税年度12月31日汇率中间价（数据来源：中国国家外汇管理局）
- **滞纳金**：逾期未缴税款按日加收万分之五（汇算截止日期为次年6月30日）

## 测试

```bash
bun test
```

## 文档

- [产品需求文档 (PRD)](./docs/PRD.md)
- [计算方式说明](./docs/CALCULATION.md) - 详细说明数据来源及计算逻辑
- [GitHub Pages 部署指南](./docs/DEPLOY.md) - 自动部署到 GitHub Pages
- [开发任务清单 (TODO)](./docs/TODO.md)

## 免责声明

本工具仅供参考，不构成税务建议。用户应根据实际情况咨询专业税务顾问，并以税务机关最终核定为准。

## 开源协议

MIT License
