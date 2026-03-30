import { invokeLLM } from "@/api/geminiClient";

/**
 * Analyzes a video URL using Gemini 1.5 Flash (multimodal).
 * Returns a VideoContext object:
 * {
 *   scenes: string[]
 *   subjects: string[]
 *   mood: string
 *   spoken_content: string
 *   overall_summary: string
 *   dominant_colors: string
 *   motion_level: "static" | "moderate" | "dynamic"
 * }
 */
export async function analyzeVideo(videoUrl) {
  const result = await invokeLLM({
    prompt: `You are a video analysis assistant. Analyze the provided video and extract structured context for caption generation.

Return a JSON object with these exact fields:
- scenes: array of 3-5 strings, each describing a distinct temporal segment or keyframe in order
- subjects: array of main subjects, objects, people, or entities visible
- mood: the overall emotional atmosphere (e.g. "calm and serene", "energetic and vibrant", "tense and dramatic")
- spoken_content: any speech, dialogue, or narration detected as a single string (empty string if none)
- overall_summary: a single paragraph summarizing the entire video content
- dominant_colors: brief description of the color palette (e.g. "warm golden tones with deep shadows")
- motion_level: one of exactly "static", "moderate", or "dynamic"

Be thorough and specific. Focus on what would help write a compelling caption.`,
    file_urls: [videoUrl],
    response_json_schema: {
      type: "object",
      properties: {
        scenes:          { type: "array", items: { type: "string" } },
        subjects:        { type: "array", items: { type: "string" } },
        mood:            { type: "string" },
        spoken_content:  { type: "string" },
        overall_summary: { type: "string" },
        dominant_colors: { type: "string" },
        motion_level:    { type: "string" },
      },
    },
  });

  return result;
}