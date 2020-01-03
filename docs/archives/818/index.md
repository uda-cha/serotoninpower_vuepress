---
title: '[VuePress]カテゴリ一覧を作る(with クエリストリング)'
description: "プラグインやvuexを使わずに、このブログにカテゴリ一覧機能を実装しました。その作業メモ。"
author: seroto_nin
type: post
date: 2020-01-03T16:02:08+09:00
url: /archives/818
categories:
  - Vue.js
  - VuePress
---

# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## 普通にVuePressにカテゴリ一覧を実装する場合

[vuepress-plugin-blog](https://github.com/vuepressjs/vuepress-plugin-blog)を使った方が楽です。流し読みした感じ、プラグインを入れるだけでカテゴリ一覧を`this.$categories.list`で取得できたりと楽そうな感じです。

今回はVue.jsの勉強のため自力で実装しました。あとWordPressの二の舞にならないようあんまりプラグインに頼りたくなかったというのもあります(VuePress公式が出しているプラグインなのでメンテが放置されることはなさそうでしたが)。

## 実装方針

* カテゴリは各記事のマークダウンのfrontmatterに記載されているものとする。↓のような感じで。
```yaml
---
(~snip~)
categories:
  - Vue.js
  - VuePress
(~snip~)
```
* カテゴリ一覧ページを作り、全記事のカテゴリとその記事数を表示させる
  * カテゴリをクリックすると、そのカテゴリを持つ記事のみがフィルタされて表示されるようにする
* カテゴリはカテゴリ一覧ページだけでなく、各記事の個別ページや、記事一覧ページにも
表示させる
  * そのカテゴリがクリックされた場合、カテゴリ一覧ページに遷移し、クリックされたカテゴリを持つ記事のみをフィルタして表示するようにする
  * ページ遷移時のデータ受け渡しはクエリストリングでやる(vuexやダミーのvueインスタンスを生成してのイベントバスなど使うまでもなさそうなので & URLで共有できるのがやっぱいいかなと)

## 完成したページ

ここ！　だいぶブログっぽくなってきた。

[categories](/categories/)

## categories/index.md

カテゴリ一覧ページです。`Categories`コンポーネントがおいてあるだけ。

```md
<Categories />
```

## .vuepress/components/Categories.vue

`categories()`でカテゴリ一覧をつくります。全記事の`frontmatter.categories`をぶんまわすだけ。各カテゴリはbuttonとして表示させ、buttonがクリックされたときに`toggleSelectedCategories(c)`を呼び出して、クエリストリングの操作を行います。

クエリストリングの値を見て、`selectedPosts()`で該当する記事をフィルターして返します。

趣味ですが`<transition-group>`でアニメーションをつけています。

```vue
// Categories.vue
<template>
  <div>
    <div>
      <ul class="categories">
        <li class="category" v-for="(value, key) in categories" :key="key">
          <button
            v-on:click="toggleSelectedCategories(key)"
            v-bind:class="{active: isActive(key)}"
          >
            {{ key }} ({{ value }})
          </button>
        </li>
      </ul>
    </div>
    <transition-group tag="div">
      <div v-for="(post) in selectedPosts" :key="post.key">
        <h2>
          <router-link v-bind:to="post.path">{{post.title}}</router-link>
        </h2>
        <Date v-bind:input_date=post.frontmatter.date />
        <ShowCategoriesOfPost
          v-bind:input_categories=post.frontmatter.categories
        />
        <p>{{post.frontmatter.description}}</p>
        <router-link v-bind:to="post.path">続きを読む</router-link>
      </div>
    </transition-group>
  </div>
</template>
<script>
export default {
  methods: {
    toggleSelectedCategories: function(c) {
      const query = Object.assign({}, this.$route.query);
      if (query.category && query.category.includes(c)) {
        delete query.category;
      } else {
        query.category = c;
      };
      this.$router.push({query: query});
    },
  },
  computed: {
    categories() {
      const res = {};
      const post = this.$site.pages
          .filter((post) => typeof post.frontmatter.categories !== 'undefined');

      Object.keys(post).forEach(function(p) {
        Object.keys(post[p].frontmatter.categories).forEach(function(c) {
          if (res[post[p].frontmatter.categories[c]]) {
            res[post[p].frontmatter.categories[c]]++;
          } else {
            res[post[p].frontmatter.categories[c]] = 1;
          };
        });
      });

      return res;
    },
    selectedPosts() {
      if (!this.$route.query.category) {
        return;
      };
      const res = this.$site.pages
          .filter((post) => post.path.match(/^\/archives\/\d/))
          .filter((post) => post.frontmatter.categories.some((c) =>
            this.$route.query.category.includes(c)))
          .sort((a, b) =>
            new Date(b.frontmatter.date) - new Date(a.frontmatter.date));

      return res;
    },
    isActive: function() {
      return function(c) {
        if (!this.$route.query.category) {
          return false;
        } else {
          return this.$route.query.category.includes(c);
        };
      };
    },
  },
};
</script>
<style lang="stylus" scoped>
.categories
  display: inline-block
  padding-inline-start: 0
  margin: 0.1rem

  .category
    display: inline-block
    margin: 0.1rem

    button
      background-color: #FFF
      border-color:  #c2d6ba
      border-radius: 8px
      color: #333
      line-height: 1.5
      padding: 5px 10px

      &.active
        background-color: #c2d6ba

.v-enter-active
  transition: all .5s ease

.v-leave-active
  transition: all .5s cubic-bezier(1.0, 0.5, 0.8, 1.0)

.v-enter, .v-leave-to
  transform: translateX(10px)
  opacity: 0
</style>

```

## .vuepress/components/ShowCategoriesOfPost.vue

> * カテゴリはカテゴリ一覧ページだけでなく、各記事の個別ページや、記事一覧ページにも
表示させる
>   * そのカテゴリがクリックされた場合、カテゴリ一覧ページに遷移し、クリックされたカテゴリを持つ記事のみをフィルタして表示するようにする

この部分の実装です。クエリストリングを渡しつつページ遷移するだけです。

`categories()`では、propsでカテゴリ一覧が配列で渡されたときはそれを、propsで何も渡ってこなかったらこのコンポーネントが呼び出されたマークダウンファイルの`frontmatter.categories`を、それぞれカテゴリ一覧として扱うようにしています。前者は記事一覧ページなどで、後者は各記事の個別ページで使っています。

```vue
// ShowCategoriesOfPost.vue
<template>
  <span>
    <ul class="categories">
      <li class="category" v-for="(category, index) in categories" :key="index">
        <span>
          <router-link
            v-bind:to="{path: '/categories/', query: { category: category }}">
              {{category}}
          </router-link>
        </span>
      </li>
    </ul>
  </span>
</template>
<script>
export default {
  props: {
    input_categories: Array,
  },
  computed: {
    categories() {
      if ( typeof this.input_categories !== 'undefined' ) {
        return this.input_categories;
      } else {
        return this.$page.frontmatter.categories;
      };
    },
  },
};
</script>
//styleは省略
```

## ハマったところ

### transition-group内でv-forで回している際にアニメーションがうまく反映されない

v-forで回したい要素`selectedPosts`自体に変更があった際にうまくアニメーションが反映されず悩んでいました。

初歩的なミスで、Vue.jsがDOMの変更を検知できるよう、`v-bind:key`を変更が起きた際にも一意になるような値(なんでもいい)にしてやればOkでした。

↓`:key="post.key"`が`:key="index"`だとダメでした。

```vue{2}
    <transition-group tag="div">
      <div v-for="(post) in selectedPosts" :key="post.key">
        <h2>
          <router-link v-bind:to="post.path">{{post.title}}</router-link>
        </h2>
        <Date v-bind:input_date=post.frontmatter.date />
        <ShowCategoriesOfPost
          v-bind:input_categories=post.frontmatter.categories
        />
        <p>{{post.frontmatter.description}}</p>
        <router-link v-bind:to="post.path">続きを読む</router-link>
      </div>
    </transition-group>
```

### computedで引数が使えない

これ知らなかった。なんでなんでしょうね？ computedに関数を返す関数を代入して、そこで引数を取ればとりあえず動きます。

```vue
<script>
  computed: {
    isActive: function() {
      return function(c) {
        if (!this.$route.query.category) {
          return false;
        } else {
          return this.$route.query.category.includes(c);
        };
      };
    },
  },
</script>
```

でもあんまり良いやり方じゃないっぽい。ESLintでもthisが不定になるからやめんかいってエラーでます。そのうち直します。


```bash
$ docker-compose run --rm node npx eslint docs/.vuepress/components/* --no-ignore

/app/docs/.vuepress/components/Categories.vue
  77:14  error  Unexpected 'this'  no-invalid-this
  80:18  error  Unexpected 'this'  no-invalid-this

✖ 2 problems (2 errors, 0 warnings)
```

## 所感

あとはコメント機能を実装すれば大体VuePressでやりたいことは完成な感じです。ただ各コンポーネントをもっと小さい単位に分けたほうがいいんでしょうね。メンテしづらかったです。

フロントエンドは目で見てすぐ結果がわかるので楽しいですね。

