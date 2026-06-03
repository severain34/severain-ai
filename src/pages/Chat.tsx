import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp, Plus, Trash2, MessageSquare, Sparkles, Menu, X, Search, PanelLeftClose,
  PanelLeft, Paperclip, Mic, Globe, Crown, LogOut, GraduationCap, Code2, Brain,
  LogIn, Code, Sun, Moon, Play, Copy, Check, Maximize2, Minimize2, Volume2,
  ClipboardList, Hammer, Wand2, Shield, Square,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LANGUAGES, tr } from "@/lib/i18n";

type Message = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; messages: Message[]; updatedAt: number; mode: string };

const STORAGE_KEY = "severain_threads_v2";
const ACTIVE_KEY = "severain_active_v2";
const LANG_KEY = "severain_lang";
const THEME_KEY = "severain_theme";

const MODES = [
  { id: "expert", icon: Brain, color: "text-purple-400" },
  { id: "learner", icon: GraduationCap, color: "text-green-400" },
  { id: "fullstack", icon: Code2, color: "text-blue-400" },
];

// Sample free playable videos for the "Make a Video" quick action
const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
];

// Speak text using browser SpeechSynthesis with a chosen voice "persona"
const speakText = (text: string, kind: "kid" | "woman" | "man") => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();
  const lower = (s: string) => s.toLowerCase();
  const femaleHints = ["female", "woman", "samantha", "victoria", "zira", "google uk english female", "karen", "tessa", "fiona", "amelie", "anna"];
  const maleHints = ["male", "man", "david", "daniel", "alex", "fred", "google uk english male", "diego", "thomas"];
  const kidHints = ["kid", "child", "junior", "boy", "girl"];
  let voice: SpeechSynthesisVoice | undefined;
  if (kind === "kid") voice = voices.find((v) => kidHints.some((h) => lower(v.name).includes(h)));
  if (kind === "woman" && !voice) voice = voices.find((v) => femaleHints.some((h) => lower(v.name).includes(h)));
  if (kind === "man" && !voice) voice = voices.find((v) => maleHints.some((h) => lower(v.name).includes(h)));
  const u = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, "code block.").slice(0, 4000));
  if (voice) u.voice = voice;
  if (kind === "kid") { u.pitch = 1.8; u.rate = 1.1; }
  else if (kind === "woman") { u.pitch = 1.2; u.rate = 1.0; }
  else { u.pitch = 0.7; u.rate = 0.95; }
  window.speechSynthesis.speak(u);
};

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
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark"
  );
  const [voiceKind, setVoiceKind] = useState<"kid" | "woman" | "man">(
    () => (localStorage.getItem("severain_voice") as any) || "woman"
  );
  const [preview, setPreview] = useState<{ type: "game" | "video"; src: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);
  const pendingPreview = useRef<"game" | "video" | null>(null);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
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
  useEffect(() => { localStorage.setItem("severain_voice", voiceKind); }, [voiceKind]);
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
    r.continuous = false; r.interimResults = true;
    r.onresult = (ev: any) => {
      const text = Array.from(ev.results).map((x: any) => x[0].transcript).join("");
      setInput((prev) => prev + (prev ? " " : "") + text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r; r.start(); setListening(true);
  };

  // Extract a runnable HTML game from assistant text
  const extractGameHtml = (text: string): string | null => {
    const fence = text.match(/```(?:html|HTML)\n([\s\S]*?)```/);
    if (fence && /<\s*(html|canvas|script|body)/i.test(fence[1])) return fence[1];
    const doc = text.match(/<!doctype[\s\S]*?<\/html>/i);
    if (doc) return doc[0];
    return null;
  };

  // Extract a video URL from assistant text
  const extractVideoUrl = (text: string): string | null => {
    const m = text.match(/https?:\/\/\S+\.(?:mp4|webm|mov)(?:\?\S+)?/i);
    return m ? m[0] : null;
  };

  const quickAction = (kind: "plan" | "build" | "prompt") => {
    const prompts = {
      plan: "Act as a senior product architect. Create a detailed, step-by-step PLAN for: [describe your project here]. Include goals, milestones, tech stack, file structure, data model, risks, and a timeline.",
      build: "Act as a senior full-stack engineer. BUILD a complete, production-ready implementation for: [describe what to build]. Provide full file structure, all source files in fenced code blocks, install/run instructions, and tests.",
      prompt: "You are a world-class PROMPT ENGINEER. Generate 5 powerful, ready-to-use prompts about: [your topic]. For each: give a title, the full prompt, the best model to use, and example output.",
    } as const;
    setInput(prompts[kind]);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming || !active) return;
    setInput("");
    const sentAttachment = attachment;
    setAttachment(null);
    const wantPreview = pendingPreview.current;
    pendingPreview.current = null;

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

      // Auto-open playable preview
      if (wantPreview === "game") {
        const html = extractGameHtml(assistantText);
        if (html) setPreview({ type: "game", src: html });
      } else if (wantPreview === "video") {
        const vid = extractVideoUrl(assistantText)
          || SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)];
        setPreview({ type: "video", src: vid });
      }
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
  const filteredThreads = useMemo(() =>
    threads.slice()
      .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt),
    [threads, search]);

  // VS Code deep link — opens local installed VS Code via vscode:// protocol
  const openLocalEditor = () => {
    const win = window.open("vscode://", "_self");
    setTimeout(() => {
      toast.message("If VS Code didn't open, install it first", {
        action: { label: "Download", onClick: () => window.open("https://code.visualstudio.com/download", "_blank") },
      });
    }, 1200);
    return win;
  };

  return (
    <div className="flex h-screen w-screen max-w-full bg-background text-foreground overflow-hidden relative">
      {/* Ambient blobs for glassmorphism */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob bg-primary/20 w-[40rem] h-[40rem] -top-40 -left-40" />
        <div className="blob bg-accent/15 w-[35rem] h-[35rem] -bottom-40 -right-40" />
      </div>

      {/* Sidebar */}
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 ${sidebarOpen ? "md:w-72" : "md:w-0 md:overflow-hidden"} fixed md:relative z-40 w-72 h-full glass flex flex-col transition-all`}
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
          className="m-3 flex items-center gap-2 px-3 py-2 rounded-lg glass-input hover:bg-secondary text-sm">
          <Plus className="w-4 h-4" /> {tr(lang, "new_chat")}
        </button>

        <div className="px-3 pb-2 relative">
          <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tr(lang, "search")}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg glass-input text-sm outline-none" />
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
            <span className="truncate flex-1">{user?.email || "Guest"}</span>
            {user ? (
              <button onClick={logout} title={tr(lang, "logout")} className="hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => navigate("/auth")} className="hover:text-foreground font-medium">
                {tr(lang, "signin")}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="flex items-center gap-2 p-3 glass border-b border-border flex-wrap">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarOpen((s) => !s)}
            className="hidden md:flex text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary">
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>

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

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="w-9 h-9 rounded-lg glass-input flex items-center justify-center hover:bg-secondary"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={openLocalEditor}
              title="Open your installed VS Code / editor"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-input text-sm hover:bg-secondary"
            >
              <Code className="w-4 h-4 text-primary" />
              <span>Open editor</span>
            </button>

            {/* Voice persona picker */}
            <div className="relative">
              <Volume2 className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                value={voiceKind}
                onChange={(e) => setVoiceKind(e.target.value as any)}
                title="Voice for read-aloud"
                className="pl-8 pr-3 py-1.5 rounded-lg glass-input text-sm outline-none"
              >
                <option value="kid">Kid voice</option>
                <option value="woman">Woman voice</option>
                <option value="man">Man voice</option>
              </select>
            </div>

            <div className="relative">
              <Globe className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select value={lang} onChange={(e) => setLang(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg glass-input text-sm outline-none">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>

            {!user && (
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">{tr(lang, "signin")}</span>
              </button>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-20">
                <div className="inline-flex w-16 h-16 rounded-2xl gradient-primary glow-primary items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold font-heading mb-2">{tr(lang, "welcome")}</h1>
                <p className="text-muted-foreground">{tr(lang, "tagline")}</p>
                <p className="text-xs text-muted-foreground mt-4 italic">{tr(lang, "quote")}</p>

                <div className="grid sm:grid-cols-3 gap-3 mt-8 max-w-2xl mx-auto">
                  {[
                    { icon: ClipboardList, label: "Plan", desc: "Architect a project step-by-step", color: "text-sky-400", kind: "plan" as const },
                    { icon: Hammer, label: "Build", desc: "Generate full production-ready code", color: "text-emerald-400", kind: "build" as const },
                    { icon: Wand2, label: "Prompt", desc: "Craft powerful AI prompts", color: "text-fuchsia-400", kind: "prompt" as const },
                  ].map((q) => {
                    const Icon = q.icon;
                    return (
                      <button key={q.label}
                        onClick={() => quickAction(q.kind)}
                        className="group p-4 rounded-xl glass hover:bg-secondary/50 transition text-left">
                        <Icon className={`w-5 h-5 mb-2 ${q.color}`} />
                        <p className="text-sm font-medium">{q.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{q.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content}
                voiceKind={voiceKind}
                onPlayGame={(html) => setPreview({ type: "game", src: html })}
                onPlayVideo={(src) => setPreview({ type: "video", src })}
                extractGame={extractGameHtml} extractVideo={extractVideoUrl} />
            ))}
            {streaming && <Bubble role="assistant" content={streamingText || "Thinking..."}
              voiceKind={voiceKind}
              extractGame={extractGameHtml} extractVideo={extractVideoUrl} />}
          </div>
        </div>

        {/* Composer */}
        <div className="glass border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            {attachment && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-secondary rounded-lg text-xs">
                <Paperclip className="w-3 h-3" />
                <span className="truncate flex-1">{attachment.name}</span>
                <button onClick={() => setAttachment(null)}><X className="w-3 h-3" /></button>
              </div>
            )}
            <div className="relative flex items-end gap-2 glass rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/40">
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
            className="glass rounded-2xl p-6 max-w-md w-full">
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
                Send payment, then message the same number with your account email. Pro activates within 24h.
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

      {/* Playable preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setPreview(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-medium flex items-center gap-2 text-white">
                {preview.type === "game" ? "🎮 Playable Game" : (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                    CapCut Studio · Preview
                  </>
                )}
              </span>
              <button onClick={() => setPreview(null)} className="hover:bg-white/10 p-1.5 rounded text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {preview.type === "game" ? (
              <iframe
                title="game"
                sandbox="allow-scripts allow-pointer-lock"
                srcDoc={preview.src}
                className="w-full h-[70vh] rounded-xl bg-white"
              />
            ) : (
              <div className="capcut-frame">
                <div className="relative rounded-[0.9rem] overflow-hidden bg-black">
                  <video
                    src={preview.src}
                    controls
                    autoPlay
                    loop
                    className="capcut-video w-full max-h-[68vh] bg-black"
                  />
                  {/* Floating sparkles overlay */}
                  <div className="pointer-events-none absolute inset-0">
                    {[10, 28, 46, 64, 82].map((left, i) => (
                      <span
                        key={i}
                        className="capcut-spark"
                        style={{ left: `${left}%`, bottom: "10%", animationDelay: `${i * 0.45}s` }}
                      />
                    ))}
                  </div>
                  {/* Top-left badge */}
                  <div className="pointer-events-none absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-semibold tracking-wider bg-black/50 backdrop-blur text-white border border-white/10">
                    ● REC · 4K
                  </div>
                </div>
                {/* CapCut-style timeline */}
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center gap-2 text-[10px] text-white/70 mb-1.5">
                    <span>00:00</span>
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="capcut-timeline" />
                    </div>
                    <span>00:08</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-6 flex-1 rounded-sm bg-gradient-to-b from-white/15 to-white/5"
                        style={{ opacity: 0.4 + (i % 5) * 0.12 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CopyBtn = ({ text, className = "" }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className={`items-center gap-1 text-xs transition-opacity ${className}`}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const PreWithCopy = ({ children }: { children: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const [max, setMax] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const handleCopy = () => {
    const text = preRef.current?.innerText || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const PreNode = (
    <pre ref={preRef} className={max ? "!mt-0 !rounded-none !max-h-none h-full overflow-auto" : "!mt-0"}>{children}</pre>
  );
  return (
    <>
      <div className="relative group">
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <button
            onClick={() => setMax(true)}
            title="Maximize"
            className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 backdrop-blur text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 backdrop-blur text-white/80 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {!max && PreNode}
      </div>
      {max && (
        <div className="not-prose fixed inset-0 z-[60] bg-background/95 backdrop-blur flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-xs text-muted-foreground">Code preview</span>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1 rounded-md glass-input text-xs hover:bg-secondary">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={() => setMax(false)} className="flex items-center gap-1 px-2.5 py-1 rounded-md glass-input text-xs hover:bg-secondary">
                <Minimize2 className="w-3 h-3" /> Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">{PreNode}</div>
        </div>
      )}
    </>
  );
};

const Bubble = ({
  role, content, voiceKind, onPlayGame, onPlayVideo, extractGame, extractVideo,
}: {
  role: "user" | "assistant"; content: string;
  voiceKind?: "kid" | "woman" | "man";
  onPlayGame?: (html: string) => void;
  onPlayVideo?: (src: string) => void;
  extractGame?: (t: string) => string | null;
  extractVideo?: (t: string) => string | null;
}) => {
  if (role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="relative group max-w-[80%]">
          <div className="rounded-3xl px-5 py-3 bg-secondary text-foreground">
            <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
          <div className="absolute -top-3 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyBtn text={content} className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex" />
          </div>
        </div>
      </div>
    );
  }
  const game = extractGame?.(content) || null;
  const video = extractVideo?.(content) || null;
  return (
    <div className="group animate-in fade-in duration-300 relative">
      <div className="chat-prose prose prose-invert max-w-none prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-code:text-foreground prose-headings:text-foreground prose-p:text-foreground/90">
        <ReactMarkdown components={{ pre: PreWithCopy }}>{content}</ReactMarkdown>
        {(game || video) && (
          <div className="not-prose flex gap-2 mt-3">
            {game && onPlayGame && (
              <button onClick={() => onPlayGame(game)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                <Play className="w-3.5 h-3.5" /> Play Game
              </button>
            )}
            {video && onPlayVideo && (
              <button onClick={() => onPlayVideo(video)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                <Play className="w-3.5 h-3.5" /> Play Video
              </button>
            )}
          </div>
        )}
      </div>
      <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={() => speakText(content, voiceKind || "woman")}
          title="Read aloud"
          className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
        <CopyBtn text={content} className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex" />
      </div>
    </div>
  );
};

export default Chat;
