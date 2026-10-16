import { defineConfig } from 'vitepress'
import { entityFieldColors } from './entity-field-colors'

export default defineConfig({
  markdown: {
    codeTransformers: [entityFieldColors()]
  },
  title: 'Chilibase',
  description: 'Fullstack framework for model-driven apps — React, NestJS, TypeORM, PostgreSQL.',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,
  srcExclude: ['README.md'],

  themeConfig: {
    siteTitle: 'Chilibase',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Features', link: '/features/browse' },
      { text: 'Reference', link: '/reference/packages' },
      {
        text: '0.7.0',
        items: [
          { text: 'GitHub', link: 'https://github.com/chilibase/chilibase' },
          { text: 'Car demo', link: 'https://github.com/chilibase/car-demo' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Concepts', link: '/guide/concepts' },
            { text: 'Architecture', link: '/guide/architecture' },
          ]
        }
      ],
      '/features/': [
        {
          text: 'Features',
          items: [
            { text: 'Browse / lazy table', link: '/features/browse' },
            { text: 'Forms', link: '/features/forms' },
            { text: 'Autocomplete', link: '/features/autocomplete' },
            { text: 'Files', link: '/features/files' },
            { text: 'Authentication', link: '/features/auth' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Packages', link: '/reference/packages' },
            { text: 'Environment variables', link: '/reference/environment' },
            { text: 'Database', link: '/reference/database' },
            { text: 'Conventions', link: '/reference/conventions' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/chilibase/chilibase' }
    ],

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/chilibase/chilibase/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    outline: [2, 3],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025–2026 Michal Rakus'
    }
  }
})
