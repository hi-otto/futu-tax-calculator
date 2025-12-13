# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作提供指引。

## 项目简介

富途税务计算器 - 一款隐私优先的网页工具，帮助中国大陆税务居民计算港美股投资的个人所得税。所有计算均在浏览器本地完成。

## 常用命令

```bash
bun run dev      # 开发服务器（带热更新）http://localhost:3000
bun run build    # 生产环境构建，输出到 dist/
bun run start    # 生产环境服务器
bun test         # 运行测试
```

## 架构

**运行时**: Bun（非 Node.js），统一使用 Bun API 和 `bun` 命令。

**前端**: React 19 + Tailwind CSS 4，通过 Bun HTML imports 提供服务（不用 Vite）。
- 入口: `src/index.html` → `src/frontend.tsx` → `src/App.tsx`
- UI 组件: `src/components/ui/`（shadcn/ui 风格，基于 Radix）

**后端**: `src/index.ts` 使用 `Bun.serve()` 提供静态文件和 API 路由。

**核心业务逻辑** (`src/core/`):
- `types.ts` - 账单、交易、股息、税务计算的 TypeScript 类型定义
- `parser.ts` - 解析富途年度账单 Excel 文件为结构化数据
- `calculator.ts` - 税务计算：资本利得（20%）、股息（20% 减境外已扣税）、利息（20%）
- `exchange.ts` - 人民币/美元/港币汇率，使用国家外汇管理局 12 月 31 日中间价

**数据流**: Excel 上传 → `parser.ts` 解析为 `ParsedBill` → `calculator.ts` 计算 `TaxResult` → `TaxResult.tsx` 展示

## 税务规则（硬编码）

- 资本利得税: 20%，同年度盈亏可互抵
- 股息税: 20%，境外预扣税可抵免（如美股 10%）
- 利息税: 20%
- 汇率: 纳税年度 12 月 31 日中间价
- 期权: 成交金额已包含 100 倍乘数，无需额外计算

## 核心计算逻辑

### 跨年持仓处理

当卖出的股票是跨年持有（去年买入，今年卖出）时：
- 使用**期初持仓的市价**作为估算成本
- 在结果中标记 `isEstimatedCost: true`
- 页面显示"估算成本"提示

### FIFO 匹配

买卖交易采用先进先出（FIFO）匹配：
1. 期初持仓视为最早的"买入"
2. 当年买入按时间排序
3. 卖出时优先匹配最早的买入

### 年度收益 vs 已实现盈亏

两个不同的指标：
- **已实现盈亏**：实际卖出的盈亏，用于税务计算
- **年度收益**（富途口径）：`期末市值 - 期初市值 + 净现金流`，包含未实现盈亏

### 数据来源

- **交易流水**：买入/卖出交易 → 资本利得
- **资金进出**：股息派发、预扣税、利息 → 股息税/利息税
