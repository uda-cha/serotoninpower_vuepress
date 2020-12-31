// Categories.vue
<template>
  <div>
    <div>
      <ul class="categories">
        <li class="category"
          v-for="(num, name) in categoryNameAndNumber"
          v-bind:key="name">
          <Category v-bind:categoryName="name" v-bind:categoryNumber="num" />
        </li>
      </ul>
    </div>
    <transition-group tag="div">
      <Post v-for="(post, index) in selectedPosts" :key="index" v-bind="post" />
    </transition-group>
  </div>
</template>
<script>
export default {
  computed: {
    categoryNameAndNumber() {
      const res = {};
      const post = this.$site.pages
          .filter((post) => typeof post.frontmatter.categories !== 'undefined');

      Object.keys(post).forEach(function(p) {
        Object.keys(post[p].frontmatter.categories).forEach(function(c) {
          res[post[p].frontmatter.categories[c]] =
            (res[post[p].frontmatter.categories[c]] || 0) + 1;
        });
      });
      return res;
    },
    selectedPosts() {
      if (!this.$route.query.category) {
        return;
      };
      return this.$site.pages
          .filter((post) => post.path.match(/^\/archives\/\d/))
          .filter((post) => post.frontmatter.categories.some((c) =>
            this.$route.query.category.includes(c)))
          .sort((a, b) =>
            new Date(b.frontmatter.date) - new Date(a.frontmatter.date));
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
    margin: 0.25rem

.v-enter-active
  transition: all .5s ease

.v-leave-active
  transition: all .5s cubic-bezier(1.0, 0.5, 0.8, 1.0)

.v-enter, .v-leave-to
  transform: translateX(10px)
  opacity: 0
</style>
