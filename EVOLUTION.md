# EVOLUTION.md — Homework 2 设计演进文档

---

## 1. 你如何实现提示功能？

本次实现了**三层提示能力**，全部通过领域对象接口导出，不在 UI 组件中临时拼接：

### 1.1 候选提示（Candidate Hint）

**领域 API**：`Sudoku.getCandidates(row, col)` → 遍历 1~9，对每个候选值调用已有的 `check()` 方法，收集所有不违反行/列/宫规则的数字，返回数组。已有数字的格子（包括 givens 和用户已填数）返回 `[]`。

**入口**：`Game.getCandidates(row, col)` 薄委托到 `Sudoku`。

**UI**：Actions 面板的「候选提示」按钮 → 调用 `grid.showCandidates($cursor)` → Board 上方显示蓝色 banner 消息，如 `Cell (3, 3) candidates: [1, 2, 4]`。

### 1.2 下一步提示（Next Move Hint）

**领域 API**：`Sudoku.findNextMoves()` → 遍历 81 格，对每个空格调用 `getCandidates()`，过滤出候选数恰好为 1（Naked Single / 推定值）的格子，返回 `[{row, col, value}, ...]`。

**入口**：`Game.findNextMoves()` 薄委托到 `Sudoku`。

**UI**：Actions 面板的「下一步提示」按钮 → 调用 `grid.showNextMove()` → Board 上方 banner 如 `Cell (5, 5) can only be 7`；无 Naked Single 时显示 `No cell with a single candidate found`。

### 1.3 直接填答案（Fill Answer Hint）

**领域 API**：`Game.getHintValue(row, col)` → 从 `this.solvedGrid[row][col]` 直接读取正确答案。

**技术原理**：`Game` 在构造时接收 `solvedGrid` 参数（9×9 完整求解结果）。`grid.js` 的 `generate()` / `decodeSencode()` 在生成/加载题目时，立即调用 `solveSudoku(puzzleArray)` 预求解，将结果传入 `createGame()`。点击 Fill Hint 按钮时，直接取正确答案执行 `game.guess()`，同时消耗一次 hint 计数。

**UI**：Actions 面板的灯泡按钮（原 Hint 按钮）→ `handleFillHint()` → `grid.fillHint($cursor)` → 光标格子填入正确答案。

---

## 2. 你认为提示功能更属于 `Sudoku` 还是 `Game`？为什么？

**`getCandidates()` / `findNextMoves()` 属于 `Sudoku`。**

理由：
- 这两个方法是**纯盘面计算**——输入一个 grid，输出候选数/推定值数组，不依赖任何 `Game` 会话状态（undoStack、exploreMode、solvedGrid 等）。
- 如果未来需要对任何 `Sudoku` 实例（不一定是当前 Game 持有的那一个）计算候选数，接口在 `Sudoku` 上即可直接使用。
- `Game` 只做薄委托（`return this.sudoku.getCandidates(row, col)`），保持 `Sudoku` 的领域纯度。

**`getHintValue()` 属于 `Game`。**

理由：
- 它依赖 `this.solvedGrid`——这是 Game 级的预求解结果，存储在 Game 中而非 Sudoku 中。
- `Sudoku` 不应该知道"答案"是什么；它的职责是维护当前盘面状态和校验规则。"正确答案"是游戏会话层面的概念，由外部求解器产生后注入 Game。

**协作模式**：`Sudoku` 提供纯盘面计算能力（`getCandidates`、`findNextMoves`），`Game` 持有并管理"已知答案"（`solvedGrid`、`getHintValue`），UI 通过 adapter 同时消费两者。

---

## 3. 你如何实现探索模式？

### 核心设计：快照 + 子栈 + 失败记忆

采用「Game 进入一种新的状态」方案——通过 `exploreMode` 布尔标志切换，配合深拷贝快照 + 独立子栈实现分支与回滚。

### 新增属性（均在 `Game.js` 中）

