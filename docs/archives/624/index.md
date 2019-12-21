---
title: WordPress用 Apache/2.4.6 設定まとめ(2019/04/21)
description: "今時点でのApacheの設定を総まとめします。私のApcheの設定ファイルは、これまでいろいろ手を加えて育ってきているので、それを棚卸しようかと思い記述します。"
author: seroto_nin
type: post
date: 2019-04-23T16:47:46+00:00
url: /archives/624
categories:
  - Apache

---
# {{this.$page.frontmatter.title}}

<CategoriesAndDate/>

{{this.$page.frontmatter.description}}

<!--more-->

## 環境

```bash
$ httpd -v
Server version: Apache/2.4.6 (CentOS)
Server built:   Nov  5 2018 01:47:09
$ grep wp_version /var/www/html/wp-includes/version.php
 * @global string $wp_version
$wp_version = '5.1.1';
```

## ドキュメントルート以下のアクセス権

ルートディレクトリ以下を全部アクセス拒否して、ドキュメントルート以下のみアクセス可能にします。

* Options：[mod_rewriteを利用するため、FollowSymLinksのみ有効化][1]しておきます。ちなみに、mod_rewriteを使わない場合でも、性能を優先する場合はFollowSymLinksを有効化しておいたほうがいいです。無効化すると、アクセスのたびにそのファイルがシンボリックリンクかどうかを検査するオーバーヘッドがかかります。
* AllowOverride：.htaccessは使わないのでNoneにしておきます。設定ファイルが散らばる上、アクセスのたびにサーバプロセスが各ディレクトリの.htaccessを探しに行って読み込んで処理を行うというオーバーヘッドがあるため、基本的に無効化したほうがいいです。

```bash
DocumentRoot "/var/www/html"
<directory />
    AllowOverride none
    Require all denied
</directory>
<directory /var/www/html>
    Options FollowSymLinks
    AllowOverride None
    Require all granted
</directory>
```

なお、デフォルトだと`/var/www`や`/var/www/cgi-bin`が公開される設定になっていることがあります。これらを外部に公開する必要がなければコメントアウトしておきます(基本的に公開の必要はないです)。

## .ht*系ファイルのアクセス制御

ディレクトリごとの設定を記述する.htaccessファイルや、ベーシック認証を利用する場合の.htpasswdは、ドキュメントルート以下に配置する必要があります。これを外部から見られないための設定。大抵デフォルトでdeniedされてます。

```bash
<files ".ht*">
    Require all denied
</files>
```

## WordPressの外部から見られたら困るファイル/ディレクトリのアクセス制御

### 見られたくない/見せる必要がないファイル達

以下のファイル達は外から見られたくない/見せる必要がないため、filesコンテナを使って一つずつアクセス制御します。見せる必要がないファイル達は削除してしまう方法もありますが、WordPressアップデート時に勝手に復元されたりするため、アクセス制御しておくのが無難です。

* license.txt
* readme.html
* wp-activate.php
* wp-config.php
* wp-config-sample.php
* wp-signup.php

filesコンテナの例は以下の通り。

```bash
<files wp-config.php>
  Require all denied
</files>
```

### 見せたくないディレクトリ達

私はログイン画面やコメント登校時にCAPTCHAで画像認証をつけられるプラグイン｢[si-captcha-for-wordpress][2]｣をWordPressにインストールしています。このプラグインのログインキャッシュを保存しているディレクトリは外から見られないようにしておきます。なお、自分で設定しなくともプラグインインストール時に勝手に.htaccessに書いてくれますが、私は.htaccessを利用していないため、/etc/httpd/以下の適当なファイルにべた書きしています。

```bash
<directory var/www/html/wp-content/plugins/si-captcha-for-wordpress/captcha/cache/>
  Require all denied
</directory>
```

ちなみにですが、このプラグインは開発者が交代した瞬間にバックドアをしこまれたそうな。すでに修正済みですが、もうこのプラグインはメンテされていません。何かに乗り換えないとなぁ。

参考： <https://gigazine.net/news/20171221-wordpress-captcha-plugin-backdoor/>

### 自分だけは見たいファイル達

WordPressに自分だけがログインできるようにするため、wp-login.phpはIPアドレスやドメイン名などで絞っておきます。

```bash
<files wp-login.php>
  <RequireAny>
    Require ip 127.0.0.1
    Require host .some.domain.jp
  </RequireAny>
</files>
```

