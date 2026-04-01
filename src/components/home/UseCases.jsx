import React from "react";
import { Accessibility, Instagram, Newspaper, Building2 } from "lucide-react";
import { motion } from "framer-motion";

const cases = [
  {
    icon: Accessibility,
    title: "Accessibility",
    desc: "Auto-generate descriptive alt-text for visually impaired users in their preferred reading style.",
  },
  {
    icon: Instagram,
    title: "Content Creators",
    desc: "Get platform-specific captions instantly — Instagram vs LinkedIn vs Twitter, each with the right tone.",
  },
  {
    icon: Newspaper,
    title: "News & Media",
    desc: "Produce journalistic photo captions at scale — informative, objective, and consistent.",
  },
  {
    icon: Building2,
    title: "Enterprise",
    desc: "Caption thousands of media files automatically without a human editor.",
  },
];

export default function UseCases() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-space font-bold text-3xl md:text-4xl">Why This Matters</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Real-world applications where intelligent captioning makes a difference
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {cases.map((c, idx) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className="flex gap-4 p-6 rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <c.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-space font-semibold text-lg">{c.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}