import React, { useCallback, useState } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadedFile {
  file: File;
  status: 'pending' | 'parsing' | 'success' | 'error';
  error?: string;
}

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  onClear?: () => void;
  isProcessing?: boolean;
}

export function FileUploader({ onFilesSelected, onClear, isProcessing }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    
    if (droppedFiles.length > 0) {
      const newFiles = droppedFiles.map(file => ({ file, status: 'pending' as const }));
      setFiles(prev => [...prev, ...newFiles]);
      onFilesSelected(droppedFiles);
    }
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    
    if (selectedFiles.length > 0) {
      const newFiles = selectedFiles.map(file => ({ file, status: 'pending' as const }));
      setFiles(prev => [...prev, ...newFiles]);
      onFilesSelected(selectedFiles);
    }
    
    // Reset input
    e.target.value = '';
  }, [onFilesSelected]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    onClear?.();
  }, [onClear]);

  return (
    <div className="w-full">
      {/* 拖拽上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-colors
            ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}
          `}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? '松开以上传文件' : '拖拽文件到此处'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              或 <span className="text-blue-500">点击选择文件</span>
            </p>
          </div>
          
          <p className="text-xs text-gray-400">
            支持富途年度账单 (.xlsx)，可同时上传多个文件
          </p>
        </div>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              已选择 {files.length} 个文件
            </h3>
            <button
              onClick={clearAll}
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={isProcessing}
            >
              清空
            </button>
          </div>
          
          <div className="space-y-2">
            {files.map((item, index) => (
              <div
                key={`${item.file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
              >
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <File className="w-5 h-5 text-green-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(item.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {item.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {item.status === 'parsing' && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  
                  {!isProcessing && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
