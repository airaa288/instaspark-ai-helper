import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Flame, RefreshCw, Globe, Search, Sparkles, Newspaper, X, ChevronDown, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchNewsByQueryAndCountry,
  fetchTrendingTopics,
  MarketingArticle,
  SUPPORTED_COUNTRIES,
  TrendingTopic
} from "@/services/news-service";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Marketing Intelligence & Global Feed — Sparky" },
      { name: "description", content: "Real-time Instagram marketing trends & industry news feed across global markets." },
      { property: "og:title", content: "Marketing Intelligence — Sparky" },
    ],
  }),
  component: NewsPage,
});

export function NewsPage() {
  const [articles, setArticles] = useState<MarketingArticle[]>([]);
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("GLOBAL");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  async function loadCountryNews(code: string = selectedCountryCode, query: string = searchQuery, forceRefresh: boolean = false) {
    setLoading(true);
    try {
      const [newsData, topicData] = await Promise.all([
        fetchNewsByQueryAndCountry(code, query, forceRefresh),
        fetchTrendingTopics()
      ]);
      setArticles(newsData);
      setTopics(topicData);
    } catch (e) {
      console.error("Failed to load news:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCountryNews(selectedCountryCode, searchQuery, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCountryCode, searchQuery]);

  function handleSelectCountry(code: string) {
    setSelectedCountryCode(code);
    setShowCountryPicker(false);
  }

  const activeCountryObj = SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountryCode) || SUPPORTED_COUNTRIES[0];

  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1);

  return (
    <main className="page-wrap pb-16">
      {/* Executive Header */}
      <header className="page-heading">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Globe className="size-3.5" /> GLOBAL MARKETING INTELLIGENCE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Real-Time Industry News & Trends</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Pantau perkembangan algoritma Instagram, strategi Reels, dan tren pemasaran digital terkini dari berbagai kawasan dunia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadCountryNews(selectedCountryCode, searchQuery, true)} disabled={loading}>
            <RefreshCw className={`mr-2 size-3.5 ${loading ? "animate-spin" : ""}`} /> Perbarui Feed
          </Button>
        </div>
      </header>

      {/* Compact Single Box Country Selector Bar */}
      <section className="mb-6 relative">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kawasan Berita:</span>

            <button
              type="button"
              className="inline-flex items-center gap-2.5 rounded-xl border border-primary/30 bg-surface-raised px-4 py-2 text-xs font-bold text-foreground shadow-sm transition hover:border-primary focus:outline-none"
              onClick={() => setShowCountryPicker(!showCountryPicker)}
            >
              <span className="text-base">{activeCountryObj.flag}</span>
              <span>{activeCountryObj.name}</span>
              <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${showCountryPicker ? "rotate-180" : ""}`} />
            </button>
          </div>

          <span className="tiny-pill text-xs">{articles.length} Berita Ditemukan</span>
        </div>

        {/* Backdrop for click outside popup */}
        {showCountryPicker && (
          <div className="fixed inset-0 z-20 bg-background/20 backdrop-blur-[1px]" onClick={() => setShowCountryPicker(false)} />
        )}

        {/* Sleek Popup Grid Dropdown for 10 Countries */}
        {showCountryPicker && (
          <div className="absolute left-0 top-12 z-30 w-full max-w-md rounded-2xl border border-border bg-surface-raised p-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Globe className="size-3.5" /> Pilih Negara Berita (10 Negara)
              </span>
              <button className="text-xs text-muted-foreground hover:text-foreground p-1" onClick={() => setShowCountryPicker(false)}>
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {SUPPORTED_COUNTRIES.map((c) => {
                const isSelected = selectedCountryCode === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-background text-foreground hover:bg-muted"
                    }`}
                    onClick={() => handleSelectCountry(c.code)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{c.flag}</span>
                      <span className="truncate max-w-[110px]">{c.name}</span>
                    </span>
                    {isSelected && <Check className="size-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Search Input Bar with Live Dynamic Fetching */}
      <section className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari topik ceruk brand (misal: fashion, kuliner, skincare, Reels, AI)...`}
            className="pl-10 pr-10 text-xs rounded-full bg-surface-raised border-border"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-primary">
            <span>Menampilkan pencarian live topik <strong>"{searchQuery}"</strong> di kawasan {activeCountryObj.flag} {activeCountryObj.name}</span>
            <button onClick={() => setSearchQuery("")} className="text-xs text-muted-foreground hover:text-destructive underline">
              Bersihkan
            </button>
          </div>
        )}
      </section>

      {/* Trending Topics Grid */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="size-4 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Topik Diskusi Terhangat (Klik untuk Cari)</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((item) => (
            <button
              key={item.rank}
              type="button"
              onClick={() => setSearchQuery(item.tag)}
              className="panel text-left flex flex-col justify-between border-primary/20 hover:border-primary/60 hover:shadow-sm transition cursor-pointer group"
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="tiny-pill border-0 bg-primary/10 text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition">{item.tag}</span>
                  <span className="font-display text-xs font-semibold text-muted-foreground">{item.rank}</span>
                </div>
                <h3 className="text-xs font-bold leading-snug group-hover:text-primary transition">{item.topic}</h3>
              </div>
              <div className="mt-4 border-t border-border/60 pt-3 flex items-center justify-between text-[11px]">
                <span className="font-bold text-success">{item.growth} pembicaraan</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Globe className="size-3" /> {item.region}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Articles Feed */}
      {loading ? (
        <div className="panel p-16 text-center">
          <RefreshCw className="mx-auto size-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Memuat berita marketing terkini dari {activeCountryObj.flag} {activeCountryObj.name}...</p>
        </div>
      ) : (
        <section className="space-y-8">
          {/* Featured Headline Article */}
          {featuredArticle && !searchQuery && (
            <a
              href={featuredArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group panel grid gap-6 md:grid-cols-2 overflow-hidden p-0 transition hover:border-primary/50 shadow-sm"
            >
              {featuredArticle.imageUrl && (
                <div className="relative min-h-[240px] w-full overflow-hidden bg-muted">
                  <img
                    src={featuredArticle.imageUrl}
                    alt={featuredArticle.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = "true";
                        target.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=80";
                      }
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="status-badge bg-primary text-primary-foreground font-semibold shadow-md flex items-center gap-1">
                      <Sparkles className="size-3" /> HEADLINE FEATURED
                    </span>
                  </div>
                </div>
              )}
              <div className="flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary">{featuredArticle.flag} {featuredArticle.countryName}</span>
                    <span className="text-xs text-muted-foreground">· {featuredArticle.topic}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold leading-snug group-hover:text-primary transition">
                    {featuredArticle.title}
                  </h2>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {featuredArticle.excerpt}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{featuredArticle.source}</span>
                  <div className="flex items-center gap-2">
                    <span>{featuredArticle.time} · {featuredArticle.read} baca</span>
                    <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </div>
                </div>
              </div>
            </a>
          )}

          {/* Grid of Articles */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(searchQuery ? articles : secondaryArticles).map((art) => (
              <a
                key={art.id}
                href={art.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group panel flex flex-col justify-between overflow-hidden p-0 transition hover:border-primary/50 hover:shadow-md"
              >
                {art.imageUrl && (
                  <div className="relative h-44 w-full overflow-hidden bg-muted">
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = "true";
                          target.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=80";
                        }
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="status-badge bg-background/90 text-foreground backdrop-blur-md shadow-sm font-semibold">
                        {art.flag} {art.countryName}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <span className="text-[11px] font-semibold text-primary">{art.topic}</span>
                    <h3 className="mt-1.5 text-xs font-bold leading-snug group-hover:text-primary transition line-clamp-2">
                      {art.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {art.excerpt}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                    <span className="font-medium truncate max-w-[130px] text-foreground">{art.source}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span>{art.time}</span>
                      <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {articles.length === 0 && (
            <div className="panel p-12 text-center space-y-3">
              <Newspaper className="mx-auto size-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Tidak ada berita yang cocok dengan pencarian "{searchQuery}". Coba kata kunci lain.</p>
              <Button size="sm" variant="outline" onClick={() => setSearchQuery("")} className="rounded-full text-xs">
                Bersihkan Pencarian
              </Button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
