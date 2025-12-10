/**
 * 税务计算模块
 * 
 * 税率：
 * - 财产转让所得（资本利得）：20%
 * - 股息、红利所得：20%
 * - 利息所得：20%
 * 
 * 境外已扣税可在限额内抵免
 */

import type {
  CapitalGainDetail,
  CapitalGainsTax,
  Currency,
  CurrencySummary,
  DividendCurrencySummary,
  DividendRecord,
  DividendTax,
  InterestRecord,
  InterestTax,
  Money,
  ParsedBill,
  TaxResult,
  TaxSummary,
  Transaction,
  Year,
} from './types';
import {
  convertToCNY,
  createMoney,
  getExchangeRate,
  convert,
} from './exchange';

/** 税率常量 */
const TAX_RATE = 0.2; // 20%

/**
 * 计算资本利得税
 * 
 * 基于交易流水计算买卖差价
 * 同一年度内盈亏可互抵
 * 支持证券和期权交易
 */
export function calculateCapitalGains(
  transactions: Transaction[],
  year: Year
): CapitalGainsTax {
  const details: CapitalGainDetail[] = [];
  
  // 按股票/期权代码分组交易
  const tradesBySymbol = new Map<string, Transaction[]>();
  
  for (const tx of transactions) {
    const key = `${tx.symbol}-${tx.market}-${tx.currency}-${tx.category}`;
    if (!tradesBySymbol.has(key)) {
      tradesBySymbol.set(key, []);
    }
    tradesBySymbol.get(key)!.push(tx);
  }
  
  // 使用 FIFO 方法计算每个股票/期权的盈亏
  for (const [key, trades] of tradesBySymbol) {
    // 分离买入和卖出
    const buys: Transaction[] = [];
    const sells: Transaction[] = [];
    
    for (const tx of trades) {
      if (tx.direction.includes('买入')) {
        buys.push(tx);
      } else if (tx.direction.includes('卖出')) {
        sells.push(tx);
      }
    }
    
    // 按时间排序
    buys.sort((a, b) => a.tradeTime.localeCompare(b.tradeTime));
    sells.sort((a, b) => a.tradeTime.localeCompare(b.tradeTime));
    
    // FIFO 匹配
    let buyIdx = 0;
    let buyRemaining = buys[0]?.quantity || 0;
    
    for (const sell of sells) {
      let sellRemaining = sell.quantity;
      const isOption = sell.category === '期权';
      // 期权乘数为100，证券为1
      const multiplier = isOption ? 100 : 1;
      
      while (sellRemaining > 0 && buyIdx < buys.length) {
        const buy = buys[buyIdx];
        const matchQty = Math.min(sellRemaining, buyRemaining);
        
        if (matchQty > 0) {
          // 期权价格需要乘以乘数
          const buyAmount = matchQty * buy.price * multiplier;
          const sellAmount = matchQty * sell.price * multiplier;
          const fees = (buy.totalFee * matchQty / buy.quantity) + 
                       (sell.totalFee * matchQty / sell.quantity);
          const gain = sellAmount - buyAmount - fees;
          const gainCNY = convertToCNY(gain, sell.currency, year);
          
          details.push({
            symbol: sell.symbol,
            market: sell.market,
            category: sell.category,
            buyDate: buy.tradeTime.split(' ')[0],
            sellDate: sell.tradeTime.split(' ')[0],
            quantity: matchQty,
            multiplier,
            buyPrice: buy.price,
            sellPrice: sell.price,
            buyAmount: createMoney(buyAmount, sell.currency),
            sellAmount: createMoney(sellAmount, sell.currency),
            fees: createMoney(fees, sell.currency),
            gain: createMoney(gain, sell.currency),
            gainCNY: createMoney(gainCNY, 'CNY'),
          });
          
          sellRemaining -= matchQty;
          buyRemaining -= matchQty;
        }
        
        if (buyRemaining <= 0) {
          buyIdx++;
          buyRemaining = buys[buyIdx]?.quantity || 0;
        }
      }
    }
  }
  
  // 按币种汇总
  const currencyMap = new Map<Currency, { gain: number; gainCNY: number }>();
  for (const d of details) {
    const cur = d.gain.currency;
    if (!currencyMap.has(cur)) {
      currencyMap.set(cur, { gain: 0, gainCNY: 0 });
    }
    const summary = currencyMap.get(cur)!;
    summary.gain += d.gain.amount;
    summary.gainCNY += d.gainCNY.amount;
  }
  
  const byCurrency: CurrencySummary[] = Array.from(currencyMap.entries()).map(
    ([currency, { gain, gainCNY }]) => ({ currency, totalGain: gain, totalGainCNY: gainCNY })
  );
  
  // 计算总盈亏（人民币）
  const totalGainCNY = details.reduce((sum, d) => sum + d.gainCNY.amount, 0);
  
  // 应税所得为盈利部分（同年度内盈亏互抵后）
  const taxableGain = Math.max(0, totalGainCNY);
  const taxAmount = taxableGain * TAX_RATE;
  
  return {
    totalGain: createMoney(totalGainCNY, 'CNY'),
    taxableGain: createMoney(taxableGain, 'CNY'),
    taxAmount: createMoney(taxAmount, 'CNY'),
    byCurrency,
    details,
  };
}

