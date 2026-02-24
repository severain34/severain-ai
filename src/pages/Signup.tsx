import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Zap, Mail, Lock, User, AlertCircle } from "lucide-react";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const success = signup(name, email, password);
    if (success) {
      navigate("/dashboard");
    } else {
      setError("An account with this email already exists");
    }
  };

  const fields = [
    { label: "Full Name", icon: User, type: "text", value: name, setter: setName, placeholder: "John Doe" },
    { label: "Email", icon: Mail, type: "email", value: email, setter: setEmail, placeholder: "you@example.com" },
    { label: "Password", icon: Lock, type: "password", value: password, setter: setPassword, placeholder: "••••••••" },
    { label: "Confirm Password", icon: Lock, type: "password", value: confirmPassword, setter: setConfirmPassword, placeholder: "••••••••" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary glow-primary mb-4">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-heading text-foreground">Cash Power</h1>
          <p className="text-muted-foreground mt-2">Create your account</p>
        </div>

        <div className="gradient-card rounded-2xl border border-border p-8">
          <h2 className="text-xl font-semibold font-heading text-foreground mb-6">Sign Up</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.label}>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{f.label}</label>
                <div className="relative">
                  <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder={f.placeholder}
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity glow-primary"
            >
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
