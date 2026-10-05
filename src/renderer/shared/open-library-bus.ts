/**
 * "去文献库"跨页事件总线（infra，F-UIRES-03 C3 卡面两钮——v1.7 用户裁决；
 * open-lineage-bus 同型先例——跨域 window CustomEvent，零 store 互引）。
 *
 * 链路：脉络卡面「去文献库」钮 → ①library.store.setQuery({folderScope:{
 * kind:'folder',folderId}})（先置数——所在文件夹过滤；lineage 侧写面接缝
 * 锚=library.store 头注）②selectPaper(paperId)（选中态——主题节点缺省）
 * ③requestOpenLibrary()（后广播——事件只管切视图，数据面零载荷）→
 * App 监听切到文献库视图 → LibraryPage 挂载消费 store 现值。
 * 无闩锁需求：文献库消费的是 store 现值（非事件载荷）——open-lineage-bus
 * 同型（FolderNav→lineage 先例：先置数后广播同序）。
 */
export const OPEN_LIBRARY_EVENT = 'synapse:open-library'

/** 请求切到文献库视图（缺省过滤/选中=当前 library.store 现值——数据面零载荷） */
export function requestOpenLibrary(): void {
  window.dispatchEvent(new CustomEvent(OPEN_LIBRARY_EVENT))
}
