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
     * @param {Sudoku} 
     */
    constructor(sudoku, puzzle = sudoku.clone()) {
        /**
         * 当前数独实例。
         * @type {Sudoku} sudoku - 当前数独盘面，包含用户的最新操作。
         * @type {Sudoku} puzzle - 游戏开始时的数独盘面，作为初始状态的参考。
         */
        this.sudoku = sudoku;
        this.puzzle = puzzle;
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
     * 在数独上进行一次填值尝试。
     * @param {Object} move - 移动操作对象。
     * @param {number} move.row - 正整数 0-8
     * @param {number} move.col - 正整数 0-8
     * @param {number} move.value - 正整数 1-9
     */
    guess(move) {
        this.undoStack.push(this.sudoku.clone());
        this.sudoku.guess(move);
        this.redoStack = [];
    }

    /**
     * 撤销上一步操作。
     */
    undo() {
        if (this.canUndo()) {
            this.redoStack.push(this.sudoku.clone());
            this.sudoku = this.undoStack.pop();
        }
    }

    /**
     * 检查是否可以执行撤销操作。
     * @returns {boolean} 如果撤销栈不为空则返回 true。
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * 重做被撤销的操作。
     */
    redo() {
        if (this.canRedo()) {
            this.undoStack.push(this.sudoku.clone());
            this.sudoku = this.redoStack.pop();
        }
    }

    /**
     * 检查是否可以执行重做操作。
     * @returns {boolean} 如果重做栈不为空则返回 true。
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * @typedef {Object} GameJSON
     * @property {Object} sudoku - 当前数独的 JSON 表示。
     * @property {Object[]} undoStack - 撤销栈中所有数独的 JSON 数组。
     * @property {Object[]} redoStack - 重做栈中所有数独的 JSON 数组。
     */

    /**
     * 将整个游戏状态序列化为普通的 JavaScript 对象。
     * @returns {GameJSON} 包含游戏完整状态的对象。
     */
    toJSON() {
        return {
            sudoku: this.sudoku.toJSON(),
            puzzle: this.puzzle.toJSON(),
            undoStack: this.undoStack.map(s => s.toJSON()),
            redoStack: this.redoStack.map(s => s.toJSON())
        };
    }

    /**
     * 从 JSON 对象中恢复游戏实例。
     * @static
     * @param {GameJSON} json - 包含游戏状态的 JSON 对象。
     * @throws {Error} 如果输入的 JSON 格式不正确则抛出错误。
     * @returns {Game} 恢复后新的 Game 实例。
     */
    static fromJSON(json) {
        if (!json || !json.sudoku || !json.sudoku.grid) {
            throw new Error('Invalid JSON: Cannot recover Game');
        }
        const sudoku = Sudoku.fromJSON(json.sudoku);
        const puzzle = Sudoku.fromJSON(json.puzzle);
        const game = new Game(sudoku, puzzle);
        game.undoStack = (json.undoStack || []).map(s => Sudoku.fromJSON(s));
        game.redoStack = (json.redoStack || []).map(s => Sudoku.fromJSON(s));
        return game;
    }

    /**
     * 返回游戏状态的字符串表示，便于调试。
     * @returns {string} 包含撤销/重做步数和当前数独盘面的字符串。
     */
    toString() {
        return `History: ${this.undoStack.length} undos, ${this.redoStack.length} redos.\n` +
               `Current Sudoku:\n${this.sudoku.toString()}`;
    }

    getInvalidCells() {
        return this.sudoku.getInvalidCells();
    }

    /**
     * 检查当前数独盘面是否已完成且合法。
     * @returns {boolean} 如果数独已完成且没有不合法单元格则返回 true。
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
     * 返回只读快照对象，包含初始、当前数独，invalidCells，canUndo/Redo，won状态等信息，供 UI 使用。
     * @returns {Object} 包含游戏状态快照的对象。
     */
    getViewState(){
        return {
            puzzleGrid: this.puzzle.getGrid(),
            userGrid: this.sudoku.getGrid(),
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            invalidCells: this.getInvalidCells(),
            won: this.isWon(),
        };
    }
}