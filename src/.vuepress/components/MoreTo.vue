// MoreTo.vue
<template>
<div>
  <p class="more_to">
    <router-link class="more_to_str" v-bind:to="this.path">
      <slot/>
    </router-link>
  </p>
</div>
</template>
<script>
export default {
  props: {
    path: String,
  },
};
</script>
<style lang="stylus" scoped>
.more_to
  text-align: center

  .more_to_str
    display: inline-block
    font-size: 1.2rem
    color: #fff
    background-color: #3eaf7c
    padding: .8rem 1.6rem
    border-radius: 4px
    transition: opacity .1s ease
    box-sizing: border-box
    border-bottom: 1px solid #389d70

    &:hover
      opacity: 0.8
</style>
