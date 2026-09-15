import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Image as ImageIcon, Video, Download, Plus, Sparkles, RefreshCw, Lock, LogIn, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getUserMediaLibrary, UserMediaItem, UserSession } from "@/lib/supabase";
import { triggerDirectDownload, create8SecondReelBlobUrl } from "@/services/media-services";
import { AuthModal } from "@/components/auth-modal";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Perpustakaan Media AI — Sparky" },
      { name: "description", content: "Koleksi foto visual HD (Nano Banana) & video reel 8s (Veo 3.1) hasil buatan Sparky AI." },
      { property: "og:title", content: "Perpustakaan Media AI — Sparky" },
    ],
  }),
  component: LibraryPage,
});

export function LibraryPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState<UserMediaItem[]>([]);
  const [mediaFilter, setMediaFilter] = useState<"Semua" | "image" | "video">("Semua");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user) {
        const media = await getUserMediaLibrary(user.id);
        setMediaItems(media);
      }
    } catch (e) {
      console.error("Error loading library:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleAuth = () => loadData();
    window.addEventListener("auth-changed", handleAuth);
    return () => window.removeEventListener("auth-changed", handleAuth);
  }, []);

  const filteredMedia = mediaItems.filter(
    (m) => mediaFilter === "Semua" || m.media_type === mediaFilter
  );

  return (
    <main className="page-wrap pb-16">
      {/* Header Title Section */}
      <header className="page-heading">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
            <ImageIcon className="size-4" /> Dedicated Media Library
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Perpustakaan Media AI</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Koleksi lengkap Foto Visual HD (Nano Banana) & Video Reel 8s (Veo 3.1) yang disetujui dari Sparky AI Agent.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="rounded-full text-xs font-semibold">
            <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: "/" })}
            className="rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
          >
            <Sparkles className="mr-1 size-3.5 text-yellow-300" /> Buat Media AI Baru
          </Button>
        </div>
      </header>

      {/* Guest Lock Banner */}
      {!currentUser && (
        <div className="mb-8 rounded-3xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-slate-900/50 p-6 sm:p-8 text-center space-y-4 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
            <Lock className="size-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-foreground">Masuk untuk Mengakses Perpustakaan Media</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Foto dan Video Reel buatan AI tersimpan aman di akun Supabase Anda. Masuk sekarang untuk melihat galeri media pribadi Anda.
            </p>
          </div>
          <Button onClick={() => setOpenAuthModal(true)} size="sm" className="rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md">
            <LogIn className="mr-1.5 size-4" /> Masuk Akun
          </Button>
          <AuthModal isOpen={openAuthModal} onClose={() => setOpenAuthModal(false)} />
        </div>
      )}

      {currentUser && (
        <>
          {/* Summary Stats & Filter Pills */}
          <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-white/80 dark:bg-slate-900/80 p-3 shadow-xs backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Filter className="size-3.5 text-blue-600" /> Filter Format:
              </span>
              <div className="flex items-center gap-1.5">
                {(["Semua", "image", "video"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setMediaFilter(fmt)}
                    className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                      mediaFilter === fmt
                        ? "bg-blue-600 text-white font-bold shadow-xs"
                        : "bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                    }`}
                  >
                    {fmt === "Semua" ? "Semua Media" : fmt === "image" ? "🖼️ Foto Visual HD" : "📹 Video Reel 8s"}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Menampilkan {filteredMedia.length} item tersimpan
            </span>
          </section>

          {/* Empty State vs Media Grid */}
          {filteredMedia.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl border-2 border-dashed border-border bg-muted/20 space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <ImageIcon className="size-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Belum Ada Media di Perpustakaan</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Minta Sparky AI Agent di halaman AI Agent untuk membuatkan Foto HD atau Video Reel. Lalu klik tombol <strong>✅ ACC & Jadwalkan</strong> untuk menyimpannya di sini!
                </p>
              </div>
              <Button onClick={() => navigate({ to: "/" })} size="sm" className="rounded-xl font-bold bg-blue-600 text-white shadow-md">
                <Sparkles className="mr-1.5 size-4 text-yellow-300" /> Buka Sparky AI Agent
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <div key={item.id} className="group overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
                  {/* Media Container */}
                  <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden">
                    {item.media_type === "video" ? (
                      <div className="relative w-full h-full">
                        <img src={item.media_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Video className="size-9 text-white drop-shadow-md animate-pulse" />
                        </div>
                        <span className="absolute top-2 right-2 bg-blue-600 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                          Veo 3.1 8s
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <img src={item.media_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                          Nano Banana HD
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info & Actions */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{item.prompt || item.caption || "Media disetujui dari Sparky AI"}</p>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingId === item.id}
                        onClick={async () => {
                          setDownloadingId(item.id);
                          try {
                            if (item.media_type === "video") {
                              const vUrl = await create8SecondReelBlobUrl(item.media_url, item.title);
                              triggerDirectDownload(vUrl, "veo-3.1-reel-8s.mp4");
                            } else {
                              triggerDirectDownload(item.media_url, "nano-banana-image.jpg");
                            }
                          } finally {
                            setDownloadingId(null);
                          }
                        }}
                        className="h-8 text-[11px] font-bold rounded-xl border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                      >
                        <Download className={`mr-1 size-3.5 ${downloadingId === item.id ? "animate-bounce" : ""}`} />
                        {downloadingId === item.id ? "Memproses..." : "Download"}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => navigate({ to: "/planner" })}
                        className="h-8 text-[11px] font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
                      >
                        <Plus className="mr-1 size-3.5" /> Jadwalkan
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
