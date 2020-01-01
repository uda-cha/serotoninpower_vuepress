---
title: CentOSのカーネルアップデート
description: "鬱病なので東方M-1ぐらんぷり延々と見続けたり秋葉原でさみしくて3時間さまよって結局何もせずはなまるうどんだけ食べて帰るみたいなことをしてます。そんな状態でLPIC 201の勉強としてカーネルアップデートをやってみたのでまとめておきます。"
author: seroto_nin
type: post
date: 2017-06-04T05:53:47+00:00
url: /archives/122
categories:
  - CentOS
  - Linux

---
# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}
  
<!--more-->
  
カーネルアップデート。システム管理者なら絶対にやりたくないことの一つ。動いていたアプリケーションが動かない。そのアプリケーションが利用するモジュールが提供されていない。モジュールの挙動が変わっているなどなど。変化というものは怖いものです。俺はおうちの中で一人stableでいたい。人と関われない。

とはいえ｢やりたくない｣と｢できない｣は違うのでとりあえずやってみることにしました。俺は｢やりたい｣のに｢できない｣ことだらけだけど。

## 要件

- CentOS 6.9(VM)
- 2.6.32-696.1.1.el6.x86_64

今回は最新の安定版カーネル4.11.3に一気にアプデします。流れは以下の通り。

1. カーネルソースのダウンロードと解凍
1. コンフィギュレーションファイルの生成
1. コンパイル
1. インストール

コンフィギュレーションファイルとは、コンパイル時にどんなモジュールをカーネルに組み込むか/組み込まないか/必要時にロードできるようにしておくかを記述したファイルです。

ちなみにバックアップは必ずとっておきましょう。VMならディスクイメージをコピーしておくだけ。それではいきます。

現在のカーネルバージョンの確認

```bash
# uname -r
2.6.32-696.1.1.el6.x86_64
```

rootでログインし、カーネルソースを配置するディレクトリに移動

```bash
# cd /usr/src
```

カーネル4.11.3をダウンロード

```bash
# curl https://cdn.kernel.org/pub/linux/kernel/v4.x/linux-4.11.3.tar.xz > linux-4.11.3.tar.xz
```

解凍

```bash
# xz -dc linux-4.11.3.tar.xz | tar xvf -
```

解凍してできたディレクトリに移動

```bash
# cd linux-4.11.3
```

現在のカーネルで使用しているコンフィギュレーションファイルを流用するためにコピペ

```bash
# cp /boot/config-2.6.32-696.1.1.el6.x86_64 .config
```

コピーしてきたコンフィギュレーションファイルに新しいカーネルバージョンで使用する設定項目を反映

```bash
# make oldconfig
```

だばーっとこのモジュールいれますかいれませんかローダブルにしときますかといった質問がでてきますが、基本的にデフォルト値でいくのでエンターキーおしっぱなしでいいです。

これでコンフィギュレーションファイルができました。これをもとにコンパイルします。

```bash
# make
```

ここでこんなエラーが。

```bash
HOSTCC scripts/sign-file
scripts/sign-file.c:25:30: error: openssl/opensslv.h: そのようなファイルやディレクトリはありません
scripts/sign-file.c:26:25: error: openssl/bio.h: そのようなファイルやディレクトリはありません
scripts/sign-file.c:27:25: error: openssl/evp.h: そのようなファイルやディレクトリはありません
scripts/sign-file.c:28:25: error: openssl/pem.h: そのようなファイルやディレクトリはありません
scripts/sign-file.c:29:25: error: openssl/err.h: そのようなファイルやディレクトリはありません
scripts/sign-file.c:30:28: error: openssl/engine.h: そのようなファイルやディレクトリはありません
scripts/sign-file.c:52:27: error: openssl/pkcs7.h: そのようなファイルやディレクトリはありません
scripts/sign-file.c: In function ‘display_openssl_errors’
```

なんかファイルがないって怒られてるので、どのパッケージにあるのか確認

```bash
# yum provides '*/opensslv.h'
openssl-devel-1.0.1e-57.el6.x86_64 : Files for development of applications which will use OpenSSL
リポジトリー : base
一致 :
ファイル名 : /usr/include/openssl/opensslv.h

openssl-devel-1.0.1e-57.el6.i686 : Files for development of applications which will use OpenSSL
リポジトリー : base
一致 :
ファイル名 : /usr/include/openssl/opensslv.h</pre>
```

opennssl-develというパッケージにあることがわかったのでインストール

```bash
# yum install openssl-devel
```

満を持して再びコンパイル。

```bash
# make
```

1～2時間くらいかかるので放置。｢道草屋-たびらこ3-いっしょにタッチケア/はみがきレッスン｣を聞きながら待ちます。

おわったらモジュールをインストール

```bash
# make modules_install
```

おわったらカーネルをインストール。これまた時間がかかります。

```bash
# make install
```

きちんと作成できたか確認

```bash
# ls /boot
```

vmlinuz-4.11.3があればOK。一旦再起動し、ブートローダの起動オプションでこのカーネルを呼び出します。起動中にF12を押して、CentOS(4.11.3)のイメージを選択。無事起動できて、ログインできたら以下のコマンドでアプデできてるかを確認。

```bash
# uname -r
4.11.3
```

おわり。次回以降もこのカーネルを使いたいならば、grub Legacyの場合、/boot/grub/menu.lstを編集し、defaultの行に使用したいカーネルイメージの番号(一番上が0です)を記述しておきます。

本来動作確認とかきちんとしないといけないんだけどめんどいのでおわり。なんか最近もう何もかもやだ。
