import { test, expect, describe } from 'bun:test';
import {
  convertToCNY,
  createMoney,
  formatMoney,
  getExchangeRate,
  getSupportedYears,
  getExchangeRateDescription,
} from '../src/core/exchange';
import {
  extractYearFromFileName,
  detectFileType,
} from '../src/core/parser';
import {
  calculateCapitalGains,
  calculateDividendTax,
  calculateInterestTax,
} from '../src/core/calculator';
import type { Transaction, DividendRecord, InterestRecord } from '../src/core/types';

describe('汇率模块', () => {
  test('获取支持的年份列表', () => {
    const years = getSupportedYears();
    expect(years).toContain(2024);
    expect(years).toContain(2023);
    expect(years.length).toBeGreaterThanOrEqual(5);
  });

  test('获取2024年汇率数据', () => {
    const rate = getExchangeRate(2024);
    expect(rate).not.toBeNull();
    expect(rate?.USD).toBe(718.84);
    expect(rate?.HKD).toBe(92.604);
  });

  test('不存在的年份返回null', () => {
    const rate = getExchangeRate(2000);
    expect(rate).toBeNull();
  });

  test('USD转CNY', () => {
    // 100 USD * 718.84 / 100 = 718.84 CNY
    const cny = convertToCNY(100, 'USD', 2024);
    expect(cny).toBeCloseTo(718.84, 2);
  });

  test('HKD转CNY', () => {
    // 100 HKD * 92.604 / 100 = 92.604 CNY
    const cny = convertToCNY(100, 'HKD', 2024);
    expect(cny).toBeCloseTo(92.604, 2);
  });

  test('CNY无需转换', () => {
    const cny = convertToCNY(100, 'CNY', 2024);
    expect(cny).toBe(100);
  });

  test('创建Money对象', () => {
    const money = createMoney(100, 'USD');
    expect(money.amount).toBe(100);
    expect(money.currency).toBe('USD');
  });

  test('格式化金额显示', () => {
    expect(formatMoney(createMoney(100, 'USD'))).toBe('$100.00');
    expect(formatMoney(createMoney(100, 'HKD'))).toBe('HK$100.00');
    expect(formatMoney(createMoney(100, 'CNY'))).toBe('¥100.00');
  });

  test('汇率说明文本', () => {
    const desc = getExchangeRateDescription(2024);
    expect(desc).toContain('2024');
    expect(desc).toContain('USD');
    expect(desc).toContain('CNY');
  });
});

describe('解析模块', () => {
  test('从文件名提取年份', () => {
    expect(extractYearFromFileName('2024_年度账单_XXXXXXXX.xlsx')).toBe(2024);
    expect(extractYearFromFileName('2023_利息股息及其他收入汇总_XXXXXXXX.xlsx')).toBe(2023);
    expect(extractYearFromFileName('invalid_file.xlsx')).toBeNull();
  });

  test('检测文件类型', () => {
    expect(detectFileType('2024_年度账单_XXXXXXXX.xlsx')).toBe('annual');
    expect(detectFileType('2024_利息股息及其他收入汇总_XXXXXXXX.xlsx')).toBe('dividend_summary');
    expect(detectFileType('random_file.xlsx')).toBeNull();
  });
});

