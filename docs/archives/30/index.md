---
title: このブログのセキュリティ設定②
description: "ログイン画面へのブルートフォース攻撃を避けるために、WordPressの画像認証プラグイン｢SI CAPTCHA Anti-Spam｣を導入したので、手順を書いておきます。絶対忘れるから。"
author: seroto_nin
type: post
date: 2017-04-15T13:28:30+00:00
url: /archives/30
categories:
  - WordPress

---
# {{this.$page.frontmatter.title}}

{{this.$page.frontmatter.description}}

## **対象**

・Apache/2.4.6 (CentOS)

・WordPress 4.7.3

<!--more-->

## **ファイルアップロードをftp経由で行わないよう設定**

WordPressのデフォルト設定では、ファイルをアップロードする際ftpを使用するようになっている。今回プラグインを導入しようとしたとき、ftpアカウント情報を求められた。ftpサーバなんて構築してないし使わんわってことで、httpで直接アップロードするよう設定。wp-config.phpに以下の記述を追加。

```php
define(‘FS_METHOD’,’direct’);
```

Apache実行ユーザにWordPressがインストールされているディレクトリの書き込み権を一時的に与える。セキュリティ上、ファイルアップロードするときだけ権限を与え、終わったら剥奪しておく。

```bash
chmod -R g+w “WordPressのディレクトリ”
```

※WordPressのディレクトリ所有者がApacheではない場合、このコマンドの前にそれも変更しておく。デフォルトではrootのはず。

## SI CAPTCHA Anti-Spamを導入

WordPressのダッシュボードにログインし、左ペインの｢プラグイン｣→｢新規追加｣をクリック。検索窓に｢SI CAPTCHA Anti-Spam｣と入力し、｢インストール｣をクリック。無事インストールできたら、左ペイン｢プラグイン｣をクリック。SI CAPTCHA Anti-Spamを有効化する。

## SI CAPTCHA Anti-Spamの設定

有効化したら同じ場所に｢設定｣が出るはずなのでクリック。Enable CAPTCHAのlogin formにチェックを入れる。

※もともとこの画像認証プラグインはコメント欄で使うためのものだけど、ログイン画面でも利用できる。

Error Messagesも適宜編集して、Save Changesで終了。ログイン画面で無事画像認証ができることを確認する。

![loginform.jpg](./loginform.jpg)

おわり。
