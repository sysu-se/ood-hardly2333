import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 explore: undo/redo within explore', () => {
  it('explore undo/redo does not touch main stacks', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    expect(game.undoStack.length).toBe(1)

    game.enterExplore()
    game.guess({ row: 1, col: 1, value: 7 })
    game.guess({ row: 2, col: 0, value: 1 })

    expect(game.canUndo()).toBe(true)
    expect(game.exploreUndoStack.length).toBe(2)

    game.undo()
    expect(game.sudoku.getGrid()[2][0]).toBe(0)
    expect(game.sudoku.getGrid()[1][1]).toBe(7)

    game.undo()
    expect(game.sudoku.getGrid()[1][1]).toBe(0)
    expect(game.canUndo()).toBe(false)
    expect(game.canRedo()).toBe(true)

    // 主栈不变
    expect(game.undoStack.length).toBe(1)
  })

  it('explore redo works', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 4 })
    game.undo()
    expect(game.sudoku.getGrid()[0][2]).toBe(0)

    game.redo()
    expect(game.sudoku.getGrid()[0][2]).toBe(4)
    expect(game.canRedo()).toBe(false)
  })

  it('canUndo/canRedo respect explore mode', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    expect(game.canUndo()).toBe(true)
    expect(game.canRedo()).toBe(false)

    game.enterExplore()
    // 探索栈为空 → 探索内 canUndo=false
    expect(game.canUndo()).toBe(false)
    expect(game.canRedo()).toBe(false)

    game.guess({ row: 1, col: 1, value: 7 })
    expect(game.canUndo()).toBe(true)

    game.commitExplore()
    // 退出探索后，主模式 canUndo 可见（原来的1步 + snapshot = 2）
    expect(game.canUndo()).toBe(true)
  })
})
