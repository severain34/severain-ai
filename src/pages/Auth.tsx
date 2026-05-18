import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, User, Globe, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LANGUAGES, tr } from "@/lib/i18n";

const QUOTES = [
  "“Any sufficiently advanced technology is indistinguishable from magic.” — Arthur C. Clarke",
  "“The future belongs to those who build it.”",
  "“Severain AI: think faster, build bigger, learn deeper.”",
  "“Code is the closest thing we have to a superpower.”",
];

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [lang, setLang] = useState(localStorage.getItem("severain_lang") || "en");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem("severain_lang", lang);
  }, [lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/");
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success(tr(lang, "verify_sent"));
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Quotes panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-accent/10 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold font-heading">Severain AI</span>
        </div>
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold font-heading mb-4">{tr(lang, "welcome")}</h1>
          <p className="text-lg text-muted-foreground mb-8">{tr(lang, "tagline")}</p>
          <div className="min-h-[60px]">
            <p key={quoteIdx} className="text-base text-foreground/80 italic animate-fade-in">
              {QUOTES[quoteIdx]}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© Severain AI · Powered by Lovable AI</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Severain AI</span>
            </div>
            <div className="ml-auto relative">
              <Globe className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-secondary border border-border text-sm outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex gap-2 p-1 bg-secondary rounded-lg mb-6">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                    mode === m ? "bg-background text-foreground shadow" : "text-muted-foreground"
                  }`}
                >
                  {tr(lang, m)}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <Field icon={User} value={name} onChange={setName} placeholder={tr(lang, "name")} />
              )}
              <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder={tr(lang, "email")} />
              <Field icon={Lock} type="password" value={password} onChange={setPassword} placeholder={tr(lang, "password")} />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "..." : tr(lang, mode)}
              </button>
            </form>

            {mode === "signup" && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                We'll send a verification code to your email to confirm your account.
              </p>
            )}
          </div>
        </div>
      </div>
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
        className="w-full pl-10 pr-3 py-3 rounded-lg bg-secondary border border-border outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
