import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

/** Mirrors `src/types.ts` AppData — kept here so electron build stays self-contained. */
export interface AppData {
  clubs: { id: string; name: string; logoPath: string; color: string }[];
  players: { id: string; name: string; imagePath: string; clubId: string }[];
  officials: { id: string; name: string; role: "delegate" | "referee" }[];
  sponsors: {
    id: string;
    name: string;
    imagePath: string;
    tier: "platinum" | "gold" | "silver";
  }[];
  sponsorStacks: {
    id: string;
    name: string;
    sponsorIds: string[];
    animationVariant: string;
  }[];
  playerOrder?: Record<string, string[]>;
  capNumbers?: Record<string, Record<string, number>>;
}

const APP_DIR = path.join(os.homedir(), ".presentation-app");
const DATA_FILE = path.join(APP_DIR, "data.json");
const ASSETS_DIR = path.join(APP_DIR, "assets");

export const emptyAppData: AppData = {
  clubs: [],
  players: [],
  officials: [],
  sponsors: [],
  sponsorStacks: [],
};

function normalizeAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") {
    return { ...emptyAppData };
  }
  const o = raw as Record<string, unknown>;
  const clubs = Array.isArray(o.clubs) ? o.clubs : [];
  const players = Array.isArray(o.players) ? o.players : [];
  const officials = Array.isArray(o.officials) ? o.officials : [];
  const sponsors = Array.isArray(o.sponsors) ? o.sponsors : [];
  const sponsorStacks = Array.isArray(o.sponsorStacks) ? o.sponsorStacks : [];
  return {
    clubs: clubs
      .filter(
        (c): c is Record<string, unknown> =>
          !!c &&
          typeof c === "object" &&
          typeof (c as { id?: unknown }).id === "string" &&
          typeof (c as { name?: unknown }).name === "string" &&
          typeof (c as { logoPath?: unknown }).logoPath === "string",
      )
      .map((c) => ({
        id: c.id as string,
        name: c.name as string,
        logoPath: c.logoPath as string,
        color: typeof c.color === "string" ? c.color : "#3b82f6",
      })),
    players: players.filter(
      (p): p is AppData["players"][number] =>
        !!p &&
        typeof p === "object" &&
        typeof (p as { id?: unknown }).id === "string" &&
        typeof (p as { name?: unknown }).name === "string" &&
        typeof (p as { imagePath?: unknown }).imagePath === "string" &&
        typeof (p as { clubId?: unknown }).clubId === "string",
    ),
    officials: officials
      .filter(
        (of): of is Record<string, unknown> =>
          !!of &&
          typeof of === "object" &&
          typeof (of as { id?: unknown }).id === "string" &&
          typeof (of as { name?: unknown }).name === "string",
      )
      .map((of) => ({
        id: of.id as string,
        name: of.name as string,
        role: (of.role === "delegate" || of.role === "referee"
          ? of.role
          : "referee") as "delegate" | "referee",
      })),
    sponsors: sponsors
      .filter(
        (s): s is Record<string, unknown> =>
          !!s &&
          typeof s === "object" &&
          typeof (s as { id?: unknown }).id === "string" &&
          typeof (s as { name?: unknown }).name === "string" &&
          typeof (s as { imagePath?: unknown }).imagePath === "string",
      )
      .map((s) => ({
        id: s.id as string,
        name: s.name as string,
        imagePath: s.imagePath as string,
        tier: (s.tier === "platinum" || s.tier === "gold" || s.tier === "silver"
          ? s.tier
          : "gold") as "platinum" | "gold" | "silver",
      })),
    sponsorStacks: sponsorStacks.filter(
      (st): st is AppData["sponsorStacks"][number] => {
        if (!st || typeof st !== "object") return false;
        const x = st as {
          id?: unknown;
          name?: unknown;
          sponsorIds?: unknown;
          animationVariant?: unknown;
        };
        return (
          typeof x.id === "string" &&
          typeof x.name === "string" &&
          Array.isArray(x.sponsorIds) &&
          x.sponsorIds.every((id) => typeof id === "string") &&
          typeof x.animationVariant === "string"
        );
      },
    ),
    ...(o.playerOrder &&
    typeof o.playerOrder === "object" &&
    !Array.isArray(o.playerOrder)
      ? { playerOrder: o.playerOrder as Record<string, string[]> }
      : {}),
    ...(o.capNumbers &&
    typeof o.capNumbers === "object" &&
    !Array.isArray(o.capNumbers)
      ? { capNumbers: o.capNumbers as Record<string, Record<string, number>> }
      : {}),
  };
}

export async function ensurePresentationDirs(): Promise<void> {
  await fs.mkdir(APP_DIR, { recursive: true });
  await fs.mkdir(ASSETS_DIR, { recursive: true });
}

function assertSafeAssetFilename(filename: string): void {
  if (!filename || typeof filename !== "string") {
    throw new Error("Invalid filename");
  }
  const base = path.basename(filename);
  if (base !== filename || filename.includes("..")) {
    throw new Error("Invalid filename");
  }
}

export async function loadData(): Promise<AppData> {
  await ensurePresentationDirs();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeAppData(parsed);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { ...emptyAppData };
    }
    throw err;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await ensurePresentationDirs();
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(DATA_FILE, payload, "utf-8");
}

/**
 * Copy an image (or any file) into the assets folder with a unique name.
 * Returns the stored filename (not a full path).
 */
export async function copyImage(sourcePath: string): Promise<string> {
  await ensurePresentationDirs();
  const ext = path.extname(sourcePath);
  const suffix = ext && ext.length <= 16 ? ext : "";
  const filename = `${randomUUID()}${suffix}`;
  const dest = path.join(ASSETS_DIR, filename);
  await fs.copyFile(sourcePath, dest);
  return filename;
}

/** Full filesystem path for a file in the assets folder. */
export function getImagePath(filename: string): string {
  assertSafeAssetFilename(filename);
  return path.join(ASSETS_DIR, filename);
}

/** Delete an image from the assets folder. Silently ignores missing files. */
export async function deleteImage(filename: string): Promise<void> {
  if (!filename) return;
  try {
    assertSafeAssetFilename(filename);
    await fs.unlink(path.join(ASSETS_DIR, filename));
  } catch {
    // file already gone or invalid — nothing to do
  }
}
