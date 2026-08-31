# dsh-plugin-session-archive

[English](#english) | [中文](#中文)

A DeepSeek Harness plugin that manages **archived sessions**: they stay hidden from the normal sidebar list; this plugin lets you open them from the sidebar footer, read the full transcript, and permanently delete them.

It does **not** restore / unarchive a session back into the sidebar.

---

## 中文

### 安装

在 **DSH Desktop 内置终端**（托盘 → 打开终端）或已安装 `dsh` 的命令行里执行。把下面的 profile 换成你正在用的那个：

| 客户端 | profile |
| --- | --- |
| DSH Desktop（本应用） | `desktop` |
| `dsh web` | `web` |

**方式一：从本仓库本地安装（当前可用）**

```sh
dsh plugin --profile desktop add "/Volumes/MobileHD/Data/deepseek harness 归档插件"
```

如果用的是 `dsh web`：

```sh
dsh plugin --profile web add "/Volumes/MobileHD/Data/deepseek harness 归档插件"
```

路径必须是这个插件仓库的根目录（里面有 `package.json` 和 `cordis.patch.yml`）。相对路径也可以，会按你执行命令时所在的目录解析。

**方式二：从 GitHub 安装（仓库公开之后）**

```sh
dsh plugin --profile desktop add github:hugohe3/dsh-plugin-session-archive
```

安装完成后**重启** DeepSeek Harness / DSH Desktop。侧边栏最底部会出现 **归档会话** 按钮。

### 卸载

```sh
dsh plugin --profile desktop remove dsh-plugin-session-archive
```

然后重启。

### 使用

1. 在侧边栏底部点击 **归档会话**（收起侧边栏时只显示箱子图标）。
2. 弹出面板按**工作区**分组列出已归档会话，显示标题、归档顺序、创建时间。
3. **查看内容**：展开该会话的完整对话（用户 / 助手 / 工具调用与结果）。再点一次即可收起。
4. **删除**：先点删除，再点「确认删除」。会从归档列表移除，并删除磁盘上的会话日志，**不可恢复**。
5. **选择**：进入多选，勾选若干会话后点「删除」，二次确认后批量永久删除。
6. **刷新**：重新读取归档列表。点右上角 **×** 或面板外的遮罩关闭。

界面语言跟随 DSH（中文 / English），颜色跟随当前主题。

### 不会做的事

- 不会把归档会话恢复到侧边栏
- 不会修改未归档的当前会话

---

## English

### Install

Run this in the **DSH Desktop built-in terminal** (tray → Open Terminal) or any shell where `dsh` is on `PATH`. Use the profile that matches your client:

| Client | Profile |
| --- | --- |
| DSH Desktop | `desktop` |
| `dsh web` | `web` |

**From this local checkout (works now):**

```sh
dsh plugin --profile desktop add "/Volumes/MobileHD/Data/deepseek harness 归档插件"
```

For `dsh web`:

```sh
dsh plugin --profile web add "/Volumes/MobileHD/Data/deepseek harness 归档插件"
```

The path must be the plugin repository root (the directory that contains `package.json` and `cordis.patch.yml`).

**From GitHub (after the repository is public):**

```sh
dsh plugin --profile desktop add github:hugohe3/dsh-plugin-session-archive
```

**Restart** DeepSeek Harness / DSH Desktop after install. An **Archived Sessions** button appears at the bottom of the sidebar.

### Uninstall

```sh
dsh plugin --profile desktop remove dsh-plugin-session-archive
```

Then restart.

### Use

1. Click **Archived Sessions** at the bottom of the sidebar (box icon when the sidebar is collapsed).
2. The overlay lists archived sessions grouped by workspace, with title, archive order, and created time.
3. **View** opens the full transcript (user / assistant / tool calls and results). Click again to hide it.
4. **Delete** asks for confirmation, then removes the session from the archive list and deletes its on-disk log. This cannot be undone.
5. **Select** enables multi-select. Choose sessions, click **Delete**, and confirm to permanently delete them in batch.
6. **Refresh** reloads the list. Close with **×** or by clicking the mask outside the panel.

The UI follows the current DSH locale (Chinese / English) and theme tokens.

### What it does not do

- It does not restore / unarchive a session into the sidebar.
- It does not change sessions that are not archived.

## Requirements

- DeepSeek Harness with the Web GUI (`dsh web` or DSH Desktop)
- Host services: `typert`, `workspaceRegistry`, `storageDomain`
- Optional when present: `sessionQuery`, `sessionPersistence`

## License

MIT
