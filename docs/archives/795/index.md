---
title: capistrano3をdockerで動かし単純な複数サーバへのコマンド発行ツールとして使う
author: seroto_nin
type: post
date: 2019-08-27T15:52:25+00:00
url: /archives/795
categories:
  - docker
  - Ruby

---
# {{this.$page.frontmatter.title}}

デプロイツールとして有名なcapistrano3ですが、デフォルトで多機能すぎて牛刀で鶏を割いている感があります(使用者に牛刀を扱う能力がない説もあります)。なので、capistrano3の勉強を兼ねて、これを高度なデプロイツールとしてではなく、複数サーバに対する単純なコマンド実行ツールとしてなるべくシンプルに使ってみます。with docker。

<!--more-->

## 必要なファイルの作成

適当なディレクトリを切り、その下に以下のファイルを作ります。

* Gemfile

```ruby
source 'https://rubygems.org'

gem 'capistrano'
```

* Gemfile.lock

空ファイルだけ作っておく。

* Dockerfile

```bash
FROM ruby:2.6.3
ENV LANG C.UTF-8

RUN gem install bundler

WORKDIR /tmp
ADD Gemfile Gemfile
ADD Gemfile.lock Gemfile.lock
RUN bundle install

ENV APP_HOME /myapp
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME
ADD . $APP_HOME
```

* docker-compose.yml

commandはどうせコマンドラインで上書きするので適当に。

```yaml
version: '3'
services:
  ruby:
    build: .
    command: bundle -v
    volumes:
      - .:/myapp
```

## コンテナのビルド

```bash
docker-compose build
```

## Capistrano3のインストール

ここまではcapistrano3を普通のデプロイツールとして使う手順と同じです。ここからはcapistrano3をなるべくシンプルに使っていきます。

```bash
docker-compose run ruby bundle exec cap install STAGES=onetime_ops
```

`STAGES`はデプロイする環境を指定する環境変数です。デフォルトでは`staging`と`production`の二つの環境にデプロイできるようインストールされます。今回は一環境にだけデプロイ(コマンドを発行するだけですが)できればいいので、適当な環境名で一つ指定しておきます。複数指定する場合はカンマ区切りで。

するとこんなディレクトリ構造になります。

```bash
$ tree --charset=hoge
.
|-- Capfile
|-- Dockerfile
|-- Gemfile
|-- Gemfile.lock
|-- config
|   |-- deploy
|   |   `-- onetime_ops.rb
|   `-- deploy.rb
|-- docker-compose.yml
`-- lib
    `-- capistrano
        `-- tasks

5 directories, 7 files
```

## Capfile

いじりません。

## config/deploy.rb

いじりません。

## config/deploy/onetime_ops.rb

デプロイ対象のサーバのホスト名やログインユーザ名を指定します。

capistrano3はデプロイ対象のサーバを列挙する方法が二つあります。`server-based syntax`と`role-based syntax`。後者の方がメジャーなので後者で書きます。role名は適当に`target`としておきます。

そしてsshのログイン情報を記載します。ssh公開鍵を使ってノーパスワードでデプロイする方法が主流ですが、今回は単純なコマンド実行ツールとして使うため、パスワードを対話的に入力してみます。

```ruby
role :target,  %w{udacha@192.168.100.102
                  root@192.168.100.201
                  udacha@192.168.100.203
                  udacha@192.168.100.205}

