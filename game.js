/**
 * ARITHMANIAC - Core Game Engine
 * Modern, Minimalist Math Merge Puzzle Game
 */

// Helper function to format display numbers
function formatNum(val) {
    if (val === null || val === undefined) return '';
    return Math.round(val).toString();
}

// Random Number & Array Utilities
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Tile Data Structure
 */
class Tile {
    constructor({ val, type = 'normal', display = null }) {
        this.val = Math.abs(val); // Always store positive magnitude
        this.type = type;         // 'normal' (+), 'negative' (−)
        this._display = display;
    }

    getNumericValue() {
        return this.type === 'negative' ? -this.val : this.val;
    }

    getDisplayString() {
        if (this._display) return this._display;
        const numStr = formatNum(this.val);
        return this.type === 'negative' ? `−${numStr}` : numStr;
    }

    getOpSymbol() {
        return this.type === 'negative' ? '−' : '+';
    }

    toJSON() {
        return { val: this.val, type: this.type, display: this._display };
    }

    static fromJSON(obj) {
        return obj ? new Tile(obj) : null;
    }
}

function toTileObj(item) {
    if (item === null || item === undefined) return null;
    if (item instanceof Tile) return item;
    if (typeof item === 'number') {
        return item < 0 ? new Tile({ val: Math.abs(item), type: 'negative' }) : new Tile({ val: item, type: 'normal' });
    }
    if (typeof item === 'object') {
        return new Tile(item);
    }
    return null;
}

/**
 * Synthesizer Audio Engine (Web Audio API)
 */
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click'];

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem(GAME_CONFIG.STORAGE_SOUND_SETTING) !== 'false';
        this.initUnlockListeners();
    }

    hasUserGesture() {
        if (typeof navigator !== 'undefined' && navigator.userActivation) {
            return navigator.userActivation.isActive || navigator.userActivation.hasBeenActive;
        }
        return true;
    }

    initUnlockListeners() {
        const unlock = () => {
            if (this.hasUserGesture()) {
                this.init();
            }
            if (this.ctx && this.ctx.state === 'running') {
                UNLOCK_EVENTS.forEach(evt => window.removeEventListener(evt, unlock));
            }
        };
        UNLOCK_EVENTS.forEach(evt => window.addEventListener(evt, unlock));
    }

    init() {
        if (!this.enabled || !this.hasUserGesture()) return;
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        } catch (e) {}
    }

    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.08) {
        if (!this.enabled) return;
        if (!this.ctx) this.init();
        if (!this.ctx || this.ctx.state === 'closed') return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playSelect() { this.playTone(440, 'sine', 0.06, 0.06); }
    playDeselect() { this.playTone(330, 'sine', 0.06, 0.04); }
    playMerge() {
        if (!this.enabled) return;
        this.playTone(523.25, 'triangle', 0.1, 0.1);
        setTimeout(() => this.playTone(659.25, 'sine', 0.12, 0.08), 50);
    }
    playTargetMatched() {
        if (!this.enabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.22, 0.15), idx * 70);
        });
    }
    playError() { this.playTone(180, 'sawtooth', 0.15, 0.08); }
    playGameOver() {
        [300, 260, 220, 180].forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sawtooth', 0.2, 0.08), idx * 90);
        });
    }
}

/**
 * Haptic Vibration Feedback Engine
 */
class HapticEngine {
    constructor() {
        this.enabled = GAME_CONFIG.HAPTICS_ENABLED;
    }

    trigger(pattern = 15) {
        if (this.enabled && 'vibrate' in navigator) {
            try { navigator.vibrate(pattern); } catch (e) {}
        }
    }
}

/**
 * Particle Effects Engine
 */
class ParticleEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    burst(x, y, color = '#ec4899', count = 24) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: 2.5 + Math.random() * 4,
                color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    animate() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animate());
    }
}

/**
 * Main Game Controller
 */
