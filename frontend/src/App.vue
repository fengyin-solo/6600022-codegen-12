<template>
  <div class="min-h-screen bg-gray-950 flex flex-col items-center p-4">
    <header class="w-full max-w-6xl mb-6">
      <div class="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-green-400">棋类 AI 对弈与棋谱回放系统</h1>
            <p class="text-gray-500 text-sm mt-0.5">五子棋 · Minimax + Alpha-Beta 剪枝</p>
          </div>
        </div>

        <nav class="flex items-center gap-2">
          <button
            @click="store.backToGame()"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            :class="store.viewMode === 'game'
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            对弈
          </button>
          <button
            @click="store.openLeaderboard()"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            :class="store.viewMode === 'leaderboard' || store.viewMode === 'playerGames'
              ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/30'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            排行榜
          </button>

          <div v-if="store.currentUser" class="flex items-center gap-2 ml-2 pl-3 border-l border-gray-700">
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
              :class="avatarBg(store.currentUser.name)"
            >
              {{ store.currentUser.name.charAt(0) }}
            </div>
            <div class="hidden sm:block">
              <div class="text-sm text-white font-medium">{{ store.currentUser.name }}</div>
              <div class="text-xs text-gray-500">当前玩家</div>
            </div>
            <button
              @click="showNameDialog = true"
              class="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="修改昵称"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
          </div>
        </nav>
      </div>
    </header>

    <!-- Leaderboard View -->
    <div v-if="store.viewMode === 'leaderboard'" class="w-full max-w-6xl">
      <Leaderboard />
    </div>

    <!-- Player Games View -->
    <div v-else-if="store.viewMode === 'playerGames'" class="w-full max-w-6xl">
      <PlayerGames />
    </div>

    <!-- Game View -->
    <div v-else class="flex flex-col lg:flex-row gap-6 max-w-6xl w-full items-start justify-center">
      <div class="flex-shrink-0">
        <GameBoard />
      </div>

      <div class="w-full lg:w-80 space-y-4">
        <div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <h3 class="text-lg font-bold text-green-400 mb-3">游戏状态</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">状态</span>
              <span class="text-white">
                {{ statusText }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">当前回合</span>
              <span class="flex items-center gap-1">
                <span class="inline-block w-3 h-3 rounded-full" :class="store.currentPlayer === 1 ? 'bg-gray-800 border border-gray-600' : 'bg-white'"></span>
                {{ store.currentPlayer === 1 ? '黑棋' : '白棋' }}
                <template v-if="store.currentUser && store.status === 'playing'">
                  <span v-if="currentIsHuman" class="text-xs text-green-400 ml-1">(你)</span>
                  <span v-else class="text-xs text-violet-400 ml-1">(AI)</span>
                </template>
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">手数</span>
              <span class="text-white">{{ store.currentMoveCount }}</span>
            </div>
            <div v-if="store.winner !== null" class="flex justify-between">
              <span class="text-gray-400">结果</span>
              <span class="font-bold" :class="winnerTextClass">
                {{ winnerText }}
              </span>
            </div>
          </div>

          <div v-if="store.status === 'idle' && store.currentUser" class="mt-4 p-3 bg-gray-800/70 rounded-lg border border-gray-700/80">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-400">本局将计入排行榜</span>
              <button
                @click="store.isGamePublic = !store.isGamePublic"
                class="w-11 h-6 rounded-full transition-colors relative"
                :class="store.isGamePublic ? 'bg-green-600' : 'bg-gray-700'"
              >
                <span
                  class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                  :class="store.isGamePublic ? 'left-[22px]' : 'left-0.5'"
                />
              </button>
            </div>
            <div class="text-xs text-gray-500">
              你执
              <span :class="humanColor === 1 ? 'text-gray-300 font-semibold' : 'text-white font-semibold'">
                {{ humanColor === 1 ? '黑棋' : '白棋' }}
              </span>
              ·
              <span class="text-violet-400">{{ store.aiPlayer.name }}</span>
              执{{ humanColor === 1 ? '白棋' : '黑棋' }}
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button
              @click="handleStartGame"
              class="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {{ store.status === 'playing' ? '重新开始' : store.status === 'replaying' ? '离开回放' : '开始游戏' }}
            </button>
          </div>
        </div>

        <div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <h3 class="text-lg font-bold text-green-400 mb-3">AI 设置</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">启用 AI</span>
              <button
                @click="store.aiConfig.enabled = !store.aiConfig.enabled"
                class="w-12 h-6 rounded-full transition-colors relative"
                :class="store.aiConfig.enabled ? 'bg-green-600' : 'bg-gray-700'"
              >
                <span
                  class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                  :class="store.aiConfig.enabled ? 'left-6' : 'left-0.5'"
                />
              </button>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">AI 执</span>
              <div class="flex gap-2">
                <button
                  @click="store.aiConfig.playerColor = 2"
                  class="px-3 py-1 text-xs rounded transition-colors"
                  :class="store.aiConfig.playerColor === 2 ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'"
                >白棋</button>
                <button
                  @click="store.aiConfig.playerColor = 1"
                  class="px-3 py-1 text-xs rounded transition-colors"
                  :class="store.aiConfig.playerColor === 1 ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'"
                >黑棋</button>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-gray-400">搜索深度</span>
                <span class="text-sm text-white">{{ store.aiConfig.depth }}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                v-model.number="store.aiConfig.depth"
                class="w-full accent-green-500"
              />
              <div class="flex justify-between text-xs text-gray-600">
                <span>1 (快)</span>
                <span>4 (强)</span>
              </div>
            </div>
            <div v-if="store.isAiThinking" class="flex items-center gap-2 text-yellow-400 text-sm">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              AI 思考中...
            </div>
          </div>
        </div>

        <ReplayPanel />
      </div>
    </div>

    <!-- Nickname Dialog -->
    <Teleport to="body">
      <div
        v-if="showNameDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        @click.self="closeNameDialog"
      >
        <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
          <h3 class="text-lg font-bold text-green-400 mb-2">{{ store.currentUser ? '修改昵称' : '设置你的昵称' }}</h3>
          <p class="text-xs text-gray-500 mb-5">昵称将用于排行榜和对局记录展示</p>
          <input
            ref="nameInputRef"
            v-model="tempName"
            type="text"
            maxlength="12"
            placeholder="输入昵称（2-12字）"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 focus:border-green-500 rounded-lg text-white outline-none transition-colors placeholder-gray-500"
            @keyup.enter="confirmName"
          />
          <div class="flex gap-2 mt-5">
            <button
              @click="closeNameDialog"
              class="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-medium border border-gray-700"
            >取消</button>
            <button
              @click="confirmName"
              :disabled="tempName.trim().length < 2"
              class="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm font-medium"
            >确定</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useGameStore } from './store/game';
