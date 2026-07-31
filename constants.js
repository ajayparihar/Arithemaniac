/**
 * ARITHAMANIAC - Game Constants
 * ─────────────────────────────────────────────────────────────
 * All tunable values live here. Tweak freely without touching game logic.
 */

const GAME_CONFIG = Object.freeze({

    // ── Grid ─────────────────────────────────────────────────
    GRID_SIZE: 4,                   // Board dimension (GRID_SIZE × GRID_SIZE)
    INITIAL_FILL_RATIO: 0.45,       // Fraction of cells filled at game start (0–1)

    // ── Moves / Health Bar ────────────────────────────────────
    INITIAL_MOVES: 10,              // Starting health / move count
    MAX_MOVES_CAP: 30,              // Maximum health bar capacity
    MOVE_COST: 1,                   // Moves deducted per miss / non-target operation
    TARGET_REWARD: 2,               // Moves awarded on a successful target match
    LOW_MOVES_THRESHOLD: 3,         // Below this count the health bar turns red

    // ── Spawning ──────────────────────────────────────────────
    TILES_SPAWNED_ON_HIT: 1,        // New tiles to spawn when a target IS matched
    TILES_SPAWNED_ON_MISS: 2,       // New tiles to spawn when a target is NOT matched

    // ── Target Cards ─────────────────────────────────────────
    NUM_TARGETS: 3,                 // How many target numbers are shown at once

    // ── Tile Generation ───────────────────────────────────────
    SMART_SPAWN_CHANCE: 0.65,       // Probability of using smart (board-derived) spawning

    // Normal (+) tile value range [min, max]
    NORMAL_TILE_MIN: 1,
    NORMAL_TILE_MAX: 8,

    // Negative (−) tile value range [min, max]
    NEGATIVE_TILE_MIN: 1,
    NEGATIVE_TILE_MAX: 6,

    // Multiply (×) tile possible values
    MULTIPLY_VALUES: [2, 3, 4],

    // Divide (÷) tile possible values
    DIVIDE_VALUES: [2, 3, 4],

    // Tile type probability breakpoints (cumulative, must reach 1.0)
    // [0 – PROB_NORMAL) → Normal, [PROB_NORMAL – PROB_NEGATIVE) → Negative, etc.
    PROB_NORMAL:    0.40,
    PROB_NEGATIVE:  0.65,
    PROB_MULTIPLY:  0.85,
    // Remainder (1.0 – PROB_MULTIPLY) → Divide

    // Smart-spawn: max difference for an additive complement tile
    SMART_ADD_MAX_DIFF: 12,
    // Smart-spawn: max multiplier value accepted
    SMART_MULT_MIN: 2,
    SMART_MULT_MAX: 5,
    // Smart-spawn: max subtraction complement value
    SMART_SUB_MAX_DIFF: 10,
    // Smart-spawn: accepted divisor range
    SMART_DIV_MIN: 2,
    SMART_DIV_MAX: 6,

    // ── Fallback Targets ──────────────────────────────────────
    // Pool used when no valid board-derived target can be computed
    FALLBACK_TARGETS: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24],

    // ── Scoring ───────────────────────────────────────────────
    SCORE_MULTIPLIER: 10,           // Base points = targetValue × SCORE_MULTIPLIER × combo

    // ── Particles ─────────────────────────────────────────────
    PARTICLE_COUNT_TARGET: 30,      // Particles burst on target match
    PARTICLE_COLOR_TARGET: '#ec4899',

    // ── Misc ──────────────────────────────────────────────────
    GAMEOVER_DELAY_MS: 500,         // Delay before showing game-over screen
    TARGET_REPLACE_DELAY_MS: 300,   // Delay before swapping out a matched target card
    TOAST_DURATION_MS: 2200,        // How long toast notifications stay visible
    TOAST_FADE_MS: 300,             // Toast fade-out animation duration
});
