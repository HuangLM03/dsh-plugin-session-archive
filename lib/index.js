import { rm } from 'node:fs/promises'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

const PACKAGE = 'dsh-plugin-session-archive'
const asId = (value) => String(value)
const pass = (value) => value
const jsonCodec = { mode: 'strict', typeSymbol: `${PACKAGE}#JsonValue`, schema: { parse: pass } }
const idCodec = { mode: 'strict', typeSymbol: `${PACKAGE}#SessionId`, schema: { parse: pass } }

/** Remote descriptors shared verbatim with the client half ($mount). */
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
  }
]

const errorText = (reason) => (reason === undefined || reason === null ? 'unknown error' : reason instanceof Error ? reason.message : String(reason))
const isoTime = (value) => (typeof value === 'number' && Number.isFinite(value) ? new Date(value).toISOString() : undefined)
const parentDir = (path) => {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at <= 0 ? path : path.slice(0, at)
}

class SessionArchiveService extends TypertRemoteService {
  static inject = ['typert', 'workspaceRegistry', 'storageDomain']

  constructor(ctx) {
    super(ctx, 'sessionArchive')
    ctx.effect(() => ctx.typert.register({
      package: PACKAGE,
      face: 'host',
      schemas: [],
      invocations: descriptors
    }), 'session-archive: typert contribution')
  }

  /** Live archive set: always the registry in-memory state (same object archiveSession writes). */
  archivedIds() {
    return (this.ctx.workspaceRegistry.archivedSessionIds ?? []).map(asId)
  }

  async list() {
    const query = this.ctx.get('sessionQuery')
    const persistence = this.ctx.get('sessionPersistence')
    const ids = this.archivedIds()
    const headersById = new Map()
    if (persistence !== undefined) {
      try {
        for (const header of await persistence.list()) headersById.set(asId(header.id), header)
      } catch (error) {
        console.error('session-archive: persistence listing failed:', errorText(error))
      }
    }

    // Workspace accounting: sessionId -> workspace record, in workspaceIds order.
    const wsDomain = this.ctx.get('storageDomain')?.get('workspace')
    const wsOrder = []
    const wsBySession = new Map()
    try {
      const state = wsDomain?.global.get()
      const ordered = (Array.isArray(state?.workspaceIds) ? state.workspaceIds : []).map(asId)
      if (wsDomain !== undefined) {
        const records = new Map()
        for (const [workspaceId, record] of wsDomain.table('workspaces').entries()) {
          records.set(asId(workspaceId), { workspaceId: asId(workspaceId), ...record })
        }
        for (const workspaceId of ordered) if (records.has(workspaceId)) wsOrder.push(records.get(workspaceId))
        for (const record of records.values()) if (!wsOrder.includes(record)) wsOrder.push(record)
        for (const record of wsOrder) {
          for (const sessionId of Array.isArray(record.sessionIds) ? record.sessionIds : []) {
            const key = asId(sessionId)
            if (!wsBySession.has(key)) wsBySession.set(key, record)
          }
        }
      }
    } catch (error) {
      console.error('session-archive: workspace mapping read failed:', errorText(error))
    }

    const observations = query === undefined ? [] : await query.readTitleSnapshots(ids)
    const byId = new Map()
    for (const result of observations) {
      if (result === undefined || result === null || result.status !== 'fulfilled') continue
      byId.set(asId(result.sessionId), result.value)
    }
    const items = []
    for (const [index, id] of ids.entries()) {
      const observation = byId.get(id)
      const source = observation?.session ?? headersById.get(id)
      const title = observation?.title?.title
      const record = wsBySession.get(id)
      items.push({
        id,
        title: typeof title === 'string' && title !== '' ? title : undefined,
        cwd: typeof source?.cwd === 'string' ? source.cwd : undefined,
        createdAt: source === undefined ? undefined : isoTime(source.createdAt),
        agentPreset: typeof source?.agentPreset === 'string' ? source.agentPreset : undefined,
        missing: source === undefined,
        archivedIndex: index,
        workspace: record === undefined ? undefined : {
          workspaceId: String(record.workspaceId ?? ''),
          title: typeof record.title === 'string' && record.title !== '' ? record.title : undefined,
          path: typeof record.path === 'string' ? record.path : undefined,
          order: wsOrder.indexOf(record)
        }
      })
    }
    return { items }
  }

  async read(sessionId) {
    const id = asId(sessionId)
    const query = this.ctx.get('sessionQuery')
    if (query === undefined) throw new Error('session-query 服务不可用，无法读取会话内容')
    const docs = (await query.filterEvents(id, [])).map((doc) => ({
      seq: doc.seq,
      type: doc.type,
      time: isoTime(doc.time),
      surface: doc.surface,
      text: String(doc.text ?? '').slice(0, 20000)
    }))
    const limit = 2000
    const truncated = docs.length > limit
    let title
    try {
      const observation = await query.readTitleSnapshot(id)
      const value = observation?.title?.title
      if (typeof value === 'string' && value !== '') title = value
    } catch (error) {
      console.error('session-archive: title fold failed:', errorText(error))
    }
    return { id, title, docs: docs.slice(0, limit), truncated }
  }

  async delete(sessionId) {
    const id = asId(sessionId)
    const registry = this.ctx.workspaceRegistry
    const archivedList = (registry.archivedSessionIds ?? []).map(asId)
    if (!archivedList.includes(id)) throw new Error(`会话 ${id} 不在归档列表中`)

    const persistence = this.ctx.get('sessionPersistence')
    let logPath
    if (persistence !== undefined) {
      try {
        const header = (await persistence.list()).find((candidate) => asId(candidate.id) === id)
        if (header !== undefined) {
          const location = persistence.locate(header)
          if (location !== undefined && typeof location.path === 'string') logPath = String(location.path)
        }
      } catch (error) {
        console.error('session-archive: locate log failed:', errorText(error))
      }
    }

    await registry.enqueueOperation(async () => {
      const current = registry.requireState()
      await registry.setState({
        ...current,
        archivedSessionIds: current.archivedSessionIds.filter((entry) => asId(entry) !== id)
      })
    })

    const workspaceDomain = this.ctx.storageDomain.get('workspace')
    if (workspaceDomain !== undefined) {
      for (const [workspaceId, record] of workspaceDomain.table('workspaces').entries()) {
        if (!Array.isArray(record.sessionIds) || !record.sessionIds.map(asId).includes(id)) continue
        await workspaceDomain.table('workspaces').update(workspaceId, (current) => ({
          ...current,
          sessionIds: current.sessionIds.filter((entry) => asId(entry) !== id),
          updatedAt: new Date().toISOString()
        }))
      }
    }
    const cache = this.ctx.storageDomain.get('session_projcache')
    if (cache !== undefined) {
      try {
        await cache.table('sessions').delete(id)
      } catch (error) {
        console.error('session-archive: projection cache cleanup skipped:', errorText(error))
      }
    }

    let diskRemoved = false
    let warning
    if (logPath !== undefined) {
      try {
        await rm(parentDir(logPath), { recursive: true, force: true })
        diskRemoved = true
      } catch (error) {
        warning = `磁盘日志删除失败：${errorText(error)}`
      }
    } else {
      diskRemoved = true
    }
    return { ok: true, id, diskRemoved, warning }
  }
}

export default SessionArchiveService
