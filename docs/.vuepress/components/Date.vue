// Date.vue
<template>
  <span class="date">{{ date | days }}</span>
</template>
<script>
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
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
    days: function(date) {
      return dayjs(date).format('YYYY/MM/DD');
    },
  },
};
</script>