| 属性 | 类型 | 作用 |
|------|------|------|
| `exploreMode` | `boolean` | 是否处于探索模式 |
| `exploreSnapshot` | `Sudoku\|null` | 进入探索时的盘面深拷贝 |
| `exploreUndoStack` | `Sudoku[]` | 探索内部撤销栈 |
| `exploreRedoStack` | `Sudoku[]` | 探索内部重做栈 |
| `failedPaths` | `Set<string>` | 失败路径记忆（81 字符 hash） |

### 新增方法

| 方法 | 作用 |
|------|------|
| `enterExplore()` | 保存 snapshot 快照，设置 exploreMode=true，重置探索子栈 |
| `commitExplore()` | 将 snapshot 压入主 undoStack，清空主 redoStack，退出探索 |
| `abandonExplore()` | 将 `this.sudoku` 恢复为 snapshot 的深拷贝，退出探索（主栈无变化） |
| `_gridHash()` | 将 `sudoku.grid` 展平为 81 字符字符串，用于 failedPaths 去重 |
| `isExploreFailed()` | 当前 hash 是否在 `failedPaths` 中 |

### 分叉逻辑

`guess()`、`undo()`、`redo()`、`canUndo()`、`canRedo()` 全部在内部根据 `this.exploreMode` 分流：

- **探索模式**：操作 `exploreUndoStack` / `exploreRedoStack`
- **主模式**：操作 `undoStack` / `redoStack`（保持 HW1 原逻辑不变）

UI 层的 Undo/Redo 按钮无需任何修改，`grid.undo()` / `grid.redo()` 内部自动分流。

### 冲突检测

每次探索内执行 `guess()` 后，立即调用 `this.sudoku.getInvalidCells()`。若返回非空数组（表示行/列/宫出现冲突），则调用 `this.failedPaths.add(this._gridHash())` 记录失败。

### getViewState 扩展

返回对象新增 `exploreMode` 和 `exploreFailed` 字段，通过 `syncFromGame()` 流入 Svelte stores，驱动 UI 的橙色边框（探索视觉提示）和红色 banner（重复失败路径警告）。

---

## 4. 主局面与探索局面的关系是什么？

### 是共享对象还是复制对象？

**深拷贝（`Sudoku.clone()`）**。进入探索时，`exploreSnapshot = this.sudoku.clone()` 保存分叉点的一个完全独立副本（grid + givens 全部深拷贝）。探索中的所有 `guess()` / `undo()` / `redo()` 在 `this.sudoku` 上进行，与 `exploreSnapshot` 完全隔离，不会互相污染。

### 是否会产生深拷贝问题？

不会。`Sudoku.clone()` 内部调用 `new Sudoku(this.getGrid(), this.givens)`，而 `getGrid()` 返回 `grid.map(row => [...row])`（逐行浅拷贝），`givens` 同理。因为 grid 和 givens 的叶子节点是基本类型（number / boolean），所以逐行浅拷贝已等价于完全深拷贝。快照体积为 9×9×2 个值，微小可忽略。

### 提交时如何合并？

`commitExplore()` 将 `exploreSnapshot.clone()` 压入主 `undoStack`（一个条目），清空主 `redoStack`。这样用户在主模式 undo 一次即可回到探索前的状态。探索内部的具体步骤不逐条写入主栈，保持主历史简洁。

### 放弃时如何回滚？

`abandonExplore()` 执行 `this.sudoku = this.exploreSnapshot.clone()`，将盘面恢复到进入探索前的状态。主 `undoStack` 不做任何修改——探索过程完全无痕。

---

## 5. 你的 history 结构在本次作业中是否发生了变化？

**主 history 保持线性栈结构，未引入树状分支。**

具体来说：

| 维度 | HW1 | HW2 |
|------|-----|-----|
| 主撤销栈 | `undoStack` (Sudoku[]) | 不变 |
| 主重做栈 | `redoStack` (Sudoku[]) | 不变 |
| 探索撤销栈 | 无 | `exploreUndoStack` (Sudoku[]) — 独立子栈 |
| 探索重做栈 | 无 | `exploreRedoStack` (Sudoku[]) — 独立子栈 |
| 失败记忆 | 无 | `failedPaths` (Set<string>) — 跨探索会话 |
| 栈模型 | 简单线性栈 | 主线栈 + 探索子栈，但仍为线性 |