/**
 * 计算股息税
 * 
 * 股息所得税率 20%
 * 境外已扣税可抵免（不超过应纳税额）
 */
export function calculateDividendTax(
  dividends: DividendRecord[],
  year: Year
): DividendTax {
  let totalDividendCNY = 0;
  let totalWithholdingTaxCNY = 0;
  
  // 按币种汇总
  const currencyMap = new Map<Currency, {
    dividend: number;
    tax: number;
    dividendCNY: number;
    taxCNY: number;
  }>();
  
  for (const div of dividends) {
    const grossCNY = convertToCNY(div.grossAmount, div.currency, year);
    const taxCNY = convertToCNY(div.withholdingTax, div.currency, year);
    
    totalDividendCNY += grossCNY;
    totalWithholdingTaxCNY += taxCNY;
    
    if (!currencyMap.has(div.currency)) {
      currencyMap.set(div.currency, { dividend: 0, tax: 0, dividendCNY: 0, taxCNY: 0 });
    }
    const summary = currencyMap.get(div.currency)!;
    summary.dividend += div.grossAmount;
    summary.tax += div.withholdingTax;
    summary.dividendCNY += grossCNY;
    summary.taxCNY += taxCNY;
  }
  
  const byCurrency: DividendCurrencySummary[] = Array.from(currencyMap.entries()).map(
    ([currency, { dividend, tax, dividendCNY, taxCNY }]) => ({
      currency,
      totalDividend: dividend,
      withholdingTax: tax,
      totalDividendCNY: dividendCNY,
      withholdingTaxCNY: taxCNY,
    })
  );
  
  // 应纳税额 = 股息总额 × 20%
  const grossTax = totalDividendCNY * TAX_RATE;
  
  // 可抵免税额 = min(境外已扣税, 应纳税额)
  const taxCredit = Math.min(totalWithholdingTaxCNY, grossTax);
  
  // 实际应补税额 = 应纳税额 - 可抵免税额
  const netTaxDue = Math.max(0, grossTax - taxCredit);
  
  return {
    totalDividend: createMoney(totalDividendCNY, 'CNY'),
    foreignTaxPaid: createMoney(totalWithholdingTaxCNY, 'CNY'),
    taxCredit: createMoney(taxCredit, 'CNY'),
    grossTax: createMoney(grossTax, 'CNY'),
    netTaxDue: createMoney(netTaxDue, 'CNY'),
    byCurrency,
    details: dividends,
  };
}

/**
 * 计算利息税
 * 
 * 利息所得税率 20%
 */
export function calculateInterestTax(
  interests: InterestRecord[],
  year: Year
): InterestTax {
  let totalInterestCNY = 0;
  
  for (const int of interests) {
    totalInterestCNY += convertToCNY(int.amount, int.currency, year);
  }
  
  const taxAmount = totalInterestCNY * TAX_RATE;
  
  return {
    totalInterest: createMoney(totalInterestCNY, 'CNY'),
    taxAmount: createMoney(taxAmount, 'CNY'),
    details: interests,
  };
}

/**
 * 计算税务汇总
 */
export function calculateTaxSummary(
  capitalGains: CapitalGainsTax,
  dividendTax: DividendTax,
  interestTax: InterestTax
): TaxSummary {
  const totalTaxDue = 
    capitalGains.taxAmount.amount + 
    dividendTax.grossTax.amount + 
    interestTax.taxAmount.amount;
  
  const totalTaxCredit = dividendTax.taxCredit.amount;
  
  const netTaxPayable = 
    capitalGains.taxAmount.amount + 
    dividendTax.netTaxDue.amount + 
    interestTax.taxAmount.amount;
  
  return {
    totalTaxDue: createMoney(totalTaxDue, 'CNY'),
    totalTaxCredit: createMoney(totalTaxCredit, 'CNY'),
    netTaxPayable: createMoney(netTaxPayable, 'CNY'),
  };
}

