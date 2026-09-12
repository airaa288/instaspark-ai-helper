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

  return {
    id: `veo-${Date.now()}`,
    status: "completed",
    videoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    durationSeconds: duration,
    costInUSD: cost.costUSD,
    costInIDR: cost.costIDR,
    formattedCostIDR: cost.formattedCostIDR,
  };
}

export async function generateNanoBananaImage(request: ImageGenRequest): Promise<ImageGenResponse> {
  return {
    id: `img-${Date.now()}`,
    status: "completed",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    aspectRatio: request.aspectRatio || "4:5",
  };
}
