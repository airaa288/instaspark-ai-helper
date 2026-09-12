import React, { useState } from "react";
import { Lock, Mail, User, Sparkles, X, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { signInWithEmail, signUpWithEmail, UserSession } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserSession) => void;
  initialTab?: "signin" | "signup";
}

export function AuthModal({ isOpen, onClose, onSuccess, initialTab = "signin" }: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Mohon isi email dan kata sandi.");
      return;
    }

    if (tab === "signup" && !fullName) {
      setErrorMsg("Mohon isi nama lengkap Anda.");
      return;
    }

    setLoading(true);

    try {
      if (tab === "signin") {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.user) {
          onSuccess(res.user);
          onClose();
        }
      } else {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.user) {
          onSuccess(res.user);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl transition-all">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-primary/15 via-soft-purple to-primary/10 p-6 pb-5">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Sparkles className="size-3.5" /> Sparky AI Backend
          </div>

          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {tab === "signin" ? "Selamat Datang Kembali" : "Buat Akun Sparky AI"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {tab === "signin"
              ? "Masuk ke akun Anda untuk mengelola jadwal postingan dan menyimpan riwayat obrolan Sparky AI."
              : "Daftar gratis untuk mengakses Content Planner dan Analisis Performa Instagram."}
          </p>

          {/* Tabs switch */}
          <div className="mt-4 flex rounded-xl bg-background/80 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => { setTab("signin"); setErrorMsg(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                tab === "signin"
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Masuk (Sign In)
            </button>
            <button
              type="button"
              onClick={() => { setTab("signup"); setErrorMsg(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                tab === "signup"
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daftar Baru (Sign Up)
            </button>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex flex-col gap-2 rounded-xl bg-destructive/10 p-3.5 text-xs font-medium text-destructive border border-destructive/20 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {errorMsg.replace("UNREGISTERED_EMAIL: ", "").replace("ALREADY_REGISTERED: ", "")}
                </span>
              </div>
              {errorMsg.includes("UNREGISTERED_EMAIL:") && (
                <button
                  type="button"
                  onClick={() => {
                    setTab("signup");
                    setErrorMsg(null);
                  }}
                  className="mt-1 self-start inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105"
                >
                  Buat Akun Baru Sekarang <ArrowRight className="size-3.5" />
                </button>
              )}
              {errorMsg.includes("ALREADY_REGISTERED:") && (
                <button
                  type="button"
                  onClick={() => {
                    setTab("signin");
                    setErrorMsg(null);
                  }}
                  className="mt-1 self-start inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105"
                >
                  Pindah ke Tab Masuk <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          )}

          {tab === "signup" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" /> Nama Lengkap
              </label>
              <input
                type="text"
                placeholder="misal: Alex Studio"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="size-3.5 text-muted-foreground" /> Email Address
            </label>
            <input
              type="email"
              placeholder="nama@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="size-3.5 text-muted-foreground" /> Kata Sandi
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>{tab === "signin" ? "Masuk ke Sparky AI" : "Daftar Akun Baru"}</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>

          <div className="pt-2 text-center border-t border-border/60">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Terhubung aman dengan Supabase DB Backend
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
