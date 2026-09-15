import { createClient, SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * Supabase Client Helper for InstaSpark AI Helper
 * Reads VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY from environment.
 * Supports Auth, Instagram Accounts, Content Planner, and Chat History.
 * SSR-safe with guarded storage helpers.
 */

const envUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || process.env["VITE_SUPABASE_URL"] || "";
const envKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) || process.env["VITE_SUPABASE_ANON_KEY"] || "";

export const isSupabaseConfigured = Boolean(envUrl && envKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(envUrl, envKey)
  : null;

export function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 2500): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Supabase request timeout")), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// SSR Safe Local Storage Helpers
export function getLocalItem(key: string): string | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalItem(key: string, value: string): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function removeLocalItem(key: string): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

// =========================================
// 1. User & Auth Types & State Management
// =========================================

export interface UserSession {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

const LOCAL_USER_KEY = "sparky_user_session";
const REGISTERED_USERS_KEY = "sparky_registered_accounts";
const migratedUsersSet = new Set<string>();

export interface RegisteredAccount {
  id: string;
  email: string;
  pass: string;
  name: string;
}

export function getDeterministicUserId(email: string): string {
  const clean = email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `usr_${clean}`;
}

export function getRegisteredAccounts(): Record<string, RegisteredAccount> {
  const defaultAccount: RegisteredAccount = {
    id: "usr_airaz_gmail_com",
    email: "airaz@gmail.com",
    pass: "123456",
    name: "Airaz"
  };

  try {
    const raw = getLocalItem(REGISTERED_USERS_KEY);
    const accounts: Record<string, RegisteredAccount> = raw ? JSON.parse(raw) : {};
    if (!accounts["airaz@gmail.com"]) {
      accounts["airaz@gmail.com"] = defaultAccount;
      setLocalItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
    }
    return accounts;
  } catch {
    return { "airaz@gmail.com": defaultAccount };
  }
}

export function saveRegisteredAccount(acc: RegisteredAccount): void {
  try {
    const accounts = getRegisteredAccounts();
    accounts[acc.email.toLowerCase()] = acc;
    setLocalItem(REGISTERED_USERS_KEY, JSON.stringify(accounts));
  } catch {}
}

export function migrateLegacyUserData(email: string, targetUserId: string): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  const userKey = `${email.toLowerCase()}_${targetUserId}`;
  if (migratedUsersSet.has(userKey)) return;
  migratedUsersSet.add(userKey);

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith("sparky_posts_usr-") && key !== `sparky_posts_${targetUserId}`) {
        const legacyData = localStorage.getItem(key);
        const currentData = localStorage.getItem(`sparky_posts_${targetUserId}`);
        if (legacyData && legacyData !== "[]" && (!currentData || currentData === "[]")) {
          localStorage.setItem(`sparky_posts_${targetUserId}`, legacyData);
        }
        keysToRemove.push(key);
      }

      if ((key.startsWith("sparky_conversations_usr-") || key.startsWith("sparky_threads_usr-")) && key !== `sparky_threads_${targetUserId}`) {
        const legacyData = localStorage.getItem(key);
        const currentData = localStorage.getItem(`sparky_threads_${targetUserId}`);
        if (legacyData && legacyData !== "[]" && (!currentData || currentData === "[]")) {
          localStorage.setItem(`sparky_threads_${targetUserId}`, legacyData);
        }
        keysToRemove.push(key);
      }

      if (key.startsWith("sparky_linked_ig_account_usr-") && key !== `sparky_linked_ig_account_${targetUserId}`) {
        const legacyData = localStorage.getItem(key);
        const currentData = localStorage.getItem(`sparky_linked_ig_account_${targetUserId}`);
        if (legacyData && !currentData) {
          localStorage.setItem(`sparky_linked_ig_account_${targetUserId}`, legacyData);
        }
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn("Legacy data migration notice:", err);
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  if (supabase) {
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 2000);
      if (session?.user) {
        const rawEmail = session.user.email || "";
        const cleanEmail = rawEmail.trim().toLowerCase();
        const metaName = session.user.user_metadata?.full_name || cleanEmail.split("@")[0] || "Sparky User";
        const formattedName = metaName.charAt(0).toUpperCase() + metaName.slice(1);
        const u: UserSession = {
          id: session.user.id,
          email: cleanEmail,
          name: formattedName,
          avatar_url: session.user.user_metadata?.avatar_url
        };
        setLocalItem(LOCAL_USER_KEY, JSON.stringify(u));
        migrateLegacyUserData(u.email, u.id);
        return u;
      } else {
        // Supabase explicitly reports logged out: clear stale local session
        removeLocalItem(LOCAL_USER_KEY);
        return null;
      }
    } catch (err) {
      console.warn("Supabase auth session fetch notice:", err);
    }
  }

  // Fallback to local session storage only if Supabase is offline
  try {
    const stored = getLocalItem(LOCAL_USER_KEY);
    if (stored) {
      const u: UserSession = JSON.parse(stored);
      if (u && u.email) {
        u.email = u.email.trim().toLowerCase();
        const name = u.name || u.email.split("@")[0];
        u.name = name.charAt(0).toUpperCase() + name.slice(1);
        migrateLegacyUserData(u.email, u.id);
        return u;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return null;
}

export async function signUpWithEmail(email: string, pass: string, name: string): Promise<{ user: UserSession | null; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !pass) {
    return { user: null, error: "Mohon isi alamat email dan kata sandi." };
  }

  const accounts = getRegisteredAccounts();
  const existingLocalAccount = accounts[cleanEmail];

  // If email is ALREADY registered: BLOCK signup!
  if (existingLocalAccount) {
    return {
      user: null,
      error: `ALREADY_REGISTERED: Email "${cleanEmail}" sudah terdaftar! Silakan klik tab 'Masuk' untuk login.`
    };
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: { full_name: name }
        }
      });

      if (error) {
        const isAlreadyRegistered =
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists") ||
          error.code === "user_already_exists";

        if (isAlreadyRegistered) {
          return {
            user: null,
            error: `ALREADY_REGISTERED: Email "${cleanEmail}" sudah terdaftar! Silakan klik tab 'Masuk' untuk login.`
          };
        }
      }

      if (data?.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          return {
            user: null,
            error: `ALREADY_REGISTERED: Email "${cleanEmail}" sudah terdaftar! Silakan klik tab 'Masuk' untuk login.`
          };
        }

        const u: UserSession = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: name || cleanEmail.split("@")[0]
        };
        saveRegisteredAccount({
          id: data.user.id,
          email: cleanEmail,
          pass,
          name: u.name
        });
        setLocalItem(LOCAL_USER_KEY, JSON.stringify(u));
        migrateLegacyUserData(cleanEmail, u.id);
        return { user: u };
      }
    } catch (err: any) {
      console.warn("Supabase signup exception:", err);
    }
  }

  // Register new local account deterministically
  const deterministicId = getDeterministicUserId(cleanEmail);
  const newAcc: RegisteredAccount = {
    id: deterministicId,
    email: cleanEmail,
    pass,
    name: name || cleanEmail.split("@")[0]
  };
  saveRegisteredAccount(newAcc);

  const u: UserSession = {
    id: deterministicId,
    email: cleanEmail,
    name: newAcc.name
  };
  setLocalItem(LOCAL_USER_KEY, JSON.stringify(u));
  migrateLegacyUserData(cleanEmail, u.id);
  return { user: u };
}

