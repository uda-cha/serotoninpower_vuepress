---
title: '[Ruby]配列に格納したメソッドをObject#sendで実行する'
description: "諸事情あって複数のメソッドを一つずつ実行する必要がありました。いいやり方を見つけるのに時間がかかった & これがベストかわからないためメモしておきます。"
author: seroto_nin
type: post
date: 2019-11-05T15:02:08+00:00
url: /archives/803
categories:
  - Ruby

---
# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## Object#send

```bash
obj.send(name, [arg, ...])
```

レシーバの持っているメソッドを呼び出すメソッド。 第一引数`name`で呼び出したいメソッドをシンボルか文字列で定義します。

<https://ref.xaio.jp/ruby/classes/object/send>

このメソッドを利用することで、配列に格納した複数のメソッドを一つずつ取り出して実行することができます。

## 配列に格納したメソッドを一つずつ取りだして実行する例

配列にメソッド名をシンボルで格納します。それを一つずつ取り出し、`hoge.send`に渡すことで、hogeオブジェクトのメソッドを呼び出せます。

* hoge.rb

```ruby
class Hoge
  def piyo
    puts "piyo"
  end

  def fuga
    puts "fuga"
  end
end

hoge = Hoge.new
[:piyo, :fuga].each do |method|
  hoge.send(method)
end
```

* `$ ruby hoge.rb`

```bash
piyo
fuga
```

## 使用例

複数あるメソッドを必ず全て実行しつつ、どのメソッドにも同じ例外処理を行う場合に使いました。

* foo.rb

```ruby
class Foo
  def bar(x)
    puts 10 / x
  end

  def baz(y)
    puts 6 / y
  end
end

foo = Foo.new
[0, 2].each do |z|
  [:bar, :baz].each do |method|
    begin
      foo.send(method, z)
    rescue ZeroDivisionError
      puts "ゼロ除算"
    end
  end
end
```

* `$ ruby foo.rb`

```bash
ゼロ除算
ゼロ除算
5
3
```

これを単純に`foo.bar`と`foo.baz`を順次実行するようにしてしまうと、`foo.bar(0)`で例外を起こした時に`foo.baz(0)`が実行されなくなります。

* bad_foo.rb

```ruby
class Foo
  def bar(x)
    puts 10 / x
  end

  def baz(y)
    puts 6 / y
  end
end


foo = Foo.new
[0, 2].each do |z|
  begin
    foo.bar(z)
    foo.baz(z)
  rescue ZeroDivisionError
    puts "ゼロ除算"
  end
end
```

* `$ ruby bad_foo.rb`

```bash
ゼロ除算
5
3
```

かといって`begin ~ rescur ~ end`を、実行したいメソッドの数だけ書くのも面倒です。なので`Object#send`がいいのかなと。

## Object#sendの注意点

`send`メソッドは`Object`クラスのメソッドであり、`Object`クラスは`Kernel`モジュールをincludeしているため、`kernel`モジュールで定義されたメソッドも`send`メソッドで呼び出せてしまいます。`eval`メソッドも呼び出せ、任意のコードを実行できてしまうため、外部からメソッド名を受け取るのはやめましょうとのことです。

<https://qiita.com/igrep/items/b2fed2d467f8a16f5eb0>

## メモ

ブロック使ったほうがうまく書けそう。
