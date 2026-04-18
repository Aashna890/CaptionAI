/**
 * dbscan.js — DBSCAN Caption Clustering via TF-IDF
 *
 * Pipeline
 * ────────
 * 1. TF-IDF vectorisation
 *    Each caption is converted to a sparse TF-IDF vector over a shared
 *    vocabulary (stop-words removed). TF-IDF rewards words that are
 *    frequent in one caption but rare across the whole collection —
 *    exactly what makes two captions "similar" in meaning.
 *
 * 2. Cosine similarity
 *    Distance between two captions = 1 − cosine_similarity(v1, v2).
 *    Cosine similarity is standard for text because it is length-invariant.
 *
 * 3. DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 *    ε   (epsilon)  — maximum distance for two points to be neighbours
 *    minPts         — minimum neighbours to form a core point
 *    Points with < minPts neighbours are labelled NOISE (cluster = -1).
 *    DBSCAN needs no pre-specified number of clusters — it discovers them.
 *
 * 4. Cluster labelling
 *    After clustering we inspect the top TF-IDF terms of each cluster's
 *    centroid and map them to a human-readable style label.
 *
 * Academic note for viva
 * ──────────────────────
 * Unlike k-means, DBSCAN does not assume spherical clusters or require k.
 * It finds arbitrarily-shaped dense regions and explicitly marks outliers
 * as noise — ideal for caption data where some captions genuinely belong
 * to no clear group.
 */

// ─── Stop-word list ──────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "is","was","are","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","shall","it","its",
  "this","that","these","those","i","you","he","she","we","they","my","your",
  "his","her","our","their","me","him","us","them","what","which","who",
  "not","no","so","if","as","by","from","up","out","into","about","than",
  "then","there","when","where","just","also","very","more","most","some",
]);

// ─── 1. Tokenise ─────────────────────────────────────────────────────────────
function tokenise(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ─── 2. Build TF-IDF matrix ───────────────────────────────────────────────────
function buildTfIdf(docs) {
  const tokenised = docs.map(tokenise);

  // Collect vocabulary
  const vocab = [];
  const vocabIdx = {};
  tokenised.forEach(tokens => {
    tokens.forEach(t => {
      if (vocabIdx[t] === undefined) { vocabIdx[t] = vocab.length; vocab.push(t); }
    });
  });

  const V = vocab.length;
  const N = docs.length;

  // TF per document
  const tf = tokenised.map(tokens => {
    const counts = new Float32Array(V);
    tokens.forEach(t => { counts[vocabIdx[t]]++; });
    const total = tokens.length || 1;
    for (let i = 0; i < V; i++) counts[i] /= total;
    return counts;
  });

  // IDF
  const df = new Float32Array(V);
  tf.forEach(row => { for (let i = 0; i < V; i++) { if (row[i] > 0) df[i]++; } });
  const idf = df.map(d => Math.log((N + 1) / (d + 1)) + 1);

  // TF-IDF
  const tfidf = tf.map(row => {
    const v = new Float32Array(V);
    for (let i = 0; i < V; i++) v[i] = row[i] * idf[i];
    return v;
  });

  return { tfidf, vocab, vocabIdx, idf };
}

// ─── 3. Cosine distance ───────────────────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function cosineDist(a, b) { return 1 - cosineSim(a, b); }

// ─── 4. DBSCAN ────────────────────────────────────────────────────────────────
function dbscan(vectors, epsilon, minPts) {
  const n       = vectors.length;
  const labels  = new Int32Array(n).fill(-2);  // -2 = unvisited, -1 = noise
  let   cluster = 0;

  function regionQuery(idx) {
    const neighbours = [];
    for (let j = 0; j < n; j++) {
      if (j !== idx && cosineDist(vectors[idx], vectors[j]) <= epsilon) neighbours.push(j);
    }
    return neighbours;
  }

  function expandCluster(idx, neighbours, c) {
    labels[idx] = c;
    let i = 0;
    while (i < neighbours.length) {
      const q = neighbours[i];
      if (labels[q] === -2) {                    // unvisited
        labels[q] = c;
        const qNeighbours = regionQuery(q);
        if (qNeighbours.length >= minPts) neighbours.push(...qNeighbours);
      } else if (labels[q] === -1) {             // noise → now border point
        labels[q] = c;
      }
      i++;
    }
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2) continue;             // already processed
    const neighbours = regionQuery(i);
    if (neighbours.length < minPts) {
      labels[i] = -1;                           // noise
    } else {
      expandCluster(i, neighbours, cluster);
      cluster++;
    }
  }

  return Array.from(labels);
}

// ─── 5. Cluster label inference ───────────────────────────────────────────────
// Inspect top TF-IDF terms of each cluster centroid and map to a style name.

const STYLE_SIGNALS = {
  "Formal / Professional": ["professional","authoritative","sophisticated","distinguished",
    "formal","structured","objective","precise","refined","expert","eloquent"],
  "Casual / Social":       ["love","awesome","vibe","mood","totally","super","hey","wow",
    "cool","lol","omg","epic","literally","amazing","fun","great","cute"],
  "Poetic / Lyrical":      ["whisper","dream","glow","shimmer","echo","soul","eternal",
    "dance","breathe","gentle","golden","twilight","radiant","bloom","tender","embrace"],
  "Journalistic":          ["report","confirmed","announced","according","source","official",
    "revealed","statement","incident","investigation","event","breaking","update"],
  "Descriptive / Technical":["feature","structure","design","system","detail","precise",
    "composed","element","layer","technique","method","component","analysis"],
};

