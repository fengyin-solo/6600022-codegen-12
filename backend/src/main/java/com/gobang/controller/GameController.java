package com.gobang.controller;

import com.gobang.model.GameState;
import com.gobang.model.Player;
import com.gobang.model.PlayerStats;
import com.gobang.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/game")
@CrossOrigin(origins = "*")
public class GameController {

    @Autowired
    private AiService aiService;

    private final Map<String, GameState> games = new ConcurrentHashMap<>();
    private final Map<String, Player> players = new ConcurrentHashMap<>();

    private void initSeedData() {
        if (players.isEmpty()) {
            String[] names = {"棋圣小白", "落子惊雷", "纵横大师", "天元居士", "妙手空空", "星位游侠", "木野狐", "弈秋", "AlphaGo-练习生", "绝艺-陪练"};
            for (int i = 0; i < names.length; i++) {
                String pid = "seed_" + i;
                Player p = new Player();
                p.setId(pid);
                p.setName(names[i]);
                p.setIsAI(i >= 7);
                p.setCreatedAt(java.time.LocalDateTime.now().minusDays(30 - i * 2).toString());
                players.put(pid, p);
            }

            String[] pids = players.keySet().toArray(new String[0]);
            Random rnd = new Random(42);
            for (int g = 0; g < 40; g++) {
                String gid = "seed_g_" + g;
                GameState game = new GameState(gid);
                String bp = pids[rnd.nextInt(pids.length)];
                String wp = pids[rnd.nextInt(pids.length)];
                while (wp.equals(bp)) wp = pids[rnd.nextInt(pids.length)];
                game.setBlackPlayerId(bp);
                game.setWhitePlayerId(wp);
                game.setBlackPlayerName(players.get(bp).getName());
                game.setWhitePlayerName(players.get(wp).getName());
                game.setCreatedAt(java.time.LocalDateTime.now().minusHours(g * 3 + 1).toString());
                game.setIsPublic(true);

                int moveCount = 20 + rnd.nextInt(100);
                int cp = GameState.BLACK;
                for (int m = 0; m < moveCount; m++) {
                    int row = rnd.nextInt(15);
                    int col = rnd.nextInt(15);
                    int tries = 0;
                    while (game.getBoard()[row][col] != 0 && tries < 50) {
                        row = rnd.nextInt(15);
                        col = rnd.nextInt(15);
                        tries++;
                    }
                    game.placeStone(row, col);
                    if (game.getWinner() != null) break;
                }
                if (game.getWinner() == null) {
                    game.setWinner(rnd.nextInt(3));
                }
                game.setDuration((long)(60000 + rnd.nextInt(600000)));
                games.put(gid, game);
            }
        }
    }

