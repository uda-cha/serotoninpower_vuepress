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
  data: function() {
    posts: Array;
    return {
      posts: [],
    };
  },
  computed: {
    categoryNameAndNumber() {
      return this.posts
          .map((p) => p.frontmatter.categories)
          .flat()
          .reduce((res, current) => {
            res[current] = (res[current] || 0) + 1;
            return res;
          }, {});
    },
    selectedPosts() {
      return this.posts
          .filter((p) => this.$route.query.category)
          .filter((p) => p.frontmatter.categories.some((c) =>
            this.$route.query.category.includes(c)));
    },
  },
  methods: {
    get_posts: function() {
      this.posts =
        this.$site.pages
            .filter((p) => p.path.match(/^\/archives\/\d/))
            .filter((p) => typeof p.frontmatter.categories !== 'undefined')
            .sort((a, b) =>
              new Date(b.frontmatter.date) - new Date(a.frontmatter.date));
    },
  },
  mounted: function() {
    this.get_posts();
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
