export type BoardState = number[][];

export interface Move {
  row: number;
  col: number;
  player: number; // 1=black, 2=white
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  createdAt: string;
  isAI?: boolean;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentWinStreak: number;
  bestWinStreak: number;
  rank?: number;
}

export interface GameRecord {
  id: string;
  moves: Move[];
  winner: number | null; // 0=draw, 1=black, 2=white, null=ongoing
  createdAt: string;
  duration: number;
  blackPlayerId?: string;
  whitePlayerId?: string;
  blackPlayerName?: string;
  whitePlayerName?: string;
  isPublic?: boolean;
}

export interface PublicGameRecord extends GameRecord {
  opponentId?: string;
  opponentName?: string;
  playerColor?: number;
  resultText?: string;
}

export interface AIConfig {
  depth: number;
  enabled: boolean;
  playerColor: number; // AI plays as this color
}

export type GameStatus = 'idle' | 'playing' | 'finished' | 'replaying';

export type LeaderboardSort = 'winStreak' | 'winRate' | 'wins';

export type ViewMode = 'game' | 'leaderboard' | 'playerGames';
