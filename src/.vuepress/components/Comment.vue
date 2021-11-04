// Comment.vue
<template>
  <div class="comment">
    <div>
      <div class="comment_head">
        <span class="comment_head_number">#{{ idx + 1 }}</span>
        <span class="comment_head_name">{{ name }}</span>
        <span class="comment_head_date">
          <Date v-bind:input_date=updated_at />
        </span>
      </div>
      <div class="comment_body">
        <p>{{ content }}</p>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    idx: Number,
    name: String,
    content: String,
    updated_at: String,
  },
};
</script>
<style lang="stylus" scoped>
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
</style>
