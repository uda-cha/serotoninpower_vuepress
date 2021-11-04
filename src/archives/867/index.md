---
title: '[Ruby]素のirbを立ち上げたあとにbundler管理のgemをロードする方法'
description: "いっつも忘れるので自分用メモ。"
author: seroto_nin
type: post
date: 2020-10-29T01:53:54+09:00
url: /archives/867
categories:
  - Ruby
---

# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## 環境

```sh
$ ruby --version
ruby 2.6.2p47 (2019-03-13 revision 67232) [x86_64-linux]
$ irb --version
irb 1.0.0 (2018-12-18)
```

## コマンド

```sh
$ irb
```

```rb
irb(main):001:0> ENV['BUNDLE_GEMFILE'] = File.expand_path('./Gemfile', __dir__)
irb(main):002:0> require 'bundler/setup'
```

ちなみに、任意のタイミングで`setup`したい場合は、`require 'bundler'`したあとに、`setup`したいタイミングで`Bundler.setup`を実行する。

```rb
irb(main):001:0> ENV['BUNDLE_GEMFILE'] = File.expand_path('./Gemfile', __dir__)
irb(main):002:0> require 'bundler'
irb(main):003:0> # 任意の処理
irb(main):004:0> Bundler.setup
```

あとはお好きに`require_relative 'hoge/fuga'`などとローカルにあるRubyスクリプトを読みだすなりなんなり。
終わり。

<Comments />