### 自分だけは見たいディレクトリ達

wp-login.php同様、管理画面は自分だけがログインできるようにしておきます。

```bash
<Directory /var/www/html/wp-admin>
  <RequireAny>
    Require ip 127.0.0.1
    Require host .some.domain.jp
  </RequireAny>
</Directory>
```

### 意図的に公開せねばならないファイル

admin-ajax.phpというファイルはwp-admin/以下にあるので、このままだと外部からアクセスできません。しかし、このファイルはプラグインやテーマ等がAjax経由でCSSを呼び出したりするのに利用するため、アクセスできないと表示がバグります。なのでFileMatchコンテナでこのファイル名に対するアクセスは全許可にしてあげます。

```bash
<FilesMatch "(admin-ajax.php)$">
  Require all granted
</FilesMatch>
```

## サーバ情報の隠蔽

おなじみ。上がHTTPレスポンスヘッダに、下がエラーページのフッタ等にサーバのバージョン等細かい情報を載せない設定です。

```bash
ServerTokens ProductOnly
ServerSignature Off
```

## mod_rewrite設定

私はDos攻撃の回避や特定のファイルへのアクセス制御にmod_rewriteを利用しています。

```bash
<Directory /var/www/html>
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    (いろいろ設定)

  </IfModule>
</Directory>
```

Directoryコンテナでドキュメントルートを指定して設定をしていきます。ちなみに.htaccessにこの設定を書く場合はDirectoryコンテナは不要。その.htaccessがあるディレクトリが規定のDirectoryコンテナになります。

### xmlrpc.phpへのDos攻撃の回避

このファイルは、その名の通りGET/POSTされたときにxmlフォーマットでWordPressのリモートプロシジャーコールを呼び出すためのファイルです。ピンバック機能やメール投稿機能、アプリ投稿機能が不要ならアクセスを禁止します。必要でもIPアドレス等で制限をかけたほうがいいです。このファイルへのアクセスが成功すると、リモートでWordPressを制御できるため、ブルートフォース攻撃がかけられることが多く、そのためにDosが起きることがあります。

で、なぜこのファイルのみRequire all deniedでアクセスを禁止するのではなく、mod\_writeでアクセスパスを書き換えてるというと、Dos攻撃に対しては403を返すより適当なアドレスにリダイレクトさせた方がサーバの負荷が軽くなるからです。Apache公式に詳しい解説がありますが、ApacheはHTTPリクエストに対して5段階のライフサイクルを経てレスポンスを返します(このライフサイクルは`mod_security`にも絡んできますので、知ってるとちょっと便利です)。

  1. URL-to-filename translation：URL-ファイル名の変換
  2. authentication：認証
  3. authorization：認可
  4. content：コンテンツの返却
  5. logging：ログへの書き込み

403を返す場合、Apacheは3番目の認可のプロセスまで処理をしないとレスポンス(4のコンテンツの返却)を行えません。一方、適当なアドレスへのリダイレクトを行う場合、1のURL-ファイル名の変換を完了した段階でレスポンスを返却できます。サーバプロセスが2と3をすっ飛ばして処理を終えられるということです。

参考：<https://httpd.apache.org/docs/2.4/en/rewrite/tech.html>

なので、Dos攻撃に対しては適当なアドレスへのリダイレクトを行うのが一番サーバ負荷が軽いです。そのため、以下のように、xxmlrpc.phpへのアクセスは全て0.0.0.0という無効なIPアドレスへリダイレクトを行います。

```bash
RewriteRule ^xmlrpc\.php$ http\:\/\/0\.0\.0\.0 [R=301,L]
```

### WordPressのauthorへのアクセスを拒否

WordPressは記事の筆者の一覧を表示する機能があります。が、これビルトインのWordPress管理者のIDも表示してしまいます。このIDはWordPress管理画面へのログインIDだったり、データベースへの接続ユーザだったりするので、筆者一覧は無効化しておき、トップページへリダイレクトするようにしておきます(あまり本質的な処置の仕方ではない。なんかいい方法あるのかな)。

```bash
RewriteRule ^author/(.*)? / [R=302,L]
RewriteRule ^archives/author/(.*)? / [R=302,L]
```

### `Let's Encrypt`のSSL証明書更新bot用設定