/**
 * 计算完整税务结果
 */
export function calculateTax(bills: ParsedBill[], targetYear?: Year): TaxResult[] {
  // 按年度分组
  const billsByYear = new Map<Year, ParsedBill[]>();
  
  for (const bill of bills) {
    if (targetYear && bill.year !== targetYear) continue;
    
    if (!billsByYear.has(bill.year)) {
      billsByYear.set(bill.year, []);
    }
    billsByYear.get(bill.year)!.push(bill);
  }
  
  const results: TaxResult[] = [];
  
  for (const [year, yearBills] of billsByYear) {
    const rate = getExchangeRate(year);
    if (!rate) {
      console.warn(`跳过年份 ${year}：无汇率数据`);
      continue;
    }
    
    // 合并该年度所有账单的数据
    const allTransactions: Transaction[] = [];
    const allDividends: DividendRecord[] = [];
    const allInterests: InterestRecord[] = [];
    
    for (const bill of yearBills) {
      if (bill.fileType === 'annual') {
        allTransactions.push(...bill.transactions);
        allDividends.push(...bill.dividends);
        allInterests.push(...bill.interests);
      }
    }
    
    // 计算各项税务
    const capitalGains = calculateCapitalGains(allTransactions, year);
    const dividendTax = calculateDividendTax(allDividends, year);
    const interestTax = calculateInterestTax(allInterests, year);
    const summary = calculateTaxSummary(capitalGains, dividendTax, interestTax);
    
    results.push({
      year,
      exchangeRate: {
        USD: rate.USD,
        HKD: rate.HKD,
        source: rate.source,
        date: rate.date,
      },
      capitalGains,
      dividendTax,
      interestTax,
      summary,
    });
  }
  
  // 按年份降序排列
  return results.sort((a, b) => b.year - a.year);
}

/**
 * 格式化税务结果为表格数据
 */
export function formatTaxResultForDisplay(result: TaxResult, displayCurrency: Currency = 'CNY'): {
  year: number;
  capitalGain: string;
  capitalGainTax: string;
  dividend: string;
  dividendTax: string;
  foreignTaxCredit: string;
  interest: string;
  interestTax: string;
  totalTax: string;
  netPayable: string;
} {
const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$');
  const conv = (n: number) => convert(n, 'CNY', displayCurrency, result.year);
  const fmt = (n: number) => `${symbol}${conv(n).toFixed(2)}`;
  
  return {
    year: result.year,
    capitalGain: fmt(result.capitalGains.totalGain.amount),
    capitalGainTax: fmt(result.capitalGains.taxAmount.amount),
    dividend: fmt(result.dividendTax.totalDividend.amount),
    dividendTax: fmt(result.dividendTax.grossTax.amount),
    foreignTaxCredit: fmt(result.dividendTax.taxCredit.amount),
    interest: fmt(result.interestTax.totalInterest.amount),
    interestTax: fmt(result.interestTax.taxAmount.amount),
    totalTax: fmt(result.summary.totalTaxDue.amount),
    netPayable: fmt(result.summary.netTaxPayable.amount),
  };
}

/**
 * 导出 CSV 格式
 */