import GameBoard from './components/GameBoard.vue';
import ReplayPanel from './components/ReplayPanel.vue';
import Leaderboard from './components/Leaderboard.vue';
import PlayerGames from './components/PlayerGames.vue';

const store = useGameStore();

const showNameDialog = ref(false);
const tempName = ref('');
const nameInputRef = ref<HTMLInputElement | null>(null);

const statusText = computed(() => {
  switch (store.status) {
    case 'idle': return '等待开始';
    case 'playing': return '对弈中';
    case 'finished': return '已结束';
    case 'replaying': return '回放中';
    default: return '';
  }
});

const humanColor = computed(() => store.aiConfig.playerColor === 1 ? 2 : 1);

const currentIsHuman = computed(() =>
  store.aiConfig.enabled ? store.currentPlayer !== store.aiConfig.playerColor : true
);

const winnerText = computed(() => {
  if (store.winner === null) return '';
  if (store.winner === 0) return '平局';
  const colorText = store.winner === 1 ? '黑棋胜' : '白棋胜';
  if (!store.aiConfig.enabled) return colorText;
  const isHumanWin = store.winner === humanColor.value;
  return `${colorText} · ${isHumanWin ? '你赢了！🎉' : 'AI 胜'}`;
});

const winnerTextClass = computed(() => {
  if (store.winner === 0) return 'text-yellow-400';
  if (store.winner === 1) return 'text-gray-300';
  if (store.winner === 2) return 'text-white';
  return '';
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

function handleStartGame() {
  if (store.status === 'replaying') {
    store.stopReplay();
    return;
  }
  if (!store.currentUser) {
    tempName.value = '';
    pendingStartGame = true;
    showNameDialog.value = true;
    nextTick(() => nameInputRef.value?.focus());
    return;
  }
  store.startGame();
  if (store.aiConfig.enabled && store.aiConfig.playerColor === 1) {
    setTimeout(() => store.aiMove(), 300);
  }
}

let pendingStartGame = false;

function confirmName() {
  const name = tempName.value.trim();
  if (name.length < 2) return;
  store.ensureCurrentUser(name);
  showNameDialog.value = false;
  localStorage.setItem('gobang_current_user', JSON.stringify(store.currentUser));
  if (pendingStartGame) {
    pendingStartGame = false;
    store.startGame();
    if (store.aiConfig.enabled && store.aiConfig.playerColor === 1) {
      setTimeout(() => store.aiMove(), 300);
    }
  }
}

function closeNameDialog() {
  showNameDialog.value = false;
  pendingStartGame = false;
}

watch(showNameDialog, (v) => {
  if (v && store.currentUser) tempName.value = store.currentUser.name;
});

onMounted(() => {
  store.ensureCurrentUser();
  watch(
    () => [store.status, store.aiConfig.enabled, store.currentPlayer, store.aiConfig.playerColor],
    () => {
      if (
        store.status === 'playing'
        && store.aiConfig.enabled
        && store.currentPlayer === store.aiConfig.playerColor
        && !store.isAiThinking
      ) {
        setTimeout(() => store.aiMove(), 250);
      }
    },
    { immediate: true }
  );
});
</script>
