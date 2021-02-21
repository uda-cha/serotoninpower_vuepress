---
title: ドメイン検証方式｢TLS-SNI-01｣に脆弱性が見つかったのでCertbotのコマンドをいじろうと思ったけどいじらなくてよかった話
description: "このブログサーバのSSL/TLS証明書は、Certbotというツールを使い、`Let’s Encrypt`というCAから自動で発行/更新してもらっていました。2019年1月18日に`Let’s Encrypt`からこんなメールがきたので対応しました。"
author: seroto_nin
type: post
date: 2019-01-18T19:06:13+00:00
url: /archives/544
categories:
  - Apache
  - CentOS
  - Linux
  - セキュリティ

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

```bash
Hello,

**Action is required to prevent your Let's Encrypt certificate renewals from breaking.**

Your Let’s Encrypt client used ACME TLS-SNI-01 domain validation to issue a certificate in the past 60 days.

TLS-SNI-01 validation is reaching end-of-life and will stop working on **February 13th, 2019.**

You need to update your ACME client to use an alternative validation method (HTTP-01, DNS-01 or TLS-ALPN-01) before this date or your certificate renewals will break and existing certificates will start to expire.
(~snip~)
```

ここ60日以内にTLS-SNI-01のドメイン検証方式を使ってうちの証明書発行しましたよね、2/13にobsoletedになるからやめんかいって内容でした。

## ドメイン検証とは

ほんまにそのドメイン所有してるんやろな？　っていう確認です。ここでいう所有者はSSL/TLSを使用するサーバで、このブログサーバを指します。ドメインを所有しているか確認するのは証明書発行団体、いわゆるCAです。

SSL/TLSにおける本人性証明は、証明書を送り付けてきたサーバのドメイン名を証明するものでしかありません。クライアントは、アクセスしたいサーバのドメイン名がDNSで解決できること、解決したIPアドレスにアクセスした結果受け取った証明書が正しいドメイン名で発行されていることの2点を確認することで、三段論法的にそのサーバが確実にアクセスしたいドメイン名のサーバであることを確認します。誰にも検証されないのであれば、この2点のうち後者を偽装し、このブログサーバが勝手にgoogle.comのドメイン名を名乗って証明書を発行してもらうことも可能です(あとは、google.comはブログサーバのIPアドレスを指すんだよとクライアントのDNSリゾルバを偽装させてしまえば完全になりすましが可能です)。

なので、CAは証明書を発行する前に、発行相手のサーバのドメイン名を確認することがあります。これがドメイン検証。｢することがある｣って言い方なのは、CAがサーバ相手をデジタル(オンライン)で確認するのではなく、アナログ(オフライン)で確認することもできるからです。`Let’s Encrypt`の証明書を自動で更新するCertbotは、自動なのでオンラインで検証してきます。

## ACMEにおける各種のドメイン検証方式

`Let’s Encrypt`がオンラインでドメインを検証するプロトコルはACMEと言い、インターネットドラフト化されています。現在のACME(v18)で使える主なドメイン検証方式は以下の2つ。

### http-01

検証したい対象(サーバ)が80/tcpのHTTP(のみ。ポート変更やHTTPSは不可)で公開しているフォルダに特定の文字列が書かれたファイルを置いておいて、CAがDNS経由でそのサーバにアクセスでき、特定の文字列が書かれたファイルを読めることを以て、そのサーバがそのドメインを持っていることを確認します。パスはおきまり(/.well-known/acme-challenge/)で、ファイル名と文字列は事前にCAと合意しておく必要がありますが、たいていCAから指定されることが多いと思います。SSLアクセラレータ機能つきのロードバランサやリバースプロキシでWebサーバを運用している場合、CAが外からきちんとそのファイルにアクセスできるよう振り分けルールを書いてやらなきゃなりません。

### dns-01

検証したい対象のサーバが属するドメインのTXTレコードに、CAから指定された文字列を書いておき、CAに読んでねってお願いしたタイミングでCAがそのレコードを読めることを以て、そのサーバがドメインを所有していることを確認します。こっちのほうが簡単ですが、私はスタンドアロンのWebサーバを運用しているためhttp-01でもdns-01でも対して手間が変わらないことと、DNSの管理コンソールに入るのがめんどかったこととで採用しませんでした。

参考：<https://tools.ietf.org/html/draft-ietf-acme-acme-18#section-8.3>から

あとは今回脆弱性が見つかったtls-sni-01と、昨年実装されたばっかりのtls-alpn-01という方式があります。

## tls-sni-01の脆弱性について

<https://community.letsencrypt.org/t/2018-01-09-issue-with-tls-sni-01-and-shared-hosting-infrastructure/49996>に詳しく書かれています。同一IPアドレスで複数のWebサーバをホスティングしている環境で、ユーザが任意の証明書ファイルをアップロードできる(ホスティングサービス側でユーザがドメインを保有しているか確認しない)場合に、攻撃者がドメイン名を詐称した証明書を作成可能だそうです。

そもそものtls-sni-01の仕組みは(たぶん)こう。検証を受けるサーバは、検証時にいったん適当なドメイン名にて自己証明書(以下、ドメイン検証用自己証明書)を作成します。この適当なドメイン名は、CAと事前に合意しておきます。検証するCAは、そのサーバの正しいドメイン名をDNSで検索してIPアドレスを正引きし、そのIPアドレス宛にSNIを使ってドメイン検証用自己証明書に記載の適当なドメイン名へのアクセスを要求します。その際、サーバは先ほど作成したドメイン検証用自己証明書をCAに返しますが、その適当なドメイン名が事前に合意した値と一致したら、そのサーバは(正しいほうの)ドメインを保有していると判定します。

