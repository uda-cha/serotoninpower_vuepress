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
    ['meta', { name: 'og:title', content: 'せろとにんぱわー.' }],
    ['meta', { name: 'og:description', content: 'インフラやミドルウェア周りの話が多め。' }],
    ['meta', { name: 'og:image', content: 'https://www.serotoninpower.club/og.jpg' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:site', content: 'https://www.serotoninpower.club/' }]
  ],
  globalUIComponents: [
    'MyFooter',
  ],
  themeConfig: {
    sidebar: 'auto',
    sidebarDepth: 6,
    smoothScroll: true,
    activeHeaderLinks: true,
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Archives', link: '/archives/' },
      { text: 'GitHub', link: 'https://github.com/uda-cha' },
      { text: 'Feeds', link: '/feeds/' }
    ]
  },
  markdown: {
    lineNumbers: true
  },
  plugins: {
    '@vuepress/back-to-top': {},
    'sitemap': {
      hostname: 'https://www.serotoninpower.club/'
    },
    'feed': {
       canonical_base: 'https://www.serotoninpower.club/',
       posts_directories: ['/archives/'],
       sort: entries  => entries.sort((a, b) => b.frontmatter.date - a.frontmatter.date)
    }
  }
}
