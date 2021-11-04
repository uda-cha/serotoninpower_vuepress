---
title: '[Ruby]ネストされたハッシュのeachメソッドと動的型変換'
description: "最近Ruby on Railsを勉強しています。何もわからん。その一環で掲題の件で3日くらい詰まったことがあったのでメモしておきます。"
author: seroto_nin
type: post
date: 2019-04-21T12:06:37+00:00
url: /archives/613
categories:
  - Ruby

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

こんなネストされたハッシュがあったとします。

```ruby
hoge = { ho: { a: 1, b: 2 }, ge: { a: 3, b: 4 } }
```

このハッシュをeachメソッドで順々に取り出して処理したいとします。ハッシュクラスのeachメソッドはブロックを取り、その際のブロックパラメータはハッシュのキーとバリューの2つを取ります。

```ruby
hoge.each do |k, v|
  p k
  p v[:a]
end

#=>
:ho
1
:ge
3
```

ここで、eachメソッドのブロックパラメータを間違えて一つしかとらないように書いてしまったとします。するとこうなる。

```ruby
hoge.each do |k|
  p k
end

#=>
[:ho, {:a=>1, :b=>2}]
[:ge, {:a=>3, :b=>4}]
```

ハッシュが配列に変換されて帰ってくるんですね。ブロックパラメータを一つしかとらないeachメソッドはハッシュではなく配列のメソッドなので、ハッシュだったhogeが勝手に配列に変換されたうえで処理されたんですね。動的型変換とダックタイピングは恐ろしい。これ有効に使いこなせるようになる日は来るのかな。

この程度のことばっかで詰まっているので何も進みません。わからないことがわからない。クビになるんちゃうかな。おわり。
