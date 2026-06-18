import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  BoardState, Move, GameRecord, AIConfig, GameStatus,
  Player, PlayerStats, PublicGameRecord, LeaderboardSort, ViewMode
} from '../types';

const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const API_BASE = 'http://localhost:8080/api/game';

function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
  });
}

function genMockData(): { players: Player[]; games: GameRecord[] } {
  const playerNames = ['棋圣小白', '落子惊雷', '纵横大师', '天元居士', '妙手空空', '星位游侠', '木野狐', '弈秋', 'AlphaGo-练习生', '绝艺-陪练'];
  const players: Player[] = playerNames.map((n, i) => ({
    id: 'seed_' + i,
    name: n,
    isAI: i >= 7,
    createdAt: new Date(Date.now() - (30 - i * 2) * 86400000).toLocaleString('zh-CN'),
  }));

  const games: GameRecord[] = [];
  const seeded = (n: number) => {
    let x = Math.sin(n * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let g = 0; g < 45; g++) {
    const bpIdx = Math.floor(seeded(g * 7 + 1) * players.length);
    let wpIdx = Math.floor(seeded(g * 7 + 2) * players.length);
    while (wpIdx === bpIdx) wpIdx = (wpIdx + 1) % players.length;
    const bp = players[bpIdx];
    const wp = players[wpIdx];
    const winner = Math.floor(seeded(g * 7 + 3) * 3);
    const moveCount = 20 + Math.floor(seeded(g * 7 + 4) * 100);
    const moves: Move[] = [];
    const occ = new Set<string>();
    let cp = BLACK;
    for (let m = 0; m < moveCount; m++) {
      let row = Math.floor(seeded(g * 1000 + m * 3 + 1) * BOARD_SIZE);
      let col = Math.floor(seeded(g * 1000 + m * 3 + 2) * BOARD_SIZE);
      let t = 0;
      while (occ.has(`${row},${col}`) && t < 30) {
        row = (row + 1) % BOARD_SIZE;
        col = (col + 2) % BOARD_SIZE;
        t++;
      }
      occ.add(`${row},${col}`);
      moves.push({ row, col, player: cp, timestamp: Date.now() - g * 3600000 - moveCount * 1000 + m * 1000 });
      cp = cp === BLACK ? WHITE : BLACK;
    }

    games.push({
      id: 'seed_g_' + g,
      moves,
      winner,
      createdAt: new Date(Date.now() - g * 10800000 - 3600000).toLocaleString('zh-CN'),
      duration: 60000 + Math.floor(seeded(g * 11 + 5) * 600000),
      blackPlayerId: bp.id,
      whitePlayerId: wp.id,
      blackPlayerName: bp.name,
      whitePlayerName: wp.name,
      isPublic: true,
    });
  }
  return { players, games };
}

const MOCK = genMockData();

function calcLeaderboard(games: GameRecord[], players: Player[], sortBy: LeaderboardSort): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();
  players.forEach(p => {
    statsMap.set(p.id, {
      playerId: p.id,
      playerName: p.name,
      totalGames: 0, wins: 0, losses: 0, draws: 0,
      winRate: 0, currentWinStreak: 0, bestWinStreak: 0,
    });
  });

  const sortedGames = [...games]
    .filter(g => g.isPublic && g.winner !== null && g.winner !== undefined)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

  const curStreak = new Map<string, number>();

  for (const g of sortedGames) {
    const bs = statsMap.get(g.blackPlayerId || '');
    const ws = statsMap.get(g.whitePlayerId || '');
    if (bs) {
      bs.totalGames++;
      if (g.winner === 1) { bs.wins++; curStreak.set(g.blackPlayerId!, (curStreak.get(g.blackPlayerId!) || 0) + 1); bs.bestWinStreak = Math.max(bs.bestWinStreak, curStreak.get(g.blackPlayerId!)!); }
      else if (g.winner === 2) { bs.losses++; curStreak.set(g.blackPlayerId!, 0); }
      else { bs.draws++; curStreak.set(g.blackPlayerId!, 0); }
    }
    if (ws) {
      ws.totalGames++;
      if (g.winner === 2) { ws.wins++; curStreak.set(g.whitePlayerId!, (curStreak.get(g.whitePlayerId!) || 0) + 1); ws.bestWinStreak = Math.max(ws.bestWinStreak, curStreak.get(g.whitePlayerId!)!); }
      else if (g.winner === 1) { ws.losses++; curStreak.set(g.whitePlayerId!, 0); }
      else { ws.draws++; curStreak.set(g.whitePlayerId!, 0); }
    }
  }

  const list: PlayerStats[] = [];
  statsMap.forEach(s => {
    if (s.totalGames > 0) {
      s.winRate = s.totalGames > 0 ? s.wins / s.totalGames : 0;
      s.currentWinStreak = curStreak.get(s.playerId) || 0;
      list.push(s);
    }
  });

  list.sort((a, b) => {
    switch (sortBy) {
      case 'wins':
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winRate - a.winRate;
      case 'winRate':
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
      case 'winStreak':
      default:
        if (b.bestWinStreak !== a.bestWinStreak) return b.bestWinStreak - a.bestWinStreak;
        return b.winRate - a.winRate;
    }
  });

  list.forEach((s, i) => s.rank = i + 1);
  return list;
}

