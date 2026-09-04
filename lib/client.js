window.__ModuleLoader__.load({
  id: 'dsh-plugin-session-archive',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    var react = require('react')

    const PACKAGE = 'dsh-plugin-session-archive'
    const pass = (value) => value
    const jsonCodec = { mode: 'strict', typeSymbol: `${PACKAGE}#JsonValue`, schema: { parse: pass } }
    const idCodec = { mode: 'strict', typeSymbol: `${PACKAGE}#SessionId`, schema: { parse: pass } }
    const descriptors = [
      {
        id: `${PACKAGE}#sessionArchive/list`,
        service: 'sessionArchive',
        namespace: 'sessionArchive',
        method: 'list',
        invocation: { kind: 'direct' },
        parameters: [],
        result: jsonCodec
      },
      {
        id: `${PACKAGE}#sessionArchive/read`,
        service: 'sessionArchive',
        namespace: 'sessionArchive',
        method: 'read',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'sessionId', wire: 'sessionId', source: 'json', codec: idCodec }],
        result: jsonCodec
      },
      {
        id: `${PACKAGE}#sessionArchive/delete`,
        service: 'sessionArchive',
        namespace: 'sessionArchive',
        method: 'delete',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'sessionId', wire: 'sessionId', source: 'json', codec: idCodec }],
        result: jsonCodec
      },
      {
        id: `${PACKAGE}#sessionArchive/unarchive`,
        service: 'sessionArchive',
        namespace: 'sessionArchive',
        method: 'unarchive',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'sessionId', wire: 'sessionId', source: 'json', codec: idCodec }],
        result: jsonCodec
      }
    ]

    // ── shared overlay visibility store ──────────────────────────────────────
    const overlayState = { open: false, listeners: new Set() }
    const subscribeOverlay = (fn) => {
      overlayState.listeners.add(fn)
      return () => {
        overlayState.listeners.delete(fn)
      }
    }
    const getOverlayOpen = () => overlayState.open
    const setOverlayOpen = (open) => {
      if (overlayState.open === open) return
      overlayState.open = open
      for (const listener of [...overlayState.listeners]) listener()
    }
    const useOverlayOpen = () => react.useSyncExternalStore(subscribeOverlay, getOverlayOpen)

    // ── "recently unarchived, not yet opened" marker store ───────────────────
    // Persisted to localStorage so the marker survives reloads / tab switches and
    // is cleared only when the user actually opens the session (see markers).
    // getUnarchivedSnapshot returns a cached immutable copy so useSyncExternalStore
    // sees a stable reference between changes; mutations invalidate the cache.
    const UNARCHIVED_KEY = 'dsh-plugin-session-archive:recentlyUnarchived'
    const UNARCHIVED_TTL = 7 * 24 * 60 * 60 * 1000
    const unarchivedState = { map: null, snapshot: null, listeners: new Set() }
    function loadUnarchivedMap() {
      if (unarchivedState.map === null) {
        let raw = {}
        try {
          const stored = window.localStorage.getItem(UNARCHIVED_KEY)
          if (stored !== null) {
            const parsed = JSON.parse(stored)
            if (typeof parsed === 'object' && parsed !== null) raw = parsed
          }
        } catch (error) {
          raw = {}
        }
        unarchivedState.map = raw
      }
      return unarchivedState.map
    }
    function persistUnarchived() {
      if (unarchivedState.map === null) return
      try {
        window.localStorage.setItem(UNARCHIVED_KEY, JSON.stringify(unarchivedState.map))
      } catch (error) { /* ignore quota / privacy-mode errors */ }
    }
    function invalidateUnarchived() {
      unarchivedState.snapshot = { ...loadUnarchivedMap() }
      for (const listener of [...unarchivedState.listeners]) listener()
    }
    function getUnarchivedSnapshot() {
      if (unarchivedState.snapshot === null) unarchivedState.snapshot = { ...loadUnarchivedMap() }
      return unarchivedState.snapshot
    }
    function subscribeUnarchived(fn) {
      unarchivedState.listeners.add(fn)
      return () => unarchivedState.listeners.delete(fn)
    }
    function markUnarchived(id) {
      loadUnarchivedMap()[String(id)] = new Date().toISOString()
      persistUnarchived()
      invalidateUnarchived()
    }
    function clearUnarchived(id) {
      if (id in loadUnarchivedMap()) {
        delete loadUnarchivedMap()[id]
        persistUnarchived()
        invalidateUnarchived()
      }
    }
    const useUnarchived = () => react.useSyncExternalStore(subscribeUnarchived, getUnarchivedSnapshot, getUnarchivedSnapshot)

    // ── styles (theme variables, follows light/dark) ─────────────────────────
    const s = {
      panel: { display: 'flex', flexDirection: 'column', width: 'min(760px, calc(100vw - 48px))', minHeight: 'min(520px, 82vh)', maxHeight: '82vh', overflow: 'hidden', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 24, boxShadow: 'var(--dsw-shadow-lv3)', position: 'relative' },
      header: { flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: '18px 20px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1)' },
      headerRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
      title: { fontWeight: 600, fontSize: 15, color: 'var(--dsw-alias-label-primary)' },
      hint: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 },
      headerActions: { display: 'flex', gap: 8, flex: 'none' },
      count: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
      selectCount: { fontSize: 12, color: 'var(--dsw-alias-label-primary)', fontWeight: 600 },
      body: { flex: '1 1 0', minHeight: 0, padding: '8px 20px 20px', overflowY: 'auto' },
      group: { marginBottom: 16 },
      groupHead: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 2px 6px', borderBottom: '1px solid var(--dsw-alias-border-l1)', marginBottom: 8 },
      groupTitle: { fontWeight: 600, fontSize: 13.5, color: 'var(--dsw-alias-label-primary)' },
      groupPath: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      groupCount: { marginLeft: 'auto', fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)', flex: 'none' },
      btn: { appearance: 'none', boxSizing: 'border-box', minWidth: 72, height: 28, padding: '0 12px', border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)', borderRadius: 7, fontSize: 12.5, lineHeight: '26px', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
      btnDisabled: { opacity: 0.5, cursor: 'default' },
      btnDanger: { borderColor: 'var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)' },
      btnClose: { appearance: 'none', boxSizing: 'border-box', width: 28, minWidth: 28, height: 28, padding: 0, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-secondary)', borderRadius: 7, fontSize: 16, lineHeight: '26px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
      row: { border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-1)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 },
      rowSelectable: { cursor: 'pointer' },
      rowSelected: { borderColor: 'var(--dsw-alias-brand-primary)', background: 'var(--dsw-alias-bg-layer-2)' },
      rowMain: { display: 'flex', alignItems: 'center', gap: 10 },
      check: { width: 16, height: 16, flex: 'none', accentColor: 'var(--dsw-alias-brand-primary)' },
      titleText: { fontWeight: 600, fontSize: 13.5, wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', flex: '1 1 auto', minWidth: 0 },
      bookmark: { fontSize: 11, flex: 'none', color: 'var(--dsw-alias-state-warn-primary)', border: '1px solid var(--dsw-alias-state-warn-primary)', borderRadius: 7, padding: '0 6px' },
      meta: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)', wordBreak: 'break-all' },
      actions: { display: 'flex', gap: 8 },
      confirm: { fontSize: 12, padding: '4px 2px 2px', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--dsw-alias-label-primary)' },
      confirmRow: { display: 'flex', gap: 8 },
      transcript: { border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-base)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflow: 'auto' },
      docHead: { display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
      docRole: { fontWeight: 600 },
      docBody: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12.5, background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', borderRadius: 8, padding: '8px 10px', margin: 0 },
      error: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 12, whiteSpace: 'pre-wrap' },
      notice: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
      empty: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5, padding: '18px 4px' },
      confirmMask: { position: 'absolute', inset: 0, background: 'var(--dsw-alias-bg-mask-1)', backdropFilter: 'var(--dsw-mask-blur)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'auto' },
      confirmCard: { width: 'min(360px, calc(100% - 48px))', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 16, boxShadow: 'var(--dsw-shadow-lv3)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
      confirmTitle: { fontWeight: 600, fontSize: 15 },
      confirmBody: { fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)' },
      confirmActions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
      footer: { boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flex: 'none', width: 'calc(100% + 4px)', height: 42, margin: '4px -2px', padding: '0 10px 0 8px', border: 'none', borderRadius: 12, color: 'var(--dsw-alias-label-primary)', background: 'transparent', fontSize: 14, fontWeight: 400, cursor: 'pointer', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' },
      footerRail: { width: 36, height: 36, margin: '8px 0 10px', padding: 0, justifyContent: 'center', gap: 0, borderRadius: '50%' },
      footerActive: { background: 'var(--dsw-alias-interactive-bg-hover)' },
      footerLabel: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      footerBadge: { marginLeft: 'auto', fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 99, padding: '0 6px', flex: 'none' }
    }

    // ── localization ─────────────────────────────────────────────────────────
    function isEnglish(ctx) {
      try {
        const locale = ctx.get('locale')
        const id = locale === undefined ? '' : String(locale.getLocale().id ?? '')
        return id.toLowerCase().startsWith('en')
      } catch (error) {
        return false
      }
    }

    // ── remote api helper ────────────────────────────────────────────────────
    function makeApi(sessionArchive) {
      const unwrap = (result, fallback) => {
        if (result === undefined || result === null) throw new Error('远程调用返回为空')
        if (result.ok !== true) throw new Error(result.error?.message ?? fallback)
        return result.value
      }
      return {
        list: async () => unwrap(await sessionArchive.list(), '归档列表读取失败'),
        read: async (sessionId) => unwrap(await sessionArchive.read(sessionId), '会话内容读取失败'),
        remove: async (sessionId) => unwrap(await sessionArchive.delete(sessionId), '删除失败'),
        restore: async (sessionId) => unwrap(await sessionArchive.unarchive(sessionId), '取消归档失败')
      }
    }

    // ── components ───────────────────────────────────────────────────────────
    function roleOf(type, zh) {
      switch (type) {
        case 'user/message': return zh ? '用户' : 'User'
        case 'assistant/message': return zh ? '助手' : 'Assistant'
        case 'tool/call': return zh ? '工具调用' : 'Tool call'
        case 'tool/result': return zh ? '工具结果' : 'Tool result'
        case 'todo/write': return zh ? '待办事项' : 'Todos'
        case 'turn/end': return zh ? '回合结束' : 'Turn end'
        default: return type
      }
    }
    function roleColor(type) {
      if (type === 'user/message') return '#5da9e9'
      if (type === 'assistant/message') return '#7fc97f'
      return '#d8a657'
    }
    function formatTime(value) {
      if (value === undefined || value === null || value === '') return ''
      try {
        return new Date(value).toLocaleString()
      } catch (error) {
        return String(value)
      }
    }
    function archiveLabel(index, zh) {
      const at = typeof index === 'number' ? index + 1 : index
      return zh ? `第 ${at} 个归档` : `archive #${at}`
    }

    /**
     * Group archived items: by workspace (display order from Host), ungrouped
     * last; within a group, most recently archived first.
     */
    function groupItems(items, zh) {
      const groups = []
      const byKey = new Map()
      for (const item of items) {
        const key = item.workspace?.workspaceId ?? ''
        let group = byKey.get(key)
        if (group === undefined) {
          const order = typeof item.workspace?.order === 'number' ? item.workspace.order : Number.MAX_SAFE_INTEGER
          const title = item.workspace?.title ?? ''
          const path = item.workspace?.path ?? ''
          group = {
            key,
            title: title !== '' ? title : (path !== '' ? path : (zh ? '未分组' : 'Ungrouped')),
            path,
            order,
            items: []
          }
          byKey.set(key, group)
          groups.push(group)
        }
        group.items.push(item)
      }
      groups.sort((a, b) => a.order - b.order)
      for (const group of groups) group.items.sort((a, b) => ((b.archivedIndex ?? -1)) - ((a.archivedIndex ?? -1)))
      return groups
    }

    function ArchivePanel(props) {
      const zh = props.zh !== false
      const api = props.api
      const [version, setVersion] = react.useState(0)
      const [items, setItems] = react.useState(null)
      const [error, setError] = react.useState('')
      const [expanded, setExpanded] = react.useState(null)
      const [transcript, setTranscript] = react.useState(null)
      const [transcriptError, setTranscriptError] = react.useState('')
      const [confirmDelete, setConfirmDelete] = react.useState(null)
      const [busyId, setBusyId] = react.useState(null)
      const [notice, setNotice] = react.useState('')
      const [selecting, setSelecting] = react.useState(false)
      const [selected, setSelected] = react.useState(() => new Set())
      const [busyIds, setBusyIds] = react.useState(() => new Set())
      const [batchConfirm, setBatchConfirm] = react.useState(false)

      react.useEffect(() => {
        let cancelled = false
        const load = async () => {
          try {
            const value = await api.list()
            if (!cancelled) {
              setItems(value.items ?? [])
              setError('')
            }
          } catch (reason) {
            if (!cancelled) setError(String(reason === undefined || reason === null ? '未知错误' : (reason.message ?? reason)))
          }
        }
        load()
        return () => {
          cancelled = true
        }
      }, [version, api])

      const openTranscript = async (id) => {
        if (expanded === id) {
          setExpanded(null)
          setTranscript(null)
          return
        }
        setExpanded(id)
        setTranscript(null)
        setTranscriptError('')
        try {
          const value = await api.read(id)
          setTranscript(value)
        } catch (reason) {
          setTranscriptError(String(reason === undefined || reason === null ? '读取失败' : (reason.message ?? reason)))
        }
      }

      const remove = async (id) => {
        setBusyId(id)
        setNotice('')
        try {
          const value = await api.remove(id)
          setNotice(value.warning !== undefined && value.warning !== null && String(value.warning) !== '' ? String(value.warning) : (zh ? '会话已永久删除。' : 'Session permanently deleted.'))
          setConfirmDelete(null)
          if (expanded === id) {
            setExpanded(null)
            setTranscript(null)
          }
          setVersion((current) => current + 1)
        } catch (reason) {
          setNotice(String(reason === undefined || reason === null ? '删除失败' : (reason.message ?? reason)))
        } finally {
          setBusyId(null)
        }
      }

      const restore = async (id) => {
        setBusyId(id)
        setNotice('')
        try {
          const value = await api.restore(id)
          markUnarchived(id)
          setNotice(value.workspace?.title !== undefined && value.workspace.title !== ''
            ? (zh ? `已恢复到工作区「${value.workspace.title}」` : `Restored to workspace "${value.workspace.title}"`)
            : (zh ? '已取消归档。' : 'Restored.'))
          if (expanded === id) {
            setExpanded(null)
            setTranscript(null)
          }
          setVersion((current) => current + 1)
        } catch (reason) {
          setNotice(String(reason === undefined || reason === null ? '取消归档失败' : (reason.message ?? reason)))
        } finally {
          setBusyId(null)
        }
      }

      const toggleSelect = (id) => {
        setSelected((current) => {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }

      const removeSelected = async () => {
        const ids = [...selected]
        if (ids.length === 0) return
        setBusyIds(new Set(ids))
        setNotice('')
        const removed = []
        let lastWarning
        let failed
        for (const id of ids) {
          try {
            const value = await api.remove(id)
            removed.push(id)
            if (value?.warning !== undefined && value.warning !== null && String(value.warning) !== '') lastWarning = String(value.warning)
          } catch (reason) {
            failed = String(reason === undefined || reason === null ? '删除失败' : (reason.message ?? reason))
            break
          }
        }
        const gone = new Set(removed)
        if (gone.size > 0) {
          setItems((current) => (current ?? []).filter((item) => !gone.has(item.id)))
        }
        setBusyIds(new Set())
        setBatchConfirm(false)
        setSelected((current) => {
          const next = new Set()
          if (failed !== undefined) {
            for (const id of current) if (!gone.has(id)) next.add(id)
          }
          return next
        })
        if (failed !== undefined) {
          setNotice(failed)
        } else {
          setExpanded(null)
          setTranscript(null)
          setConfirmDelete(null)
          setNotice(lastWarning !== undefined ? lastWarning : (zh ? `已删除 ${removed.length} 个会话。` : `${removed.length} session(s) deleted.`))
        }
        setVersion((current) => current + 1)
      }

      react.useEffect(() => {
        if (items === null) return
        const ids = new Set(items.map((item) => item.id))
        setSelected((current) => {
          let changed = false
          const next = new Set()
          for (const id of current) {
            if (ids.has(id)) next.add(id)
            else changed = true
          }
          return changed ? next : current
        })
      }, [items])

      const exitSelection = () => {
        setSelecting(false)
        setSelected(new Set())
        setConfirmDelete(null)
        setNotice('')
      }

      const groups = items === null ? [] : groupItems(items, zh)
      const children = []
      const visibleIds = new Set((items ?? []).map((item) => item.id))
      const selectedCount = [...selected].filter((id) => visibleIds.has(id)).length

      // Fixed header: title + hint + actions. Only the body below scrolls.
      const headerChildren = []
      headerChildren.push(
        react.createElement('div', { style: s.title }, zh ? '归档会话' : 'Archived Sessions')
      )
      const actionButtons = []
      actionButtons.push(
        react.createElement('button', {
          key: 'refresh',
          style: s.btn,
          onClick: () => setVersion((current) => current + 1)
        }, zh ? '刷新' : 'Refresh')
      )
      if (selecting) {
        if (selectedCount > 0) {
          actionButtons.push(
            react.createElement('button', {
              key: 'delete-selected',
              style: { ...s.btn, ...s.btnDanger, ...(busyIds.size > 0 ? s.btnDisabled : {}) },
              disabled: busyIds.size > 0,
              onClick: () => setBatchConfirm(true)
            }, busyIds.size > 0 ? (zh ? '删除中…' : 'Deleting…') : (zh ? '删除' : 'Delete'))
          )
        } else {
          actionButtons.push(
            react.createElement('button', {
              key: 'done',
              style: s.btn,
              onClick: exitSelection
            }, zh ? '完成' : 'Done')
          )
        }
      } else {
        actionButtons.push(
          react.createElement('button', {
            key: 'select',
            style: s.btn,
            onClick: () => setSelecting(true)
          }, zh ? '选择' : 'Select')
        )
      }
      actionButtons.push(
        react.createElement('button', {
          key: 'close',
          type: 'button',
          style: s.btnClose,
          'aria-label': zh ? '关闭' : 'Close',
          onClick: () => setOverlayOpen(false)
        }, '×')
      )
      headerChildren.push(
        react.createElement('div', { style: s.headerActions }, actionButtons)
      )
      const header = react.createElement('div', { style: s.header },
        react.createElement('div', { style: s.headerRow },
          react.createElement('div', { style: { minWidth: 0 } }, headerChildren[0]),
          headerChildren[1]
        ),
        react.createElement('div', { style: s.hint }, zh ? '归档会话已从侧边栏隐藏。可在此查看完整对话内容或永久删除。' : 'Archived sessions are hidden from the sidebar. Read their full transcript or delete them permanently.'),
        react.createElement('div', { style: selecting ? s.selectCount : s.count },
          selecting
            ? (zh ? `已选 ${selectedCount} / ${items === null ? 0 : items.length}` : `${selectedCount} / ${items === null ? 0 : items.length} selected`)
            : (items === null ? '' : (zh ? `共 ${items.length} 个会话` : `${items.length} session(s)`))
        )
      )

      // Scrollable body.
      const bodyChildren = []
      if (notice !== '') bodyChildren.push(react.createElement('div', { style: s.notice }, notice))
      if (error !== '') bodyChildren.push(react.createElement('div', { style: s.error }, error))
      if (items === null) {
        bodyChildren.push(react.createElement('div', { style: s.empty }, zh ? '加载中…' : 'Loading…'))
      } else if (items.length === 0) {
        bodyChildren.push(react.createElement('div', { style: s.empty }, zh ? '当前没有归档的会话。' : 'No archived sessions.'))
      } else {
        for (const group of groups) {
          const groupChildren = []
          const groupHeadChildren = []
          groupHeadChildren.push(react.createElement('span', { key: 'title', style: s.groupTitle }, group.title))
          if (group.path !== '') groupHeadChildren.push(react.createElement('span', { key: 'path', style: s.groupPath }, group.path))
          groupHeadChildren.push(react.createElement('span', { key: 'count', style: s.groupCount }, zh ? `${group.items.length} 个` : `${group.items.length}`))
          groupChildren.push(react.createElement('div', { key: 'head', style: s.groupHead }, groupHeadChildren))
          for (const item of group.items) {
            const metaParts = []
            metaParts.push(archiveLabel(item.archivedIndex, zh))
            const timeText = formatTime(item.createdAt)
            if (timeText !== '') metaParts.push(timeText)
            if (item.missing === true) metaParts.push(zh ? '会话数据已不存在' : 'session data missing')
            const rowChildren = []
            if (selecting) {
              const isSelected = selected.has(item.id)
              rowChildren.push(
                react.createElement('div', { style: s.rowMain },
                  react.createElement('input', {
                    type: 'checkbox',
                    style: s.check,
                    checked: isSelected,
                    readOnly: true,
                    'aria-label': typeof item.title === 'string' && item.title !== '' ? item.title : item.id
                  }),
                  react.createElement('span', { style: s.titleText }, typeof item.title === 'string' && item.title !== '' ? item.title : (item.id.slice(0, 8) + '…')),
                  item.missing === true ? react.createElement('span', { style: s.bookmark }, zh ? '已丢失' : 'missing') : null
                ),
                react.createElement('div', { style: s.meta }, metaParts.join(' · ') || item.id)
              )
              if (busyIds.has(item.id)) rowChildren.push(react.createElement('div', { style: s.empty }, zh ? '删除中…' : 'Deleting…'))
            } else {
              if (item.missing === true) rowChildren.push(react.createElement('span', { key: 'bookmark', style: s.bookmark }, zh ? '已丢失' : 'missing'))
              if (confirmDelete === item.id) {
                rowChildren.push(react.createElement('div', { style: s.confirm },
                  react.createElement('div', null, item.missing === true ? (zh ? '确认清除这条归档记录？' : 'Remove this archive record?') : (zh ? '确认永久删除该会话？此操作不可恢复。' : 'Permanently delete this session? This cannot be undone.')),
                  react.createElement('div', { style: s.confirmRow },
                    react.createElement('button', { style: { ...s.btn, ...s.btnDanger, ...(busyId !== null ? s.btnDisabled : {}) }, disabled: busyId !== null, onClick: () => remove(item.id) }, zh ? '确认删除' : 'Delete'),
                    react.createElement('button', { style: { ...s.btn, ...(busyId !== null ? s.btnDisabled : {}) }, disabled: busyId !== null, onClick: () => setConfirmDelete(null) }, zh ? '取消' : 'Cancel')
                  )
                ))
              } else {
                const actionButtons = []
                if (item.missing !== true) actionButtons.push(react.createElement('button', { key: 'view', style: s.btn, onClick: () => openTranscript(item.id) }, expanded === item.id ? (zh ? '收起内容' : 'Hide transcript') : (zh ? '查看内容' : 'View')))
                if (item.missing !== true) actionButtons.push(react.createElement('button', { key: 'restore', style: { ...s.btn, ...(busyId !== null ? s.btnDisabled : {}) }, disabled: busyId !== null, onClick: () => restore(item.id) }, busyId === item.id ? '…' : (zh ? '取消归档' : 'Restore')))
                actionButtons.push(react.createElement('button', { key: 'del', style: { ...s.btn, ...s.btnDanger, ...(busyId !== null ? s.btnDisabled : {}) }, disabled: busyId !== null, onClick: () => setConfirmDelete(item.id) }, busyId === item.id ? '…' : (item.missing === true ? (zh ? '清理记录' : 'Remove record') : (zh ? '删除' : 'Delete'))))
                rowChildren.push(react.createElement('div', { style: s.actions }, actionButtons))
              }
              rowChildren.push(react.createElement('div', { style: { ...(item.missing === true ? {} : { paddingTop: 4 }) } },
                react.createElement('div', { style: s.meta }, metaParts.join(' · ') || item.id)
              ))
            }
            if (expanded === item.id && item.missing !== true && !selecting) {
              if (transcriptError !== '') rowChildren.push(react.createElement('div', { style: s.error }, transcriptError))
              else if (transcript === null) rowChildren.push(react.createElement('div', { style: s.empty }, zh ? '正在读取内容…' : 'Loading transcript…'))
              else {
                const docs = Array.isArray(transcript.docs) ? transcript.docs : []
                const docNodes = docs.map((doc) => react.createElement('div', { key: doc.seq },
                  react.createElement('div', { style: s.docHead },
                    react.createElement('span', { style: { ...s.docRole, color: roleColor(doc.type) } }, roleOf(doc.type, zh)),
                    react.createElement('span', null, formatTime(doc.time))
                  ),
                  react.createElement('pre', { style: s.docBody }, doc.text)
                ))
                if (transcript.truncated === true) docNodes.push(react.createElement('div', { key: 'truncated', style: s.empty }, zh ? '内容过长，仅显示前 2000 条。' : 'Transcript truncated to the first 2000 entries.'))
                rowChildren.push(react.createElement('div', { style: s.transcript }, docNodes))
              }
            }
            groupChildren.push(react.createElement('div', {
              key: item.id,
              style: { ...s.row, ...(selecting ? s.rowSelectable : {}), ...(selecting && selected.has(item.id) ? s.rowSelected : {}) },
              onClick: selecting ? () => toggleSelect(item.id) : undefined
            }, rowChildren))
          }
          bodyChildren.push(react.createElement('div', { key: group.key, style: s.group }, groupChildren))
        }
      }
      const body = react.createElement('div', { style: s.body }, bodyChildren)

      void children

      const confirmDialog = batchConfirm === false ? null : react.createElement('div', { style: s.confirmMask, onClick: (event) => event.stopPropagation() },
        react.createElement('div', { style: s.confirmCard },
          react.createElement('div', { style: s.confirmTitle }, zh ? '确认删除' : 'Confirm delete'),
          react.createElement('div', { style: s.confirmBody }, zh
            ? `将永久删除已选的 ${selectedCount} 个会话，包括对话日志。此操作不可恢复。`
            : `Permanently delete ${selectedCount} selected session(s), including their logs. This cannot be undone.`),
          react.createElement('div', { style: s.confirmActions },
            react.createElement('button', {
              style: { ...s.btn, ...(busyIds.size > 0 ? s.btnDisabled : {}) },
              disabled: busyIds.size > 0,
              onClick: () => setBatchConfirm(false)
            }, zh ? '取消' : 'Cancel'),
            react.createElement('button', {
              style: { ...s.btn, ...s.btnDanger, ...(busyIds.size > 0 ? s.btnDisabled : {}) },
              disabled: busyIds.size > 0,
              onClick: removeSelected
            }, busyIds.size > 0 ? (zh ? '删除中…' : 'Deleting…') : (zh ? '确认删除' : 'Delete'))
          )
        )
      )

      return react.createElement('div', { style: s.panel },
        header,
        body,
        confirmDialog
      )
    }

    // ── recently-unarchived marker ───────────────────────────────────────────
    // 方案 A: an 8px brand dot anchored on the sidebar row's right side, cleared
    // when the session is opened. If a row cannot be located (rail mode, list not
    // ready, or a missed DOM match) it degrades to 方案 B: a footer "Restored · N"
    // badge. Both share the same recentlyUnarchived store.
    function sessionTitleById(snapshot, id) {
      if (snapshot === undefined || snapshot === null) return ''
      const byId = snapshot.byId
      if (byId === undefined || byId === null) return ''
      const entry = byId[id]
      return entry === undefined || entry === null || typeof entry.title !== 'string' ? '' : entry.title
    }
    function findSessionRow(title) {
      const trimmed = title.trim()
      if (trimmed === '') return null
      const rows = document.querySelectorAll('[role="treeitem"]')
      for (const row of rows) {
        const spans = row.querySelectorAll('span')
        for (const span of spans) {
          if (span.textContent !== null && span.textContent.trim() === trimmed) return row
        }
      }
      return null
    }

    function RecentlyUnarchivedMarkers(props) {
      const zh = props.zh !== false
      const wide = props.wide === true
      const useSessions = props.useSessions !== undefined ? props.useSessions : function () { return undefined }
      const useWorkspaces = props.useWorkspaces !== undefined ? props.useWorkspaces : function () { return undefined }
      const pending = useUnarchived()
      const sessionSnapshot = useSessions((state) => state)
      const currentId = useSessions((state) => (state === undefined || state === null ? undefined : state.current))
      const archived = useWorkspaces((state) => (state !== undefined && Array.isArray(state.archivedSessionIds) ? state.archivedSessionIds : []))
      const [locateTick, setLocateTick] = react.useState(0)
      const [located, setLocated] = react.useState(null)
      const retryRef = react.useRef(0)
      const pendingIds = Object.keys(pending)

      // Clear the marker as soon as the user opens the session.
      react.useEffect(() => {
        if (currentId === undefined || currentId === null) return
        const id = String(currentId)
        if (id in loadUnarchivedMap()) clearUnarchived(id)
      }, [currentId])

      // Prune stale entries: re-archived, no longer known, or past the TTL.
      react.useEffect(() => {
        const map = loadUnarchivedMap()
        const ids = Object.keys(map)
        if (ids.length === 0) return
        const now = Date.now()
        const archivedSet = new Set((archived || []).map(String))
        const byId = sessionSnapshot?.byId
        const known = new Set()
        if (byId !== undefined && byId !== null) {
          for (const key of Object.keys(byId)) known.add(String(key))
          if (Object.keys(byId).length === 0) known.clear()
        }
        let changed = false
        for (const id of ids) {
          const ts = Date.parse(String(map[id]))
          const expired = Number.isFinite(ts) && (now - ts) > UNARCHIVED_TTL
          const reArchived = archivedSet.has(id)
          const gone = known.size > 0 && !known.has(id)
          if (expired || reArchived || gone) {
            delete map[id]
            changed = true
          }
        }
        if (changed) { persistUnarchived(); invalidateUnarchived() }
      }, [archived, sessionSnapshot])

      // Re-locate on scroll / resize (row positions are read at render time).
      react.useEffect(() => {
        if (!wide) return
        let cancelled = false
        let raf = 0
        const schedule = () => {
          if (cancelled) return
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(() => {
            if (!cancelled) setLocateTick((t) => t + 1)
          })
        }
        window.addEventListener('scroll', schedule, true)
        window.addEventListener('resize', schedule)
        return () => {
          cancelled = true
          cancelAnimationFrame(raf)
          window.removeEventListener('scroll', schedule, true)
          window.removeEventListener('resize', schedule)
        }
      }, [wide])

      // Locate rows for each pending session. In rail mode or before the session
      // list is ready, leave everything to the badge fallback. After unarchive the
      // row re-derives from the workspace archive set, so we re-run on `archived`
      // and retry with a bounded timer until every pending row is located.
      react.useEffect(() => {
        if (pendingIds.length === 0) { setLocated(null); retryRef.current = 0; return }
        if (!wide) { setLocated({ done: [], missed: pendingIds }); return }
        const byId = sessionSnapshot?.byId
        const ready = byId !== undefined && byId !== null && Object.keys(byId).length > 0
        if (!ready) { setLocated(null); retryRef.current = 0; return }
        const done = []
        const missed = []
        for (const id of pendingIds) {
          const title = sessionTitleById(sessionSnapshot, id)
          if (title === '') { missed.push(id); continue }
          const row = findSessionRow(title)
          if (row !== null) done.push({ id, row })
          else missed.push(id)
        }
        setLocated({ done, missed })
        if (missed.length > 0 && retryRef.current < 40) {
          retryRef.current += 1
          const timer = window.setTimeout(() => setLocateTick((t) => t + 1), 600)
          return () => window.clearTimeout(timer)
        }
        retryRef.current = 0
      }, [wide, pending, sessionSnapshot, archived, locateTick])

      const dotNodes = (located === null ? [] : located.done).map(({ id, row }) => {
        let rect
        try { rect = row.getBoundingClientRect() } catch (error) { rect = null }
        if (rect === null || rect.width === 0) return null
        return react.createElement('span', {
          key: id,
          style: {
            position: 'fixed',
            left: rect.right - 14,
            top: rect.top + rect.height / 2 - 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--dsw-alias-brand-primary)',
            boxShadow: 'var(--dsw-shadow-lv1)',
            zIndex: 900,
            pointerEvents: 'none'
          },
          title: zh ? '刚取消归档（点击会话后消失）' : 'Recently restored (clears when opened)',
          'aria-hidden': true
        })
      }).filter((node) => node !== null)

      const missedIds = located === null || located.missed === undefined ? [] : located.missed
      const badge = missedIds.length > 0 ? react.createElement('span', {
        key: 'missed-badge',
        style: {
          position: 'fixed',
          left: 10,
          bottom: 64,
          padding: '3px 10px',
          fontSize: 11.5,
          lineHeight: '16px',
          color: 'var(--dsw-alias-state-warn-primary)',
          border: '1px solid var(--dsw-alias-state-warn-primary)',
          borderRadius: 99,
          background: 'var(--dsw-alias-bg-layer-2)',
          boxShadow: 'var(--dsw-shadow-lv2)',
          zIndex: 900,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        },
        title: missedIds.map((id) => sessionTitleById(sessionSnapshot, id) || id).join('\n'),
        'aria-hidden': true
      }, zh ? `刚取消归档 · ${missedIds.length}` : `Restored · ${missedIds.length}`) : null

      if (dotNodes.length === 0 && badge === null) return null
      return react.createElement(react.Fragment, null, dotNodes, badge)
    }

    function FooterAction(props) {
      const open = useOverlayOpen()
      const [hover, setHover] = react.useState(false)
      const useWorkspaces = props.useWorkspaces !== undefined ? props.useWorkspaces : function () { return 0 }
      const count = useWorkspaces((state) => (state !== undefined && Array.isArray(state.archivedSessionIds) ? state.archivedSessionIds.length : 0))
      const wide = props.wide === true
      const zh = props.zh !== false
      const label = zh ? '归档会话' : 'Archived Sessions'
      const button = react.createElement('button', {
        type: 'button',
        className: 'dshArchiveLauncher',
        style: { ...s.footer, ...(wide ? {} : s.footerRail), ...(open ? s.footerActive : {}), ...(hover ? s.footerActive : {}) },
        onClick: () => setOverlayOpen(!open),
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        title: label,
        'aria-label': label
      },
        react.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, flex: 'none' },
          react.createElement('rect', { x: 3, y: 4, width: 18, height: 5, rx: 1 }),
          react.createElement('path', { d: 'M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9' }),
          react.createElement('path', { d: 'M10 13h4' })
        ),
        wide ? react.createElement('span', { style: s.footerLabel }, label) : null,
        wide && count > 0 ? react.createElement('span', { style: s.footerBadge }, String(count)) : null
      )
      return react.createElement(react.Fragment, null,
        button,
        react.createElement(RecentlyUnarchivedMarkers, { zh, wide, useSessions: props.useSessions, useWorkspaces: props.useWorkspaces })
      )
    }

    function OverlayHost(props) {
      const open = useOverlayOpen()
      if (!open) return null
      return react.createElement('div', { style: { position: 'fixed', inset: 0, background: 'var(--dsw-alias-bg-mask-1)', backdropFilter: 'var(--dsw-mask-blur)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', zIndex: 1000 }, onClick: () => setOverlayOpen(false) },
        react.createElement('div', { onClick: (event) => event.stopPropagation() },
          react.createElement(ArchivePanel, { ...props, api: props.api, zh: props.zh })
        )
      )
    }

    // ── plugin ───────────────────────────────────────────────────────────────
    function installFooterStackStyles() {
      if (typeof document === 'undefined') return () => {}
      const id = 'dsh-plugin-session-archive-footer-stack'
      const existing = document.getElementById(id)
      if (existing !== null) return () => { existing.remove() }
      const tag = document.createElement('style')
      tag.id = id
      tag.dataset.plugin = 'dsh-plugin-session-archive'
      tag.textContent = [
        '[class*="_footerActions"]{flex-direction:column;align-items:stretch;}',
        '[class*="_collapsed"] [class*="_footerActions"]{align-items:center;}',
        '.dshArchiveLauncher:hover{background:var(--dsw-alias-interactive-bg-hover);}'
      ].join('')
      document.head.appendChild(tag)
      return () => { tag.remove() }
    }

    const inject = ['remote', 'slots']
    async function apply(ctx) {
      const remote = ctx.get('remote')
      const slots = ctx.get('slots')
      if (remote === undefined) throw new Error('session-archive: remote service is unavailable')
      if (slots === undefined) throw new Error('session-archive: slots service is unavailable')
      await remote.$mount({ package: PACKAGE, descriptors })
      const sessionArchive = ctx.get('remote.sessionArchive')
      if (sessionArchive === undefined) throw new Error('session-archive: remote.sessionArchive 未挂载')
      const api = makeApi(sessionArchive)
      const zh = !isEnglish(ctx)

      ctx.effect(() => installFooterStackStyles(), 'session-archive: footer stack')

      slots.inject('sidebar.footer.action', () => slots.register(
        { name: 'sidebar.footer.action', id: 'session-archive', order: 20, label: zh ? '归档会话' : 'Archived Sessions' },
        (props) => react.createElement(FooterAction, { ...props, zh })
      ))

      slots.inject('shell.overlay', () => slots.register(
        { name: 'shell.overlay', id: 'session-archive-overlay', order: 30 },
        (props) => react.createElement(OverlayHost, { ...props, api, zh })
      ))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
