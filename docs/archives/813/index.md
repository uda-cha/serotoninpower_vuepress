---
title: 'WordPress & VPS から VuePress & Firebase に移行しました'
description: "元々このブログは、VPSを借りてそこにLAMPスタックをスタンドアロンで構築してWordPressを運用していました。でもWordPressの運用がいやになったので、今はやりの静的サイトジェネレータに移行しました。"
author: seroto_nin
type: post
date: 2019-12-22T02:02:08+00:00
url: /archives/813
categories:
  - WordPress
  - Vue.js
  - VuePress
  - Firebase

---
# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## WordPressをやめるという決断

私はITの世界で働き始めてわりとすぐにこのWordPressの運用を始めました。OSのセットアップから何まで全部自分でやって、相当多くのことを学べました。愛着も結構あります。

しかし、もうスタンドアロンのLAMP構成のサーバで学べることは少なくなってきたことと、以下のWordPressの運用の手間を考え、WordPressをやめました。

## WordPressが嫌になった理由

* セキュリティがしんどい
  * sshとかWordPressの管理画面へのブルートフォースとか。
* 脆弱性への対処がしんどい
  * Apacheはまだしも、PHPやWordPressの脆弱性の出る頻度が多すぎました。
* プラグインの管理がしんどい
  * 使っているプラグインが、PHPやWordPressのバージョンアップのたびに動かなくなって、バージョンを戻したり代替となるプラグインを探して動作確認したり……。
* WordPressのプログラム構成がしんどい
  * 自分でプラグイン作ろうとか、WordPressの根本に手を入れようと思ったときに、MVC構成ではなくほぼスパゲッティなWordPressのプログラムとしての構成がしんどかったです。

## 静的サイトジェネレータを使うという決断

WordPressやめるかとなったときに何に移住するか考えました。

* マネージドサービス(Qiitaやはてなブログとか)への移行
  * やっぱり自分で作ったモノを自分で動かすのって楽しいよねってことでボツ。
* WordPress以外のCMS(RefineryCMSとか)への移行
  * 気力がなかった。
* Railsとかで自分で一からブログアプリを作る
  * 気力が全然なかった。
* 静的サイトジェネレータ
  * DB管理いらない？ マークダウンで記事を書ける？ 静的ファイルをホスティングするだけなので管理画面をWeb公開する必要がない？ gitリポジトリで記事を管理できる？ おまけに簡単？ **神！**

ちなみに私は｢これ簡単そう！｣って思って始めたことが本当に簡単だったことがありません。

## どの静的サイトジェネレータを使おうかな

一番人気なのはHugo(golang製)かなと思います。ただ、私は自分のスキルセットにフロントエンドの文字が一文字もなかったので、ついでにフロントエンドの勉強もしようと思い、JS製の静的サイトジェネレータをいろいろ探しました。

