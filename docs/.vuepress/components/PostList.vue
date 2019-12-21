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
