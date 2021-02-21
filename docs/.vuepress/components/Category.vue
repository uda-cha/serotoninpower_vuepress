// Category.vue
<template>
  <span v-bind:class="{active: isActive(categoryName)}">
    <router-link
      v-bind:to="{path: '/categories/', query: toggleQuery(categoryName)}">
      {{ categoryName }}{{ categoryNumber | showCategoryNumber }}
    </router-link>
  </span>
</template>
<script>
export default {
  props: {
    categoryName: String,
    categoryNumber: Number,
    allwaysActive: Boolean,
  },
  methods: {
    isActive: function(c) {
      return this.allwaysActive ||
          (this.$route.query.category &&
           this.$route.query.category.includes(c));
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
  filters: {
    showCategoryNumber: function(v) {
      if (v) {
        return ' (' + v + ')';
      };
    },
  },
};
</script>
<style lang="stylus" scoped>
span
  border: dotted 0.1rem #c2d6ba
  background-color: #FFF
  border-radius: 0.2rem
  line-height: 1.5
  padding: 4px 7px

  &:hover
    opacity: 0.8

  &.active
    background-color: #c2d6ba

  a
    color: #333
    font-weight: normal
</style>
