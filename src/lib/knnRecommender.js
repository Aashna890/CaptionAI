/**
 * KNN (K-Nearest Neighbors) Preference Recommender
 * 
 * Learns from saved caption history to recommend optimal preference
 * settings for new captions. Uses Euclidean distance in a normalized
 * feature space of tone, length, style, and platform.
 * 
 * ML Concepts used:
 * - Feature encoding (one-hot for categorical variables)
 * - Feature normalization (min-max scaling)
 * - Euclidean distance metric
 * - K-Nearest Neighbors majority voting
 */

const STYLES = ["factual", "journalistic", "poetic", "conversational", "academic"];
const PLATFORMS = ["general", "instagram", "linkedin", "twitter", "news_article", "accessibility"];

// Encode a caption record into a numeric feature vector
function encode(caption) {
  const styleVec = STYLES.map((s) => (caption.style === s ? 1 : 0));
  const platformVec = PLATFORMS.map((p) => (caption.platform === p ? 1 : 0));
  return [
    (caption.tone ?? 50) / 100,         // normalized 0-1
    (caption.length_pref ?? 50) / 100,  // normalized 0-1
    ...styleVec,                         // one-hot style (5 dims)
    ...platformVec,                      // one-hot platform (6 dims)
  ];
}

function euclidean(a, b) {
  return Math.sqrt(a.reduce((sum, ai, i) => sum + (ai - b[i]) ** 2, 0));
}

function majorityVote(values) {
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Run KNN on caption history to recommend preferences for the next caption.
 * @param {Array} history - Array of Caption records from the database
 * @param {Object} currentPrefs - Current preference state (as a seed query point)
 * @param {number} k - Number of nearest neighbors (default: 3)
 * @returns {{ tone: number, length_pref: number, style: string, platform: string, confidence: number } | null}
 */
export function knnRecommend(history, currentPrefs, k = 3) {
  if (!history || history.length < 2) return null;

  const labeled = history.filter(
    (c) => c.tone != null && c.length_pref != null && c.style && c.platform
  );
  if (labeled.length < 2) return null;

  const query = encode(currentPrefs);
  const k_actual = Math.min(k, labeled.length);

  // Compute distances from the query point to all history points
  const distances = labeled.map((c) => ({
    caption: c,
    dist: euclidean(query, encode(c)),
  }));

  // Sort by distance and take K nearest
  const nearest = distances.sort((a, b) => a.dist - b.dist).slice(0, k_actual);

  // Majority vote for categorical preferences
  const styles = nearest.map((n) => n.caption.style);
  const platforms = nearest.map((n) => n.caption.platform);
  const recommendedStyle = majorityVote(styles);
  const recommendedPlatform = majorityVote(platforms);

  // Weighted average for numeric preferences (weight = 1 / distance)
  let totalWeight = 0;
  let weightedTone = 0;
  let weightedLength = 0;

  for (const { caption, dist } of nearest) {
    const weight = dist === 0 ? 1000 : 1 / dist;
    totalWeight += weight;
    weightedTone += caption.tone * weight;
    weightedLength += caption.length_pref * weight;
  }

  const avgDist = nearest.reduce((s, n) => s + n.dist, 0) / nearest.length;
  // Confidence: lower distance = higher confidence (normalized 0-1)
  const confidence = Math.max(0, Math.min(1, 1 - avgDist / Math.sqrt(2)));

  return {
    tone: Math.round(weightedTone / totalWeight),
    length_pref: Math.round(weightedLength / totalWeight),
    style: recommendedStyle,
    platform: recommendedPlatform,
    confidence,
    k: k_actual,
    neighborCount: labeled.length,
  };
}