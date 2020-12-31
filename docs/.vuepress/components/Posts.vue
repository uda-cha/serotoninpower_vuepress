// Posts.vue
<template>
  <div>
    <Post v-for="(post, index) in posts" :key="index" v-bind="post" />
  </div>
</template>
<script>
export default {
  props: {
    limit: Number,
  },
  computed: {
    posts() {
      let res = this.$site.pages
          .filter((post) => post.path.match(/^\/archives\/\d/))
          .sort((a, b) => (
            new Date(b.frontmatter.date) - new Date(a.frontmatter.date)),
          );
      if ( typeof this.limit !== 'undefined' ) {
        res = res.slice(0, this.limit);
      };
      return res;
    },
  },
};
</script>
