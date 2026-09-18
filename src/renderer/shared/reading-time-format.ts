/**
 * 阅读时长显示纯函数（P7E-05）——定义单源驻 renderer/shared（check-quality
 * 跨 feature 关卡指定的共享下沉位：library/PaperDetailPanel 与
 * reader/time/reading-time 双 feature 消费；reader/time/reading-time.ts re-export
 * 转发=受锁测试 import 面零改）。
 */
/** <60min「N 分钟」（按分钟取整=floor，宁少勿多）；≥60min「N 小时 M 分」 */
export function formatReadingTime(seconds: number): string {
  const totalMin = Math.floor(seconds / 60)
  if (totalMin < 60) return `${totalMin} 分钟`
  const hours = Math.floor(totalMin / 60)
  return `${hours} 小时 ${totalMin % 60} 分`
}
