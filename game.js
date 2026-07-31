/**
 * ARITHAMANIAC - Game Logic & Architecture
 * Modern Minimalist Math Merge Game
 */

function formatNum(val) {
    if (val === null || val === undefined) return '';
    return Math.round(val).toString();
}

class Tile {
    constructor({ val, type = 'normal', display = null }) {
        this.val = Math.abs(val); // magnitude value (always non-negative)
        this.type = type; // 'normal' | 'negative' | 'multiply' | 'divide'
        this._display = display;
    }

    getNumericValue() {
        if (this.type === 'negative') return -this.val;
        return this.val;
    }

    getDisplayString() {
        if (this._display) return this._display;
        return formatNum(this.val);
    }

    getOpSymbol() {
        if (this.type === 'negative') return '−';
        if (this.type === 'multiply') return '×';
        if (this.type === 'divide') return '÷';
        return '+';
    }
}

function toTileObj(item) {
    if (item === null || item === undefined) return null;
    if (item instanceof Tile) return item;
    if (typeof item === 'number') {
        if (item < 0) {
            return new Tile({ val: Math.abs(item), type: 'negative' });
        }
        return new Tile({ val: item, type: 'normal' });
    }
    if (typeof item === 'object') {
        return new Tile(item);
    }
    return null;
}

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1) {
        if (!this.enabled || !this.ctx) return;
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
        } catch (e) {
            console.error(e);
        }
    }

    playSelect() {
        this.playTone(440, 'sine', 0.08, 0.08);
    }

    playDeselect() {
        this.playTone(330, 'sine', 0.08, 0.05);
    }

    playMerge() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(523.25, 'triangle', 0.12, 0.12);
        setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.1), 60);
    }

    playTargetMatched() {
        if (!this.enabled || !this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.25, 0.15), idx * 70);
        });
    }

    playError() {
        this.playTone(180, 'sawtooth', 0.2, 0.1);
    }

    playGameOver() {
        const notes = [300, 260, 220, 180];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sawtooth', 0.25, 0.1), idx * 100);
        });
    }
}

class ParticleEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    burst(x, y, color = '#10b981', count = 24) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: 3 + Math.random() * 5,
                color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
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

class ArithamaniacGame {
    constructor() {
        this.gridSize = GAME_CONFIG.GRID_SIZE; // 4x4 default
        this.mode = 'mix'; // Mixed mode only
        this.grid = [];
        this.selectedIdx = null;
        this.lastDestinationIdx = null;
        
        this.score = 0;
        this.bestScore = 0;
        this.movesLeft = GAME_CONFIG.INITIAL_MOVES;
        this.combo = 1;
        this.maxCombo = 1;
        this.targetsCleared = 0;
        
        this.targetCards = [];
        this.numTargets = GAME_CONFIG.NUM_TARGETS;

        this.audio = new AudioEngine();
        this.particles = new ParticleEngine('particle-canvas');

        this.initDOM();
        this.bindEvents();
        this.loadBestScore();
        this.startNewGame();
    }

    initDOM() {
        this.gridContainer = document.getElementById('grid-container');
        this.targetsList = document.getElementById('targets-list');
        this.scoreDisplay = document.getElementById('score-display');
        this.comboDisplay = document.getElementById('combo-display');
        this.movesDisplay = document.getElementById('moves-display');
        this.healthBarFill = document.getElementById('health-bar-fill');
        this.movesCard = document.getElementById('moves-card');
        this.bestDisplay = document.getElementById('best-display');
        this.toastContainer = document.getElementById('toast-container');

        this.settingsModal = document.getElementById('settings-modal');
        this.helpModal = document.getElementById('help-modal');
        this.gameoverModal = document.getElementById('gameover-modal');

        this.soundIcon = document.getElementById('sound-icon');
        this.soundText = document.getElementById('sound-text');
    }

