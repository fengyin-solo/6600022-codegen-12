<template>
  <div class="w-full max-w-4xl mx-auto">
    <div class="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-800">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <button
              @click="store.openLeaderboard()"
              class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              title="返回排行榜"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
            </button>

            <div v-if="store.selectedPlayer" class="flex items-center gap-4">
              <div
                class="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                :class="avatarBg(store.selectedPlayer.name)"
              >
                {{ store.selectedPlayer.name.charAt(0) }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-2xl font-bold text-white">{{ store.selectedPlayer.name }}</h2>
                  <span
                    v-if="store.selectedPlayer.isAI"
                    class="px-2 py-0.5 text-xs rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/40"
                  >AI</span>
                </div>
                <div v-if="playerStats" class="flex items-center gap-3 mt-1 text-sm">
                  <span class="text-gray-400">共 <span class="text-white font-semibold">{{ playerStats.totalGames }}</span> 局</span>
                  <span class="text-green-400 font-semibold">{{ playerStats.wins }} 胜</span>
                  <span class="text-red-400 font-medium">{{ playerStats.losses }} 负</span>
                  <span
                    class="px-2 py-0.5 rounded-md text-xs font-bold"
                    :class="winRateClass(playerStats.winRate)"
                  >
                    {{ (playerStats.winRate * 100).toFixed(1) }}%
                  </span>
                  <span v-if="playerStats.bestWinStreak > 0" class="text-yellow-400 font-semibold">
                    最高 {{ playerStats.bestWinStreak }} 连胜
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            @click="store.backToGame()"
            class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors text-sm flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            回到对弈
          </button>
        </div>
      </div>

      <div class="p-6">
        <h3 class="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          最近公开对局（{{ store.selectedPlayerGames.length }}）
        </h3>

        <div v-if="store.selectedPlayerGames.length === 0" class="py-16 text-center text-gray-500">
          该玩家暂无公开对局记录
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="g in store.selectedPlayerGames"
            :key="g.id"
            class="bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl p-4 cursor-pointer transition-all group"
            @click="replayGame(g)"
          >
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-4 flex-1 min-w-0">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  :class="g.playerColor === 1 ? 'bg-gray-700 border border-gray-500' : 'bg-white text-gray-900'"
                >
                  {{ g.playerColor === 1 ? '黑' : '白' }}
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 text-sm">
                    <span class="text-gray-400">对手:</span>
                    <span class="text-white font-medium truncate">{{ g.opponentName || '未知' }}</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                    <span>{{ g.createdAt }}</span>
                    <span>共 {{ g.moves.length }} 手</span>
                    <span v-if="g.duration">
                      {{ formatDuration(g.duration) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3 shrink-0">
                <span
                  class="px-3 py-1 text-sm font-bold rounded-lg"
                  :class="resultClass(g.resultText || '')"
                >
                  {{ g.resultText }}
                </span>
                <div class="w-9 h-9 rounded-lg bg-gray-900 group-hover:bg-green-600 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                  <svg class="w-4 h-4 text-gray-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../store/game';
import type { GameRecord } from '../types';

const store = useGameStore();

const playerStats = computed(() =>
  store.leaderboard.find(s => s.playerId === store.selectedPlayer?.id)
);

function avatarBg(name: string): string {
  const palettes = [
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-violet-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-indigo-600',
    'bg-gradient-to-br from-cyan-500 to-teal-600',
    'bg-gradient-to-br from-emerald-500 to-green-600',
    'bg-gradient-to-br from-amber-500 to-orange-600',
    'bg-gradient-to-br from-red-500 to-pink-600',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

function winRateClass(r: number): string {
  if (r >= 0.7) return 'bg-green-600/20 text-green-400 border border-green-600/40';
  if (r >= 0.5) return 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40';
  return 'bg-gray-700/50 text-gray-300 border border-gray-600/50';
}

function resultClass(r: string): string {
  if (r === '胜利') return 'bg-green-600/20 text-green-400 border border-green-600/40';
  if (r === '失败') return 'bg-red-600/20 text-red-400 border border-red-600/40';
  return 'bg-gray-700/50 text-gray-300 border border-gray-600/50';
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  return `${m}分${s % 60}秒`;
}

function replayGame(g: GameRecord) {
  store.startReplay(g);
  store.backToGame();
}
</script>
