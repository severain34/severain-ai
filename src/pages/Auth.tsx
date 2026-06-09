import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Mail, Lock, User, Globe, AlertCircle, KeyRound, ArrowLeft,
  Smartphone, Monitor, Tablet, Laptop, Watch, Tv, Download, Apple,
  Shield, Zap, Brain, Code2, MessageSquare, Mic, Image as ImageIcon,
  Gamepad2, FileText, Check, ChevronRight, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LANGUAGES, tr } from "@/lib/i18n";

const QUOTES = [
  "“Any sufficiently advanced technology is indistinguishable from magic.” — Arthur C. Clarke",
  "“The best way to predict the future is to invent it.” — Alan Kay",
  "“The future belongs to those who build it.”",
  "“Severain AI: think faster, build bigger, learn deeper.”",
  "“Code is the closest thing we have to a superpower.”",
  "“Imagination is more important than knowledge.” — Einstein",
];

const FEATURES = [
  { icon: Brain, title: "Expert Reasoning", desc: "Deep technical analysis & advanced problem solving." },
  { icon: Code2, title: "Build Full Apps", desc: "Generate fullstack web apps, video games & APIs." },
  { icon: Mic, title: "Voice Input", desc: "Talk to Severain in 10+ languages." },
  { icon: FileText, title: "File Analysis", desc: "Upload code, docs, JSON, CSV & more." },
  { icon: ImageIcon, title: "Vision Ready", desc: "Describe, edit & understand images." },
  { icon: Gamepad2, title: "Game Studio", desc: "Build 2D & 3D browser games from prompts." },
];

const DEVICES = [
  { icon: Smartphone, name: "iPhone & Android" },
  { icon: Tablet, name: "iPad & Tablets" },
  { icon: Laptop, name: "MacBook & Windows" },
  { icon: Monitor, name: "Desktop" },
  { icon: Watch, name: "Smartwatch" },
  { icon: Tv, name: "Smart TV / Web" },
];