function inferClusterLabel(centroid, vocab) {
  // Top 20 terms by TF-IDF weight in centroid
  const ranked = centroid
    .map((v, i) => ({ term: vocab[i], score: v }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(x => x.term);

  let best = "Mixed / General", bestScore = 0;
  for (const [label, signals] of Object.entries(STYLE_SIGNALS)) {
    const score = signals.filter(s => ranked.includes(s)).length;
    if (score > bestScore) { bestScore = score; best = label; }
  }
  return best;
}

// ─── 6. Public API ────────────────────────────────────────────────────────────

export const CLUSTER_META = {
  "Formal / Professional":    { color: "text-blue-400",    border: "border-blue-500/30",    bg: "bg-blue-500/10",    emoji: "🎩" },
  "Casual / Social":          { color: "text-green-400",   border: "border-green-500/30",   bg: "bg-green-500/10",   emoji: "😊" },
  "Poetic / Lyrical":         { color: "text-pink-400",    border: "border-pink-500/30",    bg: "bg-pink-500/10",    emoji: "🌸" },
  "Journalistic":             { color: "text-yellow-400",  border: "border-yellow-500/30",  bg: "bg-yellow-500/10",  emoji: "📰" },
  "Descriptive / Technical":  { color: "text-cyan-400",    border: "border-cyan-500/30",    bg: "bg-cyan-500/10",    emoji: "⚙️" },
  "Mixed / General":          { color: "text-purple-400",  border: "border-purple-500/30",  bg: "bg-purple-500/10",  emoji: "✦"  },
  "Noise / Outlier":          { color: "text-muted-foreground", border: "border-border",    bg: "bg-muted/30",       emoji: "◌"  },
};

/**
 * clusterCaptions(captions, options?)
 *
 * @param captions  Array of caption objects with at least { id, caption_text }
 * @param options   { epsilon?: number, minPts?: number }
 *                  epsilon  — cosine-distance threshold (default 0.55)
 *                  minPts   — min neighbours to be a core point (default 2)
 *
 * @returns  Array of the same caption objects, each extended with:
 *           { clusterId: number (-1 = noise), clusterLabel: string, clusterMeta: object }
 *           Plus a top-level `clusterSummary` Map: clusterId → { label, meta, count }
 */
export function clusterCaptions(captions, { epsilon = 0.55, minPts = 2 } = {}) {
  if (!captions || captions.length === 0) return { captions: [], clusterSummary: new Map() };

  // Need at least 2 captions for meaningful clustering
  if (captions.length === 1) {
    const meta = CLUSTER_META["Mixed / General"];
    return {
      captions: [{ ...captions[0], clusterId: 0, clusterLabel: "Mixed / General", clusterMeta: meta }],
      clusterSummary: new Map([[0, { label: "Mixed / General", meta, count: 1 }]]),
    };
  }

  const texts       = captions.map(c => c.caption_text || "");
  const { tfidf, vocab } = buildTfIdf(texts);
  const labels      = dbscan(tfidf, epsilon, minPts);

  // Compute centroids per cluster
  const clusterVecs = {};
  labels.forEach((cId, i) => {
    if (cId < 0) return;
    if (!clusterVecs[cId]) clusterVecs[cId] = new Float32Array(vocab.length);
    for (let j = 0; j < vocab.length; j++) clusterVecs[cId][j] += tfidf[i][j];
  });

  // Infer human label per cluster
  const clusterLabels = {};
  // Track used labels to avoid duplicates across clusters
  const usedLabels = new Set();
  for (const [cId, centroid] of Object.entries(clusterVecs)) {
    let label = inferClusterLabel(centroid, vocab);
    // If label already taken, fall back to "Mixed / General" with a suffix
    if (usedLabels.has(label)) label = `Mixed / General`;
    usedLabels.add(label);
    clusterLabels[cId] = label;
  }

  // Build cluster summary
  const clusterSummary = new Map();
  const countMap = {};
  labels.forEach(cId => { countMap[cId] = (countMap[cId] || 0) + 1; });

  for (const [cId, label] of Object.entries(clusterLabels)) {
    const meta = CLUSTER_META[label] || CLUSTER_META["Mixed / General"];
    clusterSummary.set(Number(cId), { label, meta, count: countMap[cId] || 0 });
  }
  // Noise entry
  if (countMap[-1] > 0) {
    clusterSummary.set(-1, {
      label: "Noise / Outlier",
      meta:  CLUSTER_META["Noise / Outlier"],
      count: countMap[-1],
    });
  }

  // Annotate each caption
  const annotated = captions.map((c, i) => {
    const cId   = labels[i];
    const label = cId === -1 ? "Noise / Outlier" : (clusterLabels[cId] || "Mixed / General");
    const meta  = CLUSTER_META[label] || CLUSTER_META["Mixed / General"];
    return { ...c, clusterId: cId, clusterLabel: label, clusterMeta: meta };
  });

  return { captions: annotated, clusterSummary };
}