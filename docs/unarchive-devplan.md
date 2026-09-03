# 取消归档（Unarchive）功能开发方案

> 适用范围：`dsh-plugin-session-archive`（DeepSeek Harness 归档插件）新增「取消归档」能力。
> 本文基于当前代码（`lib/index.js`、`lib/client.js`）与 DSH 运行时行为编写，所有结论均已对照源码核实。

---

## 0. 现状梳理

当前插件能力（只读 + 永久删除）：

| 端 | 文件 | 现有能力 |
| --- | --- | --- |
| Host | `lib/index.js` | Typert 远程服务 `sessionArchive`，方法 `list / read / delete`；读写 `workspaceRegistry` 的 `archivedSessionIds` 与 workspace 表 |
| Client | `lib/client.js` | 侧边栏底部入口（`sidebar.footer.action`）+ 浮层面板（`shell.overlay`）：按工作区分组、查看全文、单删/多删、刷新 |

与本次改造直接相关的运行时事实（已逐一核实）：

1. **归档不动记账席位**：`dsh-workspace` 的 `archiveSession()` 只把会话 id 追加进 `archivedSessionIds`，**不**从 workspace 记录的 `sessionIds` 中移除；官方注释明确“被归档的会话保留其 `sessionIds` 席位，取消归档可恢复原位置”。
   - 这意味着：**取消归档 = 仅把 id 从 `archivedSessionIds` 移除**，会话自动回到原工作区、原顺序位置，无需任何额外记账操作。
2. **状态自动传播**：Host 端 `dsh-host-apiproxy` 监听 workspace 域 global 的 `domain/changed`，当 `archivedSessionIds` 内容变化时自动推送 `host/archived-sessions-changed` 帧 → 客户端运行时 `installArchived()` 全量更新快照 → 侧边栏列表按新归档集合重新推导（被取消归档的行立即恢复显示）。
   - 插件自身 `delete()` 已经走 `registry.enqueueOperation + registry.setState` 改这条状态，无需自建推送。
3. **无 unarchive 现成接口**：`dsh-workspace` / `dsh-host-apiproxy` 全库搜索 `unarchive` 无匹配，必须由插件自己以 `enqueueOperation + setState` 改写 `archivedSessionIds`（与现有 `delete()` 同构）。
4. **无“未读/已读”机制**：workspace UI 与运行时均无“LLM 答完未查看”的可见标记状态，需求 3 的“未点击标记”须由插件自己实现（客户端本地状态即可）。
5. **单一能力入口**：`sidebar.footer.action` 的标准 props 提供 `useWorkspaces` 与 `useSessions`（`SnapshotSelectorHook`）；会话列表快照含 `current`（当前打开会话 id，见于 `dsh-client-runtime` 的 `sessions.current`），可用于判断“用户是否点击/打开了该会话”。

---

## 1. 需求拆解

| # | 需求 | 关键约束 | 落点 |
| --- | --- | --- | --- |
| R1 | 新增“取消归档”能力 | 把已归档会话恢复到工作区，可继续正常对话 | Host RPC + Client 按钮 |
| R2 | 只能单个会话取消归档 | **禁止**多选模式下批量取消归档 | 客户端 UI：取消归档按钮只在非多选（单行操作）模式出现 |
| R3 | 不弹确认框；未点击前有“未读”式标记 | 点击即执行；取消归档后、会话在工作区侧边栏**尚未被点击**时显示标记，打开后消失 | 客户端：直接执行 + 本地“最近取消归档”状态 + 标记渲染 |

---

## 2. 总体设计

```
点击「取消归档」(单行按钮,无确认)
        │
        ▼
Client: api.unarchive(id)  ──RPC──▶  Host: sessionArchive/unarchive(sessionId)
        │                                │
        │                                ├─ 校验 id ∈ archivedSessionIds
        │                                ├─ registry.enqueueOperation →
        │                                │    setState({...state,
        │                                │      archivedSessionIds: 移除 id})
        │                                │    （不动 sessionIds/缓存/磁盘）
        │                                ├─ 计算所属工作区（复用 list() 的映射逻辑）
        │                                └─ 返回 { ok, id, workspace, warning }
        │
        ▼
   Host domain/changed ──▶ host/archived-sessions-changed ──▶ 客户端 installArchived
        │                                                      （侧边栏该行立即恢复显示）
        ▼
Client 面板：本地移除该行 + notice「已恢复到工作区「X」」
        + 把 id 记入 localStorage「recentlyUnarchived」
        ▼
侧边栏：该会话行显示“刚取消归档”标记（未点击前）
       订阅 useSessions(state => state.current)，
       当 current === id 时清除标记（持久化同步清理）
```

