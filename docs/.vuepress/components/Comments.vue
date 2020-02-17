// Comments.vue
<template>
  <iframe
    id="comentFrame"
    v-bind:src="get_ifram_src_url"
    frameborder="0"
    height="800px"
    width="100%"
    >
    コメントを表示するには iframe 機能を有効にして下さい
  </iframe>
</template>
<script>
export default {
  computed: {
    get_ifram_src_url: function() {
      const url =
        'https://serotoninpower-cms.herokuapp.com/posts/' +
        this.$page.regularPath.split('/').slice(-2)[0] +
        '/comments/wrapper';
      return url;
    },
  },
};
</script>
