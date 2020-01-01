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
    <div class="post-list">
      <div v-for="(post, index) in selectedPosts" :key="index">
        <h2><a v-bind:href="post.path">{{post.title}}</a></h2>
        <Date v-bind:input_date=post.frontmatter.date />
        <ShowCategoriesOfPost
          v-bind:input_categories=post.frontmatter.categories
        />
        <p>{{post.frontmatter.description}}</p>
        <a v-bind:href="post.path">続きを読む</a>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  data: function() {
    return {
      selectedCategories: [],
    };
  },
  methods: {
    toggleSelectedCategories: function(c) {
      if (this.$data.selectedCategories.includes(c)) {
        this.$data.selectedCategories =
            this.$data.selectedCategories.filter((a) => a !== c);
      } else {
        this.$data.selectedCategories.push(c);
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
      if (this.$data.selectedCategories.length == 0) {
        return;
      };
      const res = this.$site.pages
          .filter((post) => post.path.match(/^\/archives\/\d/))
          .filter((post) => post.frontmatter.categories.some((c) =>
            this.$data.selectedCategories.includes(c)))
          .sort((a, b) =>
            new Date(b.frontmatter.date) - new Date(a.frontmatter.date));

      return res;
    },
    isActive: function() {
      return function(category) {
        return this.$data.selectedCategories.includes(category);
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
</style>
