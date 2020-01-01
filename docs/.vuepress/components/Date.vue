// Date.vue
<template>
  <span class="date">{{ date | moment }}</span>
</template>
<script>
import moment from 'moment';
export default {
  props: {
    input_date: String,
  },
  computed: {
    date() {
      if ( typeof this.input_date !== 'undefined' ) {
        return this.input_date;
      } else {
        return this.$page.frontmatter.date;
      };
    },
  },
  filters: {
    moment: function(date) {
      return moment(date).format('YYYY/MM/DD');
    },
  },
};
</script>
