"use client";

import { motion } from "framer-motion";
import HeroSceneLoader from "./hero-scene-loader";

export default function Hero() {
  return (
    <section className="relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden border-b border-white/10">
      <HeroSceneLoader />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-background" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="font-mono text-sm tracking-[0.3em] text-white/80 uppercase">
          StudioDesk
        </span>
        <a
          href="/login"
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/80 transition hover:border-orange-400/60 hover:text-white"
        >
          Ingresar
        </a>
      </nav>

      <div className="relative z-10 flex flex-1 flex-col justify-end px-6 pb-20 md:px-12 md:pb-28">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-4 font-mono text-xs tracking-[0.35em] text-orange-400 uppercase"
        >
          Multitrack Playback / Live Performance
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-4xl text-5xl leading-[1.02] font-semibold tracking-tight text-white sm:text-6xl md:text-7xl"
        >
          Cada instrumento,
          <br />
          bajo tu control.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-6 max-w-xl text-lg text-white/60"
        >
          La plataforma profesional para reproducir y mezclar pistas multipista en
          vivo. Volumen, solo, mute y sincronización perfecta — para bandas,
          iglesias y producciones que no pueden fallar en el escenario.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <a
            href="/registro"
            className="rounded-full bg-orange-500 px-7 py-3 text-sm font-medium text-black transition hover:bg-orange-400"
          >
            Empezar ahora
          </a>
          <a
            href="#producto"
            className="rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Ver el producto
          </a>
        </motion.div>
      </div>
    </section>
  );
}
