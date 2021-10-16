// Date.vue
<template>
  <span class="date">{{ date }}</span>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

export default defineComponent({
  props: {
    input_date: String,
  },
  computed: {
    date(): string {
      const dt = this.input_date || this.$page.frontmatter.date
      return dayjs(dt).format('YYYY/MM/DD');
    },
  },
});
</script>