describe('税务计算模块', () => {
  test('计算资本利得 - 无交易', () => {
    const result = calculateCapitalGains([], 2024);
    expect(result.totalGain.amount).toBe(0);
    expect(result.taxAmount.amount).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  test('计算资本利得 - 有盈利', () => {
    const transactions: Transaction[] = [
      {
        tradeTime: '2024-01-01 10:00:00',
        accountName: 'Test',
        accountId: '123',
        category: '证券',
        symbol: 'AAPL',
        market: 'US',
        direction: '买入开仓',
        settlementDate: '20240103',
        currency: 'USD',
        quantity: 10,
        price: 100,
        tradeAmount: -1000,
        totalFee: 5,
        changeAmount: -1005,
      },
      {
        tradeTime: '2024-06-01 10:00:00',
        accountName: 'Test',
        accountId: '123',
        category: '证券',
        symbol: 'AAPL',
        market: 'US',
        direction: '卖出平仓',
        settlementDate: '20240603',
        currency: 'USD',
        quantity: 10,
        price: 120,
        tradeAmount: 1200,
        totalFee: 5,
        changeAmount: 1195,
      },
    ];

    const result = calculateCapitalGains(transactions, 2024);
    
    // 盈利 = (120 - 100) * 10 - 10 = 190 USD
    // CNY = 190 * 7.1884 = 1365.796
    expect(result.details).toHaveLength(1);
    expect(result.details[0].gain.amount).toBeCloseTo(190, 1);
    expect(result.totalGain.amount).toBeGreaterThan(0);
    
    // 税额 = 盈利 * 20%
    expect(result.taxAmount.amount).toBeCloseTo(result.taxableGain.amount * 0.2, 2);
  });

  test('计算资本利得 - 期权交易', () => {
    const transactions: Transaction[] = [
      {
        tradeTime: '2024-02-01 10:00:00',
        accountName: 'Test',
        accountId: '123',
        category: '期权',
        symbol: 'TSLA250620C600000',
        market: 'US',
        direction: '买入开仓',
        settlementDate: '20240205',
        currency: 'USD',
        quantity: 1,
        price: 5,   // $5 per contract, multiplier 100
        tradeAmount: -500,
        totalFee: 1,
        changeAmount: -501,
      },
      {
        tradeTime: '2024-03-01 10:00:00',
        accountName: 'Test',
        accountId: '123',
        category: '期权',
        symbol: 'TSLA250620C600000',
        market: 'US',
        direction: '卖出平仓',
        settlementDate: '20240305',
        currency: 'USD',
        quantity: 1,
        price: 7,
        tradeAmount: 700,
        totalFee: 1,
        changeAmount: 699,
      },
    ];

    const result = calculateCapitalGains(transactions, 2024);
    // 盈利 = (7-5)*100 - 手续费(按份额)= 200 - 2 = 198 USD
    expect(result.details).toHaveLength(1);
    expect(result.details[0].multiplier).toBe(100);
    expect(result.details[0].gain.amount).toBeCloseTo(198, 2);
    expect(result.byCurrency.find(c => c.currency === 'USD')?.totalGain).toBeCloseTo(198, 2);
    expect(result.taxAmount.amount).toBeGreaterThan(0);
  });

  test('计算股息税 - 有预扣税', () => {
    const dividends: DividendRecord[] = [
      {
        date: '20240108',
        accountName: 'Test',
        accountId: '123',
        symbol: 'AAPL',
        quantity: 100,
        dividendPerShare: 0.24,
        currency: 'USD',
        grossAmount: 24,  // 税前
        withholdingTax: 2.4, // 10%预扣税
        netAmount: 21.6,
      },
    ];

    const result = calculateDividendTax(dividends, 2024);
    
    // 股息 24 USD = 172.52 CNY
    // 应纳税 = 172.52 * 20% = 34.50
    // 预扣税 2.4 USD = 17.25 CNY
    // 可抵免 = min(17.25, 34.50) = 17.25
    // 实际应补 = 34.50 - 17.25 = 17.25
    
    expect(result.totalDividend.amount).toBeGreaterThan(0);
    expect(result.foreignTaxPaid.amount).toBeGreaterThan(0);
    expect(result.taxCredit.amount).toBeGreaterThan(0);
    expect(result.netTaxDue.amount).toBeGreaterThan(0);
    
    // 验证税率
    expect(result.grossTax.amount).toBeCloseTo(result.totalDividend.amount * 0.2, 2);
  });

  test('计算利息税', () => {
    const interests: InterestRecord[] = [
      {
        date: '20241231',
        accountName: 'Test',
        accountId: '123',
        currency: 'USD',
        amount: 100,
        source: 'Money Fund',
      },
    ];

    const result = calculateInterestTax(interests, 2024);
    
    // 利息 100 USD = 718.84 CNY
    // 税额 = 718.84 * 20% = 143.77
    expect(result.totalInterest.amount).toBeCloseTo(718.84, 2);
    expect(result.taxAmount.amount).toBeCloseTo(143.768, 1);
  });
});

describe('股息解析验证', () => {
  test('解析富途2024年度账单股息应与汇总一致', async () => {
    // 富途2024年股息汇总表显示:
    // 美股融资账户: 2232.43 HKD
    // 保证金综合账户-证券: 817.49 HKD
    // 总计: 3049.92 HKD (按香港税务局汇率换算)
    //
    // 原始USD股息应为: 3049.92 / 7.8035 = 390.84 USD
    
    const expectedDividendUSD = 390.84;
    const expectedWithholdingTaxUSD = 39.10;
    const hongKongRate = 7.8035; // 2024年12月香港税务局汇率
    
    // 模拟的股息记录（基于实际账单数据）
    const dividends: DividendRecord[] = [
      { date: '20240108', accountName: '美股孖展帳戶', accountId: '1', symbol: 'MRK', quantity: 100, dividendPerShare: 0.77, currency: 'USD', grossAmount: 77, withholdingTax: 7.7, netAmount: 69.3 },
      { date: '20240327', accountName: '美股孖展帳戶', accountId: '1', symbol: 'NVDA', quantity: 40, dividendPerShare: 0.04, currency: 'USD', grossAmount: 1.6, withholdingTax: 0.16, netAmount: 1.44 },
      { date: '20240401', accountName: '美股孖展帳戶', accountId: '1', symbol: 'WMT', quantity: 500, dividendPerShare: 0.2075, currency: 'USD', grossAmount: 103.74, withholdingTax: 10.38, netAmount: 93.36 },
      { date: '20240528', accountName: '美股孖展帳戶', accountId: '1', symbol: 'WMT', quantity: 500, dividendPerShare: 0.2075, currency: 'USD', grossAmount: 103.74, withholdingTax: 10.38, netAmount: 93.36 },
      { date: '20240903', accountName: '保證金綜合帳戶', accountId: '2', symbol: 'WMT', quantity: 500, dividendPerShare: 0.2075, currency: 'USD', grossAmount: 103.76, withholdingTax: 10.38, netAmount: 93.38 },
      { date: '20241003', accountName: '保證金綜合帳戶', accountId: '2', symbol: 'NVDA', quantity: 100, dividendPerShare: 0.01, currency: 'USD', grossAmount: 1, withholdingTax: 0.1, netAmount: 0.9 },
    ];
    
    const result = calculateDividendTax(dividends, 2024);
    
    // 验证原币种汇总
    const usdSummary = result.byCurrency.find(c => c.currency === 'USD');
    expect(usdSummary).toBeDefined();
    expect(usdSummary!.totalDividend).toBeCloseTo(expectedDividendUSD, 1);
    expect(usdSummary!.withholdingTax).toBeCloseTo(expectedWithholdingTaxUSD, 1);
    
    // 验证按香港汇率换算后与富途汇总一致
    const hkdTotal = usdSummary!.totalDividend * hongKongRate;
    expect(hkdTotal).toBeCloseTo(3049.92, 0);
  });
});

describe('税率验证', () => {
  test('资本利得税率为20%', () => {
    const transactions: Transaction[] = [
      {
        tradeTime: '2024-01-01 10:00:00',
        accountName: 'Test',
        accountId: '123',
        category: '证券',
        symbol: 'TEST',
        market: 'US',
        direction: '买入开仓',
        settlementDate: '20240103',
        currency: 'CNY', // 直接用CNY避免汇率转换
        quantity: 100,
        price: 100,
        tradeAmount: -10000,
        totalFee: 0,
        changeAmount: -10000,
      },
      {
        tradeTime: '2024-06-01 10:00:00',
        accountName: 'Test',
        accountId: '123',
        category: '证券',
        symbol: 'TEST',
        market: 'US',
        direction: '卖出平仓',
        settlementDate: '20240603',
        currency: 'CNY',
        quantity: 100,
        price: 110, // 盈利 1000 CNY
        tradeAmount: 11000,
        totalFee: 0,
        changeAmount: 11000,
      },
    ];

    const result = calculateCapitalGains(transactions, 2024);
    
    // 盈利 = (110 - 100) * 100 = 1000 CNY
    // 税额 = 1000 * 20% = 200 CNY
    expect(result.totalGain.amount).toBe(1000);
    expect(result.taxAmount.amount).toBe(200);
  });

  test('股息税率为20%', () => {
    const dividends: DividendRecord[] = [
      {
        date: '20240108',
        accountName: 'Test',
        accountId: '123',
        symbol: 'TEST',
        quantity: 100,
        dividendPerShare: 10,
        currency: 'CNY',
        grossAmount: 1000,
        withholdingTax: 0,
        netAmount: 1000,
      },
    ];

    const result = calculateDividendTax(dividends, 2024);
    
    // 股息 1000 CNY
    // 税额 = 1000 * 20% = 200 CNY
    expect(result.totalDividend.amount).toBe(1000);
    expect(result.grossTax.amount).toBe(200);
    expect(result.netTaxDue.amount).toBe(200); // 无预扣税
  });

  test('利息税率为20%', () => {
    const interests: InterestRecord[] = [
      {
        date: '20241231',
        accountName: 'Test',
        accountId: '123',
        currency: 'CNY',
        amount: 1000,
        source: 'Test',
      },
    ];

    const result = calculateInterestTax(interests, 2024);
    
    // 利息 1000 CNY
    // 税额 = 1000 * 20% = 200 CNY
    expect(result.totalInterest.amount).toBe(1000);
    expect(result.taxAmount.amount).toBe(200);
  });
});
