import React, { useState } from "react";
import { Film, ChevronDown, ChevronUp, Tag, Palette, Zap, MessageSquare, AlignLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const motionColors = {
  static: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  moderate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  dynamic: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function VideoAnalysisCard({ context }) {
  const [expanded, setExpanded] = useState(false);

  if (!context) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-cyan-500/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <Film className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Video Analysis Complete</p>
            <p className="text-xs text-muted-foreground">Temporal context extracted — click to review</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs border ${motionColors[context.motion_level] || "bg-muted text-muted-foreground"}`}>
            {context.motion_level}
          </Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/50">
              {/* Summary */}
              <div className="pt-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{context.overall_summary}</p>
              </div>

              {/* Scenes */}
              {context.scenes?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Film className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Scenes</span>
                  </div>
                  <div className="space-y-1.5">
                    {context.scenes.map((scene, i) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <span className="text-xs text-cyan-400 font-mono mt-0.5 shrink-0">S{i + 1}</span>
                        <span className="text-muted-foreground">{scene}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects + Mood */}
              <div className="grid grid-cols-2 gap-4">
                {context.subjects?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subjects</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {context.subjects.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mood</span>
                  </div>
                  <p className="text-sm text-foreground">{context.mood}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{context.dominant_colors}</p>
                  </div>
                </div>
              </div>

              {/* Spoken content */}
              {context.spoken_content && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">Spoken Content</span>
                  </div>
                  <p className="text-sm text-foreground italic">"{context.spoken_content}"</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}