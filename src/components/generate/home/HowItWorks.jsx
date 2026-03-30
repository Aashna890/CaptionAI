import React from "react";
import { Upload, SlidersHorizontal, Brain, FileText } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Upload,
    title: "Upload Media",
    description: "Drop an image, and our ML models extract visual features — objects, scenes, emotions.",
    gradient: "from-purple-500 to-blue-500",
  },
  {
    icon: SlidersHorizontal,
    title: "Set Preferences",
    description: "Adjust fuzzy sliders for tone, length, and style. \"Somewhat formal\" is a perfectly valid input.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Brain,
    title: "Fuzzy Inference",
    description: "Our fuzzy logic engine converts your vague preferences into precise parameters for caption generation.",
    gradient: "from-cyan-500 to-green-500",
  },
  {
    icon: FileText,
    title: "Tailored Caption",
    description: "Get a caption perfectly adapted to your preferences — ready for any platform or purpose.",
    gradient: "from-green-500 to-yellow-500",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-space font-bold text-3xl md:text-4xl">How It Works</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            From upload to tailored caption in four intelligent steps
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors group"
            >
              <div className="text-xs font-mono text-muted-foreground mb-4">0{idx + 1}</div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}>
                <step.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-space font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}