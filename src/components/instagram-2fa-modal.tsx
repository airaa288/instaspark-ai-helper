import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Lock, Smartphone, RefreshCw, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { linkInstagramAccount2FA, InstagramAccountItem } from "@/lib/supabase";

interface Instagram2FAModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: (account: InstagramAccountItem) => void;
}

export function Instagram2FAModal({ isOpen, userId, onClose, onSuccess }: Instagram2FAModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [igUsername, setIgUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const handleStage1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!igUsername || !password) {
      setErrorMsg("Mohon masukkan Username Instagram & Kata Sandi.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setTimer(60);
    }, 900);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto move focus to next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleStage2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      setErrorMsg("Mohon masukkan 6 digit kode verifikasi dengan lengkap.");
      return;
    }

    setLoading(true);
    try {
      const linked = await linkInstagramAccount2FA(userId, igUsername);
      setTimeout(() => {
        setLoading(false);
        onSuccess(linked);
        onClose();
        // Reset state
        setStep(1);
        setIgUsername("");
        setPassword("");
        setOtp(["", "", "", "", "", ""]);
      }, 1200);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg("Verifikasi 2-Langkah gagal. Silakan periksa kembali kode keamanan Anda.");
    }
  };

  const resendCode = () => {
    setTimer(60);
    setErrorMsg(null);
    setOtp(["", "", "", "", "", ""]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/20 bg-background shadow-2xl transition-all">
        {/* Header decoration Instagram Meta style */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-5 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-white/20 backdrop-blur-md">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Meta Authentication</span>
              <h2 className="text-lg font-bold leading-tight">Verifikasi 2 Langkah Instagram</h2>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Progress Indicator */}
          <div className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className={`flex items-center gap-1 ${step === 1 ? "text-primary font-bold" : "text-emerald-600"}`}>
              {step > 1 ? <CheckCircle2 className="size-3.5" /> : "1."} Kredensial Meta
            </span>
            <span className="text-border">—</span>
            <span className={step === 2 ? "text-primary font-bold" : "text-muted-foreground opacity-60"}>
              2. Kode 2FA
            </span>
          </div>

          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 ? (
            /* Stage 1: Credentials Form */
            <form onSubmit={handleStage1Submit} className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground leading-relaxed">
                <p className="font-semibold text-primary mb-0.5">Tautkan Akun Instagram Asli</p>
                <p className="text-muted-foreground">
                  Masukkan nama pengguna dan kata sandi akun Instagram Anda untuk memulai otentikasi 2-Langkah Meta.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Username Instagram / Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-muted-foreground text-xs font-bold">@</span>
                  <input
                    type="text"
                    placeholder="namaperusahaan"
                    value={igUsername}
                    onChange={(e) => setIgUsername(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background pl-8 pr-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Lock className="size-3 text-muted-foreground" /> Kata Sandi Instagram
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
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Menghubungkan ke Server Meta...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjutkan ke Verifikasi 2-Langkah</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Stage 2: 2FA OTP Code */
            <form onSubmit={handleStage2Submit} className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-foreground">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 mb-1">
                  <Smartphone className="size-4" /> Masukkan Kode Keamanan (2FA)
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Kami telah mengirimkan 6-digit kode verifikasi ke aplikasi Authenticator atau SMS akun{" "}
                  <strong className="text-foreground">@{igUsername || "instagram"}</strong>.
                </p>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="py-2">
                <label className="block text-center text-xs font-semibold text-muted-foreground mb-3">
                  Kode 6-Digit Otentikasi
                </label>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="size-11 rounded-xl border-2 border-input bg-background text-center text-lg font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              {/* Timer & Resend */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {timer > 0 ? (
                    <>Kirim ulang kode dalam <strong className="text-foreground">{timer} detik</strong></>
                  ) : (
                    "Kode kadaluarsa"
                  )}
                </span>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={timer > 0}
                  className="flex items-center gap-1 text-primary hover:underline disabled:opacity-40 disabled:no-underline font-semibold"
                >
                  <RefreshCw className="size-3" /> Kirim Ulang
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Memverifikasi Kode & Menautkan Akun...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Verifikasi 2FA & Buka Analytics</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
