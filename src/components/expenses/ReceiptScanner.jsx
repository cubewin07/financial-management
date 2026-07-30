import { useState } from 'react';
import { CustomFileInput } from '../ui/forms';

export default function ReceiptScanner({ isProcessing, error, onProcessFiles, onCancel }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleScan = () => {
    if (selectedFile) {
      onProcessFiles([selectedFile]);
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center text-center py-4">
      <div>
        <h3 className="text-xl font-bold text-slate-100">Upload Receipt (AI Scan)</h3>
        <p className="text-sm text-slate-400 mt-1">
          Drop your receipt image or document below for instant AI item extraction.
        </p>
      </div>

      <div className="w-full">
        <CustomFileInput
          onFileSelect={setSelectedFile}
          accept="image/*,.pdf"
          disabled={isProcessing}
          error={error}
        />
      </div>

      <div className="flex flex-col w-full gap-3 mt-2">
        <button
          type="button"
          onClick={handleScan}
          disabled={!selectedFile || isProcessing}
          className="w-full py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="status-spinner" />
              <span>Analyzing Receipt...</span>
            </>
          ) : (
            'Process Receipt with AI'
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="text-sm font-medium text-slate-400 hover:text-slate-200 py-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
