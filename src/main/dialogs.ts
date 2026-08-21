/**
 * 系统对话框注入（SR-INFRA-15，已完成）。
 *
 * 职责：main 侧唯一的系统对话框出口（安全 §6.3：文件/目录路径只能从这里产生，
 * renderer 永远不传路径）。接口窄化便于测试打桩。
 */
import { dialog } from 'electron'

export interface Dialogs {
  /** 选择一个或多个 PDF（取消返回 null） */
  pickPdfFiles(): Promise<string[] | null>
  /** 选择目录（批量导入，取消返回 null） */
  pickFolder(): Promise<string | null>
  /** 保存文件（导出用；extFilters 形如 [{ name: 'BibTeX', extensions: ['bib'] }]） */
  saveFile(defaultName: string, extFilters: Array<{ name: string; extensions: string[] }>): Promise<string | null>
}

export function createElectronDialogs(): Dialogs {
  return {
    pickPdfFiles: async () => {
      const r = await dialog.showOpenDialog({
        title: '选择要导入的 PDF',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
      })
      return r.canceled || r.filePaths.length === 0 ? null : r.filePaths
    },
    pickFolder: async () => {
      const r = await dialog.showOpenDialog({
        title: '选择要批量导入的文件夹',
        properties: ['openDirectory']
      })
      return r.canceled ? null : (r.filePaths[0] ?? null)
    },
    saveFile: async (defaultName, extFilters) => {
      const r = await dialog.showSaveDialog({
        title: '导出到',
        defaultPath: defaultName,
        filters: extFilters
      })
      return r.canceled || !r.filePath ? null : r.filePath
    }
  }
}
