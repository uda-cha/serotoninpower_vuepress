---
title: ApacheのCustomLogとTransferLogの違い
description: "この二つの違いがあんまりわかっていなかった上に、適当にApacheを設定していたせいで両方とも有効になっていて気持ち悪かったので、調べたことをメモしておきます。結論から言うと私はCustomLogだけでログを定義することにしました。"
author: seroto_nin
type: post
date: 2019-06-14T17:11:00+00:00
url: /archives/745
categories:
  - Apache
  - CentOS

---
# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## それぞれのディレクティブでできること/できないこと

どちらもログの出力先、フォーマットを指定するディレクティブですが、細かい部分が違います。CunstomLogの方が新しいんだと思う。以下、Apache2.4について記載します。

| |CustomLog|TransferLog|
|---|---|---|
|ファイルへのログ出力|〇|〇|
|プログラムへのログ出力|〇|〇|
|直前のLogFormatディレクティブによるログフォーマットの指定|〇|〇|
|LogFormatのニックネームでのログフォーマットの指定|〇|×|
|デフォルトのログフォーマット|デフォルト値なし|Common Log Format|
|ロギングする条件の指定|〇|×|

参考:

[Apache HTTP サーバ バージョン 2.4 CustomLog ディレクティブ][1]

[Apache HTTP サーバ バージョン 2.4 TransferLog ディレクティブ][2]

いずれもパスを指定してログを書き込んだり、loggerコマンドを通してSyslogにログを送り込んだりはできます。ログのフォーマットに関する指定とロギングする条件を指定できるかできないかに違いがあります。

## LogFormatディレクティブとCustomLog/TransferLog

LogFormatディレクティブはその名の通りログのフォーマットを規定するディレクティブです。このディレクティブは二つの書き方があります。

### ニックネームをつけないLogFormat

ログフォーマットの書き方は置いておいて、ただ単にログフォーマットを規定するだけなのがこちら。

```bash
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\""
```

この書き方をすると、このLogFormatディレクティブより下にあるTransferLogのログフォーマットを規定できます。上だとだめです。

### ニックネーム付きのLogFormat

ログフォーマットを規定した後に、ニックネームをつけることもできます。

```bash
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\"" ncsa_extended_combined
```

この書き方をすると、ニックネーム｢ncsa\_extended\_combined｣を使ってCustomLogのログフォーマットを定義することができます。

```bash
CustomLog /var/log/httpd/customed_log ncsa_extended_combined
```

CustomLogは、フォーマットをニックネームで呼び出せるため、設定をどの順で書くか気にする必要がありません。この点でCustomLogの方が使いやすいです。

参考: [Apache HTTP サーバ バージョン 2.4 LogFormat ディレクティブ][3]

余談ですがCustomLogはLogFormatディレクティブを指定せず直接フォーマットを書くこともできます。

```bash
CustomLog logs/access_log "%h %l %u %t \"%r\" %>s %b"
```

## ロギングする条件

CustomLogでは環境変数を利用してロギングする条件を指定することができます。以下はアクセス元のIPアドレスやホスト名を読み、条件に当てはまったらそのアクセスに環境変数｢no_log｣を設定する方法。

```bash
SetEnvIf Remote_Addr 127.0.0.1 no_log
SetEnvIf Remote_Host localhost no_log
```

