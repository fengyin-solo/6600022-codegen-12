package com.gobang.model;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PlayerStats {
    private String playerId;
    private String playerName;
    private int totalGames;
    private int wins;
    private int losses;
    private int draws;
    private double winRate;
    private int currentWinStreak;
    private int bestWinStreak;
    private Integer rank;
}
