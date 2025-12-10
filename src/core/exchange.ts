/**
 * 汇率数据模块
 * 
 * 数据来源：中国国家外汇管理局
 * https://www.safe.gov.cn/safe/rmbhlzjj/index.html
 * 
 * 年度汇算清缴采用纳税年度最后一日（12月31日）的人民币汇率中间价
 */

import type { Currency, ExchangeRateData, Money, Year } from './types';

/** 
 * 年度汇率数据（100外币兑人民币）
 * 数据为每年12月31日的汇率中间价
 */
export const EXCHANGE_RATES: ExchangeRateData[] = [
  {
    year: 2024,
    date: '2024-12-31',
    USD: 718.84,
    HKD: 92.604,
    source: '中国国家外汇管理局',
  },
  {
    year: 2023,
    date: '2023-12-29',
    USD: 708.27,
    HKD: 90.622,
    source: '中国国家外汇管理局',
  },
  {
    year: 2022,
    date: '2022-12-30',
    USD: 696.46,
    HKD: 89.327,
    source: '中国国家外汇管理局',
  },
  {
    year: 2021,
    date: '2021-12-31',
    USD: 637.57,
    HKD: 81.76,
    source: '中国国家外汇管理局',
  },
  {
    year: 2020,
    date: '2020-12-31',
    USD: 652.49,
    HKD: 84.164,
    source: '中国国家外汇管理局',
  },
];

/**
 * 获取指定年度的汇率数据
 */
export function getExchangeRate(year: Year): ExchangeRateData | null {
  return EXCHANGE_RATES.find(r => r.year === year) || null;
}

/**
 * 获取支持的年份列表
 */
export function getSupportedYears(): Year[] {
  return EXCHANGE_RATES.map(r => r.year).sort((a, b) => b - a);
}

/**
 * 将外币金额转换为人民币
 * @param amount 金额
 * @param currency 币种
 * @param year 年度（决定使用哪年的汇率）
 * @returns 人民币金额
 */
export function convertToCNY(amount: number, currency: Currency, year: Year): number {
  if (currency === 'CNY') {
    return amount;
  }
  
  const rate = getExchangeRate(year);
  if (!rate) {
    throw new Error(`不支持的年份: ${year}，支持的年份: ${getSupportedYears().join(', ')}`);
  }
  
  // 汇率是 100外币 = X人民币，所以需要 amount * rate / 100
  const exchangeRate = currency === 'USD' ? rate.USD : rate.HKD;
  return amount * exchangeRate / 100;
}

/**
 * 将 Money 对象转换为人民币 Money
 */
export function convertMoneyToCNY(money: Money, year: Year): Money {
  return {
    amount: convertToCNY(money.amount, money.currency, year),
    currency: 'CNY',
  };
}

/**
 * 不同币种之间转换（通过人民币作为中间货币）
 */
export function convert(amount: number, from: Currency, to: Currency, year: Year): number {
  if (from === to) return amount;
  const rate = getExchangeRate(year);
  if (!rate) {
    throw new Error(`不支持的年份: ${year}，支持的年份: ${getSupportedYears().join(', ')}`);
  }
  const toCNY = (amt: number, cur: Currency): number => {
    if (cur === 'CNY') return amt;
    const ex = cur === 'USD' ? rate.USD : rate.HKD; // 100外币兑人民币
    return amt * ex / 100;
  };
  const fromCNY = (amt: number, cur: Currency): number => {
    if (cur === 'CNY') return amt;
    const ex = cur === 'USD' ? rate.USD : rate.HKD;
    return amt * 100 / ex;
  };
  const cny = toCNY(amount, from);
  return fromCNY(cny, to);
}

/** 将 Money 转换为目标币种 */
export function convertMoney(money: Money, to: Currency, year: Year): Money {
  return { amount: convert(money.amount, money.currency, to, year), currency: to };
}

/** 仅格式化数字+货币符号 */
export function formatNumberWithCurrency(amount: number, currency: Currency, decimals: number = 2): string {
  const symbols: Record<Currency, string> = { CNY: '¥', USD: '$', HKD: 'HK$' };
  return `${symbols[currency]}${amount.toFixed(decimals)}`;
}

/**
 * 创建 Money 对象
 */
export function createMoney(amount: number, currency: Currency): Money {
  return { amount, currency };
}

/**
 * 格式化金额显示
 */
export function formatMoney(money: Money, decimals: number = 2): string {
  const symbols: Record<Currency, string> = {
    CNY: '¥',
    USD: '$',
    HKD: 'HK$',
  };
  return `${symbols[money.currency]}${money.amount.toFixed(decimals)}`;
}

/**
 * 获取汇率说明文本
 */
export function getExchangeRateDescription(year: Year): string {
  const rate = getExchangeRate(year);
  if (!rate) {
    return `暂无 ${year} 年汇率数据`;
  }
  
  return `${year}年汇率（${rate.date}）：1 USD = ${(rate.USD / 100).toFixed(4)} CNY，1 HKD = ${(rate.HKD / 100).toFixed(4)} CNY\n数据来源：${rate.source}`;
}
