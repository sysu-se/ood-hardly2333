// src/domain/Game.js
import { Sudoku } from './Sudoku.js';

/**
 * 表示一个数独游戏会话。
 * 该类负责管理数独的状态、操作历史以及持久化。
 */
export class Game {
    /**
     * 创建一个游戏实例。
     * @param {Sudoku}
     * @param {Sudoku} [puzzle] - 初始题面，默认 = sudoku.clone()
     * @param {number[][]} [solvedGrid] - 完整求解结果，用于 Hint 直接填答案
     */
    constructor(sudoku, puzzle = sudoku.clone(), solvedGrid = null) {
        /**
         * 当前数独实例。
         * @type {Sudoku} sudoku - 当前数独盘面，包含用户的最新操作。
         * @type {Sudoku} puzzle - 游戏开始时的数独盘面，作为初始状态的参考。
         */
        this.sudoku = sudoku;
        this.puzzle = puzzle;

        /**
         * 完整求解结果（9x9 二维数组），用于 Hint 直接填答案。
         * @type {number[][]|null}
         */
        this.solvedGrid = solvedGrid;

        // === 探索模式 ===
        /** @type {boolean} */
        this.exploreMode = false;
        /** @type {Sudoku|null} 进入探索时的盘面快照 */
        this.exploreSnapshot = null;
        /** @type {Sudoku[]} 探索内部撤销栈 */
        this.exploreUndoStack = [];
        /** @type {Sudoku[]} 探索内部重做栈 */
        this.exploreRedoStack = [];
        /** @type {Set<string>} 失败路径记忆（gridHash） */
        this.failedPaths = new Set();
    }
    /**
     * 存储历史状态的撤销栈。
     * @type {Sudoku[]}
     */
    undoStack = [];
    /**
     * 存储已撤销状态的重做栈。
     * @type {Sudoku[]}
     */
    redoStack = [];
    /**
     * 获取当前的数独对象。
     * @returns {Sudoku} 
     */
    getSudoku() {
        return this.sudoku.clone();
    }

    /**
     * 获取指定格子的候选数集合。
     * @param {number} row - 行索引 (0-8)。
     * @param {number} col - 列索引 (0-8)。
     * @returns {number[]} 候选数数组。
     */
    getCandidates(row, col) {
        return this.sudoku.getCandidates(row, col);
    }

    /**
     * 查找所有可唯一确定的下一步。
     * @returns {{row: number, col: number, value: number}[]}
     */
    findNextMoves() {
        return this.sudoku.findNextMoves();
    }

    /**
     * 获取指定格子的正确答案（来自预求解结果）。
     * @param {number} row - 行索引 (0-8)。
     * @param {number} col - 列索引 (0-8)。
     * @returns {number} 正确数字；若未预求解或坐标无效返回 0。
     */
    getHintValue(row, col) {
        if (!this.solvedGrid) return 0;
        return this.solvedGrid[row][col];
    }

    // ==================== 探索模式 ====================

    /**
     * 进入探索模式，保存当前盘面快照。
     */
    enterExplore() {
        if (this.exploreMode) return;
        this.exploreSnapshot = this.sudoku.clone();
        this.exploreMode = true;
        this.exploreUndoStack = [];
        this.exploreRedoStack = [];
    }

    /**
     * 退出探索模式（内部方法，不清除状态残留）。
     */
    exitExplore() {
        this.exploreMode = false;
        this.exploreSnapshot = null;
        this.exploreUndoStack = [];
        this.exploreRedoStack = [];
    }

    /**
     * 提交探索结果：将快照压入主撤销栈，保留探索变更。
     */
    commitExplore() {
        if (!this.exploreMode) return;
        this.undoStack.push(this.exploreSnapshot.clone());
        this.redoStack = [];
        this.exitExplore();
    }

    /**
     * 放弃探索结果：恢复快照，不留下任何痕迹。
     */
    abandonExplore() {
        if (!this.exploreMode) return;
        this.sudoku = this.exploreSnapshot.clone();
        this.exitExplore();
    }

    /**
     * 生成当前盘面的 81 字符哈希字符串（用于失败路径去重）。
     * @returns {string}
     */
    _gridHash() {
        return this.sudoku.getGrid().flat().join('');
    }

    /**
     * 当前探索路径是否之前已失败过。
     * @returns {boolean}
     */
    isExploreFailed() {
        if (!this.exploreMode) return false;
        return this.failedPaths.has(this._gridHash());
    }

