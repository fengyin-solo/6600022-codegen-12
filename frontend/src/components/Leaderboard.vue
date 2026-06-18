<template>
  <div class="w-full max-w-4xl mx-auto">
    <div class="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-800 flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <button
            @click="store.backToGame()"
            class="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="返回对弈"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>
          <div>
            <h2 class="text-xl font-bold text-green-400 flex items-center gap-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              玩家排行榜
            </h2>
            <p class="text-xs text-gray-500 mt-0.5">点击任意玩家可查看其最近公开对局</p>
          </div>
        </div>

        <div class="flex bg-gray-800 rounded-lg p-1 gap-1">
          <button
            v-for="tab in sortTabs"
            :key="tab.key"
            @click="store.leaderboardSort = tab.key"
            class="px-4 py-2 text-sm rounded-md font-medium transition-all"
            :class="store.leaderboardSort === tab.key
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-800/70 text-gray-400">
            <tr>
              <th class="px-6 py-3 text-left font-semibold w-20">排名</th>
              <th class="px-4 py-3 text-left font-semibold">玩家</th>
              <th class="px-4 py-3 text-right font-semibold w-20">对局</th>
              <th class="px-4 py-3 text-right font-semibold w-20">胜</th>
              <th class="px-4 py-3 text-right font-semibold w-20">负</th>
              <th class="px-4 py-3 text-right font-semibold w-24">胜率</th>
              <th class="px-4 py-3 text-right font-semibold w-28">{{ sortKeyLabel }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <tr
              v-for="(row, idx) in store.leaderboard"
              :key="row.playerId"
              class="hover:bg-gray-800/60 cursor-pointer transition-colors group"
              :class="{
                'bg-gradient-to-r from-yellow-500/10 to-transparent': idx === 0,
                'bg-gradient-to-r from-gray-400/10 to-transparent': idx === 1,
                'bg-gradient-to-r from-orange-700/10 to-transparent': idx === 2,
              }"
              @click="openPlayer(row)"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span
                    v-if="idx <= 2"
                    class="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold shadow-md"
                    :class="[
                      idx === 0 ? 'bg-yellow-500 text-yellow-900' : '',
                      idx === 1 ? 'bg-gray-400 text-gray-900' : '',
                      idx === 2 ? 'bg-orange-600 text-white' : '',
                    ]"
                  >
                    {{ ['🥇','🥈','🥉'][idx] }}
                  </span>
                  <span v-else class="w-8 text-center text-gray-500 font-semibold">
                    #{{ row.rank }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
                    :class="avatarBg(row.playerName)"
                  >
                    {{ row.playerName.charAt(0) }}
                  </div>
                  <div>
                    <div class="font-semibold text-gray-100 group-hover:text-green-400 transition-colors flex items-center gap-2">
                      {{ row.playerName }}
                      <svg class="w-4 h-4 text-gray-600 group-hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                    <div v-if="row.currentWinStreak >= 3" class="text-xs text-orange-400 font-medium mt-0.5">
                      🔥 当前连胜 {{ row.currentWinStreak }} 场
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4 text-right text-gray-300 font-medium">{{ row.totalGames }}</td>
              <td class="px-4 py-4 text-right text-green-400 font-semibold">{{ row.wins }}</td>
              <td class="px-4 py-4 text-right text-red-400 font-medium">{{ row.losses }}</td>
              <td class="px-4 py-4 text-right">
                <span
                  class="px-2 py-1 rounded-md text-xs font-bold"
                  :class="winRateClass(row.winRate)"
                >
                  {{ (row.winRate * 100).toFixed(1) }}%
                </span>
              </td>
              <td class="px-4 py-4 text-right">
                <span v-if="store.leaderboardSort === 'winStreak'" class="text-yellow-400 font-bold">
                  {{ row.bestWinStreak }} 连
                </span>
                <span v-else-if="store.leaderboardSort === 'wins'" class="text-green-400 font-bold">
                  {{ row.wins }} 场
                </span>
                <span v-else class="font-bold" :class="winRateClass(row.winRate)">
                  {{ (row.winRate * 100).toFixed(1) }}%
                </span>
              </td>
            </tr>
            <tr v-if="store.leaderboard.length === 0">
              <td colspan="7" class="px-6 py-16 text-center text-gray-500">
                暂无排行数据，快去完成第一局对局吧！
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../store/game';
import type { PlayerStats, LeaderboardSort } from '../types';

const store = useGameStore();

const sortTabs: { key: LeaderboardSort; label: string }[] = [
  { key: 'winStreak', label: '连胜榜' },
  { key: 'winRate', label: '胜率榜' },
  { key: 'wins', label: '胜场榜' },
];

const sortKeyLabel = computed(() => {
  switch (store.leaderboardSort) {
    case 'winStreak': return '最高连胜';
    case 'wins': return '总胜场';
    case 'winRate': return '胜率';
  }
});

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

function openPlayer(row: PlayerStats) {
  const p = store.players.find(pl => pl.id === row.playerId);
  if (p) {
    store.openPlayerGames(p);
  } else {
    store.openPlayerGames({
      id: row.playerId,
      name: row.playerName,
      createdAt: new Date().toLocaleString('zh-CN'),
    });
  }
}
</script>