参考:
[Apache HTTP サーバ バージョン 2.4 SetEnvIf ディレクティブ](https://httpd.apache.org/docs/2.4/ja/mod/mod_setenvif.html#setenvif)

CustomLogではアクセス時の環境変数を読み、ロギングするかしないかを指定することができます。びっくりマークで否定なので、以下の設定で環境変数no_logが指定されていないときのみロギングを行う、という設定ができます。

```bash
CustomLog /var/log/filtered_access_log ncsa_extended_combined env=!no_log
```

監視サーバからのポーリングアクセスはロギングしない(もしくは別のCustomLogディレクティブで別ログファイルにのみ書き出す)、という設定ができるので便利です。この点でもCustomLogの方が優れているので、TransferLogを使う理由はあまりありません。

## CentOS7のconf.d/ssl.confではなぜかTransferLogがデフォルト設定になっている

CentOS7でyumで入るApacheでしか確認していませんが、CustomLogはconf/httpd.confで定義されています。これは別に良いです。

```bash
<IfModule log_config_module>
  (~snip~)
  LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
  (~snip~)
  CustomLog "logs/access_log" combined
</IfModule>
```

んで、 CentOS7 デフォルトのApacheのSSLの設定ファイルはconf.d/ssl.confなのですが、こちらのデフォルト設定では、SSLを有効にしたバーチャルホストの設定内でTransferLogが有効化されています。

```bash
<VirtualHost _default_:443>
  (~snip~)
  TransferLog logs/ssl_access_log
  (~snip~)
</VirtualHost>
```

この設定ファイル内では、TransferLogより上でニックネームなしのLogFormatディレクティブの設定はなされていないので、`logs/ssl_access_log`はデフォルトのCommon Log Formatで記録されます。こうして、combinedなフォーマットの`logs/access_log`と、 Common Log Formatなフォーマットの`logs/ssl_access_log`がそれぞれ生成されます。

私は`logs/ssl_access_log`もロギングの条件を指定したかったので、TransferlogをやめてCustomLogに直しました。ログフォーマットもcommonやめてcombinedにしました。ついでにログファイル名も変えてます。SetEnvIfは上のコンテキストで設定しておけば下に継承されるので、httpd.confにてサーバレベルで設定しました。

* conf/httpd.conf

```bash
<IfModule log_config_module>
 (~snip~)
  SetEnvIf Remote_Addr 127.0.0.1 no_log
  SetEnvIf Remote_Host localhost no_log
  SetEnvIf Remote_Host some\.domain\.com no_log
  SetEnvIf Remote_Host \.sub\.some\.domain\.com no_log
  CustomLog "logs/access_log" combined env=!no_log
  (~snip~)
</IfModule>
```

* conf.d/ssl.conf

```bash
<VirtualHost _default_:443>
  (~snip~)
  CustomLog logs/wordpress_ssl_access_log combined env=!no_log
  (~snip~)
</VirtualHost>
```

これで、80番ポートへのアクセスは`logs/access_log`へ、443番ポートへのアクセスは`logs/wordpress_ssl_access_log`へ、それぞれ!no_log条件付きでcombined形式でロギングできるようになりました。おわり。

## おまけ1: commonとcombinedのフォーマットの違い

定義上はこうなってます。

```bash
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
LogFormat "%h %l %u %t \"%r\" %>s %b" common
```

combinedの方はリファラとユーザーエージェントが入ります。

## おまけ2: `logs/ssl_request_log`ってなんやねん

conf.d/ssl.confでは、デフォルトで以下のような設定も入っています。

```bash
<VirtualHost *:443>
 (~snip~)
  #  Per-Server Logging:
  #   The home of a custom SSL log file. Use this when you want a
  #   compact non-error SSL logfile on a virtual host basis.
  CustomLog logs/ssl_request_log \
            "%t %h %{SSL_PROTOCOL}x %{SSL_CIPHER}x \"%r\" %b"
</VirtualHost>
```

バーチャルホスト切るときは、各バーチャルホストで詳細にロギングすることにして、大元ではこんなコンパクトなログだけ残しとけばいいんじゃないということが書いてあります。複数のバーチャルホスト切ってないなら不要なのでコメントアウトしてます。

 [1]: https://httpd.apache.org/docs/2.4/ja/mod/mod_log_config.html#customlog
 [2]: https://httpd.apache.org/docs/2.4/ja/mod/mod_log_config.html#transferlog
 [3]: https://httpd.apache.org/docs/2.4/ja/mod/mod_log_config.html#logformat