// --- AI: Minimax + Alpha-Beta Pruning ---

const SCORE_TABLE: Record<string, number> = {
  'five': 1000000,
  'live-four': 100000,
  'dead-four': 10000,
  'live-three': 10000,
  'dead-three': 1000,
  'live-two': 1000,
  'dead-two': 100,
  'live-one': 100,
  'dead-one': 10,
};

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function countDirection(board: BoardState, row: number, col: number, dr: number, dc: number, player: number): number {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

function isBlocked(board: BoardState, row: number, col: number, dr: number, dc: number, steps: number): boolean {
  const r = row + dr * steps;
  const c = col + dc * steps;
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return true;
  return board[r][c] !== EMPTY;
}

function evaluateLine(board: BoardState, row: number, col: number, dr: number, dc: number, player: number): number {
  const count = 1 + countDirection(board, row, col, dr, dc, player) + countDirection(board, row, col, -dr, -dc, player);
  if (count >= 5) return SCORE_TABLE['five'];

  const fwd = countDirection(board, row, col, dr, dc, player);
  const bwd = countDirection(board, row, col, -dr, -dc, player);
  const fwdBlocked = isBlocked(board, row + dr * (fwd + 1), col + dc * (fwd + 1), 0, 0, 0) ||
    (row + dr * (fwd + 1) < 0 || row + dr * (fwd + 1) >= BOARD_SIZE || col + dc * (fwd + 1) < 0 || col + dc * (fwd + 1) >= BOARD_SIZE || board[row + dr * (fwd + 1)][col + dc * (fwd + 1)] !== EMPTY);
  const bwdBlocked = isBlocked(board, row - dr * (bwd + 1), col - dc * (bwd + 1), 0, 0, 0) ||
    (row - dr * (bwd + 1) < 0 || row - dr * (bwd + 1) >= BOARD_SIZE || col - dc * (bwd + 1) < 0 || col - dc * (bwd + 1) >= BOARD_SIZE || board[row - dr * (bwd + 1)][col - dc * (bwd + 1)] !== EMPTY);

  const openEnds = (fwdBlocked ? 0 : 1) + (bwdBlocked ? 0 : 1);

  if (openEnds === 0) return 0;

  const key = count === 4 ? (openEnds === 2 ? 'live-four' : 'dead-four')
    : count === 3 ? (openEnds === 2 ? 'live-three' : 'dead-three')
    : count === 2 ? (openEnds === 2 ? 'live-two' : 'dead-two')
    : (openEnds === 2 ? 'live-one' : 'dead-one');

  return SCORE_TABLE[key] || 0;
}

function evaluateBoard(board: BoardState, aiPlayer: number): number {
  let aiScore = 0;
  let humanScore = 0;
  const humanPlayer = aiPlayer === BLACK ? WHITE : BLACK;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === aiPlayer) {
        for (const [dr, dc] of DIRECTIONS) {
          aiScore += evaluateLine(board, r, c, dr, dc, aiPlayer);
        }
      } else if (board[r][c] === humanPlayer) {
        for (const [dr, dc] of DIRECTIONS) {
          humanScore += evaluateLine(board, r, c, dr, dc, humanPlayer);
        }
      }
    }
  }
  return aiScore - humanScore * 1.1;
}

