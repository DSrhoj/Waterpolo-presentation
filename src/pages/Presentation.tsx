import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AppData, PresentationCommand } from "@/types";
import { getElectronAPI } from "@/utils/electronApi";
import PlayerIntro from "@/components/animations/PlayerIntro";
import ClubIntro from "@/components/animations/ClubIntro";
import MatchupIntro from "@/components/animations/MatchupIntro";
import OfficialIntro from "@/components/animations/OfficialIntro";
import { type SponsorAnimationProps } from "@/components/animations/SponsorSlideCarousel";
import SponsorOneRow from "@/components/animations/SponsorOneRow";
import SponsorTieredRows from "@/components/animations/SponsorTieredRows";
import SponsorMarqueeGrid from "@/components/animations/SponsorMarqueeGrid";
import SponsorFullscreen from "@/components/animations/SponsorFullscreen";
import type { ComponentType } from "react";

const EMPTY_DATA: AppData = {
  clubs: [],
  players: [],
  officials: [],
  sponsors: [],
  sponsorStacks: [],
};

const SPONSOR_COMPONENTS: Record<
  string,
  ComponentType<SponsorAnimationProps>
> = {
  "one-row": SponsorOneRow,
  "tiered-rows": SponsorTieredRows,
  "marquee-grid": SponsorMarqueeGrid,
  fullscreen: SponsorFullscreen,
};

function pickSponsorComponent(
  variant: string,
): ComponentType<SponsorAnimationProps> {
  return SPONSOR_COMPONENTS[variant] ?? SPONSOR_COMPONENTS["one-row"]!;
}

function buildSponsorItems(data: AppData, stackId: string) {
  const stack = data.sponsorStacks.find((s) => s.id === stackId);
  if (!stack)
    return {
      items: [] as Array<{
        name: string;
        imagePath: string;
        tier?: "platinum" | "gold" | "silver";
      }>,
      stack: undefined,
    };

  const items: Array<{
    name: string;
    imagePath: string;
    tier?: "platinum" | "gold" | "silver";
  }> = [];
  for (const id of stack.sponsorIds) {
    const sp = data.sponsors.find((s) => s.id === id);
    if (!sp) continue;
    items.push({ name: sp.name, imagePath: sp.imagePath, tier: sp.tier });
  }
  return { items, stack };
}