class ArithmaniacGame {
    constructor() {
        this.gridSize = GAME_CONFIG.GRID_SIZE;
        this.grid = [];
        this.selectedIdx = null;
        this.lastDestinationIdx = null;

        this.score = 0;
        this.bestScore = 0;
        this.movesLeft = GAME_CONFIG.INITIAL_MOVES;
        this.targetsCleared = 0;

        this.targetCards = [];
        this.undoStack = [];
        this.undoCount = GAME_CONFIG.MAX_UNDO_PER_GAME;

        this.audio = new AudioEngine();
        this.haptics = new HapticEngine();
        this.particles = new ParticleEngine('particle-canvas');

        this.initDOM();
        this.bindEvents();
        this.loadBestScore();

        if (!this.loadSavedState()) {
            this.startNewGame();
        }
    }

    initDOM() {
        this.gridContainer = document.getElementById('grid-container');
        this.targetsList = document.getElementById('targets-list');
        this.scoreDisplay = document.getElementById('score-display');
        this.movesDisplay = document.getElementById('moves-display');
        this.healthBarFill = document.getElementById('health-bar-fill');
        this.movesCard = document.getElementById('moves-card');
        this.bestDisplay = document.getElementById('best-display');
        this.toastContainer = document.getElementById('toast-container');
        this.undoBtn = document.getElementById('undo-btn');
        this.undoCountDisplay = document.getElementById('undo-count');

        this.settingsModal = document.getElementById('settings-modal');
        this.helpModal = document.getElementById('help-modal');
        this.gameoverModal = document.getElementById('gameover-modal');

        this.soundText = document.getElementById('sound-text');
        this.hapticsText = document.getElementById('haptics-text');

        this.settingsBtn = document.getElementById('settings-btn');
        this.closeSettingsBtn = document.getElementById('close-settings');
        this.soundToggleBtn = document.getElementById('sound-toggle-btn');
        this.hapticsToggleBtn = document.getElementById('haptics-toggle-btn');
        this.menuRestartBtn = document.getElementById('menu-restart-btn');
        this.menuHelpBtn = document.getElementById('menu-help-btn');
        this.closeHelpBtn = document.getElementById('close-help');
        this.startPlayingBtn = document.getElementById('start-playing-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
    }

    bindEvents() {
        // Delegation for Grid Clicks
        this.gridContainer.addEventListener('click', (e) => {
            const cell = e.target.closest('.grid-cell');
            if (cell && cell.dataset.index !== undefined) {
                const idx = parseInt(cell.dataset.index, 10);
                this.handleTileClick(idx);
            }
        });

        // Top Header Actions
        this.undoBtn.addEventListener('click', () => this.undoMove());
        this.settingsBtn.addEventListener('click', () => this.toggleModal(this.settingsModal, true));
        this.closeSettingsBtn.addEventListener('click', () => this.toggleModal(this.settingsModal, false));

        // Settings Items
        this.soundToggleBtn.addEventListener('click', () => {
            this.audio.enabled = !this.audio.enabled;
            localStorage.setItem(GAME_CONFIG.STORAGE_SOUND_SETTING, this.audio.enabled.toString());
            this.soundText.textContent = `Sound Effects: ${this.audio.enabled ? 'ON' : 'OFF'}`;
            this.showToast(this.audio.enabled ? 'Sound On' : 'Sound Off');
            this.haptics.trigger(15);
        });

        this.hapticsToggleBtn.addEventListener('click', () => {
            this.haptics.enabled = !this.haptics.enabled;
            this.hapticsText.textContent = `Haptics: ${this.haptics.enabled ? 'ON' : 'OFF'}`;
            this.showToast(this.haptics.enabled ? 'Haptics On' : 'Haptics Off');
            if (this.haptics.enabled) this.haptics.trigger(30);
        });

        this.menuRestartBtn.addEventListener('click', () => {
            this.toggleModal(this.settingsModal, false);
            this.startNewGame();
        });

        this.menuHelpBtn.addEventListener('click', () => {
            this.toggleModal(this.settingsModal, false);
            this.toggleModal(this.helpModal, true);
        });

        // Help Modal Controls
        this.closeHelpBtn.addEventListener('click', () => this.toggleModal(this.helpModal, false));
        this.startPlayingBtn.addEventListener('click', () => this.toggleModal(this.helpModal, false));

        // Game Over Modal Action
        this.playAgainBtn.addEventListener('click', () => {
            this.toggleModal(this.gameoverModal, false);
            this.startNewGame();
        });

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleModal(this.settingsModal, !this.settingsModal.classList.contains('active'));
            } else if (e.key === 'u' || e.key === 'U') {
                this.undoMove();
            } else if (e.key === 'r' || e.key === 'R') {
                if (confirm('Restart game?')) this.startNewGame();
            }
        });
    }

    toggleModal(modal, show) {
        if (show) {
            modal.classList.add('active');
            this.haptics.trigger(20);
        } else {
            modal.classList.remove('active');
        }
    }

    loadBestScore() {
        const saved = localStorage.getItem(GAME_CONFIG.STORAGE_BEST_SCORE) || '0';
        this.bestScore = parseInt(saved, 10);
        this.bestDisplay.textContent = this.bestScore.toString();
    }

    saveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestDisplay.textContent = this.bestScore.toString();
            localStorage.setItem(GAME_CONFIG.STORAGE_BEST_SCORE, this.bestScore.toString());
        }
    }

    updateUndoBadge() {
        this.undoCountDisplay.textContent = this.undoCount.toString();
        this.undoBtn.style.opacity = this.undoStack.length > 0 && this.undoCount > 0 ? '1' : '0.4';
    }

    serializeGrid() {
        return this.grid.map(t => (t ? t.toJSON() : null));
    }

    saveSnapshot() {
        const snapshot = {
            grid: this.serializeGrid(),
            targetCards: [...this.targetCards],
            score: this.score,
            movesLeft: this.movesLeft,
            targetsCleared: this.targetsCleared
        };
        this.undoStack.push(snapshot);
        if (this.undoStack.length > 5) this.undoStack.shift();
        this.updateUndoBadge();
    }

    undoMove() {
        if (this.undoCount <= 0 || this.undoStack.length === 0) {
            this.showToast('No Undos', 'error');
            this.haptics.trigger([50, 50]);
            return;
        }

        const prev = this.undoStack.pop();
        this.undoCount--;

        this.grid = prev.grid.map(t => Tile.fromJSON(t));
        this.targetCards = [...prev.targetCards];
        this.score = prev.score;
        this.movesLeft = prev.movesLeft;
        this.targetsCleared = prev.targetsCleared;

        this.selectedIdx = null;
        this.lastDestinationIdx = null;

        this.scoreDisplay.textContent = this.score.toString();
        this.updateMovesDisplay();
        this.updateUndoBadge();
        this.renderGrid();
        this.renderTargets();
        this.saveGameState();

        this.audio.playSelect();
        this.haptics.trigger(25);
        this.showToast('Undone', 'info');
    }

    saveGameState() {
        const state = {
            grid: this.serializeGrid(),
            targetCards: this.targetCards,
            score: this.score,
            movesLeft: this.movesLeft,
            targetsCleared: this.targetsCleared,
            undoCount: this.undoCount
        };
        localStorage.setItem(GAME_CONFIG.STORAGE_SAVED_GAME, JSON.stringify(state));
    }

    loadSavedState() {
        const raw = localStorage.getItem(GAME_CONFIG.STORAGE_SAVED_GAME);
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.grid) || data.movesLeft <= 0) return false;

            this.grid = data.grid.map(t => Tile.fromJSON(t));
            this.targetCards = data.targetCards || [];
            this.score = data.score || 0;
            this.movesLeft = data.movesLeft || GAME_CONFIG.INITIAL_MOVES;
            this.targetsCleared = data.targetsCleared || 0;
            this.undoCount = data.undoCount !== undefined ? data.undoCount : GAME_CONFIG.MAX_UNDO_PER_GAME;

            this.scoreDisplay.textContent = this.score.toString();
            this.updateMovesDisplay();
            this.updateUndoBadge();
            this.renderGrid();
            this.renderTargets();
            return true;
        } catch (e) {
            console.error('Failed to restore saved game:', e);
            return false;
        }
    }

    clearSavedState() {
        localStorage.removeItem(GAME_CONFIG.STORAGE_SAVED_GAME);
    }

    updateMovesDisplay() {
        this.movesDisplay.textContent = this.movesLeft.toString();
        const pct = Math.min(100, Math.max(0, (this.movesLeft / GAME_CONFIG.MAX_MOVES_CAP) * 100));
        this.healthBarFill.style.width = `${pct}%`;

        if (this.movesLeft <= GAME_CONFIG.LOW_MOVES_THRESHOLD && this.movesLeft > 0) {
            this.movesCard.classList.add('danger');
            document.body.classList.add('danger-state');
        } else {
            this.movesCard.classList.remove('danger');
            document.body.classList.remove('danger-state');
        }
    }

    startNewGame() {
        this.score = 0;
        this.movesLeft = GAME_CONFIG.INITIAL_MOVES;
        this.targetsCleared = 0;
        this.undoCount = GAME_CONFIG.MAX_UNDO_PER_GAME;
        this.undoStack = [];
        this.selectedIdx = null;
        this.lastDestinationIdx = null;

        this.scoreDisplay.textContent = '0';
        this.updateMovesDisplay();
        this.updateUndoBadge();

        const totalCells = this.gridSize * this.gridSize;
        this.grid = new Array(totalCells).fill(null);

        const initialCount = Math.floor(totalCells * GAME_CONFIG.INITIAL_FILL_RATIO);
        for (let i = 0; i < initialCount; i++) {
            this.spawnRandomTile(true);
        }

        this.refreshTargetCards();
        this.renderGrid();
        this.renderTargets();
        this.saveGameState();
    }

    generateTileValue() {
        const activeTiles = this.grid.filter(Boolean);
        const activeTargets = this.targetCards;
        let spawnedTile = null;

        if (activeTiles.length > 0 && activeTargets.length > 0 && Math.random() < GAME_CONFIG.SMART_SPAWN_CHANCE) {
            const targetVal = getRandomElement(activeTargets);
            const boardTile = getRandomElement(activeTiles);
            const boardVal = boardTile.val;
            const candidates = [];

            if (targetVal > boardVal) {
                const diff = targetVal - boardVal;
                if (diff >= 1 && diff <= GAME_CONFIG.SMART_ADD_MAX_DIFF) {
                    candidates.push(new Tile({ val: Math.round(diff), type: 'normal' }));
                }
            } else if (boardVal > targetVal) {
                const subDiff = boardVal - targetVal;
                if (subDiff >= 1 && subDiff <= GAME_CONFIG.SMART_SUB_MAX_DIFF) {
                    candidates.push(new Tile({ val: Math.round(subDiff), type: 'negative' }));
                }
            }

            if (candidates.length > 0) {
                spawnedTile = getRandomElement(candidates);
            }
        }

        if (!spawnedTile) {
            if (Math.random() < GAME_CONFIG.PROB_NORMAL) {
                const val = getRandomInt(GAME_CONFIG.NORMAL_TILE_MIN, GAME_CONFIG.NORMAL_TILE_MAX);
                spawnedTile = new Tile({ val, type: 'normal' });
            } else {
                const val = getRandomInt(GAME_CONFIG.NEGATIVE_TILE_MIN, GAME_CONFIG.NEGATIVE_TILE_MAX);
                spawnedTile = new Tile({ val, type: 'negative' });
            }
        }

        // Avoid exact match of target as a single tile
        if (this.targetCards.length > 0 && this.targetCards.includes(spawnedTile.val)) {
            spawnedTile.val += 1;
        }

        return spawnedTile;
    }

    spawnRandomTile(silent = false) {
        const emptyIndices = [];
        for (let i = 0; i < this.grid.length; i++) {
            if (this.grid[i] === null) emptyIndices.push(i);
        }

        if (emptyIndices.length === 0) return null;

        const randomIdx = getRandomElement(emptyIndices);
        this.grid[randomIdx] = this.generateTileValue();
        return randomIdx;
    }

    generateSmartTarget() {
        const activeTiles = this.grid.filter(Boolean);
        const activeGridValues = new Set(activeTiles.map(t => t.val));

        if (activeTiles.length >= 2) {
            const shuffled = shuffleArray([...activeTiles]);
            for (let i = 0; i < shuffled.length; i++) {
                for (let j = 0; j < shuffled.length; j++) {
                    if (i === j) continue;
                    const resTile = this.executeOperation(shuffled[i], shuffled[j]);
                    if (resTile) {
                        const candidateVal = resTile.val;
                        if (candidateVal > 0 && !activeGridValues.has(candidateVal) && !this.targetCards.includes(candidateVal)) {
                            return candidateVal;
                        }
                    }
                }
            }
        }

        const validFallbacks = GAME_CONFIG.FALLBACK_TARGETS.filter(val => !activeGridValues.has(val) && !this.targetCards.includes(val));
        if (validFallbacks.length > 0) {
            return getRandomElement(validFallbacks);
        }

        let fallback = getRandomInt(5, 19);
        while (activeGridValues.has(fallback) || this.targetCards.includes(fallback)) {
            fallback++;
        }
        return fallback;
    }

    refreshTargetCards() {
        this.targetCards = [];
        while (this.targetCards.length < GAME_CONFIG.NUM_TARGETS) {
            const target = this.generateSmartTarget();
            if (!this.targetCards.includes(target)) {
                this.targetCards.push(target);
            }
        }
    }

    executeOperation(tileA, tileB) {
        const tA = toTileObj(tileA);
        const tB = toTileObj(tileB);
        if (!tA || !tB) return null;

        // If either tile is negative, subtract its value
        const isSubtract = tA.type === 'negative' || tB.type === 'negative';
        const rawResult = isSubtract ? tA.val - tB.val : tA.val + tB.val;

        if (!Number.isFinite(rawResult)) return null;

        let finalVal = Math.abs(rawResult);
        if (finalVal <= 0) finalVal = 1;
        if (finalVal > 9999) return null;

        return new Tile({ val: Math.round(finalVal), type: 'normal' });
    }

    handleTileClick(idx) {
        if (this.movesLeft <= 0) return;

        const tileVal = this.grid[idx];

        // 1. Select First Tile
        if (this.selectedIdx === null) {
            if (tileVal !== null) {
                this.selectedIdx = idx;
                this.lastDestinationIdx = null;
                this.audio.playSelect();
                this.haptics.trigger(15);
                this.renderGrid();
            }
            return;
        }

        // 2. Deselect on re-clicking selected tile
        if (this.selectedIdx === idx) {
            this.selectedIdx = null;
            this.lastDestinationIdx = null;
            this.audio.playDeselect();
            this.haptics.trigger(10);
            this.renderGrid();
            return;
        }

        // 3. Clicked empty space
        if (tileVal === null) {
            this.selectedIdx = null;
            this.lastDestinationIdx = null;
            this.audio.playDeselect();
            this.renderGrid();
            return;
        }

        // 4. Perform Operation
        const sourceIdx = this.selectedIdx;
        const sourceVal = this.grid[sourceIdx];
        const resultTile = this.executeOperation(sourceVal, tileVal);

        if (!resultTile) {
            this.audio.playError();
            this.haptics.trigger([40, 40]);
            this.showToast('Invalid', 'error');
            this.selectedIdx = null;
            this.renderGrid();
            return;
        }

        // Save State snapshot prior to executing move
        this.saveSnapshot();

        // Update Board
        this.grid[sourceIdx] = null;
        this.grid[idx] = resultTile;
        this.selectedIdx = null;

        this.audio.playMerge();
        this.haptics.trigger(25);

        const resultNumeric = resultTile.getNumericValue();
        const matchedTargetIdx = this.targetCards.findIndex(t => Math.abs(t - resultNumeric) < 0.001);
        let wasTargetMatched = false;
        const spawnedIndices = [];

        if (matchedTargetIdx !== -1) {
            wasTargetMatched = true;
            this.lastDestinationIdx = idx;
            this.handleTargetMatch(matchedTargetIdx, resultNumeric, idx);
        } else {
            this.movesLeft = Math.max(0, this.movesLeft - GAME_CONFIG.MOVE_COST);
            this.lastDestinationIdx = idx;
        }

        const countToSpawn = wasTargetMatched ? GAME_CONFIG.TILES_SPAWNED_ON_HIT : GAME_CONFIG.TILES_SPAWNED_ON_MISS;
        for (let i = 0; i < countToSpawn; i++) {
            const spawnIdx = this.spawnRandomTile();
            if (spawnIdx !== null) spawnedIndices.push(spawnIdx);
        }

        this.updateMovesDisplay();
        this.renderGrid(idx, spawnedIndices);
        this.renderTargets();
        this.saveGameState();

        if (this.movesLeft <= 0 || this.isBoardStuck()) {
            setTimeout(() => this.triggerGameOver(), GAME_CONFIG.GAMEOVER_DELAY_MS);
        }
    }

    showFloatingPopup(x, y, mainText, subText = null) {
        if (!x || !y) return;
        const popup = document.createElement('div');
        popup.className = 'floating-popup';
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        popup.innerHTML = `<span class="float-score">${mainText}</span>` + (subText ? `<span class="float-moves">${subText}</span>` : '');
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1300);
    }

    handleTargetMatch(targetIdx, targetValue, destinationIdx = null) {
        this.targetsCleared++;
        this.audio.playTargetMatched();
        this.haptics.trigger([30, 40, 60]);

        const targetEls = document.querySelectorAll('.target-card');
        if (targetEls[targetIdx]) {
            const rect = targetEls[targetIdx].getBoundingClientRect();
            this.particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, GAME_CONFIG.PARTICLE_COLOR_TARGET, GAME_CONFIG.PARTICLE_COUNT_TARGET);
            targetEls[targetIdx].classList.add('matched');
        }

        const bonus = Math.round(targetValue * GAME_CONFIG.SCORE_MULTIPLIER);
        this.score += bonus;
        this.scoreDisplay.textContent = this.score.toString();

        const extraMoves = GAME_CONFIG.TARGET_REWARD;
        this.movesLeft = Math.min(GAME_CONFIG.MAX_MOVES_CAP, this.movesLeft + extraMoves);
        this.updateMovesDisplay();

        this.saveBestScore();
        this.showToast(`+${bonus}`, 'success');

        // Floating score/moves popup at tap location
        if (destinationIdx !== null) {
            const cellEl = document.querySelector(`.grid-cell[data-index="${destinationIdx}"]`);
            if (cellEl) {
                const rect = cellEl.getBoundingClientRect();
                this.showFloatingPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, `+${bonus}`, `+${extraMoves} MOVES!`);
                this.particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, '#f59e0b', 14);
            }
        }

        setTimeout(() => {
            const newTarget = this.generateSmartTarget();
            this.targetCards[targetIdx] = newTarget;
            this.renderTargets();
            this.saveGameState();
        }, GAME_CONFIG.TARGET_REPLACE_DELAY_MS);
    }

    isBoardStuck() {
        const activeCount = this.grid.filter(Boolean).length;
        return activeCount === this.gridSize * this.gridSize && this.movesLeft <= 0;
    }

    triggerGameOver() {
        this.clearSavedState();
        this.audio.playGameOver();
        this.haptics.trigger([100, 50, 100, 50, 150]);

        document.getElementById('final-score').textContent = this.score.toString();
        document.getElementById('final-targets').textContent = this.targetsCleared.toString();
        this.toggleModal(this.gameoverModal, true);
    }

    showToast(msg, type = 'info') {
        if (!msg) return;
        this.toastContainer.innerHTML = '';
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        this.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), GAME_CONFIG.TOAST_FADE_MS);
        }, GAME_CONFIG.TOAST_DURATION_MS);
    }

    renderTargets() {
        this.targetsList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < this.targetCards.length; i++) {
            const val = this.targetCards[i];
            const card = document.createElement('div');
            card.className = 'target-card';
            card.innerHTML = `<span class="target-value">${formatNum(val)}</span>`;
            fragment.appendChild(card);
        }
        this.targetsList.appendChild(fragment);
    }

    renderGrid(mergedIdx = null, spawnedIndices = []) {
        this.gridContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const spawnedSet = new Set(Array.isArray(spawnedIndices) ? spawnedIndices : []);

        for (let idx = 0; idx < this.grid.length; idx++) {
            const tile = this.grid[idx];
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = idx.toString();

            if (!tile) {
                cell.classList.add('empty');
            } else {
                cell.classList.add(`tile-${tile.type}`);
                cell.textContent = tile.getDisplayString();

                if (idx === this.selectedIdx) {
                    cell.classList.add('selected');
                } else if (idx === this.lastDestinationIdx) {
                    cell.classList.add('destination-selected');
                }

                if (idx === mergedIdx) {
                    cell.classList.add('tile-merged');
                }
                if (spawnedSet.has(idx)) {
                    cell.classList.add('tile-spawn');
                }
            }

            fragment.appendChild(cell);
        }
        this.gridContainer.appendChild(fragment);
    }
}

// Initialize Game Instance when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.game = new ArithmaniacGame();
});
