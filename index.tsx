import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  Cat, 
  Heart, 
  BookOpen, 
  Users, 
  Camera, 
  Activity, 
  Syringe, 
  Scale, 
  Plus, 
  Trash2, 
  Zap,
  Utensils,
  ChevronRight,
  Info,
  Edit2,
  Check,
  Download,
  Upload,
  Save,
  Share2,
  X,
  Image as ImageIcon,
  Maximize2,
  Sunrise,
  Sun,
  Moon,
  Cookie,
  Clock,
  User,
  ThumbsUp,
  Circle,
  Droplet,
  Wind,
  History,
  AlertCircle,
  Sparkles,
  MessageCircle,
  Send,
  Wand2,
  Cloud,
  WifiOff,
  RefreshCw
} from 'lucide-react';

// --- CONFIG & UTILS ---

// YOUR JSONBLOB ID - Change this if you want a new fresh database
const BLOB_ID = "019c5be5-55a6-7745-8185-4161c0852055"; 
const API_URL = "https://jsonblob.com/api/jsonBlob/" + BLOB_ID;

const INITIAL_PROFILE = {
  name: "Tiki",
  nickname: "Pi",
  bio: "Nata il 25/04/2024 a Stalettì. Regina del centro storico di Catanzaro.",
  birthDate: "2024-04-25",
  image: null
};

const INITIAL_MEALS = {
  date: new Date().toLocaleDateString('it-IT'),
  breakfast: null, 
  lunch: null,
  dinner: null,
  snack: null
};

// Default State Structure
const DEFAULT_STATE = {
  tiki_profile: INITIAL_PROFILE,
  tiki_meals: INITIAL_MEALS,
  tiki_owners: ["Antonio", "Maria Grazia", "Claudio", "Rossana"],
  tiki_weights: [{ id: 1, val: 3.5, date: '25/04/2024' }],
  tiki_vaccines: [
    { id: 1, n: "Trivalente", d: "2024-04-25", s: true },
    { id: 2, n: "Richiamo Annuale", d: "2025-04-25", s: false }
  ],
  tiki_med_notes: "",
  tiki_mems: [
    { id: 1, t: "Benvenuta Pi!", d: "Il primo giorno a casa. Era così piccola che entrava in una scarpa.", date: "25/04/2024" }
  ],
  tiki_album: [],
  tiki_litter_logs: [],
  tiki_multiplier: 35,
  tiki_status: 'Dorme 💤',
  tiki_theme: 'light'
};

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CLOUD PROVIDER (The Core Fix) ---

const TikiContext = React.createContext(null);

const TikiProvider = ({ children }) => {
  const [data, setData] = useState(null); // Starts null to enforce blocking init
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // 1. WRITE to Cloud (PUT) - Only called by explicit user actions
  const syncToCloud = async (newData) => {
    setIsSyncing(true);
    try {
      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(newData)
      });
      
      if (res.ok) {
        if (isOffline) setIsOffline(false);
      } else {
        console.warn("Write failed:", res.status);
      }
    } catch (e) {
      console.error("Write error (Network):", e);
      setIsOffline(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. READ from Cloud (GET) - Used for Init and Polling
  const syncFromCloud = async (isInit = false) => {
    try {
      const res = await fetch(API_URL, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });

      if (res.ok) {
        const json = await res.json();
        if (json && Object.keys(json).length > 0) {
          // Success: We have valid data
          setData(json);
          setIsOffline(false);
          return true; 
        } else {
           // Empty JSON -> Treat as "Not Found" logic to trigger init
           return false; 
        }
      } else if (res.status === 404) {
        // Blob doesn't exist yet
        return false; 
      } else {
        throw new Error(`Server error: ${res.status}`);
      }
    } catch (e) {
      console.warn("Read failed:", e);
      setIsOffline(true);
      // If init fails due to network, we MUST unblock UI with defaults
      // but warn user they are offline.
      if (isInit) {
        setData(DEFAULT_STATE); 
      }
      return null; 
    }
  };

  // 3. Initialization Logic (Blocking)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const success = await syncFromCloud(true);
      
      if (mounted) {
        if (success === false) {
           // 404 or Empty: This is the ONLY time we auto-write defaults
           console.log("Initializing new Cloud DB...");
           setData(DEFAULT_STATE);
           await syncToCloud(DEFAULT_STATE);
        }
        setIsInitializing(false); // Release the Kraken (App)
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  // 4. Polling Logic (GET only)
  useEffect(() => {
    if (isInitializing || isOffline) return;

    const interval = setInterval(() => {
        // Only read, never write automatically in background
        syncFromCloud(false); 
    }, 5000); // Check every 5s for updates from other devices

    return () => clearInterval(interval);
  }, [isInitializing, isOffline]);

  // 5. Update Handler
  const updateData = useCallback((key, value) => {
    setData((prevData) => {
      const current = prevData || DEFAULT_STATE;
      const newData = { ...current, [key]: value };
      
      // Optimistic Update & Fire-and-forget save
      syncToCloud(newData);
      
      return newData;
    });
  }, []);

  // Full override (for Import Backup)
  const overrideAllData = useCallback(async (newData) => {
     setData(newData);
     await syncToCloud(newData);
  }, []);

  // BLOCKING LOADING SCREEN
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#FAFAF9] dark:bg-stone-950">
         <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
            <div className="text-8xl animate-bounce">🐈</div>
            <div className="flex flex-col items-center gap-2">
                <div className="text-stone-400 font-black tracking-[0.3em] text-xs uppercase">Connecting to Cloud</div>
                <div className="flex gap-1">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
                </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <TikiContext.Provider value={{ data: data || DEFAULT_STATE, updateData, isSyncing, isOffline, overrideAllData }}>
      {children}
    </TikiContext.Provider>
  );
};

