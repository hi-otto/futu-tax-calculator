/**
 * 富途税务计算器 - 类型定义
 */

// ============ 基础类型 ============

/** 货币类型 */
export type Currency = 'USD' | 'HKD' | 'CNY';

/** 金额（带币种） */
export interface Money {
  amount: number;
  currency: Currency;
}

/** 年度 */
export type Year = number;

// ============ 账单数据结构 ============

/** 账户信息 */
export interface AccountInfo {
  name: string;           // 姓名
  niuniuId: string;       // 牛牛号
  accountId: string;      // 账户号码
  accountName: string;    // 账户名称
  year: Year;
}

/** 持仓记录 */
export interface Holding {
  periodType: '期初' | '期末';
  date: string;           // YYYYMMDD
  category: string;       // 证券/基金/期权
  accountName: string;
  accountId: string;
  symbol: string;         // 代码名称
  market: string;         // 交易所/市场
  currency: Currency;
  quantity: number;       // 数量/面值
  price: number;          // 价格
  multiplier: number;     // 乘数
  accruedInterest: number;// 应计利息
  marketValue: number;    // 市值
}

/** 交易记录 */
export interface Transaction {
  tradeTime: string;      // 成交时间
  accountName: string;
  accountId: string;
  category: string;       // 品类
  symbol: string;         // 代码名称
  market: string;         // 交易所/市场
  direction: '买入开仓' | '卖出平仓' | '买入' | '卖出';
  settlementDate: string; // 交收日期 YYYYMMDD
  currency: Currency;
  quantity: number;       // 数量/面值
  price: number;          // 价格
  tradeAmount: number;    // 成交金额
  totalFee: number;       // 总费用
  changeAmount: number;   // 变动金额
}

/** 资金进出记录 */
export interface FundFlow {
  date: string;           // 日期 YYYYMMDD
  accountName: string;
  accountId: string;
  type: string;           // 类型
  direction: 'IN' | 'OUT';
  currency: Currency;
  amount: number;         // 变动金额
  remark: string;         // 备注
}

/** 股息记录 */
export interface DividendRecord {
  date: string;
  accountName: string;
  accountId: string;
  symbol: string;
  quantity: number;
  dividendPerShare: number;
  currency: Currency;
  grossAmount: number;    // 税前股息
  withholdingTax: number; // 预扣税
  netAmount: number;      // 税后股息
}

/** 利息记录 */
export interface InterestRecord {
  date: string;
  accountName: string;
  accountId: string;
  currency: Currency;
  amount: number;
  source: string;         // 来源（如基金名称）
}

/** 未识别记录 */
export interface UnrecognizedRecord {
  source: string;           // 来源工作表
  rowIndex: number;         // 行号
  data: Record<string, unknown>; // 原始数据
  reason: string;           // 未识别原因
}

/** 解析后的账单数据 */
export interface ParsedBill {
  year: Year;
  fileName: string;
  fileType: 'annual' | 'dividend_summary'; // 年度账单 / 利息股息汇总
  accountInfo: AccountInfo[];
  holdings: Holding[];
  transactions: Transaction[];
  fundFlows: FundFlow[];
  dividends: DividendRecord[];
  interests: InterestRecord[];
  unrecognized: UnrecognizedRecord[];
}

// ============ 税务计算结果 ============

/** 资本利得明细 */
export interface CapitalGainDetail {
  symbol: string;
  market: string;
  category: string;       // 证券/期权
  buyDate: string;
  sellDate: string;
  quantity: number;
  multiplier: number;     // 乘数（期权为100）
  buyPrice: number;
  sellPrice: number;
  buyAmount: Money;
  sellAmount: Money;
  fees: Money;
  gain: Money;            // 盈亏（原币种）
  gainCNY: Money;         // 盈亏（人民币）
  isEstimatedCost?: boolean; // 成本是否为期初市价估算
}

