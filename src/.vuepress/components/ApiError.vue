// ApiError.vue
<template>
  <div class="errors">
    HTTP {{ errorCode }}: エラーが発生しました。
  </div>
</template>
<script lang="ts">
import {defineComponent} from 'vue';

export default defineComponent({
  props: {
    errorCode: Number,
  },
});
</script>
<style lang="stylus" scoped>
.errors
  background-color #FFEFEF
  padding 0.5rem
  color #C25338
  border 1px solid #D4440D
</style>
