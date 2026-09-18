/**
 * [P7E-03] useReaderSearch —— 页内搜索装配 hook（ReaderPage 组合根接线）。
 *
 * ── 行为层 ──
 * - ① 换文档/换 tab 清面板（INV-55）：fileUrl 键效应→searchStore.bindDoc——
 *   会话身份记账入 store（[门一 W1]：变化即代际失效+全清+记录；不变=no-op，
 *   同文档重挂不清=身份未变，语义明示；实例级 ref 会在重挂后首跑跳过、令
 *   上一篇 done 会话复活到新文档——已修）。
 * - ② Ctrl+F：独立 keymap id 'reader-search'（registerKeymap/unregisterKeymap
 *   成对——INV-14；**不经 ReaderShortcuts 绑定表**，其受锁测试面零改）→
 *   searchStore.open()。editable 避让由 keymap 层承担；焦点已驻输入框时的
 *   Ctrl+F 由 ReaderSearchBox 本地等价路径覆盖（该文件头注）。
 * - ③ 翻页联动接线：registerPageTurner——目标匹配页≠当前可见页（tab.page）
 *   时 reader.store.setPage(page,{scroll:'to'})（INV-29 程序滚动通道，页盒
 *   顶入视口；页内居中归 SearchHighlightLayer 第二段）。
 * - ④ 订阅 store 产 <ReaderSearchBox> 受控节点返回（ReaderToolbar slot 消费）。
 *
 * ── 接口层 ──
 * - export function useReaderSearch(pdfDoc: unknown, fileUrl: string): ReactNode
 *
 * ── 架构层 ──
 * - reader-search.store 与 reader.store 零互相 import（联动经本装配面注入
 *   回调——可测性=CorpusExtractor deps 注入同型）；pdfDoc 保持 unknown 传入
 *   （结构收窄归 reader-search.asSearchDoc）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 三个 effect 均注册/注销成对（keymap/pageTurner）；fileUrl 键效应纯重置
 */
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { registerKeymap, unregisterKeymap } from '../../../shared/keymap'
import { readActiveTab } from '../state/useActiveTab'
import { useReaderStore } from '../state/reader.store'
import { ReaderSearchBox } from './ReaderSearchBox'
import { useReaderSearchStore } from './reader-search.store'

/** 本 hook 在 keymap 的注册 id（唯一来源，卸载成对注销——INV-14） */
const KEYMAP_ID = 'reader-search'

export function useReaderSearch(pdfDoc: unknown, fileUrl: string): ReactNode {
  // ① fileUrl 变化（换文档/换 tab）→ 搜索会话全清（INV-55——bindDoc 记账
  //    入 store：重挂不丢；同 fileUrl no-op 不清）
  useEffect(() => {
    useReaderSearchStore.getState().bindDoc(fileUrl)
  }, [fileUrl])

  // ② Ctrl+F → open()（S1/S12：再按=focusSeq++ 重聚焦全选，不重搜）
  useEffect(() => {
    registerKeymap(KEYMAP_ID, [
      {
        key: 'f',
        ctrl: true,
        preventDefault: true,
        handler: () => {
          useReaderSearchStore.getState().open()
        }
      }
    ])
    return () => {
      unregisterKeymap(KEYMAP_ID)
    }
  }, [])

  // ③ 翻页联动：目标匹配页≠当前可见页 → setPage 程序滚动（INV-29）
  useEffect(() => {
    useReaderSearchStore.getState().registerPageTurner((page) => {
      const t = readActiveTab()
      if (t !== undefined && t.page !== page) {
        useReaderStore.getState().setPage(page, { scroll: 'to' })
      }
    })
    return () => {
      useReaderSearchStore.getState().registerPageTurner(null)
    }
  }, [])

  // ④ 受控节点（idle 态组件自隐——slot 恒收元素，缺席兜底归测试夹具路径）
  const search = useReaderSearchStore()
  return (
    <ReaderSearchBox
      state={search.state}
      query={search.query}
      lastSubmitted={search.lastSubmitted}
      matchCount={search.matches.length}
      activeIndex={search.activeIndex}
      focusSeq={search.focusSeq}
      onQueryChange={(q) => {
        useReaderSearchStore.getState().setQuery(q)
      }}
      onSubmit={(q) => {
        void useReaderSearchStore.getState().submit(pdfDoc, q)
      }}
      onPrev={() => {
        useReaderSearchStore.getState().prev()
      }}
      onNext={() => {
        useReaderSearchStore.getState().next()
      }}
      onClose={() => {
        useReaderSearchStore.getState().close()
      }}
    />
  )
}
