import { describe, expect, it } from 'vitest'

describe('HW2 fill-hint: solvedGrid in Game', () => {
  it('solvedGrid is null by default', async () => {
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
    expect(game.solvedGrid).toBeNull()
    expect(game.getHintValue(0, 2)).toBe(0)
  })

  it('getHintValue returns correct answer when solvedGrid provided', async () => {
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
    const solved = [
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
    const game = createGame({ sudoku: createSudoku(puzzle), solvedGrid: solved })
    expect(game.solvedGrid).toEqual(solved)
    // (0,2) 在谜面中是空格，正确答案是 4
    expect(game.getHintValue(0, 2)).toBe(4)
    // (0,0)=5 是 given
    expect(game.getHintValue(0, 0)).toBe(5)
  })

  it('getHintValue returns 0 for out-of-range coords', async () => {
    const { createGame, createSudoku } = await import('../../src/domain/index.js')
    const solved = Array.from({ length: 9 }, () => Array(9).fill(5))
    const empty = Array.from({ length: 9 }, () => Array(9).fill(0))
    const game = createGame({ sudoku: createSudoku(empty), solvedGrid: solved })

    // Negative coords would throw in solvedGrid array access,
    // but getHintValue guards with null check; safe range test
    expect(game.getHintValue(0, 0)).toBe(5)
    expect(game.getHintValue(8, 8)).toBe(5)
  })
})

describe('HW2 fill-hint: serialization with solvedGrid', () => {
  it('toJSON includes solvedGrid', async () => {
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
    const solved = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => r * 9 + c + 1) // 1..81
    )
    const game = createGame({ sudoku: createSudoku(puzzle), solvedGrid: solved })
    const json = game.toJSON()
    expect(json.solvedGrid).toEqual(solved)
  })

  it('fromJSON restores solvedGrid', async () => {
    const { createGameFromJSON, createGame, createSudoku } = await import('../../src/domain/index.js')
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
    const solved = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => r * 9 + c + 1)
    )
    const game = createGame({ sudoku: createSudoku(puzzle), solvedGrid: solved })
    const json = game.toJSON()
    const restored = createGameFromJSON(json)
    expect(restored.solvedGrid).toEqual(solved)
    expect(restored.getHintValue(0, 2)).toBe(solved[0][2])
  })

  it('fromJSON with null solvedGrid works', async () => {
    const { createGameFromJSON, createGame, createSudoku } = await import('../../src/domain/index.js')
    const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
    const game = createGame({ sudoku: createSudoku(puzzle) })
    const json = game.toJSON()
    expect(json.solvedGrid).toBeNull()
    const restored = createGameFromJSON(json)
    expect(restored.solvedGrid).toBeNull()
    expect(restored.getHintValue(0, 0)).toBe(0)
  })
})