このサーバは`Let's Encrypt`をSSL証明書に使っています。このCAはSSL証明書の更新を自動でやってくれるスクリプトを配布してくれています。自動更新のやり方はいろいろありますが、私は以下の記事で書いたやり方でやっているため、そのための設定を書いておきます。.well-known/acme-challengeというパスに`Let's Encrypt`が存在確認のためにアクセスしにくるので、このパスはHTTPSにリダイレクトさせずにそのままコンテンツを返却します。

[ドメイン検証方式｢TLS-SNI-01｣に脆弱性が見つかったのでCertbotのコマンドをいじろうと思ったけどいじらなくてよかった話][3]

```bash
RewriteRule ^/.well-known/acme-challenge - [L]
```

参考：<https://certbot.eff.org/docs/using.html#webroot>

が、これ書きながら気づいたけどcertbotを`–apache`オプション付きで動かしているからこの設定いらんのかも……今度検証してみます。

参考：<https://certbot.eff.org/docs/using.html#apache>

### HTTP→HTTPSへのリダイレクト設定

前述の`Let's Encrypt`がアクセスしてくるパス以外へのHTTPアクセスは、全てHTTPSアクセスにリダイレクトします。前述の設定より下に書きます。301(Moved Permanently)を指定することでSEO対策にもなります。

```bash
RewriteCond %{HTTPS} off
RewriteRule .* https://www.serotoninpower.club/$1 [R=301,L]
```

### WordPressのデフォルトのmod_write設定

WordPressをインストールすると、ドキュメントルート直下の.htaccessに自動的に以下のような記述がされます。先述の通り、私は.htaccessを使用していませんので、/etc/httpd/以下の適当なファイルにべた書きです。

```bash
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
```

意味は以下の通り、

  1. 正規表現で^index.php$に該当するファイルにアクセスされたら置換せずmod_writeの評価を打ち切る
  2. リクエストされたファイルが存在しない場合、
  3. もしくはディレクトリが存在しない場合は、
  4. どんなアクセスパスでもindex.phpへのアクセスに変換する

404なんかをプログラム(この場合index.php)で処理させて返却したい場合の書き方です。

以上、mod\_rewriteの設定でした。正直mod\_rewriteはあまり理解できていないし、複雑すぎて触りたくない……

## モジュール設定

不要なモジュールは無効化しておきます。数が多く、不要かどうかの判別が難しいですが、これは時間を取って一つ一つ精査していたほうがいいです。機能が有効である＝穴が開いている、なので、使わない機能は無効化します。

### WebDAV系

httpdプロトコルで共有ディレクトリを作成できるWebDAV系は、きちんとアクセス制御しないとバックドアを簡単に設置できます(PUTメソッドでWebShell送り付けるだけです)。WebDAV機能を使わない場合はモジュールごと無効化したほうが良いです。

* `#LoadModule dav_module modules/mod_dav.so`
* `#LoadModule dav_fs_module modules/mod_dav_fs.so`
* `#LoadModule dav_lock_module modules/mod_dav_lock.so`

### CGI系

いまどきCGIなんて使わないので無効化しておきます。

* `#LoadModule cgid_module modules/mod_cgid.so`
* `#LoadModule cgid_module modules/mod_cgid.so`
* `#LoadModule cgi_module modules/mod_cgi.so`

ちなみにFastCGIやSimpleCGIは使うことがあるかもしれません。その場合は以下のモジュールを有効化します。私は使いませんので無効化してあります。

* `#LoadModule proxy_fcgi_module modules/mod_proxy_fcgi.so`
* `#LoadModule proxy_scgi_module modules/mod_proxy_scgi.so`

### Apacheでフォーム認証を行うモジュール

アプリケーション側ではなくWebサーバ側でフォーム認証を実装することもできるそうです(あんまりよく知らない)。大体アプリケーション側で実装するか、Webサーバ側で実装するならHTTPS + BASIC認証で済ますことが多いんじゃないでしょうか。

* `#LoadModule auth_form_module modules/mod_auth_form.so`

### LDAP連携モジュール

ApacheはBASIC認証にLDAPのユーザ情報を利用することができます。使わないので無効化しておきます。他に何かLDAP連携って使い道あるのかな。

* `#LoadModule ldap_module modules/mod_ldap.so`
* `#LoadModule authnz_ldap_module modules/mod_authnz_ldap.so`

### ロードバランサー系モジュール

Apahceは本当に多機能なのでロードバランサを実装することもできます。使わないので無効化します。ちなみにここでは無効化していませんが、ロードバランサの実装にはmod_proxyも必要です。

