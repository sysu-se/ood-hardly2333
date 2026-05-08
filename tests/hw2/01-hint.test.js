import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 hint: getCandidates', () => {
  it('returns candidates for an empty cell', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    const cands = sudoku.getCandidates(0, 2)
    expect(Array.isArray(cands)).toBe(true)
    expect(cands.length).toBeGreaterThan(0)
    for (const v of cands) {
      expect(sudoku.check({ row: 0, col: 2, value: v })).toBe(true)
    }
    expect(cands).not.toContain(5) // row 0
    expect(cands).not.toContain(3) // row 0
    expect(cands).not.toContain(7) // row 0
    expect(cands).not.toContain(8) // col 2
  })

  it('returns [] for given cells', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    expect(sudoku.getCandidates(0, 0)).toEqual([])
  })

  it('returns [] for user-filled cells', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    sudoku.guess({ row: 0, col: 2, value: 4 })
    expect(sudoku.getCandidates(0, 2)).toEqual([])
  })

  it('returns exact candidates [1,2,4] for (0,2)', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    expect(sudoku.getCandidates(0, 2).sort()).toEqual([1, 2, 4])
  })
})

describe('HW2 hint: findNextMoves', () => {
  it('finds cell with exactly one candidate', async () => {
    const { createSudoku } = await loadDomainApi()
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
    const sudoku = createSudoku(grid)
    const moves = sudoku.findNextMoves()
    expect(moves.length).toBe(1)
    expect(moves[0]).toEqual({ row: 8, col: 8, value: 9 })
  })

  it('finds Naked Singles in the standard puzzle', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const moves = sudoku.findNextMoves()
    // makePuzzle 确实包含 Naked Single——验证返回的是合法推定值
    expect(moves.length).toBeGreaterThan(0)
    for (const m of moves) {
      expect(sudoku.check({ row: m.row, col: m.col, value: m.value })).toBe(true)
      expect(sudoku.getCandidates(m.row, m.col)).toEqual([m.value])
    }
  })
})

describe('HW2 hint: Game delegation', () => {
  it('Game.getCandidates delegates to Sudoku', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    const gameCands = game.getCandidates(0, 2)
    const sCands = game.sudoku.getCandidates(0, 2)
    expect(gameCands).toEqual(sCands)
    expect(gameCands.length).toBeGreaterThan(0)
  })

  it('Game.getCandidates returns [] for given cell', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    expect(game.getCandidates(0, 0)).toEqual([])
  })

  it('Game.getCandidates returns [] after user fills cell', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.guess({ row: 0, col: 2, value: 4 })
    expect(game.getCandidates(0, 2)).toEqual([])
  })

  it('Game.findNextMoves delegates to Sudoku', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    const gameMoves = game.findNextMoves()
    const sMoves = game.sudoku.findNextMoves()
    expect(gameMoves).toEqual(sMoves)
  })

  it('Game.findNextMoves returns Naked Singles in standard puzzle', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    const moves = game.findNextMoves()
    expect(moves.length).toBeGreaterThan(0)
    for (const m of moves) {
      expect(game.sudoku.check({ row: m.row, col: m.col, value: m.value })).toBe(true)
      expect(game.sudoku.getCandidates(m.row, m.col)).toEqual([m.value])
    }
  })

  it('Game.getCandidates rejects given cells even in explore mode', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    const cands = game.getCandidates(0, 0) // (0,0)=5 is given
    expect(cands).toEqual([])
  })
})