* [Gatsby.js](https://www.gatsbyjs.org/)
* [Hexo.js](https://hexo.io/)
* [VuePress](https://vuepress.vuejs.org/)

いろいろあったのですが、三大JSフレームワークで一番シンプルと言われてるvue.js製のVuePressにしました。

デフォルトのテーマも一番おしゃれだと(私は)思っています。マークダウンファイル中に直接vueコンポーネント書けるのもvue.jsの勉強によさそうです。

## VuePressやってみた

リポジトリはここ！

[uda-cha/serotoninpower_vuepress](https://github.com/uda-cha/serotoninpower_vuepress)

おおまかな使い方は[VuePress公式](https://vuepress.vuejs.org/guide/)を読めば大体わかります。面倒だった or はまったところを書いていきます。

ちなみに意地でもデフォルトテーマのまま行きます。`eject`もしません。

::: tip
VuePressでは、デフォルトのテーマを改造したいときは、そのデフォルトテーマを`eject`してファイルに吐き出す必要があります。吐き出したら最後、公式のデフォルトテーマのアップデート等は適用されません(手でやる必要がある)。

[https://vuepress.vuejs.org/theme/default-theme-config.html#ejecting](https://vuepress.vuejs.org/theme/default-theme-config.html#ejecting)

:::

### WordPressから記事をマークダウンで吐き出す

WordPressからVuePressに記事を移行するにあたり、DBからダンプとかはしたくなかったのでいろいろ調べました。

元々hugo用なのですが、WordPressから記事をマークダウンで吐き出してくれるWordPressプラグインがありました。

[SchumacherFM/wordpress-to-hugo-exporter](https://github.com/SchumacherFM/wordpress-to-hugo-exporter)

特にこだわりがなければ、吐き出したマークダウンファイルをそのままVuePressで使えます。私は過去のWordPressのパーマリンクをそのままVuePressでも扱えるようにしたため、ファイル名やディレクトリ構成だけ変えました。

### 記事一覧を表示するvueコンポーネントを作る

元々VuePressはブログ用ではなくドキュメントサイト用っぽいので、記事一覧を表示する機能がありません。vueコンポーネントで自作します。

* 各記事のタイトル(`title`)と概要(`description`)を、各記事のマークダウンファイルの`frontmatter`から取得します。
* 各記事の日付とカテゴリの取得は、他の箇所でも使いたかったので、別なコンポーネント`CategoriesAndDate.vue`に切り出しています(後述)。
* `limit`属性を受け入れ、デフォルトでは全ての記事の一覧を、`limit`属性が指定されたときはその記事数分を表示するようにしています。
* `続きを読む`で各記事へリンクを貼っています。

`PostList.vue`

```js
// PostList.vue
<template>
  <div>
    <div v-for="post in posts">
      <h2><a v-bind:href="post.path">{{post.title}}</a></h2>
      <CategoriesAndDate
        v-bind:input_date=post.frontmatter.date
        v-bind:input_categories=post.frontmatter.categories
      />
      <p>{{post.frontmatter.description}}</p>
      <a v-bind:href="post.path">続きを読む</a>
    </div>
  </div>
</template>
<script>
export default {
  props: { limit: Number },
  computed: {
    posts() {
      let res = this.$site.pages
        // archivesディレクトリ以下を投稿記事一覧表示の対象とする
        .filter(post => post.path.match(/^\/archives\/\d/))
        // dateに設定した日付の降順にソートする
        .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));
      if ( this.limit != undefined ) {
        res = res.slice(0, this.limit);
      };
      return res;
    }
  },
}
</script>
```

作ったコンポーネントは、`docs/.vuepress/components/`においておきます。すると、マークダウンから直接コンポーネントを呼び出すことができます。便利。

```md
<PostList v-bind:limit="3"/>
```

### 記事の日付とカテゴリを出力するコンポーネントを作る

`PostList.vue`から呼んだり、各記事のページから読んだりするので別コンポーネントに分けたやつです。

VuePressはデフォルトで`Stylus`が使えます。私ポストCSSは`Sass`しか触ったことなかったんですけどいいですねこれ。`npm install -D sass-loader node-sass`すれば`Sass`も使えます。

`CategoriesAndDate.vue`

```js
// CategoriesAndDate.vue
<template>
  <div>
    <span class="date">{{ date | moment }}</span>
    <ul class="categories">
      <li class="category" v-for="category in categories">
        <span>{{category}}</span>
      </li>
    </ul>
  </div>
</template>
<script>
import moment from 'moment';
export default {
  props: {
    input_date: String,
    input_categories: Array,
  },
  computed: {
    date() {
      if ( typeof this.input_date !== 'undefined' ) {
        return this.input_date;
      } else {
        return this.$page.frontmatter.date;
      };
    },
    categories() {
      if ( typeof this.input_categories !== 'undefined' ) {
        return this.input_categories;
      } else {
        return this.$page.frontmatter.categories;
      };
    },
  },
  filters: {
    moment: function (date) {
        return moment(date).format('YYYY/MM/DD');
    }
  }
}
</script>
<style lang="stylus" scoped>
.date
  display: inline-block

.categories
  display: inline-block
  padding-inline-start: 0

  .category
    display: inline-block
    margin: 0 10px 5px

    span
      background-color: #c2d6ba
      border-radius: 3px
      color: #333
      line-height: 1.5
      padding: 5px 10px
</style>
```

### 全ページ共通のフッターを作る

↓を読む限り、どうやらデフォルトテーマには全ページ共通のフッターを作る機能はなく、ホームページに設定(`home: true`)したページにしか共通フッターを設定できないっぽいです。

[https://vuepress.vuejs.org/theme/default-theme-config.html#homepage](https://vuepress.vuejs.org/theme/default-theme-config.html#homepage)

のでvueコンポーネントを作り、[globalUIComponents](https://vuepress.vuejs.org/plugin/option-api.html#globaluicomponents)に設定します。

`MyFooter.vue`

```js
// MyFooter.vue
<template>
<div class="footer">
    Copyright 2017-2019 @uda-cha
</div>
</template>
<style lang="stylus" scoped>
.footer
  border-top: 1px solid #eaecef
  margin: auto
  padding: .8rem 1.6rem
  text-align: center
</style>
```

`coinfig.js`

```js
module.exports = {
//(~snip~)
  globalUIComponents: [
    'MyFooter',
  ],
//(~snip~)
}
```

### sitemap.xmlを作る

ありがたいことにプラグインがあります。

[ekoeryanto/vuepress-plugin-sitemap](https://github.com/ekoeryanto/vuepress-plugin-sitemap)

### RSSとかのFeedを作る

これまたありがたいことにプラグインがあります。

[webmasterish/vuepress-plugin-feed](https://github.com/webmasterish/vuepress-plugin-feed)

Feedに載せる記事数は、`feed_options`の`count`で指定できますが、この数を超えると、デフォルトでは古い記事から数えて`count`の数がFeedに乗り、新しい記事がまったく乗らなくなります。

`sort`オプションがあるので、これで日付順に新しい順でソートします。

```js
sort: entries => entries.sort((a, b) => b.frontmatter.date - a.frontmatter.date)
```

## 感想

DBやミドルウェアの管理から解放されるのは素晴らしいですね。しかも静的ファイルなのでページ遷移が爆速。テーマも綺麗。記事もリポジトリ管理できる。乗り換えてよかった。

一つうーんって思ったのは、VuePressの過去issueとかを読む感じ、｢ちょっとだけデフォルトテーマやをカスタマイズしたい｣という要望には不寛容な点です。

[https://github.com/vuejs/vuepress/issues/207](https://github.com/vuejs/vuepress/issues/207)

`eject`しちゃったらバージョンアップが面倒なので、ファイル単位でオーバーライドする機能があってもいいのかなぁとは思いました。でも結局ちょっとでもカスタマイズしたらテーマの整合性は担保できなくなるから`eject`せんかいってのもわかる。

私はしばらく`eject`せずにデフォルトテーマのまま行きます。

## 今後やりたいこと

* カテゴリによる記事検索機能の追加
* コメント機能の追加(いるか？)
