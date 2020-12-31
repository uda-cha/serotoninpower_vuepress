// Categories.vue
<template>
  <div>
    <div>
      <ul class="categories">
        <li class="category" v-for="(value, key) in categories" :key="key">
          <span>
            <router-link
              v-bind:to="{path: '/categories/', query: toggleQuery(key)}"
              v-bind:class="{active: isActive(key)}"
            >
              {{ key }} ({{ value }})
            </router-link>
          </span>
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
  methods: {
    isActive: function(c) {
      if (!this.$route.query.category) {
        return false;
      } else {
        return this.$route.query.category.includes(c);
      };
    },
    toggleQuery: function(c) {
      const query = Object.assign({}, this.$route.query);
      if (query.category && query.category.includes(c)) {
        delete query.category;
      } else {
        query.category = c;
      };
      return query;
    },
  },
  computed: {
    categories() {
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
    margin: 0.2rem

    span
      background-color: #c2d6ba
      border-radius: 3px
      line-height: 1.5
      padding: 5px 10px

      &:hover
        opacity: 0.8

      &.active
        background-color: #c2d6ba

      a
        color: #333
        font-weight: normal

.v-enter-active
  transition: all .5s ease

.v-leave-active
  transition: all .5s cubic-bezier(1.0, 0.5, 0.8, 1.0)

.v-enter, .v-leave-to
  transform: translateX(10px)
  opacity: 0
</style>
