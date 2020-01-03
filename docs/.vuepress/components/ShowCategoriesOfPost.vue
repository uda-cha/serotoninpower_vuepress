// ShowCategoriesOfPost.vue
<template>
  <span>
    <ul class="categories">
      <li class="category" v-for="(category, index) in categories" :key="index">
        <span>
          <router-link
            v-bind:to="{path: '/categories/', query: { category: category }}">
              {{category}}
          </router-link>
        </span>
      </li>
    </ul>
  </span>
</template>
<script>
export default {
  props: {
    input_categories: Array,
  },
  computed: {
    categories() {
      if ( typeof this.input_categories !== 'undefined' ) {
        return this.input_categories;
      } else {
        return this.$page.frontmatter.categories;
      };
    },
  },
};
</script>
<style lang="stylus" scoped>
.categories
  display: inline-block
  padding-inline-start: 0

  .category
    display: inline-block
    margin: 0 10px 5px

    span
      background-color: #c2d6ba
      border-radius: 3px
      line-height: 1.5
      padding: 5px 10px

      &:hover
        opacity: 0.8

      a
        color: #333
        font-weight: normal
</style>
