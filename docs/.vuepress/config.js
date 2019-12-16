// .vuepress/config.js
module.exports = {
  title: 'せろとにんぱわー.',
  description: 'インフラやミドルウェア周りの話が多め。',
  locales: {
    '/': {
      lang: 'ja'
    }
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'og:url', content: 'https://www.serotoninpower.club/' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'せろとにんぱわー' }],
    ['meta', { name: 'og:description', content: 'インフラやミドルウェア周りの話が多め。' }],
    ['meta', { name: 'og:image', content: '/favicon.ico' }]
  ],
  themeConfig: {
    sidebar: 'auto',
    sidebarDepth: 6,
    smoothScroll: true,
    activeHeaderLinks: true,
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Archives', link: '/archives/' },
      { text: 'GitHub', link: 'https://github.com/uda-cha' }
    ]
  },
  markdown: {
    lineNumbers: true
  }
}
