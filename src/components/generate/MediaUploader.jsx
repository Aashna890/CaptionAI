import React, { useCallback } from "react";
import { Upload, X, Loader2, Image, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { uploadFile } from "@/api/geminiClient";

function getMediaType(file) {
  if (file.type.startsWith("video/")) return "video";
  return "image";
}

export default function MediaUploader({
  mediaUrl,
  mediaType,
  setMediaUrl,
  setMediaType,
  isUploading,
  setIsUploading,
}) {
  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setIsUploading(true);
      const type = getMediaType(file);
      const { file_url } = await uploadFile({ file });
      setMediaUrl(file_url);
      setMediaType(type);
      setIsUploading(false);
    },
    [setMediaUrl, setMediaType, setIsUploading]
  );

  const handleFileChange = useCallback(
    (e) => {
      handleFile(e.target.files?.[0]);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const handleClear = () => {
    setMediaUrl("");
    setMediaType("image");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-space font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        1. Upload Media
      </h3>

      <AnimatePresence mode="wait">
        {mediaUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-video"
          >
            {mediaType === "video" ? (
              <video src={mediaUrl} controls className="w-full h-full object-cover" />
            ) : (
              <img src={mediaUrl} alt="Uploaded media" className="w-full h-full object-cover" />
            )}

            {/* Type badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border text-xs font-medium">
              {mediaType === "video" ? (
                <>
                  <Film className="w-3 h-3 text-cyan-400" />
                  <span className="text-cyan-400">Video</span>
                </>
              ) : (
                <>
                  <Image className="w-3 h-3 text-primary" />
                  <span className="text-primary">Image</span>
                </>
              )}
            </div>

            <Button
              variant="secondary"
              size="icon"
              className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.label
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center gap-4 p-10 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 cursor-pointer transition-colors group"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Processing…</p>
              </>
            ) : (
              <>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Image className="w-6 h-6 text-primary" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    <Film className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Drop an image or video</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">PNG, JPG, GIF, MP4, MOV, WebM</p>
                </div>
              </>
            )}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
}