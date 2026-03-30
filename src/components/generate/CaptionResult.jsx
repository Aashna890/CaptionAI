import React from "react";
import { Copy, Check, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

export default function CaptionResult({ caption, onSave, onRegenerate, isSaving }) {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!caption) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h3 className="font-space font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        3. Your Caption
      </h3>

      <div className="relative p-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <p className="text-foreground leading-relaxed font-inter text-base whitespace-pre-wrap">
          {caption}
        </p>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={onRegenerate}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Regenerate
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 ml-auto"
            onClick={onSave}
            disabled={isSaving}
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>
      </div>
    </motion.div>
  );
}