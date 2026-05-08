import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 explore: state machine', () => {
  it('starts with exploreMode=false', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    expect(game.exploreMode).toBe(false)
  })

  it('enterExplore() sets exploreMode=true and saves snapshot', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.enterExplore()
    expect(game.exploreMode).toBe(true)
    expect(game.exploreSnapshot).not.toBeNull()
    const snapGrid = game.exploreSnapshot.getGrid()
    game.guess({ row: 0, col: 2, value: 4 })
    expect(game.exploreSnapshot.getGrid()[0][2]).toBe(0)
  })

  it('enterExplore() is idempotent (no nested)', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.enterExplore()
    const snap = game.exploreSnapshot
    game.enterExplore()
    expect(game.exploreSnapshot).toBe(snap)
  })

  it('exitExplore() resets explore state', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.enterExplore()
    game.exitExplore()
    expect(game.exploreMode).toBe(false)
    expect(game.exploreSnapshot).toBeNull()
  })
})

describe('HW2 explore: commit', () => {
  it('commitExplore() pushes snapshot to main undoStack', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    const beforeLen = game.undoStack.length

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })
    game.commitExplore()

    expect(game.exploreMode).toBe(false)
    expect(game.undoStack.length).toBe(beforeLen + 1)
    expect(game.sudoku.getGrid()[0][2]).toBe(4)
    expect(game.sudoku.getGrid()[1][1]).toBe(7)
  })

  it('commitExplore then undo restores pre-explore state', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 4 })
    game.commitExplore()

    game.undo()
    expect(game.sudoku.getGrid()[0][2]).toBe(0)
    expect(game.canUndo()).toBe(false)
  })
})

describe('HW2 explore: abandon', () => {
  it('abandonExplore() restores snapshot', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })
    game.abandonExplore()

    expect(game.sudoku.getGrid()[0][2]).toBe(0)
    expect(game.sudoku.getGrid()[1][1]).toBe(0)
    expect(game.exploreMode).toBe(false)
    expect(game.undoStack.length).toBe(0)
  })
})

describe('HW2 explore: getViewState integration', () => {
  it('getViewState reflects exploreMode and exploreFailed', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    let view = game.getViewState()
    expect(view.exploreMode).toBe(false)
    expect(view.exploreFailed).toBe(false)

    game.enterExplore()
    view = game.getViewState()
    expect(view.exploreMode).toBe(true)
    expect(view.exploreFailed).toBe(false)
  })
})
