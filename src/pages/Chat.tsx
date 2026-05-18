import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Send, Plus, Trash2, MessageSquare, Sparkles, Menu, X, Search, PanelLeftClose,
  PanelLeft, Paperclip, Mic, Globe, Crown, LogOut, GraduationCap, Code2, Brain,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LANGUAGES, tr } from "@/lib/i18n";

type Message = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; messages: Message[]; updatedAt: number; mode: string };

const STORAGE_KEY = "severain_threads_v2";
const ACTIVE_KEY = "severain_active_v2";
const LANG_KEY = "severain_lang";

const MODES = [
  { id: "expert", icon: Brain, color: "text-purple-400" },
  { id: "learner", icon: GraduationCap, color: "text-green-400" },
  { id: "fullstack", icon: Code2, color: "text-blue-400" },
];

const Chat = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem(ACTIVE_KEY) || "");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<string>(localStorage.getItem("severain_mode") || "expert");
  const [lang, setLang] = useState(localStorage.getItem(LANG_KEY) || "en");
  const [search, setSearch] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);

  // Optional auth — usable before login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (threads.length === 0) {
      const t: Thread = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now(), mode };
      setThreads([t]); setActiveId(t.id);
    } else if (!activeId || !threads.find((t) => t.id === activeId)) {
      setActiveId(threads[0].id);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(threads)); }, [threads]);
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);
  useEffect(() => { localStorage.setItem("severain_mode", mode); }, [mode]);
  useEffect(() => { localStorage.setItem(LANG_KEY, lang); }, [lang]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [streamingText, activeId, threads]);

  const active = threads.find((t) => t.id === activeId);

  const newThread = () => {
    const t: Thread = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now(), mode };
    setThreads((p) => [t, ...p]); setActiveId(t.id); setMobileOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const deleteThread = (id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (id === activeId && next.length) setActiveId(next[0].id);
      if (next.length === 0) {
        const t: Thread = { id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now(), mode };
        setActiveId(t.id); return [t];
      }
      return next;
    });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1_000_000) return toast.error("Max 1MB file");
    const content = await f.text();
    setAttachment({ name: f.name, content });
    toast.success(`Attached ${f.name}`);
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Voice not supported in this browser");
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = lang === "en" ? "en-US" : lang;
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (ev: any) => {
      const text = Array.from(ev.results).map((x: any) => x[0].transcript).join("");
      setInput((prev) => prev + (prev ? " " : "") + text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    r.start();
    setListening(true);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming || !active) return;
    setInput("");
    const sentAttachment = attachment;
    setAttachment(null);

    const userMsg: Message = { role: "user", content: text };
    const updated = [...active.messages, userMsg];
    setThreads((prev) => prev.map((t) =>
      t.id === active.id
        ? { ...t, messages: updated, title: t.messages.length === 0 ? text.slice(0, 40) : t.title, updatedAt: Date.now(), mode }
        : t,
    ));

    setStreaming(true); setStreamingText("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://iijxdopbacltbzrafbka.supabase.co/functions/v1/chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: updated, mode, language: lang, attachment: sentAttachment }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = ""; let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) { assistantText += delta; setStreamingText(assistantText); }
          } catch {}
        }
      }
      setThreads((prev) => prev.map((t) =>
        t.id === active.id
          ? { ...t, messages: [...updated, { role: "assistant", content: assistantText }], updatedAt: Date.now() }
          : t,
      ));
      setStreamingText("");
    } catch (e) {
      toast.error((e as Error).message);
      setStreamingText("");
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const logout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  const messages = active?.messages || [];
  const filteredThreads = threads
    .slice()
    .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 ${sidebarOpen ? "md:w-72" : "md:w-0 md:overflow-hidden"} fixed md:relative z-40 w-72 h-full bg-card border-r border-border flex flex-col transition-all`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-heading">Severain AI</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button onClick={newThread}
          className="m-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm">
          <Plus className="w-4 h-4" /> {tr(lang, "new_chat")}
        </button>

        <div className="px-3 pb-2 relative">
          <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tr(lang, "search")}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-sm outline-none" />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {filteredThreads.map((t) => (
            <div key={t.id}
              onClick={() => { setActiveId(t.id); setMobileOpen(false); }}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${
                t.id === activeId ? "bg-secondary" : "text-muted-foreground hover:bg-secondary/50"
              }`}>
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{t.title}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border space-y-2">
          <button onClick={() => setShowUpgrade(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">
            <Crown className="w-4 h-4" /> {tr(lang, "upgrade")}
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <span className="truncate flex-1">{user?.email}</span>
            <button onClick={logout} title={tr(lang, "logout")} className="hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 p-3 border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarOpen((s) => !s)}
            className="hidden md:flex text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary">
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    mode === m.id ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className={`w-3.5 h-3.5 ${mode === m.id ? m.color : ""}`} />
                  {tr(lang, m.id)}
                </button>
              );
            })}
          </div>

          <div className="ml-auto relative">
            <Globe className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-sm outline-none">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-20">
                <div className="inline-flex w-16 h-16 rounded-2xl gradient-primary glow-primary items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold font-heading mb-2">{tr(lang, "welcome")}</h1>
                <p className="text-muted-foreground">{tr(lang, "tagline")}</p>
                <p className="text-xs text-muted-foreground mt-4 italic">{tr(lang, "quote")}</p>
              </div>
            )}
            {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
            {streaming && <Bubble role="assistant" content={streamingText || "Thinking..."} />}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            {attachment && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-secondary rounded-lg text-xs">
                <Paperclip className="w-3 h-3" />
                <span className="truncate flex-1">{attachment.name}</span>
                <button onClick={() => setAttachment(null)}><X className="w-3 h-3" /></button>
              </div>
            )}
            <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/40">
              <input ref={fileRef} type="file" hidden onChange={onFile}
                accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.html,.css,.xml,.yaml,.yml" />
              <button onClick={() => fileRef.current?.click()} title="Attach file"
                className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground">
                <Paperclip className="w-4 h-4" />
              </button>
              <button onClick={toggleVoice} title="Voice input"
                className={`w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center ${listening ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
                <Mic className="w-4 h-4" />
              </button>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={tr(lang, "message")} rows={1} disabled={streaming}
                className="flex-1 bg-transparent outline-none resize-none px-2 py-2 max-h-40" />
              <button onClick={sendMessage} disabled={streaming || !input.trim()}
                className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center disabled:opacity-40 hover:opacity-90">
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Severain AI may produce inaccurate information.
            </p>
          </div>
        </div>
      </main>

      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />}

      {/* Upgrade modal */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" /> {tr(lang, "upgrade")} Severain AI Pro
              </h2>
              <button onClick={() => setShowUpgrade(false)}><X className="w-5 h-5" /></button>
            </div>
            <ul className="space-y-2 text-sm mb-5">
              <li>✨ Unlimited messages & long context</li>
              <li>🎮 Build full video games & apps end-to-end</li>
              <li>📁 Larger file uploads & advanced analysis</li>
              <li>🎙 Premium voice & 10+ languages</li>
              <li>🚀 Priority faster responses</li>
            </ul>
            <div className="bg-secondary rounded-xl p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Pay via MTN Mobile Money / Airtel</p>
              <p className="text-lg font-bold">📱 0792 315 839</p>
              <p className="text-xs text-muted-foreground mt-2">
                Send payment to the number above and message the same number with your account email. Pro is activated within 24h.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="text-xl font-bold">5,000 RWF</p>
              </div>
              <div className="border border-primary rounded-lg p-3 bg-primary/5">
                <p className="text-xs text-primary">Yearly · Best</p>
                <p className="text-xl font-bold">45,000 RWF</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Bubble = ({ role, content }: { role: "user" | "assistant"; content: string }) => {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-primary text-primary-foreground">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex-1 prose prose-invert prose-sm max-w-none prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-code:text-accent">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default Chat;
