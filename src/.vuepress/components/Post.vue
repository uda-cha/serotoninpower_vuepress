// Post.vue
<template>
  <div>
    <h2>
      <router-link v-bind:to="path">{{title}}</router-link>
    </h2>
    <Date v-bind:input_date=frontmatter.date />
    <CategoriesPerPost
      v-bind:input_categories=frontmatter.categories
    />
    <p>{{frontmatter.description}}</p>
    <router-link v-bind:to="path">続きを読む</router-link>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';
import type { PageFrontmatter } from '@vuepress/shared';

export default defineComponent({
  props: {
    path: String,
    title: String,
    frontmatter: {
      type: Object as PropType<PageFrontmatter>
    },
  },
});
</script>
