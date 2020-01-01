---
title: プロキシ環境下のCentOSでyumだけプロキシを経由させない
description: "通常のインターネットアクセスはプロキシ環境下で行い、yumだけはプロキシを通さないという設定が某クラウド基盤上でサーバを構築する際に必要になりました。ちょっとはまったのでメモ。"
author: seroto_nin
type: post
date: 2017-12-03T10:19:53+00:00
url: /archives/293
categories:
  - CentOS

---
# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## OSのプロキシ設定

CentOSのOSのプロキシ設定は環境変数にて行います。環境変数を自動的に設定する手段はいろいろありますが、今回は/etc/profile.d/以下に下記のようなファイル(今回はproxy.shというファイル名)を作成しておきます。これでbashが立ち上がる際に自動的に環境変数がexportされます。.shという拡張子ではありますが、/etc/profile.d以下に配置したファイルはbash起動時に書いてある内容がそのまま流されるだけで、厳密にはシェルスクリプトではないのでシバンも実行権も不要です。

```bash
MYPROXY="192.168.100.103:8080"
MYNOPROXY="localhost,127.0.0.1"

export HTTP_PROXY=$MYPROXY
export HTTPS_PROXY=$MYPROXY
export FTP_PROXY=$MYPROXY
export NO_PROXY=$MYNOPROXY

export http_proxy=$MYPROXY
export https_proxy=$MYPROXY
export ftp_proxy=$MYPROXY
export no_proxy=$MYNOPROXY
```

この/etc/prtofile.d/proxy.shというファイルを編集し終わったら、OSを再起動するか以下のコマンドを利用するかすると、環境変数が有効になります。

```bash
source /etc/profile.d/proxy.sh
```

## yumのプロキシ設定

yumのプロキシ設定は/etc/yum.confに｢`PROXY=http://192.168.100.103:8080`｣などと記載しておけばいいですが、今回yumはプロキシを通したくないので、何もする必要はありません。

## 何も設定していないのにyumがパッケージ一覧の更新の際になぜかプロキシを経由する

以上で通常はプロキシ経由で通信を行い、yumはプロキシを通さず直接通信する設定になっているはずですが、yumリポジトリのパッケージリストの更新を行う際に、なぜかプロキシを経由してしまいます。なお、本事象はyumの通信の中でもパッケージ一覧の更新の際のみ起こる現象であり、キャッシュされているパッケージリストを利用したパッケージのインストールはプロキシ経由を経由せず直接可能です。

## 原因

yumがパッケージ一覧の更新の際のみにバックエンドで利用するcurlコマンドのせい。yumから呼ばれたこのコマンドが、リポジトリサーバのxmlファイル(パッケージ一覧)を取りに行く際に、yum.confのプロキシ設定(今回は未設定)ではなくOSのプロキシ設定ないしは`~/.curlrc`に記載のプロキシ設定を利用してしまうためです。これバグじゃないのか。

## 対処法

`/etc/profile.d/proxy.shのMYNOPROXY`にリポジトリサーバのドメインをひとつひとつ追加する。めんどい。ドメイン変わったときどうすんだ。別ファイルに外出しした方がいいかも。

## 所感

いそがしすぎていそがしすぎて仕事本当にやめたい。
