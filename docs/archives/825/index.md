---
title: 'Railsでコメント機能を作ってVuePressにiframeで表示してみた'
description: "vuepressで作ったこのブログにコメント機能を実装しました。Railsで。iframeで。その作業メモ。"
author: seroto_nin
type: post
date: 2020-02-17T23:51:08+09:00
url: /archives/825
categories:
  - Ruby
  - Rails
  - Vue.js
  - VuePress
---

# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## 静的ファイルジェネレータでコメントのCRUDをやりたい

ブログと言ったらコメント機能ほしいじゃないですか。たとえ誰からもコメントが来なくても。

ただこのブログは静的ファイルジェネレータ`VuePress`で作成しています。動的にコンテンツを作成したり表示することができません。さぁどうするか。

## Railsで作ってiframeで埋め込めばいいじゃない

なのでコメントのCRUD操作を行うアプリケーションをRailsで自作しました。それをiframeで`VuePress`に埋め込みました。

リポジトリはここ！

[serotoninpower_cms](https://github.com/uda-cha/serotoninpower_cms)

コメントのCRUDとその管理画面があるだけの超単純なアプリケーションです。herokuの無料プランで動かしています。ドメインすら取得していない。

一番面倒だったのはiframe絡みのHTTPヘッダやCookieのセキュリティ設定。「あれ面倒じゃね？」って思ったときに引き返しておけばよかった。

## iframeを埋め込むVueコンポーネントを作ってVuePressで使う

こんなコンポーネントを作りました。

* .vuepress/components/Comments.vue

```vue
// Comments.vue
<template>
  <iframe
    id="comentFrame"
    v-bind:src="get_ifram_src_url"
    frameborder="0"
    height="800px"
    width="100%"
    >
    コメントを表示するには iframe 機能を有効にして下さい
  </iframe>
</template>
<script>
export default {
  computed: {
    get_ifram_src_url: function() {
      const url =
        'https://serotoninpower-cms.herokuapp.com/posts/' +
        this.$page.regularPath.split('/').slice(-2)[0] +
        '/comments/wrapper';
      return url;
    },
  },
};
</script>
```

悲しいのがiframeの高さをコンテンツに合わせて自動調整できないこと。`height="800px"`で決め打ちです。

親コンテンツのJavaScriptで、埋め込んだiframeのDOMにアクセスしないと、そもそもiframeの高さを取得できないので、それってどうなのってことでやめました。

iframeはやめておいた方がいい。

## 結論

* 静的ファイルジェネレータやめよう。Nuxt.js(SSR) + Rails(APIモード)で作ろう。
* どうしても静的ファイルジェネレータを使いたいなら[disqus](https://disqus.com/)みたいなSaas使おう。

負債を増やしてしまった気がしますが、自分ひとりで初めてRailsアプリをデプロイまでやれたからまぁよかったかな。。。

---

<Comments />
