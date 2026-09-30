import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Entity from './Entity.vue'
import Field from './Field.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Entity', Entity)
    app.component('Field', Field)
  }
} satisfies Theme
