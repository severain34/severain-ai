import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, ArrowLeft, Save, Trash2, Bot, MessageSquare, Users, Sparkles,
  Megaphone, Cpu, KeyRound, Download, RotateCcw, Eye, EyeOff, Circle, Activity,
  UserCog, RefreshCcw, Mail, Calendar, HelpCircle, Send,
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

  // Live users panel
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick((x) => x + 1), 3000); return () => clearInterval(i); }, []);
  const users = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
      const now = Date.now();
      return Object.values(all).map((u: any) => ({
        ...u,
        online: u.online && now - u.lastSeen < 45000,
      })).sort((a: any, b: any) => b.lastSeen - a.lastSeen);
    } catch { return []; }
  }, [unlocked, tick]);
  const onlineCount = users.filter((u: any) => u.online).length;
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const clearActivity = () => {
    if (!confirm("Clear all user activity logs?")) return;
    localStorage.removeItem(ACTIVITY_KEY);
    toast.success("Activity cleared");
  };
  const removeUser = (id: string) => {
    const all = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
    delete all[id];
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all));
    setSelectedUser(null);
    toast.success("User removed from logs");
  };

  // All registered accounts (from Supabase Auth via edge function)
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL || "https://iijxdopbacltbzrafbka.supabase.co"}/functions/v1/admin-users`;
      const resp = await fetch(url, { headers: { "x-admin-pin": DEFAULT_PIN } });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed");
      setAccounts(data.users || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load accounts");
    } finally { setLoadingAccounts(false); }
  };
  useEffect(() => { if (unlocked) fetchAccounts(); }, [unlocked]);

  // Admin broadcast questions
  type AdminQ = { id: string; question: string; at: number };
  const [questions, setQuestions] = useState<AdminQ[]>(() => {
    try { return JSON.parse(localStorage.getItem("severain_admin_questions") || "[]"); } catch { return []; }
  });
  const [newQ, setNewQ] = useState("");
  const [responses, setResponses] = useState<Record<string, any[]>>(() => {
    try { return JSON.parse(localStorage.getItem("severain_admin_responses") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    const i = setInterval(() => {
      try { setResponses(JSON.parse(localStorage.getItem("severain_admin_responses") || "{}")); } catch {}
    }, 4000);
    return () => clearInterval(i);
  }, []);
  const postQuestion = () => {
    const q = newQ.trim();
    if (!q) return;
    const next = [...questions, { id: crypto.randomUUID(), question: q, at: Date.now() }];
    setQuestions(next);
    localStorage.setItem("severain_admin_questions", JSON.stringify(next));
    setNewQ("");
    toast.success("Question broadcast to all users");
  };
  const deleteQuestion = (id: string) => {
    const next = questions.filter(q => q.id !== id);
    setQuestions(next);
    localStorage.setItem("severain_admin_questions", JSON.stringify(next));
    const r = { ...responses }; delete r[id];
    setResponses(r);
    localStorage.setItem("severain_admin_responses", JSON.stringify(r));
  };

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
          <Stat icon={Users} label={`Users (${onlineCount} online)`} value={users.length} color="text-emerald-400" />
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

        {/* Admin Q&A — broadcast questions to users */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Ask users a question</h2>
            <span className="ml-2 text-xs text-muted-foreground">{questions.length} active · {Object.values(responses).reduce((n:number,a:any[])=>n+a.length,0)} responses</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Posts a question banner inside every user's chat. Their answers stream back here in real time.
          </p>
          <div className="flex gap-2 mb-3">
            <input value={newQ} onChange={(e) => setNewQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && postQuestion()}
              placeholder="e.g. What feature should we build next?"
              className="flex-1 rounded-lg glass-input p-2 text-sm outline-none" />
            <button onClick={postQuestion}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">
              <Send className="w-4 h-4" /> Broadcast
            </button>
          </div>
          {questions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active questions yet.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => {
                const ans = responses[q.id] || [];
                return (
                  <div key={q.id} className="glass-input rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{q.question}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(q.at).toLocaleString()} · {ans.length} answer{ans.length===1?"":"s"}</p>
                      </div>
                      <button onClick={() => deleteQuestion(q.id)} className="text-destructive hover:opacity-80">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {ans.length > 0 && (
                      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {ans.map((a:any, i:number) => (
                          <li key={i} className="text-xs border-l-2 border-primary/40 pl-2">
                            <span className="font-medium text-foreground">{a.email}</span>
                            <span className="text-foreground"> — {a.answer}</span>
                            <div className="text-[10px] text-muted-foreground">{new Date(a.at).toLocaleString()}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Users & activity */}

        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Users & activity</h2>
            <span className="ml-2 text-xs text-muted-foreground">{onlineCount} online · {users.length} total</span>
            <button onClick={clearActivity} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" /> Clear logs
            </button>
          </div>
          {users.length === 0 ? (
            <p className="text-xs text-muted-foreground">No user activity yet. Open the chat in another tab to see it appear here.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {users.map((u: any) => (
                  <button key={u.id} onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${selectedUser?.id === u.id ? "bg-secondary" : "glass-input hover:bg-secondary/60"}`}>
                    <Circle className={`w-2.5 h-2.5 ${u.online ? "fill-green-500 text-green-500" : "fill-muted-foreground text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{u.email || "Guest"}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {u.online ? "Online now" : `Last seen ${new Date(u.lastSeen).toLocaleString()}`}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{u.actions?.length || 0} acts</span>
                  </button>
                ))}
              </div>
              <div className="glass-input rounded-xl p-3 max-h-72 overflow-y-auto">
                {selectedUser ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm truncate">{selectedUser.email || "Guest"}</span>
                      <button onClick={() => removeUser(selectedUser.id)} className="ml-auto text-xs text-destructive hover:underline">Remove</button>
                    </div>
                    <ul className="space-y-1.5">
                      {(selectedUser.actions || []).map((a: any, i: number) => (
                        <li key={i} className="text-xs border-l-2 border-primary/40 pl-2">
                          <div className="text-foreground">{a.action}{a.detail ? `: ${a.detail}` : ""}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(a.at).toLocaleString()}</div>
                        </li>
                      ))}
                      {(!selectedUser.actions || selectedUser.actions.length === 0) && (
                        <p className="text-xs text-muted-foreground">No actions yet.</p>
                      )}
                    </ul>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Select a user to see their actions and online status.</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* All registered accounts (live from Auth) */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserCog className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">All registered accounts</h2>
            <span className="ml-2 text-xs text-muted-foreground">{accounts.length} accounts</span>
            <button onClick={fetchAccounts} disabled={loadingAccounts}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCcw className={`w-3 h-3 ${loadingAccounts ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {accounts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {loadingAccounts ? "Loading accounts..." : "No accounts loaded yet."}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left px-2 py-2">Email</th>
                    <th className="text-left px-2 py-2">Name</th>
                    <th className="text-left px-2 py-2">Provider</th>
                    <th className="text-left px-2 py-2">Status</th>
                    <th className="text-left px-2 py-2">Joined</th>
                    <th className="text-left px-2 py-2">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-border/40 hover:bg-secondary/40">
                      <td className="px-2 py-2 font-medium text-foreground flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {a.email || "—"}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{a.name || "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{a.provider}</td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${a.confirmed ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                          {a.confirmed ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