export default function Presentation() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const appDataRef = useRef<AppData | null>(null);
  appDataRef.current = appData;

  const [playerPayload, setPlayerPayload] = useState<{
    player: { name: string; imagePath: string };
    club: { name: string; logoPath: string; color: string } | null;
    capNumber?: number;
  } | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);

  const [SponsorAnim, setSponsorAnim] = useState<
    ComponentType<SponsorAnimationProps>
  >(() => SponsorOneRow);
  const [sponsorItems, setSponsorItems] = useState<
    Array<{ name: string; imagePath: string }>
  >([]);
  const [sponsorsVisible, setSponsorsVisible] = useState(false);

  const [clubPayload, setClubPayload] = useState<{
    name: string;
    logoPath: string;
    color: string;
  } | null>(null);
  const [clubVisible, setClubVisible] = useState(false);

  const [matchupPayload, setMatchupPayload] = useState<{
    home: { name: string; logoPath: string; color: string };
    away: { name: string; logoPath: string; color: string };
    label: string;
  } | null>(null);
  const [matchupVisible, setMatchupVisible] = useState(false);

  const [officialsPayload, setOfficialsPayload] = useState<{
    referee1: { name: string };
    referee2: { name: string };
    delegate: { name: string };
  } | null>(null);
  const [officialsVisible, setOfficialsVisible] = useState(false);

  const pendingCommandRef = useRef<PresentationCommand | null>(null);
  const activePlayerIdRef = useRef<string | null>(null);
  const activeClubIdRef = useRef<string | null>(null);

  const applyCommand = useCallback(
    (command: PresentationCommand, data: AppData) => {
      const clearAll = () => {
        setPlayerVisible(false);
        setPlayerPayload(null);
        setSponsorsVisible(false);
        setClubVisible(false);
        setClubPayload(null);
        setMatchupVisible(false);
        setMatchupPayload(null);
        setOfficialsVisible(false);
        setOfficialsPayload(null);
        activePlayerIdRef.current = null;
        activeClubIdRef.current = null;
      };

      switch (command.type) {
        case "stop":
        case "clear":
          clearAll();
          break;

        case "show-player": {
          if (activePlayerIdRef.current === command.playerId) break;
          const player = data.players.find((p) => p.id === command.playerId);
          if (!player) break;
          const club = data.clubs.find((c) => c.id === player.clubId);
          const capNumber =
            data.capNumbers?.[player.clubId]?.[command.playerId];
          clearAll();
          setPlayerPayload({
            player: { name: player.name, imagePath: player.imagePath },
            club: club
              ? { name: club.name, logoPath: club.logoPath, color: club.color }
              : null,
            capNumber,
          });
          setPlayerVisible(true);
          activePlayerIdRef.current = command.playerId;
          break;
        }

        case "show-club": {
          if (activeClubIdRef.current === command.clubId) break;
          const club = data.clubs.find((c) => c.id === command.clubId);
          if (!club) break;
          clearAll();
          setClubPayload({
            name: club.name,
            logoPath: club.logoPath,
            color: club.color,
          });
          setClubVisible(true);
          activeClubIdRef.current = command.clubId;
          break;
        }

        case "show-matchup": {
          const homeClub = data.clubs.find((c) => c.id === command.homeClubId);
          const awayClub = data.clubs.find((c) => c.id === command.awayClubId);
          if (!homeClub || !awayClub) break;
          clearAll();
          setMatchupPayload({
            home: {
              name: homeClub.name,
              logoPath: homeClub.logoPath,
              color: homeClub.color,
            },
            away: {
              name: awayClub.name,
              logoPath: awayClub.logoPath,
              color: awayClub.color,
            },
            label: command.matchLabel || "Match",
          });
          setMatchupVisible(true);
          break;
        }

        case "show-officials": {
          const ref1 = data.officials?.find((o) => o.id === command.referee1Id);
          const ref2 = data.officials?.find((o) => o.id === command.referee2Id);
          const del = data.officials?.find((o) => o.id === command.delegateId);
          if (!ref1 || !ref2 || !del) break;
          clearAll();
          setOfficialsPayload({
            referee1: { name: ref1.name },
            referee2: { name: ref2.name },
            delegate: { name: del.name },
          });
          setOfficialsVisible(true);
          break;
        }

        case "show-sponsors": {
          const variantFromCmd = command.animationVariant;
          const { items, stack } = buildSponsorItems(data, command.stackId);
          const variant =
            variantFromCmd?.trim() ||
            stack?.animationVariant?.trim() ||
            "one-row";
          clearAll();
          setSponsorAnim(() => pickSponsorComponent(variant));
          setSponsorItems(items);
          setSponsorsVisible(items.length > 0);
          break;
        }

        default:
          break;
      }
    },
    [],
  );

  const handleCommand = useCallback(
    (command: PresentationCommand) => {
      const data = appDataRef.current;
      if (!data) {
        pendingCommandRef.current = command;
        return;
      }
      pendingCommandRef.current = null;
      applyCommand(command, data);
    },
    [applyCommand],
  );

  const flushPendingCommand = useCallback(
    (data: AppData) => {
      const pending = pendingCommandRef.current;
      if (pending) {
        pendingCommandRef.current = null;
        applyCommand(pending, data);
      }
    },
    [applyCommand],
  );

  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.loadData) {
      setAppData(EMPTY_DATA);
      return;
    }

    let cancelled = false;
    void api.loadData().then(
      (d) => {
        if (!cancelled) {
          setAppData(d);
          appDataRef.current = d;
          flushPendingCommand(d);
        }
      },
      () => {
        if (!cancelled) {
          setAppData(EMPTY_DATA);
          appDataRef.current = EMPTY_DATA;
        }
      },
    );

    const unsub = api.onDataUpdate?.((d) => {
      setAppData(d);
      appDataRef.current = d;
      flushPendingCommand(d);
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [flushPendingCommand]);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.onCommand) return;
    const unsub = api.onCommand(handleCommand);
    api.signalReady?.();
    return unsub;
  }, [handleCommand]);

  const isIdle =
    !playerVisible &&
    !sponsorsVisible &&
    !clubVisible &&
    !matchupVisible &&
    !officialsVisible;

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {isIdle && (
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-white/15"
          aria-hidden
          animate={{ opacity: [0.2, 0.55, 0.2], scale: [1, 1.15, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {playerPayload && (
        <div className="absolute inset-0">
          <PlayerIntro
            player={playerPayload.player}
            club={playerPayload.club}
            capNumber={playerPayload.capNumber}
            isVisible={playerVisible}
          />
        </div>
      )}

      {clubPayload && (
        <div className="absolute inset-0">
          <ClubIntro club={clubPayload} isVisible={clubVisible} />
        </div>
      )}

      {matchupPayload && (
        <div className="absolute inset-0">
          <MatchupIntro
            home={matchupPayload.home}
            away={matchupPayload.away}
            label={matchupPayload.label}
            isVisible={matchupVisible}
          />
        </div>
      )}

      {officialsPayload && (
        <div className="absolute inset-0">
          <OfficialIntro
            referee1={officialsPayload.referee1}
            referee2={officialsPayload.referee2}
            delegate={officialsPayload.delegate}
            isVisible={officialsVisible}
          />
        </div>
      )}

      {sponsorItems.length > 0 && (
        <div className="absolute inset-0">
          <SponsorAnim sponsors={sponsorItems} isVisible={sponsorsVisible} />
        </div>
      )}
    </div>
  );
}