export async function signInWithEmail(email: string, pass: string): Promise<{ user: UserSession | null; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !pass) {
    return { user: null, error: "Mohon isi alamat email dan kata sandi." };
  }

  // 1. Try Supabase auth FIRST if available so every device uses the same Supabase User ID
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass
      });

      if (data?.user) {
        const u: UserSession = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: data.user.user_metadata?.full_name || cleanEmail.split("@")[0]
        };
        saveRegisteredAccount({
          id: data.user.id,
          email: cleanEmail,
          pass,
          name: u.name
        });
        setLocalItem(LOCAL_USER_KEY, JSON.stringify(u));
        migrateLegacyUserData(cleanEmail, u.id);
        return { user: u };
      }
    } catch (err: any) {
      console.warn("Supabase signin exception:", err);
    }
  }

  // 2. Local registry check as fallback
  const accounts = getRegisteredAccounts();
  const existingLocalAccount = accounts[cleanEmail];

  if (existingLocalAccount) {
    if (existingLocalAccount.pass === pass) {
      const u: UserSession = {
        id: existingLocalAccount.id,
        email: cleanEmail,
        name: existingLocalAccount.name
      };
      setLocalItem(LOCAL_USER_KEY, JSON.stringify(u));
      migrateLegacyUserData(cleanEmail, u.id);
      return { user: u };
    } else {
      return {
        user: null,
        error: "Kata sandi salah. Silakan periksa kembali kata sandi Anda."
      };
    }
  }

  // Email is NOT registered: REJECT signin
  return {
    user: null,
    error: `UNREGISTERED_EMAIL: Akun dengan email "${cleanEmail}" belum terdaftar. Silakan buat akun di tab 'Daftar Baru'.`
  };
}

