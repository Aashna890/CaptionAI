/**
 * moodDetector.js — Smart Mood Detector (PCA + Linear SVM) — FIXED v2
 *
 * Changes from original:
 *  - PCA projection is now variable-length (supports 3, 6, or N components)
 *  - SVM classify uses actual trained component count, not hardcoded 3
 *  - Fallback weights corrected to have non-zero color features
 *  - Feature extraction unchanged (mirrors train_mood_model.py exactly)
 */

// ─── Load trained weights ────────────────────────────────────────────────────
let TRAINED_WEIGHTS = null;

async function getWeights() {
  if (TRAINED_WEIGHTS) return TRAINED_WEIGHTS;
  try {
    const mod = await import("./moodModelWeights.json");
    TRAINED_WEIGHTS = mod.default || mod;
    console.log(
      `[MoodDetector] Loaded trained model — accuracy: ${TRAINED_WEIGHTS.accuracy}%,` +
      ` trained on ${TRAINED_WEIGHTS.trained_on} samples,` +
      ` PCA axes: ${TRAINED_WEIGHTS.n_pca || TRAINED_WEIGHTS.pca.components.length},` +
      ` mode: ${TRAINED_WEIGHTS.training_mode || "unknown"}`
    );
    return TRAINED_WEIGHTS;
  } catch {
    console.warn("[MoodDetector] moodModelWeights.json not found — using built-in defaults.");
    console.warn("  Run: cd backend/train && python train_mood_model.py");
    return null;
  }
}

// ─── Fallback defaults ───────────────────────────────────────────────────────
// These approximate weights are for COLOR images (not grayscale).
// The original fallback was fine; the problem was the trained weights
// being produced from a grayscale dataset, not the fallback itself.
const FALLBACK_WEIGHTS = {
  featureStats: {
    mean: [0.47, 0.33, 0.17, 0.14, 0.22, 0.44, 0.42, 0.39, 0.08, 0.06, 0.72, 0.16],
    std:  [0.18, 0.19, 0.09, 0.08, 0.12, 0.17, 0.15, 0.16, 0.07, 0.05, 0.18, 0.12],
  },
  pca: {
    components: [
      [ 0.42,  0.18,  0.31,  0.08,  0.02,  0.39,  0.05, -0.35,  0.38, -0.28,  0.12,  0.44],
      [ 0.08,  0.50,  0.10,  0.40,  0.35, -0.05,  0.25, -0.18,  0.15, -0.12,  0.38,  0.38],
      [ 0.15, -0.15,  0.55,  0.22,  0.18,  0.05, -0.10,  0.12, -0.20,  0.50, -0.05, -0.10],
    ],
  },
  svm: {
    classifiers: {
      "Positive":     { w: [ 1.10,  0.35, -0.60], b: -0.20 },
      "Energetic":    { w: [ 0.25,  1.20,  0.30], b: -0.25 },
      "Dark / Moody": { w: [-1.05, -0.40,  0.80], b: -0.05 },
      "Neutral":      { w: [-0.30, -0.80, -0.50], b:  0.40 },
    },
    classes: ["Positive", "Energetic", "Dark / Moody", "Neutral"],
  },
  accuracy: null,
  trained_on: 0,
  n_pca: 3,
};

// ─── Feature Extraction ───────────────────────────────────────────────────────

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let h = 0;
  if (d !== 0) {
    if      (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
  }
  return { h, s, v };
}