* `#LoadModule proxy_balancer_module modules/mod_proxy_balancer.so`
* `#LoadModule lbmethod_bybusyness_module modules/mod_lbmethod_bybusyness.so`
* `#LoadModule lbmethod_byrequests_module modules/mod_lbmethod_byrequests.so`
* `#LoadModule lbmethod_bytraffic_module modules/mod_lbmethod_bytraffic.so`
* `#LoadModule lbmethod_heartbeat_module modules/mod_lbmethod_heartbeat.so`

### セッション管理系モジュール

セッション管理もアプリケーション側でやって、Webサーバからは触らないことが多いんじゃないでしょうか。無効化しておきます。

* `#LoadModule session_module modules/mod_session.so`
* `#LoadModule session_cookie_module modules/mod_session_cookie.so`
* `#LoadModule session_dbd_module modules/mod_session_dbd.so`
* `#LoadModule session_crypto_module modules/mod_session_crypto.so`

### 不要なプロキシ系モジュール

私はApacheを利用してマストドンとこのブログをリバースプロキシさせていたことがあったので、以下の3つのプロキシ系モジュールは有効になっています。マストドンはWebSocketを使うのでそのプロキシも。

* `LoadModule proxy_module modules/mod_proxy.so`
* `LoadModule proxy_http_module modules/mod_proxy_http.so`
* `LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so`

しかし、それ以外のプロトコル・方式のプロキシは利用しないため無効化しておきます。FastCGIやSimpleCGIのプロキシモジュールや、ロードバランサに使proxy\_balancer\_moduleは先ほど無効化している旨を記載したためここでは省略します。

* `#LoadModule proxy_ajp_module modules/mod_proxy_ajp.so`
* `#LoadModule proxy_connect_module modules/mod_proxy_connect.so`
* `#LoadModule proxy_express_module modules/mod_proxy_express.so`
* `#LoadModule proxy_fdpass_module modules/mod_proxy_fdpass.so`
* `#LoadModule proxy_ftp_module modules/mod_proxy_ftp.so`

### ユーザディレクトリ系を提供するモジュール

このモジュールを有効化し、なんか設定をしておくとサーバのホームディレクトリをユーザごとに公開できます。レンサバなんかでよく使われる方式ですね。不要なので無効化します。

* `#LoadModule userdir_module modules/mod_userdir.so`

### ディレクトリにアクセスされたときにディレクトリ一覧を返すモジュール

ファイル名を指定せずディレクトリとしてアクセスされた際(例：`https://sample.com/here/`)に、Apacheが自動的にそのディレクトリ一覧を生成して返すモジュールがあります。WebDAVサーバやパッケージリポジトリなんかで使われていますが、いらんファイル見せてしまう可能性があるので普通のWebサーバには不要です。

* `#LoadModule autoindex\_module modules/mod\_autoindex.so`

以上、不要なモジュールをブラックリスト方式で列挙しましたが、まだまだ不要なモジュールがあります。私も時間をとってもっとちゃんと調べたい。

## タイムアウト設定

タイムアウト設定やプロセス数の設定は、性能設計としてきちんとやった方がいいんだろうなぁ……(いつやるのか)

```bash
Timeout 15
KeepAlive on
MaxKeepAliveRequests 100
KeepAliveTimeout 7
```

## HTTPヘッダ設定

* `X-Powered-By`: PHPのバージョン情報を隠蔽
* `Header edit Set-Cookie ^(?!.secure).$ $1;secure` : Cookieにsecure属性を付与してhttpのサイトにはCookieを送らせないようにブラウザに指示。後述のHSTSと合わせて二重に防御
* `X-Frame-Options SAMEORIGIN`: クリックジャッキング対策。同一ドメイン以外のフレームは表示させないようブラウザに指示してこのサイトが他サイトに埋め込まれることを防ぎます。
* `X-XSS-Protection "1; mode=block`: ブラウザのXSSフィルターを有効にさせ、XSS検出時にレンダリングを停止するよう指示
* `X-Content-Type-Options nosniff`: ブラウザにコンテンツの内容からコンテンツタイプを推測させないようにして、`Content-Type` ヘッダのMIMEタイプを全面的に信用するよう指示。古いIEなんかがhtml以外のファイルを勝手にhtmlとして判定してXSSが起こらないように。

```bash
Header unset "X-Powered-By"
Header edit Set-Cookie ^(?!.*secure).*$ $1;secure
Header set X-Frame-Options SAMEORIGIN
Header set X-XSS-Protection "1; mode=block"
Header set X-Content-Type-Options nosniff
```

