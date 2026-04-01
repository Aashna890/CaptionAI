import React from "react";
import { gemini } from "../api/geminiclient";
import { useQuery } from "@tanstack/react-query";
import { Copy, Trash2, Image, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function History() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: captions, isLoading } = useQuery({
    queryKey: ["captions"],
    queryFn: () => gemini.entities.Caption.list("-created_date", 50),
    initialData: [],
  });

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
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-space font-bold text-3xl md:text-4xl">Caption History</h1>
            <p className="text-muted-foreground mt-2">
              Browse and manage your previously generated captions.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <div className="grid gap-4">
            {captions.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:bg-card/80 transition-colors"
              >
                {item.media_url && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0">
                    <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                    {item.caption_text}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopy(item.caption_text)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}