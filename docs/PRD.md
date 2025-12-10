# 富途税务计算器（futu-tax-calculator）PRD v1.0

## 1. 产品概述

### 1.1 产品定位
一款隐私友好、开源的境外证券投资税务计算工具，帮助中国大陆税务居民快速计算港美股投资收益应缴纳的个人所得税。

### 1.2 目标用户
- 使用富途牛牛等券商进行港美股投资的中国大陆投资者
- 需要进行年度个税汇算清缴的用户
- 关注数据隐私、不愿上传敏感财务数据到第三方服务器的用户

### 1.3 核心价值主张
- **隐私优先**：所有计算在本地浏览器完成，数据不上传服务器
- **合规专业**：依据最新税法政策，提供准确的税务计算
- **简单易用**：上传账单即可自动解析，一键计算
- **完全开源**：代码透明可审计，社区共建

## 2. 税务规则说明

### 2.1 法律依据
- 《中华人民共和国个人所得税法》
- 《关于境外所得有关个人所得税政策的公告》（财政部 税务总局公告2020年第3号）

### 2.2 应税所得类型与税率

**2.2.1 财产转让所得（资本利得）**
- 税率：20%
- 计算公式：应纳税额 = (卖出收入 - 买入成本 - 合理税费) × 20%
- 注意：同一年度内盈亏可互抵，跨年亏损不可结转

**2.2.2 股息、红利所得**
- 税率：20%
- 计算公式：应纳税额 = 股息收入 × 20%
- 境外已扣税款可抵免（美股10%，港股0-10%不等）

**2.2.3 利息所得**
- 税率：20%
- 计算公式：应纳税额 = 利息收入 × 20%

### 2.3 汇率折算规则
年度汇算清缴采用**纳税年度最后一日（12月31日）的人民币汇率中间价**。

数据来源：中国国家外汇管理局 https://www.safe.gov.cn/safe/rmbhlzjj/index.html

### 2.4 税收抵免
- 在境外已缴纳的所得税可在规定限额内抵免
- 美国股息预扣税10%（中美税收协定）
- 抵免限额 = 境外某类所得 × 20%
- 超过限额部分可结转5年

## 3. 功能需求

### 3.1 Web 应用功能

**3.1.1 文件上传与解析**
- 支持拖拽或点击上传富途年度账单（xlsx格式）
- 支持同时上传多个年度、多个账户的文件
- 自动识别文件类型：年度账单 / 利息股息收入汇总
- 实时显示解析进度和状态

**3.1.2 税务计算**
- 自动解析交易流水，计算资本利得
- 从年度账单的资金进出表中提取股息、利息收入
- 计算结果与「利息股息汇总」表格一致，便于用户核对
- 按年度分组计算
- 显示每笔交易的盈亏明细

**3.1.3 汇率转换**
- 内置2020-2025年12月31日官方汇率
- 支持港币(HKD)、美元(USD)转人民币(CNY)
- 展示汇率来源和说明

**3.1.4 结果展示**
- 分类展示：资本利得税、股息税、利息税
- 显示应纳税额（原币种 + 人民币）
- 显示境外已扣税款及可抵免金额
- 支持导出计算报告（PDF/CSV）
- 滞纳金计算器：选择预计缴税日期，自动计算逾期滞纳金
- 专业术语解释：预扣税等术语配有帮助提示

### 3.2 CLI 功能（Bun 开发）
- `futu-tax calc <files...>` - 计算税务
- `futu-tax --year <year>` - 指定计算年度
- `futu-tax --output <format>` - 输出格式（json/csv/table）
- `futu-tax --currency <CNY|HKD|USD>` - 结果币种
- `futu-tax --help` - 帮助信息

### 3.3 隐私与安全
- 所有计算在浏览器端/本地完成
- 不收集、不上传任何用户数据
- 无后端服务器存储
- 源代码完全开源可审计

## 4. 技术架构

### 4.1 技术栈
- **运行时**：Bun
- **前端框架**：React 19
- **样式**：Tailwind CSS 4
- **UI组件**：shadcn/ui
- **Excel解析**：xlsx
- **CLI**：Bun 原生 CLI
- **容器化**：Docker

