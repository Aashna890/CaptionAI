import React from "react";
import { Palette, AlignLeft, Type, Monitor } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PreferenceSlider from "./PreferenceSlider";

const styles = [
  { value: "factual", label: "Factual" },
  { value: "journalistic", label: "Journalistic" },
  { value: "poetic", label: "Poetic" },
  { value: "conversational", label: "Conversational" },
  { value: "academic", label: "Academic" },
];

const platforms = [
  { value: "general", label: "General" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X" },
  { value: "news_article", label: "News Article" },
  { value: "accessibility", label: "Accessibility (Alt-text)" },
];

export default function PreferencePanel({ preferences, setPreferences }) {
  const update = (key, value) => setPreferences((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6">
      <h3 className="font-space font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        2. Set Preferences
      </h3>

      <div className="space-y-6 p-5 rounded-xl border border-border bg-card">
        <PreferenceSlider
          label="Tone"
          leftLabel="Casual"
          rightLabel="Formal"
          value={preferences.tone}
          onChange={(v) => update("tone", v)}
          icon={Palette}
        />

        <div className="h-px bg-border" />

        <PreferenceSlider
          label="Length"
          leftLabel="Concise"
          rightLabel="Detailed"
          value={preferences.length_pref}
          onChange={(v) => update("length_pref", v)}
          icon={AlignLeft}
        />

        <div className="h-px bg-border" />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Writing Style</span>
          </div>
          <Select value={preferences.style} onValueChange={(v) => update("style", v)}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {styles.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Target Platform</span>
          </div>
          <Select value={preferences.platform} onValueChange={(v) => update("platform", v)}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}