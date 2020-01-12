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
    isActive: function(c) {
      if (!this.$route.query.category) {
        return false;
      } else {
        return this.$route.query.category.includes(c);
      };
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
