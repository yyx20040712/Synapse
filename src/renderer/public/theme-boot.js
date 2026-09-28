// [T3-U1] FOUC 首帧兜底（同步经典脚本——非 module 不 defer，head 内阻塞
// 执行于首帧样式化之前）：读 main 启动附上的 ?theme= 参（loadURL 拼 query /
// loadFile {query} 选项——bootstrap 同步读 settings.json 传入），合法三值
// （light/dark/sepia——schema 枚举同源）才写 documentElement.dataset.theme；
// 非法/缺参零写，留 App effect 运行时单点真源兜底（启动注入=首帧兜底，
// 两者值一致——INV-71）。CSP script-src self：本件必须外链文件，禁内联。
// 禁 import/export（module defer 语义会让首帧兜底失效——测试负锚锁定）。
;(function () {
  var theme = new URLSearchParams(window.location.search).get('theme')
  if (theme === 'light' || theme === 'dark' || theme === 'sepia') {
    document.documentElement.dataset.theme = theme
  }
})()
