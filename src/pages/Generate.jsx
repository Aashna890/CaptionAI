import React, { useState } from "react";
import { Sparkles, Loader2, Film, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { gemini } from "../api/geminiclient";
import { motion, AnimatePresence } from "framer-motion";
import MediaUploader from "../components/generate/MediaUploader";
import PreferencePanel from "../components/generate/PreferencePanel";
import CaptionResult from "../components/generate/CaptionResult";
import VideoAnalysisCard from "../components/generate/VideoAnalysisCard";
import { buildPromptFromPreferences } from "../lib/fuzzyEngine";
import { analyzeVideo } from "../lib/videoAnalyzer";

// Pipeline step: null | "uploading" | "analyzing" | "generating"
const STEP_LABELS = {
  analyzing: { label: "Analyzing video...", sub: "Extracting scenes, subjects & audio context" },
  generating: { label: "Generating caption...", sub: "Applying fuzzy preference mapping" },
};

export default function Generate() {
  const { toast } = useToast();
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [isUploading, setIsUploading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(null); // "analyzing" | "generating"
  const [isSaving, setIsSaving] = useState(false);
  const [caption, setCaption] = useState("");
  const [videoContext, setVideoContext] = useState(null);
  const [preferences, setPreferences] = useState({
    tone: 50,
    length_pref: 50,
    style: "factual",
    platform: "general",
  });

  const isProcessing = pipelineStep !== null;

  const handleGenerate = async () => {
    if (!mediaUrl) {
      toast({ title: `Please upload a ${mediaType} first`, variant: "destructive" });
      return;
    }

    setCaption("");
    let ctx = videoContext;

    // Step 1: For video — run analysis (skip if already done)
    if (mediaType === "video" && !ctx) {
      setPipelineStep("analyzing");
      ctx = await analyzeVideo(mediaUrl);
      setVideoContext(ctx);
    }

    // Step 2: Build fuzzy prompt and generate
    setPipelineStep("generating");
    const prompt = buildPromptFromPreferences(preferences, mediaType === "video" ? ctx : null);

    const result = await gemini.integrations.Core.InvokeLLM({
      prompt,
      // For images, pass the file directly; for video, context is already in the prompt
      ...(mediaType === "image" ? { file_urls: [mediaUrl] } : {}),
    });

    setCaption(result);
    setPipelineStep(null);
  };

  // Re-run only caption step (reuse existing video analysis)
  const handleRegenerate = async () => {
    setCaption("");
    setPipelineStep("generating");
    const prompt = buildPromptFromPreferences(preferences, mediaType === "video" ? videoContext : null);
    const result = await gemini.integrations.Core.InvokeLLM({
      prompt,
      ...(mediaType === "image" ? { file_urls: [mediaUrl] } : {}),
    });
    setCaption(result);
    setPipelineStep(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await gemini.entities.Caption.create({
      media_url: mediaUrl,
      media_type: mediaType,
      caption_text: caption,
      tone: preferences.tone,
      length_pref: preferences.length_pref,
      style: preferences.style,
      platform: preferences.platform,
    });
    toast({ title: "Caption saved successfully" });
    setIsSaving(false);
  };

  // Reset video context when a new file is uploaded
  const handleSetMediaUrl = (url) => {
    setMediaUrl(url);
    setVideoContext(null);
    setCaption("");
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-space font-bold text-3xl md:text-4xl">Generate Caption</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Upload an image or video, fine-tune your preferences, and let fuzzy AI craft the perfect caption.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <MediaUploader
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              setMediaUrl={handleSetMediaUrl}
              setMediaType={setMediaType}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />

            <PreferencePanel
              preferences={preferences}
              setPreferences={setPreferences}
            />

            <Button
              onClick={handleGenerate}
              disabled={!mediaUrl || isProcessing || isUploading}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold text-base gap-2 rounded-xl transition-opacity"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mediaType === "video" ? (
                <Film className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isProcessing
                ? STEP_LABELS[pipelineStep]?.label
                : mediaType === "video"
                ? "Analyze & Generate Caption"
                : "Generate Caption"}
            </Button>

            {/* Video pipeline note */}
            {mediaType === "video" && !isProcessing && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground text-center -mt-4"
              >
                Video pipeline: upload → scene extraction → fuzzy caption
              </motion.p>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Processing state */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent opacity-20 animate-pulse" />
                    {pipelineStep === "analyzing"
                      ? <Film className="w-8 h-8 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      : <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    }
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">{STEP_LABELS[pipelineStep]?.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{STEP_LABELS[pipelineStep]?.sub}</p>
                  </div>

                  {/* Step tracker for video */}
                  {mediaType === "video" && (
                    <div className="flex items-center gap-2 mt-2">
                      <PipelineDot active={pipelineStep === "analyzing"} done={pipelineStep === "generating"} label="Analyze" />
                      <div className="w-8 h-px bg-border" />
                      <PipelineDot active={pipelineStep === "generating"} done={false} label="Caption" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video analysis card */}
            {videoContext && !isProcessing && (
              <VideoAnalysisCard context={videoContext} />
            )}

            {/* Caption result */}
            {caption && (
              <CaptionResult
                caption={caption}
                onSave={handleSave}
                onRegenerate={handleRegenerate}
                isSaving={isSaving}
              />
            )}

            {/* Empty state */}
            {!caption && !isProcessing && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="w-9 h-9 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">Your caption will appear here</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {mediaType === "video"
                    ? "Upload a video — we'll extract scenes and generate from context"
                    : "Upload an image and hit generate"}
                </p>
              </div>
            )}

            {/* Fuzzy Logic Parameters */}
            {caption && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 rounded-xl border border-border bg-card"
              >
                <h4 className="font-space font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                  Fuzzy Logic Parameters
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <FuzzyParam label="Tone" value={preferences.tone} color="from-purple-500 to-blue-500" />
                  <FuzzyParam label="Length" value={preferences.length_pref} color="from-blue-500 to-cyan-500" />
                  <FuzzyParam label="Style" value={preferences.style} isText color="from-cyan-500 to-green-500" />
                  <FuzzyParam label="Platform" value={preferences.platform} isText color="from-green-500 to-yellow-500" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FuzzyParam({ label, value, isText, color }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {isText ? (
        <p className="text-sm font-medium text-foreground capitalize">{value.replace(/_/g, " ")}</p>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${color}`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-xs font-medium text-foreground">{value}%</span>
        </div>
      )}
    </div>
  );
}

function PipelineDot({ active, done, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-3 h-3 rounded-full transition-colors ${
        done ? "bg-primary" : active ? "bg-cyan-400 animate-pulse" : "bg-muted"
      }`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}