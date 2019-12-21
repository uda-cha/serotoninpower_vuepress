// CategoriesAndDate.vue
<template>
  <div>
    <span class="date">{{ date | moment }}</span>
    <ul class="categories">
      <li class="category" v-for="category in categories">
        <span>{{category}}</span>
      </li>
    </ul>
  </div>
</template>
<script>
import moment from 'moment';
export default {
  props: {
    input_date: String,
    input_categories: Array,
  },
  computed: {
    date() {
      if ( typeof this.input_date !== 'undefined' ) {
        return this.input_date;
      } else {
        return this.$page.frontmatter.date;
      };
    },
    categories() {
      if ( typeof this.input_categories !== 'undefined' ) {
        return this.input_categories;
      } else {
        return this.$page.frontmatter.categories;
      };
    },
  },
  filters: {
    moment: function (date) {
        return moment(date).format('YYYY/MM/DD');
    }
  }
}
</script>
<style lang="stylus" scoped>
.date
  display: inline-block

.categories
  display: inline-block
  padding-inline-start: 0

  .category
    display: inline-block
    margin: 0 10px 5px

    span
      background-color: #c2d6ba
      border-radius: 3px
      color: #333
      line-height: 1.5
      padding: 5px 10px
</style>
