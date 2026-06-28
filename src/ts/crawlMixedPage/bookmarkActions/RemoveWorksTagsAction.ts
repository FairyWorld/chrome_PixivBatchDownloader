import { EVT } from '../../EVT'
import { lang } from '../../Language'
import { log } from '../../Log'
import { toast } from '../../Toast'
import { removeWorksTagsInBookmarks } from '../../RemoveWorksTagsInBookmarks'
import { WorkBookmarkData } from '../../Bookmark'
import { BookmarkPageBatchActionBase } from './BookmarkPageBatchActionBase'

class RemoveWorksTagsAction extends BookmarkPageBatchActionBase<WorkBookmarkData> {
  constructor(btn: HTMLButtonElement) {
    super()

    btn.addEventListener('click', () => {
      if (this.isRunning()) {
        toast.error(lang.transl('_当前任务尚未完成'))
        return
      }

      const title = lang.transl('_移除本页面中所有作品的标签')
      log.warning(title)
      log.warning(lang.transl('_它们会变成未分类状态'))
      toast.warning(title, {
        position: 'topCenter',
      })
      EVT.fire('closeCenterPanel')

      void this.run({
        crawlNumber: 1,
        collectWork: (workData) => this.createBookmarkData(workData),
        onCollected: async (bookmarkDataList) => {
          await removeWorksTagsInBookmarks.start(bookmarkDataList)
        },
      })
    })
  }
}

export { RemoveWorksTagsAction }
