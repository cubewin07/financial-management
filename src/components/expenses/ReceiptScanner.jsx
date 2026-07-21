import { useRef, useState } from 'react';

export default function ReceiptScanner({ isProcessing, error, onProcessFiles, onCancel }) {
  const fileInput = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileSelect = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleScan = () => {
    if (selectedFiles.length > 0) {
      onProcessFiles(selectedFiles);
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center text-center py-4">
      <div className="w-16 h-16 rounded-full bg-[var(--primary-container)] flex items-center justify-center text-[var(--on-primary)] mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M12 12v9" />
          <path d="m8 17 4 4 4-4" />
        </svg>
      </div>
      
      <div>
        <h3 className="text-headline-md text-[var(--on-surface)]">Upload Receipts</h3>
        <p className="text-body-md text-[var(--on-surface-variant)] mt-2">
          Select one or more receipts to scan with AI.
        </p>
      </div>

      {error && <p className="text-label-md text-[var(--error)]">{error}</p>}

      <input 
        type="file" 
        multiple 
        accept="image/*" 
        ref={fileInput} 
        onChange={handleFileSelect} 
        className="hidden" 
      />

      <div className="flex flex-col w-full gap-4 mt-4">
        {selectedFiles.length > 0 ? (
          <div className="text-body-md text-[var(--primary)] font-medium">
            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
          </div>
        ) : (
          <button 
            type="button" 
            onClick={() => fileInput.current?.click()}
            className="btn-secondary py-3 w-full"
            disabled={isProcessing}
          >
            Choose Files
          </button>
        )}

        <button 
          type="button" 
          onClick={handleScan}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="btn-primary py-3 w-full flex justify-center items-center gap-2"
        >
          {isProcessing ? 'Scanning...' : 'Scan Receipts'}
        </button>

        <button 
          type="button" 
          onClick={onCancel}
          disabled={isProcessing}
          className="text-label-md text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] mt-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
