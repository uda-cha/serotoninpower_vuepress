// PostList.vue
<template>
  <div>
    <div v-for="(post, index) in posts" :key="index">
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
  </div>
</template>
<script>
export default {
  props: {limit: Number},
  computed: {
    posts() {
      let res = this.$site.pages
          .filter((post) => post.path.match(/^\/archives\/\d/))
          .sort((a, b) => (
            new Date(b.frontmatter.date) - new Date(a.frontmatter.date)),
          );
      if ( this.limit != undefined ) {
        res = res.slice(0, this.limit);
      };
      return res;
    },
  },
};
</script>
