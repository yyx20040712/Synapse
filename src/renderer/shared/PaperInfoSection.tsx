/**
 * [F-UIRES-04 批 3b] PaperInfoSection —— 论文信息区纯展示件（设计书 §4.7
 * D6 四件：作者/摘要/图片 strip/机构禁用位；v1.1 props 数据注入——取数归
 * 各宿主连接件，本件零取数零订阅）。
 *
 * ── 行为层 ──
 * - 作者=全量折行 clamp 2 行+悬浮 title 全量（空数组整块省略）；摘要=clamp
 *   6 行+展开/收起（M3 本地态零持久化；空串整块省略）；机构=禁用呈现位
 *   「机构信息待数据库升级后开放」+title 提示（呈裁 A(c)——库无字段，星标
 *   P-11 禁用呈现先例同款）。
 * - strip=横向滚动缩略图（dataURL）；点击放大/跳页交互不属本批（后续票
 *   候选）。降级面（I4/I8）：images 缺席或 extracting→整条省略（缺席=借出
 *   弃置瞬态兜底 C2-②，非 error 面）；error（含 stale——C2-④ 与 error 同
 *   面）→省略+重试微钮：组件内直调 retryPaperImages（pId=fileUrl 经
 *   paperIdFromFileUrl 派生单源，fileUrl 取 data.fileUrl；模块调用非
 *   props，INV-B 不破）；partial=成功帧+失败徽注（I3 失败不扩散）。
 * - [C2-①] 提取触发面=信息区可见（用户动作驱动——连接件扇出）；本批禁挂
 *   阅读器文档就绪链（onDocReady 先于注册表登记的时序窗 miss 注册表）。
 *   提取态反应性驻宿主连接件轮询（error 态续轮=I8 重试反应性通道——INV-B
 *   禁回调 props 所迫；M2 订阅面升级后续票回收）。
 *
 * ── 架构层 ──
 * - [INV-B] 只读：props 零函数字段（data/images 纯数据）；禁 input/
 *   textarea/contentEditable。
 * - [INV-C] 零域分支：本文件域关键字零出现（词表单源=登记册 INV-137 行，
 *   组件文件不抄词表防自命中）+import 仅 shared/相对——破约（首个域 if）
 *   即拆两域薄壳。
 */
import { useState } from 'react'
import { paperIdFromFileUrl, retryPaperImages, type PaperImageEntry } from './PaperImageExtractor'
import { RetryButton } from './ui/RetryButton'
import type { PaperDetail } from '@shared/models/paper'

export function PaperInfoSection(props: { data: PaperDetail; images?: PaperImageEntry }): JSX.Element {
  const { data, images } = props
  const [expanded, setExpanded] = useState(false)
  const stripOn = images !== undefined && (images.status === 'ready' || images.status === 'partial')
  const stripFailed = images !== undefined && images.status === 'error'
  return (
    <section className="paper-info flex flex-col gap-2" data-testid="paper-info-section">
      {data.authors.length > 0 && (
        <p className="pi-authors" data-testid="paper-info-authors" title={data.authors.join('；')}>
          {data.authors.join('、')}
        </p>
      )}
      {data.abstract !== '' && (
        <div className="flex flex-col gap-1">
          <p
            className={expanded ? 'pi-abstract open' : 'pi-abstract'}
            data-testid="paper-info-abstract"
          >
            {data.abstract}
          </p>
          <button
            type="button"
            className="pi-toggle"
            data-testid="paper-info-abstract-toggle"
            onClick={() => {
              setExpanded((v) => !v)
            }}
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      )}
      <p className="pi-affil" data-testid="paper-info-affil" title="机构信息待数据库升级后开放">
        机构信息待数据库升级后开放
      </p>
      {stripOn && images !== undefined && (
        <div className="pi-strip" data-testid="paper-info-strip">
          {images.images.map((u, i) => (
            <img key={i} src={u} alt={`文中图 ${i + 1}`} />
          ))}
          {images.status === 'partial' && <span className="pi-strip-fail">{images.failedPages} 页提取失败</span>}
        </div>
      )}
      {stripFailed && (
        <div className="pi-strip-failed">
          <span>文中图片提取失败</span>
          <RetryButton
            testId="paper-info-strip-retry"
            onClick={() => {
              retryPaperImages(paperIdFromFileUrl(data.fileUrl), data.fileUrl)
            }}
          />
        </div>
      )}
    </section>
  )
}
