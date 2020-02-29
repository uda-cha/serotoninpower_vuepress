// Comments.vue
<template>
  <div class="holds-the-iframe">
    <iframe
      id="comentFrame"
      v-bind:src="get_ifram_src_url"
      frameborder="0"
      height="800px"
      width="100%"
      >
      コメントを表示するには iframe 機能を有効にして下さい
    </iframe>
    <p>※コメント機能は外部サイトで構築しており、サードパーティCookieを利用しています。
      Safariからコメントを投稿する場合、サードパーティCookieを有効化するか、もしくは
      <a v-bind:href="get_ifram_src_url">コメントサイト</a> へ直接アクセスした上で
      コメント投稿をお願いします。</p>
  </div>
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
<style lang="stylus" scoped>
.holds-the-iframe
  background:url(/loading.gif) center center no-repeat
</style>
