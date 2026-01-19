
import React, { useState, useRef, useEffect } from 'react';
import { StandardizedMessage } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Send, BrainCircuit, Loader2, Sparkles, MessageSquare, ExternalLink, Info, Mic, MicOff, Volume2, History, Globe, ShieldCheck, Copy, Check, Headphones, AlertTriangle } from 'lucide-react';
import { getAI, AI_MODELS } from '../utils/ai';

interface MemoryAIProps {
  messages: StandardizedMessage[];
  onSelectChat: (id: string) => void;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: { id: string, title: string, content: string }[];
  grounding?: { title: string, uri: string }[];
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

const MemoryAI: React.FC<MemoryAIProps> = ({ messages, onSelectChat }) => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isProcessing]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    const userQuery = query.trim();
    setQuery('');
    setChatHistory(prev => [...prev, { id: Math.random().toString(), role: 'user', content: userQuery }]);
    setIsProcessing(true);
    setApiKeyError(false);

    try {
      const ai = getAI();
      const keywords = userQuery.toLowerCase().split(/\s+/).filter(k => k.length > 2);
      const relevantMessages = messages.filter(m => 
        keywords.some(k => m.content.toLowerCase().includes(k)) || 
        keywords.some(k => m.person_or_title.toLowerCase().includes(k))
      ).sort((a, b) => b.timestamp - a.timestamp).slice(0, 40);

      const context = relevantMessages.map(m => `[ID:${m.conversation_id}] ${m.sender}: ${m.content}`).join('\n');

      const response = await ai.models.generateContent({
        model: AI_MODELS.text,
        contents: `الذاكرة المسترجعة:\n${context}\n\nالسؤال: ${userQuery}`,
        config: { 
          systemInstruction: 'أنت محرك ذكاء اصطناعي للذاكرة الشخصية. أجب بدقة واختصار شديد باللغة العربية بناءً على السجلات. إذا كانت المعلومة غير موجودة، قل "لا توجد سجلات كافية".',
          temperature: 0.2,
          tools: useGrounding ? [{ googleSearch: {} }] : undefined
        }
      });

      const aiResponse = response.text || "لم أتمكن من استحضار الإجابة.";
      const groundingLinks = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((c: any) => c.web)
        ?.map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

      setChatHistory(prev => [...prev, { 
        id: Math.random().toString(),
        role: 'ai', 
        content: aiResponse, 
        citations: relevantMessages.slice(0, 3).map(m => ({ id: m.conversation_id, title: m.person_or_title, content: m.content })),
        grounding: groundingLinks
      }]);
    } catch (error: any) {
      if (error.message === 'API_KEY_MISSING') setApiKeyError(true);
      setChatHistory(prev => [...prev, { id: Math.random().toString(), role: 'ai', content: "عذراً، حدث خطأ في النظام. تأكد من إعداد مفتاح API بشكل صحيح." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleVoiceMode = async () => {
    if (isVoiceActive) { stopVoiceSession(); return; }
    try {
      const ai = getAI();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      setIsVoiceActive(true);
      const sessionPromise = ai.live.connect({
        model: AI_MODELS.voice,
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => setIsVoiceActive(false),
          onerror: () => setIsVoiceActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "أنت مساعد ذاكرة رقمي ذكي باللغة العربية. أجب باختصار فائق.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      setIsVoiceActive(false);
    }
  };

  const stopVoiceSession = () => {
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    setIsVoiceActive(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#060606] h-full overflow-hidden" dir="rtl">
      {/* Header - More Compact */}
      <header className="px-5 py-3 border-b border-white/5 bg-[#080808]/90 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
            <BrainCircuit className="text-indigo-500" size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight text-white">الذاكرة الذكية</h2>
            <div className="flex items-center gap-2">
               <span className="text-[9px] text-gray-500 flex items-center gap-1"><History size={10} /> {messages.length} سجل</span>
               {apiKeyError && <span className="text-[9px] text-red-500 flex items-center gap-1 animate-pulse"><AlertTriangle size={10} /> مفتاح API مفقود</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => setUseGrounding(!useGrounding)} className={`px-3 py-1.5 rounded-lg border transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${useGrounding ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-white/5 border-white/10 text-gray-600 hover:text-gray-300'}`}>
             <Globe size={12} /> {useGrounding ? 'بحث نشط' : 'تفعيل البحث'}
           </button>
           <button onClick={toggleVoiceMode} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] transition-all shadow-lg ${isVoiceActive ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'}`}>
             {isVoiceActive ? <MicOff size={14} /> : <Mic size={14} />} {isVoiceActive ? 'إيقاف الصوت' : 'تحدث الآن'}
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5 max-w-3xl mx-auto w-full relative">
        {!isVoiceActive && chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="w-12 h-12 bg-indigo-500/5 rounded-xl flex items-center justify-center border border-indigo-500/10 mb-4 text-indigo-500">
               <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-black text-white mb-1">ابدأ استنطاق ذاكرتك</h3>
            <p className="text-gray-600 text-[10px] mb-8">اطرح أي سؤال حول سجلاتك وسأقوم بالتحليل الفوري</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
               <SuggestionCard text="ما هي أهم القرارات الأخيرة؟" onClick={() => setQuery("ما هي أهم القرارات الأخيرة؟")} />
               <SuggestionCard text="لخص اهتماماتي الحالية." onClick={() => setQuery("لخص اهتماماتي الحالية.")} />
            </div>
          </div>
        )}

        {isVoiceActive && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
             <div className="w-24 h-24 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/20 mb-6 relative">
                <div className="absolute inset-0 bg-indigo-600/20 rounded-full animate-ping opacity-20"></div>
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl relative z-10">
                   <Headphones size={28} className="text-white" />
                </div>
             </div>
             <p className="text-indigo-400 font-black text-xs animate-pulse">أنا أستمع إليك... تحدث باللغة العربية</p>
          </div>
        )}

        {!isVoiceActive && chatHistory.map((turn) => (
          <div key={turn.id} className={`flex ${turn.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
            <div className={`max-w-[90%] p-3.5 rounded-xl relative group border transition-all ${turn.role === 'user' ? 'bg-[#121212] border-white/5 rounded-tr-none' : 'bg-indigo-600/5 border-indigo-500/10 rounded-tl-none'}`}>
              
              <div className="flex items-center justify-between mb-1.5">
                 <span className={`text-[8px] font-black uppercase tracking-widest ${turn.role === 'user' ? 'text-gray-600' : 'text-indigo-400'}`}>
                   {turn.role === 'user' ? 'أنت' : 'الذاكرة الذكية'}
                 </span>
                 {turn.role === 'ai' && (
                    <button onClick={() => handleCopy(turn.content, turn.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-gray-600 transition-all">
                      {copiedId === turn.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                    </button>
                 )}
              </div>
              
              <p className="text-[13px] leading-relaxed text-gray-300 whitespace-pre-wrap">{turn.content}</p>
              
              {turn.grounding && turn.grounding.length > 0 && (
                 <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                    {turn.grounding.map((g, idx) => (
                       <a key={idx} href={g.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2 py-0.5 bg-teal-500/5 border border-teal-500/10 rounded-md text-[8px] font-bold text-teal-500 hover:bg-teal-500/10">
                          {g.title} <ExternalLink size={8} />
                       </a>
                    ))}
                 </div>
              )}

              {turn.citations && turn.citations.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-white/5 flex flex-col gap-1">
                   <span className="text-[8px] text-gray-700 font-bold">المصادر المكتشفة:</span>
                   {turn.citations.map(cit => (
                     <button key={cit.id} onClick={() => onSelectChat(cit.id)} className="flex items-center justify-between gap-2 px-2 py-1 bg-black/40 border border-white/5 rounded-lg hover:border-indigo-500/30 transition-all group/btn">
                        <span className="text-[9px] font-bold text-gray-500 truncate text-right flex-1">{cit.title}</span>
                        <ExternalLink size={8} className="text-gray-700 group-hover/btn:text-indigo-500" />
                     </button>
                   ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-end animate-fade-in">
             <div className="bg-indigo-600/5 border border-indigo-500/10 px-4 py-2.5 rounded-xl rounded-tl-none flex items-center gap-2">
                <Loader2 className="animate-spin text-indigo-500" size={14} />
                <span className="text-indigo-400 font-bold text-[10px]">جاري مراجعة الذاكرة...</span>
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form - More Sleek */}
      <div className="p-4 border-t border-white/5 bg-[#080808]/95 backdrop-blur-md shrink-0">
        <form onSubmit={handleAsk} className="max-w-3xl mx-auto relative">
          <input 
            type="text"
            value={query}
            disabled={isVoiceActive || isProcessing}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isVoiceActive ? "الوضع الصوتي مفعّل..." : "اسأل ذاكرتك..."}
            className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl py-3 px-5 pr-12 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all placeholder:text-gray-800 disabled:opacity-30"
          />
          <button type="submit" disabled={!query.trim() || isProcessing || isVoiceActive} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-all disabled:bg-gray-800/50 shadow-lg shadow-indigo-600/20">
            <Send size={14} />
          </button>
        </form>
        <div className="flex justify-center mt-3 gap-5 text-[8px] text-gray-700 font-black uppercase tracking-widest">
           <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-green-900" /> معالجة محلية آمنة</span>
           <span className="flex items-center gap-1"><History size={10} className="text-indigo-900" /> {messages.length} ذكرى مؤرشفة</span>
        </div>
      </div>
    </div>
  );
};

const SuggestionCard = ({ text, onClick }: { text: string, onClick: () => void }) => (
  <button onClick={onClick} className="p-2.5 bg-[#0D0D0D] border border-white/5 rounded-lg hover:border-indigo-500/30 hover:bg-[#111] transition-all text-[10px] text-gray-500 hover:text-indigo-400 font-bold text-right active:scale-95">
    {text}
  </button>
);

export default MemoryAI;
