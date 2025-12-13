import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Download, Info, HelpCircle, AlertTriangle, Calculator } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import type { TaxResult as TaxResultType } from '../core/types';
import { formatMoney, createMoney, convert, formatNumberWithCurrency } from '../core/exchange';
import { exportTaxResultToCSV, generateTaxReport } from '../core/calculator';

interface TaxResultProps {
  results: TaxResultType[];
  unrecognized?: { source: string; reason: string }[];
}

function formatCNY(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 帮助提示组件
function HelpTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-gray-400 hover:text-gray-600 cursor-help"
        aria-label="帮助"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg w-64 z-50 shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </span>
  );
}

// 获取今天日期字符串 YYYY-MM-DD
function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// 滞纳金计算器组件
function LateFeeCalculator({ taxAmount, year }: { taxAmount: number; year: number }) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // 个税汇算截止日期：次年6月30日
  const deadline = new Date(year + 1, 5, 30); // 月份是0-indexed，所以5是6月
  const deadlineStr = `${year + 1}年6月30日`;

  // 计算滞纳天数和滞纳金
  const calculateLateFee = () => {
    if (!selectedDate) return null;
    const payDate = new Date(selectedDate);

    // 如果在截止日期前，无需缴纳滞纳金
    if (payDate <= deadline) {
      return { days: 0, fee: 0, total: taxAmount };
    }

    // 滞纳天数从逾期次日起计算
    const diffTime = payDate.getTime() - deadline.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 滞纳金 = 应纳税额 × 滞纳天数 × 0.05%
    const fee = taxAmount * days * 0.0005;

    return {
      days,
      fee: Math.round(fee * 100) / 100,
      total: Math.round((taxAmount + fee) * 100) / 100
    };
  };

  const result = calculateLateFee();

  if (taxAmount <= 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowCalculator(!showCalculator)}
        className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 transition-colors"
      >
        <Calculator className="w-4 h-4" />
        {showCalculator ? '收起滞纳金计算器' : '如未按时缴税，查看滞纳金'}
      </button>

      {showCalculator && (
        <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">滞纳金规则说明</p>
              <p className="mt-1">根据《税收征管法》规定，未按期缴纳税款的，从滞纳税款之日起，按日加收滞纳税款<strong>万分之五</strong>的滞纳金。</p>
              <p className="mt-1">{year}年度个税汇算截止日期为 <strong>{deadlineStr}</strong>，逾期未缴将从7月1日起计算滞纳金。</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择预计缴税日期：
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={`${year + 1}-01-01`}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {result && selectedDate && (
            <div className="mt-4 p-3 bg-white rounded-lg">
              {result.days === 0 ? (
                <p className="text-green-600 text-sm font-medium">
                  ✓ 该日期在截止日期（{deadlineStr}）之前，无需缴纳滞纳金
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>应缴税款</span>
                    <span>{formatCNY(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>逾期天数</span>
                    <span className="text-amber-600">{result.days} 天</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>滞纳金（{taxAmount.toFixed(2)} × {result.days} × 0.05%）</span>
                    <span className="text-red-500">+ {formatCNY(result.fee)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between font-medium">
                    <span>合计应缴</span>
                    <span className="text-red-600">{formatCNY(result.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  title,
  value,
  subtitle,
  highlight = false
}: {
  title: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`
      p-4 rounded-xl border transition-colors
      ${highlight
        ? 'bg-blue-50 border-blue-100'
        : 'bg-white border-gray-100'
      }
    `}>
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-xl font-semibold mt-1 ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

type DetailTab = 'capital' | 'dividend' | 'rate';

function YearResult({ result, displayCurrency }: { result: TaxResultType, displayCurrency: 'CNY' | 'USD' | 'HKD' }) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('capital');
  const [showFutuCompare, setShowFutuCompare] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 年度标题 */}
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {result.year}年度
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              汇率日期：{result.exchangeRate.date}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">实际应缴税额</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatNumberWithCurrency(
                convert(result.summary.netTaxPayable.amount, 'CNY', displayCurrency, result.year),
                displayCurrency
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ResultCard
            title="资本利得税"
            value={formatNumberWithCurrency(
              convert(result.capitalGains.taxAmount.amount, 'CNY', displayCurrency, result.year),
              displayCurrency
            )}
            subtitle={`盈亏 ${formatNumberWithCurrency(convert(result.capitalGains.totalGain.amount, 'CNY', displayCurrency, result.year), displayCurrency)}`}
          />
          <ResultCard
            title="股息税"
            value={formatNumberWithCurrency(
              convert(result.dividendTax.netTaxDue.amount, 'CNY', displayCurrency, result.year),
              displayCurrency
            )}
            subtitle={`已抵免 ${formatNumberWithCurrency(convert(result.dividendTax.taxCredit.amount, 'CNY', displayCurrency, result.year), displayCurrency)}`}
          />
          <ResultCard
            title="利息税"
            value={formatNumberWithCurrency(
              convert(result.interestTax.taxAmount.amount, 'CNY', displayCurrency, result.year),
              displayCurrency
            )}
            subtitle={`利息 ${formatNumberWithCurrency(convert(result.interestTax.totalInterest.amount, 'CNY', displayCurrency, result.year), displayCurrency)}`}
          />
          <ResultCard
            title="应缴总额"
            value={formatNumberWithCurrency(
              convert(result.summary.netTaxPayable.amount, 'CNY', displayCurrency, result.year),
              displayCurrency
            )}
            highlight
          />
        </div>

        {/* 滞纳金计算器 - 放在概览卡片下方 */}
        <LateFeeCalculator
          taxAmount={result.summary.netTaxPayable.amount}
          year={result.year}
        />

        {/* 与富途核对 */}
        {result.annualReturn && (
          <div className="mt-4">
            <button
              onClick={() => setShowFutuCompare(!showFutuCompare)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              {showFutuCompare ? '收起' : '与富途APP核对数据'}
            </button>

            {showFutuCompare && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl text-sm">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-500">
                    以下为富途口径的「年度收益」，包含未实现盈亏，与税务申报的「已实现盈亏」不同。
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-400">期初市值</p>
                    <p className="text-base font-medium text-gray-700">
                      {formatNumberWithCurrency(convert(result.annualReturn.startMarketValue.amount, 'CNY', displayCurrency, result.year), displayCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">期末市值</p>
                    <p className="text-base font-medium text-gray-700">
                      {formatNumberWithCurrency(convert(result.annualReturn.endMarketValue.amount, 'CNY', displayCurrency, result.year), displayCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">年度收益</p>
                    <p className={`text-base font-medium ${result.annualReturn.totalReturn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNumberWithCurrency(convert(result.annualReturn.totalReturn.amount, 'CNY', displayCurrency, result.year), displayCurrency)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 展开详情 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 mt-6 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? '收起详情' : '查看详情'}
        </button>

        {expanded && (
          <div className="mt-6">
            {/* 详情 Tab 切换 */}
            <div className="flex gap-1 border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('capital')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'capital'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                资本利得（{result.capitalGains.details.length}）
              </button>
              <button
                onClick={() => setActiveTab('dividend')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'dividend'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                股息（{result.dividendTax.details.length}）
              </button>
              <button
                onClick={() => setActiveTab('rate')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'rate'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                汇率信息
              </button>
            </div>

            {/* 资本利得明细 */}
            {activeTab === 'capital' && (
              <div>
                {/* 跨年持仓成本说明 */}
                {result.capitalGains.details.some(d => d.isEstimatedCost) && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-lg text-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="text-amber-700">
                        <p><strong>跨年持仓成本说明</strong></p>
                        <p className="mt-1">部分交易标记为「估算成本」，表示该股票为跨年持仓（去年买入，今年卖出）。成本使用期初持仓市价估算，可能与实际买入价有差异。</p>
                      </div>
                    </div>
                  </div>
                )}
                {result.capitalGains.details.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 pr-4">标的</th>
                          <th className="pb-2 pr-4">数量</th>
                          <th className="pb-2 pr-4">乘数</th>
                          <th className="pb-2 pr-4">买入额</th>
                          <th className="pb-2 pr-4">卖出额</th>
                          <th className="pb-2 pr-4">费用</th>
                          <th className="pb-2 pr-4">盈亏(原币)</th>
                          <th className="pb-2">盈亏(CNY)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.capitalGains.details.map((d, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-2 pr-4 font-medium">{d.symbol}{d.category === '期权' ? '（期权）' : ''}</td>
                            <td className="py-2 pr-4">{d.quantity}</td>
                            <td className="py-2 pr-4">{d.multiplier}</td>
                            <td className="py-2 pr-4">
                              {formatMoney(d.buyAmount)}
                              {d.isEstimatedCost && (
                                <span className="ml-1 text-xs text-amber-600">（估算）</span>
                              )}
                            </td>
                            <td className="py-2 pr-4">{formatMoney(d.sellAmount)}</td>
                            <td className="py-2 pr-4">{formatMoney(d.fees)}</td>
                            <td className={`py-2 pr-4 ${d.gain.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatMoney(d.gain)}
                            </td>
                            <td className={`py-2 ${d.gainCNY.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCNY(d.gainCNY.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4">无交易记录</p>
                )}
              </div>
            )}

            {/* 股息明细 */}
            {activeTab === 'dividend' && (
              <div>
                {/* 预扣税说明 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-gray-600">
                      <p><strong>什么是预扣税（Withholding Tax）？</strong></p>
                      <p className="mt-1">预扣税是境外（如美国、香港）公司在派发股息时，<strong>由当地税务机关直接扣除</strong>的税款。例如美股股息通常被预扣10%的税。这部分税款您已实际支付，在计算中国个税时可以<strong>抵免</strong>，避免重复纳税。</p>
                    </div>
                  </div>
                </div>
                {/* 按币种汇总 - 方便核对 */}
                {result.dividendTax.byCurrency.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-blue-700 font-medium mb-1">按币种汇总（原币种，用于核对账单）：</p>
                    {result.dividendTax.byCurrency.map((c, i) => (
                      <p key={i} className="text-blue-600">
                        {c.currency}: 股息 {formatNumberWithCurrency(c.totalDividend, c.currency)} |
                        预扣税 {formatNumberWithCurrency(c.withholdingTax, c.currency)}
                        <HelpTooltip text="预扣税是境外在派发股息时已扣除的税款，可用于抵免中国个税" />
                      </p>
                    ))}
                  </div>
                )}
                {result.dividendTax.details.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 pr-4">股票</th>
                          <th className="pb-2 pr-4">日期</th>
                          <th className="pb-2 pr-4">税前股息</th>
                          <th className="pb-2 pr-4">
                            <span className="inline-flex items-center">
                              预扣税
                              <HelpTooltip text="境外在派发股息时已代扣的税款，可抵免中国个税" />
                            </span>
                          </th>
                          <th className="pb-2">税后股息</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.dividendTax.details.map((d, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-2 pr-4 font-medium">{d.symbol}</td>
                            <td className="py-2 pr-4">{d.date}</td>
                            <td className="py-2 pr-4">
                              {formatMoney(createMoney(d.grossAmount, d.currency))}
                            </td>
                            <td className="py-2 pr-4 text-red-600">
                              -{formatMoney(createMoney(d.withholdingTax, d.currency))}
                            </td>
                            <td className="py-2">
                              {formatMoney(createMoney(d.netAmount, d.currency))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4">无股息记录</p>
                )}
              </div>
            )}

            {/* 汇率信息 */}
            {activeTab === 'rate' && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="text-sm text-gray-500">
                    <p className="font-medium text-gray-700 mb-2">汇率信息（{result.exchangeRate.date}）</p>
                    <p>1 USD = {(result.exchangeRate.USD / 100).toFixed(4)} CNY</p>
                    <p>1 HKD = {(result.exchangeRate.HKD / 100).toFixed(4)} CNY</p>
                    <p className="text-xs mt-2 text-gray-400">来源：{result.exchangeRate.source}</p>
                    <p className="text-xs text-gray-400 mt-1">说明：按照税法规定，年度汇算采用纳税年度最后一日（12月31日）的人民币汇率中间价。</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaxResultDisplay({ results, unrecognized = [] }: TaxResultProps) {
  const [displayCurrency, setDisplayCurrency] = useState<'CNY' | 'USD' | 'HKD'>('USD');
  const [activeYear, setActiveYear] = useState<number>(results[0]?.year ?? new Date().getFullYear());

  // results 变化时自动切换到最新年度
  useEffect(() => {
    if (results.length > 0 && !results.some(r => r.year === activeYear)) {
      setActiveYear(results[0].year);
    }
  }, [results, activeYear]);

  const handleExportCSV = () => {
    const csv = exportTaxResultToCSV(results, displayCurrency);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `税务计算结果_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    const reports = results.map(r => generateTaxReport(r, displayCurrency)).join('\n\n');
    const blob = new Blob([reports], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `税务报告_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 顶部控制：年份 Tab + 币种切换 + 导出 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {results.map(r => (
            <button
              key={r.year}
              onClick={() => setActiveYear(r.year)}
              className={`px-4 py-1.5 rounded-lg text-sm whitespace-nowrap border min-w-[64px] text-center ${activeYear === r.year ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {r.year}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* 币种切换 Tabs */}
          <Tabs value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as 'CNY' | 'USD' | 'HKD')}>
            <TabsList>
              <TabsTrigger value="USD">USD</TabsTrigger>
              <TabsTrigger value="CNY">CNY</TabsTrigger>
              <TabsTrigger value="HKD">HKD</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 CSV
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>
      </div>

      {/* 年度结果（Tab 切换）*/}
      {results.filter(r => r.year === activeYear).map(result => (
        <YearResult key={result.year} result={result} displayCurrency={displayCurrency} />
      ))}

      {/* 未识别条目提示 */}
      {unrecognized.length > 0 && (
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-sm text-orange-700 mb-2">
            <strong>提示：</strong>有 {unrecognized.length} 条记录未被识别，可能包含非标准格式的工作表或数据。
          </p>
          <ul className="text-xs text-orange-600 list-disc list-inside space-y-0.5">
            {unrecognized.map((u, i) => (
              <li key={i}>「{u.source}」— {u.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 免责声明 */}
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-sm text-amber-800">
          <strong>免责声明：</strong>本工具仅供参考，不构成税务建议。用户应根据实际情况咨询专业税务顾问，并以税务机关最终核定为准。
        </p>
      </div>
    </div>
  );
}
