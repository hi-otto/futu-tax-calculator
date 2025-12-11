import React, { useState, useCallback } from 'react';
import { Calculator, Shield, Github, ExternalLink } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { TaxResultDisplay } from './components/TaxResult';
import { parseBillFromBuffer, calculateTax } from './core';
import type { ParsedBill, TaxResult } from './core/types';
import './index.css';

export function App() {
  const [bills, setBills] = useState<ParsedBill[]>([]);
  const [results, setResults] = useState<TaxResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setError(null);

    try {
      const parsedBills: ParsedBill[] = [];

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const bill = parseBillFromBuffer(buffer, file.name);
        parsedBills.push(bill);
      }

      // 使用函数式更新确保获取最新state
      setBills(prev => {
        const allBills = [...prev, ...parsedBills];
        // 计算税务
        const taxResults = calculateTax(allBills);
        setResults(taxResults);
        return allBills;
      });
    } catch (err) {
      console.error('解析错误:', err);
      setError(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setBills([]);
    setResults([]);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">富途税务计算器</h1>
              <p className="text-xs text-gray-500">港美股投资个税计算</p>
            </div>
          </div>

          <a
            href="https://github.com/hi-otto/futu-tax-calculator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">⭐ Star</span>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            境外证券投资
            <br className="sm:hidden" />
            <span className="text-blue-500">税务计算</span>
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            上传富途年度账单，自动计算资本利得税、股息税等应纳税额
          </p>
        </div>

        {/* 隐私提示 */}
        <div className="flex items-center justify-center gap-2 mb-8 p-3 bg-green-50 rounded-xl">
          <Shield className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">
            所有计算在本地完成，您的数据不会上传到任何服务器
          </p>
        </div>

        {/* 文件上传 */}
        <section className="mb-12">
          <FileUploader
            onFilesSelected={handleFilesSelected}
            onClear={handleClear}
            isProcessing={isProcessing}
          />

          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-blue-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>正在解析文件...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </section>

        {/* 计算按钮 */}
        {bills.length > 0 && results.length === 0 && !isProcessing && (
          <div className="flex justify-center mb-12">
            <button
              onClick={() => {
                const taxResults = calculateTax(bills);
                setResults(taxResults);
              }}
              className="px-8 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
            >
              开始计算
            </button>
          </div>
        )}

        {/* 计算结果 */}
        <section>
          <TaxResultDisplay
            results={results}
            unrecognized={bills.flatMap(b => (b.unrecognized ?? []).map(u => ({ source: u.source, reason: u.reason })))}
          />
        </section>

        {/* 说明信息 */}
        {results.length === 0 && bills.length === 0 && (
          <section className="mt-16">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
              使用说明
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-gray-100">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">1️⃣</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">下载账单</h4>
                <p className="text-sm text-gray-500">
                  富途牛牛APP：
                  <span className="block mt-1 text-blue-600 font-medium">
                    账户 → 更多 → 我的税表 → 年度账单
                  </span>
                  <span className="block mt-2 text-xs text-gray-400">
                    下载「年度账单.xlsx」即可，「利息股息汇总」可用于核对
                  </span>
                </p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-gray-100">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">2️⃣</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">上传文件</h4>
                <p className="text-sm text-gray-500">
                  上传「年度账单.xlsx」到上方区域，支持多年度多账户
                </p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-gray-100">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">3️⃣</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">查看结果</h4>
                <p className="text-sm text-gray-500">
                  自动计算税务并生成报告，可导出CSV
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              <p>© {new Date().getFullYear()} 富途税务计算器 | 开源项目</p>
              <p className="text-xs mt-1">
                汇率来源：
                <a
                  href="https://www.safe.gov.cn/safe/rmbhlzjj/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-1"
                >
                  中国国家外汇管理局
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a
                href="https://github.com/hi-otto/futu-tax-calculator"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                ⭐ 给个 Star
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
