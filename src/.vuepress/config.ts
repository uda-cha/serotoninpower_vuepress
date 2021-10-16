import { defineUserConfig } from 'vuepress'
import type { DefaultThemeOptions } from 'vuepress'

import { path } from '@vuepress/utils'

export default defineUserConfig<DefaultThemeOptions>({
  title: 'せろとにんぱわー.',
  description: 'インフラやミドルウェア周りの話が多め。',
  locales: {
    '/': {
      lang: 'ja'
    }
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    //['meta', { name: 'og:url', content: 'https://www.serotoninpower.club/' }],
    //['meta', { name: 'og:type', content: 'website' }],
    //['meta', { name: 'og:title', content: 'せろとにんぱわー.' }],
    //['meta', { name: 'og:description', content: 'インフラやミドルウェア周りの話が多め。' }],
    ['meta', { name: 'og:image', content: 'https://www.serotoninpower.club/og.jpg' }],
    //['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:site', content: 'https://www.serotoninpower.club/' }]
  ],
  clientAppRootComponentFiles: path.resolve(__dirname, 'components/MyFooter.vue'),
  themeConfig: {
    sidebar: 'auto',
    sidebarDepth: 6,
    smoothScroll: true,
    activeHeaderLinks: true,
    navbar: [
      { text: 'Home', link: '/' },
      { text: 'Archives', link: '/archives/' },
      { text: 'Categories', link: '/categories/' },
      { text: 'GitHub', link: 'https://github.com/uda-cha' },
      { text: 'Feeds', link: '/feeds/' }
    ]
  },
  markdown: {
    code: {
      lineNumbers: true
    }
  },
  plugins: [
    [
      '@vuepress/register-components', {
        componentsDir: path.resolve(__dirname, './components')
      }
    ],
    [
      '@vuepress/google-analytics', {
        id: 'UA-155107742-1',
      },
    ],
//    [
//      'sitemap', {
//        hostname: 'https://www.serotoninpower.club/',
//        exclude: ['/404.html'],
//      },
//    ],
//    [
//      'feed', {
//         canonical_base: 'https://www.serotoninpower.club/',
//         posts_directories: ['/archives/'],
//         sort: entries  => entries.sort((a, b) => b.frontmatter.date - a.frontmatter.date)
//      },
//    ],
//    [
//      'autometa', {
//        site: {
//          name   : 'せろとにんぱわー.',
//        },
//        image: false,
//        image_sources: [
//          'frontmatter',
//          /<img.*?src=['"](.*?)['"]/i,
//        ],
//        canonical_base: 'https://www.serotoninpower.club/',
//      }
//    ]
  ],
  bundler: '@vuepress/bundler-webpack',
  bundlerConfig: {
    evergreen: true
  }
})
