/**
 * 核心模块导出
 */

// 类型
export * from './types';

// 汇率
export {
  EXCHANGE_RATES,
  getExchangeRate,
  getSupportedYears,
  convertToCNY,
  convertMoneyToCNY,
  convert,
  convertMoney,
  createMoney,
  formatMoney,
  formatNumberWithCurrency,
  getExchangeRateDescription,
} from './exchange';

// 解析
export {
  extractYearFromFileName,
  detectFileType,
  parseAnnualBill,
  parseDividendSummaryFile,
  parseBillFile,
  parseBillFromBuffer,
  parseBillFromPath,
} from './parser';

// 计算
export {
  calculateCapitalGains,
  calculateDividendTax,
  calculateInterestTax,
  calculateTaxSummary,
  calculateAnnualReturn,
  calculateTax,
  formatTaxResultForDisplay,
  exportTaxResultToCSV,
  generateTaxReport,
} from './calculator';
