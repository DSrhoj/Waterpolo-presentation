import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { pathToFileUrlHref } from "@/utils/electronApi";
import type { SponsorAnimationProps } from "./SponsorSlideCarousel";

function useSponsorImageSrc(imagePath: string): string {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!imagePath.trim()) {
        setSrc("");
        return;
      }
      if (imagePath.startsWith("file:") || imagePath.startsWith("http")) {
        setSrc(imagePath);
        return;
      }
      const api = window.electronAPI;
      if (!api?.getImagePath) {
        setSrc("");
        return;
      }
      try {
        const abs = await api.getImagePath(imagePath);
        if (cancelled) return;
        setSrc(abs ? pathToFileUrlHref(abs) : "");
      } catch {
        if (!cancelled) setSrc("");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  return src;
}

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HOLD_MS = 3500;
const TRANSITION_MS = 600;

const cardVariants: Variants = {
  enter: {
    opacity: 0,
    scale: 1.06,
  },
  center: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: TRANSITION_MS / 1000,
      ease: easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: TRANSITION_MS / 1000,
      ease: [0.7, 0, 0.84, 0],
    },
  },
};

const logoVariants: Variants = {
  enter: { opacity: 0, y: 16 },
  center: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.15, duration: 0.6, ease: easeOutExpo },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const nameVariants: Variants = {
  enter: { opacity: 0, y: 12 },
  center: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.3, duration: 0.5, ease: easeOutExpo },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const lineVariants: Variants = {
  enter: { scaleX: 0 },
  center: {
    scaleX: 1,
    transition: { delay: 0.35, duration: 0.45, ease: easeOutExpo },
  },
  exit: { scaleX: 0, transition: { duration: 0.1 } },
};

function FullscreenCard({
  name,
  imagePath,
}: {
  name: string;
  imagePath: string;
}) {
  const src = useSponsorImageSrc(imagePath);

  return (
    <>
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(255,255,255,0.04) 0%, transparent 65%)",
        }}
      />

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Logo */}
      <motion.div
        className="relative z-10 flex min-h-0 w-[80%] flex-1 items-center justify-center overflow-hidden"
        variants={logoVariants}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="size-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex size-[180px] items-center justify-center text-sm text-white/20">
            No image
          </div>
        )}
      </motion.div>

      {/* Accent line */}
      <motion.div
        className="relative z-10 mt-5 h-[2px] w-[120px] origin-center"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.25) 70%, transparent)",
        }}
        variants={lineVariants}
      />

      {/* Name */}
      <motion.h2
        className="relative z-10 mt-4 max-w-[80%] text-center text-[24px] font-black uppercase leading-tight tracking-[0.14em] text-white"
        style={{
          textShadow:
            "0 0 20px rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.5)",
        }}
        variants={nameVariants}
      >
        {name}
      </motion.h2>
    </>
  );
}

export function SponsorFullscreen({
  sponsors,
  isVisible,
  onComplete,
}: SponsorAnimationProps) {
  const [index, setIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [runCycle, setRunCycle] = useState(isVisible);
  const exitDoneRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible) {
      setRunCycle(true);
      exitDoneRef.current = false;
    }
  }, [isVisible]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!runCycle || !isVisible || sponsors.length === 0) {
      clearTimer();
      return;
    }

    const advance = () => {
      setIndex((i) => (i + 1) % sponsors.length);
      setCycleKey((k) => k + 1);
      timeoutRef.current = setTimeout(advance, TRANSITION_MS * 2 + HOLD_MS);
    };

    timeoutRef.current = setTimeout(advance, TRANSITION_MS + HOLD_MS);

    return () => clearTimer();
  }, [runCycle, isVisible, sponsors.length, clearTimer]);

  useEffect(() => {
    if (!isVisible) {
      clearTimer();
      setRunCycle(false);
    }
  }, [isVisible, clearTimer]);

  const handleExitDone = () => {
    if (!isVisible && !exitDoneRef.current) {
      exitDoneRef.current = true;
      onComplete?.();
    }
  };

  const sponsor = sponsors[index];

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-[#04080e]"
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={(def) => {
        const d = def as { opacity?: number };
        if (!isVisible && d.opacity === 0) handleExitDone();
      }}
    >
      {sponsors.length > 0 && runCycle && sponsor && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${sponsor.name}-${index}-${cycleKey}`}
            className="absolute inset-0 flex flex-col items-center px-6 pb-6 pt-10"
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <FullscreenCard name={sponsor.name} imagePath={sponsor.imagePath} />
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}

export default SponsorFullscreen;
