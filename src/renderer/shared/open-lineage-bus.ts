/**
 * "在脉络图中打开"跨页事件总线（infra，F-UIRES-01 批 A R7/P-8；open-paper-bus
 * 同型先例——跨域 window CustomEvent，零 store 互引）。
 *
 * 链路：FolderNav 右键「在脉络图中打开」→ ①setQuery({folderScope:{kind:
 * 'folder',folderId}})（脉络页缺省图=库页 folderScope 既有跨域只读消费面——
 * library.store 头注接缝锚）②requestOpenLineage()（window 广播）→ App 监听
 * 切到脉络视图 → LineagePage 挂载读 query.folderScope 定位该文件夹图。
 * 无闩锁需求：脉络页消费的是 store 现值（非事件载荷），事件只管切视图。
 */
export const OPEN_LINEAGE_EVENT = 'synapse:open-lineage'

/** 请求切到脉络视图（缺省图=当前库页 folderScope——数据面零载荷） */
export function requestOpenLineage(): void {
  window.dispatchEvent(new CustomEvent(OPEN_LINEAGE_EVENT))
}
