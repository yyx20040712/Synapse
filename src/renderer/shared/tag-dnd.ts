/**
 * [F-DBCAMP-01 DB-4 / F-TAGS-02 ⑥ B] tag-dnd —— 标签拖拽打标 MIME 单源
 * （PAPER_DRAG_MIME 仿体——library-dnd.store 先例；驻 renderer/shared=拖源
 * 〔tags feature〕与落点〔library feature〕两消费域中立位——跨 feature 引用红线）。
 *
 * - TAG_DRAG_MIME：dragstart 载荷=tagId（drop 侧 attach 目标）
 * - TAG_DRAG_FOLDER_MIME：载荷=tag 所在域 folderId（renderer 域一致性预检
 *   判别用——数据不可及时依赖服务端 019 触发器+R3 映射兜底）
 */
export const TAG_DRAG_MIME = 'application/x-synapse-tag'
export const TAG_DRAG_FOLDER_MIME = 'application/x-synapse-tag-folder'
