// Posts.vue
<template>
  <div>
    <Post v-for="(post, index) in posts" :key="index" v-bind="post" />
  </div>
</template>
<script>
export default {
  props: {
    limit: {
      type: Number,
      default: Infinity,
    },
  },
  computed: {
    posts() {
      return this.$site.pages
          .filter((p) => p.path.match(/^\/archives\/\d/))
          .sort((a, b) => (
            new Date(b.frontmatter.date) - new Date(a.frontmatter.date)),
          )
          .slice(0, this.limit);
    },
  },
};
</script>
