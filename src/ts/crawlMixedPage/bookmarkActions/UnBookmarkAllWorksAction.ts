import { EVT } from '../../EVT'
import { lang } from '../../Language'
import { log } from '../../Log'
import { toast } from '../../Toast'
import { unBookmarkWorks } from '../../UnBookmarkWorks'
import { WorkBookmarkData } from '../../Bookmark'
import { BookmarkPageBatchActionBase } from './BookmarkPageBatchActionBase'

class UnBookmarkAllWorksAction extends BookmarkPageBatchActionBase<WorkBookmarkData> {
  constructor(btn: HTMLButtonElement) {
    super()

    btn.addEventListener('click', () => {
      const title = lang.transl('_取消收藏本页面的所有作品')
      log.warning(title)
      toast.warning(title, {
        position: 'topCenter',
      })
      EVT.fire('closeCenterPanel')

      void this.run({
        crawlNumber: 1,
        collectWork: (workData) => this.createBookmarkData(workData),
        onCollected: async (bookmarkDataList) => {
          await unBookmarkWorks.start(bookmarkDataList)
        },
      })
    })
  }
}

export { UnBookmarkAllWorksAction }