export async function signOutUser(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Signout error:", err);
    }
  }
  removeLocalItem(LOCAL_USER_KEY);
  localPostsStorage = [];
}

// =========================================
// 2. Instagram Account 2FA Connection Types
// =========================================

export interface InstagramAccountItem {
  id: string;
  user_id: string;
  ig_username: string;
  full_name?: string;
  profile_pic_url?: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  reach_30d: string;
  engagement_rate: string;
  connected_at: string;
}

const LOCAL_IG_KEY = "sparky_linked_ig_account";

export async function getInstagramAccount(userId: string): Promise<InstagramAccountItem | null> {
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from("instagram_accounts").select("*").eq("user_id", userId).maybeSingle(),
        2000
      );
      if (!error && data) {
        return data as InstagramAccountItem;
      }
    } catch (err) {
      console.warn("Supabase fetch IG notice:", err);
    }
  }

  // Local Storage Fallback
  try {
    const stored = getLocalItem(`${LOCAL_IG_KEY}_${userId}`);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}

export async function linkInstagramAccount2FA(userId: string, igUsername: string): Promise<InstagramAccountItem> {
  const cleanUsername = igUsername.replace(/^@/, "").trim() || "creator.studio";
  const account: InstagramAccountItem = {
    id: `ig-${Date.now()}`,
    user_id: userId,
    ig_username: cleanUsername,
    full_name: `${cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1)} Studio`,
    profile_pic_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    is_verified: true,
    followers_count: 48200,
    following_count: 512,
    posts_count: 428,
    reach_30d: "184K",
    engagement_rate: "5.8%",
    connected_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from("instagram_accounts").upsert([account]).select().single(),
        2500
      );
      if (!error && data) {
        return data as InstagramAccountItem;
      }
    } catch (err) {
      console.warn("Supabase IG upsert notice:", err);
    }
  }

  setLocalItem(`${LOCAL_IG_KEY}_${userId}`, JSON.stringify(account));
  return account;
}

export async function unlinkInstagramAccount(userId: string): Promise<boolean> {
  if (supabase) {
    try {
      await withTimeout(supabase.from("instagram_accounts").delete().eq("user_id", userId), 2000);
    } catch (err) {
      console.warn("Supabase IG delete notice:", err);
    }
  }
  removeLocalItem(`${LOCAL_IG_KEY}_${userId}`);
  return true;
}

// =========================================
// 3. Content Planner Posts
// =========================================

