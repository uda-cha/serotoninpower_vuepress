// Comments.vue
<template>
  <div>
    <h2>コメント</h2>
    <div v-if="getErrorCode > 0" class="errors">
      {{ getErrorCode }}: エラーが発生しました。時間をおいて再度お試しください。
    </div>
    <div v-if="loading" class="loading" />
    <div
      v-else-if="comments.length"
      v-for="(value, key) in comments" :key="key"
      class="comment">
      <div class="comment_head">
        <span class="comment_head_number">#{{ key + 1 }}</span>
        <span class="comment_head_name">{{ value.name }}</span>
        <span class="comment_head_date">
          <Date v-bind:input_date=value.updated_at />
        </span>
      </div>
      <div class="comment_body">
        <p>{{ value.content }}</p>
      </div>
    </div>
    <div v-else>コメントはありません。</div>
    <h2>コメントする</h2>
      <div class="errors" v-if="postErrorCode > 0" >
        {{ postErrorCode }}: エラーが発生しました。時間をおいて再度お試しください。
      </div>
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
import axios from 'axios';
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
      return 'https://serotoninpower-cms.herokuapp.com/v1/posts/' +
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
      axios
          .get(this.comment_url)
          .then((response) => {
            this.comments = response.data.data;
          })
          .catch((error) => {
            this.getErrorCode = error.response.status;
          })
          .finally(() => {
            this.loading = false;
          });
    },
    post_comment: function() {
      this.sending = true;
      this.postErrorCode = 0;
      if (this.name && this.content) {
        axios
            .post(this.comment_url, {
              name: this.name,
              content: this.content,
            })
            .then((response) => {
              this.name = this.content = null;
              this.get_comments();
            })
            .catch((error) => {
              this.postErrorCode = error.response.status;
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
.errors
  background-color #FFEFEF
  padding 0.5rem
  color #C25338
  border 1px solid #D4440D

.loading
  background:url(/loading.gif) center center no-repeat
  width 100%
  height 200px

.comment
  border-radius 5px
  border 1px solid #ccc
  padding 0.5rem
  margin-bottom 1rem

comment_head_span()
  display inline-block
  padding-right 1rem
  font-size 1rem

.comment_head_number
  comment_head_span()

.comment_head_name
  comment_head_span()
  color #008000

.comment_head_name_admin
  comment_head_span()
  color #ff4500

.comment_head_date
  comment_head_span()

.comment_body
  padding 0 0.5rem
  word-break break-all
  font-size 0.9rem

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
