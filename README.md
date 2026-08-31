# dsh-plugin-session-archive

[English](README_EN.md)

DeepSeek Harness 插件：管理**已归档会话**。归档会话不会出现在普通侧边栏列表里；本插件从侧边栏底部打开它们，阅读完整对话，并永久删除。

适用于 **Windows** 与 **macOS**（以及 Linux），以及 DSH Desktop / `dsh web`。

## 安装

在能运行 `dsh` 的终端里执行：

- **DSH Desktop**：托盘菜单 →「打开终端」（Windows / macOS 都一样）
- **命令行安装的 dsh**：任意已把 `dsh` 加入 `PATH` 的终端（Windows 可用 PowerShell 或 cmd，macOS / Linux 可用 Terminal / iTerm）

把 `--profile` 换成你正在用的 profile：

| 客户端 | profile |
| --- | --- |
| DSH Desktop | `desktop` |
| `dsh web` | `web` |

下面以 DSH Desktop 为例。若使用 `dsh web`，把 `desktop` 改成 `web`。

### 从 GitHub 安装

```sh
dsh plugin --profile desktop add github:HuangLM03/dsh-plugin-session-archive
```

### 从本地目录安装

先克隆或下载本仓库，再把路径换成你机器上的插件根目录（该目录必须包含 `package.json` 和 `cordis.patch.yml`）。

macOS / Linux：

```sh
dsh plugin --profile desktop add /path/to/dsh-plugin-session-archive
```

Windows（PowerShell 或 cmd）：

```bat
dsh plugin --profile desktop add C:\path\to\dsh-plugin-session-archive
```

路径含空格时请加引号，例如：

```sh
dsh plugin --profile desktop add "/Users/你的用户名/dsh-plugin-session-archive"
```

```bat
dsh plugin --profile desktop add "C:\Users\你的用户名\dsh-plugin-session-archive"
```

安装完成后**重启** DeepSeek Harness 或 DSH Desktop。侧边栏最底部会出现 **归档会话**（英文界面为 **Archived Sessions**）。

## 卸载

```sh
dsh plugin --profile desktop remove dsh-plugin-session-archive
```

然后重启。使用 `dsh web` 时同样把 `desktop` 改成 `web`。

## 使用

1. 在侧边栏底部点击 **归档会话**（侧边栏收起时只显示箱子图标）。
2. 弹出面板按**工作区**分组列出已归档会话，显示标题、归档顺序、创建时间。
3. **查看内容**：展开该会话的完整对话（用户 / 助手 / 工具调用与结果）。再点一次即可收起。
4. **删除**：先点删除，再点「确认删除」。会话会从归档列表移除，磁盘上的对话日志一并删除，**不可恢复**。
5. **选择**：进入多选，勾选若干会话后点「删除」，二次确认后批量永久删除。
6. **刷新**：重新读取归档列表。点右上角 **×**，或点击面板外的遮罩关闭。

界面语言跟随 DSH（中文 / English），颜色跟随当前主题。

## 许可

MIT
