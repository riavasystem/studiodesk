"use client";

import { motion } from "framer-motion";

export default function CtaFooter() {
  return (
    <footer className="relative px-6 py-28 md:px-12 md:py-36">
      <div className="mx-auto max-w-4xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-semibold tracking-tight text-white sm:text-5xl"
        >
          Tu próxima presentación merece precisión.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-10"
        >
          <a
            href="/registro"
            className="inline-block rounded-full bg-orange-500 px-8 py-3.5 text-sm font-medium text-black transition hover:bg-orange-400"
          >
            Crear cuenta gratis
          </a>
        </motion.div>
      </div>

      <div className="mx-auto mt-28 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row">
        <span className="font-mono tracking-[0.2em] uppercase">StudioDesk</span>
        <span>© {new Date().getFullYear()} Riava. Todos los derechos reservados.</span>
      </div>
    </footer>
  );
}