type Step = "form" | "verify";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<Step>("form");
  const [lang, setLang] = useState(localStorage.getItem("severain_lang") || "en");
  const [langSearch, setLangSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { localStorage.setItem("severain_lang", lang); }, [lang]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate("/"); });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success(tr(lang, "verify_sent"));
        setStep("verify");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw error;
      toast.success("Email verified!");
      navigate("/");
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Code resent.");
    } catch (err) { toast.error((err as Error).message); }
    finally { setLoading(false); }
  };

  const filteredLangs = LANGUAGES.filter((l) =>
    !langSearch || l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.code.includes(langSearch.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated background blobs */}
      <div className="blob w-[500px] h-[500px] bg-primary/40 -top-32 -left-32 animate-pulse-glow" />
      <div className="blob w-[600px] h-[600px] bg-accent/30 top-1/2 -right-40" />
      <div className="blob w-[400px] h-[400px] bg-purple-500/30 bottom-0 left-1/3" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(210_100%_56%/0.15),transparent_60%)]" />

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between p-4 md:px-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold font-heading">Severain AI</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="px-3 py-1.5 rounded-lg glass text-sm hover:bg-secondary/60 transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-accent" /> Try without login
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pb-12 grid lg:grid-cols-5 gap-8 items-start">
        {/* Left: marketing */}
        <div className="lg:col-span-3 space-y-8 pt-4">
          <div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full glass text-xs text-accent mb-4">
              <Shield className="w-3 h-3" /> Powered by Lovable AI · Gemini & GPT-5
            </span>
            <h1 className="text-4xl md:text-6xl font-bold font-heading leading-tight mb-3">
              The AI that <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">does anything</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Severain AI codes apps, builds video games, analyzes files, talks in 10+ languages,
              and you can use it <strong className="text-foreground">before signing in</strong>.
            </p>
            <div className="mt-4 min-h-[28px]">
              <p key={quoteIdx} className="text-sm italic text-foreground/70 animate-slide-up">
                {QUOTES[quoteIdx]}
              </p>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-4 hover:scale-[1.02] transition">
                <f.icon className="w-5 h-5 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Devices */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" /> Works on every device
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {DEVICES.map((d) => (
                <div key={d.name} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary/40">
                  <d.icon className="w-6 h-6 text-foreground/80" />
                  <span className="text-[10px] text-muted-foreground text-center">{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Download */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-accent" /> Get the app
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <a className="flex items-center gap-2 p-3 rounded-xl bg-secondary/60 hover:bg-secondary transition">
                <Apple className="w-6 h-6" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Download on the</p>
                  <p className="text-sm font-semibold">App Store</p>
                </div>
              </a>
              <a className="flex items-center gap-2 p-3 rounded-xl bg-secondary/60 hover:bg-secondary transition">
                <Smartphone className="w-6 h-6" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Get it on</p>
                  <p className="text-sm font-semibold">Google Play</p>
                </div>
              </a>
              <a className="flex items-center gap-2 p-3 rounded-xl bg-secondary/60 hover:bg-secondary transition">
                <Monitor className="w-6 h-6" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Open in</p>
                  <p className="text-sm font-semibold">Browser</p>
                </div>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Web app works offline-first. Mobile apps coming soon — install as PWA from your browser menu.
            </p>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-accent" /> End-to-end encrypted</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-accent" /> No ads</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-accent" /> GDPR ready</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-accent" /> Free tier forever</span>
          </div>
        </div>

        {/* Right: auth card */}
        <div className="lg:col-span-2 lg:sticky lg:top-4">
          <div className="glass rounded-3xl p-6 md:p-7">
            {/* Language picker with search */}
            <div className="mb-5">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  placeholder="Search language..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg glass-input text-xs outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {filteredLangs.map((l) => (
                  <button key={l.code} onClick={() => setLang(l.code)}
                    className={`px-2.5 py-1 rounded-full text-[11px] transition ${
                      lang === l.code ? "gradient-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                    }`}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            {step === "form" && (
              <>
                <div className="flex gap-1 p-1 bg-secondary/60 rounded-lg mb-5">
                  {(["signin", "signup"] as const).map((m) => (
                    <button key={m} onClick={() => { setMode(m); setError(""); }}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                        mode === m ? "bg-background text-foreground shadow" : "text-muted-foreground"
                      }`}>
                      {tr(lang, m)}
                    </button>
                  ))}
                </div>

                <h2 className="text-2xl font-bold font-heading mb-1">
                  {mode === "signin" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {mode === "signin" ? "Sign in to sync chats across devices." : "Join thousands building with Severain AI."}
                </p>

                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-3">
                  {mode === "signup" && (
                    <Field icon={User} value={name} onChange={setName} placeholder={tr(lang, "name")} />
                  )}
                  <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder={tr(lang, "email")} />
                  <Field icon={Lock} type="password" value={password} onChange={setPassword} placeholder={tr(lang, "password")} />

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? "..." : tr(lang, mode)}
                    {!loading && <ChevronRight className="w-4 h-4" />}
                  </button>
                </form>

                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    We'll send a 6-digit verification code to your email.
                  </p>
                )}

                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
                </div>
                <button onClick={() => navigate("/")}
                  className="w-full py-2.5 rounded-lg glass-input hover:bg-secondary/60 transition text-sm font-medium flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 text-accent" /> Continue as guest
                </button>
              </>
            )}

            {step === "verify" && (
              <>
                <button onClick={() => setStep("form")} className="text-xs text-muted-foreground mb-4 flex items-center gap-1 hover:text-foreground">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <div className="w-12 h-12 rounded-2xl gradient-primary glow-primary flex items-center justify-center mb-3">
                  <KeyRound className="w-6 h-6 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold font-heading mb-1">Verify your email</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. Enter it below.
                </p>

                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <form onSubmit={verifyCode} className="space-y-3">
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full py-4 rounded-lg glass-input text-center text-2xl font-bold tracking-[0.6em] outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button type="submit" disabled={loading || otp.length !== 6}
                    className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50">
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>
                </form>

                <button onClick={resend} disabled={loading}
                  className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground">
                  Didn't get it? Resend code
                </button>
              </>
            )}

            <p className="text-[10px] text-muted-foreground text-center mt-5">
              By continuing you agree to our Terms & Privacy Policy.
            </p>
          </div>

          <div className="mt-4 glass rounded-2xl p-4 text-xs text-muted-foreground flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">No account needed</strong> — Severain AI is fully usable as a guest.
              Sign up to save chats, sync across devices, and unlock Pro features.
            </p>
          </div>
        </div>
      </div>

      {/* Footer with many links — visible before login */}
      <footer className="relative z-10 mt-12 border-t border-border bg-background/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold font-heading text-base">Severain AI</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
              Think faster, build bigger, learn deeper. Severain AI is your all-in-one assistant for code, writing, images, learning and more — created by Senganeza Severain.
            </p>
            <p className="text-[10px] text-muted-foreground mt-4">© {new Date().getFullYear()} Severain AI. All rights reserved.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-foreground">Product</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Features</a></li>
              <li><a href="#" className="hover:text-foreground">Pricing</a></li>
              <li><a href="#" className="hover:text-foreground">Image generation</a></li>
              <li><a href="#" className="hover:text-foreground">Prompt library</a></li>
              <li><a href="#" className="hover:text-foreground">VS Code editor</a></li>
              <li><a href="#" className="hover:text-foreground">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-foreground">Resources</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground">Tutorials</a></li>
              <li><a href="#" className="hover:text-foreground">Blog</a></li>
              <li><a href="#" className="hover:text-foreground">Community</a></li>
              <li><a href="#" className="hover:text-foreground">Help center</a></li>
              <li><a href="#" className="hover:text-foreground">Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-foreground">Company</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">About</a></li>
              <li><a href="#" className="hover:text-foreground">Careers</a></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
              <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Made with ❤️ by Senganeza Severain · MTN: 0792 315 839</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">Twitter / X</a>
              <a href="#" className="hover:text-foreground">YouTube</a>
              <a href="#" className="hover:text-foreground">GitHub</a>
              <a href="#" className="hover:text-foreground">LinkedIn</a>
              <a href="#" className="hover:text-foreground">TikTok</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Field({ icon: Icon, type = "text", value, onChange, placeholder }: any) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full pl-10 pr-3 py-3 rounded-lg glass-input outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
