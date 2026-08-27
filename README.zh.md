# dsh-plugin-session-archive

[English](README.md) | [中文](README.zh.md)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件：从侧边栏底部打开已归档会话。归档会话不会出现在普通会话列表里；本插件用来阅读完整对话，并永久删除它们。

![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)

## 安装

```sh
dsh plugin --profile web add github:hugohe3/dsh-plugin-session-archive
```

安装后重启 Harness（或 DSH Desktop）。侧边栏底部会出现 **归档会话** 按钮。

## 功能

- 按工作区分组列出归档会话，显示标题、归档顺序和创建时间。
- 弹层中阅读完整对话记录（用户、助手、工具调用与结果）。
- 确认后永久删除：从归档列表移除、清理工作区归属、删除投影缓存，并删除磁盘上的会话日志。
- 支持多选批量删除，二次确认。
- 跟随界面语言（中/英）和主题色。

**不会**把归档会话恢复到侧边栏。

## 运行要求

- 带 Web GUI 的 DeepSeek Harness（`dsh web` 或 DSH Desktop）
- Host 运行时服务：`typert`、`workspaceRegistry`、`storageDomain`
- 可选服务（存在时使用）：`sessionQuery`、`sessionPersistence`

## 包结构

本仓库是标准的 `dsh-plugin` bundle：

- `package.json` 声明 `dsh.bundle.patch`（`dsh plugin add` 所需）以及 Web UI 用的 `dsh.client`
- `cordis.patch.yml` 插入 Host 插件行
- `lib/index.js` — Host 服务（`sessionArchive.list` / `read` / `delete`）
- `lib/client.js` — Web 客户端：侧边栏底部入口 + 弹层面板

## GitHub topic

请在仓库上添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic，以便和其他可安装的 Harness 插件列在一起。

## 许可

MIT
