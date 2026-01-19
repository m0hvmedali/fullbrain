
import React, { useState, useRef, useEffect } from 'react';
import { StandardizedMessage } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Send, BrainCircuit, Loader2, Sparkles, MessageSquare, ExternalLink, Info, Mic, MicOff, Volume2, History, Globe, ShieldCheck, Copy, Check, Headphones } from 'lucide-react';
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

// Live API Helpers
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Voice State Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isProcessing]);

  // Audio Visualizer Animation
  useEffect(() => {
    if (!isVoiceActive || !canvasRef.current || !analyzerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isVoiceActive) return;
      requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgba(99, 102, 241, ${dataArray[i] / 255})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  }, [isVoiceActive]);

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

    try {
      const ai = getAI();
      const keywords = userQuery.toLowerCase().split(/\s+/).filter(k => k.length > 2);
      const relevantMessages = messages.filter(m => 
        keywords.some(k => m.content.toLowerCase().includes(k)) || 
        keywords.some(k => m.person_or_title.toLowerCase().includes(k))
      ).sort((a, b) => b.timestamp - a.timestamp).slice(0, 60);

      const context = relevantMessages.map(m => 
        `[ID:${m.conversation_id}] From ${m.sender} in "${m.person_or_title}": ${m.content}`
      ).join('\n');

      const response = await ai.models.generateContent({
        model: AI_MODELS.text,
        contents: `الذاكرة المسترجعة:\n${context}\n\nالسؤال: ${userQuery}`,
        config: { 
          systemInstruction: 'أنت محرك ذكاء اصطناعي للذاكرة الشخصية. أجب بناءً على سجل المحادثات باللغة العربية. إذا لم تجد الإجابة، وضح ذلك.',
          temperature: 0.2,
          tools: useGrounding ? [{ googleSearch: {} }] : undefined
        }
      });

      const aiResponse = response.text || "لا أستطيع تذكر ذلك بدقة.";
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
    } catch (error) {
      console.error("AI Error:", error);
      setChatHistory(prev => [...prev, { id: Math.random().toString(), role: 'ai', content: "حدث خطأ أثناء محاولة تحليل الذاكرة." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleVoiceMode = async () => {
    if (isVoiceActive) {
      stopVoiceSession();
      return;
    }
    try {
      const ai = getAI();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      const analyzer = inputCtx.createAnalyser();
      analyzer.fftSize = 128;
      analyzerRef.current = analyzer;
      
      setIsVoiceActive(true);
      const sessionPromise = ai.live.connect({
        model: AI_MODELS.voice,
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            source.connect(analyzer);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              // Solely rely on sessionPromise resolves and call sendRealtimeInput without extra checks
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle session interruptions for a smoother experience
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsVoiceActive(false),
          onerror: () => setIsVoiceActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are the user's digital memory. Answer based on their history in Arabic.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error("Voice Init Error:", e);
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
      <header className="px-10 py-8 border-b border-white/5 bg-[#080808]/80 backdrop-blur-lg flex justify-between items-center z-10 shadow-lg">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
            <BrainCircuit className="text-indigo-500" size={32} />
            الذكاء الاسترجاعي
          </h2>
          <p className="text-gray-500 text-sm mt-1">تفاعل مع ذاكرتك الرقمية صوتياً أو نصياً.</p>
        </div>
        <div className="flex items-center gap-6">
           <button 
             onClick={() => setUseGrounding(!useGrounding)}
             className={`flex items-center gap-3 px-6 py-2.5 rounded-xl border transition-all text-[11px] font-black uppercase tracking-widest ${useGrounding ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 shadow-lg shadow-teal-500/10' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
           >
             <Globe size={16} />
             {useGrounding ? 'بحث جوجل مفعّل' : 'تفعيل البحث الخارجي'}
           </button>
           
           <button 
             onClick={toggleVoiceMode}
             className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl ${isVoiceActive ? 'bg-red-600 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'}`}
           >
             {isVoiceActive ? <MicOff size={20} /> : <Mic size={20} />}
             {isVoiceActive ? 'إنهاء الوضع الصوتي' : 'تحدث مع ذاكرتك'}
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 max-w-5xl mx-auto w-full relative">
        {!isVoiceActive && chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-fade-in">
            <div className="w-24 h-24 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center border border-indigo-500/20 shadow-inner text-indigo-500">
               <Sparkles size={48} />
            </div>
            <div>
               <h3 className="text-3xl font-black mb-3">كيف يمكنني مساعدتك؟</h3>
               <p className="text-gray-500 max-w-md mx-auto leading-relaxed text-lg">
                 لديك <span className="text-indigo-400 font-bold">{messages.length}</span> ذكرى محفوظة. اسألني عن أي تفاصيل ترغب في استعادتها.
               </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8">
               <SuggestionCard text="ما هي آخر المواضيع التي ناقشتها مع محمد؟" onClick={() => setQuery("ما هي آخر المواضيع التي ناقشتها مع محمد؟")} />
               <SuggestionCard text="هل يوجد أي ذكر لمواعيد هامة في سجلاتي؟" onClick={() => setQuery("هل يوجد أي ذكر لمواعيد هامة في سجلاتي؟")} />
               <SuggestionCard text="لخص لي اهتماماتي الحالية بناءً على دردشاتي." onClick={() => setQuery("لخص لي اهتماماتي الحالية بناءً على دردشاتي.")} />
               <SuggestionCard text="ماذا قيل بخصوص رحلة الصيف القادمة؟" onClick={() => setQuery("ماذا قيل بخصوص رحلة الصيف القادمة؟")} />
            </div>
          </div>
        )}

        {isVoiceActive && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in h-[50vh]">
             <div className="relative mb-20">
                <div className="w-64 h-64 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/20 shadow-2xl shadow-indigo-600/10">
                   <div className="w-40 h-40 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                      <Headphones size={60} className="text-white" />
                   </div>
                </div>
                <canvas ref={canvasRef} width={256} height={100} className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-full opacity-60" />
             </div>
             <h3 className="text-3xl font-black mb-4">أنا أستمع إليك الآن...</h3>
             <p className="text-indigo-400 font-bold animate-pulse text-lg">تحدث عن أي ذكرى تريد استرجاعها صوتياً.</p>
          </div>
        )}

        {!isVoiceActive && chatHistory.map((turn) => (
          <div key={turn.id} className={`flex ${turn.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
            <div className={`max-w-[90%] p-8 rounded-[2.5rem] relative group ${turn.role === 'user' ? 'bg-[#121212] border border-white/5 rounded-tr-none shadow-xl' : 'bg-indigo-600/10 border border-indigo-500/20 rounded-tl-none shadow-2xl shadow-indigo-600/5'}`}>
              
              {turn.role === 'ai' && (
                <button 
                  onClick={() => handleCopy(turn.content, turn.id)}
                  className="absolute top-6 left-6 p-2 bg-black/40 hover:bg-black/60 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  {copiedId === turn.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                </button>
              )}

              <div className="flex items-center gap-2 mb-4">
                 <div className={`p-2 rounded-xl ${turn.role === 'user' ? 'bg-white/5' : 'bg-indigo-500/20'}`}>
                    {turn.role === 'user' ? <MessageSquare size={16} /> : <BrainCircuit size={16} className="text-indigo-400" />}
                 </div>
                 <span className={`text-xs font-black uppercase tracking-widest ${turn.role === 'user' ? 'text-gray-500' : 'text-indigo-400'}`}>
                   {turn.role === 'user' ? 'أنت' : 'الذكاء الاسترجاعي'}
                 </span>
              </div>
              <p className="text-xl leading-relaxed text-gray-200 whitespace-pre-wrap">{turn.content}</p>
              
              {turn.grounding && turn.grounding.length > 0 && (
                 <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-[10px] text-teal-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Globe size={14}/> مراجع البحث الخارجي
                    </p>
                    <div className="flex flex-wrap gap-2">
                       {turn.grounding.map((g, idx) => (
                          <a key={idx} href={g.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-teal-500/5 border border-teal-500/10 rounded-xl text-[11px] font-bold text-teal-300 hover:bg-teal-500/10 transition-all">
                             {g.title} <ExternalLink size={10} />
                          </a>
                       ))}
                    </div>
                 </div>
              )}

              {turn.citations && turn.citations.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/5">
                   <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Info size={14}/> المحادثات المستشهد بها
                   </p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {turn.citations.map(cit => (
                        <button key={cit.id} onClick={() => onSelectChat(cit.id)} className="flex items-center justify-between gap-3 px-4 py-2 bg-black border border-white/5 rounded-2xl hover:border-indigo-500/40 transition-all group">
                           <span className="text-[11px] font-bold text-gray-400 truncate flex-1 text-right">{cit.title}</span>
                           <ExternalLink size={12} className="text-gray-600 group-hover:text-indigo-400" />
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-end animate-fade-in">
             <div className="bg-indigo-600/5 border border-indigo-500/10 p-10 rounded-[2.5rem] rounded-tl-none flex items-center gap-6 shadow-2xl">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <div>
                   <p className="text-indigo-400 font-black text-lg">جاري استنطاق الذاكرة الرقمية...</p>
                   <p className="text-gray-600 text-xs mt-1">يتم البحث في {messages.length} سجل محلي آمن.</p>
                </div>
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-10 border-t border-white/5 bg-[#080808]/80 backdrop-blur-md">
        <form onSubmit={handleAsk} className="max-w-5xl mx-auto relative group">
          <input 
            type="text"
            value={query}
            disabled={isVoiceActive || isProcessing}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isVoiceActive ? "الوضع الصوتي نشط..." : "ابحث في ذاكرتك أو استفسر عن أي حدث..."}
            className="w-full bg-[#0D0D0D] border border-white/10 rounded-[2.5rem] py-8 px-12 pr-20 text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all placeholder:text-gray-800 shadow-2xl disabled:opacity-30"
          />
          <button 
            type="submit"
            disabled={!query.trim() || isProcessing || isVoiceActive}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center transition-all disabled:bg-gray-800 shadow-2xl shadow-indigo-600/30 active:scale-90"
          >
            <Send size={28} />
          </button>
        </form>
        <div className="flex justify-center mt-6 gap-8">
           <div className="flex items-center gap-2 text-[10px] text-gray-700 font-black uppercase tracking-widest">
              <ShieldCheck size={14} className="text-green-900" /> معالجة محلية آمنة
           </div>
           <div className="flex items-center gap-2 text-[10px] text-gray-700 font-black uppercase tracking-widest">
              <History size={14} className="text-indigo-900" /> تحليل {messages.length} رسالة مخزنة
           </div>
        </div>
      </div>
    </div>
  );
};

const SuggestionCard = ({ text, onClick }: { text: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="p-6 bg-[#0A0A0A] border border-white/5 rounded-3xl hover:border-indigo-500/40 hover:bg-[#0D0D0D] transition-all text-[16px] text-gray-400 hover:text-indigo-400 font-bold text-right shadow-sm active:scale-95"
  >
    {text}
  </button>
);

export default MemoryAI;
