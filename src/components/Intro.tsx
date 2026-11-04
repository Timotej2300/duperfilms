"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./Logo";

const KEY = "df_intro_seen";

/** Intro sa zobrazí iba pri prvej návšteve (a len ak ho používateľ nevypol). */
export function Intro({ enabled = true }: { enabled?: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!enabled || reduce || localStorage.getItem(KEY) || localStorage.getItem("df_intro_off")) return;
      localStorage.setItem(KEY, "1");
      setShow(true);
      const t = setTimeout(() => setShow(false), 2800);
      return () => clearTimeout(t);
    } catch {
      /* localStorage nedostupný – intro preskočíme */
    }
  }, [enabled]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7 } }}
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1.08 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          >
            <Logo size="xl" href={null} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