export function extractFeatures(imageData) {
  const { data, width, height } = imageData;
  const total = width * height;

  let sumH = 0, sumS = 0, sumV = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  const hArr = [], sArr = [], vArr = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const { h, s, v } = rgbToHsv(r, g, b);
    sumH += h; sumS += s; sumV += v;
    sumR += r / 255; sumG += g / 255; sumB += b / 255;
    hArr.push(h); sArr.push(s); vArr.push(v);
  }

  const meanH = sumH / total, meanS = sumS / total, meanV = sumV / total;
  const meanR = sumR / total, meanG = sumG / total, meanB = sumB / total;

  const stdH = Math.sqrt(hArr.reduce((a, h) => a + (h - meanH) ** 2, 0) / total);
  const stdS = Math.sqrt(sArr.reduce((a, s) => a + (s - meanS) ** 2, 0) / total);
  const stdV = Math.sqrt(vArr.reduce((a, v) => a + (v - meanV) ** 2, 0) / total);

  let warmCount = 0, coolCount = 0;
  hArr.forEach((h, i) => {
    if (sArr[i] > 0.15) {
      if (h < 0.1 || h > 0.9 || (h > 0.05 && h < 0.18)) warmCount++;
      else if (h > 0.45 && h < 0.72) coolCount++;
    }
  });

  const hueBins = new Array(8).fill(0);
  hArr.forEach(h => { hueBins[Math.min(7, Math.floor(h * 8))]++; });
  const entropy = hueBins.reduce((e, c) => {
    const p = c / total;
    return p > 0 ? e - p * Math.log2(p) : e;
  }, 0) / 3;

  return [
    meanV, meanS, stdV, stdS, stdH,
    meanR, meanG, meanB,
    warmCount / total, coolCount / total,
    entropy,
    meanV * meanS,
  ];
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalize(features, stats) {
  return features.map((v, i) => (v - stats.mean[i]) / (stats.std[i] + 1e-8));
}

// ─── PCA Projection (variable n_components) ───────────────────────────────────
// Supports any number of PCA components — 3 (original) or 6 (new default).
// The SVM classifiers' weight vectors must match the component count.

function pcaProject(normFeatures, pca) {
  return pca.components.map(pc =>
    pc.reduce((sum, w, i) => sum + w * normFeatures[i], 0)
  );
}

// ─── Linear SVM Classify ─────────────────────────────────────────────────────

function svmClassify(pcaVec, svm) {
  let bestMood = "Neutral", bestScore = -Infinity;
  const raw = {};
  for (const [mood, clf] of Object.entries(svm.classifiers)) {
    // clf.w may have 3 or 6 elements — use pcaVec.length to be safe
    const score = clf.w.reduce((s, w, i) => s + w * (pcaVec[i] ?? 0), clf.b);
    raw[mood] = score;
    if (score > bestScore) { bestScore = score; bestMood = mood; }
  }
  const vals = Object.values(raw);
  const maxV = Math.max(...vals);
  const exps = vals.map(v => Math.exp(v - maxV));
  const sumE = exps.reduce((a, b) => a + b, 0);
  const probs = {};
  Object.keys(raw).forEach((k, i) => { probs[k] = exps[i] / sumE; });
  return { mood: bestMood, confidence: probs[bestMood], scores: probs };
}

// ─── Tone Mapping ─────────────────────────────────────────────────────────────

const MOOD_TONE_MAP = {
  "Positive":     { tone: 28, label: "warm & casual" },
  "Energetic":    { tone: 18, label: "bold & upbeat" },
  "Dark / Moody": { tone: 72, label: "serious & formal" },
  "Neutral":      { tone: 50, label: "balanced" },
};

export const MOOD_COLORS = {
  "Positive":     "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  "Energetic":    "text-orange-400 border-orange-500/30 bg-orange-500/10",
  "Dark / Moody": "text-blue-400 border-blue-500/30 bg-blue-500/10",
  "Neutral":      "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

// ─── Main Entry ───────────────────────────────────────────────────────────────

export async function detectMood(imageUrl) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise(resolve => {
    img.onload  = resolve;
    img.onerror = resolve;
    img.src     = imageUrl;
  });

  const SIZE   = 128;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx    = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);

  const features = extractFeatures(imageData);

  const weights       = await getWeights() || FALLBACK_WEIGHTS;
  const isUserTrained = !!(weights.trained_on && weights.trained_on > 0);

  const normFeatures = normalize(features, weights.featureStats);
  const pcaVec       = pcaProject(normFeatures, weights.pca);
  const { mood, confidence, scores } = svmClassify(pcaVec, weights.svm);
  const { tone, label } = MOOD_TONE_MAP[mood] || MOOD_TONE_MAP["Neutral"];

  return {
    mood,
    tone,
    label,
    confidence,
    scores,
    pcaVec,     // may have 3 or 6 elements depending on trained model
    features,
    isUserTrained,
    modelAccuracy: weights.accuracy,
    trainedOn:     weights.trained_on,
  };
}

export { MOOD_TONE_MAP };