### 4.2 项目结构
```
futu-tax-calculator/
├── docs/
│   ├── PRD.md            # 产品需求文档
│   └── TODO.md           # 开发任务清单
├── src/
│   ├── index.ts          # Web服务入口
│   ├── index.html        # HTML入口
│   ├── App.tsx           # React主组件
│   ├── cli.ts            # CLI入口
│   ├── core/             # 核心计算逻辑（Web/CLI共用）
│   │   ├── parser.ts     # 账单解析
│   │   ├── calculator.ts # 税务计算
│   │   ├── exchange.ts   # 汇率数据
│   │   └── types.ts      # 类型定义
│   ├── components/       # React组件
│   └── lib/              # 工具函数
├── tests/                # 测试文件
├── Dockerfile
└── docker-compose.yml
```

## 5. UI/UX 设计原则

### 5.1 设计理念（Apple风格）
- **简洁克制**：减少视觉噪音，突出核心信息
- **层次分明**：通过留白和字重建立信息层级
- **即时反馈**：每个操作都有清晰的状态反馈
- **移动优先**：响应式设计，优先保证移动端体验

### 5.2 核心交互流程
1. **首页** → 简洁的品牌介绍 + 上传入口
2. **上传** → 拖拽区域 + 文件列表预览
3. **解析** → 进度动画 + 解析结果预览
4. **计算** → 一键计算 + 结果卡片展示
5. **导出** → 多格式下载选项

### 5.3 视觉规范
- 主色调：深灰 #1D1D1F + 蓝色 #0071E3
- 字体：SF Pro Display / 苹方
- 圆角：12px
- 阴影：subtle, layered

## 6. 数据模型

### 6.1 账单解析结果
```typescript
interface ParsedBill {
  year: number;
  accountInfo: AccountInfo[];
  holdings: Holding[];
  transactions: Transaction[];
  fundFlows: FundFlow[];
  dividends: DividendRecord[];
  interests: InterestRecord[];
  unrecognized: UnrecognizedRecord[]; // 未识别的数据行
}
```

### 6.2 税务计算结果
```typescript
interface TaxResult {
  year: number;
  capitalGains: {
    totalGain: Money;
    taxAmount: Money;
    details: CapitalGainDetail[];
  };
  dividendTax: {
    totalDividend: Money;
    foreignTaxPaid: Money;
    taxCredit: Money;
    taxDue: Money;
  };
  interestTax: {
    totalInterest: Money;
    taxAmount: Money;
  };
  summary: {
    totalTaxDue: Money;
    totalTaxCredit: Money;
    netTaxPayable: Money;
  };
}
```

## 7. 汇率数据

以下汇率为每年12月31日中国国家外汇管理局公布的官方汇率（100外币兑人民币）：

| 年份 | USD | HKD |
|------|-----|-----|
| 2024 | 718.84 | 92.604 |
| 2023 | 708.27 | 90.622 |
| 2022 | 696.46 | 89.327 |
| 2021 | 637.57 | 81.76 |
| 2020 | 652.49 | 84.164 |

> 注：汇率数据来源于中国国家外汇管理局，代码中已内置完整数据

## 8. Docker 部署

```yaml
# docker-compose.yml
version: '3.8'
services:
  futu-tax:
    image: ghcr.io/hi-otto/futu-tax-calculator:latest
    container_name: futu-tax-calculator
    ports:
      - "3020:80"
    restart: unless-stopped
```

```dockerfile
# Dockerfile（使用多阶段构建：Bun 构建 + Nginx 静态服务）
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM nginx:alpine-slim AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 9. SEO 优化
- 页面标题：富途税务计算器 - 港美股投资个税计算工具
- Meta描述：免费、隐私友好的境外证券投资税务计算工具，支持富途年度账单自动解析
- 关键词：富途税务、港美股个税、境外所得申报、资本利得税计算
- 结构化数据：SoftwareApplication Schema

## 10. 免责声明

本工具仅供参考，不构成税务建议。用户应根据实际情况咨询专业税务顾问，并以税务机关最终核定为准。
