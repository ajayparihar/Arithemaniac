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
    INITIAL_MOVES: 3,              // Starting moves / health
    MAX_MOVES_CAP: 10,              // Maximum health capacity
    MOVE_COST: 1,                   // Moves deducted per non-target operation
    TARGET_REWARD: 1,               // Moves awarded per target match
    LOW_MOVES_THRESHOLD: 2,         // Low moves alert threshold

    // ── Spawning Rules ────────────────────────────────────────
    TILES_SPAWNED_ON_HIT: 1,        // Spawns on target match
    TILES_SPAWNED_ON_MISS: 1,       // Spawns on non-target operation

    // ── Target Cards ─────────────────────────────────────────
    NUM_TARGETS: 3,                 // Active targets count shown at top

    // ── Tile Generation & Smart Spawning ─────────────────────
    SMART_SPAWN_CHANCE: 0.65,       // Probability of board-derived smart tile spawn

    // Tile value boundaries
    NORMAL_TILE_MIN: 1,
    NORMAL_TILE_MAX: 8,

    NEGATIVE_TILE_MIN: 1,
    NEGATIVE_TILE_MAX: 6,

    // Spawn probability threshold (normal below, negative above)
    PROB_NORMAL: 0.50,              // 50% Addition (+), 50% Subtraction (−)

    // Smart-spawn bounds
    SMART_ADD_MAX_DIFF: 12,
    SMART_SUB_MAX_DIFF: 10,

    // Fallback target numbers when board derivation fails
    FALLBACK_TARGETS: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],

    // ── Scoring & UX ──────────────────────────────────────────
    SCORE_MULTIPLIER: 10,           // Score = targetValue × SCORE_MULTIPLIER
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
