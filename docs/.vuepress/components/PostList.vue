// PostList.vue
<template>
  <div>
    <div v-for="post in posts">
      <h2><a v-bind:href="post.path">{{post.title}}</a></h2>
      <ul class="categories">
        <li class="category" v-for="category in post.frontmatter.categories">
          <span>{{category}}</span>
        </li>
      </ul>
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
        .filter(post => post.path.startsWith('/archives/'))
        // dateに設定した日付の降順にソートする
        .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));
      if ( this.limit != undefined ) {
        res = res.slice(0, this.limit);
      };
      return res;
    }
  }
}
</script>
<style lang="stylus" scoped>
.categories {
  padding-inline-start: 0;

  .category {
    display: inline-block;
    margin: 0 10px 5px;

    span {
      background-color: #c2d6ba;
      border-radius: 3px;
      color: #333;
      line-height: 1.5;
      padding: 5px 10px;
    }
  }
}
</style>
