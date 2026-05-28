import { Config } from '../Config'
import { EVT } from '../EVT'
import { optionConfigs } from './OptionConfigs'
import { OptionCategoryLevel1, settings } from './Settings'
import { SettingsForm } from './SettingsForm'
import { SettingsPanelDownloadSummary } from './SettingsPanelDownloadSummary'
import {
  SettingsPanelLayout,
  SettingsPanelLayoutResult,
} from './SettingsPanelLayout'
import { SettingsPanelSections } from './SettingsPanelSections'
import { SettingsPanelShell } from './SettingsPanelShell'
import { SearchRestorePage, SettingsPanelSearch } from './SettingsPanelSearch'
import { FoldableSection, PageId } from './SettingsPanelTypes'
import '../OpenSettingsPanel'

class SettingsPanel {
  private form: SettingsForm
  private centerPanel: HTMLDivElement
  private main: HTMLDivElement

  private activePage: PageId = 'home'
  private readonly optionElements = new Map<number, HTMLElement>()
  private canonicalContainers!: Map<string, HTMLDivElement>
  private pageEls!: Map<PageId, HTMLDivElement>
  private stickyEls!: Map<PageId, HTMLButtonElement>
  private navEls!: Map<PageId, HTMLButtonElement>
  private foldableSections!: Map<string, FoldableSection>
  private expandAllBtn!: HTMLButtonElement
  private homePinnedContent!: HTMLDivElement
  private downloadSummary!: SettingsPanelDownloadSummary
  private searchPanel!: SettingsPanelSearch
  private sectionController!: SettingsPanelSections

  constructor(form: SettingsForm) {
    SettingsPanelShell.init()
    this.form = form
    this.centerPanel = SettingsPanelShell.get()
    this.main = this.centerPanel.querySelector(
      '.settingsPanel_main'
    ) as HTMLDivElement

    if (!this.centerPanel || !this.main) {
      throw new Error('SettingsPanel shell not found')
    }

    this.sectionController = new SettingsPanelSections({
      main: this.main,
      getActivePage: () => this.activePage,
      getSearchExpandStats: () =>
        this.searchPanel?.getExpandStats() ?? { total: 0, expanded: 0 },
      setSearchAllExpanded: (shouldExpand) =>
        this.searchPanel?.setAllExpanded(shouldExpand),
      getSearchStickySections: () => this.searchPanel?.getStickySections() ?? [],
    })

    for (const option of this.form.querySelectorAll('.option')) {
      const no = Number.parseInt((option as HTMLElement).dataset.no || '-1')
      if (no > -1) {
        this.optionElements.set(no, option as HTMLElement)
      }
    }
    this.buildLayout()
    this.downloadSummary = new SettingsPanelDownloadSummary(
      this.centerPanel.querySelector(
        '#settingsPanelDownloadSummary'
      ) as HTMLDivElement,
      this.form
    )
    this.bindEvents()
    this.switchPage('home')
    this.updateSearchResult()
  }

  private buildLayout() {
    const layout: SettingsPanelLayoutResult = new SettingsPanelLayout({
      form: this.form,
      centerPanel: this.centerPanel,
      optionElements: this.optionElements,
      getExpandedState: (section) => this.sectionController.getExpandedState(section),
      applyExpandedState: (section, expanded) =>
        this.sectionController.applyExpandedState(section, expanded),
      toggleSection: (section) => this.sectionController.toggleSection(section),
      makeSectionKey: (page, id) => this.sectionController.makeSectionKey(page, id),
      makeCanonicalKey: (level1, level2) =>
        this.makeCanonicalKey(level1, level2),
    }).build()

    this.pageEls = layout.pageEls
    this.stickyEls = layout.stickyEls
    this.navEls = layout.navEls
    this.foldableSections = layout.foldableSections
    this.canonicalContainers = layout.canonicalContainers
    this.homePinnedContent = layout.homePinnedContent
    this.expandAllBtn = this.centerPanel.querySelector(
      '#settingsPanelToggleExpand'
    ) as HTMLButtonElement
    this.sectionController.connect({
      foldableSections: this.foldableSections,
      stickyEls: this.stickyEls,
      expandAllBtn: this.expandAllBtn,
    })
    this.searchPanel = new SettingsPanelSearch({
      root: layout.searchRoot,
      input: this.centerPanel.querySelector(
        '#settingsPanelSearchInput'
      ) as HTMLInputElement,
      clearButton: this.centerPanel.querySelector(
        '#settingsPanelClearSearch'
      ) as HTMLButtonElement,
      navButton: this.centerPanel.querySelector(
        '.settingsPanel_navItem[data-page="search"]'
      ) as HTMLButtonElement,
      optionElements: this.optionElements,
      getCanonicalContainer: (level1, level2) =>
        this.getCanonicalContainer(level1, level2),
      onSectionStateChange: () => {
        this.sectionController.updateExpandAllButton()
        this.sectionController.refreshStickyHeader()
      },
    })
  }

