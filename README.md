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

## 如何获取富途年度账单

在富途牛牛APP中按以下路径下载：

```
账户 → 更多 → 我的税表 → 年度账单 → 选择年份 → 点击「下载」
```

需要下载的文件：
- **年度账单.xlsx** - 包含交易流水、资金进出等完整数据（必需）
- **利息股息及其他收入汇总.xlsx** - 用于核对股息数据（可选）

## 部署

**方式一：Docker 一键部署（推荐）**

```bash
docker run -d -p 3020:80 ghcr.io/hi-otto/futu-tax-calculator:latest
```

然后访问 http://localhost:3020

**方式二：Docker Compose**

```bash
curl -fsSL https://raw.githubusercontent.com/hi-otto/futu-tax-calculator/main/docker-compose-setup.sh | bash
docker-compose up -d
```

## 税务规则

| 类型 | 税率 | 说明 |
|------|------|------|
| 资本利得税 | 20% | 同年度盈亏可互抵 |
| 股息税 | 20% | 境外已扣税可抵免（美股10%） |
| 利息税 | 20% | - |
| 汇率 | - | 纳税年度12月31日中间价 |
| 滞纳金 | 0.05%/日 | 汇算截止日为次年6月30日 |

> 汇率数据来源：[中国国家外汇管理局](https://www.safe.gov.cn/safe/rmbhlzjj/index.html)

## 文档

- [计算方式说明](./docs/CALCULATION.md) - 详细说明数据来源及计算逻辑

## 免责声明

本工具仅供参考，不构成税务建议。用户应根据实际情况咨询专业税务顾问，并以税务机关最终核定为准。

## 开源协议

MIT License
