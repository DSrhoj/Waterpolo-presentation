export interface Club {
  id: string
  name: string
  logoPath: string
  color: string
}

export interface Player {
  id: string
  name: string
  imagePath: string
  clubId: string
}

export type SponsorTier = 'platinum' | 'gold' | 'silver'

export interface Sponsor {
  id: string
  name: string
  imagePath: string
  tier: SponsorTier
}

export type OfficialRole = 'delegate' | 'referee'

export interface Official {
  id: string
  name: string
  role: OfficialRole
}

export interface SponsorStack {
  id: string
  name: string
  sponsorIds: string[]
  animationVariant: string
}

export interface AppData {
  clubs: Club[]
  players: Player[]
  officials: Official[]
  sponsors: Sponsor[]
  sponsorStacks: SponsorStack[]
  playerOrder?: Record<string, string[]>
}

export type PresentationCommand =
  | { type: 'show-player'; playerId: string }
  | { type: 'show-club'; clubId: string }
  | { type: 'show-matchup'; homeClubId: string; awayClubId: string; matchLabel: string }
  | { type: 'show-officials'; referee1Id: string; referee2Id: string; delegateId: string }
  | { type: 'show-sponsors'; stackId: string; animationVariant: string }
  | { type: 'stop' }
  | { type: 'clear' }