// Custom Hook to consume Context
const useTikiData = (key, initialValue) => {
  const context = useContext(TikiContext);
  if (!context) {
    throw new Error("useTikiData must be used within a TikiProvider");
  }
  const { data, updateData } = context;
  
  // Return Cloud data if available, else initialValue
  const value = (data && data[key] !== undefined) ? data[key] : initialValue;

  const setValue = (newValue) => {
     const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
     updateData(key, valueToStore);
  };

  return [value, setValue];
};

// Helper to compress images
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); 
      }
    }
  })
}

// Date Helpers
const toInputDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
}

const fromInputDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

// --- COMPONENTS ---

const Navigation = ({ activeTab, setActiveTab }) => {
  const { isSyncing, isOffline } = useContext(TikiContext);
  const tabs = [
    { id: 'home', icon: Cat, label: 'Home' },
    { id: 'health', icon: Heart, label: 'Salute' },
    { id: 'album', icon: ImageIcon, label: 'Album' }, 
    { id: 'diary', icon: BookOpen, label: 'Diario' },
    { id: 'family', icon: Users, label: 'Info' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border-t border-stone-100 dark:border-stone-800 px-4 py-3 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe transition-colors duration-300">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`relative flex flex-col items-center gap-1 transition-all duration-300 min-w-[50px] ${
            activeTab === id ? 'text-pink-500 scale-110' : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 2} />
          <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          
          {/* Sync Indicators */}
          {id === 'family' && isSyncing && (
             <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-stone-900 animate-pulse" />
          )}
          {id === 'family' && isOffline && !isSyncing && (
             <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-stone-900" />
          )}
        </button>
      ))}
    </nav>
  );
};

const TikiChat = ({ profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: `Ciao! Sono l'assistente virtuale di ${profile.name}. Chiedimi consigli sulla sua salute o semplicemente due chiacchiere feline! 🐾` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction: `You are an expert cat assistant for a cat named ${profile.name} (nickname ${profile.nickname}). 
          She was born on ${profile.birthDate}. 
          You are helpful, friendly, and knowledgeable about cat health, behavior, and care. 
          Keep answers concise and suitable for a mobile chat interface. 
          If asked about medical emergencies, always advise consulting a real vet.`
        }
      });
      
      const text = response.text;
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Miao! Qualcosa è andato storto. Riprova più tardi 😿" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 border-4 border-white dark:border-stone-800"
      >
        <MessageCircle size={28} fill="currentColor" className="text-white" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 w-full sm:max-w-md h-[80vh] sm:h-[600px] sm:rounded-[2rem] rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-black text-stone-800 dark:text-stone-100">Tiki Assistant</h3>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">Powered by Gemini</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-white dark:bg-stone-800 rounded-full text-stone-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50 dark:bg-stone-950/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-500 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                   <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-2">
                     <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                     <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                     <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2 items-center bg-stone-100 dark:bg-stone-800 p-1.5 pl-4 rounded-full"
              >
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Chiedi qualcosa..."
                  className="flex-1 bg-transparent outline-none text-sm font-medium text-stone-800 dark:text-stone-200 placeholder:text-stone-400"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-indigo-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </>
  );
};


