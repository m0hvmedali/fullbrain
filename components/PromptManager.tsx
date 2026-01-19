
import React, { useState, useEffect } from 'react';
import { PromptTemplate } from '../types';
import { getPromptTemplates, savePromptTemplate, deletePromptTemplate } from '../utils/db';
import { Plus, Trash2, Edit3, Sparkles, Save, X, Info, Layers, Zap, Search, Layout } from 'lucide-react';

const CATEGORIES = ['تحليل شخصي', 'تلخيص', 'استخراج قرارات', 'عواطف ومشاعر', 'تحليل فني', 'عام'];

const PromptManager: React.FC = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isEditing, setIsEditing] = useState<PromptTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const data = await getPromptTemplates();
    setTemplates(data);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTemplate: PromptTemplate = {
      id: isEditing?.id || Math.random().toString(36).substring(2, 15),
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as string,
      createdAt: isEditing?.createdAt || Date.now()
    };
    await savePromptTemplate(newTemplate);
    await loadTemplates();
    setShowForm(false);
    setIsEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      await deletePromptTemplate(id);
      await loadTemplates();
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.title.includes(filter) || t.category.includes(filter)
  );

  return (
    <div className="flex-1 overflow-y-auto p-12 bg-[#060606] animate-fade-in custom-scrollbar" dir="rtl">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-16">
        <div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter flex items-center gap-4">
            <Sparkles className="text-indigo-500" size={40} />
            القوالب الذكية
          </h2>
          <p className="text-gray-500 mt-2 text-lg font-medium">صمّم أدواتك الخاصة لتحليل وفهم تاريخك الرقمي.</p>
        </div>
        <button 
          onClick={() => { setShowForm(true); setIsEditing(null); }}
          className="flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 group"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          إضافة قالب جديد
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 mb-12">
         <div className="relative flex-1 group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="ابحث في القوالب..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-[#0D0D0D] border border-white/5 rounded-[1.5rem] py-5 pr-16 pl-6 text-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-700"
            />
         </div>
         <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <button onClick={() => setFilter('')} className={`px-6 py-4 rounded-xl font-bold whitespace-nowrap transition-all border ${filter === '' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-[#0D0D0D] border-white/5 text-gray-500 hover:text-white'}`}>الكل</button>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-6 py-4 rounded-xl font-bold whitespace-nowrap transition-all border ${filter === cat ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-[#0D0D0D] border-white/5 text-gray-500 hover:text-white'}`}>{cat}</button>
            ))}
         </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-[#080808]/50">
           <Layout size={64} className="text-gray-800 mb-6" />
           <h3 className="text-2xl font-black text-gray-600">لا توجد قوالب تطابق بحثك</h3>
           <p className="text-gray-700 mt-2 font-medium">ابدأ بإنشاء قالب جديد لاستنطاق محادثاتك بذكاء.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredTemplates.map(t => (
            <div key={t.id} className="group p-10 bg-[#0D0D0D] border border-white/5 rounded-[3rem] hover:border-indigo-500/30 transition-all flex flex-col relative overflow-hidden shadow-2xl hover:shadow-indigo-600/5">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-8">
                <div className="px-4 py-1.5 bg-indigo-500/5 border border-indigo-500/10 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] rounded-full">
                  {t.category}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                  <button 
                    onClick={() => { setIsEditing(t); setShowForm(true); }}
                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-indigo-400 rounded-xl transition-all"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(t.id)}
                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-red-400 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-2xl font-black mb-6 text-white group-hover:text-indigo-400 transition-colors leading-tight">{t.title}</h3>
              
              <div className="relative flex-1 mb-10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0D0D0D] pointer-events-none"></div>
                <p className="text-gray-500 text-[15px] leading-loose line-clamp-5 font-mono bg-black/40 p-6 rounded-[2rem] border border-white/5">
                  {t.content}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] font-black text-gray-700 uppercase tracking-widest pt-6 border-t border-white/5">
                <span className="flex items-center gap-2"><Layers size={14}/> {new Date(t.createdAt).toLocaleDateString('ar-EG')}</span>
                <span className="flex items-center gap-1.5 text-indigo-500/50"><Zap size={14} /> قالب نشط</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in">
          <div className="w-full max-w-3xl bg-[#0F0F0F] border border-white/10 rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.2)]">
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-[#121212]">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/20"><Sparkles size={28} /></div>
                  <div>
                    <h2 className="text-3xl font-black text-white">{isEditing ? 'تعديل القالب' : 'قالب ذكي جديد'}</h2>
                    <p className="text-gray-500 text-xs font-bold mt-1 uppercase tracking-widest">تكوين التوجيهات البرمجية للذكاء الاصطناعي</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="p-3 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-2xl transition-all"><X size={28} /></button>
              </div>
              
              <div className="p-12 space-y-10 bg-[#090909]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">عنوان القالب</label>
                    <input 
                      name="title" 
                      required 
                      defaultValue={isEditing?.title}
                      placeholder="مثل: تحليل النوايا..."
                      className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-5 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-700"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">الفئة</label>
                    <select 
                      name="category" 
                      defaultValue={isEditing?.category || 'تحليل عام'}
                      className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-5 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center justify-between">
                    <span>نص التوجيه (Prompt)</span>
                    {/* Escape double curly braces in JSX by using a string literal */}
                    <span className="text-[10px] lowercase text-gray-700 tracking-normal">استخدم <code>{'{{context}}'}</code> كمكان للمحادثة</span>
                  </label>
                  <textarea 
                    name="content" 
                    required 
                    rows={8}
                    defaultValue={isEditing?.content}
                    placeholder="اكتب توجيهاتك هنا..."
                    className="bg-[#0D0D0D] border border-white/5 rounded-[2.5rem] p-8 text-lg leading-relaxed focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all custom-scrollbar font-mono text-gray-300"
                  />
                </div>

                <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 flex gap-5 items-start">
                  <Info className="text-indigo-500 shrink-0" size={24} />
                  <div className="space-y-2">
                     <p className="text-sm font-bold text-gray-300">كيف يعمل هذا؟</p>
                     <p className="text-xs text-gray-500 leading-relaxed">
                       عند تشغيل هذا القالب في شاشة المحادثات، سيقوم Gemini بتحليل آخر 60 رسالة باستخدام هذه التعليمات. تأكد من توضيح المخرجات المطلوبة (مثال: "قدم ملخصاً في نقاط").
                     </p>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-[#121212] border-t border-white/5 flex justify-end gap-5">
                <button type="button" onClick={() => setShowForm(false)} className="px-10 py-5 bg-[#1A1A1A] hover:bg-[#222] text-gray-400 hover:text-white rounded-[1.5rem] font-black transition-all text-sm">إلغاء</button>
                <button type="submit" className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black transition-all shadow-2xl shadow-indigo-600/30 flex items-center gap-3 active:scale-95 text-sm">
                  <Save size={20} /> حفظ القالب الذكي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptManager;
