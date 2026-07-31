/**
 * ARITHMANIAC - Game Constants
 * ─────────────────────────────────────────────────────────────
 * Centralized, immutable game configuration settings.
 */

const GAME_CONFIG = Object.freeze({

    // ── Grid & Setup ──────────────────────────────────────────
    GRID_SIZE: 4,                   // Board dimension (4x4)
    INITIAL_FILL_RATIO: 0.45,       // Initial grid fill percentage (0–1)

    // ── Moves / Health System ──────────────────────────────────
    INITIAL_MOVES: 10,              // Starting moves / health
    MAX_MOVES_CAP: 30,              // Maximum health capacity
    MOVE_COST: 1,                   // Moves deducted per non-target operation
    TARGET_REWARD: 2,               // Moves awarded per target match
    LOW_MOVES_THRESHOLD: 3,         // Low moves alert threshold

    // ── Spawning Rules ────────────────────────────────────────
    TILES_SPAWNED_ON_HIT: 1,        // Spawns on target match
    TILES_SPAWNED_ON_MISS: 2,       // Spawns on non-target operation

    // ── Target Cards ─────────────────────────────────────────
    NUM_TARGETS: 3,                 // Active targets count shown at top

    // ── Tile Generation & Smart Spawning ─────────────────────
    SMART_SPAWN_CHANCE: 0.65,       // Probability of board-derived smart tile spawn

    // Tile value boundaries
    NORMAL_TILE_MIN: 1,
    NORMAL_TILE_MAX: 8,

    NEGATIVE_TILE_MIN: 1,
    NEGATIVE_TILE_MAX: 6,

    MULTIPLY_VALUES: [2, 3, 4],
    DIVIDE_VALUES: [2, 3, 4],

    // Spawn probabilities (cumulative thresholds)
    PROB_NORMAL:    0.40,           // Addition (+)
    PROB_NEGATIVE:  0.65,           // Subtraction (−)
    PROB_MULTIPLY:  0.85,           // Multiplication (×)
    // Division (÷) accounts for remaining 0.15

    // Smart-spawn bounds
    SMART_ADD_MAX_DIFF: 12,
    SMART_MULT_MIN: 2,
    SMART_MULT_MAX: 5,
    SMART_SUB_MAX_DIFF: 10,
    SMART_DIV_MIN: 2,
    SMART_DIV_MAX: 6,

    // Fallback target numbers when board derivation fails
    FALLBACK_TARGETS: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24],

    // ── Scoring & UX ──────────────────────────────────────────
    SCORE_MULTIPLIER: 10,           // Score = targetValue × SCORE_MULTIPLIER × combo
    MAX_UNDO_PER_GAME: 3,           // Maximum undo moves per game session
    HAPTICS_ENABLED: true,          // Haptic vibration feedback for mobile

    // ── Visual Particle FX ─────────────────────────────────────
    PARTICLE_COUNT_TARGET: 28,      // Particles burst on target match
    PARTICLE_COLOR_TARGET: '#ec4899',

    // ── Storage Keys ──────────────────────────────────────────
    STORAGE_BEST_SCORE: 'arithmaniac_best_score',
    STORAGE_SAVED_GAME: 'arithmaniac_saved_game',
    STORAGE_SOUND_SETTING: 'arithmaniac_sound_on',

    // ── Timings ───────────────────────────────────────────────
    GAMEOVER_DELAY_MS: 400,
    TARGET_REPLACE_DELAY_MS: 250,
    TOAST_DURATION_MS: 1100,
    TOAST_FADE_MS: 200,
});
