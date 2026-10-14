/**
 * [F-DBCAMP-01 DB-3 U2] AiAssistantSection —— 设置页「AI 助手」节壳（自
 * SettingsPage 外提：U2 插同步密钥节后 251 行超组件 250 限——简报③-6 授权
 * 预案，行为零变：global 档会话面板内嵌 anchorId=null）。
 */
import { AiSessionPanel } from '../ai/AiSessionPanel'
import { SettingsSection } from './SettingsSection'

export function AiAssistantSection(): JSX.Element {
  return (
    <SettingsSection title="AI 助手">
      <AiSessionPanel scope="global" anchorId={null} />
    </SettingsSection>
  )
}