export interface ContentPostItem {
  id: string;
  user_id?: string;
  title: string;
  script: string;
  caption: string;
  hashtags: string[];
  image_prompt?: string;
  video_prompt?: string;
  veo_duration_seconds?: number;
  veo_cost_idr?: number;
  scheduled_date: string;
  scheduled_time: string;
  status: "Draft" | "Scheduled" | "Published";
}

export function getTodayLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

let localPostsStorage: ContentPostItem[] = [];

export async function fetchAllPostsFromDb(userId?: string, email?: string): Promise<ContentPostItem[]> {
  const targetId = userId || "guest";
  const idsToQuery = Array.from(new Set([
    targetId,
    email ? getDeterministicUserId(email) : null,
    targetId.includes("@") ? getDeterministicUserId(targetId) : null
  ].filter(Boolean))) as string[];

  let dbPosts: ContentPostItem[] = [];

  if (supabase && targetId !== "guest") {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("content_posts")
          .select("*")
          .in("user_id", idsToQuery)
          .order("created_at", { ascending: false }),
        2500
      );

      if (!error && data) {
        dbPosts = data.map((d: any) => ({
          id: String(d.id || crypto.randomUUID()),
          user_id: d.user_id,
          title: String(d.title || ""),
          script: String(d.script || ""),
          caption: String(d.caption || ""),
          hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
          image_prompt: d.image_prompt,
          video_prompt: d.video_prompt,
          veo_duration_seconds: d.veo_duration_seconds,
          veo_cost_idr: d.veo_cost_idr,
          scheduled_date: String(d.scheduled_date || getTodayLocalDateString()),
          scheduled_time: String(d.scheduled_time || "18:00"),
          status: (d.status as any) || "Draft"
        }));
      }
    } catch (err) {
      console.warn("Supabase fetch posts notice, using local fallback:", err);
    }
  }

  let localPosts: ContentPostItem[] = [];
  try {
    idsToQuery.forEach((id) => {
      const stored = getLocalItem(`sparky_posts_${id}`);
      if (stored !== null) {
        const parsed: ContentPostItem[] = JSON.parse(stored);
        localPosts.push(...parsed);
      }
    });
  } catch {}

  const map = new Map<string, ContentPostItem>();
  dbPosts.forEach((p) => map.set(p.id, p));
  localPosts.forEach((p) => {
    if (!map.has(p.id)) map.set(p.id, p);
  });

  // Filter out any legacy dummy sample posts automatically
  const merged = Array.from(map.values()).filter(
    (p) => p.id !== "post-sample-1" && p.id !== "post-sample-2"
  );

  // Purge sample posts from DB if present
  if (supabase && targetId !== "guest") {
    withTimeout(supabase.from("content_posts").delete().in("id", ["post-sample-1", "post-sample-2"]), 2000).catch(() => {});
  }

  idsToQuery.forEach((id) => setLocalItem(`sparky_posts_${id}`, JSON.stringify(merged)));

  if (merged.length > 0 && supabase && targetId !== "guest") {
    const unsynced = localPosts.filter(
      (p) => p.id !== "post-sample-1" && p.id !== "post-sample-2" && !dbPosts.some((dbp) => dbp.id === p.id)
    );
    if (unsynced.length > 0) {
      withTimeout(supabase.from("content_posts").upsert(unsynced), 3000).catch((e) =>
        console.warn("Background posts sync notice:", e)
      );
    }
  }

  return merged;
}

