import { describe, expect, it } from 'vitest'

/**
 * 测试 showCandidates / showNextMove 底层数据的消息生成场景。
 * hintMessage 由 grid.js adapter 写入 Svelte store，无法在 vitest 直接测试；
 * 这里验证 Game 层返回的数据足以生成正确的提示消息文本。
 */
describe('HW2 hint: message data scenarios', () => {
  it('getCandidates returns data for candidate hint message', async () => {
    const { createGame, createSudoku } = await import('../../src/domain/index.js')
    const puzzle = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]
    const game = createGame({ sudoku: createSudoku(puzzle) })

    // 候选提示应返回非空数组 -> 消息 "Cell (1,3) candidates: [1,2,4]"
    const cands = game.getCandidates(0, 2)
    expect(cands.length).toBeGreaterThan(0)
    expect(cands.every(v => v >= 1 && v <= 9)).toBe(true)

    // given 格 -> 消息 "Cell (1,1) is already filled"
    expect(game.getCandidates(0, 0)).toEqual([])

    // 用户填数后 -> 消息 "Cell (1,3) is already filled"
    game.guess({ row: 0, col: 2, value: 4 })
    expect(game.getCandidates(0, 2)).toEqual([])
  })

  it('findNextMoves returns data for next move hint message', async () => {
    const { createGame, createSudoku } = await import('../../src/domain/index.js')
    const grid = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 0],
    ]
    const game = createGame({ sudoku: createSudoku(grid) })

    // 下一步提示 -> 消息 "Cell (9,9) can only be 9"
    const moves = game.findNextMoves()
    expect(moves.length).toBe(1)
    expect(moves[0]).toEqual({ row: 8, col: 8, value: 9 })
  })

  it('findNextMoves returns empty when no Naked Single', async () => {
    const { createGame, createSudoku } = await import('../../src/domain/index.js')
    const full = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ]
    const game = createGame({ sudoku: createSudoku(full) })
    // 消息 "No cell with a single candidate found"
    expect(game.findNextMoves()).toEqual([])
  })

  it('getCandidates on empty board returns all 1-9', async () => {
    const { createGame, createSudoku } = await import('../../src/domain/index.js')
    const empty = Array.from({ length: 9 }, () => Array(9).fill(0))
    const game = createGame({ sudoku: createSudoku(empty) })

    const cands = game.getCandidates(0, 0)
    expect(cands.sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
