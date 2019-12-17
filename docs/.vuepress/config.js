// .vuepress/config.js
const feed_options = {
  canonical_base: 'https://www.serotoninpower.club/',
  posts_directories: '/archives/',
  feeds: {
    atom1: { enable: false },
    json1: { enable: false },
    rss2: {
      enable: true,
      file_name: 'rss.xml',
      head_link: {
        enable: true,
        type: 'application/rss+xml',
        title : '%%site_title%% RSS Feed',
      }
    }
  }
};

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
    ['meta', { name: 'og:image', content: '/og.jpg' }],
    ['meta', { name: 'twitter:card', content: 'Summary Card' }],
    ['meta', { name: 'twitter:site', content: 'https://www.serotoninpower.club/' }]
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
  },
  plugins: {
    'sitemap': {
      hostname: 'https://www.serotoninpower.club/'
    },
    'feed': {
       feed_options
    }
  }
}
