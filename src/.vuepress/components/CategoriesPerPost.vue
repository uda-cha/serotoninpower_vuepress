// CategoriesPerPost.vue
<template>
  <span>
    <ul class="categories">
      <li class="category" v-for="(category, index) in categories" :key="index">
        <Category v-bind:categoryName="category" v-bind:allwaysActive="true" />
      </li>
    </ul>
  </span>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    input_categories: Array,
  },
  computed: {
    categories(): Array<string> {
      return this.input_categories || this.$page.frontmatter.categories;
    },
  },
});
</script>
<style lang="stylus" scoped>
.categories
  display: inline-block
  padding-inline-start: 0

  .category
    display: inline-block
    margin: 0 10px 5px
</style>
