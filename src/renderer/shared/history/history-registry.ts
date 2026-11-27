import { createHistoryStack } from './history-stack'
import { type HistoryStack, type HistoryStackOptions } from './history-stack-contract'
import {
  freezeHistoryScope,
  sameHistoryScope,
  type HistoryDomain,
  type HistoryScope,
  type HistoryUnit
} from './history-types'

interface ScopeNode {
  entry?: RegistryEntry
  /** 同一 workspace/domain/scopeId 已开放过的 generation；dispose 不遗忘，reset 清空。 */
  usedGenerations: Set<HistoryScope['sessionGeneration']>
  children: Map<string, ScopeNode>
}
interface RegistryEntry {
  scope: HistoryScope
  stack: HistoryStack<unknown> & { invalidate(): void }
}

export interface HistoryRegistry {
  open<C>(scope: HistoryScope, options: HistoryStackOptions): HistoryStack<C>
  lookup<C>(scope: HistoryScope): HistoryStack<C> | undefined
  admit(scope: HistoryScope): boolean
  dispose(scope: HistoryScope): void
  reset(workspaceId: string): void
  subscribe<C>(scope: HistoryScope, listener: (event?: HistoryUnit<C>) => void): () => void
}

export function createHistoryRegistry(): HistoryRegistry {
  /** workspace → domain → scopeId 段树；无字符串拼接键，段树本身承载完整身份。 */
  const workspaces = new Map<string, Map<HistoryDomain, ScopeNode>>()
  const emptyNode = (): ScopeNode => ({ usedGenerations: new Set(), children: new Map() })

  function readNode(scope: HistoryScope): ScopeNode | undefined {
    const domains = workspaces.get(scope.workspaceId)
    const domainRoot = domains?.get(scope.domain)
    if (domainRoot === undefined) return undefined
    let node: ScopeNode = domainRoot
    for (const part of scope.scopeId) {
      const next = node.children.get(part)
      if (next === undefined) return undefined
      node = next
    }
    return node
  }

  function writeNode(scope: HistoryScope): ScopeNode {
    let domains = workspaces.get(scope.workspaceId)
    if (domains === undefined) {
      domains = new Map()
      workspaces.set(scope.workspaceId, domains)
    }
    let domainRoot = domains.get(scope.domain)
    if (domainRoot === undefined) {
      domainRoot = emptyNode()
      domains.set(scope.domain, domainRoot)
    }
    let node = domainRoot
    for (const part of scope.scopeId) {
      let next = node.children.get(part)
      if (next === undefined) {
        next = emptyNode()
        node.children.set(part, next)
      }
      node = next
    }
    return node
  }

  function lookupStack<C>(scope: HistoryScope): HistoryStack<C> | undefined {
    const node = readNode(scope)
    return node?.entry !== undefined && sameHistoryScope(node.entry.scope, scope) ? node.entry.stack as HistoryStack<C> : undefined
  }

  return {
    open<C>(scope: HistoryScope, options: HistoryStackOptions): HistoryStack<C> {
      const node = writeNode(scope)
      if (node.entry !== undefined) {
        if (sameHistoryScope(node.entry.scope, scope)) return node.entry.stack as HistoryStack<C>
        throw new Error('同键历史 scope 未关闭，不能直接换代')
      }
      if (node.usedGenerations.has(scope.sessionGeneration)) {
        throw new Error('同键历史 generation 已用过，重开必须换代')
      }
      const stack = createHistoryStack<C>(scope, options)
      const capturedScope = freezeHistoryScope(scope)
      node.usedGenerations.add(scope.sessionGeneration)
      node.entry = { scope: capturedScope, stack }
      return stack
    },
    lookup: lookupStack,
    admit(scope) {
      return lookupStack(scope) !== undefined
    },
    dispose(scope) {
      const node = readNode(scope)
      if (node?.entry !== undefined && sameHistoryScope(node.entry.scope, scope)) {
        node.entry.stack.invalidate()
        node.entry = undefined
      }
    },
    reset(workspaceId) {
      const domains = workspaces.get(workspaceId)
      const invalidateNode = (node: ScopeNode): void => {
        if (node.entry !== undefined) node.entry.stack.invalidate()
        for (const child of node.children.values()) invalidateNode(child)
      }
      for (const domainRoot of domains?.values() ?? []) {
        if (domainRoot.entry !== undefined) domainRoot.entry.stack.invalidate()
        for (const child of domainRoot.children.values()) invalidateNode(child)
      }
      workspaces.delete(workspaceId)
    },
    subscribe<C>(scope: HistoryScope, listener: (event?: HistoryUnit<C>) => void): () => void {
      const stack = lookupStack<C>(scope)
      return stack?.subscribe(() => listener()) ?? (() => undefined)
    }
  }
}
