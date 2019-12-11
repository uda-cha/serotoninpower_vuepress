// .vuepress/config.js
module.exports = {
  title: 'せろとにんぱわー.',
  description: 'IT系のブログ。インフラやミドルウェア周りの話が多め。',
  locales: {
    '/': {
      lang: 'ja'
    }
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  themeConfig: {
    sidebar: 'auto',
    sidebarDepth: 6
  },
  markdown: {
    lineNumbers: true
  }
}