    @PostMapping("/new")
    public ResponseEntity<GameState> newGame() {
        initSeedData();
        String id = UUID.randomUUID().toString();
        GameState game = new GameState(id);
        games.put(id, game);
        return ResponseEntity.ok(game);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameState> getGame(@PathVariable String id) {
        initSeedData();
        GameState game = games.get(id);
        if (game == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(game);
    }

    @PostMapping("/{id}/move")
    public ResponseEntity<?> makeMove(@PathVariable String id, @RequestBody Map<String, Integer> body) {
        GameState game = games.get(id);
        if (game == null) return ResponseEntity.notFound().build();
        if (game.getWinner() != null) return ResponseEntity.badRequest().body("Game is over");

        int row = body.getOrDefault("row", -1);
        int col = body.getOrDefault("col", -1);

        if (!game.placeStone(row, col)) {
            return ResponseEntity.badRequest().body("Invalid move");
        }
        return ResponseEntity.ok(game);
    }

    @PostMapping("/{id}/ai-move")
    public ResponseEntity<?> aiMove(@PathVariable String id, @RequestBody Map<String, Integer> body) {
        GameState game = games.get(id);
        if (game == null) return ResponseEntity.notFound().build();
        if (game.getWinner() != null) return ResponseEntity.badRequest().body("Game is over");

        int aiPlayer = body.getOrDefault("player", GameState.WHITE);
        int depth = body.getOrDefault("depth", 3);

        int[][] boardCopy = new int[GameState.BOARD_SIZE][GameState.BOARD_SIZE];
        for (int r = 0; r < GameState.BOARD_SIZE; r++) {
            System.arraycopy(game.getBoard()[r], 0, boardCopy[r], 0, GameState.BOARD_SIZE);
        }

        int[] move = aiService.getBestMove(boardCopy, aiPlayer, depth);
        if (move == null) return ResponseEntity.badRequest().body("No valid move");

        game.placeStone(move[0], move[1]);
        return ResponseEntity.ok(game);
    }

    @GetMapping("/records")
    public ResponseEntity<List<GameState>> getRecords() {
        initSeedData();
        List<GameState> finished = games.values().stream()
                .filter(g -> g.getWinner() != null)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(finished);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGame(@PathVariable String id) {
        games.remove(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/players")
    public ResponseEntity<?> setGamePlayers(@PathVariable String id, @RequestBody Map<String, Object> body) {
        initSeedData();
        GameState game = games.get(id);
        if (game == null) return ResponseEntity.notFound().build();

        String blackId = (String) body.get("blackPlayerId");
        String blackName = (String) body.get("blackPlayerName");
        String whiteId = (String) body.get("whitePlayerId");
        String whiteName = (String) body.get("whitePlayerName");
        Boolean isPub = (Boolean) body.get("isPublic");

        if (blackId != null && blackName != null) {
            if (!players.containsKey(blackId)) {
                Player p = new Player();
                p.setId(blackId);
                p.setName(blackName);
                p.setIsAI(false);
                p.setCreatedAt(java.time.LocalDateTime.now().toString());
                players.put(blackId, p);
            }
            game.setBlackPlayerId(blackId);
            game.setBlackPlayerName(blackName);
        }
        if (whiteId != null && whiteName != null) {
            if (!players.containsKey(whiteId)) {
                Player p = new Player();
                p.setId(whiteId);
                p.setName(whiteName);
                p.setIsAI(true);
                p.setCreatedAt(java.time.LocalDateTime.now().toString());
                players.put(whiteId, p);
            }
            game.setWhitePlayerId(whiteId);
            game.setWhitePlayerName(whiteName);
        }
        if (isPub != null) {
            game.setIsPublic(isPub);
        }
        return ResponseEntity.ok(game);
    }

    @PostMapping("/players")
    public ResponseEntity<Player> createOrUpdatePlayer(@RequestBody Player body) {
        initSeedData();
        if (body.getId() == null || body.getId().isEmpty()) {
            body.setId(UUID.randomUUID().toString());
        }
        if (body.getCreatedAt() == null) {
            body.setCreatedAt(java.time.LocalDateTime.now().toString());
        }
        players.put(body.getId(), body);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/players/{id}")
    public ResponseEntity<Player> getPlayer(@PathVariable String id) {
        initSeedData();
        Player p = players.get(id);
        if (p == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(p);
    }

    @GetMapping("/players")
    public ResponseEntity<List<Player>> getAllPlayers() {
        initSeedData();
        return ResponseEntity.ok(new ArrayList<>(players.values()));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<PlayerStats>> getLeaderboard(
            @RequestParam(required = false, defaultValue = "winStreak") String sortBy,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        initSeedData();
        Map<String, PlayerStats> statsMap = new HashMap<>();
        for (Player p : players.values()) {
            PlayerStats ps = new PlayerStats();
            ps.setPlayerId(p.getId());
            ps.setPlayerName(p.getName());
            statsMap.put(p.getId(), ps);
        }

        List<GameState> sortedGames = games.values().stream()
                .filter(g -> g.getWinner() != null && Boolean.TRUE.equals(g.getIsPublic()))
                .sorted(Comparator.comparing(GameState::getCreatedAt))
                .toList();

        Map<String, Integer> curStreak = new HashMap<>();

        for (GameState g : sortedGames) {
            String bid = g.getBlackPlayerId();
            String wid = g.getWhitePlayerId();
            Integer winner = g.getWinner();

            if (bid != null && statsMap.containsKey(bid)) {
                PlayerStats bs = statsMap.get(bid);
                bs.setTotalGames(bs.getTotalGames() + 1);
                if (winner != null) {
                    if (winner == 1) {
                        bs.setWins(bs.getWins() + 1);
                        curStreak.merge(bid, 1, Integer::sum);
                        if (curStreak.get(bid) > bs.getBestWinStreak()) {
                            bs.setBestWinStreak(curStreak.get(bid));
                        }
                    } else if (winner == 2) {
                        bs.setLosses(bs.getLosses() + 1);
                        curStreak.put(bid, 0);
                    } else {
                        bs.setDraws(bs.getDraws() + 1);
                        curStreak.put(bid, 0);
                    }
                }
            }
            if (wid != null && statsMap.containsKey(wid)) {
                PlayerStats ws = statsMap.get(wid);
                ws.setTotalGames(ws.getTotalGames() + 1);
                if (winner != null) {
                    if (winner == 2) {
                        ws.setWins(ws.getWins() + 1);
                        curStreak.merge(wid, 1, Integer::sum);
                        if (curStreak.get(wid) > ws.getBestWinStreak()) {
                            ws.setBestWinStreak(curStreak.get(wid));
                        }
                    } else if (winner == 1) {
                        ws.setLosses(ws.getLosses() + 1);
                        curStreak.put(wid, 0);
                    } else {
                        ws.setDraws(ws.getDraws() + 1);
                        curStreak.put(wid, 0);
                    }
                }
            }
        }

        for (PlayerStats ps : statsMap.values()) {
            ps.setCurrentWinStreak(curStreak.getOrDefault(ps.getPlayerId(), 0));
            ps.setWinRate(ps.getTotalGames() > 0 ? (double) ps.getWins() / ps.getTotalGames() : 0);
        }

        List<PlayerStats> list = statsMap.values().stream()
                .filter(s -> s.getTotalGames() > 0)
                .sorted((a, b) -> {
                    switch (sortBy) {
                        case "wins":
                            if (b.getWins() != a.getWins()) return b.getWins() - a.getWins();
                            return Double.compare(b.getWinRate(), a.getWinRate());
                        case "winRate":
                            if (Double.compare(b.getWinRate(), a.getWinRate()) != 0)
                                return Double.compare(b.getWinRate(), a.getWinRate());
                            return b.getWins() - a.getWins();
                        case "winStreak":
                        default:
                            if (b.getBestWinStreak() != a.getBestWinStreak())
                                return b.getBestWinStreak() - a.getBestWinStreak();
                            return Double.compare(b.getWinRate(), a.getWinRate());
                    }
                })
                .limit(Math.max(1, limit))
                .collect(Collectors.toList());

        for (int i = 0; i < list.size(); i++) {
            list.get(i).setRank(i + 1);
        }

        return ResponseEntity.ok(list);
    }

    @GetMapping("/players/{id}/games")
    public ResponseEntity<List<GameState>> getPlayerPublicGames(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        initSeedData();
        List<GameState> playerGames = games.values().stream()
                .filter(g -> g.getWinner() != null && Boolean.TRUE.equals(g.getIsPublic()))
                .filter(g -> id.equals(g.getBlackPlayerId()) || id.equals(g.getWhitePlayerId()))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(Math.max(1, limit))
                .toList();
        return ResponseEntity.ok(playerGames);
    }
}