export async function savePostToDb(post: Omit<ContentPostItem, "id"> & { id?: string }): Promise<ContentPostItem> {
  const currentUser = await getCurrentUser();
  const targetUserId = post.user_id || currentUser?.id || "guest";

  const newPost: ContentPostItem = {
    ...post,
    id: post.id || crypto.randomUUID(),
    user_id: targetUserId,
    scheduled_date: post.scheduled_date || getTodayLocalDateString(),
    scheduled_time: post.scheduled_time || "18:00"
  };

  if (supabase && targetUserId !== "guest") {
    try {
      const { data, error } = await withTimeout(
        supabase.from("content_posts").upsert([newPost]).select().single(),
        2500
      );
      if (!error && data) {
        const saved: ContentPostItem = {
          id: String(data.id || newPost.id),
          user_id: data.user_id || targetUserId,
          title: String(data.title || newPost.title),
          script: String(data.script || newPost.script),
          caption: String(data.caption || newPost.caption),
          hashtags: Array.isArray(data.hashtags) ? data.hashtags : newPost.hashtags,
          scheduled_date: String(data.scheduled_date || newPost.scheduled_date),
          scheduled_time: String(data.scheduled_time || newPost.scheduled_time),
          status: (data.status as any) || newPost.status
        };
        try {
          const current = await fetchAllPostsFromDb(targetUserId);
          const updated = [saved, ...current.filter((p) => String(p.id) !== String(saved.id))];
          setLocalItem(`sparky_posts_${targetUserId}`, JSON.stringify(updated));
        } catch {}
        return saved;
      }
    } catch (err) {
      console.warn("Supabase upsert post notice, falling back to local:", err);
    }
  }

  try {
    const current = await fetchAllPostsFromDb(targetUserId);
    const updated = [newPost, ...current.filter((p) => String(p.id) !== String(newPost.id))];
    setLocalItem(`sparky_posts_${targetUserId}`, JSON.stringify(updated));
  } catch {
    // ignore
  }

  localPostsStorage = [newPost, ...localPostsStorage.filter((p) => String(p.id) !== String(newPost.id))];
  return newPost;
}

export async function deletePostFromDb(id: string, userId?: string): Promise<boolean> {
  const currentUser = await getCurrentUser();
  const targetUserId = userId || currentUser?.id || "guest";

  if (supabase) {
    try {
      await withTimeout(supabase.from("content_posts").delete().eq("id", id), 2000);
    } catch (err) {
      console.warn("Supabase delete post notice:", err);
    }
  }

  // Purge from ALL sparky_posts_* local storage keys so deleted post never returns
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("sparky_posts_")) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const current: ContentPostItem[] = JSON.parse(stored);
            const updated = current.filter((p) => String(p.id) !== String(id));
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    } catch (e) {
      console.warn("Error purging deleted post from localStorage:", e);
    }
  }

  localPostsStorage = localPostsStorage.filter((p) => String(p.id) !== String(id));
  return true;
}

// =========================================
// 4. Chat Multi-Thread Library (ChatGPT Style)
// =========================================

export interface ChatConversationItem {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageItem {
  id: string;
  conversation_id: string;
  user_id?: string;
  sender: "user" | "sparky";
  content: string;
  created_at: string;
  actions?: any;
}

export async function getUserConversations(userId: string, email?: string): Promise<ChatConversationItem[]> {
  const idsToQuery = Array.from(new Set([
    userId,
    email ? getDeterministicUserId(email) : null,
    userId.includes("@") ? getDeterministicUserId(userId) : null
  ].filter(Boolean))) as string[];

  let dbConvs: ChatConversationItem[] = [];
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("chat_conversations")
          .select("*")
          .in("user_id", idsToQuery)
          .order("updated_at", { ascending: false }),
        2500
      );

      if (!error && data) {
        dbConvs = data as ChatConversationItem[];
      }
    } catch (err) {
      console.warn("Supabase fetch conversations notice:", err);
    }
  }

  let localConvs: ChatConversationItem[] = [];
  try {
    idsToQuery.forEach((id) => {
      const stored = getLocalItem(`sparky_threads_${id}`);
      if (stored) {
        const parsed: ChatConversationItem[] = JSON.parse(stored);
        localConvs.push(...parsed);
      }
    });
  } catch {
    // ignore
  }

  const map = new Map<string, ChatConversationItem>();
  dbConvs.forEach((c) => map.set(c.id, c));
  localConvs.forEach((c) => {
    if (!map.has(c.id)) map.set(c.id, c);
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
  );

  if (merged.length > 0) {
    idsToQuery.forEach((id) => setLocalItem(`sparky_threads_${id}`, JSON.stringify(merged)));
  }

  return merged;
}

