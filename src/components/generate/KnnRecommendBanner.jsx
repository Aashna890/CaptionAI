import React from "react";
import { Brain, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function KnnRecommendBanner({ recommendation, onApply, onDismiss }) {
  if (!recommendation) return null;

  const confidencePct = Math.round(recommendation.confidence * 100);
  const confidenceColor =
    confidencePct >= 70 ? "text-green-400" :
    confidencePct >= 40 ? "text-yellow-400" :
    "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <Brain className="w-4 h-4 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">KNN Recommendation</p>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">ML</Badge>
            <span className={`text-xs font-medium ${confidenceColor}`}>
              {confidencePct}% confidence
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on your {recommendation.neighborCount} saved captions · {recommendation.k} nearest neighbors
          </p>

          {/* Suggested chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            <SuggestChip label="Tone"     value={`${recommendation.tone}%`} />
            <SuggestChip label="Length"   value={`${recommendation.length_pref}%`} />
            <SuggestChip label="Style"    value={recommendation.style} capitalize />
            <SuggestChip label="Platform" value={recommendation.platform.replace(/_/g, " ")} capitalize />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="gap-1 bg-primary hover:bg-primary/90 text-xs h-8"
            onClick={onApply}
          >
            Apply
            <ChevronRight className="w-3 h-3" />
          </Button>
          {onDismiss && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SuggestChip({ label, value, capitalize }) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-medium text-foreground ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}