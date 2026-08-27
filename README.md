# dsh-plugin-session-archive

[English](README.md) | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that opens archived sessions from the sidebar footer. Sessions stay hidden from the normal session list; this plugin lets you read their transcripts and permanently delete them.

![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)

## Install

```sh
dsh plugin --profile web add github:hugohe3/dsh-plugin-session-archive
```

Restart the Harness (or DSH Desktop) after install. A **Archived Sessions** button appears at the bottom of the sidebar.

## What it does

- Lists archived sessions, grouped by workspace, with title, archive order, and created time.
- Opens a modal overlay to read the full conversation transcript (user, assistant, tool calls/results).
- Permanently deletes a session after confirmation: removes it from the archive list, drops workspace membership, clears the projection cache, and deletes the on-disk conversation log.
- Supports multi-select batch delete with a second confirmation.
- Follows the current UI locale (Chinese / English) and theme tokens.

It does **not** restore or unarchive a session back into the sidebar.

## Requirements

- DeepSeek Harness with the Web GUI (`dsh web` or DSH Desktop)
- Host services used at runtime: `typert`, `workspaceRegistry`, `storageDomain`
- Optional Host services used when present: `sessionQuery`, `sessionPersistence`

## Package layout

This repository is a standard `dsh-plugin` bundle:

- `package.json` declares `dsh.bundle.patch` (required for `dsh plugin add`) and `dsh.client` for the Web UI
- `cordis.patch.yml` inserts the Host plugin row
- `lib/index.js` — Host service (`sessionArchive.list` / `read` / `delete`)
- `lib/client.js` — Web client: sidebar footer launcher + overlay panel

## GitHub topic

Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic on the repository so it shows up with other installable Harness plugins.

## License

MIT
