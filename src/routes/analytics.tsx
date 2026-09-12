import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Heart, MessageCircle, Users, Sparkles, CheckCircle2, TrendingUp, Lock, ShieldCheck, LogIn, Link2, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { analyzeInstagramPerformanceAI, AIAnalysisResult } from "@/services/gemini";
import { getCurrentUser, getInstagramAccount, unlinkInstagramAccount, UserSession, InstagramAccountItem } from "@/lib/supabase";
import { AuthModal } from "@/components/auth-modal";
import { Instagram2FAModal } from "@/components/instagram-2fa-modal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Instagram Analytics & AI Analysis — Sparky" },
      { name: "description", content: "Analisis performa Instagram & pola rekomendasi konten otomatis dari AI." },
      { property: "og:title", content: "Instagram Analytics — Sparky" },
    ],
  }),
  component: AnalyticsPage,
});

export function AnalyticsPage() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [igAccount, setIgAccount] = useState<InstagramAccountItem | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [open2FAModal, setOpen2FAModal] = useState(false);

  const checkUserStateAndAccount = async () => {
    setLoading(true);
    try {
      const u = await getCurrentUser();
      setCurrentUser(u);

      if (u) {
        const acc = await getInstagramAccount(u.id);
        setIgAccount(acc);
      } else {
        setIgAccount(null);
      }
    } catch (e) {
      console.error("Error loading IG account:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserStateAndAccount();

    const handleAuthChange = () => {
      checkUserStateAndAccount();
    };

    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, []);

  useEffect(() => {
    if (igAccount?.is_verified) {
      analyzeInstagramPerformanceAI().then((res) => {
        setAnalysis(res);
      });
    }
  }, [igAccount]);

  const handleUnlink = async () => {
    if (!currentUser) return;
    if (confirm("Apakah Anda yakin ingin melepas tautan akun Instagram ini?")) {
      await unlinkInstagramAccount(currentUser.id);
      setIgAccount(null);
    }
  };

  const metrics = [
    ["Followers", igAccount ? `${(igAccount.followers_count / 1000).toFixed(1)}K` : "0", "+8.4%"],
    ["Accounts reached", igAccount ? igAccount.reach_30d : "0", "+12.1%"],
    ["Engagement rate", igAccount ? igAccount.engagement_rate : "0%", "+0.9%"],
    ["Profile visits", "12.4K", "+6.3%"],
  ];

  const barHeights = ["h-[38px]", "h-[52px]", "h-[44px]", "h-[66px]", "h-[81px]", "h-[56px]", "h-[42px]"];

  // Lock State 1: User Not Logged In
  if (!currentUser && !loading) {
    return (
      <main className="page-wrap pb-12">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Performance & AI Analysis</p>
            <h1>Analisis Performa Instagram</h1>
            <p>Menganalisis pola konten yang paling disukai audiens dan memberikan saran aksi otomatis.</p>
          </div>
        </header>

        <section className="mx-auto my-8 max-w-xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-background to-background p-8 text-center shadow-xl backdrop-blur-md">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Lock className="size-8" />
          </div>

          <h2 className="text-xl font-bold text-foreground">Analisis Instagram Terkunci</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
            Silakan masuk ke akun Anda terlebih dahulu, kemudian lakukan verifikasi 2-langkah akun Instagram untuk membaca statistik & rekomendasi strategi AI secara otomatis.
          </p>

          <div className="mt-6 flex items-center justify-center">
            <Button
              onClick={() => setOpenAuthModal(true)}
              className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition-transform hover:scale-105"
            >
              <LogIn className="mr-2 size-4" /> Masuk / Daftar Akun
            </Button>
          </div>
        </section>

        <AuthModal
          isOpen={openAuthModal}
          onClose={() => setOpenAuthModal(false)}
          onSuccess={(u) => {
            setCurrentUser(u);
            checkUserStateAndAccount();
          }}
        />
      </main>
    );
  }

  // Lock State 2: User Logged In, but Instagram NOT Verified 2FA
  if (currentUser && (!igAccount || !igAccount.is_verified) && !loading) {
    return (
      <main className="page-wrap pb-12">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Performance & AI Analysis</p>
            <h1>Analisis Performa Instagram</h1>
            <p>Menganalisis pola konten yang paling disukai audiens dan memberikan saran aksi otomatis.</p>
          </div>
        </header>

        <section className="mx-auto my-8 max-w-xl overflow-hidden rounded-3xl border border-pink-500/20 bg-gradient-to-b from-pink-500/10 via-background to-background p-8 text-center shadow-xl backdrop-blur-md">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 text-white shadow-md">
            <Link2 className="size-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-[11px] font-bold text-pink-600 mb-3">
            <ShieldCheck className="size-3.5" /> Diperlukan Verifikasi 2 Langkah
          </div>

          <h2 className="text-xl font-bold text-foreground">Tautkan Akun Instagram Terverifikasi</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
            Untuk mengakses analytics real-time dan saran strategi AI, Anda perlu menghubungkan akun asli Instagram melalui proses otentikasi aman Meta & Kode Keamanan 2-FA.
          </p>

          <div className="mt-6 flex items-center justify-center">
            <Button
              onClick={() => setOpen2FAModal(true)}
              className="rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
            >
              <ShieldCheck className="mr-2 size-4" /> Tautkan Akun (Verifikasi 2 Langkah)
            </Button>
          </div>
        </section>

        {currentUser && (
          <Instagram2FAModal
            isOpen={open2FAModal}
            userId={currentUser.id}
            onClose={() => setOpen2FAModal(false)}
            onSuccess={(acc) => {
              setIgAccount(acc);
            }}
          />
        )}
      </main>
    );
  }

  // Active Unlocked State with Verified 2FA Account
  return (
    <main className="page-wrap pb-12">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Performance & AI Analysis</p>
          <h1>Analisis Performa & Rekomendasi Strategi</h1>
          <p>Menganalisis pola konten yang paling disukai audiens dan memberikan saran aksi otomatis.</p>
        </div>
        <span className="tiny-pill">30 Hari Terakhir</span>
      </header>

      {/* Account Info Panel */}
      {igAccount && (
        <section className="panel mb-5 flex flex-wrap items-center gap-4 border-pink-500/20 bg-gradient-to-r from-pink-500/5 via-background to-purple-500/5">
          <div className="relative">
            <img
              src={igAccount.profile_pic_url}
              alt={igAccount.ig_username}
              className="size-14 rounded-full border-2 border-pink-500 object-cover shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-[10px] text-white font-bold" title="Terverifikasi 2FA">
              ✓
            </span>
          </div>

          <div className="mr-auto">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-foreground">@{igAccount.ig_username}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                <ShieldCheck className="size-3" /> Verifikasi 2FA Aktif
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {igAccount.full_name} · Terhubung via Meta Graph API (2-Step Auth)
            </p>
          </div>

          <div className="flex items-center gap-6 text-center">
            <div>
              <strong className="block text-sm font-bold text-foreground">{igAccount.posts_count}</strong>
              <span className="text-xs text-muted-foreground">Posts</span>
            </div>
            <div>
              <strong className="block text-sm font-bold text-foreground">{(igAccount.followers_count / 1000).toFixed(1)}K</strong>
              <span className="text-xs text-muted-foreground">Followers</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlink}
              className="h-8 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/10"
              title="Lepas tautan akun"
            >
              <Unlink className="mr-1 size-3" /> Lepas Tautan
            </Button>
          </div>
        </section>
      )}

      {/* Metrics Grid */}
      <section className="metric-grid mb-5">
        {metrics.map(([label, value, growth]) => (
          <div className="metric-card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
            <span>
              <ArrowUpRight className="mr-1 inline size-3" />
              {growth}
            </span>
          </div>
        ))}
      </section>

      {/* AI Analysis Module */}
      {analysis && (
        <section className="panel mb-6 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
            <Sparkles className="size-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Modul Analisis AI (Pola & Rekomendasi Konten)</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <span className="text-xs font-semibold text-primary flex items-center">
                <TrendingUp className="mr-1 size-3.5" /> Format Berperforma Tertinggi
              </span>
              <p className="text-sm font-bold text-foreground">{analysis.topPerformingFormat}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{analysis.audienceInsight}</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <span className="text-xs font-semibold text-primary flex items-center">
                <Sparkles className="mr-1 size-3.5" /> Rekomendasi Strategi Berikutnya
              </span>
              <p className="text-xs text-foreground leading-relaxed">{analysis.recommendedStrategy}</p>
              <div className="space-y-1.5 pt-2 border-t border-border mt-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Aksi Yang Disarankan:</span>
                {analysis.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recent Posts & Audience Activity */}
      <section className="grid gap-5 lg:grid-cols-[1fr_.65fr]">
        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="section-label mb-1">Recent posts</p>
              <h2>Performance breakdown</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Format</th>
                  <th>Reach</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["A week in the studio", "Reel", "42.8K", "7.2%"],
                  ["What clients actually need", "Carousel", "31.4K", "6.8%"],
                  ["September moodboard", "Carousel", "24.1K", "5.4%"],
                  ["Friday desk reset", "Reel", "18.7K", "4.9%"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={cell} className={i === 0 ? "font-semibold" : ""}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel">
          <p className="section-label">Audience activity</p>
          <h2 className="mt-1">Waktu posting paling optimal</h2>
          <div className="mt-8 flex h-40 items-end gap-2">
            {barHeights.map((height, index) => (
              <div key={height} className="flex flex-1 flex-col items-center gap-2">
                <div className={`w-full rounded-t-sm bg-primary/20 ${height}`}>
                  <div className={index === 4 ? "h-full rounded-t-sm bg-primary" : "h-full rounded-t-sm bg-primary/35"} />
                </div>
                <span className="text-[10px] text-muted-foreground">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg bg-soft-purple p-4">
            <p className="text-xs font-semibold text-primary">Jumat · 18:00 WIB</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Audiens kamu 2.4× lebih aktif pada waktu ini dibanding rata-rata.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-xs text-muted-foreground">
            <span>
              <Users className="mr-1 inline size-3" />
              71% followers
            </span>
            <span>
              <Heart className="mr-1 inline size-3" />
              8.2K likes
            </span>
            <span>
              <MessageCircle className="mr-1 inline size-3" />
              864 comments
            </span>
          </div>
        </aside>
      </section>
    </main>
  );
}