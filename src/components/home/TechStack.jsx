import React from "react";
import { Eye, Brain, Cpu } from "lucide-react";
import { motion } from "framer-motion";

const techs = [
  {
    icon: Eye,
    title: "ML Perception",
    subtitle: "The Visual Brain",
    items: ["CNN / CLIP for image understanding", "Scene, object, and emotion detection", "BLIP-2 / LLaVA for draft captions"],
    color: "text-purple-400",
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
  },
  {
    icon: Brain,
    title: "Fuzzy Logic",
    subtitle: "The Preference Brain",
    items: ["Handles human vagueness naturally", "Maps soft preferences to precise params", "Continuous membership functions"],
    color: "text-cyan-400",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/5",
  },
  {
    icon: Cpu,
    title: "Generation",
    subtitle: "The Output Engine",
    items: ["LLM-powered caption refinement", "Platform-specific formatting", "Style & tone adaptation"],
    color: "text-green-400",
    border: "border-green-500/20",
    bg: "bg-green-500/5",
  },
];

export default function TechStack() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-space font-bold text-3xl md:text-4xl">Two Core Technologies</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Machine Learning sees. Fuzzy Logic understands how you want it described.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {techs.map((tech, idx) => (
            <motion.div
              key={tech.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-2xl border ${tech.border} ${tech.bg} backdrop-blur-sm`}
            >
              <tech.icon className={`w-8 h-8 ${tech.color} mb-4`} />
              <h3 className="font-space font-bold text-xl">{tech.title}</h3>
              <p className={`text-sm ${tech.color} mb-4`}>{tech.subtitle}</p>
              <ul className="space-y-2">
                {tech.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${tech.color.replace("text-", "bg-")} shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}