攻撃の流れは(たぶん)こう。攻撃者が管理するドメインのサーバが、同一IPアドレスで複数Webサーバをホスティングするサービス上で稼働している場合を仮定します。被害者はこのホスティングサービスで稼働する他のサーバです。攻撃者は、被害者のドメイン名の証明書を｢更新する｣という動作を行うべく、tls-sni-01を使い、被害者のドメイン名のドメイン検証用自己証明書を生成します。そして、そのドメイン検証用自己証明書をホスティングサービスにアップロードします。CAがドメイン検証を行うべく、DNSで被害者のWebサーバのドメインを正引きすると、ホスティングサービスのIPアドレスが引けます。そしてCAはSNIを使ってそのIP宛にドメイン検証用自己証明書を要求すると、ホスティングサービスは普通にそれを返却します。CAはきちんと事前に合意済みの適当なドメイン名がドメイン検証用自己証明書に記載されていることを確認できたので、被害者のドメイン名の証明書を、攻撃者のWebサーバに対して発行してしまいます。

このブログサーバはVPSを借りているのであんまり関係ない脆弱性ですが、`Let’s Encrypt`がtls-sni-01で発行された証明書を失効させるといっているので対応します。

## このサーバの状況

```bash
$ yum info certbot python2-certbot-apache
Loaded plugins: fastestmirror
Loading mirror speeds from cached hostfile
 * base: ftp-srv2.kddilabs.jp
 * centosplus: ftp-srv2.kddilabs.jp
 * epel: ftp.iij.ad.jp
 * extras: ftp-srv2.kddilabs.jp
 * updates: ftp-srv2.kddilabs.jp
Installed Packages
Name        : certbot
Arch        : noarch
Version     : 0.29.1
Release     : 1.el7
Size        : 76 k
Repo        : installed
From repo   : epel
Summary     : A free, automated certificate authority client
URL         : https://pypi.python.org/pypi/certbot
License     : ASL 2.0
Description : certbot is a free, automated certificate authority that aims
            : to lower the barriers to entry for encrypting all HTTP traffic on
            : the internet.

Name        : python2-certbot-apache
Arch        : noarch
Version     : 0.29.1
Release     : 1.el7
Size        : 906 k
Repo        : installed
From repo   : epel
Summary     : The apache plugin for certbot
URL         : https://pypi.python.org/pypi/certbot-apache
License     : ASL 2.0
Description : Plugin for certbot that allows for automatic configuration of
            : apache
```

Certbotはepelリポジトリにあるものを使用しており、apche用プラグインを利用しています。epelといえどもRH系はStableなので、昨年発表されたばっかりのtls-alpn-01には対応していませんでした。そのため、先ほど述べた通りhttp-01をドメイン検証方式として利用することにします。

## 証明書更新コマンドの変更

通常はこれだけ。

```bash
sudo certbot renew --force-renewal --apache
```

ドメイン検証方式を指定するには、`–preferred-challenges`オプションを付与します。

```bash
sudo certbot renew --force-renewal --apache --preferred-challenges http-01
```

これだけ。

## ただし、epelからcertbotを落としてきている場合、yum update一発で解消されるっぽい(未検証)

私は`–preferred-challenges`を指定せずにデフォルト値で証明書を更新していました。それでtls-sni-01を使うなと怒られたので、きっと最近までデフォルト値はtls-sni-01だったのだと思います。

しかし、このメールを受け取った後にcertbotコマンドをたたいたところ、`–preferred-challenges`を指定せずともhttp-01がデフォルトになっていました。

```bash
$ sudo certbot renew --dry-run --apache
(~snip~)
http-01 challenge for www.serotoninpower.club
(~snip~)
```

certbotが2018年12月11日に更新されているようなので、ひょっとしたらこのタイミングでデフォルト値がtls-sni-01からhttp-01に変わった可能性があります。

```bash
$ rpm -qi certbot
Name        : certbot
Version     : 0.29.1
Release     : 1.el7
Architecture: noarch
Install Date: Sat 22 Dec 2018 06:29:33 PM JST
Group       : Unspecified
Size        : 77540
License     : ASL 2.0
Signature   : RSA/SHA256, Tue 11 Dec 2018 12:55:04 PM JST, Key ID 6a2faea2352c64e5
Source RPM  : certbot-0.29.1-1.el7.src.rpm
Build Date  : Tue 11 Dec 2018 12:07:15 PM JST
Build Host  : buildvm-10.phx2.fedoraproject.org
Relocations : (not relocatable)
Packager    : Fedora Project
Vendor      : Fedora Project
URL         : https://pypi.python.org/pypi/certbot
Bug URL     : https://bugz.fedoraproject.org/certbot
Summary     : A free, automated certificate authority client
Description :
certbot is a free, automated certificate authority that aims
to lower the barriers to entry for encrypting all HTTP traffic on the internet.
```

`rpm -q –changelog`には特に記載なし。ただ/var/log/letsencryptを確認すると、確かにパッケージ更新前と後でドメイン検証方式が変わっているみたいなので、まぁたぶんyum一発で問題ないと思います。

おわり。なんかいつまでたってもエンジニアっぽいブログが書けない(非常に文系っぽいブログだ)。