const MealTracker = () => {
  const [meals, setMeals] = useTikiData('tiki_meals', INITIAL_MEALS);
  const [owners] = useTikiData('tiki_owners', ["Antonio", "Maria Grazia", "Claudio", "Rossana"]);
  const [selectedMealType, setSelectedMealType] = useState(null);

  useEffect(() => {
    const today = new Date().toLocaleDateString('it-IT');
    if (meals.date !== today) {
      setMeals({ ...INITIAL_MEALS, date: today });
    }
  }, [meals]);

  const handleFeed = (owner) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    setMeals({
      ...meals,
      [selectedMealType]: {
        fedBy: owner,
        time: timeString
      }
    });
    setSelectedMealType(null);
  };

  const mealConfig = [
    { id: 'breakfast', label: 'Colazione', icon: Sunrise, hungry: "Sveglia! Fame!", fed: "Servita" },
    { id: 'lunch', label: 'Pranzo', icon: Sun, hungry: "Buco nello stomaco!", fed: "Pancia piena" },
    { id: 'dinner', label: 'Cena', icon: Moon, hungry: "Cena o svengo.", fed: "Sazia" },
    { id: 'snack', label: 'Spuntino', icon: Cookie, hungry: "Voglia di buono...", fed: "Viziata" },
  ];

  const allFed = mealConfig.every(m => meals[m.id]);

  return (
    <div className="space-y-4">
       <h3 className="text-[10px] font-black text-stone-300 dark:text-stone-600 uppercase tracking-[0.2em] mb-2 mt-6">Nutrition Tracker</h3>
       <div className="grid grid-cols-2 gap-3">
         {mealConfig.map((meal) => {
           const isFed = !!meals[meal.id];
           const data = meals[meal.id];
           const Icon = meal.icon;

           return (
             <button
                key={meal.id}
                onClick={() => !isFed && setSelectedMealType(meal.id)}
                disabled={isFed}
                className={`relative p-4 rounded-3xl transition-all duration-300 border-2 text-left overflow-hidden ${
                  isFed 
                    ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-900/30 shadow-none' 
                    : 'bg-white dark:bg-stone-900 border-rose-100 dark:border-rose-900/30 shadow-lg shadow-rose-50 dark:shadow-none hover:scale-[1.02] active:scale-95'
                }`}
             >
               <div className="flex justify-between items-start mb-2">
                 <div className={`p-2 rounded-full ${isFed ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-500 dark:text-rose-400'}`}>
                   <Icon size={20} />
                 </div>
                 {isFed && (
                   <div className="flex items-center gap-1 text-[10px] font-black text-teal-400 dark:text-teal-500 bg-white dark:bg-stone-800 px-2 py-1 rounded-full">
                     <Clock size={10} /> {data.time}
                   </div>
                 )}
               </div>
               
               <p className={`text-xs font-black uppercase tracking-wider mb-1 ${isFed ? 'text-teal-700 dark:text-teal-500' : 'text-stone-400 dark:text-stone-500'}`}>
                 {meal.label}
               </p>
               
               <p className={`text-sm font-bold leading-tight ${isFed ? 'text-teal-600 dark:text-teal-400' : 'text-rose-500 dark:text-rose-400'}`}>
                 {isFed ? `${meal.fed} da ${data.fedBy}` : meal.hungry}
               </p>

               {isFed && <Check size={80} className="absolute -bottom-4 -right-4 text-teal-500/10 rotate-12" />}
             </button>
           )
         })}
       </div>

       {allFed && (
         <div className="bg-emerald-500 text-white p-4 rounded-2xl text-center shadow-lg shadow-emerald-200 dark:shadow-none animate-in zoom-in duration-300">
           <p className="font-black text-sm uppercase tracking-wider mb-1">Missione Compiuta! 🎉</p>
           <p className="text-xs opacity-90">Tiki ha raggiunto il 100% della sazietà. Si prega di non disturbare la digestione.</p>
         </div>
       )}

       {selectedMealType && (
         <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-stone-900 w-full max-w-sm p-6 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-stone-800 dark:text-stone-200">Chi nutre la bestia?</h3>
                <button onClick={() => setSelectedMealType(null)} className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-400 dark:text-stone-500">
                  <X size={20} />
                </button>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
               {owners.map(owner => (
                 <button
                   key={owner}
                   onClick={() => handleFeed(owner)}
                   className="p-4 bg-stone-50 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 hover:text-rose-500 dark:hover:text-rose-400 rounded-2xl font-bold text-sm transition-colors border-2 border-transparent hover:border-rose-100 dark:hover:border-stone-600 flex flex-col items-center gap-2"
                 >
                   <User size={24} className="opacity-50" />
                   {owner}
                 </button>
               ))}
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

const LitterTracker = () => {
  const [logs, setLogs] = useTikiData('tiki_litter_logs', []);
  const [lastLogId, setLastLogId] = useState(null);

  const todayStr = new Date().toLocaleDateString('it-IT');
  const now = new Date();
  
  const todayLogs = logs.filter(l => l.date === todayStr);
  const solidsCount = todayLogs.filter(l => l.type !== 'none').length;

  const addLog = (type) => {
    const newLog = {
      id: Date.now(),
      date: todayStr,
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      type: type
    };
    setLogs([newLog, ...logs]);
    setLastLogId(newLog.id);
    setTimeout(() => setLastLogId(null), 2000);
  };

  const types = [
    { id: 'normal', label: 'Tutto OK', icon: ThumbsUp, color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', isSolid: true },
    { id: 'hard', label: 'Troppo Dura', icon: Circle, color: 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300', isSolid: true },
    { id: 'soft', label: 'Allarme', icon: Droplet, color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400', isSolid: true },
    { id: 'none', label: 'Solo Pipì', icon: Wind, color: 'bg-sky-50 dark:bg-sky-900/20 text-sky-400 dark:text-sky-300', isSolid: false },
  ];

  const getMessage = () => {
    if (solidsCount > 3) return "Wow, giornata produttiva per Tiki! 💩";
    if (solidsCount === 0 && now.getHours() >= 20) return "Nessun movimento oggi? Tieni d'occhio. 👀";
    return null;
  };
  
  const message = getMessage();

  return (
    <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] shadow-sm border border-stone-50 dark:border-stone-800 transition-colors duration-300">
       <div className="flex justify-between items-start mb-4">
         <h3 className="font-black text-stone-800 dark:text-stone-200 flex items-center gap-2 text-sm uppercase tracking-wider">
          <History size={18} className="text-amber-600" /> Cacca-Log
        </h3>
        <div className="text-right">
          <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest block">Scariche Oggi</span>
          <span className="text-4xl font-black text-stone-800 dark:text-stone-100 leading-none">{solidsCount}</span>
        </div>
       </div>

       {message && (
         <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
           <AlertCircle size={14} /> {message}
         </div>
       )}

       <div className="grid grid-cols-4 gap-2 mb-6">
         {types.map(t => (
           <button
             key={t.id}
             onClick={() => addLog(t.id)}
             className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-90 ${t.color} h-24 relative overflow-hidden`}
           >
             <t.icon size={24} className="mb-1 z-10" />
             <span className="text-[9px] font-black uppercase text-center leading-tight z-10">{t.label}</span>
             {lastLogId && logs[0]?.id === lastLogId && logs[0]?.type === t.id && (
               <div className="absolute inset-0 bg-white/50 animate-pulse z-0" />
             )}
           </button>
         ))}
       </div>

       <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
         <h4 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Ultime 7 Attività</h4>
         <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
           {logs.slice(0, 7).map(log => {
             const typeDef = types.find(t => t.id === log.type);
             const Icon = typeDef ? typeDef.icon : Circle;
             return (
               <div key={log.id} className="flex justify-between items-center text-xs p-2 bg-stone-50 dark:bg-stone-800 rounded-xl transition-colors">
                 <div className="flex items-center gap-2">
                   <div className={`p-1.5 rounded-full ${typeDef?.color || 'bg-gray-100 dark:bg-stone-700'}`}>
                     <Icon size={12} />
                   </div>
                   <span className="font-bold text-stone-600 dark:text-stone-300">
                     {log.date === todayStr ? 'Oggi' : log.date}, {log.timestamp}
                   </span>
                 </div>
                 <span className="font-black uppercase text-[10px] tracking-wide text-stone-400 dark:text-stone-500">
                   {typeDef?.label}
                 </span>
               </div>
             )
           })}
           {logs.length === 0 && (
             <p className="text-center text-xs text-stone-300 dark:text-stone-600 italic py-2">Nessuna attività registrata.</p>
           )}
         </div>
       </div>
    </div>
  );
};

const HomeTab = ({ profile, setProfile, onZoomies }) => {
  const [status, setStatus] = useTikiData('tiki_status', 'Dorme 💤');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [age, setAge] = useState("");

  useEffect(() => {
    const calculate = () => {
      const birth = new Date(profile.birthDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - birth.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30.44);
      const days = Math.floor(diffDays % 30.44);
      setAge(`${months} mesi e ${days} giorni`);
    };
    calculate();
  }, [profile.birthDate]);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImage(file);
      setProfile({ ...profile, image: compressed });
    }
  };

  const saveProfile = () => {
    setProfile(editForm);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 pt-10 px-4 animate-in fade-in duration-500">
      <div className="flex flex-col items-center relative">
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute right-4 top-0 p-2 text-stone-300 hover:text-pink-500 transition-colors"
          >
            <Edit2 size={20} />
          </button>
        )}

        <div className="relative group">
          <div className="w-40 h-40 rounded-full border-4 border-white dark:border-stone-800 shadow-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            {profile.image ? (
              <img src={profile.image} alt="Tiki" className="w-full h-full object-cover" />
            ) : (
              <Cat size={60} className="text-stone-300 dark:text-stone-600" />
            )}
            <label className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Camera className="text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImage} />
            </label>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-5 py-1.5 rounded-full text-xs font-black shadow-lg uppercase tracking-widest">
            {profile.nickname}
          </div>
        </div>

        {isEditing ? (
          <div className="w-full mt-6 space-y-3 bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-pink-100 dark:border-stone-800">
            <input 
              className="w-full p-3 bg-stone-50 dark:bg-stone-800 dark:text-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-pink-200 dark:focus:border-pink-900"
              value={editForm.name} 
              onChange={e => setEditForm({...editForm, name: e.target.value})}
              placeholder="Nome"
            />
            <input 
              className="w-full p-3 bg-stone-50 dark:bg-stone-800 dark:text-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-pink-200 dark:focus:border-pink-900"
              value={editForm.nickname} 
              onChange={e => setEditForm({...editForm, nickname: e.target.value})}
              placeholder="Soprannome"
            />
            <input 
              type="date"
              className="w-full p-3 bg-stone-50 dark:bg-stone-800 dark:text-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-pink-200 dark:focus:border-pink-900"
              value={editForm.birthDate} 
              onChange={e => setEditForm({...editForm, birthDate: e.target.value})}
            />
            <textarea 
              className="w-full p-3 bg-stone-50 dark:bg-stone-800 dark:text-white rounded-xl text-sm outline-none border-2 border-transparent focus:border-pink-200 dark:focus:border-pink-900 h-20"
              value={editForm.bio} 
              onChange={e => setEditForm({...editForm, bio: e.target.value})}
              placeholder="Bio"
            />
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-3 text-stone-400 font-bold">Annulla</button>
              <button onClick={saveProfile} className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold">Salva</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-4xl font-black mt-6 text-stone-800 dark:text-stone-100 tracking-tight">{profile.name}</h1>
            <p className="text-stone-400 dark:text-stone-500 font-black text-sm uppercase tracking-widest">{age}</p>
          </>
        )}
      </div>

      {!isEditing && (
        <>
          <MealTracker />

          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-50 dark:border-stone-800 mt-6 transition-colors duration-300">
            <h3 className="text-[10px] font-black text-stone-300 dark:text-stone-600 uppercase tracking-[0.2em] mb-4">Stato Attuale</h3>
            <div className="flex flex-wrap gap-2">
              {['Dorme 💤', 'Caccia 🦗', 'Zoomies 🌪️', 'Mangia 🍗', 'Coccole 😻', 'Offesa 😾'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    status === s ? 'bg-stone-800 dark:bg-stone-700 text-white shadow-lg' : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onZoomies}
            className="w-full py-6 bg-gradient-to-br from-pink-400 to-rose-600 rounded-[2rem] shadow-2xl shadow-pink-200 dark:shadow-pink-900/20 text-white font-black flex items-center justify-center gap-4 active:scale-95 transition-all group"
          >
            <Zap fill="white" className="group-hover:animate-pulse" /> 
            <span className="text-xl tracking-tighter">EMERGENZA ZOOMIES!</span>
          </button>

          <div className="bg-stone-100/50 dark:bg-stone-800/50 p-6 rounded-3xl text-center italic text-stone-500 dark:text-stone-400 text-sm leading-relaxed transition-colors duration-300">
            "{profile.bio}"
          </div>
        </>
      )}
    </div>
  );
};

const AlbumTab = () => {
  const [photos, setPhotos] = useTikiData('tiki_album', []);
  const [isUploading, setIsUploading] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);
  
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedBase64 = await compressImage(file);
      const newPhoto = {
        id: Date.now(),
        src: compressedBase64,
        date: new Date().toLocaleDateString('it-IT'),
        caption: ""
      };
      setPhotos([newPhoto, ...photos]);
    } catch (err) {
      alert("Errore caricamento foto");
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = (id) => {
    if(confirm("Eliminare questa foto?")) {
      setPhotos(photos.filter(p => p.id !== id));
      setViewPhoto(null);
    }
  };

  const updatePhotoDate = (newDate) => {
      const updated = photos.map(p => p.id === viewPhoto.id ? { ...p, date: fromInputDate(newDate) } : p);
      setPhotos(updated);
      setViewPhoto({ ...viewPhoto, date: fromInputDate(newDate) });
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    
    try {
      const base64Data = viewPhoto.src.split(',')[1];
      const mimeType = viewPhoto.src.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: aiPrompt
            }
          ]
        }
      });

      let newImageSrc = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
           if (part.inlineData) {
             newImageSrc = `data:image/png;base64,${part.inlineData.data}`;
             break;
           }
        }
      }

      if (newImageSrc) {
        const newPhoto = {
          id: Date.now(),
          src: newImageSrc,
          date: new Date().toLocaleDateString('it-IT'),
          caption: `AI Edit: ${aiPrompt}`
        };
        setPhotos([newPhoto, ...photos]);
        setViewPhoto(newPhoto);
        setShowAiInput(false);
        setAiPrompt('');
      } else {
        alert("Nessuna immagine generata. Riprova con un prompt diverso.");
      }
    } catch (error) {
      console.error("AI Edit Error:", error);
      alert("Errore durante la modifica AI. Riprova.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pt-10 px-4 animate-in fade-in duration-500 min-h-screen">
      <div className="flex justify-between items-center sticky top-0 bg-[#FAFAF9]/80 dark:bg-stone-950/80 backdrop-blur-md z-10 py-2 transition-colors duration-300">
        <h2 className="text-3xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-3">
          <ImageIcon className="text-teal-500" fill="currentColor" /> Album
        </h2>
        <label className={`bg-teal-500 text-white p-3 rounded-2xl shadow-xl shadow-teal-100 dark:shadow-none transition-all cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:scale-105 active:scale-95'}`}>
          {isUploading ? <Activity className="animate-spin" /> : <Plus size={24} />}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </label>
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-300 dark:text-stone-600">
           <Camera size={64} className="mb-4 opacity-50" />
           <p className="font-bold text-sm">Nessuna foto ancora.</p>
           <p className="text-xs">Carica i momenti migliori di Tiki!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 pb-20">
          {photos.map((photo, index) => (
            <div 
              key={photo.id} 
              onClick={() => setViewPhoto(photo)}
              className={`bg-white dark:bg-stone-800 p-3 pb-8 rounded-sm shadow-md cursor-pointer transition-transform hover:z-10 hover:scale-105 ${index % 2 === 0 ? 'rotate-[-2deg]' : 'rotate-[2deg]'}`}
            >
              <div className="aspect-square bg-stone-100 dark:bg-stone-900 mb-2 relative group overflow-hidden">
                <img src={photo.src} alt="Tiki Memory" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="absolute bottom-2 right-3 left-3 flex justify-end border-t border-stone-100 dark:border-stone-700/50 pt-1">
                 <p className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">{photo.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-center p-6">
            <div className="flex gap-2">
                 <button 
                   onClick={() => setShowAiInput(!showAiInput)}
                   className={`p-2 rounded-full transition-colors ${showAiInput ? 'bg-purple-500 text-white' : 'bg-white/10 text-white hover:bg-purple-500/50'}`}
                   title="Modifica con AI (Nano Banana Pro)"
                 >
                   <Wand2 size={24} />
                 </button>
            </div>

            <button onClick={() => { setViewPhoto(null); setShowAiInput(false); }} className="text-white/70 hover:text-white p-2">
              <X size={32} />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
             <img src={viewPhoto.src} className="max-w-full max-h-[60vh] rounded-lg shadow-2xl mb-4" />
             
             {showAiInput && (
               <div className="w-full max-w-sm bg-stone-900/90 border border-stone-700 p-4 rounded-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 absolute bottom-4 z-50 shadow-2xl">
                 <p className="text-purple-400 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                   <Sparkles size={12} /> Nano Banana Pro Editor
                 </p>
                 <div className="flex gap-2">
                   <input 
                     value={aiPrompt}
                     onChange={(e) => setAiPrompt(e.target.value)}
                     placeholder="Es: 'Aggiungi un cappello', 'Stile cyberpunk'..."
                     className="flex-1 bg-black/50 text-white text-sm rounded-xl px-3 outline-none border border-transparent focus:border-purple-500 placeholder:text-stone-500"
                     onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()}
                   />
                   <button 
                     onClick={handleAiEdit}
                     disabled={isAiGenerating || !aiPrompt}
                     className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-50 transition-colors"
                   >
                     {isAiGenerating ? <Activity className="animate-spin" size={18} /> : <Wand2 size={18} />}
                   </button>
                 </div>
               </div>
             )}
          </div>

          <div className="p-8 pb-12 flex justify-between items-center bg-black/50">
            <div className="flex flex-col">
                <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-1">Data Scatto</label>
                <input 
                    type="date" 
                    value={toInputDate(viewPhoto.date)} 
                    onChange={(e) => updatePhotoDate(e.target.value)}
                    className="bg-transparent text-white font-bold text-sm outline-none border-b border-white/30 focus:border-white transition-colors"
                />
            </div>
            <button 
              onClick={() => deletePhoto(viewPhoto.id)}
              className="bg-white/10 hover:bg-rose-500/20 text-white p-3 rounded-full transition-colors"
            >
              <Trash2 size={24} className="text-rose-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const HealthTab = () => {
  const [weights, setWeights] = useTikiData('tiki_weights', []);
  const [vaccines, setVaccines] = useTikiData('tiki_vaccines', [
    { id: 1, n: "Trivalente", d: "2024-04-25", s: true },
    { id: 2, n: "Richiamo Annuale", d: "2025-04-25", s: false }
  ]);
  const [medNotes, setMedNotes] = useTikiData('tiki_med_notes', "");
  const [newWeight, setNewWeight] = useState('');
  const [showVacForm, setShowVacForm] = useState(false);
  const [vacForm, setVacForm] = useState({ n: '', d: '' });

  const addWeight = () => {
    if (!newWeight) return;
    setWeights([{ id: Date.now(), val: newWeight, date: new Date().toLocaleDateString() }, ...weights]);
    setNewWeight('');
  };

  const removeWeight = (id) => {
    setWeights(weights.filter(w => w.id !== id));
  };

  const addVaccine = () => {
    if (!vacForm.n) return;
    setVaccines([...vaccines, { id: Date.now(), ...vacForm, s: false }]);
    setVacForm({ n: '', d: '' });
    setShowVacForm(false);
  };

  const toggleVaccine = (id) => {
    setVaccines(vaccines.map(v => v.id === id ? { ...v, s: !v.s } : v));
  };

  const removeVaccine = (id) => {
    setVaccines(vaccines.filter(v => v.id !== id));
  };

  return (
    <div className="space-y-6 pt-10 px-4 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-3">
        <Heart className="text-rose-500" fill="currentColor" /> Salute
      </h2>

      <LitterTracker />
      
      <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] shadow-sm border border-stone-50 dark:border-stone-800 transition-colors">
        <h3 className="font-black text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Scale size={18} className="text-stone-400" /> Monitoraggio Peso
        </h3>
        <div className="flex gap-2 mb-6">
          <input 
            type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
            className="flex-1 bg-stone-50 dark:bg-stone-800 dark:text-white border-none rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900 font-bold"
            placeholder="Peso in kg..."
          />
          <button onClick={addWeight} className="bg-rose-500 text-white px-6 rounded-2xl font-bold shadow-lg shadow-rose-100 dark:shadow-none">
            <Plus />
          </button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {weights.map(w => (
            <div key={w.id} className="flex justify-between items-center p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl text-sm group transition-colors">
              <div className="flex flex-col">
                <span className="text-stone-400 dark:text-stone-500 font-bold text-[10px] uppercase">{w.date}</span>
                <span className="font-black text-stone-800 dark:text-stone-200">{w.val} kg</span>
              </div>
              <button onClick={() => removeWeight(w.id)} className="text-stone-200 dark:text-stone-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] shadow-sm border border-stone-50 dark:border-stone-800 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-stone-800 dark:text-stone-200 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Syringe size={18} className="text-blue-400" /> Piano Vaccinale
          </h3>
          <button onClick={() => setShowVacForm(!showVacForm)} className="text-blue-500">
            <Plus size={20} />
          </button>
        </div>

        {showVacForm && (
          <div className="mb-6 space-y-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
            <input 
              className="w-full p-3 bg-white dark:bg-stone-800 dark:text-white rounded-xl text-sm font-bold outline-none" 
              placeholder="Nome vaccino" 
              value={vacForm.n} 
              onChange={e => setVacForm({...vacForm, n: e.target.value})}
            />
            <input 
              type="date"
              className="w-full p-3 bg-white dark:bg-stone-800 dark:text-white rounded-xl text-sm font-bold outline-none" 
              value={vacForm.d} 
              onChange={e => setVacForm({...vacForm, d: e.target.value})}
            />
            <button onClick={addVaccine} className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold text-sm">Aggiungi</button>
          </div>
        )}

        <div className="space-y-3">
          {vaccines.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl group transition-colors">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleVaccine(v.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${v.s ? 'bg-green-500 border-green-500' : 'border-stone-200 dark:border-stone-600'}`}>
                  {v.s && <Check size={14} className="text-white" />}
                </button>
                <div>
                  <p className={`text-sm font-black ${v.s ? 'text-stone-400 dark:text-stone-600 line-through' : 'text-stone-700 dark:text-stone-300'}`}>{v.n}</p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold">{v.d}</p>
                </div>
              </div>
              <button onClick={() => removeVaccine(v.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 dark:text-stone-600 hover:text-rose-500 dark:hover:text-rose-400 transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] shadow-sm border border-stone-50 dark:border-stone-800 transition-colors">
        <h3 className="font-black text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Activity size={18} className="text-amber-500" /> Note & Allergie
        </h3>
        <textarea 
          value={medNotes}
          onChange={e => setMedNotes(e.target.value)}
          className="w-full h-32 bg-stone-50 dark:bg-stone-800 dark:text-white border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900 resize-none"
          placeholder="Scrivi qui note importanti del veterinario..."
        />
      </div>
    </div>
  );
};

const DiaryTab = () => {
  const [mems, setMems] = useTikiData('tiki_mems', [
    { id: 1, t: "Benvenuta Pi!", d: "Il primo giorno a casa. Era così piccola che entrava in una scarpa.", date: "25/04/2024" }
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ t: '', d: '', date: new Date().toISOString().split('T')[0] });
  const [isImproving, setIsImproving] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ t: '', d: '', date: '' });

  const addMem = () => {
    if(!addForm.t) return;
    setMems([{ 
        id: Date.now(), 
        t: addForm.t, 
        d: addForm.d, 
        date: fromInputDate(addForm.date) 
    }, ...mems]);
    setAddForm({ t: '', d: '', date: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
  };

  const startEditing = (mem) => {
      setEditingId(mem.id);
      setEditForm({
          t: mem.t,
          d: mem.d,
          date: toInputDate(mem.date)
      });
  };

  const saveEdit = () => {
      setMems(mems.map(m => m.id === editingId ? {
          ...m,
          t: editForm.t,
          d: editForm.d,
          date: fromInputDate(editForm.date)
      } : m));
      setEditingId(null);
  };

  const removeMem = (id) => {
    if(confirm("Vuoi davvero eliminare questo ricordo?")) {
      setMems(mems.filter(m => m.id !== id));
    }
  };

  const improveMemory = async (isEditMode = false) => {
    const currentForm = isEditMode ? editForm : addForm;
    const setForm = isEditMode ? setEditForm : setAddForm;
    
    if (!currentForm.d && !currentForm.t) return;

    setIsImproving(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Riscrivi il seguente ricordo di un gatto per renderlo più emozionante, dolce e narrativo, ma mantenendo la verità dei fatti. 
        Titolo attuale: "${currentForm.t}". 
        Descrizione attuale: "${currentForm.d}". 
        Restituisci solo il testo della nuova descrizione, senza virgolette e senza titolo.`
      });
      
      const enhancedText = response.text;
      setForm({ ...currentForm, d: enhancedText });
    } catch (error) {
      console.error("AI Improvement failed", error);
      alert("Ops! L'AI è stanca. Riprova più tardi.");
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="space-y-6 pt-10 px-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-3">
          <BookOpen className="text-indigo-500" fill="currentColor" /> Diario
        </h2>
        <button 
          onClick={() => setShowAdd(!showAdd)} 
          className="bg-indigo-500 text-white p-3 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] shadow-2xl border-2 border-indigo-50 dark:border-indigo-900/30 animate-in zoom-in-95 duration-300">
           <div className="mb-3">
             <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">Data del Ricordo</label>
             <input 
                type="date"
                value={addForm.date}
                onChange={e => setAddForm({...addForm, date: e.target.value})}
                className="w-full bg-stone-50 dark:bg-stone-800 dark:text-white rounded-xl px-3 py-2 text-sm font-bold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
             />
           </div>
          <input 
            value={addForm.t} onChange={e => setAddForm({...addForm, t: e.target.value})}
            className="w-full mb-3 p-4 bg-stone-50 dark:bg-stone-800 dark:text-white rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-100 dark:focus:border-indigo-900" 
            placeholder="Titolo del momento..."
          />
          <div className="relative">
            <textarea 
              value={addForm.d} onChange={e => setAddForm({...addForm, d: e.target.value})}
              className="w-full mb-4 p-4 bg-stone-50 dark:bg-stone-800 dark:text-white rounded-2xl text-sm font-medium outline-none h-32 border-2 border-transparent focus:border-indigo-100 dark:focus:border-indigo-900 resize-none" 
              placeholder="Racconta cosa è successo..."
            />
            {/* AI Magic Button */}
            <button 
              onClick={() => improveMemory(false)}
              disabled={isImproving || (!addForm.d && !addForm.t)}
              className="absolute right-3 bottom-6 p-2 bg-gradient-to-tr from-purple-400 to-indigo-500 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
              title="Migliora con AI"
            >
              {isImproving ? <Activity className="animate-spin" size={16} /> : <Sparkles size={16} fill="white" />}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-stone-400 font-bold">Annulla</button>
            <button onClick={addMem} className="flex-1 py-4 bg-indigo-500 text-white rounded-2xl font-black shadow-lg">Salva Ricordo</button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {mems.map(m => (
          <React.Fragment key={m.id}>
            {editingId === m.id ? (
                <div className="bg-white dark:bg-stone-900 p-6 rounded-[2.5rem] shadow-lg border-2 border-indigo-100 dark:border-indigo-900/30 relative animate-in fade-in zoom-in-95 duration-200">
                    <div className="mb-3">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">Data</label>
                        <input 
                            type="date"
                            value={editForm.date}
                            onChange={e => setEditForm({...editForm, date: e.target.value})}
                            className="w-full bg-stone-50 dark:bg-stone-800 dark:text-white rounded-xl px-3 py-2 text-sm font-bold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                    <input 
                        value={editForm.t}
                        onChange={e => setEditForm({...editForm, t: e.target.value})}
                        className="w-full mb-3 p-3 bg-stone-50 dark:bg-stone-800 dark:text-white rounded-xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-100"
                        placeholder="Titolo"
                    />
                    <div className="relative">
                        <textarea 
                            value={editForm.d}
                            onChange={e => setEditForm({...editForm, d: e.target.value})}
                            className="w-full mb-4 p-3 bg-stone-50 dark:bg-stone-800 dark:text-white rounded-xl text-sm font-medium outline-none h-24 resize-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="Descrizione"
                        />
                        {/* AI Magic Button (Edit Mode) */}
                        <button 
                            onClick={() => improveMemory(true)}
                            disabled={isImproving || (!editForm.d && !editForm.t)}
                            className="absolute right-2 bottom-6 p-2 bg-gradient-to-tr from-purple-400 to-indigo-500 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                            title="Migliora con AI"
                        >
                           {isImproving ? <Activity className="animate-spin" size={16} /> : <Sparkles size={16} fill="white" />}
                        </button>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                        <button onClick={saveEdit} className="p-2 bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-600 transition-colors">
                            <Save size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-stone-900 p-6 rounded-[2.5rem] shadow-sm border border-stone-100 dark:border-stone-800 group relative transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-indigo-300 dark:text-indigo-400 uppercase tracking-widest">{m.date}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditing(m)} className="text-stone-300 dark:text-stone-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                            <Edit2 size={16} />
                        </button>
                        <button onClick={() => removeMem(m.id)} className="text-stone-300 dark:text-stone-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                    </div>
                    <h4 className="font-black text-xl text-stone-800 dark:text-stone-100 leading-tight">{m.t}</h4>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-3 leading-relaxed font-medium whitespace-pre-wrap">{m.d}</p>
                </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const FamilyTab = ({ theme, toggleTheme }) => {
  const [weights] = useTikiData('tiki_weights', [{ val: 3.5 }]);
  const [owners, setOwners] = useTikiData('tiki_owners', ["Antonio", "Maria Grazia", "Claudio", "Rossana"]);
  const [multiplier, setMultiplier] = useTikiData('tiki_multiplier', 35);
  const [newOwner, setNewOwner] = useState('');
  const { overrideAllData } = useContext(TikiContext);

  const weight = weights[0]?.val || 3.5;
  const food = Math.round(weight * multiplier);

  const addOwner = () => {
    if (!newOwner) return;
    setOwners([...owners, newOwner]);
    setNewOwner('');
  };

  const removeOwner = (name) => {
    setOwners(owners.filter(o => o !== name));
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (typeof event.target.result !== 'string') return;
        const data = JSON.parse(event.target.result);
        if (confirm("Attenzione! Questo sovrascriverà i dati del CLOUD con quelli del file. Sei sicuro?")) {
            overrideAllData(data);
            alert("Ripristino completato con successo!");
        }
      } catch (err) {
        alert("Errore nel file di backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pt-10 px-4 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-3">
        <Users className="text-stone-800 dark:text-stone-100" fill="currentColor" /> Famiglia
      </h2>
      
      {/* Calcolatore */}
      <div className="bg-stone-900 dark:bg-black text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <Utensils className="absolute -right-8 -bottom-8 text-white/5" size={180} />
        <h3 className="font-black flex items-center gap-3 mb-6 text-lg uppercase tracking-wider">
          <Activity className="text-pink-500" /> Nutrition Hub
        </h3>
        
        <div className="space-y-6 relative z-10">
          <div className="flex flex-col">
            <label className="text-[10px] text-stone-500 uppercase font-black tracking-widest mb-3">Profilo Metabolico (g/kg)</label>
            <input 
              type="range" min="20" max="60" value={multiplier} onChange={e => setMultiplier(parseInt(e.target.value))}
              className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between text-[10px] mt-2 font-bold text-stone-500 italic">
              <span>Lazy 🛋️</span>
              <span>{multiplier}g</span>
              <span>Active 🏎️</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-5 rounded-3xl backdrop-blur-sm">
              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest mb-1">Target 24h</p>
              <p className="text-3xl font-black text-white">{food}g</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-5 rounded-3xl backdrop-blur-sm">
              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest mb-1">Per Pasto</p>
              <p className="text-3xl font-black text-pink-500">{Math.round(food/2)}g</p>
            </div>
          </div>
        </div>
      </div>

      {/* Umani */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] shadow-sm border border-stone-50 dark:border-stone-800 transition-colors">
        <h3 className="font-black text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Heart size={18} className="text-rose-400" /> Genitori Umani
        </h3>
        
        <div className="flex gap-2 mb-6">
          <input 
            value={newOwner} onChange={e => setNewOwner(e.target.value)}
            className="flex-1 bg-stone-50 dark:bg-stone-800 dark:text-white border-none rounded-2xl px-5 py-4 outline-none font-bold text-sm"
            placeholder="Nuovo umano..."
          />
          <button onClick={addOwner} className="bg-stone-800 dark:bg-stone-700 text-white px-6 rounded-2xl font-bold">
            <Plus />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {owners.map(name => (
            <div key={name} className="flex justify-between items-center p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl group transition-all hover:bg-stone-100 dark:hover:bg-stone-700">
              <span className="text-sm font-black text-stone-700 dark:text-stone-300">{name}</span>
              <button onClick={() => removeOwner(name)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 dark:text-stone-600 dark:hover:text-rose-400">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* DATA MANAGEMENT (Backup/Restore) */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] shadow-sm border border-stone-50 dark:border-stone-800 transition-colors">
         <h3 className="font-black text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Cloud size={18} className="text-blue-500" /> Cloud Sync & Restore
        </h3>
        <p className="text-xs text-stone-400 dark:text-stone-500 mb-4 leading-relaxed">
            I dati sono sincronizzati automaticamente con il cloud per tutta la famiglia. Usa "Importa" solo per ripristinare un vecchio backup d'emergenza.
        </p>
        <div className="mb-6">
            <label className="flex flex-col items-center justify-center p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer">
                <Upload className="text-stone-600 dark:text-stone-400 mb-2" size={24} />
                <span className="text-xs font-bold text-stone-600 dark:text-stone-400">Importa Backup (Sovrascrive Cloud)</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
        </div>

        {/* Theme Toggle */}
        <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl transition-all hover:bg-stone-100 dark:hover:bg-stone-700"
            >
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-purple-900/50 text-purple-400' : 'bg-yellow-100 text-yellow-600'}`}>
                      {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <span className="font-bold text-stone-600 dark:text-stone-300 text-sm">Modo Scuro</span>
              </div>
              
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-purple-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN CONTENT ---

const MainContent = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useTikiData('tiki_profile', INITIAL_PROFILE);
  const [isZoomies, setIsZoomies] = useState(false);
  const [theme, setTheme] = useTikiData('tiki_theme', 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const startZoomies = () => {
    setIsZoomies(true);
    setTimeout(() => setIsZoomies(false), 4000);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-[#FAFAF9] dark:bg-stone-950 pb-safe transition-colors duration-300">
      {isZoomies && (
        <div className="fixed inset-0 z-[100] bg-white/40 dark:bg-black/40 backdrop-blur-md pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="text-9xl zoomies-anim">🐈💨</div>
          <div className="absolute top-1/4 left-1/4 text-6xl opacity-30 animate-pulse">⚡</div>
          <div className="absolute bottom-1/4 right-1/4 text-6xl opacity-30 animate-pulse">🌪️</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-pink-600 drop-shadow-2xl uppercase tracking-tighter scale-150 opacity-20">ZOOMIES</div>
        </div>
      )}

      <main className="min-h-screen pb-24">
        {activeTab === 'home' && <HomeTab profile={profile} setProfile={setProfile} onZoomies={startZoomies} />}
        {activeTab === 'health' && <HealthTab />}
        {activeTab === 'album' && <AlbumTab />}
        {activeTab === 'diary' && <DiaryTab />}
        {activeTab === 'family' && <FamilyTab theme={theme} toggleTheme={toggleTheme} />}
      </main>

      {/* Global AI Chatbot */}
      <TikiChat profile={profile} />

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

// --- APP WRAPPER ---

const App = () => {
  return (
    <TikiProvider>
      <MainContent />
    </TikiProvider>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}