// Fuzzy Logic Engine for Caption Preferences
// Maps vague human preferences to precise prompt modifiers

function fuzzifyTone(value) {
  if (value <= 25) return { level: "very casual", descriptor: "relaxed, friendly, and informal" };
  if (value <= 45) return { level: "slightly casual", descriptor: "approachable and light" };
  if (value <= 55) return { level: "neutral", descriptor: "balanced and clear" };
  if (value <= 75) return { level: "moderately formal", descriptor: "professional and polished" };
  return { level: "very formal", descriptor: "highly professional, authoritative, and refined" };
}

function fuzzifyLength(value) {
  if (value <= 20) return { level: "very short", instruction: "Keep it to one concise sentence, under 15 words." };
  if (value <= 40) return { level: "short", instruction: "Keep it brief, 1-2 sentences, around 20-30 words." };
  if (value <= 60) return { level: "medium", instruction: "Write a moderate caption, 2-3 sentences, around 40-60 words." };
  if (value <= 80) return { level: "detailed", instruction: "Write a rich, detailed caption, 3-4 sentences, around 60-90 words." };
  return { level: "very detailed", instruction: "Write an elaborate, comprehensive description, 4-6 sentences, around 90-120 words." };
}

function getStyleInstruction(style) {
  const map = {
    factual: "Use a factual, objective tone. State what is visible without embellishment.",
    journalistic: "Write in a journalistic style — informative, engaging, with a hook that draws attention.",
    poetic: "Use a poetic, lyrical voice — evocative language, metaphors, and vivid imagery.",
    conversational: "Write in a conversational tone, as if chatting with a friend — casual, relatable, and engaging.",
    academic: "Use an academic, scholarly tone — precise terminology, analytical perspective, and structured description.",
  };
  return map[style] || map.factual;
}

function getPlatformInstruction(platform) {
  const map = {
    general: "",
    instagram: "Format for Instagram: engaging, with relevant emoji, and suggest 3-5 hashtags at the end.",
    linkedin: "Format for LinkedIn: professional, insightful, and thought-provoking. No hashtags unless relevant.",
    youtube: "Format for YouTube: write a descriptive, engaging video caption/description. Include a compelling first line as a hook, followed by context. Can be 2-3 sentences. Avoid hashtags unless at the very end.",
    twitter: "Format for Twitter/X: concise, punchy, under 280 characters. Make every word count.",
    news_article: "Format as a news caption: informative, objective, with who/what/where/when if applicable.",
    accessibility: "Format as accessibility alt-text: describe the image objectively and thoroughly for visually impaired users. Focus on what is depicted, spatial relationships, colors, and any text visible.",
  };
  return map[platform] || "";
}

export function buildPromptFromPreferences(preferences, videoContext = null) {
  const tone = fuzzifyTone(preferences.tone);
  const length = fuzzifyLength(preferences.length_pref);
  const style = getStyleInstruction(preferences.style);
  const platform = getPlatformInstruction(preferences.platform);

  if (videoContext) {
    const hasSpokenContent = videoContext.spoken_content && videoContext.spoken_content.trim().length > 0;
    const scenesText = videoContext.scenes?.join(" → ") || "";
    const subjectsText = videoContext.subjects?.join(", ") || "";

    return `Generate a caption for a video based on the following extracted analysis.

VIDEO ANALYSIS CONTEXT:
- Overall summary: ${videoContext.overall_summary}
- Key scenes (in order): ${scenesText}
- Main subjects: ${subjectsText}
- Mood: ${videoContext.mood}
- Color palette: ${videoContext.dominant_colors}
- Motion level: ${videoContext.motion_level}
${hasSpokenContent ? `- Spoken content / narration: "${videoContext.spoken_content}"` : "- No spoken content detected"}

CAPTION REQUIREMENTS:
TONE: ${tone.descriptor} (${tone.level})
LENGTH: ${length.instruction}
STYLE: ${style}
${platform ? `PLATFORM: ${platform}` : ""}

The caption should reflect the temporal narrative of the video — acknowledge the progression of scenes, the mood, and any spoken context if relevant. Do NOT just describe a static frame.

Important: Output ONLY the caption text, nothing else. No labels, no quotes, no explanation.`;
  }

  return `Generate a caption for the provided image.

TONE: ${tone.descriptor} (${tone.level})
LENGTH: ${length.instruction}
STYLE: ${style}
${platform ? `PLATFORM: ${platform}` : ""}

Important: Output ONLY the caption text, nothing else. No labels, no quotes, no explanation.`;
}