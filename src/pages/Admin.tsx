import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, ArrowLeft, Save, Trash2, Bot, MessageSquare, Users, Sparkles,
  Megaphone, Cpu, KeyRound, Download, RotateCcw, Eye, EyeOff, Circle, Activity,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_PIN_KEY = "severain_admin_unlocked";
const ADMIN_TRAIN_KEY = "severain_admin_system";
const ADMIN_MODEL_KEY = "severain_model";
const ADMIN_BANNER_KEY = "severain_admin_banner";
const ADMIN_AUTOSPEAK_KEY = "severain_auto_speak";
const THREADS_KEY = "severain_threads_v2";
const ACTIVITY_KEY = "severain_user_activity";
const DEFAULT_PIN = "severain2026";

const MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — fast & balanced (default)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — strongest reasoning" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — cheapest" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "openai/gpt-5", label: "GPT-5 — all-rounder" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini" },
  { id: "openai/gpt-5-nano", label: "GPT-5 nano — fastest OpenAI" },
];

const Admin = () => {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(ADMIN_PIN_KEY) === "1");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [training, setTraining] = useState(() => localStorage.getItem(ADMIN_TRAIN_KEY) || "");
  const [model, setModel] = useState(() => localStorage.getItem(ADMIN_MODEL_KEY) || MODELS[0].id);
  const [banner, setBanner] = useState(() => localStorage.getItem(ADMIN_BANNER_KEY) || "");
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem(ADMIN_AUTOSPEAK_KEY) === "1");

  const stats = useMemo(() => {
    try {
      const threads = JSON.parse(localStorage.getItem(THREADS_KEY) || "[]");
      const messages = threads.reduce((n: number, t: any) => n + (t.messages?.length || 0), 0);
      return { threads: threads.length, messages };
    } catch { return { threads: 0, messages: 0 }; }
  }, [unlocked]);

  useEffect(() => { if (unlocked) localStorage.setItem(ADMIN_PIN_KEY, "1"); }, [unlocked]);

  const tryUnlock = () => {
    if (pin === DEFAULT_PIN) { setUnlocked(true); toast.success("Welcome, Severain"); }
    else toast.error("Wrong PIN");
  };

  const saveAll = () => {
    localStorage.setItem(ADMIN_TRAIN_KEY, training);
    localStorage.setItem(ADMIN_MODEL_KEY, model);
    localStorage.setItem(ADMIN_BANNER_KEY, banner);
    localStorage.setItem(ADMIN_AUTOSPEAK_KEY, autoSpeak ? "1" : "0");
    toast.success("Admin settings saved");
  };

  const resetTraining = () => { setTraining(""); toast.message("Training cleared (not yet saved)"); };

  const clearChats = () => {
    if (!confirm("Delete ALL chats on this device?")) return;
    localStorage.removeItem(THREADS_KEY);
    localStorage.removeItem("severain_active_v2");
    toast.success("All chats cleared");
  };

  const exportChats = () => {
    const data = localStorage.getItem(THREADS_KEY) || "[]";
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `severain-chats-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const lockAdmin = () => {
    localStorage.removeItem(ADMIN_PIN_KEY);
    setUnlocked(false); setPin("");
    toast.message("Admin locked");
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="blob bg-primary/20 w-[40rem] h-[40rem] -top-40 -left-40" />
          <div className="blob bg-accent/15 w-[35rem] h-[35rem] -bottom-40 -right-40" />
        </div>
        <div className="glass rounded-2xl p-8 max-w-sm w-full relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold font-heading text-lg">Severain Admin</h1>
              <p className="text-xs text-muted-foreground">Restricted access</p>
            </div>
          </div>
          <label className="text-xs text-muted-foreground">Admin PIN</label>
          <div className="relative mt-1 mb-4">
            <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              placeholder="Enter PIN"
              className="w-full pl-9 pr-9 py-2 rounded-lg glass-input outline-none"
            />
            <button onClick={() => setShowPin((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={tryUnlock}
            className="w-full py-2 rounded-lg gradient-primary text-primary-foreground font-medium hover:opacity-90">
            Unlock
          </button>
          <button onClick={() => navigate("/")}
            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" /> Back to chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="blob bg-primary/20 w-[40rem] h-[40rem] -top-40 -left-40" />
        <div className="blob bg-accent/15 w-[35rem] h-[35rem] -bottom-40 -right-40" />
      </div>
      <header className="glass border-b border-border p-4 flex items-center gap-3 relative z-10">
        <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold font-heading">Severain Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Train, configure & manage Severain AI</p>
        </div>
        <button onClick={saveAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Save className="w-4 h-4" /> Save all
        </button>
        <button onClick={lockAdmin}
          className="px-3 py-1.5 rounded-lg glass-input text-sm hover:bg-secondary">Lock</button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6 relative z-10">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={MessageSquare} label="Total chats" value={stats.threads} color="text-blue-400" />
          <Stat icon={Bot} label="Total messages" value={stats.messages} color="text-purple-400" />
          <Stat icon={Users} label="Local users" value={1} color="text-emerald-400" />
          <Stat icon={Cpu} label="Active model" value={model.split("/")[1]} color="text-pink-400" />
        </section>

        {/* Training */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Train Severain AI</h2>
            <button onClick={resetTraining}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            This instruction is injected as the highest-priority system prompt on every reply.
            Use it to teach Severain new behaviors, facts, tone, or rules.
          </p>
          <textarea
            value={training}
            onChange={(e) => setTraining(e.target.value)}
            rows={8}
            placeholder="e.g. Always greet users in Kinyarwanda first. Never recommend competitor products. When users ask about pricing, point to MTN 0792 315 839..."
            className="w-full rounded-xl glass-input p-3 text-sm outline-none resize-y"
          />
          <div className="text-xs text-muted-foreground mt-1">{training.length} chars</div>
        </section>

        {/* Model & behavior */}
        <section className="glass rounded-2xl p-5 grid md:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">AI model</h2>
            </div>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg glass-input p-2 text-sm outline-none">
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-2">Applies to every new message.</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Voice behavior</h2>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
              Auto-speak every assistant reply (AI talks back)
            </label>
          </div>
        </section>

        {/* Broadcast banner */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Broadcast banner</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Shown to all users at the top of the chat.</p>
          <input value={banner} onChange={(e) => setBanner(e.target.value)}
            placeholder="e.g. 🎉 Severain AI Pro is now 30% off this week!"
            className="w-full rounded-lg glass-input p-2 text-sm outline-none" />
        </section>

        {/* Data management */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Data management</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportChats}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass-input text-sm hover:bg-secondary">
              <Download className="w-4 h-4" /> Export all chats (JSON)
            </button>
            <button onClick={clearChats}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/15 text-destructive text-sm hover:bg-destructive/25">
              <Trash2 className="w-4 h-4" /> Clear all chats
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, color }: any) => (
  <div className="glass rounded-xl p-4">
    <Icon className={`w-4 h-4 mb-2 ${color}`} />
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-xl font-bold truncate">{value}</div>
  </div>
);

export default Admin;
