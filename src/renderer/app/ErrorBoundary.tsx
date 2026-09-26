/**
 * 全局渲染错误边界（infra，无工单）——[T3-P1] 拆自 App.tsx（组件 250 行防线，
 * App.tsx 主题接线 +7 行压线触发 max-lines，边界=独立职责本就该拆件）。
 * 行为零迁移：出错卡片文案/重试 remount 语义原样（key=retry 强制重挂载——
 * 出错组件带旧状态重渲染大概率立刻再抛同一错误）。
 */
import { Component, type ErrorInfo, type ReactNode, Fragment } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null; retry: number }
> {
  override state = { message: null as string | null, retry: 0 }

  static getDerivedStateFromError(error: Error): { message: string } {
    return { message: error.message }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[App] 渲染错误', error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--danger)' }}>
            <p className="mb-2 font-medium">页面出现错误</p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {this.state.message}
            </p>
            <button
              className="mt-3 rounded px-3 py-1 text-xs text-white"
              style={{ background: 'var(--accent)' }}
              // 重试 = 清错误 + 递增 retry 作子树 key 强制重挂载：出错组件带着旧状态
              // 重渲染大概率立刻再抛同一错误，remount 才是真正的"重试"
              onClick={() => this.setState((s) => ({ message: null, retry: s.retry + 1 }))}
            >
              重试
            </button>
          </div>
        </div>
      )
    }
    return <Fragment key={this.state.retry}>{this.props.children}</Fragment>
  }
}
