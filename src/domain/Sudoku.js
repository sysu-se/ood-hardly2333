// src/domain/Sudoku.js

/**
 * 表示数独盘面的核心领域模型。
 * 该类仅包含 9x9 网格数据，并提供基础的合法性检查、数据访问及序列化方法。
 */
export class Sudoku {
    /**
     * @param {number[][]} grid - 一个 9x9 的二维数组，数字为正整数 0-9 ，其中 0 表示空格。
     */
    constructor(grid) {
        /**
         * 数独网格数据。
         * @type {number[][]}
         */
        this.grid = grid.map(row => [...row]);
    }

    /**
     * 获取当前盘面的深度拷贝，以保护内部状态不被外部直接修改。
     * @returns {number[][]} 9x9 二维数组的副本。
     */
    getGrid() {
        return this.grid.map(row => [...row]);
    }

    /**
     * 在数独盘面上尝试填入一个数值。
     * @param {Object} move - 移动操作对象。
     * @param {number} move.row - 行索引 正整数 (0-8)。
     * @param {number} move.col - 列索引 正整数 (0-8)。
     * @param {number} move.value - 要填入的数值 正整数 (1-9，0 表示清空)。
    */
    guess({ row, col, value }) {
        this.grid[row][col] = value;
    }

    /**
     * 检查在指定位置填入某个数值是否符合数独规则（行、列、3x3 宫格）。
     * @param {Object} move - 待检查的操作。
     * @param {number} move.row - 行索引 正整数 (0-8)。
     * @param {number} move.col - 列索引 正整数 (0-8)。
     * @param {number} move.value - 待检查的数值 正整数 (1-9)。
     * @returns {boolean} 如果该数值合法（未冲突）则返回 true，否则返回 false。
     */
    check({ row, col, value }) {
        for (let j = 0; j < 9; j++) {
            if (this.grid[row][j] === value) return false;
        }
        for (let i = 0; i < 9; i++) {
            if (this.grid[i][col] === value) return false;
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (this.grid[i][j] === value) return false;
            }
        }
        return true;
    }

    /**
     * 返回当前数独实例的深度拷贝。
     * @returns {Sudoku} 一个拥有相同网格数据的新数独实例。
     */
    clone() {
        return new Sudoku(this.getGrid());
    }

    /**
     * 将数独数据序列化为普通对象。
     * @returns {{grid: number[][]}} 包含网格数据的对象。
     */
    toJSON() {
        return {
            grid: this.getGrid()
        };
    }

    /**
     * 从序列化对象中恢复数独实例。
     * @static
     * @param {Object} json - 包含 grid 属性的对象。
     * @param {number[][]} json.grid - 9x9 网格数据。
     * @throws {Error} 如果输入的 JSON 格式不正确。
     * @returns {Sudoku} 恢复后的 Sudoku 实例。
     */
    static fromJSON(json) {
        if (!json || !json.grid) {
            throw new Error('Invalid JSON: Sudoku grid is missing');
        }
        return new Sudoku(json.grid);
    }

    /**
     * 将数独盘面格式化为带有边框的美观字符串。
     * @returns {string} 视觉化的数独盘面。
     */
    toString() {
        const SUDOKU_SIZE = 9;
        const BOX_SIZE = 3;
        let out = '╔═══════╤═══════╤═══════╗\n';

        for (let row = 0; row < SUDOKU_SIZE; row++) {
            if (row !== 0 && row % BOX_SIZE === 0) {
                out += '╟───────┼───────┼───────╢\n';
            }

            for (let col = 0; col < SUDOKU_SIZE; col++) {
                if (col === 0) {
                    out += '║ ';
                } else if (col % BOX_SIZE === 0) {
                    out += '│ ';
                }

                out += (this.grid[row][col] === 0 ? '·' : this.grid[row][col]) + ' ';

                if (col === SUDOKU_SIZE - 1) {
                    out += '║';
                }
            }
            out += '\n';
        }

        out += '╚═══════╧═══════╧═══════╝';
        return out;
    }
    /**
     * 获取所有不合法单元格的坐标。
     * @returns {string[]} 返回一个包含所有不合法单元格坐标的数组，每个坐标以 "x,y" 的格式表示。
     */
    getInvalidCells() {
        const SUDOKU_SIZE = 9;
        const BOX_SIZE = 3;
        const invalidCells = [];
        const addInvalid = (x, y) => {
            const xy = x + ',' + y;
            if (!invalidCells.includes(xy)) invalidCells.push(xy);
        };

        for (let y = 0; y < SUDOKU_SIZE; y++) {
            for (let x = 0; x < SUDOKU_SIZE; x++) {

                const value = this.grid[y][x];

                if (value) {
                    for (let i = 0; i < SUDOKU_SIZE; i++) {
                        // Check the row
                        if (i !== x && this.grid[y][i] === value) {
                            addInvalid(x, y);
                        }

                        // Check the column
                        if (i !== y && this.grid[i][x] === value) {
                            addInvalid(x, i);
                        }
                    }

                    // Check the box
                    const startY = Math.floor(y / BOX_SIZE) * BOX_SIZE;
                    const endY = startY + BOX_SIZE;
                    const startX = Math.floor(x / BOX_SIZE) * BOX_SIZE;
                    const endX = startX + BOX_SIZE;
                    for (let row = startY; row < endY; row++) {
                        for (let col = startX; col < endX; col++) {
                            if (row !== y && col !== x && this.grid[row][col] === value) {
                                addInvalid(col, row);
                            }
                        }
                    }
                }

            }
        }
        return invalidCells;
    }
}