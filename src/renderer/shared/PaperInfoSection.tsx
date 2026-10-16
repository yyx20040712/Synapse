/**
 * [F-VISFB-43] PaperInfoSection —— 论文信息区纯展示件（换源版：props figures=
 * DB 图表清单〔FigureItem[]——取数归各宿主连接件经 figures.list IPC〕；
 * [F-UIRES-04 批 3b] 作者/摘要/机构三面沿承 v1.1 props 数据注入零取数零订阅）。
 *
 * ── 行为层 ──
 * - 作者=全量折行 clamp 2 行+悬浮 title 全量（空数组整块省略）；摘要=clamp
 *   6 行+展开/收起（M3 本地态零持久化；空串整块省略）；机构=禁用呈现位
 *   「机构信息待数据库升级后开放」+title 提示（呈裁 A(c)——库无字段，星标
 *   P-11 禁用呈现先例同款）。
 * - strip=横向滚动图表缩略：<img src=app-file://<paperId>/figures/<figureId>>
 *   （协议单源=APP_FILE_URL_PREFIX 派生——renderer 零文件系统接触，INV-07）；
 *   figures 缺席/空数组→整条省略。**断网/无提取不现场渲染**（§7 静态负锚：
 *   本件零提取调用/零轮询/零 dataURL——旧 M2 降级重试面随 PaperImageExtractor
 *   退役删除，提取失败态归 job 面〔figure_jobs 三态〕非消费面）。
 * - 点击放大/跳页交互不属本批（后续票候选）。
 *
 * ── 架构层 ──
 * - [INV-136 换源] 只读：props 零函数字段（{data: PaperDetail;
 *   figures?: readonly FigureItem[]} 纯数据注入）；禁 input/textarea/
 *   contentEditable。
 * - [INV-C] 零域分支：本文件域关键字零出现（词表单源=登记册 INV-137 行）+
 *   import 仅 shared/相对。
 */
import { useState } from 'react'
import { APP_FILE_URL_PREFIX } from '@shared/app-file-url'
import type { FigureItem } from '@shared/ipc/schemas'
import type { PaperDetail } from '@shared/models/paper'

/** 图表协议 URL（app-file://<paperId>/figures/<figureId>——42 协议分支形态） */
function figureImgUrl(paperId: string, figureId: string): string {
  return `${APP_FILE_URL_PREFIX}${paperId}/figures/${figureId}`
}

export function PaperInfoSection(props: {
  data: PaperDetail
  figures?: readonly FigureItem[]
}): JSX.Element {
  const { data, figures } = props
  const [expanded, setExpanded] = useState(false)
  const stripOn = figures !== undefined && figures.length > 0
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
      {stripOn && figures !== undefined && (
        <div className="pi-strip" data-testid="paper-info-strip">
          {figures.map((f, i) => (
            <img key={f.figureId} src={figureImgUrl(data.id, f.figureId)} alt={`文中图 ${i + 1}（第 ${f.page} 页）`} />
          ))}
        </div>
      )}
    </section>
  )
}
