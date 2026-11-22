/**
 * Host half of the theme-customizer bundle.
 *
 * The theme values are live-editable user preferences: the Config schema
 * declares every field `.volatile()` so the settings forms service exposes
 * them to the browser without a plugin restart, and the Client half reads and
 * writes them through `ctx.configForms`. The Host only opts the entry out of
 * the auto-generated settings page, because the Client registers its own
 * `settings.section` page.
 */
import z from '@deepseek-ai/schemastery'

export const Config = z.object({
  /** Background image for the conversation area: an http(s) URL or a data URL. */
  wallpaper: z.string().default('').volatile(),
  /** Wallpaper transparency in percent (100 = fully visible, 0 = hidden). */
  wallpaperOpacity: z.number().step(1).min(0).max(100).default(40).volatile(),
  /** Message-composer font family list; empty keeps the built-in stack. */
  composerFont: z.string().default('').volatile(),
  /** Brand accent color for the light palette; empty keeps the default. */
  accentLight: z.string().default('').volatile(),
  /** Brand accent color for the dark palette; empty keeps the default. */
  accentDark: z.string().default('').volatile(),
})

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
}
