/**
 * 富途账单解析模块
 * 
 * 支持解析：
 * 1. 年度账单 (XXXX_年度账单_XXXXXXXX.xlsx)
 * 2. 利息股息汇总 (XXXX_利息股息及其他收入汇总_XXXXXXXX.xlsx)
 */

import * as XLSX from 'xlsx';
import type {
  AccountInfo,
  Currency,
  DividendRecord,
  DividendSummaryRecord,
  FundFlow,
  Holding,
  InterestRecord,
  ParsedBill,
  Transaction,
  UnrecognizedRecord,
  Year,
} from './types';

/**
 * 从文件名中提取年份
 */
export function extractYearFromFileName(fileName: string): Year | null {
  const match = fileName.match(/^(\d{4})_/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 判断文件类型
 */
export function detectFileType(fileName: string): 'annual' | 'dividend_summary' | null {
  if (fileName.includes('年度账单')) {
    return 'annual';
  }
  if (fileName.includes('利息股息')) {
    return 'dividend_summary';
  }
  return null;
}

/**
 * 解析币种
 */
function parseCurrency(value: string): Currency {
  const upper = value?.toUpperCase?.() || '';
  if (upper === 'USD' || upper.includes('美')) return 'USD';
  if (upper === 'HKD' || upper.includes('港')) return 'HKD';
  if (upper === 'CNY' || upper.includes('人民币')) return 'CNY';
  return 'HKD'; // 默认港币
}

/**
 * 安全解析数字
 */
function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * 解析账户信息表
 */
function parseAccountInfo(sheet: XLSX.WorkSheet): AccountInfo[] {
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
  if (data.length < 2) return [];

  const headers = data[0] as string[];
  const accounts: AccountInfo[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const getCol = (name: string): unknown => {
      const idx = headers.findIndex(h => h?.includes?.(name));
      return idx >= 0 ? row[idx] : undefined;
    };

    accounts.push({
      name: String(getCol('姓名') || ''),
      niuniuId: String(getCol('牛牛号') || ''),
      accountId: String(getCol('账户号码') || getCol('账户') || ''),
      accountName: String(getCol('账户名称') || ''),
      year: parseNumber(getCol('年份')),
    });
  }

  return accounts.filter(a => a.niuniuId);
}

/**
 * 解析持仓总览表
 */
function parseHoldings(sheet: XLSX.WorkSheet): Holding[] {
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
  if (data.length < 2) return [];

  const headers = data[0] as string[];
  const holdings: Holding[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const getCol = (name: string): unknown => {
      const idx = headers.findIndex(h => h?.includes?.(name));
      return idx >= 0 ? row[idx] : undefined;
    };

    const periodType = String(getCol('时期类型') || '');
    if (!periodType.includes('期初') && !periodType.includes('期末')) continue;

    holdings.push({
      periodType: periodType.includes('期初') ? '期初' : '期末',
      date: String(getCol('日期') || ''),
      category: String(getCol('品类') || ''),
      accountName: String(getCol('账户名称') || ''),
      accountId: String(getCol('账户号码') || ''),
      symbol: String(getCol('代码名称') || ''),
      market: String(getCol('交易所') || getCol('市场') || ''),
      currency: parseCurrency(String(getCol('币种') || '')),
      quantity: parseNumber(getCol('数量') || getCol('面值')),
      price: parseNumber(getCol('价格')),
      multiplier: parseNumber(getCol('乘数')) || 1,
      accruedInterest: parseNumber(getCol('应计利息')),
      marketValue: parseNumber(getCol('市值')),
    });
  }

  return holdings;
}

/**
 * 解析交易流水表
 */
function parseTransactions(
  sheet: XLSX.WorkSheet,
  skipped: UnrecognizedRecord[]
): Transaction[] {
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
  if (data.length < 2) return [];

  const headers = data[0] as string[];
  const transactions: Transaction[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const getCol = (name: string): unknown => {
      const idx = headers.findIndex(h => h?.includes?.(name));
      return idx >= 0 ? row[idx] : undefined;
    };

    const direction = String(getCol('方向') || '');
    if (!direction) {
      // 记录被跳过的行
      const symbol = String(getCol('代码名称') || '');
      if (symbol) {
        skipped.push({
          source: '证券-交易流水',
          rowIndex: i + 1,
          data: Object.fromEntries(headers.map((h, idx) => [h, row[idx]])),
          reason: '缺少方向字段',
        });
      }
      continue;
    }

    transactions.push({
      tradeTime: String(getCol('成交时间') || ''),
      accountName: String(getCol('账户名称') || ''),
      accountId: String(getCol('账户号码') || ''),
      category: String(getCol('品类') || ''),
      symbol: String(getCol('代码名称') || ''),
      market: String(getCol('交易所') || getCol('市场') || ''),
      direction: direction as Transaction['direction'],
      settlementDate: String(getCol('交收日期') || ''),
      currency: parseCurrency(String(getCol('币种') || '')),
      quantity: Math.abs(parseNumber(getCol('数量') || getCol('面值'))),
      price: parseNumber(getCol('价格')),
      tradeAmount: parseNumber(getCol('成交金额')),
      totalFee: parseNumber(getCol('总费用')),
      changeAmount: parseNumber(getCol('变动金额')),
    });
  }

  return transactions;
}

/**
 * 解析资金进出表
 */
function parseFundFlows(
  sheet: XLSX.WorkSheet,
  skipped: UnrecognizedRecord[]
): FundFlow[] {
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
  if (data.length < 2) return [];

  const headers = data[0] as string[];
  const flows: FundFlow[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const getCol = (name: string): unknown => {
      const idx = headers.findIndex(h => h?.includes?.(name));
      return idx >= 0 ? row[idx] : undefined;
    };

    const direction = String(getCol('方向') || '');
    if (!direction.includes('IN') && !direction.includes('OUT')) {
      // 记录被跳过的行
      const amount = parseNumber(getCol('变动金额'));
      if (amount !== 0) {
        skipped.push({
          source: '证券-资金进出',
          rowIndex: i + 1,
          data: Object.fromEntries(headers.map((h, idx) => [h, row[idx]])),
          reason: '缺少方向字段(IN/OUT)',
        });
      }
      continue;
    }

    flows.push({
      date: String(getCol('日期') || ''),
      accountName: String(getCol('账户名称') || ''),
      accountId: String(getCol('账户号码') || ''),
      type: String(getCol('类型') || ''),
      direction: direction.includes('IN') ? 'IN' : 'OUT',
      currency: parseCurrency(String(getCol('币种') || '')),
      amount: Math.abs(parseNumber(getCol('变动金额'))),
      remark: String(getCol('备注') || ''),
    });
  }

  return flows;
}

/**
 * 从资金进出记录中提取股息记录
 * 股息备注格式: "MRK 100.00000000 SHARES DIVIDENDS 0.77 USD PER SHARE"
 * 预扣税备注格式: "MRK 100.00000000 SHARES WITHHOLDING TAX -0.07700024 USD PER SHARE - TAX"
 */
function extractDividendsFromFundFlows(flows: FundFlow[]): DividendRecord[] {
  const dividendMap = new Map<string, DividendRecord>();

  for (const flow of flows) {
    const remark = flow.remark.toUpperCase();
    
    // 匹配股息记录
    const dividendMatch = remark.match(/^(\S+)\s+([\d.]+)\s+SHARES\s+DIVIDENDS?\s+([\d.]+)\s+(\w+)\s+PER\s+SHARE/i);
    if (dividendMatch) {
      const [, symbol, shares, perShare, currency] = dividendMatch;
      const key = `${flow.date}-${symbol}-${flow.accountId}`;
      
      if (!dividendMap.has(key)) {
        dividendMap.set(key, {
          date: flow.date,
          accountName: flow.accountName,
          accountId: flow.accountId,
          symbol,
          quantity: parseFloat(shares),
          dividendPerShare: parseFloat(perShare),
          currency: parseCurrency(currency),
          grossAmount: flow.amount,
          withholdingTax: 0,
          netAmount: flow.amount,
        });
      } else {
        const record = dividendMap.get(key)!;
        record.grossAmount = flow.amount;
        record.netAmount = record.grossAmount - record.withholdingTax;
      }
      continue;
    }

    // 匹配预扣税记录
    const taxMatch = remark.match(/^(\S+)\s+([\d.]+)\s+SHARES\s+WITHHOLDING\s+TAX/i);
    if (taxMatch) {
      const [, symbol] = taxMatch;
      const key = `${flow.date}-${symbol}-${flow.accountId}`;
      
      if (dividendMap.has(key)) {
        const record = dividendMap.get(key)!;
        record.withholdingTax = flow.amount;
        record.netAmount = record.grossAmount - record.withholdingTax;
      } else {
        // 预扣税先于股息出现，创建占位记录
        dividendMap.set(key, {
          date: flow.date,
          accountName: flow.accountName,
          accountId: flow.accountId,
          symbol,
          quantity: 0,
          dividendPerShare: 0,
          currency: flow.currency,
          grossAmount: 0,
          withholdingTax: flow.amount,
          netAmount: 0,
        });
      }
    }
  }

  return Array.from(dividendMap.values()).filter(d => d.grossAmount > 0);
}

/**
 * 从资金进出记录中提取利息记录
 * 利息一般来自货币基金
 */
function extractInterestsFromFundFlows(flows: FundFlow[]): InterestRecord[] {
  const interests: InterestRecord[] = [];

  for (const flow of flows) {
    // 暂时不提取利息，因为账单中的利息主要来自货币基金申赎
    // 如需支持可在此扩展
  }

  return interests;
}

/**
 * 解析利息股息汇总文件
 */
function parseDividendSummary(sheet: XLSX.WorkSheet): DividendSummaryRecord[] {
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
  if (data.length < 2) return [];

  const headers = data[0] as string[];
  const records: DividendSummaryRecord[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const getCol = (name: string): unknown => {
      const idx = headers.findIndex(h => h?.includes?.(name));
      return idx >= 0 ? row[idx] : undefined;
    };

    records.push({
      niuniuId: String(getCol('牛牛号') || ''),
      year: parseNumber(getCol('年份')),
      accountName: String(getCol('账户名称') || ''),
      totalDividend: parseNumber(getCol('全年股息') || getCol('股息')),
      totalInterest: parseNumber(getCol('全年利息') || getCol('利息')),
      totalOther: parseNumber(getCol('全年其他') || getCol('其他')),
      currency: parseCurrency(String(getCol('币种') || '')),
    });
  }

  return records.filter(r => r.niuniuId);
}

/**
 * 解析年度账单文件
 */
export function parseAnnualBill(workbook: XLSX.WorkBook, fileName: string): ParsedBill {
  const year = extractYearFromFileName(fileName) || new Date().getFullYear();
  const unrecognized: UnrecognizedRecord[] = [];
  
  const result: ParsedBill = {
    year,
    fileName,
    fileType: 'annual',
    accountInfo: [],
    holdings: [],
    transactions: [],
    fundFlows: [],
    dividends: [],
    interests: [],
    unrecognized,
  };

  // 解析各个 Sheet
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    
    if (sheetName.includes('账户信息')) {
      result.accountInfo = parseAccountInfo(sheet);
    } else if (sheetName.includes('持仓总览')) {
      result.holdings = parseHoldings(sheet);
    } else if (sheetName.includes('交易流水')) {
      result.transactions = parseTransactions(sheet, unrecognized);
    } else if (sheetName.includes('资金进出')) {
      result.fundFlows = parseFundFlows(sheet, unrecognized);
    }
    // 其他已知辅助表（资金总览、资产进出、参考汇率等）无需报告
  }

  // 从资金进出中提取股息和利息
  result.dividends = extractDividendsFromFundFlows(result.fundFlows);
  result.interests = extractInterestsFromFundFlows(result.fundFlows);

  return result;
}

/**
 * 解析利息股息汇总文件
 */
export function parseDividendSummaryFile(workbook: XLSX.WorkBook, fileName: string): ParsedBill {
  const year = extractYearFromFileName(fileName) || new Date().getFullYear();
  
  const result: ParsedBill = {
    year,
    fileName,
    fileType: 'dividend_summary',
    accountInfo: [],
    holdings: [],
    transactions: [],
    fundFlows: [],
    dividends: [],
    interests: [],
    unrecognized: [],
  };

  // 解析账户信息和汇总表
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    
    if (sheetName.includes('账户信息')) {
      result.accountInfo = parseAccountInfo(sheet);
    } else if (sheetName.includes('股息') || sheetName.includes('利息')) {
      const summaries = parseDividendSummary(sheet);
      // 将汇总记录转换为 DividendRecord（用于核对）
      for (const s of summaries) {
        if (s.totalDividend > 0) {
          result.dividends.push({
            date: `${s.year}0101`,
            accountName: s.accountName,
            accountId: '',
            symbol: '汇总',
            quantity: 0,
            dividendPerShare: 0,
            currency: s.currency,
            grossAmount: s.totalDividend,
            withholdingTax: 0,
            netAmount: s.totalDividend,
          });
        }
      }
    }
  }

  return result;
}

/**
 * 解析账单文件（自动识别类型）
 */
export function parseBillFile(workbook: XLSX.WorkBook, fileName: string): ParsedBill {
  const fileType = detectFileType(fileName);
  
  if (fileType === 'annual') {
    return parseAnnualBill(workbook, fileName);
  } else if (fileType === 'dividend_summary') {
    return parseDividendSummaryFile(workbook, fileName);
  }
  
  // 默认按年度账单解析
  return parseAnnualBill(workbook, fileName);
}

/**
 * 从 ArrayBuffer 解析账单
 */
export function parseBillFromBuffer(buffer: ArrayBuffer, fileName: string): ParsedBill {
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseBillFile(workbook, fileName);
}

/**
 * 从文件路径解析账单（CLI 使用）
 */
export function parseBillFromPath(filePath: string): ParsedBill {
  const workbook = XLSX.readFile(filePath);
  const fileName = filePath.split('/').pop() || filePath;
  return parseBillFile(workbook, fileName);
}
