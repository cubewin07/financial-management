import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, AlertCircle } from 'lucide-react';

export default function ReceiptScanner({ onProcessFiles, onCancel, isProcessing = false, error = '' }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [internalError, setInternalError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (error) {
      setInternalError(error);
    }
  }, [error]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setInternalError('');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const allFiles = Array.from(e.dataTransfer.files);
      const newFiles = allFiles.filter(file => file.type.startsWith('image/'));
      
      if (newFiles.length === 0) {
        setInternalError('Invalid file type. Please upload image files only (e.g., .jpg, .png)');
        return;
      } else if (newFiles.length !== allFiles.length) {
        setInternalError('Some files were ignored because they are not images');
      }
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e) => {
    setInternalError('');
    if (e.target.files && e.target.files.length > 0) {
      const allFiles = Array.from(e.target.files);
      const newFiles = allFiles.filter(file => file.type.startsWith('image/'));
      
      if (newFiles.length === 0) {
        setInternalError('Invalid file type. Please upload image files only (e.g., .jpg, .png)');
        return;
      } else if (newFiles.length !== allFiles.length) {
        setInternalError('Some files were ignored because they are not images');
      }
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = () => {
    if (files.length > 0) {
      setInternalError('');
      onProcessFiles(files);
    }
  };
  
  const displayError = internalError;

  return (
    <div className="section-shell section-shell-purple rounded-[32px] p-5 sm:p-7 md:p-8 flex flex-col min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Scan Receipts</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Upload images to auto-extract expenses.</p>
        </div>
        <button onClick={onCancel} className="btn-secondary h-10 min-h-[40px] px-4 rounded-full">
          Back
        </button>
      </div>

      <div className="flex-grow flex flex-col space-y-6">
        {displayError && (
          <div className="rounded-2xl border border-[rgba(248,113,113,0.26)] bg-[rgba(248,113,113,0.1)] px-4 py-3 text-sm text-[var(--accent-coral)] flex items-start gap-2">
            <AlertCircle size={16} className="min-w-[16px] mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Upload Zone */}
        <div 
          className={`relative flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-3xl transition-colors duration-200 ${
            isDragging 
              ? 'border-[var(--accent-purple)] bg-[rgba(124,111,224,0.1)]' 
              : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden" 
            multiple 
            accept="image/*"
            capture="environment"
          />
          
          <motion.div 
            animate={isDragging ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="p-4 rounded-full bg-[rgba(255,255,255,0.05)] mb-4 transition-colors duration-200"
          >
            <UploadCloud size={32} className="text-[var(--accent-purple)]" />
          </motion.div>
          
          <p className="text-base font-medium text-[var(--text-primary)] text-center hidden md:block">
            Drag and drop receipts here
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 text-center hidden md:block">
            or select them from your files
          </p>
          
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-5 py-2.5 bg-[rgba(124,111,224,0.12)] hover:bg-[rgba(124,111,224,0.2)] border border-[rgba(124,111,224,0.25)] hover:border-[rgba(124,111,224,0.4)] text-[var(--text-primary)] font-medium rounded-2xl flex items-center gap-2 text-sm shadow-md cursor-pointer select-none"
          >
            <UploadCloud size={16} className="text-[var(--accent-purple)]" />
            Choose Files
          </motion.button>
        </div>

        {/* Thumbnail Grid Preview */}
        {files.length > 0 && (
          <div className="space-y-3 relative">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Selected ({files.length})</h3>
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-300 ${isProcessing ? 'blur-sm brightness-50' : ''}`}>
              <AnimatePresence>
                {files.map((file, index) => (
                  <motion.div 
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] group"
                  >
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Receipt ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    {!isProcessing && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                          className="bg-black/50 text-white p-2 rounded-full hover:bg-[var(--accent-coral)] hover:text-black transition-colors"
                          aria-label="Remove image"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {/* Laser Animation Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl pt-8">
                <div className="absolute left-0 right-0 h-1 bg-[var(--accent-purple)] shadow-[0_0_15px_3px_rgba(124,111,224,0.6)] animate-scanner-laser"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-[rgba(124,111,224,0.3)] shadow-xl flex items-center gap-3">
                    <div className="status-spinner"></div>
                    <span className="font-medium text-[var(--accent-purple)] tracking-wide">Processing images with AI...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-end">
        <button 
          onClick={handleSubmit}
          disabled={files.length === 0 || isProcessing}
          className={`btn-primary w-full md:w-auto !min-h-[56px] text-base px-8 shadow-xl ${
            files.length === 0 || isProcessing ? 'opacity-50 cursor-not-allowed' : 'shadow-[var(--accent-purple)]/20'
          }`}
        >
          {isProcessing ? 'Extracting...' : 'Extract Data'}
        </button>
      </div>
    </div>
  );
}