    /**
     * 在数独上进行一次填值尝试。
     * @param {Object} move - 移动操作对象。
     * @param {number} move.row - 正整数 0-8
     * @param {number} move.col - 正整数 0-8
     * @param {number} move.value - 正整数 1-9
     */
    guess(move) {
        const { row, col, value } = move;

        // 拒绝修改初始题面
        if (this.sudoku.isGiven(row, col)) return;

        // 跳过 no-op：值与当前相同则不产生历史
        if (this.sudoku.getGrid()[row][col] === value) return;

        if (this.exploreMode) {
            // === 探索分支 ===
            this.exploreUndoStack.push(this.sudoku.clone());
            this.sudoku.guess(move);
            this.exploreRedoStack = [];
            // 冲突检测：填完后检查 invalidCells
            if (this.sudoku.getInvalidCells().length > 0) {
                this.failedPaths.add(this._gridHash());
            }
            return;
        }

        // === 主模式 ===
        this.undoStack.push(this.sudoku.clone());
        this.sudoku.guess(move);
        this.redoStack = [];
    }

    /**
     * 撤销上一步操作。
     */
    undo() {
        if (this.exploreMode) {
            if (this.exploreUndoStack.length === 0) return;
            this.exploreRedoStack.push(this.sudoku.clone());
            this.sudoku = this.exploreUndoStack.pop();
            return;
        }
        if (this.canUndo()) {
            this.redoStack.push(this.sudoku.clone());
            this.sudoku = this.undoStack.pop();
        }
    }

    canUndo() {
        if (this.exploreMode) return this.exploreUndoStack.length > 0;
        return this.undoStack.length > 0;
    }

    redo() {
        if (this.exploreMode) {
            if (this.exploreRedoStack.length === 0) return;
            this.exploreUndoStack.push(this.sudoku.clone());
            this.sudoku = this.exploreRedoStack.pop();
            return;
        }
        if (this.canRedo()) {
            this.undoStack.push(this.sudoku.clone());
            this.sudoku = this.redoStack.pop();
        }
    }

    canRedo() {
        if (this.exploreMode) return this.exploreRedoStack.length > 0;
        return this.redoStack.length > 0;
    }

    /**
     * @typedef {Object} GameJSON
     * @property {Object} sudoku - 当前数独的 JSON 表示.
     * @property {Object[]} undoStack - 撤销栈中所有数独的 JSON 数组.
     * @property {Object[]} redoStack - 重做栈中所有数独的 JSON 数组.
     */

    /**
     * 将整个游戏状态序列化为普通的 JavaScript 对象.
     * @returns {GameJSON} 包含游戏完整状态的对象.
     */
    toJSON() {
        return {
            sudoku: this.sudoku.toJSON(),
            puzzle: this.puzzle.toJSON(),
            solvedGrid: this.solvedGrid,
            undoStack: this.undoStack.map(s => s.toJSON()),
            redoStack: this.redoStack.map(s => s.toJSON())
        };
    }

    /**
     * 从 JSON 对象中恢复游戏实例.
     * @static
     * @param {GameJSON} json - 包含游戏状态的 JSON 对象.
     * @throws {Error} 如果输入的 JSON 格式不正确则抛出错误.
     * @returns {Game} 恢复后新的 Game 实例.
     */
    static fromJSON(json) {
        if (!json || !json.sudoku || !json.sudoku.grid) {
            throw new Error('Invalid JSON: Cannot recover Game');
        }
        const sudoku = Sudoku.fromJSON(json.sudoku);
        const puzzle = Sudoku.fromJSON(json.puzzle);
        const game = new Game(sudoku, puzzle, json.solvedGrid || null);
        game.undoStack = (json.undoStack || []).map(s => Sudoku.fromJSON(s));
        game.redoStack = (json.redoStack || []).map(s => Sudoku.fromJSON(s));
        return game;
    }

    /**
     * 返回游戏状态的字符串表示，便于调试.
     * @returns {string} 包含撤销/重做步数和当前数独盘面的字符串.
     */
    toString() {
        return `History: ${this.undoStack.length} undos, ${this.redoStack.length} redos.\n` +
               `Current Sudoku:\n${this.sudoku.toString()}`;
    }

    getInvalidCells() {
        return this.sudoku.getInvalidCells();
    }

    /**
     * 检查当前数独盘面是否已完成且合法.
     * @returns {boolean} 如果数独已完成且没有不合法单元格则返回 true.
     */
    isWon() {
        const grid = this.sudoku.getGrid();
        const hasEmpty = grid.some(row => row.some(cell => cell === 0));
        if (hasEmpty) {
            return false;
        }
        return this.getInvalidCells().length === 0;
    }

    /**
     * 返回只读快照对象，包含初始、当前数独，invalidCells，canUndo/Redo，won状态等信息，供 UI 使用.
     * @returns {Object} 包含游戏状态快照的对象.
     */
    getViewState(){
        return {
            puzzleGrid: this.puzzle.getGrid(),
            userGrid: this.sudoku.getGrid(),
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            invalidCells: this.getInvalidCells(),
            won: this.isWon(),
            exploreMode: this.exploreMode,
            exploreFailed: this.isExploreFailed(),
        };
    }
}