function getCandidateMoves(board: BoardState): [number, number][] {
  const candidates: [number, number][] = [];
  const visited = new Set<string>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            const key = `${nr},${nc}`;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === EMPTY && !visited.has(key)) {
              visited.add(key);
              candidates.push([nr, nc]);
            }
          }
        }
      }
    }
  }
  if (candidates.length === 0 && board[7][7] === EMPTY) {
    candidates.push([7, 7]);
  }
  return candidates;
}

function checkWinAt(board: BoardState, row: number, col: number, player: number): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    const count = 1 + countDirection(board, row, col, dr, dc, player) + countDirection(board, row, col, -dr, -dc, player);
    if (count >= 5) return true;
  }
  return false;
}

function minimax(board: BoardState, depth: number, alpha: number, beta: number, isMaximizing: boolean, aiPlayer: number): number {
  const humanPlayer = aiPlayer === BLACK ? WHITE : BLACK;

  if (depth === 0) return evaluateBoard(board, aiPlayer);

  const candidates = getCandidateMoves(board);
  if (candidates.length === 0) return evaluateBoard(board, aiPlayer);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const [r, c] of candidates) {
      board[r][c] = aiPlayer;
      if (checkWinAt(board, r, c, aiPlayer)) {
        board[r][c] = EMPTY;
        return SCORE_TABLE['five'] * (depth + 1);
      }
      const eval_ = minimax(board, depth - 1, alpha, beta, false, aiPlayer);
      board[r][c] = EMPTY;
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const [r, c] of candidates) {
      board[r][c] = humanPlayer;
      if (checkWinAt(board, r, c, humanPlayer)) {
        board[r][c] = EMPTY;
        return -SCORE_TABLE['five'] * (depth + 1);
      }
      const eval_ = minimax(board, depth - 1, alpha, beta, true, aiPlayer);
      board[r][c] = EMPTY;
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getAIMove(board: BoardState, aiPlayer: number, depth: number): [number, number] | null {
  const candidates = getCandidateMoves(board);
  if (candidates.length === 0) return null;

  let bestMove: [number, number] = candidates[0];
  let bestScore = -Infinity;

  for (const [r, c] of candidates) {
    board[r][c] = aiPlayer;
    if (checkWinAt(board, r, c, aiPlayer)) {
      board[r][c] = EMPTY;
      return [r, c];
    }
    const score = minimax(board, depth - 1, -Infinity, Infinity, false, aiPlayer);
    board[r][c] = EMPTY;
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }
  return bestMove;
}

// --- Store ---

export const useGameStore = defineStore('game', () => {
  const board = ref<BoardState>(createEmptyBoard());
  const currentPlayer = ref<number>(BLACK);
  const moves = ref<Move[]>([]);
  const status = ref<GameStatus>('idle');
  const winner = ref<number | null>(null);
  const gameRecords = ref<GameRecord[]>([...MOCK.games]);
  const aiConfig = ref<AIConfig>({ depth: 3, enabled: true, playerColor: WHITE });
  const isAiThinking = ref(false);

  const replayMoves = ref<Move[]>([]);
  const replayIndex = ref(0);
  const replayBoard = ref<BoardState>(createEmptyBoard());
  const isReplayPlaying = ref(false);
  const replaySpeed = ref(1000);

  // Leaderboard & Players
  const viewMode = ref<ViewMode>('game');
  const players = ref<Player[]>([...MOCK.players]);
  const currentUser = ref<Player | null>(null);
  const aiPlayer = ref<Player>({
    id: 'ai_default',
    name: 'AI 对弈助手',
    isAI: true,
    createdAt: new Date().toLocaleString('zh-CN'),
  });
  const leaderboardSort = ref<LeaderboardSort>('winStreak');
  const selectedPlayer = ref<Player | null>(null);
  const isGamePublic = ref(true);

  const leaderboard = computed<PlayerStats[]>(() =>
    calcLeaderboard(gameRecords.value, players.value, leaderboardSort.value)
  );

  const selectedPlayerGames = computed<PublicGameRecord[]>(() => {
    if (!selectedPlayer.value) return [];
    const pid = selectedPlayer.value.id;
    return gameRecords.value
      .filter(g => g.isPublic && g.winner !== null && g.winner !== undefined)
      .filter(g => g.blackPlayerId === pid || g.whitePlayerId === pid)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      .slice(0, 20)
      .map(g => {
        const isBlack = g.blackPlayerId === pid;
        const opponentId = isBlack ? g.whitePlayerId : g.blackPlayerId;
        const opponentName = isBlack ? g.whitePlayerName : g.blackPlayerName;
        const playerColor = isBlack ? BLACK : WHITE;
        let resultText = '平局';
        if (g.winner === playerColor) resultText = '胜利';
        else if (g.winner !== 0) resultText = '失败';
        return {
          ...g,
          opponentId,
          opponentName,
          playerColor,
          resultText,
        };
      });
  });

  const currentMoveCount = computed(() => moves.value.length);
  const isGameOver = computed(() => status.value === 'finished');

  function ensureCurrentUser(name?: string): Player {
    if (currentUser.value) {
      if (name && currentUser.value.name !== name) {
        currentUser.value.name = name;
      }
      return currentUser.value;
    }
    const stored = localStorage.getItem('gobang_current_user');
    if (stored) {
      try {
        const p = JSON.parse(stored) as Player;
        currentUser.value = p;
        if (!players.value.find(pl => pl.id === p.id)) {
          players.value.push(p);
        }
        return p;
      } catch {}
    }
    const p: Player = {
      id: uuid(),
      name: name || ('棋手' + Math.floor(Math.random() * 9000 + 1000)),
      isAI: false,
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    currentUser.value = p;
    localStorage.setItem('gobang_current_user', JSON.stringify(p));
    if (!players.value.find(pl => pl.id === p.id)) {
      players.value.push(p);
    }
    return p;
  }

  function startGame(userName?: string) {
    const user = ensureCurrentUser(userName);
    board.value = createEmptyBoard();
    currentPlayer.value = BLACK;
    moves.value = [];
    status.value = 'playing';
    winner.value = null;
    isAiThinking.value = false;
    viewMode.value = 'game';
  }

  function placeStone(row: number, col: number): boolean {
    if (status.value !== 'playing') return false;
    if (board.value[row][col] !== EMPTY) return false;
    if (isAiThinking.value) return false;

    board.value[row][col] = currentPlayer.value;
    const move: Move = { row, col, player: currentPlayer.value, timestamp: Date.now() };
    moves.value.push(move);

    if (checkWinAt(board.value, row, col, currentPlayer.value)) {
      winner.value = currentPlayer.value;
      status.value = 'finished';
      saveRecord();
      return true;
    }

    if (moves.value.length === BOARD_SIZE * BOARD_SIZE) {
      winner.value = 0;
      status.value = 'finished';
      saveRecord();
      return true;
    }

    currentPlayer.value = currentPlayer.value === BLACK ? WHITE : BLACK;
    return true;
  }

  async function aiMove() {
    if (!aiConfig.value.enabled || status.value !== 'playing') return;
    if (currentPlayer.value !== aiConfig.value.playerColor) return;

    isAiThinking.value = true;
    await new Promise(resolve => setTimeout(resolve, 100));

    const move = getAIMove(board.value, aiConfig.value.playerColor, aiConfig.value.depth);
    if (move) {
      placeStone(move[0], move[1]);
    }
    isAiThinking.value = false;
  }

  function saveRecord() {
    const user = ensureCurrentUser();
    const humanColor = aiConfig.value.playerColor === BLACK ? WHITE : BLACK;
    const blackPlayerId = BLACK === humanColor ? user.id : aiPlayer.value.id;
    const blackPlayerName = BLACK === humanColor ? user.name : aiPlayer.value.name;
    const whitePlayerId = WHITE === humanColor ? user.id : aiPlayer.value.id;
    const whitePlayerName = WHITE === humanColor ? user.name : aiPlayer.value.name;

    const record: GameRecord = {
      id: uuid(),
      moves: [...moves.value],
      winner: winner.value,
      createdAt: new Date().toLocaleString('zh-CN'),
      duration: moves.value.length > 0 ? moves.value[moves.value.length - 1].timestamp - moves.value[0].timestamp : 0,
      blackPlayerId, whitePlayerId, blackPlayerName, whitePlayerName,
      isPublic: isGamePublic.value,
    };
    gameRecords.value.unshift(record);
  }

  function startReplay(record: GameRecord) {
    replayMoves.value = [...record.moves];
    replayIndex.value = 0;
    replayBoard.value = createEmptyBoard();
    status.value = 'replaying';
    isReplayPlaying.value = false;
  }

  function replayStepForward() {
    if (replayIndex.value >= replayMoves.value.length) return;
    const move = replayMoves.value[replayIndex.value];
    replayBoard.value[move.row][move.col] = move.player;
    replayIndex.value++;
  }

  function replayStepBack() {
    if (replayIndex.value <= 0) return;
    replayIndex.value--;
    const move = replayMoves.value[replayIndex.value];
    replayBoard.value[move.row][move.col] = EMPTY;
  }

  function replayGoToStart() {
    replayBoard.value = createEmptyBoard();
    replayIndex.value = 0;
  }

  function replayGoToEnd() {
    replayBoard.value = createEmptyBoard();
    for (let i = 0; i < replayMoves.value.length; i++) {
      const m = replayMoves.value[i];
      replayBoard.value[m.row][m.col] = m.player;
    }
    replayIndex.value = replayMoves.value.length;
  }

  let replayTimer: ReturnType<typeof setInterval> | null = null;

  function toggleReplayPlay() {
    isReplayPlaying.value = !isReplayPlaying.value;
    if (isReplayPlaying.value) {
      replayTimer = setInterval(() => {
        if (replayIndex.value >= replayMoves.value.length) {
          isReplayPlaying.value = false;
          if (replayTimer) clearInterval(replayTimer);
          replayTimer = null;
          return;
        }
        replayStepForward();
      }, replaySpeed.value);
    } else {
      if (replayTimer) clearInterval(replayTimer);
      replayTimer = null;
    }
  }

  function setReplaySpeed(ms: number) {
    replaySpeed.value = ms;
    if (isReplayPlaying.value) {
      if (replayTimer) clearInterval(replayTimer);
      replayTimer = setInterval(() => {
        if (replayIndex.value >= replayMoves.value.length) {
          isReplayPlaying.value = false;
          if (replayTimer) clearInterval(replayTimer);
          replayTimer = null;
          return;
        }
        replayStepForward();
      }, replaySpeed.value);
    }
  }

  function stopReplay() {
    isReplayPlaying.value = false;
    if (replayTimer) clearInterval(replayTimer);
    replayTimer = null;
    status.value = 'idle';
  }

  function checkWin(row: number, col: number): boolean {
    return checkWinAt(board.value, row, col, board.value[row][col]);
  }

  function openLeaderboard() {
    viewMode.value = 'leaderboard';
  }
  function openPlayerGames(player: Player) {
    selectedPlayer.value = player;
    viewMode.value = 'playerGames';
  }
  function backToGame() {
    viewMode.value = 'game';
    selectedPlayer.value = null;
  }

  return {
    board, currentPlayer, moves, status, winner, gameRecords, aiConfig, isAiThinking,
    replayMoves, replayIndex, replayBoard, isReplayPlaying, replaySpeed,
    currentMoveCount, isGameOver,
    viewMode, players, currentUser, aiPlayer,
    leaderboardSort, leaderboard, selectedPlayer, selectedPlayerGames, isGamePublic,
    startGame, placeStone, aiMove, saveRecord, ensureCurrentUser,
    startReplay, replayStepForward, replayStepBack, replayGoToStart, replayGoToEnd,
    toggleReplayPlay, setReplaySpeed, stopReplay, checkWin,
    openLeaderboard, openPlayerGames, backToGame,
  };
});
