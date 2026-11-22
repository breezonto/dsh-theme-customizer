/**
 * Client half of the theme-customizer bundle.
 *
 * Applies the theme settings live (wallpaper, transparency, fonts, accent
 * color) and registers a "Theme" settings page. Settings that live in the
 * plugin Config (wallpaper, opacity, composer font, accents) are read and
 * written through `ctx.configForms`; the global font rides the shared theme
 * service (`ctx.theme.setFontFamily`) so it stays in sync with the built-in
 * text font and the theme presenter.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-theme-customizer',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'theme-customizer'
    const ENTRY_ID = 'theme-customizer'

    const en = {
      'nav': 'Theme',
      'wallpaper.title': 'Wallpaper',
      'wallpaper.description': 'Background image for the app surface. Paste an image URL or data URL, or choose a local image.',
      'wallpaper.url.placeholder': 'https://example.com/image.jpg or data:image/…',
      'wallpaper.upload': 'Choose image',
      'wallpaper.clear': 'Clear',
      'wallpaper.opacity': 'Wallpaper transparency',
      'wallpaper.opacity.description': 'Higher values show more of the wallpaper.',
      'globalFont.title': 'Global font',
      'globalFont.description': 'Interface and conversation text, except the message composer. Separate fonts with commas; leave empty for the default.',
      'composerFont.title': 'Composer font',
      'composerFont.description': 'Message-composer text only. Separate fonts with commas; leave empty for the default.',
      'font.placeholder': 'Default',
      'accent.title': 'Accent color',
      'accent.description': 'Primary brand color for primary buttons and brand accents.',
      'accent.light': 'Light theme',
      'accent.dark': 'Dark theme',
      'reset': 'Reset to defaults',
      'error.save': 'Could not save this setting.',
      'error.notImage': 'Please choose an image file.',
      'error.tooLarge': 'Image is too large (max 1.5 MB).',
      'error.read': 'Could not read the image file.',
    }

    const zh = {
      'nav': '主题',
      'wallpaper.title': '壁纸',
      'wallpaper.description': '应用界面的背景图片。粘贴图片链接或 data URL，或选择本地图片。',
      'wallpaper.url.placeholder': 'https://example.com/image.jpg 或 data:image/…',
      'wallpaper.upload': '选择图片',
      'wallpaper.clear': '清除',
      'wallpaper.opacity': '壁纸透明度',
      'wallpaper.opacity.description': '数值越高，壁纸越清晰可见。',
      'globalFont.title': '全局字体',
      'globalFont.description': '用于界面与会话正文（不含消息输入框）。多个字体用逗号分隔，留空使用默认字体。',
      'composerFont.title': '输入框字体',
      'composerFont.description': '仅用于消息输入框。多个字体用逗号分隔，留空使用默认字体。',
      'font.placeholder': '默认',
      'accent.title': '强调色',
      'accent.description': '主按钮与品牌强调使用的主品牌色。',
      'accent.light': '浅色主题',
      'accent.dark': '深色主题',
      'reset': '恢复默认',
      'error.save': '无法保存该设置。',
      'error.notImage': '请选择图片文件。',
      'error.tooLarge': '图片过大（最大 1.5 MB）。',
      'error.read': '无法读取图片文件。',
    }

    const GENERIC_FAMILIES = new Set([
      'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
      'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji',
      'math', 'fangsong', '-apple-system', 'blinkmacsystemfont',
    ])

    /** Normalize a comma-separated font list into a safe CSS font-family value. */
    function normalizeFontFamily(value) {
      return String(value)
        .split(',')
        .map((name) => name.replace(/["'\\<>\u0000-\u001f\u007f]/gu, '').replace(/\s+/gu, ' ').trim())
        .filter((name) => name !== '')
        .map((name) => (GENERIC_FAMILIES.has(name.toLowerCase()) ? name : `"${name}"`))
        .join(', ')
    }

    const DEFAULT_ACCENT_LIGHT = 'rgb(15, 17, 21)'
    const DEFAULT_ACCENT_DARK = 'rgb(249, 250, 251)'

    const DEFAULTS = {
      wallpaper: '',
      wallpaperOpacity: 40,
      composerFont: '',
      accentLight: '',
      accentDark: '',
    }

    function readSettings(form) {
      const snap = form.getSnapshot()
      if (snap.status === 'ready' && snap.value !== null && typeof snap.value === 'object') {
        return { ...DEFAULTS, ...snap.value }
      }
      return { ...DEFAULTS }
    }

    /** Wrap a URL/data URL as a CSS url() string, escaping dangerous characters. */
    function cssUrl(value) {
      const escaped = String(value).replace(/[\\"\n\r]/g, (ch) => (
        { '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r' }[ch]
      ))
      return `url("${escaped}")`
    }

    const THEME_CSS = `
      /* Wallpaper layer behind the app frame, revealed through the translucent base. */
      body {
        background-image: var(--theme-customizer-wallpaper-image, none);
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        background-repeat: no-repeat;
      }
      /* The composer draft and placeholder keep their own font, independent of the global font. */
      [data-composer-input],
      [data-composer-placeholder] {
        font-family: var(--theme-customizer-composer-font, var(--dsh-font-family-text-default)) !important;
      }
      /* Theme settings page. */
      .theme-customizer-section { display: flex; flex-direction: column; width: 100%; }
      .theme-customizer-group {
        display: flex; flex-direction: column; gap: 8px;
        padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2);
      }
      .theme-customizer-group:last-child { border-bottom: none; }
      .theme-customizer-title { font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); }
      .theme-customizer-desc { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
      .theme-customizer-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .theme-customizer-label { flex: 0 0 auto; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
      .theme-customizer-input {
        box-sizing: border-box; width: 100%; min-width: 0;
        padding: 6px 10px; border: 0.5px solid var(--dsw-alias-border-l2);
        border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; outline: none;
      }
      .theme-customizer-input:focus { border-color: var(--dsw-alias-border-selected); }
      .theme-customizer-input::placeholder { color: var(--dsw-alias-label-tertiary); }
      .theme-customizer-range { flex: 1 1 200px; accent-color: var(--dsw-alias-state-business-primary); }
      .theme-customizer-color {
        width: 40px; height: 28px; padding: 0;
        border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-xs);
        background: transparent; cursor: pointer;
      }
      .theme-customizer-button {
        padding: 5px 12px; border: 0.5px solid var(--dsw-alias-border-l2);
        border-radius: var(--dsw-radius-sm); background: transparent;
        color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; cursor: pointer;
      }
      .theme-customizer-button:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .theme-customizer-preview {
        width: 100%; height: 72px; border: 0.5px solid var(--dsw-alias-border-l2);
        border-radius: var(--dsw-radius-md); background-size: cover; background-position: center;
        background-color: var(--dsw-alias-bg-layer-1);
      }
      .theme-customizer-value { font-size: 12px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
    `

    function ThemeSection(props) {
      const t = props.t
      const form = props.form
      const theme = props.theme
      const useGlobalFont = props.useGlobalFont

      // Optimistic local draft: updates synchronously on every change so
      // controlled inputs never drop keystrokes or snap back while the
      // asynchronous config write settles.
      const [draft, setDraft] = React.useState(() => readSettings(form))
      const [notice, setNotice] = React.useState('')
      const globalFont = useGlobalFont()

      const set = (field, value) => {
        setDraft((prev) => ({ ...prev, [field]: value }))
        form.set(field, value).then((ok) => { if (!ok) setNotice(t('error.save')) })
      }

      const onUpload = (event) => {
        const file = event.target.files && event.target.files[0]
        event.target.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) { setNotice(t('error.notImage')); return }
        if (file.size > 1_500_000) { setNotice(t('error.tooLarge')); return }
        const reader = new FileReader()
        reader.onload = () => { set('wallpaper', String(reader.result || '')) }
        reader.onerror = () => { setNotice(t('error.read')) }
        reader.readAsDataURL(file)
      }

      const reset = () => {
        set('wallpaper', '')
        set('wallpaperOpacity', DEFAULTS.wallpaperOpacity)
        set('composerFont', '')
        set('accentLight', '')
        set('accentDark', '')
        theme.setFontFamily('text', '')
        setNotice('')
      }

      const commitGlobalFont = (value) => { theme.setFontFamily('text', value) }
      const enterBlur = (event) => {
        if (event.nativeEvent && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) return
        if (event.key === 'Enter') event.currentTarget.blur()
      }

      return h('div', { className: 'theme-customizer-section' },
        h('div', { className: 'theme-customizer-group' },
          h('div', { className: 'theme-customizer-title' }, t('wallpaper.title')),
          h('div', { className: 'theme-customizer-desc' }, t('wallpaper.description')),
          h('input', {
            className: 'theme-customizer-input', type: 'text', value: draft.wallpaper,
            placeholder: t('wallpaper.url.placeholder'), spellCheck: false, autoComplete: 'off',
            onChange: (e) => set('wallpaper', e.target.value),
          }),
          h('div', { className: 'theme-customizer-row' },
            h('label', { className: 'theme-customizer-button', style: { cursor: 'pointer' } },
              t('wallpaper.upload'),
              h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onUpload }),
            ),
            h('button', { className: 'theme-customizer-button', type: 'button', onClick: () => set('wallpaper', '') }, t('wallpaper.clear')),
          ),
          draft.wallpaper
            ? h('div', { className: 'theme-customizer-preview', style: { backgroundImage: cssUrl(draft.wallpaper) } })
            : null,
          h('div', { className: 'theme-customizer-row' },
            h('span', { className: 'theme-customizer-label' }, t('wallpaper.opacity')),
            h('input', {
              className: 'theme-customizer-range', type: 'range', min: 0, max: 100, step: 1,
              value: draft.wallpaperOpacity,
              onChange: (e) => set('wallpaperOpacity', Number(e.target.value)),
            }),
            h('span', { className: 'theme-customizer-value' }, draft.wallpaperOpacity + '%'),
          ),
          h('div', { className: 'theme-customizer-desc' }, t('wallpaper.opacity.description')),
        ),
        h('div', { className: 'theme-customizer-group' },
          h('div', { className: 'theme-customizer-title' }, t('globalFont.title')),
          h('div', { className: 'theme-customizer-desc' }, t('globalFont.description')),
          h('input', {
            key: globalFont,
            className: 'theme-customizer-input', type: 'text', defaultValue: globalFont,
            placeholder: t('font.placeholder'), spellCheck: false, autoComplete: 'off',
            onBlur: (e) => commitGlobalFont(e.target.value), onKeyDown: enterBlur,
          }),
        ),
        h('div', { className: 'theme-customizer-group' },
          h('div', { className: 'theme-customizer-title' }, t('composerFont.title')),
          h('div', { className: 'theme-customizer-desc' }, t('composerFont.description')),
          h('input', {
            className: 'theme-customizer-input', type: 'text', value: draft.composerFont,
            placeholder: t('font.placeholder'), spellCheck: false, autoComplete: 'off',
            onChange: (e) => set('composerFont', e.target.value),
          }),
        ),
        h('div', { className: 'theme-customizer-group' },
          h('div', { className: 'theme-customizer-title' }, t('accent.title')),
          h('div', { className: 'theme-customizer-desc' }, t('accent.description')),
          h('div', { className: 'theme-customizer-row' },
            h('span', { className: 'theme-customizer-label' }, t('accent.light')),
            h('input', {
              className: 'theme-customizer-color', type: 'color',
              value: draft.accentLight || '#0f1115',
              onChange: (e) => set('accentLight', e.target.value),
            }),
          ),
          h('div', { className: 'theme-customizer-row' },
            h('span', { className: 'theme-customizer-label' }, t('accent.dark')),
            h('input', {
              className: 'theme-customizer-color', type: 'color',
              value: draft.accentDark || '#f9fafb',
              onChange: (e) => set('accentDark', e.target.value),
            }),
          ),
        ),
        h('div', { className: 'theme-customizer-group' },
          h('button', { className: 'theme-customizer-button', type: 'button', onClick: reset }, t('reset')),
        ),
        notice
          ? h('div', { className: 'theme-customizer-desc', style: { color: 'var(--dsw-alias-state-error-primary)' } }, notice)
          : null,
      )
    }

    return {
      inject: ['slots', 'locale', 'configForms', 'theme'],
      apply(ctx) {
        const form = ctx.configForms.get(ENTRY_ID)
        const theme = ctx.theme
        const body = document.body

        // Locale dictionaries for the settings page.
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'theme-customizer: dictionaries')

        // Global stylesheet (wallpaper + composer font + settings-page styles).
        const style = document.createElement('style')
        style.textContent = THEME_CSS
        document.head.appendChild(style)
        ctx.effect(() => () => { style.remove() }, 'theme-customizer: stylesheet')

        // Token override layer (theme-service tokens, light/dark aware): the
        // wallpaper's surface translucency and the accent color.
        let tokensDispose = null
        const applyTokens = (s) => {
          if (tokensDispose) { tokensDispose(); tokensDispose = null }
          const tokens = {}
          if (s.wallpaper) {
            const opacity = Math.max(0, Math.min(100, Number(s.wallpaperOpacity) || 0))
            const alpha = (100 - opacity) / 100
            tokens['--dsw-alias-bg-base'] = {
              light: `rgba(255, 255, 255, ${alpha})`,
              dark: `rgba(21, 21, 23, ${alpha})`,
            }
            tokens['--dsw-specific-sidebar-fill'] = {
              light: `rgba(249, 250, 251, ${alpha})`,
              dark: `rgba(27, 27, 28, ${alpha})`,
            }
          }
          if (s.accentLight || s.accentDark) {
            tokens['--dsw-alias-brand-primary'] = {
              light: s.accentLight || DEFAULT_ACCENT_LIGHT,
              dark: s.accentDark || s.accentLight || DEFAULT_ACCENT_DARK,
            }
          }
          if (Object.keys(tokens).length > 0) {
            tokensDispose = theme.overrideTokens('theme-customizer', tokens)
          }
        }

        const applyEffects = (s) => {
          if (s.wallpaper) {
            body.style.setProperty('--theme-customizer-wallpaper-image', cssUrl(s.wallpaper))
          } else {
            body.style.removeProperty('--theme-customizer-wallpaper-image')
          }
          if (s.composerFont) {
            body.style.setProperty('--theme-customizer-composer-font', normalizeFontFamily(s.composerFont))
          } else {
            body.style.removeProperty('--theme-customizer-composer-font')
          }
          applyTokens(s)
        }

        const sync = () => { applyEffects(readSettings(form)) }
        const unsubscribe = form.subscribe(sync)
        ctx.effect(() => () => {
          unsubscribe()
          if (tokensDispose) { tokensDispose(); tokensDispose = null }
        }, 'theme-customizer: config subscription')
        sync()

        // Reactive global-font value from the shared theme service.
        let globalFont = theme.getTheme().fontFamilies.text
        const globalListeners = new Set()
        const onThemeChange = () => {
          const next = theme.getTheme().fontFamilies.text
          if (next !== globalFont) {
            globalFont = next
            globalListeners.forEach((listener) => listener())
          }
        }
        ctx.on('theme/change', onThemeChange)
        const useGlobalFont = () => {
          const [value, setValue] = React.useState(globalFont)
          React.useEffect(() => {
            const listener = () => { setValue(globalFont) }
            globalListeners.add(listener)
            return () => { globalListeners.delete(listener) }
          }, [])
          return value
        }

        // Register the Theme settings page.
        const t = ctx.locale.bind(NS)
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: ENTRY_ID,
          order: 5,
          label: () => t('nav'),
          locale: NS,
          inject: () => ({ form, theme, useGlobalFont }),
        }, ThemeSection))
      },
    }
  },
})
