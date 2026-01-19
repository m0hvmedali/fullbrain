
import React, { useRef, useState } from 'react';
import { X, Upload, Folder, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  onImport: (files: FileList) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFiles = (files: FileList | null) => {
    if (files) setSelectedFiles(Array.from(files));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md" dir="rtl">
      <div className="w-full max-w-3xl bg-[#0F0F0F] border border-[#1A1A1A] rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-8 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600/20 text-indigo-500 rounded-xl"><Upload size={20} /></div>
             <h2 className="text-2xl font-bold">استيراد الذاكرة</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-6">
              <div className="p-6 bg-[#141414] border border-[#1A1A1A] rounded-3xl hover:border-indigo-500/50 transition-all cursor-pointer group" onClick={() => inputRef.current?.click()}>
                 <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                 <FileText className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                 <h4 className="font-bold text-lg">اختيار ملفات</h4>
                 <p className="text-xs text-gray-500 mt-1">اختر ملفات TXT أو JSON بشكل فردي</p>
              </div>

              <div className="p-6 bg-[#141414] border border-[#1A1A1A] rounded-3xl hover:border-indigo-500/50 transition-all cursor-pointer group" onClick={() => folderRef.current?.click()}>
                 {/* @ts-ignore */}
                 <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                 <Folder className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
                 <h4 className="font-bold text-lg">استيراد مجلد كامل</h4>
                 <p className="text-xs text-gray-500 mt-1">سيتم مسح كل ما بداخل المجلد تلقائياً</p>
              </div>
           </div>

           <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-6 flex flex-col">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">الملفات المختارة ({selectedFiles.length})</h4>
              <div className="flex-1 overflow-y-auto space-y-2 mb-6 max-h-48 custom-scrollbar">
                 {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#121212] rounded-lg text-[10px] font-mono border border-[#1A1A1A]">
                       <span className="truncate w-40 text-left" dir="ltr">{f.name}</span>
                       <CheckCircle2 size={12} className="text-indigo-500" />
                    </div>
                 ))}
                 {selectedFiles.length === 0 && <p className="text-gray-600 text-center text-xs mt-10">لا توجد ملفات جاهزة</p>}
              </div>
              
              <button 
                disabled={selectedFiles.length === 0}
                onClick={() => {
                  const dt = new DataTransfer();
                  selectedFiles.forEach(f => dt.items.add(f));
                  onImport(dt.files);
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/10"
              >
                بدء معالجة الذاكرة
              </button>
           </div>
        </div>

        <div className="px-10 pb-10 flex items-center gap-2 text-[10px] text-gray-600">
           <ShieldCheck size={14} className="text-green-600" />
           <span>نظام آمن: تتم معالجة كافة البيانات محلياً داخل المتصفح ولا يتم إرسال أي شيء للسحابة.</span>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