export function exportTaxResultToCSV(results: TaxResult[], displayCurrency: Currency = 'CNY'): string {
  const headers = [
    '年度',
    `资本利得(${displayCurrency})`,
    `资本利得税(${displayCurrency})`,
    `股息收入(${displayCurrency})`,
    `股息税(${displayCurrency})`,
    `境外已扣税(${displayCurrency})`,
    `可抵免税额(${displayCurrency})`,
    `利息收入(${displayCurrency})`,
    `利息税(${displayCurrency})`,
    `应纳税总额(${displayCurrency})`,
    `实际应缴(${displayCurrency})`,
  ];
  
const rows = results.map(r => { const convAmt = (n: number) => convert(n, 'CNY', displayCurrency, r.year); return [
    r.year,
    convAmt(r.capitalGains.totalGain.amount).toFixed(2),
    convAmt(r.capitalGains.taxAmount.amount).toFixed(2),
    convAmt(r.dividendTax.totalDividend.amount).toFixed(2),
    convAmt(r.dividendTax.grossTax.amount).toFixed(2),
    convAmt(r.dividendTax.foreignTaxPaid.amount).toFixed(2),
    convAmt(r.dividendTax.taxCredit.amount).toFixed(2),
    convAmt(r.interestTax.totalInterest.amount).toFixed(2),
    convAmt(r.interestTax.taxAmount.amount).toFixed(2),
    convAmt(r.summary.totalTaxDue.amount).toFixed(2),
    convAmt(r.summary.netTaxPayable.amount).toFixed(2),
  ]});
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * 生成税务报告文本
 */
export function generateTaxReport(result: TaxResult, displayCurrency: Currency = 'CNY'): string {
  const lines: string[] = [];
  
  lines.push(`═══════════════════════════════════════════════════════`);
  lines.push(`  ${result.year}年度 境外证券投资个人所得税计算报告`);
  lines.push(`═══════════════════════════════════════════════════════`);
  lines.push(``);
  lines.push(`汇率信息（${result.exchangeRate.date}）`);
  lines.push(`  来源：${result.exchangeRate.source}`);
  lines.push(`  1 USD = ${(result.exchangeRate.USD / 100).toFixed(4)} CNY`);
  lines.push(`  1 HKD = ${(result.exchangeRate.HKD / 100).toFixed(4)} CNY`);
  lines.push(``);
  
  lines.push(`───────────────────────────────────────────────────────`);
  lines.push(`一、财产转让所得（资本利得）`);
  lines.push(`───────────────────────────────────────────────────────`);
  lines.push(`  交易笔数：${result.capitalGains.details.length} 笔`);
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  总盈亏：${symbol}${convAmt(result.capitalGains.totalGain.amount).toFixed(2)}`); }
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  应税所得：${symbol}${convAmt(result.capitalGains.taxableGain.amount).toFixed(2)}`); }
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  应纳税额（20%）：${symbol}${convAmt(result.capitalGains.taxAmount.amount).toFixed(2)}`); }
  lines.push(``);
  
  lines.push(`───────────────────────────────────────────────────────`);
  lines.push(`二、股息、红利所得`);
  lines.push(`───────────────────────────────────────────────────────`);
  lines.push(`  股息笔数：${result.dividendTax.details.length} 笔`);
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  股息总额：${symbol}${convAmt(result.dividendTax.totalDividend.amount).toFixed(2)}`); }
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  应纳税额（20%）：${symbol}${convAmt(result.dividendTax.grossTax.amount).toFixed(2)}`); }
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  境外已扣税：${symbol}${convAmt(result.dividendTax.foreignTaxPaid.amount).toFixed(2)}`); }
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  可抵免税额：${symbol}${convAmt(result.dividendTax.taxCredit.amount).toFixed(2)}`); }
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  实际应补税：${symbol}${convAmt(result.dividendTax.netTaxDue.amount).toFixed(2)}`); }
  lines.push(``);
  
  lines.push(`───────────────────────────────────────────────────────`);
  lines.push(`三、利息所得`);
  lines.push(`───────────────────────────────────────────────────────`);
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  利息总额：${symbol}${convAmt(result.interestTax.totalInterest.amount).toFixed(2)}`); }
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  应纳税额（20%）：${symbol}${convAmt(result.interestTax.taxAmount.amount).toFixed(2)}`); }
  lines.push(``);
  
  lines.push(`═══════════════════════════════════════════════════════`);
  lines.push(`  汇  总`);
  lines.push(`═══════════════════════════════════════════════════════`);
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  应纳税总额：${symbol}${convAmt(result.summary.totalTaxDue.amount).toFixed(2)}`); }
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  可抵免总额：${symbol}${convAmt(result.summary.totalTaxCredit.amount).toFixed(2)}`); }
  lines.push(`  ────────────────────────────────`);
  { const symbol = displayCurrency === 'CNY' ? '¥' : (displayCurrency === 'USD' ? '$' : 'HK$'); const convAmt = (n:number)=>convert(n,'CNY',displayCurrency,result.year); lines.push(`  实际应缴税额：${symbol}${convAmt(result.summary.netTaxPayable.amount).toFixed(2)}`); }
  lines.push(``);
  lines.push(`※ 本报告仅供参考，不构成税务建议。`);
  lines.push(`  请以税务机关最终核定为准。`);
  
  return lines.join('\n');
}
