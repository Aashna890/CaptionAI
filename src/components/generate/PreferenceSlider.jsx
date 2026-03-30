import React from "react";
import { Slider } from "@/components/ui/slider";

export default function PreferenceSlider({ label, leftLabel, rightLabel, value, onChange, icon: Icon }) {
  const getFuzzyLabel = () => {
    if (value < 20) return leftLabel;
    if (value < 40) return `Slightly ${leftLabel.toLowerCase()}`;
    if (value < 60) return "Balanced";
    if (value < 80) return `Moderately ${rightLabel.toLowerCase()}`;
    return rightLabel;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {getFuzzyLabel()}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={100}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}