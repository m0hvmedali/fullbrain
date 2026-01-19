
import React, { useRef, useState } from 'react';
import { X, Upload, FileText, CheckCircle2 } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  onImport: (files: FileList) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#121212] border border-[#1A1A1A] rounded-3xl overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-10 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Import Data</h2>
            <p className="text-gray-500">Upload your WhatsApp (.txt), Instagram (.json), or ChatGPT (.json) exports.</p>
          </div>

          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#222] hover:border-indigo-500/50 bg-[#0D0D0D]'}`}
          >
            <input 
              ref={inputRef}
              type="file" 
              multiple 
              className="hidden" 
              onChange={handleChange}
              accept=".txt,.json"
            />
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-4">
              <Upload size={32} />
            </div>
            <p className="text-lg font-medium">Click to upload or drag & drop</p>
            <p className="text-sm text-gray-500 mt-2">Maximum file size: 50MB</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Files Ready ({selectedFiles.length})</h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-xl border border-[#222]">
                    <FileText size={18} className="text-gray-500" />
                    <span className="flex-1 text-sm truncate font-mono">{f.name}</span>
                    <CheckCircle2 size={18} className="text-indigo-500" />
                  </div>
                ))}
              </div>
              <button 
                onClick={() => {
                   const dt = new DataTransfer();
                   selectedFiles.forEach(f => dt.items.add(f));
                   onImport(dt.files);
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20"
              >
                Process {selectedFiles.length} Files
              </button>
            </div>
          )}

          <div className="pt-6 border-t border-[#1A1A1A] grid grid-cols-3 gap-6 opacity-60">
             <div className="text-center">
                <p className="text-xs font-bold text-green-500 uppercase mb-1">WhatsApp</p>
                <p className="text-[10px] text-gray-500">Auto-detects UTF-8 .txt exports</p>
             </div>
             <div className="text-center border-x border-[#1A1A1A]">
                <p className="text-xs font-bold text-pink-500 uppercase mb-1">Instagram</p>
                <p className="text-[10px] text-gray-500">Supports message_*.json format</p>
             </div>
             <div className="text-center">
                <p className="text-xs font-bold text-teal-500 uppercase mb-1">ChatGPT</p>
                <p className="text-[10px] text-gray-500">Import conversations.json dump</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
