/**
 * ARITHMANIAC - Core Game Engine
 * Modern, Minimalist Math Merge Puzzle Game
 */

// Helper function to format display numbers
function formatNum(val) {
    if (val === null || val === undefined) return '';
    return Math.round(val).toString();
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
        return this._display || formatNum(this.val);
    }

    getOpSymbol() {
        return this.type === 'negative' ? '−' : '+';
    }

    toJSON() {
        return { val: this.val, type: this.type, display: this._display };
    }

    static fromJSON(obj) {
        if (!obj) return null;
        return new Tile(obj);
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
                ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt => {
                    window.removeEventListener(evt, unlock);
                });
            }
        };

        ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt => {
            window.addEventListener(evt, unlock);
        });
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
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        if (this.ctx.state === 'closed') return;
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

            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
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

        this.hapticsEnabled = true;

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
        document.getElementById('settings-btn').addEventListener('click', () => this.toggleModal(this.settingsModal, true));
        document.getElementById('close-settings').addEventListener('click', () => this.toggleModal(this.settingsModal, false));

        // Settings Items
        document.getElementById('sound-toggle-btn').addEventListener('click', () => {
            this.audio.enabled = !this.audio.enabled;
            localStorage.setItem(GAME_CONFIG.STORAGE_SOUND_SETTING, this.audio.enabled.toString());
            this.soundText.textContent = `Sound Effects: ${this.audio.enabled ? 'ON' : 'OFF'}`;
            this.showToast(this.audio.enabled ? 'Sound On' : 'Sound Off');
            this.haptics.trigger(15);
        });

        document.getElementById('haptics-toggle-btn').addEventListener('click', () => {
            this.haptics.enabled = !this.haptics.enabled;
            this.hapticsText.textContent = `Haptics: ${this.haptics.enabled ? 'ON' : 'OFF'}`;
            this.showToast(this.haptics.enabled ? 'Haptics On' : 'Haptics Off');
            if (this.haptics.enabled) this.haptics.trigger(30);
        });

        document.getElementById('menu-restart-btn').addEventListener('click', () => {
            this.toggleModal(this.settingsModal, false);
            this.startNewGame();
        });

        document.getElementById('menu-help-btn').addEventListener('click', () => {
            this.toggleModal(this.settingsModal, false);
            this.toggleModal(this.helpModal, true);
        });

        // Help Modal Controls
        document.getElementById('close-help').addEventListener('click', () => this.toggleModal(this.helpModal, false));
        document.getElementById('start-playing-btn').addEventListener('click', () => this.toggleModal(this.helpModal, false));

        // Game Over Modal Action
        document.getElementById('play-again-btn').addEventListener('click', () => {
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

    saveSnapshot() {
        const snapshot = {
            grid: this.grid.map(t => (t ? t.toJSON() : null)),
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
            grid: this.grid.map(t => (t ? t.toJSON() : null)),
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
        } else {
            this.movesCard.classList.remove('danger');
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
        const activeTiles = this.grid.filter(v => v !== null).map(toTileObj);
        const activeTargets = this.targetCards;
        let spawnedTile = null;

        if (activeTiles.length > 0 && activeTargets.length > 0 && Math.random() < GAME_CONFIG.SMART_SPAWN_CHANCE) {
            const targetVal = activeTargets[Math.floor(Math.random() * activeTargets.length)];
            const boardTile = activeTiles[Math.floor(Math.random() * activeTiles.length)];
            const boardVal = Math.abs(boardTile.val);
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
                spawnedTile = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        if (!spawnedTile) {
            const randType = Math.random();
            if (randType < GAME_CONFIG.PROB_NORMAL) {
                const val = Math.floor(Math.random() * (GAME_CONFIG.NORMAL_TILE_MAX - GAME_CONFIG.NORMAL_TILE_MIN + 1)) + GAME_CONFIG.NORMAL_TILE_MIN;
                spawnedTile = new Tile({ val, type: 'normal' });
            } else {
                const val = Math.floor(Math.random() * (GAME_CONFIG.NEGATIVE_TILE_MAX - GAME_CONFIG.NEGATIVE_TILE_MIN + 1)) + GAME_CONFIG.NEGATIVE_TILE_MIN;
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
        this.grid.forEach((val, idx) => {
            if (val === null) emptyIndices.push(idx);
        });

        if (emptyIndices.length === 0) return null;

        const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        this.grid[randomIdx] = this.generateTileValue();
        return randomIdx;
    }

    generateSmartTarget() {
        const activeTiles = this.grid.filter(v => v !== null).map(toTileObj);
        const activeGridValues = new Set(activeTiles.map(t => Math.abs(t.val)));

        if (activeTiles.length >= 2) {
            const shuffled = [...activeTiles].sort(() => Math.random() - 0.5);
            for (let i = 0; i < shuffled.length; i++) {
                for (let j = 0; j < shuffled.length; j++) {
                    if (i === j) continue;
                    const resTile = this.executeOperation(shuffled[i], shuffled[j]);
                    if (resTile && resTile.getNumericValue() > 0) {
                        const candidateVal = Math.round(resTile.getNumericValue());
                        if (!activeGridValues.has(candidateVal) && !this.targetCards.includes(candidateVal)) {
                            return candidateVal;
                        }
                    }
                }
            }
        }

        const validFallbacks = GAME_CONFIG.FALLBACK_TARGETS.filter(val => !activeGridValues.has(val) && !this.targetCards.includes(val));
        if (validFallbacks.length > 0) {
            return validFallbacks[Math.floor(Math.random() * validFallbacks.length)];
        }

        let fallback = Math.floor(Math.random() * 15) + 5;
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

        let rawResult = null;

        // If either tile is negative, subtract its value
        if (tB.type === 'negative') {
            rawResult = Math.abs(tA.val) - Math.abs(tB.val);
        } else if (tA.type === 'negative') {
            rawResult = Math.abs(tA.val) - Math.abs(tB.val);
        } else {
            // Both are normal (+) tiles — add
            rawResult = Math.abs(tA.val) + Math.abs(tB.val);
        }

        if (rawResult === null || isNaN(rawResult) || !isFinite(rawResult)) return null;

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
        let spawnedIndices = [];

        if (matchedTargetIdx !== -1) {
            wasTargetMatched = true;
            this.lastDestinationIdx = idx;
            this.handleTargetMatch(matchedTargetIdx, resultNumeric);
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

    handleTargetMatch(targetIdx, targetValue) {
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

        setTimeout(() => {
            const newTarget = this.generateSmartTarget();
            this.targetCards[targetIdx] = newTarget;
            this.renderTargets();
            this.saveGameState();
        }, GAME_CONFIG.TARGET_REPLACE_DELAY_MS);
    }

    isBoardStuck() {
        const activeCount = this.grid.filter(v => v !== null).length;
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
        this.targetCards.forEach(val => {
            const card = document.createElement('div');
            card.className = 'target-card';
            const displayVal = formatNum(val);
            card.innerHTML = `
                <span class="target-value">${displayVal}</span>
            `;
            this.targetsList.appendChild(card);
        });
    }

    renderGrid(mergedIdx = null, spawnedIndices = []) {
        this.gridContainer.innerHTML = '';
        const spawnedList = Array.isArray(spawnedIndices) ? spawnedIndices : [];

        this.grid.forEach((rawItem, idx) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = idx.toString();
            
            const tile = toTileObj(rawItem);

            if (tile === null) {
                cell.classList.add('empty');
            } else {
                cell.classList.add(`tile-${tile.type}`);
                cell.textContent = tile.getDisplayString();

                const badge = document.createElement('span');
                badge.className = 'tile-op-badge';
                badge.textContent = tile.getOpSymbol();
                cell.appendChild(badge);

                if (idx === this.selectedIdx) {
                    cell.classList.add('selected');
                } else if (idx === this.lastDestinationIdx) {
                    cell.classList.add('destination-selected');
                }

                if (idx === mergedIdx) {
                    cell.classList.add('tile-merged');
                }
                if (spawnedList.includes(idx)) {
                    cell.classList.add('tile-spawn');
                }
            }

            this.gridContainer.appendChild(cell);
        });
    }
}

// Initialize Game Instance when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.game = new ArithmaniacGame();
});
