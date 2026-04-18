import React, { useState } from "react";
import { Loader2, Brain, ChevronDown, ChevronUp, Check, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { MOOD_COLORS } from "@/lib/moodDetector";

const MOOD_ICONS = {
  "Positive":     "☀️",
  "Energetic":    "⚡",
  "Dark / Moody": "🌑",
  "Neutral":      "🌫️",
};

// PCA axis labels for 3-component and 6-component models
const PCA_AXIS_LABELS_3 = [
  "PC1 Luminance + Warmth",
  "PC2 Vibrancy",
  "PC3 Contrast/Tension",
];

const PCA_AXIS_LABELS_6 = [
  "PC1 Luminance + Warmth",
  "PC2 Vibrancy",
  "PC3 Contrast/Tension",
  "PC4 Hue Spread",
  "PC5 Warm/Cool Balance",
  "PC6 Saturation Depth",
];

function getPcaLabels(vec) {
  if (!vec) return [];
  if (vec.length <= 3) return PCA_AXIS_LABELS_3.slice(0, vec.length);
  return PCA_AXIS_LABELS_6.slice(0, vec.length);
}

export default function MoodDetectorBadge({ result, isDetecting, applied }) {
  const [expanded, setExpanded] = useState(false);

  if (!isDetecting && !result) return null;

  const modelLabel = result?.isUserTrained
    ? `Trained on ${result.trainedOn?.toLocaleString()} samples · ${result.modelAccuracy}% accuracy`
    : "Using built-in defaults — run train_mood_model.py for better accuracy";

  const pcaLabels = getPcaLabels(result?.pcaVec);
  const nPca = result?.pcaVec?.length ?? 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3.5">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {isDetecting
            ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
            : <Brain className="w-4 h-4 text-primary" />}
        </div>

        <div className="flex-1 min-w-0">
          {isDetecting ? (
            <p className="text-sm font-medium text-foreground">Analysing image mood…</p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">Mood detected:</span>
              <Badge
                variant="outline"
                className={`text-xs font-semibold border ${MOOD_COLORS[result?.mood]}`}
              >
                {MOOD_ICONS[result?.mood]} {result?.mood}
              </Badge>
              {result?.isUserTrained && (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1">
                  <FlaskConical className="w-2.5 h-2.5" />
                  Trained model
                </Badge>
              )}
              {applied && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <Check className="w-3 h-3" /> Tone applied
                </span>
              )}
            </div>
          )}
          {!isDetecting && result && (
            <p className="text-xs text-muted-foreground mt-0.5">
              PCA({nPca}) + SVM · {Math.round(result.confidence * 100)}% confidence · tone → {result.tone}%
            </p>
          )}
        </div>

        {!isDetecting && result && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-4">

              {/* SVM scores */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  SVM Decision Scores
                </p>
                {Object.entries(result.scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([mood, prob]) => (
                    <div key={mood} className="flex items-center gap-2">
                      <span className="text-xs w-28 text-muted-foreground shrink-0">
                        {MOOD_ICONS[mood]} {mood}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${prob * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            mood === result.mood
                              ? "bg-gradient-to-r from-primary to-accent"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                      </div>
                      <span className={`text-xs w-8 text-right ${
                        mood === result.mood ? "text-primary font-semibold" : "text-muted-foreground"
                      }`}>
                        {Math.round(prob * 100)}%
                      </span>
                    </div>
                  ))}
              </div>


              {/* Model info */}
              <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                <FlaskConical className="w-3 h-3 shrink-0" />
                {modelLabel}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}