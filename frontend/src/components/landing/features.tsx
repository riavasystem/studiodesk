"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    label: "01",
    title: "Control por instrumento",
    description:
      "Voz, coros, piano, bajo, guitarra, batería, pads, click y cue — cada pista con su propio volumen, mute y solo, en tiempo real.",
  },
  {
    label: "02",
    title: "Waveforms sincronizados",
    description:
      "Visualiza cada pista con precisión de milisegundos. Nunca pierdas el punto exacto de una presentación en vivo.",
  },
  {
    label: "03",
    title: "Mezclador profesional",
    description:
      "Fade in, fade out, tempo y pitch integrados. La misma sensación de un DAW, pensada para ejecutar, no para producir.",
  },
  {
    label: "04",
    title: "Repertorios listos",
    description:
      "Organiza canciones en playlists y categorías. Encuentra la canción correcta en menos de tres clics, incluso bajo presión.",
  },
];

export default function Features() {
  return (
    <section id="producto" className="relative border-b border-white/10 px-6 py-28 md:px-12 md:py-36">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          No es solo un reproductor. Es tu consola en vivo.
        </motion.h2>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-background p-8 md:p-10"
            >
              <span className="font-mono text-xs text-orange-400">{feature.label}</span>
              <h3 className="mt-4 text-xl font-medium text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
