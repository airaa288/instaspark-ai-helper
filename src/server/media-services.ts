/**
 * Media Services API (Veo 3.1 & Nano Banana / Flash Image Generation)
 * Provides prompt generation, rendering stubs, and exact cost calculations based on PRD specs:
 * Veo 3.1 Fast 720p: $0.10 / sec ($0.10 * Rp17.500 = Rp1.750 / sec)
 */

export interface VideoGenRequest {
  prompt: string;
  durationSeconds: number; // e.g. 8 seconds
  resolution: "720p" | "1080p";
}

export interface VideoGenResponse {
  id: string;
  status: "completed" | "processing";
  videoUrl: string;
  durationSeconds: number;
  costInUSD: number;
  costInIDR: number;
  formattedCostIDR: string;
}

export interface ImageGenRequest {
  prompt: string;
  aspectRatio: "1:1" | "4:5" | "9:16";
}

export interface ImageGenResponse {
  id: string;
  status: "completed";
  imageUrl: string;
  aspectRatio: string;
}

const VEO_RATE_PER_SECOND_USD = 0.10; // $0.10 / sec as per PRD
const USD_TO_IDR_RATE = 17500;       // Rp 17.500 per USD as per PRD

export function calculateVeoVideoCost(durationSeconds: number) {
  const costUSD = durationSeconds * VEO_RATE_PER_SECOND_USD;
  const costIDR = costUSD * USD_TO_IDR_RATE;
  return {
    costUSD,
    costIDR,
    formattedCostUSD: `$${costUSD.toFixed(2)}`,
    formattedCostIDR: `Rp${costIDR.toLocaleString("id-ID")}`
  };
}

export async function generateVeoVideo(request: VideoGenRequest): Promise<VideoGenResponse> {
  const duration = request.durationSeconds || 8;
  const cost = calculateVeoVideoCost(duration);

  const sampleMp4Videos = [
    "https://vjs.zencdn.net/v/oceans.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://www.w3schools.com/html/mov_bbb.mp4"
  ];
  const promptLower = (request.prompt || "").toLowerCase();
  let selectedVideoUrl = sampleMp4Videos[0];
  if (promptLower.includes("bunga") || promptLower.includes("flower")) {
    selectedVideoUrl = sampleMp4Videos[1];
  } else if (promptLower.includes("animasi") || promptLower.includes("kartun")) {
    selectedVideoUrl = sampleMp4Videos[2];
  } else {
    selectedVideoUrl = sampleMp4Videos[0];
  }

  return {
    id: `veo-${Date.now()}`,
    status: "completed",
    videoUrl: selectedVideoUrl,
    durationSeconds: duration,
    costInUSD: cost.costUSD,
    costInIDR: cost.costIDR,
    formattedCostIDR: cost.formattedCostIDR,
  };
}

function translatePromptForImage(prompt: string): string {
  let p = prompt.toLowerCase().trim();
  p = p.replace(/^(bikin|buatkan|buat|generate|minta|tolong)\s+(gambar|foto|visual|video|videonya|reel|reels)\s*/i, "");
  p = p.replace(/^(gambar|foto|visual|video|videonya|reel|reels)\s*/i, "");
  p = p.replace(/^(tentang|mengenai)\s*/i, "");
  p = p.trim();

  const translations: Record<string, string> = {
    buaya: "a detailed realistic crocodile near riverbank, cinematic 4k photo, vertical 9:16",
    naga: "a mythical majestic dragon with glowing wings, fantasy art 4k photo",
    kucing: "a cute fluffy cat playing, 4k photo, studio lighting",
    anjing: "a happy friendly dog running in a park, 4k photo",
    kopi: "aesthetic hot coffee cup on a wooden cafe table, warm morning sunlight, 4k photo",
    makanan: "delicious gourmet food plated beautifully, food photography 4k",
    masak: "chef cooking gourmet dish in kitchen, vibrant studio lighting",
    baju: "trendy fashion outfit flatlay, aesthetic Instagram style, 4k photo",
    skincare: "luxurious skincare bottle packaging on marble background, soft studio lighting",
    mobil: "sleek modern sports car driving on scenic highway at sunset, 4k photo",
    pantai: "tropical paradise beach with turquoise water and palm trees, golden hour 4k photo",
    bunga: "beautiful colorful fresh flowers blooming in garden, macro 4k photo",
    alam: "majestic mountain landscape with river under clear blue sky, 4k photo",
    fitness: "athletic person training in modern gym, cinematic lighting 4k"
  };

  for (const [key, val] of Object.entries(translations)) {
    if (p.includes(key)) {
      return val;
    }
  }

  return `cinematic high quality detailed photo of ${p || "Instagram content"}, 4k resolution, professional composition`;
}

export async function generateNanoBananaImage(request: ImageGenRequest): Promise<ImageGenResponse> {
  const apiKey = process.env.IMAGE_GEN_API_KEY || process.env.GEMINI_API_KEY;
  const englishPrompt = translatePromptForImage(request.prompt || "");

  let width = 1080;
  let height = 1350;
  if (request.aspectRatio === "9:16") {
    width = 720;
    height = 1280;
  } else if (request.aspectRatio === "1:1") {
    width = 1080;
    height = 1080;
  }

  if (apiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: englishPrompt }] }]
        })
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const base64Img = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Img) {
          return {
            id: `img-${Date.now()}`,
            status: "completed",
            imageUrl: `data:image/jpeg;base64,${base64Img}`,
            aspectRatio: request.aspectRatio || "4:5",
          };
        }
      }
    } catch {
      // Fall through to clean Flux engine
    }
  }

  const encodedPrompt = encodeURIComponent(englishPrompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&private=true&model=flux&enhance=true`;

  return {
    id: `img-${Date.now()}`,
    status: "completed",
    imageUrl,
    aspectRatio: request.aspectRatio || "4:5",
  };
}
