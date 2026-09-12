import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Bot, CalendarDays, LogOut, Newspaper, UserRound, X, Sparkles, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentUser, signOutUser, UserSession } from "@/lib/supabase";
import { AuthModal } from "@/components/auth-modal";

const items = [
  { label: "AI Agent", to: "/" as const, icon: Bot },
  { label: "News", to: "/news" as const, icon: Newspaper },
  { label: "Content Planner", to: "/planner" as const, icon: CalendarDays },
  { label: "Analytics", to: "/analytics" as const, icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"signin" | "signup">("signin");
  
  const router = useRouterState();
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const loadUserSession = async () => {
    const user = await getCurrentUser();
    setSession(user);
  };

  useEffect(() => {
    loadUserSession();

    const handleAuthChanged = () => {
      loadUserSession();
    };

    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, []);

  useEffect(() => {
    const idx = items.findIndex((item) => {
      if (item.to === "/") return router.location.pathname === "/";
      return router.location.pathname.startsWith(item.to);
    });
    const el = linkRefs.current[idx];
    if (el) {
      setPillStyle({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
    } else {
      setPillStyle((s) => ({ ...s, opacity: 0 }));
    }
  }, [router.location.pathname]);

  const handleLogout = async () => {
    await signOutUser();
    setSession(null);
    setOpenProfileModal(false);
    window.dispatchEvent(new Event("auth-changed"));
  };

  const handleAuthSuccess = (user: UserSession) => {
    setSession(user);
    window.dispatchEvent(new Event("auth-changed"));
  };

  const initials = (session?.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-4">
        <div className="grid w-full max-w-2xl grid-cols-[auto_1fr] items-center gap-2 rounded-full border border-border bg-background/90 p-1.5 shadow-[0_12px_40px_color-mix(in_oklab,var(--foreground)_9%,transparent)] backdrop-blur-xl">
          <button
            type="button"
            aria-label={session ? "Open profile" : "Log in"}
            onClick={() => {
              if (session) {
                setOpenProfileModal(true);
              } else {
                setAuthInitialTab("signin");
                setOpenAuthModal(true);
              }
            }}
            className="group flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-accent/60"
          >
            {session ? (
              <>
                <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials}</span>
                <span className="max-w-28 truncate pr-2 text-sm font-semibold text-foreground">{session.name}</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary group-hover:bg-primary/20 transition-colors">
                <UserRound className="size-3.5" />
                <span>Masuk / Daftar</span>
              </span>
            )}
          </button>

          <nav aria-label="Primary" className="relative flex min-w-0 items-center gap-1 justify-self-end">
            <span
              aria-hidden="true"
              className="nav-pill"
              style={{ left: pillStyle.left, width: pillStyle.width, opacity: pillStyle.opacity }}
            />
            {items.map(({ label, to, icon: Icon }, i) => (
              <Link
                key={to}
                ref={(el) => { linkRefs.current[i] = el; }}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="nav-link"
                activeProps={{ className: "nav-link nav-link-active" }}
              >
                <Icon /><span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* User Profile Modal when logged in */}
      {openProfileModal && session && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/20 px-4 pt-24 backdrop-blur-sm" onClick={() => setOpenProfileModal(false)}>
          <div role="dialog" aria-label="Profile" className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Profil Pengguna
              </h2>
              <button type="button" aria-label="Close" onClick={() => setOpenProfileModal(false)} className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"><X className="size-4" /></button>
            </div>

            <div>
              <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 p-3.5">
                <span className="grid size-12 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{initials}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{session.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{session.email}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                    <ShieldCheck className="size-3" /> Supabase DB Session
                  </span>
                </div>
              </div>
              <button type="button" onClick={handleLogout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20">
                <LogOut className="size-4" /> Keluar (Log out)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={openAuthModal}
        onClose={() => setOpenAuthModal(false)}
        onSuccess={handleAuthSuccess}
        initialTab={authInitialTab}
      />

      {children}
    </div>
  );
}
