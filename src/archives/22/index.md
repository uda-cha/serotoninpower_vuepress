---
title: このブログのセキュリティ設定①
description: "Webサーバレイヤでのセキュリティ対策を一通り終えました。備忘録として残しておきます。稚拙な知識だけどあとで振り返ることができるように。"
author: seroto_nin
type: post
date: 2017-04-09T13:22:45+00:00
url: /archives/22
categories:
  - Apache

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

## **対象**

・Apache/2.4.6 (CentOS)

・WordPress 4.7.3

<!--more-->

## **httpd.conf**

サーバ自体へのアクセス制限。すべてアクセス拒否。

```bash
<Directory />
AllowOverride none
Require all denied
</Directory>
```

ドキュメントルート以下へのアクセス制限。ここではすべてアクセス許可。.htaccessでの設定の上書きを許可し、そっちで設定を作りこむ。

```bash
<Directory "/var/www/html">
AllowOverride all
Require all granted
</Directory>
```

.htaccessや.htpasswdへの外部からのアクセスを拒否。ここにはセキュリティ設定が記載されているため確実にブロックしておく(デフォルトでそうなっているはずだけどディストリやバージョンによって異なるとのこと)。

```bash
<Files ".ht*">
Require all denied
</Files>
```

httpレスポンスヘッダに記載される情報を削減。Apacheを使っているよということだけ知らせ、バージョン情報、OS等を隠蔽。

```bash
ServerTokens ProductOnly
```

サーバが生成するドキュメントのフッタに記載される情報を削減。主に403の時とかに表示されるあれ。

```bash
ServerSignature Off
```

URLにおいて/(スラッシュ)をパス分離文字としてではなく普通の一文字として扱えるように設定。デフォルトのoffだと問答無用で403を返すらしい。とりあえずonにしておく。

```bash
AllowEncodedSlashes On
```

HTTPの持続的な接続を拒否。現在このブログには画像や動画、リンク先が非常に少ないので許可する必要なし。

```bash
KeepAlive off
```

## **.htaccess**

公開する必要のないファイルへのアクセスをブロック。license.txtと同様にwp-config-sample.phpやreadme.html、wp-config.phpも。特にwp-config.phpはデータベース接続情報など重要情報が含まれるので、確実にアクセス拒否しておく。

```bash
<files license.txt>
Require all denied
</files>
```

URLリライト関連。デフォルトで入っているmod_rewrite.cモジュールを利用。ifModuleは該当モジュールがあるときのみ以下の記述を実行の意。

```bash
<ifModule mod_rewrite.c>
#モジュール有効化
RewriteEngine On
#リライト処理後にURLをドキュメントルートからのパスとする
RewriteBase /
#xmlrpc.phpへのアクセスは問答無用でhttp:/0.0.0.0/、つまり無効なアドレスへ飛ばす。ここへのPOSTメソッド連投によるDDos攻撃が多いらしいので。
RewriteRule ^xmlrpc\.php$ &#8220;http\:\/\/0\.0\.0\.0\.&#8221; [R=301,L]
#index.phpにアクセスした場合、置換を行わない(ハイフンは｢置換をしない｣の意。正規表現ではなくApache独自の構文らしい)。
RewriteRule ^index\.php$ &#8211; [L]
#ファイルもディレクトリも存在しない場合、index.phpへ飛ばす。
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
```

以上。Apacheのモジュール周りの知識がまだ甘いし、WebAPレイヤでの対策もまだ。特にログイン周りは早めに勉強しよ。
