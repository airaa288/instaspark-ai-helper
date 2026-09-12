import { generateContentPlanWithAI, GeneratedContentPlan } from "./gemini";
import { calculateVeoVideoCost } from "./media-services";
import { savePostToDb, supabase, ContentPostItem, getTodayLocalDateString } from "../lib/supabase";

export interface TopicRatio {
  id?: string;
  topicName: string;
  percentage: number;
}

export interface ContentRecommendationOption {
  id: string;
  title: string;
  angle: string;
  category: string;
  format: "Reel" | "Carousel" | "Single Post";
  estimatedReach: string;
  status: "pending" | "approved" | "rejected";
}

export interface ApprovedContentResult {
  optionId: string;
  title: string;
  script: string;
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  videoPrompt: string;
  veoDurationSeconds: number;
  veoCostUSD: number;
  veoCostIDR: number;
  formattedVeoCostIDR: string;
  recommendedPostTime: string;
  savedPostId: string;
}

let activeRatios: TopicRatio[] = [
  { topicName: "Teknologi & AI", percentage: 75 },
  { topicName: "Edukasi & Alam", percentage: 25 }
];

export async function getTopicRatios(): Promise<TopicRatio[]> {
  if (supabase) {
    try {
      const { data } = await supabase.from("topic_ratios").select("*");
      if (data && data.length > 0) {
        return data.map((d: any) => ({
          id: String(d.id),
          topicName: String(d.topic_name),
          percentage: Number(d.percentage)
        }));
      }
    } catch (e) {
      console.warn("Error fetching topic ratios from Supabase:", e);
    }
  }
  return activeRatios;
}

export async function saveTopicRatios(ratios: TopicRatio[]): Promise<TopicRatio[]> {
  activeRatios = ratios;
  if (supabase) {
    try {
      await supabase.from("topic_ratios").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const rows = ratios.map((r) => ({ topic_name: r.topicName, percentage: r.percentage }));
      await supabase.from("topic_ratios").insert(rows);
    } catch (e) {
      console.warn("Error saving topic ratios to Supabase:", e);
    }
  }
  return activeRatios;
}

export async function generateFourContentOptions(customRatios?: TopicRatio[]): Promise<ContentRecommendationOption[]> {
  const ratios = customRatios || (await getTopicRatios());
  const primaryTopic = ratios[0]?.topicName || "Teknologi & AI";
  const secondaryTopic = ratios[1]?.topicName || "Edukasi & Alam";

  return [
    {
      id: "option-1",
      title: `3 Alat AI Terbaru yang Mengubah Industri (${primaryTopic})`,
      angle: "Ulasan praktis seputar efisiensi alur kerja dengan AI",
      category: primaryTopic,
      format: "Reel",
      estimatedReach: "45K - 60K Reach",
      status: "pending"
    },
    {
      id: "option-2",
      title: `Langkah Awal Memahami ${primaryTopic} Tanpa Coding`,
      angle: "Panduan visual infografis edukatif langkah demi langkah",
      category: primaryTopic,
      format: "Carousel",
      estimatedReach: "30K - 42K Reach",
      status: "pending"
    },
    {
      id: "option-3",
      title: `Harmoni Antara ${primaryTopic} dan Kelestarian (${secondaryTopic})`,
      angle: "Storytelling inspiratif dampak teknologi hijau",
      category: secondaryTopic,
      format: "Reel",
      estimatedReach: "25K - 38K Reach",
      status: "pending"
    },
    {
      id: "option-4",
      title: `Mitos vs Fakta Tren ${secondaryTopic} Saat Ini`,
      angle: "Konten interaktif memicu diskusi dan komentar audiens",
      category: secondaryTopic,
      format: "Carousel",
      estimatedReach: "20K - 35K Reach",
      status: "pending"
    }
  ];
}

export async function approveAndGenerateContent(selectedOption: ContentRecommendationOption, userId?: string): Promise<ApprovedContentResult> {
  const plan: GeneratedContentPlan = await generateContentPlanWithAI(selectedOption.title);

  const durationSec = 8;
  const veoCost = calculateVeoVideoCost(durationSec);

  const todayStr = getTodayLocalDateString();

  const newPostData: Omit<ContentPostItem, "id"> = {
    user_id: userId,
    title: selectedOption.title,
    script: plan.script,
    caption: plan.caption,
    hashtags: plan.hashtags,
    image_prompt: plan.imagePrompt,
    video_prompt: plan.videoPrompt,
    veo_duration_seconds: durationSec,
    veo_cost_idr: veoCost.costIDR,
    scheduled_date: todayStr,
    scheduled_time: "18:00",
    status: "Scheduled"
  };

  const savedPost = await savePostToDb(newPostData);

  return {
    optionId: selectedOption.id,
    title: selectedOption.title,
    script: plan.script,
    caption: plan.caption,
    hashtags: plan.hashtags,
    imagePrompt: plan.imagePrompt,
    videoPrompt: plan.videoPrompt,
    veoDurationSeconds: durationSec,
    veoCostUSD: veoCost.costUSD,
    veoCostIDR: veoCost.costIDR,
    formattedVeoCostIDR: veoCost.formattedCostIDR,
    recommendedPostTime: plan.recommendedPostTime || "Jumat, 18:00 WIB",
    savedPostId: savedPost.id
  };
}
