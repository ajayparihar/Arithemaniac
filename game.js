/**
 * ARITHAMANIAC - Game Logic & Architecture
 * Modern Minimalist Math Merge Game
 */

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
        const now = this.ctx.currentTime;
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
        this.gridSize = 4; // 4x4 default
        this.mode = 'add'; // add, sub, mul, div, mix
        this.grid = [];
        this.selectedIdx = null;
        
        this.score = 0;
        this.bestScore = 0;
        this.movesLeft = 20;
        this.combo = 1;
        this.maxCombo = 1;
        this.targetsCleared = 0;
        
        this.targetCards = [];
        this.numTargets = 3;

        this.audio = new AudioEngine();
        this.particles = new ParticleEngine('particle-canvas');

        this.modeAccents = {
            add: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.25)', label: 'ADDITION' },
            sub: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.25)', label: 'SUBTRACTION' },
            mul: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)', label: 'MULTIPLICATION' },
            div: { color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.25)', label: 'DIVISION' },
            mix: { color: '#ec4899', glow: 'rgba(236, 72, 153, 0.25)', label: 'MIXED OPS' }
        };

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
        this.bestDisplay = document.getElementById('best-display');
        this.modeBadge = document.getElementById('mode-badge');
        this.toastContainer = document.getElementById('toast-container');

        this.helpModal = document.getElementById('help-modal');
        this.gameoverModal = document.getElementById('gameover-modal');
    }

    bindEvents() {
        // Audio unlock on user interaction
        document.body.addEventListener('click', () => this.audio.init(), { once: true });

        // Mode selectors
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newMode = e.currentTarget.dataset.mode;
                if (newMode !== this.mode) {
                    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    this.setMode(newMode);
                }
            });
        });

        // Grid size selector
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newSize = parseInt(e.currentTarget.dataset.size);
                if (newSize !== this.gridSize) {
                    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    this.gridSize = newSize;
                    this.startNewGame();
                }
            });
        });

        // Sound toggle
        const soundBtn = document.getElementById('sound-toggle');
        soundBtn.addEventListener('click', () => {
            this.audio.enabled = !this.audio.enabled;
            soundBtn.textContent = this.audio.enabled ? '🔊' : '🔇';
            this.showToast(this.audio.enabled ? 'Sound Enabled' : 'Sound Muted');
        });

        // Restart
        document.getElementById('restart-btn').addEventListener('click', () => this.startNewGame());

        // Help Modal
        document.getElementById('help-btn').addEventListener('click', () => this.helpModal.classList.add('active'));
        document.getElementById('close-help').addEventListener('click', () => this.helpModal.classList.remove('active'));
        document.getElementById('start-playing-btn').addEventListener('click', () => this.helpModal.classList.remove('active'));

        // Play Again
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.gameoverModal.classList.remove('active');
            this.startNewGame();
        });
    }

    setMode(mode) {
        this.mode = mode;
        const config = this.modeAccents[mode];
        document.documentElement.style.setProperty('--current-accent', config.color);
        document.documentElement.style.setProperty('--current-glow', config.glow);
        this.modeBadge.textContent = config.label;
        this.loadBestScore();
        this.startNewGame();
    }

    loadBestScore() {
        const key = `arithamaniac_best_${this.mode}_${this.gridSize}`;
        this.bestScore = parseInt(localStorage.getItem(key) || '0');
        this.bestDisplay.textContent = this.bestScore;
    }

    saveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestDisplay.textContent = this.bestScore;
            const key = `arithamaniac_best_${this.mode}_${this.gridSize}`;
            localStorage.setItem(key, this.bestScore.toString());
        }
    }

    startNewGame() {
        this.score = 0;
        this.movesLeft = this.gridSize === 4 ? 20 : 30;
        this.combo = 1;
        this.maxCombo = 1;
        this.targetsCleared = 0;
        this.selectedIdx = null;

        this.scoreDisplay.textContent = '0';
        this.comboDisplay.textContent = 'x1';
        this.movesDisplay.textContent = this.movesLeft;

        // Configure Grid
        const totalCells = this.gridSize * this.gridSize;
        this.grid = new Array(totalCells).fill(null);

        // Update container grid class
        this.gridContainer.className = `grid-container grid-${this.gridSize}x${this.gridSize}`;

        // Initial Tile Population (populate ~45% of cells)
        const initialCount = Math.floor(totalCells * 0.45);
        for (let i = 0; i < initialCount; i++) {
            this.spawnRandomTile(true);
        }

        // Generate Target Cards based on board
        this.refreshTargetCards();

        this.renderGrid();
        this.renderTargets();
    }

    generateTileValue() {
        // Mode dependent tile spawning range
        if (this.mode === 'add') {
            return Math.floor(Math.random() * 8) + 1; // 1 - 8
        } else if (this.mode === 'sub') {
            return Math.floor(Math.random() * 12) + 2; // 2 - 13
        } else if (this.mode === 'mul') {
            return Math.floor(Math.random() * 5) + 1; // 1 - 5
        } else if (this.mode === 'div') {
            const primesAndMults = [2, 3, 4, 6, 8, 12, 16, 24];
            return primesAndMults[Math.floor(Math.random() * primesAndMults.length)];
        } else { // mix
            return Math.floor(Math.random() * 10) + 1;
        }
    }

    spawnRandomTile(silent = false) {
        const emptyIndices = [];
        this.grid.forEach((val, idx) => {
            if (val === null) emptyIndices.push(idx);
        });

        if (emptyIndices.length === 0) return null;

        const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const val = this.generateTileValue();
        this.grid[randomIdx] = val;
        return randomIdx;
    }

    /**
     * Smart Target Generator: Algorithm guaranteeing playability!
     * Generates targets derived from combinations of active board numbers.
     */
    generateSmartTarget() {
        const activeTiles = this.grid.filter(v => v !== null);
        if (activeTiles.length >= 2) {
            // Pick 2 random tiles from board
            const t1 = activeTiles[Math.floor(Math.random() * activeTiles.length)];
            let t2 = activeTiles[Math.floor(Math.random() * activeTiles.length)];
            
            // Calculate a combined value based on active mode
            let op = this.mode;
            if (op === 'mix') {
                const ops = ['add', 'sub', 'mul', 'div'];
                op = ops[Math.floor(Math.random() * ops.length)];
            }

            let result = null;
            if (op === 'add') {
                result = t1 + t2;
            } else if (op === 'sub') {
                result = Math.abs(t1 - t2);
            } else if (op === 'mul') {
                result = t1 * t2;
            } else if (op === 'div') {
                const max = Math.max(t1, t2);
                const min = Math.min(t1, t2);
                if (min > 0 && max % min === 0) {
                    result = max / min;
                } else {
                    result = t1 + t2; // fallback
                }
            }

            if (result !== null && result > 0 && !this.targetCards.includes(result)) {
                return result;
            }
        }

        // Fallback target generation
        if (this.mode === 'mul') return Math.floor(Math.random() * 20) + 4;
        return Math.floor(Math.random() * 15) + 5;
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

    executeOperation(valA, valB, mode) {
        if (mode === 'add') return valA + valB;
        if (mode === 'sub') return Math.abs(valA - valB); // Always positive result
        if (mode === 'mul') return valA * valB;
        if (mode === 'div') {
            const max = Math.max(valA, valB);
            const min = Math.min(valA, valB);
            if (min === 0) return null;
            if (max % min !== 0) return null; // Integer division only!
            return max / min;
        }
        if (mode === 'mix') {
            // Defaults to addition or simple difference if sub
            return valA + valB;
        }
        return valA + valB;
    }

    handleTileClick(idx) {
        if (this.movesLeft <= 0) return;

        const tileVal = this.grid[idx];

        // 1. If no tile selected yet
        if (this.selectedIdx === null) {
            if (tileVal !== null) {
                this.selectedIdx = idx;
                this.audio.playSelect();
                this.renderGrid();
            }
            return;
        }

        // 2. If clicking the already selected tile -> Deselect
        if (this.selectedIdx === idx) {
            this.selectedIdx = null;
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
            this.audio.playDeselect();
            this.renderGrid();
            return;
        }

        // Determine operation based on mode
        let currentOp = this.mode;
        if (this.mode === 'mix') {
            // Prompt/cycle or default to addition
            currentOp = 'add'; 
        }

        const resultVal = this.executeOperation(sourceVal, tileVal, currentOp);

        if (resultVal === null || isNaN(resultVal) || resultVal <= 0 || resultVal > 9999) {
            // Invalid math operation (e.g. division not cleanly divisible)
            this.audio.playError();
            this.showToast('Invalid Operation!', 'error');
            this.selectedIdx = null;
            this.renderGrid();
            return;
        }

        // --- VALID MOVE EXECUTION ---
        this.movesLeft--;
        this.movesDisplay.textContent = this.movesLeft;

        // Perform merge
        this.grid[sourceIdx] = null;
        this.grid[idx] = resultVal;
        this.selectedIdx = null;

        this.audio.playMerge();

        // Check Target Matches
        const matchedTargetIdx = this.targetCards.indexOf(resultVal);
        let wasTargetMatched = false;

        if (matchedTargetIdx !== -1) {
            wasTargetMatched = true;
            this.handleTargetMatch(matchedTargetIdx, resultVal, idx);
        } else {
            // Reset combo if turn didn't match a target
            this.combo = 1;
            this.comboDisplay.textContent = 'x1';
        }

        // Spawn a new tile into an empty slot
        const newSpawnIdx = this.spawnRandomTile();

        // Check if any existing board tile happens to match any target card
        this.checkAllBoardTargets();

        this.renderGrid(idx, newSpawnIdx);
        this.renderTargets();

        // Check Game Over Condition
        if (this.movesLeft <= 0 || this.isBoardStuck()) {
            setTimeout(() => this.triggerGameOver(), 500);
        }
    }

    handleTargetMatch(targetIdx, targetValue, cellIdx) {
        this.targetsCleared++;
        this.audio.playTargetMatched();

        // Particle effect at target card element position
        const targetEls = document.querySelectorAll('.target-card');
        if (targetEls[targetIdx]) {
            const rect = targetEls[targetIdx].getBoundingClientRect();
            const accent = this.modeAccents[this.mode].color;
            this.particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, accent, 30);
            targetEls[targetIdx].classList.add('matched');
        }

        // Score Calculation
        const bonus = targetValue * 10 * this.combo;
        this.score += bonus;
        this.scoreDisplay.textContent = this.score;

        // Add extra moves (+5 moves!)
        const extraMoves = 5;
        this.movesLeft += extraMoves;
        this.movesDisplay.textContent = this.movesLeft;

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
        }, 300);
    }

    checkAllBoardTargets() {
        this.targetCards.forEach((targetVal, tIdx) => {
            const matchingCellIdx = this.grid.indexOf(targetVal);
            if (matchingCellIdx !== -1) {
                // Board already has this number! Match it!
                // (Optional: can trigger match or leave for player interaction)
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
            setTimeout(() => toast.remove(), 300);
        }, 2200);
    }

    renderTargets() {
        this.targetsList.innerHTML = '';
        this.targetCards.forEach(val => {
            const card = document.createElement('div');
            card.className = 'target-card';
            card.innerHTML = `
                <span class="target-value">${val}</span>
                <span class="target-reward">+${val * 10}</span>
            `;
            this.targetsList.appendChild(card);
        });
    }

    renderGrid(mergedIdx = null, spawnedIdx = null) {
        this.gridContainer.innerHTML = '';
        this.grid.forEach((val, idx) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            if (val === null) {
                cell.classList.add('empty');
            } else {
                cell.textContent = val;
                if (idx === this.selectedIdx) {
                    cell.classList.add('selected');
                }
                if (idx === mergedIdx) {
                    cell.classList.add('tile-merged');
                }
                if (idx === spawnedIdx) {
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