/** 按币种汇总 */
export interface CurrencySummary {
  currency: Currency;
  totalGain: number;      // 原币种盈亏
  totalGainCNY: number;   // 人民币盈亏
}

/** 资本利得税计算结果 */
export interface CapitalGainsTax {
  totalGain: Money;       // 总盈亏（人民币）
  taxableGain: Money;     // 应税所得（盈利部分）
  taxAmount: Money;       // 应纳税额
  byCurrency: CurrencySummary[]; // 按币种汇总
  details: CapitalGainDetail[];
}

/** 股息税按币种汇总 */
export interface DividendCurrencySummary {
  currency: Currency;
  totalDividend: number;      // 原币种股息
  withholdingTax: number;     // 原币种预扣税
  totalDividendCNY: number;   // 人民币股息
  withholdingTaxCNY: number;  // 人民币预扣税
}

/** 股息税计算结果 */
export interface DividendTax {
  totalDividend: Money;       // 股息总额（人民币）
  foreignTaxPaid: Money;      // 境外已扣税款
  taxCredit: Money;           // 可抵免税额
  grossTax: Money;            // 应纳税额（毛）
  netTaxDue: Money;           // 实际应补税额
  byCurrency: DividendCurrencySummary[]; // 按币种汇总
  details: DividendRecord[];
}

/** 利息税计算结果 */
export interface InterestTax {
  totalInterest: Money;   // 利息总额（人民币）
  taxAmount: Money;       // 应纳税额
  details: InterestRecord[];
}

/** 税务计算汇总 */
export interface TaxSummary {
  totalTaxDue: Money;         // 应纳税总额
  totalTaxCredit: Money;      // 可抵免总额
  netTaxPayable: Money;       // 实际应缴税额
}

/** 年度收益（富途口径，含未实现盈亏） */
export interface AnnualReturn {
  startMarketValue: Money;    // 期初市值
  endMarketValue: Money;      // 期末市值
  netCashFlow: Money;         // 净现金流（买入为负，卖出为正）
  totalReturn: Money;         // 年度收益 = 期末 - 期初 + 净现金流
  dividendIncome: Money;      // 股息收入
  totalWithDividend: Money;   // 含股息的年度收益
  byCurrency: {               // 按币种明细
    currency: Currency;
    startValue: number;
    endValue: number;
    cashFlow: number;
    return: number;
  }[];
}

/** 完整税务计算结果 */
export interface TaxResult {
  year: Year;
  exchangeRate: {
    USD: number;
    HKD: number;
    source: string;
    date: string;
  };
  capitalGains: CapitalGainsTax;
  dividendTax: DividendTax;
  interestTax: InterestTax;
  summary: TaxSummary;
  annualReturn?: AnnualReturn;  // 年度收益（富途口径）
}

// ============ 汇率数据 ============

/** 年度汇率（100外币兑人民币） */
export interface ExchangeRateData {
  year: Year;
  date: string;           // 汇率日期 YYYY-MM-DD
  USD: number;            // 美元
  HKD: number;            // 港币
  source: string;         // 数据来源
}

// ============ 利息股息汇总（用于核对） ============

/** 利息股息汇总记录 */
export interface DividendSummaryRecord {
  niuniuId: string;
  year: Year;
  accountName: string;
  totalDividend: number;  // 全年股息
  totalInterest: number;  // 全年利息
  totalOther: number;     // 全年其他收入
  currency: Currency;
}

// ============ 工具类型 ============

/** 解析状态 */
export type ParseStatus = 'idle' | 'parsing' | 'success' | 'error';

/** 解析结果 */
export interface ParseResult {
  status: ParseStatus;
  bills: ParsedBill[];
  errors: string[];
}

/** 税务计算状态 */
export type CalcStatus = 'idle' | 'calculating' | 'success' | 'error';

/** 输出格式 */
export type OutputFormat = 'json' | 'csv' | 'table';

/** CLI 选项 */
export interface CLIOptions {
  files: string[];
  year?: Year;
  output: OutputFormat;
  currency: Currency;
}
