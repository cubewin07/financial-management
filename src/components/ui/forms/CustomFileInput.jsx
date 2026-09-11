import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, X } from 'lucide-react';

export function CustomFileInput({
  onFileSelect,
  onFilesSelect,
  accept = 'image/*,.pdf',
  label,
  error,
  disabled = false,
  className = '',
  initialFile = null,
  initialFiles = null,
  multiple = true,
}) {
  const [files, setFiles] = useState(() => {
    if (initialFiles && initialFiles.length > 0) return initialFiles;
    if (initialFile) return [initialFile];
    return [];
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let resolved = [];
    if (initialFiles && initialFiles.length > 0) {
      resolved = initialFiles;
    } else if (initialFile) {
      resolved = [initialFile];
    }
    setFiles(resolved);

    if (resolved.length === 1 && resolved[0].type?.startsWith('image/')) {
      const url = URL.createObjectURL(resolved[0]);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [initialFile, initialFiles]);

  const updateFiles = (newFiles) => {
    setFiles(newFiles);
    if (newFiles.length === 1 && newFiles[0].type?.startsWith('image/')) {
      const url = URL.createObjectURL(newFiles[0]);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    if (onFilesSelect) {
      onFilesSelect(newFiles);
    }
    if (onFileSelect) {
      onFileSelect(newFiles[0] || null);
    }
  };

  const handleIncomingFiles = (incomingList) => {
    if (!incomingList || incomingList.length === 0) return;
    const arr = Array.from(incomingList);
    const valid = arr.filter(f => 
      f.type?.startsWith('image/') || f.type === 'application/pdf' || /\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(f.name)
    );
    if (valid.length === 0) return;

    if (multiple) {
      // Append without duplicate names
      const existingNames = new Set(files.map(f => f.name + f.size));
      const filteredNew = valid.filter(f => !existingNames.has(f.name + f.size));
      updateFiles([...files, ...filteredNew]);
    } else {
      updateFiles([valid[0]]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveSingle = (e) => {
    e.stopPropagation();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    updateFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveIndex = (e, index) => {
    e.stopPropagation();
    const updated = files.filter((_, i) => i !== index);
    updateFiles(updated);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalSizeKb = files.reduce((acc, f) => acc + f.size, 0) / 1024;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => e.target.files && handleIncomingFiles(e.target.files)}
        className="sr-only"
        disabled={disabled}
      />

      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-300 ${
          disabled ? 'opacity-50 cursor-not-allowed border-white/10' : ''
        } ${
          isDragOver
            ? 'border-purple-400 bg-purple-500/10 shadow-[0_0_25px_rgba(168,85,247,0.25)]'
            : files.length > 0
            ? 'border-emerald-500/50 bg-slate-900/80'
            : error
            ? 'border-red-500/50 bg-slate-900/60'
            : 'border-white/15 bg-slate-900/40 hover:border-purple-400/40 hover:bg-slate-900/70'
        }`}
      >
        <AnimatePresence mode="wait">
          {files.length === 1 ? (
            <motion.div
              key="single-selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between w-full px-2"
            >
              <div className="flex items-center gap-3 overflow-hidden text-left">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Receipt thumbnail"
                    className="w-12 h-12 object-cover rounded-xl border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-100 truncate">{files[0].name}</p>
                  <p className="text-xs text-slate-400">
                    {(files[0].size / 1024).toFixed(1)} KB • Ready to process
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveSingle}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
                title="Remove receipt"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : files.length > 1 ? (
            <motion.div
              key="multi-selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col w-full text-left gap-2.5"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200">
                    {files.length} receipts selected
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({totalSizeKb.toFixed(1)} KB total)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSingle}
                  className="text-xs font-medium text-slate-400 hover:text-red-400 transition-colors px-2 py-0.5 rounded-md hover:bg-white/5"
                >
                  Clear all
                </button>
              </div>

              {/* High-density horizontal pill chip wrap */}
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <span
                    key={`${file.name}-${idx}`}
                    className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-800/90 border border-white/10 text-xs text-slate-200 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate max-w-[130px] sm:max-w-[160px] text-[11px]">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(file.size / 1024).toFixed(0)}k
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveIndex(e, idx)}
                      className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors ml-0.5"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 text-center pt-0.5">
                + Click or drop more to add receipts
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Click or drag receipts to upload
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supports multiple PNG, JPG, WebP, PDF files
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
