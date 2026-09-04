"use client";

import { motion } from "framer-motion";

/** Lose gestreute Kreise in den Programmbereichs-Farben — eine Anspielung auf
 *  die Punktwolke im vhs-Zeichen. Flach und randscharf statt weichgezeichnet,
 *  damit es nach vhs aussieht und nicht nach Verlaufstapete. */
const DOTS = [
  { color: "var(--cat-politik)", size: 132, top: "6%", left: "8%" },
  { color: "var(--cat-sprachen)", size: 76, top: "22%", left: "84%" },
  { color: "var(--cat-grundbildung)", size: 30, top: "12%", left: "70%" },
  { color: "var(--cat-gesundheit)", size: 46, top: "74%", left: "14%" },
  { color: "var(--cat-beruf)", size: 96, top: "78%", left: "80%" },
  { color: "var(--cat-kultur)", size: 24, top: "62%", left: "30%" },
];

export const Greeting = () => {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden px-6"
      key="overview"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {DOTS.map((dot, index) => (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="absolute rounded-full"
            initial={{ opacity: 0, scale: 0.6 }}
            key={dot.color}
            style={{
              background: dot.color,
              height: dot.size,
              left: dot.left,
              opacity: 0.16,
              top: dot.top,
              width: dot.size,
            }}
            transition={{
              delay: 0.1 + index * 0.07,
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg text-center">
        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="font-semibold text-3xl text-navy tracking-tight md:text-[2.75rem] md:leading-[1.1]"
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Was willst du in Berlin lernen?
        </motion.h1>
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-[15px] text-muted-foreground md:text-base"
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.42, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Beschreib deine Situation, nicht nur ein Stichwort. Ich durchsuche
          das aktuelle Programm aller zwölf Berliner Volkshochschulen – von
          Mitte bis Marzahn-Hellersdorf – und schlage dir vor, was in deinen
          Alltag passt.
        </motion.p>
      </div>
    </div>
  );
};
