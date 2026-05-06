# con-oo-hardly2333-1 - Review

## Review 结论

当前实现已经把 `Game` / `Sudoku` 接入了主要 Svelte 流程，但领域模型仍然偏贫血，关键数独规则和部分游戏状态仍散落在 store / 组件侧，尚未做到“领域对象成为唯一核心真相源”。从作业目标看，接入是有的，但 OOP/OOD 和业务建模质量还有明显短板。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. “给定题面不可修改”这条核心业务规则没有进入领域层

- 严重程度：core
- 位置：src/domain/Sudoku.js:34-36; src/domain/Game.js:48-51; src/node_modules/@sudoku/stores/keyboard.js:6-10
- 原因：`Sudoku.guess()` 和 `Game.guess()` 对任何坐标都直接写入，没有区分 givens 和 user inputs，也没有拒绝非法写入。当前只是靠 `keyboardDisabled` 在 UI 层阻止编辑初始题面，这意味着任何绕过该组件的调用都能改掉题目本身，业务约束没有被对象模型守住。

### 2. Svelte 适配层仍在绕过 Game，导致领域对象不是唯一真相源

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/grid.js:46-49,111,177; src/node_modules/@sudoku/stores/game.js:7-18; src/domain/Game.js:159-167
- 原因：虽然 adapter 持有了 `Game`，但它仍直接读取 `game.sudoku.getGrid()`，并在另一个 store 里重复计算 `won`，而不是统一消费 `Game.getViewState()` / `Game.isWon()`。这让 `Game` 退化成“部分被使用的容器”，UI 与内部结构强耦合，和作业要求里“View 真正消费领域对象”还有距离。

### 3. 校验接口 `check()` 的语义不正确，不能可靠表示合法落子

- 严重程度：major
- 位置：src/domain/Sudoku.js:46-60
- 原因：`check()` 在扫描行、列、宫时没有排除当前坐标自身，因此只要目标位置已经是该值，就会立即返回 `false`。这使它无法正确校验“当前位置填这个数是否合法”，作为领域对象宣称提供的校验能力并不可信。

### 4. 无效操作也会进入 Undo 历史，历史模型过于粗糙

- 严重程度：major
- 位置：src/domain/Game.js:48-51; src/components/Controls/Keyboard.svelte:12-19
- 原因：`Game.guess()` 无论值是否真正变化都会先压入快照。键盘在 notes 模式下会执行 `userGrid.set($cursor, 0)`，即使该格本来就是 0，也会产生一条新的 undo 记录。结果是历史里混入大量 no-op，影响撤销语义，也说明 `Game` 没有把“有效用户操作”建模清楚。

### 5. `canUndo` / `canRedo` 没有真正接进响应式视图状态

- 严重程度：major
- 位置：src/domain/Game.js:159-167; src/node_modules/@sudoku/stores/grid.js:45-49,134-143; src/components/Controls/ActionBar/Actions.svelte:26-32
- 原因：`Game.getViewState()` 已经给出了 `canUndo` / `canRedo`，但 adapter 只同步了 grid 和 invalidCells，没有把这两个状态变成可订阅 store；按钮也只根据 `gamePaused` 禁用，完全不反映历史是否存在。这样会让领域状态和界面状态脱节，Svelte 接入不完整。

### 6. Sudoku 对自身不变量约束过弱，类仍然接近二维数组包装

- 严重程度：major
- 位置：src/domain/Sudoku.js:11-17,34-36,89-94
- 原因：构造函数、`guess()`、`fromJSON()` 都没有验证 9x9 形状、坐标范围和值范围，理论上可以轻易构造出非法盘面。对象虽然存在，但还没有把“合法 Sudoku 状态”真正封装为领域不变量，OOD 上仍偏向 anemic model。

## 优点

### 1. Undo / Redo 的基本职责已经被收回到 Game

- 位置：src/domain/Game.js:48-79
- 原因：`Game` 负责维护 `undoStack` / `redoStack`，并在新落子后清空 redo，这比把撤销逻辑散在组件里更符合职责分配。

### 2. 对 grid 的防御性拷贝和序列化接口比较完整

- 位置：src/domain/Sudoku.js:23-25,67-93
- 原因：`getGrid()`、`clone()`、`toJSON()`、`fromJSON()` 至少建立了快照和外表化边界，避免 UI 直接拿到内部数组后任意修改。

### 3. 已经有面向 Svelte 的视图快照适配思路

- 位置：src/domain/Game.js:159-167; src/node_modules/@sudoku/stores/grid.js:45-49
- 原因：`Game.getViewState()` 提供了 puzzle/current/invalid/won 等只读视图数据，`grid.js` 里的 `syncFromGame()` 也确实以它为同步入口，这条设计方向是对的。

### 4. 主要游戏流程已经接入领域对象，而不是继续在组件里直接改数组

- 位置：src/node_modules/@sudoku/stores/grid.js:77-90,117-127,166-181
- 原因：开始新局、加载自定义题、用户输入、Undo / Redo 都已经通过 `createGame()` / `game.guess()` / `game.undo()` / `game.redo()` 转发，说明这次作业最基础的“接入真实流程”已经做到。

## 补充说明

- 本次结论完全基于静态阅读，未运行应用，也未执行测试；涉及 `undo`、`won`、输入限制等判断都来自代码路径分析。
- 审查范围按要求限制在 `src/domain/*` 及其直接 Svelte 接入点，主要查看了 `src/App.svelte`、`src/components/Board/*`、`src/components/Controls/*`、`src/components/Header/Dropdown.svelte`、`src/components/Modal/Types/Welcome.svelte`，以及 `src/node_modules/@sudoku/stores/grid.js`、`src/node_modules/@sudoku/stores/game.js`、`src/node_modules/@sudoku/stores/keyboard.js`。
- `Sudoku.check()` 当前在 UI 流程中没有被调用，但它属于作业要求中“提供校验能力”的领域 API，因此仍按设计质量缺陷计入评价。