set :ssh_options, {
  auth_methods: %w(password)
}
```

## lib/capistrano/tasks/uname.rake

流すコマンドをここで定義します。今回は`uname -a`を全サーバに流してみます。ちなみに`lib/capistrano/tasks/*.rake`はCapfileでincludeされています。

```ruby
task :uname do
  on roles(:target) do
    execute "uname -a"
  end
end
```

## デプロイ実行

```bash
$ docker-compose run ruby bundle exec cap onetime_ops uname
00:00 uname
      01 uname -a
udacha@192.168.100.102's password:root@192.168.100.201's password:udacha@192.168.100.203's password:udacha@192.168.100.205's password:
      01 Linux srtppc02 3.10.0-514.26.1.el7.x86_64 #1 SMP Thu Jun 29 16:05:25 UTC 2017 x86_64 x86_64 x86_64 GNU/Linux
    ✔ 01 udacha@192.168.100.102 3.665s

root@192.168.100.201's password:
      01 Linux srtevmcos701 3.10.0-957.1.3.el7.x86_64 #1 SMP Thu Nov 29 14:49:43 UTC 2018 x86_64 x86_64 x86_64 GNU/Linux
    ✔ 01 udacha@192.168.100.203 9.675s

udacha@192.168.100.205's password:
      01 Linux SRTEVMkali01 4.18.0-kali2-amd64 #1 SMP Debian 4.18.10-2kali1 (2018-10-09) x86_64 GNU/Linux
    ✔ 01 root@192.168.100.201 13.055s

udacha@192.168.100.205's password:
      01 Linux srtevmub01 5.0.0-20-generic #21-Ubuntu SMP Mon Jun 24 09:32:09 UTC 2019 x86_64 x86_64 x86_64 GNU/Linux
    ✔ 01 udacha@192.168.100.205 16.398s
```

パスワードがホストごとに聞かれるので都度入力します。入力してEnterを押すと結果が返ってきてプロンプトが止まるので、またEnterキーを押すと、次のホストへのデプロイが実行され、またパスワードが聞かれます。これの繰り返しを4回で4ホストに対してコマンドが実行できました。

## おまけ: sshパスワードをあらかじめ指定しておき対話入力をなくす

ちなみに、パスワードを`config/deploy/onetime_ops.rb`に書いておくこともできます。

```ruby
role :target,  %w{udacha@192.168.100.102
                  root@192.168.100.201
                  udacha@192.168.100.203
                  udacha@192.168.100.205}

set :ssh_options, {
  auth_methods: %w(password),
  password: "thisispassword"
}
```

こうすると対話入力が不要になります。

```bash
$ docker-compose run ruby bundle exec cap onetime_ops uname
00:00 uname
      01 uname -a
      01 Linux srtevmcos701 3.10.0-957.1.3.el7.x86_64 #1 SMP Thu Nov 29 14:49:43 UTC 2018 x86_64 x86_64 x86_64 GNU/Linux
    ✔ 01 udacha@192.168.100.203 0.134s
      01 Linux SRTEVMkali01 4.18.0-kali2-amd64 #1 SMP Debian 4.18.10-2kali1 (2018-10-09) x86_64 GNU/Linux
    ✔ 01 root@192.168.100.201 0.164s
      01 Linux srtppc02 3.10.0-514.26.1.el7.x86_64 #1 SMP Thu Jun 29 16:05:25 UTC 2017 x86_64 x86_64 x86_64 GNU/Linux
    ✔ 01 udacha@192.168.100.102 0.272s
      01 Linux srtevmub01 5.0.0-20-generic #21-Ubuntu SMP Mon Jun 24 09:32:09 UTC 2019 x86_64 x86_64 x86_64 GNU/Linux
    ✔ 01 udacha@192.168.100.205 0.286s
```

## おまけ: 特定のホストのみ違うsshパスワードをあらかじめ指定しておく

`config/deploy/onetime_ops.rb`で、`server-based syntax`を使ってホスト単位で接続設定を上書きすることができます。`role-based syntax`だとrole単位での上書きになってしまうので、同じrole内の特定のサーバのみ設定を変更するには向きません。まぁroleから分けてもいいとは思います。

```ruby
role :target,  %w{jenkins@192.168.100.102
                  root@192.168.100.201
                  udacha@192.168.100.203
                  udacha@192.168.100.205}

set :ssh_options, {
  auth_methods: %w(password),
  password: "thisispassword"
}

server "192.168.100.102",
  ssh_options: {
    password: "differentpassword"
  }
```

以上。少しずつ少しずつ前に進んでいるつもりだけどいったいどこまできていてあとどれくらいなんだろう。