  private bindEvents() {
    this.stickyEls.forEach((sticky) => {
      sticky.addEventListener('click', () => {
        const key = sticky.dataset.sectionKey
        if (!key) {
          return
        }
        if (this.sectionController.toggleSectionByKey(key)) {
          return
        }
        this.searchPanel.toggleSectionByKey(key)
      })
    })

    this.navEls.forEach((button, page) => {
      button.addEventListener('click', () => {
        this.playNavRipple(button)
        this.handleNavRequest(page)
      })
      button.addEventListener('keydown', (event) => {
        if (
          (event.code === 'Enter' || event.code === 'Space') &&
          event.target === button
        ) {
          event.preventDefault()
          this.playNavRipple(button)
          this.handleNavRequest(page)
        }
      })

      if (!Config.mobile) {
        button.addEventListener('mouseenter', () => {
          if (settings.switchTabBar !== 'click') {
            this.handleNavRequest(page)
          }
        })
      }
    })

    this.searchPanel.bindEvents(() => this.updateSearchResult())

    this.expandAllBtn.addEventListener('click', () =>
      this.sectionController.toggleAllSections()
    )

    this.main.addEventListener('scroll', () =>
      this.sectionController.refreshStickyHeader()
    )

    window.addEventListener(EVT.list.settingChange, (ev: CustomEventInit) => {
      const data = ev.detail.data as any
      if (data.name === 'pinnedOptions') {
        this.renderCurrentPage()
      }

      if (data.name === 'expandedCards') {
        this.sectionController.refreshPersistedSectionStates()
      }
    })

    window.addEventListener(EVT.list.langChange, () => {
      window.setTimeout(() => {
        this.renderCurrentPage()
      }, 0)
    })
  }

  private handleNavRequest(page: PageId) {
    if (page === 'search' && !this.searchPanel.hasKeyword()) {
      return
    }

    if (this.searchPanel.hasKeyword() && page !== 'search') {
      this.searchPanel.setLastNonSearchPage(page as SearchRestorePage)
      if (this.activePage === 'search') {
        this.searchPanel.clear()
        this.updateSearchResult()
      }
      return
    }

    this.switchPage(page)
  }

  private switchPage(page: PageId) {
    this.activePage = page
    if (page !== 'search') {
      this.searchPanel.setLastNonSearchPage(page as SearchRestorePage)
    }

    this.pageEls.forEach((pageEl, key) => {
      pageEl.classList.toggle('active', key === page)
    })
    this.navEls.forEach((button, key) => {
      button.classList.toggle('active', key === page)
    })

    this.renderCurrentPage()
  }

  private renderCurrentPage() {
    if (this.activePage === 'search') {
      this.searchPanel.renderPage()
    } else {
      this.placeOptionsToDefaultContainers(this.activePage === 'home')
    }

    this.updatePinnedSectionVisibility()
    this.sectionController.updateExpandAllButton()
    window.setTimeout(() => this.sectionController.refreshStickyHeader(), 0)
  }

  private updateSearchResult() {
    if (!this.searchPanel.updateResult()) {
      this.switchPage(this.searchPanel.getLastNonSearchPage())
      return
    }

    this.switchPage('search')
  }

  private placeOptionsToDefaultContainers(showPinnedOnHome: boolean) {
    for (const option of optionConfigs.options) {
      const element = this.optionElements.get(option.no)
      if (!element) {
        continue
      }

      const target =
        showPinnedOnHome && settings.pinnedOptions.includes(option.no)
          ? this.homePinnedContent
          : this.getCanonicalContainer(
              option.categoryLevel1,
              option.categoryLevel2
            )
      target.append(element)
    }

    this.searchPanel.resetOptionHighlight()
  }

  private updatePinnedSectionVisibility() {
    const pinnedSection = this.foldableSections.get(
      this.sectionController.makeSectionKey('home', 'pinnedOptions')
    )
    if (!pinnedSection) {
      return
    }
    pinnedSection.root.style.display =
      settings.pinnedOptions.length > 0 ? 'block' : 'none'
  }

  private playNavRipple(button: HTMLButtonElement) {
    this.playRipple(button)
  }

  private playRipple(button: HTMLButtonElement) {
    if (!button.querySelector('.ripple')) {
      return
    }
    button.classList.remove('ripple-active')
    void button.offsetWidth
    button.classList.add('ripple-active')
    window.setTimeout(() => {
      button.classList.remove('ripple-active')
    }, 650)
  }

  private getCanonicalContainer(level1: OptionCategoryLevel1, level2: string) {
    return this.canonicalContainers.get(
      this.makeCanonicalKey(level1, level2)
    ) as HTMLDivElement
  }

  private makeCanonicalKey(level1: OptionCategoryLevel1, level2: string) {
    return `${level1}__${level2}`
  }
}

SettingsPanelShell.init()

export { SettingsPanel }
