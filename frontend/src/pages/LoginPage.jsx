import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, User } from "lucide-react";

export default function LoginPage({ api, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${api}/auth/login`, { username, password });
      onLogin(res.data.token);
      toast.success("Welcome back, crew!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-sm">
        {/* Logo Area */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="font-heading font-black text-2xl tracking-tighter italic text-white" data-testid="logo-365">
              365 RUN CLUB
            </span>
            <span className="text-[#525252] text-lg">&times;</span>
            <span className="font-heading font-black text-2xl tracking-tighter text-white" data-testid="logo-puma">
              PUMA
            </span>
            <span className="text-[#525252] text-lg">&times;</span>
            <span className="font-bold text-lg tracking-widest text-[#A3A9B2]" data-testid="logo-xtraliving">
              XTRALIVING
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-5xl sm:text-6xl tracking-tight text-white mb-2" data-testid="event-title">
            trio <span className="text-[#CCFF00]">TAG</span>
          </h1>
          <p className="text-[#A3A9B2] text-sm tracking-widest uppercase">
            Three Minds &middot; One Mission
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525252]" />
            <Input
              data-testid="login-username-input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 h-12 bg-[#121212] border-[#27272A] text-white placeholder:text-[#525252] rounded-sm focus:border-[#CCFF00] focus:ring-[#CCFF00]"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#525252]" />
            <Input
              data-testid="login-password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 bg-[#121212] border-[#27272A] text-white placeholder:text-[#525252] rounded-sm focus:border-[#CCFF00] focus:ring-[#CCFF00]"
            />
          </div>
          <Button
            data-testid="login-submit-button"
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-12 bg-[#CCFF00] text-black font-bold uppercase tracking-wider rounded-sm hover:bg-[#b8e600] transition-all active:scale-[0.98] btn-skew"
          >
            <span>{loading ? "Authenticating..." : "Enter Command Center"}</span>
          </Button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/leaderboard"
            className="text-[#525252] hover:text-[#CCFF00] text-xs uppercase tracking-widest transition-colors"
            data-testid="leaderboard-link"
          >
            View Live Leaderboard &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