要点：

- **恢复原位置免费获得**：依赖 DSH 归档保留 `sessionIds` 席位这一设计，Host 端 unarchive 只做集合减法。
- **实时性免费获得**：复用 `host/archived-sessions-changed` 推送链路，无需插件自建宿主事件。
- **多选限制在 UI 层落地**：多选（Selecting）模式的行渲染只含 checkbox + 删除逻辑，取消归档按钮不进入该分支，天然满足“不能多选取消归档”。
- **无确认框**：按钮点击直接调用 RPC，无二次确认弹层（与删除的确认交互刻意区分）。
- **标记为插件自有状态**：存 `localStorage`（跨刷新、跨标签页存活），以“当前打开会话”为清除条件。

---

## 3. 详细设计

### 3.1 Host 端 `lib/index.js`

#### 3.1.1 新增远程描述符

在 `descriptors` 数组追加：

```js
{
  id: `${PACKAGE}#sessionArchive/unarchive`,
  service: 'sessionArchive',
  namespace: 'sessionArchive',
  method: 'unarchive',
  invocation: { kind: 'direct' },
  parameters: [{ name: 'sessionId', wire: 'sessionId', source: 'json', codec: idCodec }],
  result: jsonCodec
}
```

#### 3.1.2 新增 `unarchive(sessionId)` 方法

```js
async unarchive(sessionId) {
  const id = asId(sessionId)
  const registry = this.ctx.workspaceRegistry
  const archivedList = (registry.archivedSessionIds ?? []).map(asId)
  if (!archivedList.includes(id)) throw new Error(`会话 ${id} 不在归档列表中`)

  // 1) 只从归档集合移除；sessionIds 席位保留 → 自动恢复原位置
  await registry.enqueueOperation(async () => {
    const current = registry.requireState()
    await registry.setState({
      ...current,
      archivedSessionIds: current.archivedSessionIds.filter((entry) => asId(entry) !== id)
    })
  })

  // 2) 计算所属工作区，供客户端提示“已恢复到 XX”（复用 list() 的 ws 映射逻辑）
  const workspace = await this.workspaceOf(id)   // 见 3.1.3

  // 3) 不动投影缓存、不动磁盘日志；missing 会话由客户端隐藏入口
  return jsonSafe({ ok: true, id, workspace, warning: undefined })
}
```

要点：
- 复用现有 `delete()` 的 `enqueueOperation + setState` 模式，保证与 `archiveSession`/`delete` 串行化，避免并发读写竞态。
- 与删除最重要的差异：**不**触碰 workspace 表 `sessionIds`、**不**删除 `session_projcache`、**不**删除磁盘日志。
- 响应形状与 `delete()` 保持一致的 `{ ok, id, ... }` 风格，Client 端 `unwrap()` 无需改动。

#### 3.1.3 抽取工作区归属辅助函数（可选重构）

`list()` 中已有一段“workspace 记账 → `wsBySession`”的映射逻辑。建议抽成私有方法 `workspaceOf(sessionId)` / `buildWorkspaceIndex()`，`list()` 与 `unarchive()` 共用，避免两处重复维护：

```js
/** 返回拥有该会话的工作区摘要 { workspaceId, title, path }，无则 undefined。 */
async workspaceOf(id) { /* 读 workspace 域 global 顺序 + workspaces 表 sessionIds，取首个包含 id 的记录 */ }
```

### 3.2 Client 端 `lib/client.js`

#### 3.2.1 API 封装

`makeApi` 增加：

```js
restore: async (sessionId) => unwrap(await sessionArchive.unarchive(sessionId), '取消归档失败')
```

#### 3.2.2 面板：单行「取消归档」按钮（R2 + R3 核心）

- 位置：**非多选模式**的行操作区，顺序为 `查看内容 / 取消归档 / 删除`。
- 显示条件：
  - `selecting === false`（多选模式下整行只有 checkbox+删除，绝不出现取消归档 → 满足“不能多选取消归档”）；
  - `item.missing !== true`（会话日志已不存在时无可恢复内容，仅保留“清理记录”，不提供取消归档）。
- 交互：`onClick={() => restore(item.id)}`，**直接执行、无确认弹窗**；执行期间用现有 `busyId` 禁用该行按钮（复用删除的 busy 模式，文案可用 `…` 或“恢复中…/Restoring…”）。
- 成功提示：`notice` 显示 `已恢复到工作区「{workspace.title}」`（无工作区时 `已取消归档`）；之后 `setVersion(v => v + 1)` 刷新列表。
- 失败提示：`notice` 显示错误文本（沿用现有样式）。

#### 3.2.3 实现 `restore(id)` 处理函数

```js
const restore = async (id) => {
  setBusyId(id)
  setNotice('')
  try {
    const value = await api.restore(id)
    markRecentlyUnarchived(id)                    // 记入 localStorage（3.2.4）
    setNotice(value.workspace?.title
      ? (zh ? `已恢复到工作区「${value.workspace.title}」` : `Restored to workspace "${value.workspace.title}"`)
      : (zh ? '已取消归档。' : 'Restored.'))
    setVersion((current) => current + 1)          // 面板移除该行 + 重新拉取
  } catch (reason) {
    setNotice(String(...))                        // 取消归档失败
  } finally {
    setBusyId(null)
  }
}
```

#### 3.2.4 未点击标记状态（R3）

**状态存储**（模块级 helper，localStorage 持久化）：

```js
const UNARCHIVED_KEY = 'dsh-plugin-session-archive:recentlyUnarchived'
// 值形如 { [sessionId]: isoTime } ；只保留“本次会话期内取消归档且尚未打开”的条目
function readRecentlyUnarchived() { /* JSON.parse + 容错 */ }
function writeRecentlyUnarchived(map) { /* localStorage.setItem */ }
function markRecentlyUnarchived(id) { /* 写入当前时间，触发订阅者 */ }
function clearRecentlyUnarchived(id) { /* 删除键，触发订阅者 */ }
```

**清除条件（“被点击”）**：在 `sidebar.footer.action` 的 FooterAction（或其兄弟组件）中订阅：

```js
const currentId = useSessions((state) => state.current)   // 标准 props 提供
// 当 currentId ∈ recentlyUnarchived 时 → clearRecentlyUnarchived(currentId)
```

- `sessions.current` 即“当前打开/选中的会话 id”（已核实存在于会话列表快照）。
- 清除后写回 localStorage，并触发标记组件重渲染。

**过期兜底**：条目在以下任一情况移除（一个轻量维护 pass，可在列表刷新时执行）——
- 用户已打开该会话（上面的 current 订阅）；
- 该会话被重新归档（id 重新进入 `archivedSessionIds`）；
- 该会话在会话列表中已不存在（被删除）；
- 条目时间超过阈值（如 7 天，防 localStorage 无限增长）。

**标记渲染（两种方案，推荐 A，备选 B）**：

- **方案 A（推荐）——侧边栏行内“未读”圆点**（视觉上最贴近“LLM 答完未查看”的既有语义）：
  - 在插件已注入的样式里增加一个 `position: fixed` 的小圆点层（品牌色/警示色，如 `var(--dsw-alias-state-warn-primary)` 或 brand 色，约 8px，带轻微呼吸动画，与会话行状态点视觉语言一致）；
  - 定位方式：遍历侧边栏工作区列表容器内 `[role="treeitem"]` 行，用行内标题文本与本会话标题匹配定位（标题取 `useSessions` 快照 `list.byId[id]` 或归档面板 `list()` 结果）；找到后把圆点定位到**该行右侧**（时间与操作菜单之间），刻意避开行左侧的既有运行状态点槽位（StateDot），避免双点撞位/撞色；
  - 重定位触发：`scroll` / `resize` / 列表快照变化 / 面板开关，统一 rAF 节流；找不到行则隐藏该点；
  - 清除：命中 `current` 清除标记后同时移除圆点层元素。
  - 风险与缓解：标题文本匹配在“标题重复/标题变化”时可能错位——缓解：优先按“该行在 href/aria-label 无 id 时”退化为只显示“刚取消归档 N 个”的汇总徽标（降级到方案 B），不因个别错位导致崩溃。

> **圆点配色与语义（区分“取消归档”与“未读内容”）**：本方案当前**只定义一种圆点**——“刚取消归档、尚未打开”。调研已核实这一版 DSH **没有内置“LLM 答完未读”状态**，因此侧边栏不会有第二枚系统“未读”圆点与它混淆。为语义自明并给未来留出空间，约定：
>
> | 圆点 | 主题 token | 语义 |
> | --- | --- | --- |
> | 取消归档 / 待查看 | `--dsw-alias-brand-primary`（品牌蓝） | 刚取消归档、尚未点击打开 |
> | 未读内容（若未来引入） | `--dsw-alias-state-warn-primary`（警示琥珀） | 有新内容未查看（同类比场景） |
>
> 配套约定：① 圆点锚定行右侧、避开左侧状态点槽位，两种圆点即使并存也不与运行状态点混淆；② 单一颜色不作为唯一信号——圆点同时带 `title`/`aria-label`（如“刚取消归档，点击后消失”）；若未来双圆点并存，再加形状（实心/空心）或动画区分；③ 未来若引入“未读内容”机制且某会话同时命中两种标记，按“两枚并存”展示。
- **方案 B（兜底，更稳）——侧边栏底部“刚取消归档”徽标 + 悬浮列表**：
  - 在既有 `sidebar.footer.action` 单元格内（或覆盖层）渲染一个独立角标 `刚取消归档 · N`（与归档总数量徽标区分颜色）；
  - 点击展开小浮层，列出最近取消归档且未打开的会话（标题取会话快照），点某条 → 打开该会话 → 自动清除；
  - 优点：零 DOM 耦合、跨 DSH 版本稳定；缺点：标记不在行上，观感略弱。

> 需求 3 表述为“建议”，实现先做方案 A，若评审认为脆弱则直接切方案 B；两方案的“状态存储 + 清除条件”完全共用。

#### 3.2.5 文案（zh / en）

| key | zh | en |
| --- | --- | --- |
| 按钮 | 取消归档 | Restore |
| busy | 恢复中… | Restoring… |
| 成功（含工作区） | 已恢复到工作区「{title}」 | Restored to workspace "{title}" |
| 成功（无工作区） | 已取消归档。 | Restored. |
| 失败 | 取消归档失败 | Restore failed |
| 标记 | 刚取消归档 | Recently restored |
| 提示行（可选） | 打开后标记消失 | The marker clears when you open it |

### 3.3 需求合规清单

| 约束 | 落地方式 | 验证点 |
| --- | --- | --- |
| 只能单会话取消归档 | 取消归档按钮只渲染于非多选模式的单行操作区；Selecting 分支无此按钮 | 进入“选择”模式后任何行均无取消归档入口 |
| 不弹确认框 | `restore()` 无 confirm 分支、无遮罩 | 点击后立即执行并刷新 |
| 未点击前有标记 | localStorage 集合 + `useSessions.current` 订阅 + 方案 A/B 渲染 | 取消归档后侧边栏该行带点；打开后点消失；刷新页面仍在；重新归档后不再显示 |

---

## 4. 数据流与状态传播（时序）

```
用户点击「取消归档」                          ArchivePanel
   │  api.restore(id) ──────────────────────▶ Host unarchive()
   │                                            │ enqueueOperation + setState
   │                                            │（workspace 域 global 持久化）
   │                                            ▼ domain/changed
   │                                        host-apiproxy watcher
   │                                            ▼ host/archived-sessions-changed
   │◀────────────  { ok, id, workspace }  ◀────┘
   ▼
