import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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

interface TierConfig {
  label: string;
  accentColor: string;
  accentGlow: string;
  textColor: string;
  labelBg: string;
}

const PLATINUM: TierConfig = {
  label: "Platinum Partners",
  accentColor: "#c0c8d8",
  accentGlow: "rgba(192,200,216,0.12)",
  textColor: "rgba(210,218,233,0.8)",
  labelBg:
    "linear-gradient(90deg, transparent, rgba(192,200,216,0.08) 30%, rgba(192,200,216,0.08) 70%, transparent)",
};

const GOLD: TierConfig = {
  label: "Gold Partners",
  accentColor: "#d4a843",
  accentGlow: "rgba(212,168,67,0.12)",
  textColor: "rgba(224,190,100,0.8)",
  labelBg:
    "linear-gradient(90deg, transparent, rgba(212,168,67,0.08) 30%, rgba(212,168,67,0.08) 70%, transparent)",
};

const SILVER: TierConfig = {
  label: "Silver Partners",
  accentColor: "#a0a8b4",
  accentGlow: "rgba(160,168,180,0.10)",
  textColor: "rgba(175,183,195,0.8)",
  labelBg:
    "linear-gradient(90deg, transparent, rgba(160,168,180,0.07) 30%, rgba(160,168,180,0.07) 70%, transparent)",
};

function SponsorTile({
  imagePath,
  delay,
  size = "normal",
}: {
  imagePath: string;
  delay: number;
  size?: "large" | "normal";
}) {
  const src = useSponsorImageSrc(imagePath);
  const tileW = size === "large" ? 220 : 120;
  const logoSize = size === "large" ? 140 : 80;

  return (
    <motion.div
      className="flex shrink-0 items-center justify-center"
      style={{ width: tileW }}
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay, duration: 0.5, ease: easeOutExpo },
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ width: logoSize, height: logoSize }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="size-full rounded-lg bg-white/5" />
        )}
      </div>
    </motion.div>
  );
}

function TierRow({
  sponsors,
  tier,
  direction,
  speed,
  rowDelay,
  tileSize = "normal",
}: {
  sponsors: Array<{ name: string; imagePath: string }>;
  tier: TierConfig;
  direction: "left" | "right";
  speed: number;
  rowDelay: number;
  tileSize?: "large" | "normal";
}) {
  const tileWidth = tileSize === "large" ? 236 : 136;
  const setWidth = sponsors.length * tileWidth;
  const totalWidth = setWidth * 2;

  const from = direction === "left" ? 0 : -setWidth;
  const to = direction === "left" ? -setWidth : 0;

  return (
    <motion.div
      className="flex w-full flex-col items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: rowDelay, duration: 0.6, ease: easeOutExpo },
      }}
    >
      {/* Tier label */}
      <motion.div
        className="relative flex items-center gap-3"
        initial={{ opacity: 0, y: -6 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            delay: rowDelay + 0.1,
            duration: 0.5,
            ease: easeOutExpo,
          },
        }}
      >
        <div
          className="h-px w-8"
          style={{
            background: `linear-gradient(to right, transparent, ${tier.accentColor}40)`,
          }}
        />
        <p
          className="font-bold uppercase tracking-[0.35em]"
          style={{
            color: tier.textColor,
            fontSize: tileSize === "large" ? "10px" : "9px",
          }}
        >
          {tier.label}
        </p>
        <div
          className="h-px w-8"
          style={{
            background: `linear-gradient(to left, transparent, ${tier.accentColor}40)`,
          }}
        />
      </motion.div>

      {/* Accent line above row */}
      <motion.div
        className="h-px w-full"
        style={{ background: tier.labelBg }}
        initial={{ scaleX: 0 }}
        animate={{
          scaleX: 1,
          transition: {
            delay: rowDelay + 0.2,
            duration: 0.6,
            ease: easeOutExpo,
          },
        }}
      />

      {/* Scrolling sponsors */}
      <div className="w-full overflow-hidden">
        <motion.div
          className="flex"
          style={{ width: totalWidth }}
          initial={{ x: from }}
          animate={{ x: to }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: speed,
              ease: "linear",
            },
          }}
        >
          {[...sponsors, ...sponsors].map((sp, i) => (
            <SponsorTile
              key={`${sp.name}-${i}`}
              imagePath={sp.imagePath}
              delay={rowDelay + 0.3 + (i % sponsors.length) * 0.08}
              size={tileSize}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function SponsorTieredRows({
  sponsors,
  isVisible,
  onComplete,
}: SponsorAnimationProps) {
  const { platinum, gold, silver } = useMemo(() => {
    if (sponsors.length === 0) return { platinum: [], gold: [], silver: [] };
    const plat = sponsors.filter((s) => s.tier === "platinum");
    const gld = sponsors.filter((s) => !s.tier || s.tier === "gold");
    const slv = sponsors.filter((s) => s.tier === "silver");
    return { platinum: plat, gold: gld, silver: slv };
  }, [sponsors]);

  useEffect(() => {
    if (!isVisible || !onComplete) return;
    const id = window.setTimeout(() => onComplete(), 30000);
    return () => window.clearTimeout(id);
  }, [isVisible, onComplete]);

  return (
    <motion.div
      className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-[#04080e] py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
    >
      {/* Platinum ambient glow */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-1/2"
        style={{
          background: `radial-gradient(ellipse 80% 80% at 50% 30%, ${PLATINUM.accentGlow} 0%, transparent 70%)`,
        }}
      />

      {/* Gold ambient glow */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/3 h-1/3"
        style={{
          background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${GOLD.accentGlow} 0%, transparent 70%)`,
        }}
      />

      {/* Silver ambient glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3"
        style={{
          background: `radial-gradient(ellipse 80% 80% at 50% 70%, ${SILVER.accentGlow} 0%, transparent 70%)`,
        }}
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Platinum row */}
      {platinum.length > 0 && (
        <TierRow
          sponsors={platinum}
          tier={PLATINUM}
          direction="left"
          speed={22}
          rowDelay={0.2}
          tileSize="large"
        />
      )}

      {/* Gold row */}
      {gold.length > 0 && (
        <TierRow
          sponsors={gold}
          tier={GOLD}
          direction="right"
          speed={26}
          rowDelay={0.5}
        />
      )}

      {/* Silver row */}
      {silver.length > 0 && (
        <TierRow
          sponsors={silver}
          tier={SILVER}
          direction="left"
          speed={30}
          rowDelay={0.8}
        />
      )}

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-gradient-to-r from-[#04080e] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-gradient-to-l from-[#04080e] to-transparent" />
    </motion.div>
  );
}

export default SponsorTieredRows;
