// Comments.vue
<template>
  <div>
    <h2>コメント</h2>
    <div v-if="loading" class="loading" />
    <ApiError v-else-if="getErrorCode > 0" v-bind:errorCode="getErrorCode" />
    <Comment
      v-else-if="comments.length"
      v-for="(value, key) in comments" v-bind:key="key"
      v-bind:idx=key
      v-bind:name="value.name"
      v-bind:content="value.content"
      v-bind:updated_at="value.updated_at" />
    <div v-else>コメントはありません。</div>
    <h2>コメントする</h2>
      <ApiError v-if="postErrorCode > 0" v-bind:errorCode="postErrorCode" />
      <div class="input_wrapper">
        <div class="label">name</div>
        <div class="content">
          <input type="text" name="name"
            v-model="name"
            v-bind:disabled="sending" />
        </div>
        <div class="label">content</div>
        <div class="content">
          <textarea name="content" rows="4"
            v-model="content"
            v-bind:disabled="sending" />
        </div>
        <input type="submit" name="post" value="POST"
          v-on:click="post_comment"
          v-bind:disabled="!postable" />
      </div>
  </div>
</template>
<script>
export default {
  data: function() {
    comments: Array;
    loading: Boolean;
    sending: Boolean;
    name: String;
    content: String;
    getErrorCode: Number;
    postErrorCode: Number;
    return {
      comments: [],
      loading: true,
      sending: false,
      name: null,
      content: null,
      getErrorCode: 0,
      postErrorCode: 0,
    };
  },
  computed: {
    comment_url: function() {
      return 'https://cms.serotoninpower.club/v1/posts/' +
        this.$page.regularPath.split('/').slice(-2)[0] +
        '/comments';
    },
    postable: function() {
      return Boolean(this.name && this.content && !this.sending);
    },
  },
  methods: {
    get_comments: function() {
      this.loading = true;
      fetch(this.comment_url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })
          .then((response) => {
            if (response.ok) {
              return response.json();
            } else {
              return Promise.reject(response);
            };
          })
          .then((data) => {
            this.comments = data.data;
          })
          .catch((error) => {
            this.getErrorCode = error.status || 400;
          })
          .finally(() => {
            this.loading = false;
          });
    },
    post_comment: function() {
      this.sending = true;
      this.postErrorCode = 0;
      if (this.name && this.content) {
        const reqBody = JSON.stringify({
          name: this.name,
          content: this.content,
        });
        fetch(this.comment_url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: reqBody,
        })
            .then((response) => {
              if (response.ok) {
                return response.json();
              } else {
                return Promise.reject(response);
              };
            })
            .then((data) => {
              this.name = this.content = null;
              this.get_comments();
            })
            .catch((error) => {
              this.postErrorCode = error.status || 400;
            })
            .finally(() => {
              this.sending = false;
            });
      };
    },
  },
  mounted: function() {
    this.get_comments();
  },
};
</script>
<style lang="stylus" scoped>
.loading
  background:url(/loading.gif) center center no-repeat
  width 100%
  height 200px

content_in_input_wrapper()
  padding 10px
  line-height 1.5em
  width 100%
  border-radius 5px
  border 1px solid #ccc
  box-sizing border-box
  margin-bottom 1.3rem

.input_wrapper
  .label
    padding-bottom .7rem
  .content
    textarea
      content_in_input_wrapper()
      resize vertical
    input
      content_in_input_wrapper()
</style>
