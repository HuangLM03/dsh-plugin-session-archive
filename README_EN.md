# dsh-plugin-session-archive

[中文](README.md)

A DeepSeek Harness plugin for **archived sessions**. Archived sessions stay hidden from the normal sidebar list; this plugin opens them from the sidebar footer, lets you read the full transcript, and permanently deletes them.

It does **not** restore / unarchive a session back into the sidebar.

Works on **Windows** and **macOS** (and Linux), with DSH Desktop or `dsh web`.

## Install

Run the commands in a terminal where `dsh` is available:

- **DSH Desktop**: tray menu → Open Terminal (same on Windows and macOS)
- **CLI install of dsh**: any shell with `dsh` on `PATH` (PowerShell or cmd on Windows; Terminal / iTerm on macOS / Linux)

Use the profile that matches your client:

| Client | Profile |
| --- | --- |
| DSH Desktop | `desktop` |
| `dsh web` | `web` |

Examples below use DSH Desktop. If you run `dsh web`, replace `desktop` with `web`.

### From GitHub

After the repository is public:

```sh
dsh plugin --profile desktop add github:hugohe3/dsh-plugin-session-archive
```

### From a local directory

Clone or download this repository, then pass the plugin root (the directory that contains `package.json` and `cordis.patch.yml`).

macOS / Linux:

```sh
dsh plugin --profile desktop add /path/to/dsh-plugin-session-archive
```

Windows (PowerShell or cmd):

```bat
dsh plugin --profile desktop add C:\path\to\dsh-plugin-session-archive
```

Quote the path if it contains spaces, for example:

```sh
dsh plugin --profile desktop add "/Users/your-name/dsh-plugin-session-archive"
```

```bat
dsh plugin --profile desktop add "C:\Users\your-name\dsh-plugin-session-archive"
```

**Restart** DeepSeek Harness or DSH Desktop after install. An **Archived Sessions** button appears at the bottom of the sidebar (Chinese UI: **归档会话**).

## Uninstall

```sh
dsh plugin --profile desktop remove dsh-plugin-session-archive
```

Then restart. Use `web` instead of `desktop` if that is your profile.

## Use

1. Click **Archived Sessions** at the bottom of the sidebar (box icon when the sidebar is collapsed).
2. The overlay lists archived sessions grouped by workspace, with title, archive order, and created time.
3. **View** opens the full transcript (user / assistant / tool calls and results). Click again to hide it.
4. **Delete** asks for confirmation, then removes the session from the archive list and deletes its on-disk log. This cannot be undone.
5. **Select** enables multi-select. Choose sessions, click **Delete**, and confirm to permanently delete them in batch.
6. **Refresh** reloads the list. Close with **×**, or by clicking the mask outside the panel.

The UI follows the current DSH locale (Chinese / English) and theme tokens.

## What it does not do

- It does not restore / unarchive a session into the sidebar.
- It does not change sessions that are not archived.

## License

MIT
