import { nextTick } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Entity from './Entity.vue'
import Field from './Field.vue'
import './custom.css'

function hashId(): string {
  const raw = location.hash.replace(/^#/, '')
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Open a collapsed section when the URL points at a heading inside it. */
function revealHashTarget(): boolean {
  const id = hashId()
  if (!id) return false
  const target = document.getElementById(id)
  if (!target) return false
  let opened = false
  let node = target.parentElement
  while (node) {
    if (node instanceof HTMLDetailsElement && !node.open) {
      node.open = true
      opened = true
    }
    node = node.parentElement
  }
  return opened
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('Entity', Entity)
    app.component('Field', Field)

    if (typeof window === 'undefined') return

    window.addEventListener('hashchange', () => {
      revealHashTarget()
    })

    const previous = router.onAfterRouteChange
    router.onAfterRouteChange = (href) => {
      previous?.(href)
      nextTick(() => {
        if (!revealHashTarget()) return
        const id = hashId()
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView()
        })
      })
    }
  }
} satisfies Theme
