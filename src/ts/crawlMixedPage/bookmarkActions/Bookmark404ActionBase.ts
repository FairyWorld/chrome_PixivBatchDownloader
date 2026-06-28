import { Utils } from '../../utils/Utils'
import { log } from '../../Log'
import { lang } from '../../Language'
import { WorkBookmarkData } from '../../Bookmark'
import { BookmarkPageBatchActionBase } from './BookmarkPageBatchActionBase'

/** 继承了在收藏页面里的通用抓取流程，并添加了导出 404 作品列表的功能 */
abstract class Bookmark404ActionBase extends BookmarkPageBatchActionBase<WorkBookmarkData> {
  protected exportBookmark404Ids(bookmarkDataList: WorkBookmarkData[]) {
    if (bookmarkDataList.length === 0) {
      return
    }

    const idList = bookmarkDataList.map((item) => item.workID)
    const blob = Utils.json2Blob(idList)
    const url = URL.createObjectURL(blob)
    Utils.downloadFile(url, '404 bookmark ID list.json')
    log.success(lang.transl('_已导出被删除的作品的ID列表'))
  }
}

export { Bookmark404ActionBase }
