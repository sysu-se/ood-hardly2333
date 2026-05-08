import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from '../hw1/helpers/domain-api.js'

describe('HW2 explore: failed path memory', () => {
  it('records failed path on conflict', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    // 第一步填合法值（不冲突），第二步同行填相同值制造冲突
    game.guess({ row: 0, col: 2, value: 1 })
    game.guess({ row: 0, col: 3, value: 1 }) // 同行冲突

    expect(game.failedPaths.size).toBeGreaterThan(0)
  })

  it('detects re-entering a failed path', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 1 })
    game.guess({ row: 0, col: 3, value: 1 })
    game.abandonExplore()

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 1 })
    game.guess({ row: 0, col: 3, value: 1 })

    expect(game.isExploreFailed()).toBe(true)
  })

  it('_gridHash returns 81-char string', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    const hash = game._gridHash()
    expect(typeof hash).toBe('string')
    expect(hash.length).toBe(81)
    expect(/^[0-9]{81}$/.test(hash)).toBe(true)
  })

  it('failedPaths persists across explore sessions', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 1 })
    game.guess({ row: 0, col: 3, value: 1 })
    game.abandonExplore()

    const size = game.failedPaths.size
    expect(size).toBe(1)

    game.enterExplore()
    game.abandonExplore()

    expect(game.failedPaths.size).toBe(size)
  })

  it('getViewState exploreFailed reflects memory', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 1 })
    game.guess({ row: 0, col: 3, value: 1 })
    game.abandonExplore()

    game.enterExplore()
    game.guess({ row: 0, col: 2, value: 1 })
    game.guess({ row: 0, col: 3, value: 1 })

    const view = game.getViewState()
    expect(view.exploreFailed).toBe(true)
  })
})
