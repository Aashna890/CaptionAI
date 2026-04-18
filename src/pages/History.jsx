import React, { useMemo, useState } from "react";
import { gemini } from "../api/geminiclient";
import { useQuery } from "@tanstack/react-query";
import { Copy, Trash2, Clock, Loader2, Layers, GitBranch, Info, Film, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { clusterCaptions, CLUSTER_META } from "../lib/dbscan";

// ─── Cluster filter tab ───────────────────────────────────────────────────────
function ClusterTab({ label, meta, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
        ${active
          ? `${meta.bg} ${meta.border} ${meta.color}`
          : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
        }`}
    >
      <span>{meta.emoji}</span>
      <span>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-full text-xs ${active ? "bg-background/40" : "bg-muted"}`}>
        {count}
      </span>
    </button>
  );
}

// ─── DBSCAN explainer tooltip ─────────────────────────────────────────────────
function DbscanInfo({ clusterSummary }) {
  const [open, setOpen] = useState(false);
  const totalNoise = clusterSummary.get(-1)?.count || 0;
  const totalClusters = [...clusterSummary.keys()].filter(k => k >= 0).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <GitBranch className="w-3.5 h-3.5" />
        <span>DBSCAN clustering</span>
        <Info className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute left-0 top-7 z-50 w-72 p-4 rounded-xl border border-border bg-card shadow-xl space-y-2 text-xs"
          >
            <p className="font-semibold text-foreground">How DBSCAN works here</p>
            <p className="text-muted-foreground leading-relaxed">
              Each caption is converted into a <span className="text-primary font-medium">TF-IDF vector</span> — a mathematical
              representation of its vocabulary weighted by how rare each word is across all your captions.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="text-primary font-medium">Cosine distance</span> measures how different two captions are
              in style. DBSCAN groups captions whose cosine distance is below ε = 0.55 into the same cluster.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Captions that don't fit any dense group are labelled <span className="text-muted-foreground font-medium">Noise / Outlier</span> — unique one-off styles.
            </p>
            <div className="pt-2 border-t border-border flex gap-4 text-muted-foreground">
              <span>Clusters found: <strong className="text-foreground">{totalClusters}</strong></span>
              <span>Outliers: <strong className="text-foreground">{totalNoise}</strong></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Cluster overview bar ─────────────────────────────────────────────────────
function ClusterOverviewBar({ clusterSummary, total }) {
  const segments = [...clusterSummary.entries()]
    .filter(([id]) => id >= 0)
    .map(([, info]) => info);
  const noiseCount = clusterSummary.get(-1)?.count || 0;

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full rounded-full overflow-hidden gap-px">
        {segments.map((info, i) => (
          <motion.div
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${(info.count / total) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
            className={`h-full ${info.meta.bg} border-r border-background last:border-r-0`}
            style={{ minWidth: info.count > 0 ? "4px" : 0 }}
          />
        ))}
        {noiseCount > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(noiseCount / total) * 100}%` }}
            transition={{ duration: 0.6, delay: segments.length * 0.08, ease: "easeOut" }}
            className="h-full bg-muted/60"
            style={{ minWidth: "4px" }}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map((info, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${info.meta.bg} border ${info.meta.border}`} />
            <span>{info.meta.emoji} {info.label}</span>
            <span className="font-medium text-foreground">{Math.round((info.count / total) * 100)}%</span>
          </div>
        ))}
        {noiseCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted border border-border" />
            <span>◌ Outliers</span>
            <span className="font-medium text-foreground">{Math.round((noiseCount / total) * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main History page ────────────────────────────────────────────────────────
export default function History() {
  const { toast }      = useToast();
  const queryClient    = useQueryClient();
  const [activeCluster, setActiveCluster] = useState("all");   // "all" | clusterId (number)

  const { data: rawCaptions, isLoading } = useQuery({
    queryKey: ["captions"],
    queryFn:  () => gemini.entities.Caption.list("-created_date", 50),
    initialData: [],
  });

  // Run DBSCAN whenever captions change
  const { captions, clusterSummary } = useMemo(
    () => clusterCaptions(rawCaptions, { epsilon: 0.55, minPts: 2 }),
    [rawCaptions]
  );

  // Filter view
  const visibleCaptions = useMemo(() => {
    if (activeCluster === "all") return captions;
    return captions.filter(c => c.clusterId === activeCluster);
  }, [captions, activeCluster]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleDelete = async (id) => {
    await gemini.entities.Caption.delete(id);
    queryClient.invalidateQueries({ queryKey: ["captions"] });
    toast({ title: "Caption deleted" });
  };

  return (
    <div className="min-h-screen pb-20">

      {/* ── Page header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-space font-bold text-3xl md:text-4xl">Caption History</h1>
            <p className="text-muted-foreground mt-2">
              Browse and manage your captions — automatically clustered by writing style.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── DBSCAN cluster panel (only when captions exist) ── */}
        {!isLoading && captions.length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl border border-border bg-card space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Style Clusters</span>
                <span className="text-xs text-muted-foreground">
                  — {[...clusterSummary.keys()].filter(k => k >= 0).length} groups found in {captions.length} captions
                </span>
              </div>
              <DbscanInfo clusterSummary={clusterSummary} />
            </div>

            {/* Proportional bar */}
            <ClusterOverviewBar clusterSummary={clusterSummary} total={captions.length} />

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 pt-1">
              <ClusterTab
                label="All"
                meta={{ emoji: "◈", bg: activeCluster === "all" ? "bg-primary/10" : "bg-muted/30", border: activeCluster === "all" ? "border-primary/30" : "border-border", color: "text-primary" }}
                count={captions.length}
                active={activeCluster === "all"}
                onClick={() => setActiveCluster("all")}
              />
              {[...clusterSummary.entries()].map(([cId, info]) => (
                <ClusterTab
                  key={cId}
                  label={info.label}
                  meta={info.meta}
                  count={info.count}
                  active={activeCluster === cId}
                  onClick={() => setActiveCluster(cId === activeCluster ? "all" : cId)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Main content ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>

        ) : captions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Clock className="w-9 h-9 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No captions yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Generate your first caption to see it here
            </p>
          </div>

        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-3">
              {visibleCaptions.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex gap-4 p-4 rounded-xl border bg-card hover:bg-card/80 transition-colors
                    ${item.clusterMeta ? item.clusterMeta.border : "border-border"}`}
                >
                  {/* Thumbnail — shows compressed preview or a media-type placeholder */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0 bg-muted flex items-center justify-center">
                    {item.media_url ? (
                      <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                        {item.media_type === "video"
                          ? <Film className="w-7 h-7" />
                          : <ImageIcon className="w-7 h-7" />
                        }
                        <span className="text-[10px]">{item.media_type || "image"}</span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                      {item.caption_text}
                    </p>

                    {/* Badge row */}
                    <div className="flex items-center gap-2 flex-wrap">

                      {/* ── DBSCAN cluster badge ── */}
                      {item.clusterLabel && item.clusterMeta && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border
                          ${item.clusterMeta.bg} ${item.clusterMeta.border} ${item.clusterMeta.color}`}
                        >
                          {item.clusterMeta.emoji}
                          {item.clusterLabel}
                          {item.clusterId === -1 && (
                            <span className="font-normal opacity-70 ml-0.5">· outlier</span>
                          )}
                        </span>
                      )}

                      {/* Existing style + platform badges */}
                      {item.style && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {item.style}
                        </Badge>
                      )}
                      {item.platform && item.platform !== "general" && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.platform.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {item.created_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => handleCopy(item.caption_text)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* ── Filter empty state ── */}
        {!isLoading && captions.length > 0 && visibleCaptions.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No captions in this cluster.
          </div>
        )}

      </div>
    </div>
  );
}