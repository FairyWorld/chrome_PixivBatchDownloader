import { EVT } from '../EVT'
import { lang } from '../Language'
import { theme } from '../Theme'
import { Tools } from '../Tools'
import { toast } from '../Toast'
import { DateFormat } from '../utils/DateFormat'
import { Utils } from '../utils/Utils'
import { options } from './Options'
import { optionsHtml } from './OptionsHtml'
import { FormBeautify } from './FormBeautify'
import { FormHelpManager } from './FormHelpManager'
import { FormSettings } from './FormSettings'
import { SaveNamingRule } from './SaveNamingRule'
import { setSetting } from './Settings'
import { SettingsForm } from './SettingsForm'
import { SettingsPanel } from './SettingsPanel'

/** 设置系统入口：创建 form，并装配所有依赖 form 的模块 */
class SettingsBootstrap {
  constructor() {
    this.form = Tools.useSlot(
      'form',
      `<form class="settingForm">${optionsHtml}</form>`
    ) as SettingsForm

    this.initModules()
    this.bindFormEvents()
    this.bindFunctionButtons()
    this.bindCopyEvents()

    window.addEventListener(EVT.list.langChange, () => {
      this.bindCopyEvents()
    })
  }

  private form: SettingsForm

  private initModules() {
    const allOptions = this.form.querySelectorAll('.option')

    theme.register(this.form)
    lang.register(this.form)
    options.init(allOptions as NodeListOf<HTMLElement>)

    new SaveNamingRule(this.form.userSetName, 'artwork')
    new SaveNamingRule(this.form.userSetNameForNovel, 'novel')
    new FormSettings(this.form)
    new FormBeautify(this.form)
    new SettingsPanel(this.form)
    new FormHelpManager(this.form)
  }

  private bindFormEvents() {
    const list = [
      {
        select: this.form.fileNameSelect,
        input: this.form.userSetName,
      },
      {
        select: this.form.fileNameSelectForNovel,
        input: this.form.userSetNameForNovel,
      },
    ]

    list.forEach(({ select, input }) => {
      select.addEventListener('change', () => {
        if (select.value !== 'default') {
          const position = input.selectionStart!
          input.value =
            input.value.substring(0, position) +
            select.value +
            input.value.substring(position)
          input.selectionStart = position + select.value.length
          input.selectionEnd = position + select.value.length
          input.focus()
          select.value = 'default'
        }
      })
    })

    const setNowBtns = this.form.querySelectorAll(
      'button[role="setDate"]'
    ) as NodeListOf<HTMLButtonElement>
    for (const btn of setNowBtns) {
      btn.addEventListener('click', () => {
        const name = btn.dataset.for as 'postDateStart' | 'postDateEnd'
        const input = this.form.querySelector(
          `input[name="${name}"]`
        ) as HTMLInputElement
        if (!input) {
          return
        }

        const flag = btn.dataset.value!
        let value = flag
        if (flag === 'now') {
          value = DateFormat.format(new Date(), 'YYYY-MM-DDThh:mm')
        }
        input.value = value
        setSetting(name, value)
      })
    }
  }

  private bindFunctionButtons() {
    const eventBtns = document.querySelectorAll(
      '.fireEvent'
    ) as NodeListOf<HTMLButtonElement>

    eventBtns.forEach((btn) => {
      const eventName = btn.dataset.event
      if (!eventName) {
        return
      }

      btn.addEventListener('click', () => {
        EVT.fire(eventName as any)
      })
    })
  }

  private bindCopyEvents() {
    const allName = this.form.querySelectorAll(
      '.namingTipArea .name'
    ) as NodeListOf<HTMLElement>

    for (const el of allName) {
      if (el.dataset.bindCopy) {
        continue
      }

      el.dataset.bindCopy = 'true'
      el.addEventListener('click', async () => {
        const text = el.textContent
        if (!text) {
          return
        }

        const copied = await Utils.writeClipboardText(text)
        if (copied) {
          toast.success(lang.transl('_已复制'))
        } else {
          toast.error(lang.transl('_复制失败'))
        }
      })
    }
  }
}

new SettingsBootstrap()