**设计理由**：作业建议"不建议过早引入复杂 DAG 合并语义"。快照 + 子栈方案在满足冲突/回溯/记忆三项功能要求的同时，保持了主 history 的线性简单性。

- 探索过程拥有独立 history（子栈），探索内的 undo/redo 只在子栈中操作
- 提交后 snapshot 作为一次复合 undo entry 进入主栈——一次探索 = 一个 undo 节点
- 放弃后主栈完全不受影响
- `canUndo()` / `canRedo()` 根据 `exploreMode` 自动切换判断的栈

---

## 6. Homework 1 中的哪些设计，在 Homework 2 中暴露出了局限？

### 6.1 `Sudoku.guess()` 无 givens 保护（已在 HW1 Review 修复阶段修复）

**局限**：原 `guess()` 对任何坐标直接写入，没有区分 givens 和 user inputs。虽然在 HW2 开始前已修复（`guess()` 开头检查 `isGiven()` 直接 return），但这确实是 HW1 设计的遗留问题。

### 6.2 `check()` 语义错误（已在 HW1 Review 修复阶段修复）

**局限**：原 `check()` 扫描行/列/宫时未排除自身坐标。导致：目标格当前值为 v 时，`check(v)` 错误返回 false → `getCandidates()` 无法正确工作。修复后 `check()` 跳过 `(row, col)` 自身，`getCandidates()` 直接可用。

### 6.3 无效操作进入 Undo 历史（已在 HW1 Review 修复阶段修复）

**局限**：原 `Game.guess()` 无论值是否变化都压栈。修复后增加 no-op 检查：值未变则不压栈。

### 6.4 `canUndo` / `canRedo` 未接进响应式视图

**局限**：原 `grid.js` 的 `syncFromGame()` 只同步 grid 和 invalidCells，未将 `canUndo` / `canRedo` 变成可订阅 store。HW2 中通过扩展 `syncFromGame()` 同步了这些状态，并让 UI 按钮直接绑定。

### 6.5 `gameWon` 重复计算

**局限**：原 `game.js` 中 `gameWon` 是通过 `derived([userGrid, invalidCells], ...)` 在 UI 层独立计算的，与 `Game.isWon()` 形成双源。HW2 修复为 `gameWon` 从 `grid.js` 的 store 读取，该 store 由 `Game.isWon()` → `getViewState().won` 单向同步。

### 6.6 缺少 solvedGrid 概念

**局限**：HW1 设计中没有"完整答案"的存储位置。HW2 中在 `Game` 构造函数增加 `solvedGrid` 参数，初始化时即求解，使 Hint 填答案功能得以实现。

### 6.7 没有探索/分支机制

**局限**：HW1 只有单一的线性 undo/redo，无法支持分支探索。HW2 通过 exploreMode 状态机 + 子栈扩展了该模型。

---

## 7. 如果重做一次 Homework 1，你会如何修改原设计？

1. **构造阶段即区分 givens 和 user inputs**：`Sudoku` 构造函数中持久化 `this.givens`（布尔二维数组），并提供 `isGiven(row, col)` 查询方法。这避免 HW1 Review 中发现的"业务约束靠 UI 层 `keyboardDisabled` 守门"的贫血问题。

2. **`check()` 从一开始就排除自身坐标**：避免后续 `getCandidates()` 不可用的 bug。同时增加 `value === 0` 快速返回 true 的短路逻辑。

3. **`Game.guess()` 从一开始就过滤 no-op**：值未变则不压栈、不执行。避免 Undo 历史混入无效操作。

4. **单向数据流从一开始就完整**：`getViewState()` 包含 `canUndo` / `canRedo` / `won` 等全部 UI 所需状态，adapter 通过 `syncFromGame()` 统一同步，彻底消除 UI 层独立 derived 计算。

5. **在 Game 构造函数中预留 `solvedGrid` 参数**：即使 HW1 不用，保留接口便于 HW2 演进。避免后续需要改构造函数签名。

6. **设计探索模式接口的扩展留白**：HW1 的 `guess()` / `undo()` / `redo()` 内部预留一个 `exploreMode` 分支判断的钩子（即使是空的），使得 HW2 的分叉逻辑更自然、侵入更小。