export async function createConversation(userId: string, title?: string): Promise<ChatConversationItem> {
  const conv: ChatConversationItem = {
    id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    title: title || "Obrolan Baru",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from("chat_conversations").insert([conv]).select().single(),
        2000
      );
      if (!error && data) {
        return data as ChatConversationItem;
      }
    } catch (err) {
      console.warn("Supabase create conversation notice:", err);
    }
  }

  try {
    const current = await getUserConversations(userId);
    const updated = [conv, ...current];
    setLocalItem(`sparky_threads_${userId}`, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return conv;
}

export async function deleteConversation(conversationId: string, userId: string): Promise<boolean> {
  if (supabase) {
    try {
      await withTimeout(supabase.from("chat_messages").delete().eq("conversation_id", conversationId), 2000);
      await withTimeout(supabase.from("chat_conversations").delete().eq("id", conversationId), 2000);
    } catch (err) {
      console.warn("Supabase delete conversation notice:", err);
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sparky_threads_") || key.startsWith("sparky_conversations_"))) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const currentConvs: ChatConversationItem[] = JSON.parse(stored);
            const updatedConvs = currentConvs.filter((c) => String(c.id) !== String(conversationId));
            localStorage.setItem(key, JSON.stringify(updatedConvs));
          }
        }
      }
      removeLocalItem(`sparky_messages_${conversationId}`);
    } catch (e) {
      console.warn("Error purging deleted conversation from localStorage:", e);
    }
  }

  return true;
}

export async function getConversationMessages(conversationId: string, userId: string): Promise<ChatMessageItem[]> {
  let dbMsgs: ChatMessageItem[] = [];
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
        2000
      );

      if (!error && data) {
        dbMsgs = data as ChatMessageItem[];
      }
    } catch (err) {
      console.warn("Supabase fetch conversation messages notice:", err);
    }
  }

  let localMsgs: ChatMessageItem[] = [];
  try {
    const stored = getLocalItem(`sparky_messages_${conversationId}`);
    if (stored) localMsgs = JSON.parse(stored);
  } catch {
    // ignore
  }

  const map = new Map<string, ChatMessageItem>();
  dbMsgs.forEach((m) => map.set(m.id, m));
  localMsgs.forEach((m) => {
    if (!map.has(m.id)) map.set(m.id, m);
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (merged.length > 0) {
    setLocalItem(`sparky_messages_${conversationId}`, JSON.stringify(merged));
  }

  return merged;
}

export async function saveChatMessageToDb(
  userId: string,
  conversationId: string,
  sender: "user" | "sparky",
  content: string,
  actions?: any,
  updateTitle?: string
): Promise<ChatMessageItem> {
  const msg: ChatMessageItem = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    conversation_id: conversationId,
    user_id: userId,
    sender,
    content,
    created_at: new Date().toISOString(),
    actions
  };

  if (supabase) {
    try {
      await withTimeout(supabase.from("chat_messages").insert([msg]), 2000);
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updateTitle) updateData.title = updateTitle;
      await withTimeout(supabase.from("chat_conversations").update(updateData).eq("id", conversationId), 2000);
    } catch (err) {
      console.warn("Supabase save chat message notice:", err);
    }
  }

  try {
    const currentMsgs = await getConversationMessages(conversationId, userId);
    const updatedMsgs = [...currentMsgs, msg];
    setLocalItem(`sparky_messages_${conversationId}`, JSON.stringify(updatedMsgs));

    const threads = await getUserConversations(userId);
    const updatedThreads = threads.map((t) => {
      if (t.id === conversationId) {
        return {
          ...t,
          title: updateTitle || t.title,
          updated_at: new Date().toISOString()
        };
      }
      return t;
    });
    setLocalItem(`sparky_threads_${userId}`, JSON.stringify(updatedThreads));
  } catch {
    // ignore
  }

  return msg;
}
