import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp, Plus, Trash2, MessageSquare, Sparkles, Menu, X, Search, PanelLeftClose,
  PanelLeft, Paperclip, Mic, Globe, Crown, LogOut, GraduationCap, Code2, Brain,
  LogIn, Code, Sun, Moon, Play, Copy, Check, Maximize2, Minimize2, Volume2,
  ClipboardList, Hammer, Wand2, Shield, Square, Phone, PhoneOff, Settings, User as UserIcon,
  Link2, Send, HelpCircle, Camera, Image as ImageIcon, Film, Languages, FileText,
  Music, Palette, Lightbulb, BookOpen, Calculator, Mail, ScrollText, Zap,
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

// Speak text using browser SpeechSynthesis with a chosen voice "persona".
// Waits for the voice list to load (Chrome populates voices asynchronously).
const ensureVoices = (): Promise<SpeechSynthesisVoice[]> =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve([]);
    const v = window.speechSynthesis.getVoices();
    if (v && v.length) return resolve(v);
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices() || []);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices() || []), 1500);
  });

const speakText = async (
  text: string,
  kind: "kid" | "woman" | "man",
  onEnd?: () => void,
) => {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const voices = await ensureVoices();
  const lower = (s: string) => s.toLowerCase();
  const femaleHints = ["female", "woman", "samantha", "victoria", "zira", "google uk english female", "karen", "tessa", "fiona", "amelie", "anna"];
  const maleHints = ["male", "man", "david", "daniel", "alex", "fred", "google uk english male", "diego", "thomas"];
  const kidHints = ["kid", "child", "junior", "boy", "girl"];
  let voice: SpeechSynthesisVoice | undefined;
  if (kind === "kid") voice = voices.find((v) => kidHints.some((h) => lower(v.name).includes(h)));
  if (kind === "woman" && !voice) voice = voices.find((v) => femaleHints.some((h) => lower(v.name).includes(h)));
  if (kind === "man" && !voice) voice = voices.find((v) => maleHints.some((h) => lower(v.name).includes(h)));
  if (!voice) voice = voices.find((v) => v.lang?.startsWith("en")) || voices[0];
  const clean = text.replace(/```[\s\S]*?```/g, " code block. ").replace(/[#*_>`~]/g, "").slice(0, 4000);
  const u = new SpeechSynthesisUtterance(clean);
  if (voice) u.voice = voice;
  if (kind === "kid") { u.pitch = 1.8; u.rate = 1.1; }
  else if (kind === "woman") { u.pitch = 1.2; u.rate = 1.0; }
  else { u.pitch = 0.7; u.rate = 0.95; }
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
};

// Tracks activity log for admin
const ACTIVITY_KEY = "severain_user_activity";
const logActivity = (user: { id?: string; email?: string } | null, action: string, detail?: string) => {
  try {
    const id = user?.id || user?.email || "guest";
    const all = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
    const u = all[id] || { id, email: user?.email || "Guest", actions: [], lastSeen: 0, online: false };
    u.email = user?.email || u.email;
    u.lastSeen = Date.now();
    u.online = true;
    u.actions = [{ at: Date.now(), action, detail: detail?.slice(0, 120) || "" }, ...(u.actions || [])].slice(0, 100);
    all[id] = u;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all));
  } catch {}
};
const heartbeat = (user: { id?: string; email?: string } | null) => {
  try {
    const id = user?.id || user?.email || "guest";
    const all = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
    const u = all[id] || { id, email: user?.email || "Guest", actions: [], lastSeen: 0, online: true };
    u.email = user?.email || u.email;
    u.lastSeen = Date.now();
    u.online = true;
    all[id] = u;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all));
  } catch {}
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
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem("severain_auto_speak") === "1");
  const [banner, setBanner] = useState(() => localStorage.getItem("severain_admin_banner") || "");
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("severain_admin_unlocked") === "1";
  const [callMode, setCallMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("severain_display_name") || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Connected social/external accounts (per user, stored locally)
  type Conn = { id: string; platform: string; handle: string; token: string };
  const connKey = () => `severain_connections_${user?.id || user?.email || "guest"}`;
  const [connections, setConnections] = useState<Conn[]>([]);
  useEffect(() => {
    try { setConnections(JSON.parse(localStorage.getItem(connKey()) || "[]")); } catch { setConnections([]); }
  }, [user]);
  const saveConnections = (next: Conn[]) => {
    setConnections(next);
    localStorage.setItem(connKey(), JSON.stringify(next));
  };
  const [newConn, setNewConn] = useState<Conn>({ id: "", platform: "instagram", handle: "", token: "" });

  // Admin broadcast questions (admin asks → all users answer)
  type AdminQ = { id: string; question: string; at: number };
  const [adminQuestions, setAdminQuestions] = useState<AdminQ[]>(() => {
    try { return JSON.parse(localStorage.getItem("severain_admin_questions") || "[]"); } catch { return []; }
  });
  const answerKey = () => `severain_admin_answers_${user?.id || user?.email || "guest"}`;
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(`severain_admin_answers_guest`) || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    try { setMyAnswers(JSON.parse(localStorage.getItem(answerKey()) || "{}")); } catch { setMyAnswers({}); }
  }, [user]);
  useEffect(() => {
    const i = setInterval(() => {
      try { setAdminQuestions(JSON.parse(localStorage.getItem("severain_admin_questions") || "[]")); } catch {}
    }, 5000);
    return () => clearInterval(i);
  }, []);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const submitAnswer = (qid: string) => {
    const txt = (answerDrafts[qid] || "").trim();
    if (!txt) return;
    const next = { ...myAnswers, [qid]: txt };
    setMyAnswers(next);
    localStorage.setItem(answerKey(), JSON.stringify(next));
    // Also push to global responses log for admin
    try {
      const all = JSON.parse(localStorage.getItem("severain_admin_responses") || "{}");
      all[qid] = all[qid] || [];
      all[qid].push({
        userId: user?.id || user?.email || "guest",
        email: user?.email || "guest",
        answer: txt,
        at: Date.now(),
      });
      localStorage.setItem("severain_admin_responses", JSON.stringify(all));
    } catch {}
    setAnswerDrafts((d) => ({ ...d, [qid]: "" }));
    toast.success("Answer sent to admin");
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const callModeRef = useRef(false);
  useEffect(() => { callModeRef.current = callMode; }, [callMode]);
  const recogRef = useRef<any>(null);
  const pendingPreview = useRef<"game" | "video" | null>(null);
  const stickToBottomRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u && localStorage.getItem("severain_guest") !== "1") navigate("/auth");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (!s?.user && localStorage.getItem("severain_guest") !== "1") navigate("/auth");
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Load profile (display name + photo) so Severain AI can access the account
  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    (async () => {
      try {
        const { data } = await supabase.from("profiles")
          .select("display_name, avatar_path").eq("id", user.id).maybeSingle();
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.avatar_path) {
          const { data: signed } = await supabase.storage.from("avatars")
            .createSignedUrl(data.avatar_path, 60 * 60 * 24 * 7);
          if (signed?.signedUrl) setAvatarUrl(signed.signedUrl);
        }
      } catch {}
    })();
  }, [user]);

  // Presence heartbeat for admin "Users online"
  useEffect(() => {
    heartbeat(user);
    logActivity(user, "opened_chat");
    const i = setInterval(() => heartbeat(user), 15000);
    const offline = () => {
      try {
        const id = user?.id || user?.email || "guest";
        const all = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
        if (all[id]) { all[id].online = false; localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all)); }
      } catch {}
    };
    window.addEventListener("beforeunload", offline);
    return () => { clearInterval(i); window.removeEventListener("beforeunload", offline); offline(); };
  }, [user]);

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
    if (!stickToBottomRef.current) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [streamingText, activeId, threads]);

  const onMessagesScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottomRef.current = nearBottom;
  };

  // Refresh banner from admin updates
  useEffect(() => {
    const i = setInterval(() => {
      const b = localStorage.getItem("severain_admin_banner") || "";
      setBanner((prev) => (prev !== b ? b : prev));
      const a = localStorage.getItem("severain_auto_speak") === "1";
      setAutoSpeak((prev) => (prev !== a ? a : prev));
    }, 1500);
    return () => clearInterval(i);
  }, []);

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
    e.target.value = "";
    if (!f) return;
    if (f.size > 4_000_000) return toast.error("Max 4MB file");
    const isBinary = /^(image|audio|video)\//.test(f.type);
    if (isBinary) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string) || "";
        setAttachment({ name: f.name, content: `[binary ${f.type}] data URL length ${b64.length}. Preview: ${b64.slice(0, 200)}...` });
      };
      reader.readAsDataURL(f);
    } else {
      const content = await f.text();
      setAttachment({ name: f.name, content });
    }
    toast.success(`Attached ${f.name}`);
    setPlusOpen(false);
  };

  // Record a short voice clip using MediaRecorder, then attach it
  const toggleRecordClip = async () => {
    if (recording) { mediaRecRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        if (blob.size > 4_000_000) return toast.error("Clip too large (max 4MB)");
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = (reader.result as string) || "";
          const name = `voice-clip-${new Date().toISOString().slice(11,19)}.webm`;
          setAttachment({ name, content: `[voice clip ${blob.type}, ${Math.round(blob.size/1024)}KB] data URL preview: ${b64.slice(0, 120)}...` });
          toast.success("Voice clip attached");
        };
        reader.readAsDataURL(blob);
      };
      mediaRecRef.current = mr;
      mr.start();
      setRecording(true);
      toast.message("Recording... tap mic again to stop");
    } catch {
      toast.error("Microphone permission denied");
    }
  };

  const insertPrefix = (text: string) => {
    setInput((p) => (p ? `${text} ${p}` : text));
    setPlusOpen(false);
    setTimeout(() => inputRef.current?.focus(), 30);
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

  // Hands-free voice conversation. Stop talking → auto-send. AI finishes speaking → listen again.
  const startListeningOnce = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported in this browser"); setCallMode(false); return; }
    try { window.speechSynthesis?.cancel(); } catch {}
    const r = new SR();
    r.lang = lang === "en" ? "en-US" : lang;
    r.continuous = false; r.interimResults = true;
    let finalText = "";
    r.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      setInput(finalText + interim);
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (callModeRef.current && text) {
        setInput(text);
        setTimeout(() => sendMessage(), 50);
      } else if (callModeRef.current) {
        setTimeout(() => callModeRef.current && startListeningOnce(), 400);
      }
    };
    recogRef.current = r;
    try { r.start(); setListening(true); } catch {}
  };

  const toggleCallMode = () => {
    if (callMode) {
      setCallMode(false);
      recogRef.current?.stop();
      try { window.speechSynthesis?.cancel(); } catch {}
      setListening(false);
      toast.message("Call ended");
    } else {
      setCallMode(true);
      toast.success("Call started — just talk, I'm listening");
      setTimeout(() => startListeningOnce(), 100);
    }
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
    stickToBottomRef.current = true;
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://iijxdopbacltbzrafbka.supabase.co/functions/v1/chat`;
      const adminSystem = localStorage.getItem("severain_admin_system") || "";
      const model = localStorage.getItem("severain_model") || "";
      const userContext = user ? {
        name: displayName || user.user_metadata?.full_name || "",
        email: user.email,
        createdAt: user.created_at,
        hasAvatar: !!avatarUrl,
        connections: connections.map(c => ({ platform: c.platform, handle: c.handle, hasToken: !!c.token })),
      } : null;
      const resp = await fetch(url, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: updated, mode, language: lang, attachment: sentAttachment, adminSystem, model, userContext }),
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

      // AI talks back if enabled
      // Auto-speak when enabled or in call mode; after speech ends in call mode, listen again
      const shouldSpeak = (autoSpeak || callModeRef.current) && !!assistantText;
      if (shouldSpeak) {
        speakText(assistantText, voiceKind, () => {
          if (callModeRef.current) setTimeout(() => startListeningOnce(), 250);
        });
      } else if (callModeRef.current) {
        setTimeout(() => startListeningOnce(), 250);
      }
      logActivity(user, "sent_message", text);
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message || "Request failed");
      setStreamingText("");
    } finally {
      abortRef.current = null;
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  };

  const logout = async () => { await supabase.auth.signOut(); localStorage.removeItem("severain_guest"); navigate("/auth"); };

  // Upload profile photo to the user's account
  const uploadAvatar = async (file: File) => {
    if (!user) { toast.error("Sign in first to add a profile photo."); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Image too large (max 3 MB)."); return; }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName || user.user_metadata?.full_name || null,
      avatar_path: path,
      updated_at: new Date().toISOString(),
    });
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signed?.signedUrl) setAvatarUrl(signed.signedUrl);
    toast.success("Profile photo updated!");
    logActivity(user, "uploaded_profile_photo");
  };

  const saveSettings = async () => {
    localStorage.setItem("severain_display_name", displayName);
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName || null,
        updated_at: new Date().toISOString(),
      });
    }
    toast.success("Saved");
    setShowSettings(false);
  };

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
          {isAdmin && (
            <button onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg glass-input hover:bg-secondary text-sm">
              <Shield className="w-4 h-4 text-primary" />
              Admin panel
            </button>
          )}
          <button onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg glass-input hover:bg-secondary text-sm">
            <Settings className="w-4 h-4" /> Account settings
          </button>
          <button onClick={() => setShowUpgrade(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">
            <Crown className="w-4 h-4" /> {tr(lang, "upgrade")}
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <span className="truncate flex-1">{displayName || user?.email || "Guest"}</span>
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
              title="Open your installed VS Code editor"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-input text-sm hover:bg-secondary"
            >
              <Code className="w-4 h-4 text-primary" />
              <span>Open editor</span>
            </button>

            <button
              onClick={() => quickAction("prompt")}
              title="Help me write a prompt"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-input text-sm hover:bg-secondary"
            >
              <Wand2 className="w-4 h-4 text-fuchsia-400" />
              <span>Prompt helper</span>
            </button>

            <div className="relative">
              <Globe className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select value={lang} onChange={(e) => setLang(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg glass-input text-sm outline-none bg-background text-foreground">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code} className="bg-background text-foreground">{l.name}</option>)}
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

        {banner && (
          <div className="bg-primary/10 border-b border-primary/30 text-foreground text-sm text-center py-2 px-4">
            <span className="font-medium">{banner}</span>
          </div>
        )}

        {adminQuestions.length > 0 && (
          <div className="border-b border-border bg-secondary/40 px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
            {adminQuestions.map((q) => {
              const answered = !!myAnswers[q.id];
              return (
                <div key={q.id} className="max-w-3xl mx-auto glass rounded-xl p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Question from Severain (admin)</p>
                      <p className="text-sm font-medium">{q.question}</p>
                    </div>
                  </div>
                  {answered ? (
                    <p className="text-xs text-emerald-400">✓ Your answer: {myAnswers[q.id]}</p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={answerDrafts[q.id] || ""}
                        onChange={(e) => setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && submitAnswer(q.id)}
                        placeholder="Type your answer..."
                        className="flex-1 px-3 py-1.5 rounded-lg glass-input text-sm outline-none"
                      />
                      <button onClick={() => submitAnswer(q.id)}
                        className="px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" /> Send
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}



        <div ref={scrollRef} onScroll={onMessagesScroll} className="flex-1 overflow-y-auto overflow-x-hidden">
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
                accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.html,.css,.xml,.yaml,.yml,.pdf" />
              <input ref={imageRef} type="file" hidden accept="image/*" onChange={onFile} />
              <input ref={cameraRef} type="file" hidden accept="image/*" capture="environment" onChange={onFile} />
              <input ref={audioRef} type="file" hidden accept="audio/*" onChange={onFile} />

              {/* Plus menu */}
              <div className="relative">
                <button onClick={() => setPlusOpen((v) => !v)} title="Add"
                  className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground">
                  <Plus className={`w-5 h-5 transition-transform ${plusOpen ? "rotate-45" : ""}`} />
                </button>
                {plusOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setPlusOpen(false)} />
                    <div className="absolute bottom-12 left-0 z-40 w-64 glass rounded-2xl p-2 shadow-2xl border border-border">
                      {[
                        { icon: Paperclip, label: "Attach file", onClick: () => { fileRef.current?.click(); } },
                        { icon: ImageIcon, label: "Upload photo", onClick: () => { imageRef.current?.click(); } },
                        { icon: Camera, label: "Take photo (camera)", onClick: () => { cameraRef.current?.click(); } },
                        { icon: Film, label: "Create video", onClick: () => insertPrefix("Create a short cinematic video about:") },
                        { icon: Music, label: "Upload audio", onClick: () => { audioRef.current?.click(); } },
                        { icon: Mic, label: recording ? "Stop recording" : "Record voice clip", onClick: () => { toggleRecordClip(); setPlusOpen(false); } },
                        { icon: Globe, label: "Search the web", onClick: () => insertPrefix("Search the web and cite sources for:") },
                        { icon: Languages, label: "Translate", onClick: () => insertPrefix(`Translate to ${lang}:`) },
                        { icon: Code2, label: "Write code", onClick: () => insertPrefix("Write complete, runnable code for:") },
                        { icon: ClipboardList, label: "Plan a project", onClick: () => { quickAction("plan"); setPlusOpen(false); } },
                        { icon: Hammer, label: "Build an app", onClick: () => { quickAction("build"); setPlusOpen(false); } },
                        { icon: Lightbulb, label: "Prompt ideas", onClick: () => { quickAction("prompt"); setPlusOpen(false); } },
                        { icon: BookOpen, label: "Summarize", onClick: () => insertPrefix("Summarize in clear bullet points:") },
                        { icon: Calculator, label: "Solve math", onClick: () => insertPrefix("Solve step by step:") },
                        { icon: Mail, label: "Draft email", onClick: () => insertPrefix("Draft a professional email about:") },
                        { icon: ScrollText, label: "Write essay", onClick: () => insertPrefix("Write a long, well-structured essay on:") },
                        { icon: Palette, label: "Design a logo", onClick: () => insertPrefix("Design a modern logo concept for:") },
                        { icon: Zap, label: "Explain simply", onClick: () => insertPrefix("Explain like I'm 5:") },
                      ].map((it) => (
                        <button key={it.label} onClick={it.onClick}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary text-sm text-left">
                          <it.icon className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{it.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={tr(lang, "message")} rows={1} disabled={streaming}
                className="flex-1 bg-transparent outline-none resize-none px-2 py-2 max-h-40" />
              {recording && (
                <span className="text-xs text-destructive font-semibold animate-pulse mr-1">● REC</span>
              )}
              {streaming ? (
                <button onClick={stopStreaming} title="Stop generating"
                  className="w-10 h-10 rounded-xl bg-destructive flex items-center justify-center hover:opacity-90">
                  <Square className="w-4 h-4 text-destructive-foreground fill-current" />
                </button>
              ) : (
                <button onClick={sendMessage} disabled={!input.trim()} title="Send"
                  className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center disabled:opacity-40 hover:opacity-90">
                  <ArrowUp className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Severain AI may produce inaccurate information.
            </p>
          </div>
        </div>
      </main>

      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileOpen(false)} />}

      {/* Upgrade modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><UserIcon className="w-5 h-5 text-primary" /> Account settings</h2>
              <button onClick={() => setShowSettings(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 text-sm">
              {/* Profile photo */}
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile photo" className="w-16 h-16 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <UserIcon className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-1">
                  <button onClick={() => avatarFileRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg glass-input text-xs text-foreground hover:bg-secondary transition">
                    {avatarUrl ? "Change photo" : "Upload photo"}
                  </button>
                  <p className="text-[10px] text-muted-foreground">
                    {user ? "JPG/PNG, max 3 MB — saved to your account." : "Sign in to save a profile photo."}
                  </p>
                </div>
                <input ref={avatarFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <div className="mt-1 px-3 py-2 rounded-lg glass-input">{user?.email || "Not signed in (guest)"}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Display name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="What should I call you?"
                  className="w-full mt-1 px-3 py-2 rounded-lg glass-input outline-none text-foreground" />
              </div>
              {user && (
                <p className="text-[11px] text-muted-foreground rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                  ✓ Severain AI can access your account data (name, email, member date, profile photo) to personalize answers. Ask it: "What do you know about my account?"
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Theme</label>
                  <select value={theme} onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-lg glass-input outline-none text-foreground">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Default voice</label>
                  <select value={voiceKind} onChange={(e) => setVoiceKind(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-lg glass-input outline-none text-foreground">
                    <option value="kid">Kid</option>
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoSpeak}
                  onChange={(e) => { setAutoSpeak(e.target.checked); localStorage.setItem("severain_auto_speak", e.target.checked ? "1" : "0"); }} />
                Auto-speak every assistant reply
              </label>

              {isAdmin && (
                <div className="rounded-xl p-3 border border-primary/30 bg-primary/5 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Owner / Admin access
                  </div>
                  <p className="text-muted-foreground">Use these URLs to train your model and manage everything:</p>
                  <ul className="text-foreground space-y-0.5">
                    <li>• <code className="text-primary">/admin</code></li>
                    <li>• <code className="text-primary">/severain-admin</code></li>
                    <li>• <code className="text-primary">/owner</code></li>
                  </ul>
                  <p className="text-muted-foreground pt-1">Login PIN: <code className="text-foreground font-bold">severain2026</code></p>
                </div>
              )}

              {/* Connected accounts (AI can use them) */}
              <div className="rounded-xl p-3 border border-border bg-secondary/30 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <Link2 className="w-4 h-4 text-primary" /> Connected accounts
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Add Instagram / X / Facebook / TikTok handles and access tokens.
                  Severain AI will use them to draft posts, schedule images and act on your behalf.
                  Tokens are stored only in your browser.
                </p>
                {connections.length > 0 && (
                  <ul className="space-y-1">
                    {connections.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg glass-input text-xs">
                        <span className="font-medium capitalize">{c.platform}</span>
                        <span className="text-muted-foreground">@{c.handle}</span>
                        <span className="ml-auto text-[10px] text-emerald-400">{c.token ? "token saved" : "no token"}</span>
                        <button onClick={() => saveConnections(connections.filter(x => x.id !== c.id))}
                          className="text-destructive hover:opacity-80"><X className="w-3 h-3" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  <select value={newConn.platform} onChange={(e) => setNewConn({ ...newConn, platform: e.target.value })}
                    className="rounded-lg glass-input px-2 py-1.5 text-xs outline-none">
                    <option value="instagram">Instagram</option>
                    <option value="x">X / Twitter</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="gmail">Gmail</option>
                    <option value="other">Other</option>
                  </select>
                  <input value={newConn.handle} onChange={(e) => setNewConn({ ...newConn, handle: e.target.value })}
                    placeholder="@handle" className="rounded-lg glass-input px-2 py-1.5 text-xs outline-none" />
                  <input value={newConn.token} onChange={(e) => setNewConn({ ...newConn, token: e.target.value })}
                    placeholder="access token" type="password" className="rounded-lg glass-input px-2 py-1.5 text-xs outline-none" />
                </div>
                <button onClick={() => {
                    if (!newConn.handle.trim()) { toast.error("Add a handle"); return; }
                    saveConnections([...connections, { ...newConn, id: crypto.randomUUID() }]);
                    setNewConn({ id: "", platform: "instagram", handle: "", token: "" });
                    toast.success("Account connected");
                  }}
                  className="w-full py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium">
                  + Connect account
                </button>
              </div>

              <div className="flex gap-2 pt-2">

                <button
                  onClick={saveSettings}
                  className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground font-medium">Save</button>
                {user && (
                  <button onClick={logout} className="px-4 py-2 rounded-lg bg-destructive/20 text-destructive font-medium">
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowUpgrade(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 max-w-3xl w-full my-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" /> Upgrade your plan
              </h2>
              <button onClick={() => setShowUpgrade(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Get more access to Severain AI's smartest models, larger uploads and more.</p>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { name: "Free", price: "0 RWF", tag: "Current plan", features: ["Standard model", "Limited daily messages", "Basic file analysis", "Standard speed"], cta: "Your plan", disabled: true },
                { name: "Plus", price: "5,000 RWF", sub: "/ month", tag: "Most popular", popular: true, features: ["Smarter advanced models", "Unlimited messages", "Image creation", "Faster responses", "Long context", "Voice read-aloud"], cta: "Upgrade to Plus" },
                { name: "Pro", price: "45,000 RWF", sub: "/ year", tag: "Best value", features: ["Everything in Plus", "Highest priority", "Build full apps & games", "Largest file uploads", "Early access to new tools", "Dedicated support"], cta: "Upgrade to Pro" },
              ].map((p) => (
                <div key={p.name} className={`rounded-xl p-4 border ${p.popular ? "border-primary bg-primary/5" : "border-border"} flex flex-col`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    {p.tag && <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.popular ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{p.tag}</span>}
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold">{p.price}</span>
                    {p.sub && <span className="text-xs text-muted-foreground">{p.sub}</span>}
                  </div>
                  <ul className="space-y-1.5 text-xs flex-1 mb-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /><span>{f}</span></li>
                    ))}
                  </ul>
                  <button disabled={p.disabled}
                    className={`w-full py-2 rounded-lg text-sm font-medium ${p.disabled ? "bg-secondary text-muted-foreground cursor-default" : p.popular ? "gradient-primary text-primary-foreground hover:opacity-90" : "glass-input hover:bg-secondary"}`}>
                    {p.cta}
                  </button>
                </div>
              ))}
            </div>
            <div className="bg-secondary rounded-xl p-3 mt-5 text-xs text-muted-foreground">
              <p>Pay via MTN MoMo / Airtel: <strong className="text-foreground">📱 0792 315 839</strong> — then send your account email to the same number. Activation within 24h.</p>
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
      <div className="chat-prose prose max-w-none prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-pre:text-foreground prose-code:text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-blockquote:text-foreground prose-a:text-primary prose-em:text-foreground">
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