本地：移除面板行、notice、记入 recentlyUnarchived、setVersion
   ├─ sessionArchive/list 重新拉取（面板已无该项，徽标数-1）
   └─ 客户端 runtime installArchived(archivedSessionIds)
         └─ workspace 列表 store 更新 → 侧边栏恢复该行（原分组原位置）
         └─ FooterAction 徽标 useWorkspaces 自动-1
   └─ 标记层：在侧边栏该行渲染“未读”圆点（方案 A）
         └─ 用户点击行 → sessions.current = id → 订阅命中 → 清除标记
```

无需插件注册任何新的 Host 事件或远端服务：归档集合变更的广播由 DSH 现成链路承担。

---

## 5. 影响面与风险

| 项 | 说明 | 风险/对策 |
| --- | --- | --- |
| 会话恢复位置 | DSH 归档设计保留 `sessionIds` 席位，unarchive 只做集合减法，原位置自动恢复 | 依赖 DSH 这一保证（已核实源码注释）；若未来 DSH 改变归档语义需同步跟进 |
| 多客户端同步 | 与归档/删除一致，改动写入持久化 registry，其他已连接客户端经帧同步 | 无额外工作 |
| missing 会话 | 日志已删的归档项提供取消归档无意义 | 客户端隐藏按钮；Host 仍可幂等移除（防御） |
| 标记方案 A 的 DOM 耦合 | 行定位依赖 `[role=treeitem]` + 标题文本匹配 | 可按需退化为方案 B；定位失败时静默隐藏，绝不抛错 |
| localStorage 污染 | 未查看条目若忘记清理会残留 | 打开即清 + 超时清理 + 重新归档清理 |
| 并发/重入 | 连续点击、与删除并发 | 沿用 `busyId/busyIds` 机制；registry 操作已串行化 |
| 兼容性 | 无依赖变更、无 cordis.patch.yml 变更 | `npm run check` 保持不变 |
| 文档 | README / README_EN 使用说明需同步 | 随发布更新，版本号升至 1.1.0 |

---

## 6. 测试计划

1. **单会话取消归档（R1）**
   - 归档 1 个会话 → 面板出现 → 点「取消归档」→ 面板移除、notice 提示工作区名、侧边栏原分组原位置恢复显示、可点击进入对话。
2. **多选限制（R2）**
   - 进入“选择”模式 → 勾选任意行 → 确认无任何取消归档入口，只有删除。
   - 非多选模式逐行操作，一次仅影响一个会话。
3. **无确认框（R3 前半）**
   - 点击取消归档 → 无任何二次确认弹层/遮罩，直接生效。
4. **未点击标记（R3 后半）**
   - 取消归档后侧边栏该行出现标记（方案 A 圆点 / 方案 B 徽标）。
   - 点击打开该会话 → 标记消失。
   - 不打开直接刷新页面/重启应用 → 标记仍在（localStorage）。
   - 未打开时将会话重新归档 → 标记不再出现（幂等清理）。
5. **异常与边界**
   - 对日志已丢失（missing）的归档项：无取消归档按钮。
   - RPC 失败（如会话已不在归档列表）：notice 显示错误，不崩溃。
   - 连续双击取消归档按钮：busy 禁用防重入。
   - missing=“已丢失”项删除仍走确认（现有行为不变）。
6. **回归**
   - 现有查看内容 / 单删 / 多删 / 刷新 / 徽标计数均不回归；`npm run check` 通过。
7. **多客户端（可选）**
   - 两个窗口同时在线，A 取消归档 → B 侧边栏同步恢复该行。

---

## 7. 实施步骤（任务拆分）

1. **Host**：`lib/index.js` 加 `unarchive` 描述符 + 方法 + （可选）抽取工作区映射 helper。
2. **Client API**：`makeApi.restore`。
3. **面板按钮**：非多选行操作区加「取消归档」，missing 隐藏，busy 复用，成功/失败 notice，`setVersion` 刷新。
4. **标记状态**：`recentlyUnarchived` 读写模块 + `useSessions.current` 订阅清除 + 过期/重归档清理。
5. **标记渲染**：方案 A 圆点层（含重定位、降级），或直接落方案 B 徽标+浮层（按评审决议）。
6. **文案**：zh/en 文案补齐。
7. **文档与版本**：README、README_EN 使用说明更新；`package.json` 版本 1.1.0。
8. **测试**：按第 6 节执行并记录。

---

## 8. 验收标准（对应三条需求）

- [ ] 已归档会话可通过单行「取消归档」恢复，回到原工作区原位置，可继续对话（R1）。
- [ ] 任意时刻不存在“多选批量取消归档”入口（R2）。
- [ ] 取消归档全程无确认弹窗；取消归档后、会话在侧边栏未被点击期间有明确标记，点击打开后标记消失（R3）。