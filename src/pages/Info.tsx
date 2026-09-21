import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

const CONTENT: Record<string, { title: string; body: JSX.Element }> = {
  features: {
    title: "Features",
    body: (
      <>
        <p>Severain AI is your all-in-one assistant — built by Senganeza Severain.</p>
        <ul className="list-disc pl-6 space-y-1 mt-3">
          <li>Smart chat with Plan / Build / Prompt modes</li>
          <li>Photo uploads and vision understanding</li>
          <li>File analysis (code, JSON, CSV, docs)</li>
          <li>Voice read-aloud and 10+ languages</li>
          <li>Open editor link to launch VS Code directly</li>
          <li>Admin panel to train your own AI behavior</li>
        </ul>
      </>
    ),
  },
  pricing: {
    title: "Pricing",
    body: (
      <>
        <p>Free forever for basic use. Upgrade for more power:</p>
        <ul className="list-disc pl-6 space-y-1 mt-3">
          <li><strong>Free</strong> — Standard model, limited daily messages.</li>
          <li><strong>Plus — 5,000 RWF / month</strong> — Smarter models, unlimited messages and larger uploads.</li>
          <li><strong>Pro — 45,000 RWF / year</strong> — Everything in Plus + highest priority and largest uploads.</li>
        </ul>
        <p className="mt-3">Pay via MTN MoMo / Airtel: <strong>0792 315 839</strong>.</p>
      </>
    ),
  },
  "prompt-library": {
    title: "Prompt library",
    body: <p>Use the <strong>Prompt helper</strong> in the header or the <strong>Plan / Build / Prompt</strong> quick cards on the home screen to get ready-made professional prompts.</p>,
  },
  editor: {
    title: "VS Code editor",
    body: <p>Click <strong>Open editor</strong> in the chat header to launch your locally installed VS Code via the <code>vscode://</code> protocol. If you don't have it yet, download it from <a className="text-primary underline" href="https://code.visualstudio.com/download" target="_blank" rel="noreferrer">code.visualstudio.com</a>.</p>,
  },
  changelog: {
    title: "Changelog",
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>v1.4 — ChatGPT-style upgrade plans, footer pages, admin user list.</li>
        <li>v1.3 — Admin training panel, model selector, live user activity.</li>
        <li>v1.2 — Hands-free voice call, auto-speak, smart scroll.</li>
        <li>v1.1 — Plan / Build / Prompt quick actions, file attachments.</li>
        <li>v1.0 — Severain AI launch.</li>
      </ul>
    ),
  },
  docs: {
    title: "Documentation",
    body: <p>Severain AI is designed to be self-explanatory. Sign in, pick a mode (Expert / Learner / Fullstack), and chat. Use the <strong>Account settings</strong> to set your name, theme, voice and auto-speak.</p>,
  },
  tutorials: {
    title: "Tutorials",
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>How to build a full app — use <strong>Build</strong> mode and describe your idea.</li>
        <li>How to learn faster — use <strong>Learner</strong> mode for step-by-step explanations.</li>
        <li>How to write great prompts — open the <strong>Prompt helper</strong>.</li>
      </ul>
    ),
  },
  blog: {
    title: "Blog",
    body: <p>Coming soon — articles, deep dives and AI tips from the Severain team.</p>,
  },
  community: {
    title: "Community",
    body: <p>Join the Severain community on social media and share what you build. Reach out via MTN <strong>0792 315 839</strong>.</p>,
  },
  help: {
    title: "Help center",
    body: <p>Need help? Message us on MTN <strong>0792 315 839</strong> or open a chat with Severain AI itself — it can troubleshoot most issues.</p>,
  },
  status: {
    title: "Status",
    body: <p>All systems operational ✅ — chat, voice, image and admin services are live.</p>,
  },
  about: {
    title: "About",
    body: <p>Severain AI is built by <strong>Senganeza Severain</strong> to make advanced AI accessible to everyone — students, developers, entrepreneurs and curious minds.</p>,
  },
  careers: {
    title: "Careers",
    body: <p>We're growing. If you'd like to help build the future of Severain AI, get in touch via MTN <strong>0792 315 839</strong>.</p>,
  },
  contact: {
    title: "Contact",
    body: <p>MTN / WhatsApp: <strong>0792 315 839</strong><br />Or simply chat with Severain AI for instant help.</p>,
  },
  privacy: {
    title: "Privacy Policy",
    body: (
      <>
        <p>Severain AI respects your privacy. We store the minimum data needed to run the service:</p>
        <ul className="list-disc pl-6 space-y-1 mt-3">
          <li>Account info (email) for sign-in.</li>
          <li>Chat history saved on your device.</li>
          <li>Activity metadata for the admin panel.</li>
        </ul>
        <p className="mt-3">We never sell your data.</p>
      </>
    ),
  },
  terms: {
    title: "Terms of Service",
    body: <p>By using Severain AI you agree to use it lawfully, not to abuse rate limits, and to recognize that AI outputs may contain errors. Always verify important answers.</p>,
  },
  cookies: {
    title: "Cookies",
    body: <p>Severain AI uses only essential cookies and local storage to remember your session, preferences, and chats. No tracking cookies.</p>,
  },
};

export default function InfoPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const item = CONTENT[slug] || { title: "Severain AI", body: <p>Page coming soon.</p> };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob bg-primary/20 w-[40rem] h-[40rem] -top-40 -left-40" />
        <div className="blob bg-accent/15 w-[35rem] h-[35rem] -bottom-40 -right-40" />
      </div>
      <header className="relative z-10 border-b border-border glass">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold font-heading">Severain AI</span>
        </div>
      </header>
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold font-heading mb-6">{item.title}</h1>
        <div className="prose prose-invert max-w-none text-foreground leading-relaxed">
          {item.body}
        </div>
      </main>
    </div>
  );
}