    bindEvents() {
        // Audio unlock on user interaction
        document.body.addEventListener('click', () => this.audio.init(), { once: true });

        // Settings Modal Controls
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.settingsModal.classList.add('active');
        });
        document.getElementById('close-settings').addEventListener('click', () => {
            this.settingsModal.classList.remove('active');
        });

        // Sound toggle inside settings drawer
        const soundBtn = document.getElementById('sound-toggle-btn');
        soundBtn.addEventListener('click', () => {
            this.audio.enabled = !this.audio.enabled;
            if (this.soundIcon && this.soundText) {
                this.soundIcon.textContent = this.audio.enabled ? '🔊' : '🔇';
                this.soundText.textContent = this.audio.enabled ? 'Sound Effects: ON' : 'Sound Effects: OFF';
            }
            this.showToast(this.audio.enabled ? 'Sound Enabled' : 'Sound Muted');
        });

        // Restart from Settings drawer
        document.getElementById('menu-restart-btn').addEventListener('click', () => {
            this.settingsModal.classList.remove('active');
            this.startNewGame();
        });

        // Help from Settings drawer
        document.getElementById('menu-help-btn').addEventListener('click', () => {
            this.settingsModal.classList.remove('active');
            this.helpModal.classList.add('active');
        });

        // Help Modal Close Buttons
        document.getElementById('close-help').addEventListener('click', () => this.helpModal.classList.remove('active'));
        document.getElementById('start-playing-btn').addEventListener('click', () => this.helpModal.classList.remove('active'));

        // Play Again
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.gameoverModal.classList.remove('active');
            this.startNewGame();
        });
    }

    loadBestScore() {
        const key = `arithamaniac_best_mix`;
        const saved = localStorage.getItem(key) || '0';
        this.bestScore = parseInt(saved);
        this.bestDisplay.textContent = this.bestScore;
    }

    saveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestDisplay.textContent = this.bestScore;
            const key = `arithamaniac_best_mix`;
            localStorage.setItem(key, this.bestScore.toString());
        }
    }

    updateMovesDisplay() {
        if (this.movesDisplay) {
            this.movesDisplay.textContent = this.movesLeft;
        }
        if (this.healthBarFill) {
            const pct = Math.min(100, Math.max(0, (this.movesLeft / GAME_CONFIG.MAX_MOVES_CAP) * 100));
            this.healthBarFill.style.width = `${pct}%`;
        }
        const card = this.movesCard || (this.movesDisplay ? this.movesDisplay.closest('.stat-card') : null);
        if (card) {
            if (this.movesLeft <= GAME_CONFIG.LOW_MOVES_THRESHOLD && this.movesLeft > 0) {
                card.classList.add('danger');
            } else {
                card.classList.remove('danger');
            }
        }
    }

    startNewGame() {
        this.score = 0;
        this.movesLeft = GAME_CONFIG.INITIAL_MOVES;
        this.combo = 1;
        this.maxCombo = 1;
        this.targetsCleared = 0;
        this.selectedIdx = null;
        this.lastDestinationIdx = null;

        this.scoreDisplay.textContent = '0';
        this.comboDisplay.textContent = 'x1';
        this.updateMovesDisplay();

        // Configure Grid
        const totalCells = this.gridSize * this.gridSize;
        this.grid = new Array(totalCells).fill(null);

        // Update container grid class
        this.gridContainer.className = `grid-container grid-${this.gridSize}x${this.gridSize}`;

        // Initial Tile Population
        const initialCount = Math.floor(totalCells * GAME_CONFIG.INITIAL_FILL_RATIO);
        for (let i = 0; i < initialCount; i++) {
            this.spawnRandomTile(true);
        }

        // Generate Target Cards based on board
        this.refreshTargetCards();

        this.renderGrid();
        this.renderTargets();
    }

    generateTileValue() {
        // Smart spawning: derive from existing grid tiles & target cards
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
                if (boardVal > 0 && targetVal % boardVal === 0) {
                    const mult = targetVal / boardVal;
                    if (mult >= GAME_CONFIG.SMART_MULT_MIN && mult <= GAME_CONFIG.SMART_MULT_MAX) {
                        candidates.push(new Tile({ val: mult, type: 'multiply' }));
                    }
                }
            } else if (boardVal > targetVal) {
                const subDiff = boardVal - targetVal;
                if (subDiff >= 1 && subDiff <= GAME_CONFIG.SMART_SUB_MAX_DIFF) {
                    candidates.push(new Tile({ val: Math.round(subDiff), type: 'negative' }));
                }
                if (targetVal > 0) {
                    const divFactor = Math.ceil(boardVal / targetVal);
                    if (divFactor >= GAME_CONFIG.SMART_DIV_MIN && divFactor <= GAME_CONFIG.SMART_DIV_MAX) {
                        candidates.push(new Tile({ val: divFactor, type: 'divide' }));
                    }
                }
            }

            if (candidates.length > 0) {
                spawnedTile = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        if (!spawnedTile) {
            // Balanced random tile spawning for Mix mode
            const randType = Math.random();
            if (randType < GAME_CONFIG.PROB_NORMAL) { // Normal (+)
                const min = GAME_CONFIG.NORMAL_TILE_MIN;
                const max = GAME_CONFIG.NORMAL_TILE_MAX;
                spawnedTile = new Tile({ val: Math.floor(Math.random() * (max - min + 1)) + min, type: 'normal' });
            } else if (randType < GAME_CONFIG.PROB_NEGATIVE) { // Negative (-) -> subtracts
                const min = GAME_CONFIG.NEGATIVE_TILE_MIN;
                const max = GAME_CONFIG.NEGATIVE_TILE_MAX;
                spawnedTile = new Tile({ val: Math.floor(Math.random() * (max - min + 1)) + min, type: 'negative' });
            } else if (randType < GAME_CONFIG.PROB_MULTIPLY) { // Multiplier (*) -> multiplies whole numbers
                const mults = GAME_CONFIG.MULTIPLY_VALUES;
                spawnedTile = new Tile({ val: mults[Math.floor(Math.random() * mults.length)], type: 'multiply' });
            } else { // Divider (/) -> divides taking ceiling
                const divs = GAME_CONFIG.DIVIDE_VALUES;
                spawnedTile = new Tile({ val: divs[Math.floor(Math.random() * divs.length)], type: 'divide' });
            }
        }

        // Ensure spawned tile magnitude is NEVER directly matching an active target card as a single tile!
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
        const tileObj = this.generateTileValue();
        this.grid[randomIdx] = tileObj;
        return randomIdx;
    }

    /**
     * Smart Target Generator: Algorithm guaranteeing playability!
     * Generates targets derived from combinations of active board numbers.
     * RULE: Target number CANNOT be a single number currently present on the grid!
     */
    generateSmartTarget() {
        const activeTiles = this.grid.filter(v => v !== null).map(toTileObj);
        const activeGridValues = new Set(activeTiles.map(t => Math.abs(t.val)));

        if (activeTiles.length >= 2) {
            const shuffled = [...activeTiles].sort(() => Math.random() - 0.5);
            for (let i = 0; i < shuffled.length; i++) {
                for (let j = 0; j < shuffled.length; j++) {
                    if (i === j) continue;
                    const t1 = shuffled[i];
                    const t2 = shuffled[j];
                    
                    const resTile = this.executeOperation(t1, t2, this.mode);
                    if (resTile && resTile.getNumericValue() > 0) {
                        const candidateVal = Math.round(resTile.getNumericValue());
                        // Target CANNOT be already present as a single tile on grid AND cannot be already in target cards!
                        if (!activeGridValues.has(candidateVal) && !this.targetCards.includes(candidateVal)) {
                            return candidateVal;
                        }
                    }
                }
            }
        }

        // Fallback target generation: must also filter out single numbers already on grid
        const mixFallbacks = GAME_CONFIG.FALLBACK_TARGETS;
        const validFallbacks = mixFallbacks.filter(val => !activeGridValues.has(val) && !this.targetCards.includes(val));
        
        if (validFallbacks.length > 0) {
            return validFallbacks[Math.floor(Math.random() * validFallbacks.length)];
        }

        // Ultimate safety fallback
        let fallback = Math.floor(Math.random() * 20) + 5;
        while (activeGridValues.has(fallback) || this.targetCards.includes(fallback)) {
            fallback++;
        }
        return fallback;
    }

    refreshTargetCards() {
        this.targetCards = [];
        while (this.targetCards.length < this.numTargets) {
            const target = this.generateSmartTarget();
            if (!this.targetCards.includes(target)) {
                this.targetCards.push(target);
            }
        }
    }

    executeOperation(tileA, tileB, mode) {
        const tA = toTileObj(tileA);
        const tB = toTileObj(tileB);
        if (!tA || !tB) return null;

        const valA = tA.getNumericValue();
        const valB = tB.getNumericValue();

        let rawResult = null;

        if (mode === 'add') {
            rawResult = valA + valB;
        } else if (mode === 'sub') {
            rawResult = valA - valB;
        } else if (mode === 'mul') {
            rawResult = valA * valB;
        } else if (mode === 'div') {
            if (valB === 0) return null;
            rawResult = Math.ceil(Math.abs(valA / valB));
        } else if (mode === 'mix') {
            if (tB.type === 'negative') {
                rawResult = Math.abs(tA.val) - Math.abs(tB.val);
            } else if (tA.type === 'negative' && tB.type !== 'negative') {
                rawResult = Math.abs(tA.val) - Math.abs(tB.val);
            } else if (tB.type === 'multiply') {
                rawResult = Math.abs(tA.val) * Math.abs(tB.val);
            } else if (tA.type === 'multiply' && tB.type !== 'multiply') {
                rawResult = Math.abs(tA.val) * Math.abs(tB.val);
            } else if (tB.type === 'divide') {
                if (tB.val === 0) return null;
                rawResult = Math.ceil(Math.abs(tA.val) / Math.abs(tB.val));
            } else if (tA.type === 'divide' && tB.type !== 'divide') {
                if (tA.val === 0) return null;
                rawResult = Math.ceil(Math.abs(tB.val) / Math.abs(tA.val));
            } else {
                rawResult = Math.abs(tA.val) + Math.abs(tB.val); // Normal adds
            }
        } else {
            rawResult = valA + valB;
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

        // 1. If no tile selected yet
        if (this.selectedIdx === null) {
            if (tileVal !== null) {
                this.selectedIdx = idx;
                this.lastDestinationIdx = null; // Clear previous destination highlight when selecting a tile
                this.audio.playSelect();
                this.renderGrid();
            }
            return;
        }

        // 2. If clicking the already selected tile -> Deselect
        if (this.selectedIdx === idx) {
            this.selectedIdx = null;
            this.lastDestinationIdx = null;
            this.audio.playDeselect();
            this.renderGrid();
            return;
        }

        // 3. If clicking another tile
        const sourceIdx = this.selectedIdx;
        const sourceVal = this.grid[sourceIdx];

        if (tileVal === null) {
            // Cannot combine into empty cell directly, deselect
            this.selectedIdx = null;
            this.lastDestinationIdx = null;
            this.audio.playDeselect();
            this.renderGrid();
            return;
        }

        const resultTile = this.executeOperation(sourceVal, tileVal, this.mode);

        if (!resultTile) {
            // Invalid math operation
            this.audio.playError();
            this.showToast('Invalid Operation!', 'error');
            this.selectedIdx = null;
            this.lastDestinationIdx = null;
            this.renderGrid();
            return;
        }

        // --- VALID MOVE EXECUTION ---
        // Perform merge
        this.grid[sourceIdx] = null;
        this.grid[idx] = resultTile;
        this.selectedIdx = null;

        this.audio.playMerge();

        // Check Target Matches
        const resultNumeric = resultTile.getNumericValue();
        const matchedTargetIdx = this.targetCards.findIndex(t => Math.abs(t - resultNumeric) < 0.001);
        let wasTargetMatched = false;
        let spawnedIndices = [];

        if (matchedTargetIdx !== -1) {
            wasTargetMatched = true;
            // ✅ TARGET MATCH: keep merged result tile on board for further operations
            this.lastDestinationIdx = idx;
            this.handleTargetMatch(matchedTargetIdx, resultNumeric, idx);
        } else {
            // ❌ MISS / Regular Operation: Subtract move cost from Health Bar
            this.movesLeft = Math.max(0, this.movesLeft - GAME_CONFIG.MOVE_COST);
            this.lastDestinationIdx = idx; // Destination tile receives selection border highlight!

            // Combo resets
            const hadCombo = this.combo > 1;
            this.combo = 1;
            this.comboDisplay.textContent = 'x1';
            if (hadCombo) {
                this.showToast('COMBO LOST! 💔', 'error');
            }
        }

        // Always spawn tiles after every operation (hit or miss) based on GAME_CONFIG
        const countToSpawn = wasTargetMatched ? GAME_CONFIG.TILES_SPAWNED_ON_HIT : GAME_CONFIG.TILES_SPAWNED_ON_MISS;
        for (let i = 0; i < countToSpawn; i++) {
            const spawnIdx = this.spawnRandomTile();
            if (spawnIdx !== null) spawnedIndices.push(spawnIdx);
        }

        this.updateMovesDisplay();

        // Check if any existing board tile happens to match any target card
        this.checkAllBoardTargets();

        this.renderGrid(idx, spawnedIndices);
        this.renderTargets();

        // Check Game Over Condition
        if (this.movesLeft <= 0 || this.isBoardStuck()) {
            setTimeout(() => this.triggerGameOver(), GAME_CONFIG.GAMEOVER_DELAY_MS);
        }
    }

    handleTargetMatch(targetIdx, targetValue, cellIdx) {
        this.targetsCleared++;
        this.audio.playTargetMatched();

        // Particle effect at target card element position
        const targetEls = document.querySelectorAll('.target-card');
        if (targetEls[targetIdx]) {
            const rect = targetEls[targetIdx].getBoundingClientRect();
            const accent = GAME_CONFIG.PARTICLE_COLOR_TARGET;
            this.particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, accent, GAME_CONFIG.PARTICLE_COUNT_TARGET);
            targetEls[targetIdx].classList.add('matched');
        }

        // Score Calculation
        const bonus = Math.round(targetValue * GAME_CONFIG.SCORE_MULTIPLIER) * this.combo;
        this.score += bonus;
        this.scoreDisplay.textContent = this.score;

        // Health Bar Reward: Add extra moves based on constant
        const extraMoves = GAME_CONFIG.TARGET_REWARD;
        this.movesLeft = Math.min(GAME_CONFIG.MAX_MOVES_CAP, this.movesLeft + extraMoves);
        this.updateMovesDisplay();

        // Increment Combo
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.comboDisplay.textContent = `x${this.combo}`;

        this.saveBestScore();

        this.showToast(`TARGET MATCHED! +${bonus} PTS (+${extraMoves} Moves)`, 'success');

        // Replace target card with a new smart target card
        setTimeout(() => {
            const newTarget = this.generateSmartTarget();
            this.targetCards[targetIdx] = newTarget;
            this.renderTargets();
        }, GAME_CONFIG.TARGET_REPLACE_DELAY_MS);
    }

    checkAllBoardTargets() {
        this.targetCards.forEach((targetVal, tIdx) => {
            const matchingCellIdx = this.grid.findIndex(cell => {
                if (!cell) return false;
                const tObj = toTileObj(cell);
                return Math.abs(tObj.getNumericValue() - targetVal) < 0.001;
            });
            if (matchingCellIdx !== -1) {
                // Board already has this number matching target
            }
        });
    }

    isBoardStuck() {
        const activeCount = this.grid.filter(v => v !== null).length;
        if (activeCount === this.gridSize * this.gridSize && this.movesLeft <= 0) {
            return true;
        }
        return false;
    }

    triggerGameOver() {
        this.audio.playGameOver();
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-targets').textContent = this.targetsCleared;
        document.getElementById('final-max-combo').textContent = `x${this.maxCombo}`;
        this.gameoverModal.classList.add('active');
    }

    showToast(msg, type = 'info') {
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
            const rewardVal = Math.round(val * GAME_CONFIG.SCORE_MULTIPLIER);
            card.innerHTML = `
                <span class="target-value">${displayVal}</span>
                <span class="target-reward">+${rewardVal}</span>
            `;
            this.targetsList.appendChild(card);
        });
    }

    renderGrid(mergedIdx = null, spawnedIdx = null, spawned2Idx = null) {
        this.gridContainer.innerHTML = '';
        const spawnedList = Array.isArray(spawnedIdx) ? spawnedIdx : [spawnedIdx, spawned2Idx].filter(x => x !== null);
        this.grid.forEach((rawItem, idx) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            const tile = toTileObj(rawItem);
            
            if (tile === null) {
                cell.classList.add('empty');
            } else {
                cell.classList.add(`tile-${tile.type}`);

                // Center number display
                cell.textContent = tile.getDisplayString();

                // Top-right operation symbol badge (+, -, ×, ÷)
                const opSymbol = tile.getOpSymbol();
                if (opSymbol) {
                    const badge = document.createElement('span');
                    badge.className = 'tile-op-badge';
                    badge.textContent = opSymbol;
                    cell.appendChild(badge);
                }

                if (idx === this.selectedIdx) {
                    cell.classList.add('selected');
                }
                if (idx === this.lastDestinationIdx && idx !== this.selectedIdx) {
                    cell.classList.add('destination-selected');
                }
                if (idx === mergedIdx) {
                    cell.classList.add('tile-merged');
                }
                if (spawnedList.includes(idx)) {
                    cell.classList.add('tile-spawn');
                }
            }

            cell.addEventListener('click', () => this.handleTileClick(idx));
            this.gridContainer.appendChild(cell);
        });
    }
}

// Initialize Game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.game = new ArithamaniacGame();
});