なんでCookieにHttpOnly属性つけないのかというと、WordPress側の実装として、ブラウザがCookieを利用可能かどうか、｢`wordpress_test_cookie`｣というcookieの値をjavascriptで読み取れるかどうかで判定しているからです。まぁ認証トークンやユーザIDにはWordPress側の実装でHttpOnlyつけてるからとりあえずいいかな……と思いますがなんか気持ち悪い。

## SSL設定

一般的なSSLの設定の仕方は省略して、セキュリティ周りを詳しく書きます。

### SSL/TLSプロトコル

TLS1.2に限定。

```bash
SSLProtocol +TLSv1.2
```

### SSL/TLSの暗号スイート設定

[ここ][4]で詳しく書いてます。

```bash
SSLCipherSuite DEFAULT:!kRSA:!kDHr:!kDHd:!aNULL:!eNULL:!EXP:!DES:!3DES:!RC4:!RC2:!IDEA:!MD5:!SHA1
```

### 暗号スイートをクライアント側に選択させない

サーバ側が指定する暗号スイートの中からクライアントに利用する暗号スイートを選ばせます。ダウングレード攻撃を防ぎます。

```bash
SSLHonorCipherOrder On
```

### HSTS (HTTP Strict Transport Security) の有効化

HTTPでのアクセスを強制的にHTTPSにリダイレクトさせ、それ以降しばらくの間HTTPSでアクセスしてくるようにクライアントに通知する機能です。315360000秒、つまり向こう10年HTTSPでアクセスしてくるようよう通知します。

```bash
Header set Strict-Transport-Security "max-age=315360000;"
```

## mod_security設定

[ここを参照][5]。

## そのほかこまごました設定

### デフォルトのWelcomeページの自動生成無効化

いわゆるデフォルトコンテンツです。/etc/httpd/conf.dあたりにwelcome.confというファイルがあり、そこにデフォルトコンテンツ自動生成の設定が書かれているため全部コメントアウトします。ファイル自体を削除してしまうと、バージョンアップ等の際に復元されてしまうため、ファイルは残しておきます。

### Webサーバでのインデックスファイルへのリダイレクトの無効化

`autoindex_module`を無効化することでディレクトリ一覧の自動生成は止めましたが、ディレクトリへのアクセスを受けた際にWebサーバ側で自動的に特定のインデックスファイル(index.htmlなど)に自動的にリダイレクトを行う機能があります。WordPressの場合、この機能は`mod_rewrite`にて実現されているため、Webサーバでの制御は不要です。各DirectoryコンテナのOptionsディレクティブからIndexesを削除しておきます。

## データ圧縮設定

こちらのサイト様の記載を全面的に参考にさせて頂きました。これやらないと[GoogleのPageSpeed Insights][6]でペケくらいます。実感としてもだいぶ早くなります。

<https://jyn.jp/apache-setting-deflate/>

ただ、SSL + 圧縮と聞くとCRIMEやBEASTのことが頭をよぎります。これらの攻撃は攻撃を受けるとSSLが第三者に解読されてしまいますが、第三者がクライアントに任意のリクエストを秘密裏に何度でも送らせることができるという前提の上に成り立つものです。悩みましたが速さとトレードオフしてます。

## TRACEメソッドの無効化

TRACEメソッドは受け取ったリクエストをそのまま返却するデバッグ用のHTTPメソッドです。必要ないですしクロスサイトトレーシングの原因となるため無効化します(ブラウザで対策取られていますが)。

```bash
TraceEnable offTraceEnable off
```

## おわりに

Apacheって普通にWebサーバとして使いたいだけなのにこんなに設定が必要です。細かくチューニングできるのが良い点ですけどね。書いているうちにところどころここ甘いなってのがわかったので時期をみて詳しくやりたい。でももうnginxに移行したい気もする。やりたいこと一杯あるのにプリコネばっかやってる。おわり。

 [1]: http://httpd.apache.org/docs/2.4/mod/mod_rewrite.html
 [2]: https://wordpress.org/plugins/si-captcha-for-wordpress/
 [3]: https://www.serotoninpower.club/archives/544
 [4]: https://www.serotoninpower.club/archives/367
 [5]: https://www.serotoninpower.club/archives/499#more-499
 [6]: https://developers.google.com/speed/pagespeed/insights/?hl=ja
