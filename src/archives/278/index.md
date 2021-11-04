---
title: Windows+CygwinでSquidをコンパイルしてWindowsサービス化
description: "以前の記事でWindows上にてSquidを動かした際、Windowsサービス化ができなくて、ドス窓を閉じたりサインアウトしたりするとSquidのプロセスが停止してしまう問題がありました。ようやっとこれが解決したのでまとめます。"
author: seroto_nin
type: post
date: 2017-10-22T07:04:22+00:00
url: /archives/278
categories:
  - Cygwin
  - Squid
  - Windows

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

[以前の記事][1]でWindows上にてSquidを動かした際、Windowsサービス化ができなくて、ドス窓を閉じたりサインアウトしたりするとSquidのプロセスが停止してしまう問題がありました。ようやっとこれが解決したのでまとめます。

<!--more-->

結局、既存のSquidのWindows用バイナリでは設定を柔軟に変更した上でのWindowsサービス化はできませんでした。なので以下の茨の道をたどります。

## ながれ

* Windows上にCygwinをインストール
* Cygwin上でSquidをコンパイル
* CygwinのコマンドcygrunsrvにてSquidをWindowsサービス化する

## 環境

おそらく非常に環境に左右される手順だと思いますので厳密に書いておきます。

* Windows Server 2016 Standard Evalation バージョン1607 OSビルド14393.693
* Cygwin 2.9.0
* Squid 3.5.11

## Cygwinのインストール

<https://cygwin.com/>からインストーラをダウンロード。

ダウンロードしたらインストール開始。基本的に次へ次へでOKです。パッケージをダウンロードするリポジトリの選択画面では、ダウンロード速度を考え日本のサーバをおすすめします。んで以下のパッケージをポチポチインストール。

```bash
gcc-core
gcc-g++
gcc-tools-epoch2-autoconf
gcc-tools-epoch2-automake
gccmakedep
gdb
make
make-debuginfo
automake
automake 1.15
autoconf
autoconf-archive
autoconf2.1
libtool
cppunit
libcom_err-devel
libcrypt-devel
libdb-devel
libexpat-devel
libkrb5-devel
libiconv-devel
openldap-devel
openssl-devel
libsasl2-devel
libxml2-devel
perl-DBI
wget
patch
cygrunsrv
cygrunsrv-debuginfo
```

インストールするパッケージを選択し終わったらインストール開始。ちょっと時間がかかります。

## Squidのコンパイルとインストール

ここからが鬼門。まずはSquidに必要なディレクトリを作成しておく。

```bash
mkdir /usr/share/squid
mkdir /var/log/squid
mkdir /var/run/squid
```

次にソースコードを持ってきて解凍し、Cygwin上での最大ファイルディスクリプタ数を拡張するパッチをダウンロードしてあてる。

```bash
cd /usr/src
wget http://www.squid-cache.org/Versions/v3/3.5/squid-3.5.11.tar.gz
tar xvfz squid-3.5.11.tar.gz
cd squid-3.5.11
wget https://docs.diladele.com/_downloads/3-5-11.patch
patch -p1 &lt; 3-5-11.patch
```

configureを実行。ワンライナーで。

```bash
./configure --bindir=/bin/squid --sbindir=/usr/sbin/squid --sysconfdir=/etc/squid --datadir=/usr/share/squid --disable-strict-error-checking --with-logdir=/var/log/squid --with-swapdir=/var/cache/squid --with-pidfile=/var/run/squid.pid --enable-ssl --enable-delay-pools --enable-ssl-crtd --enable-icap-client --enable-esi --disable-eui --localstatedir=/var/run/squid --sharedstatedir=/var/run/squid --datarootdir=/usr/share/squid --enable-disk-io="AIO,Blocking,DiskThreads,IpcIo,Mmapped" --enable-auth-basic="DB,LDAP,NCSA,POP3,RADIUS,SASL,SMB,fake,getpwnam" --enable-auth-ntlm='fake' --enable-auth-negotiate='kerberos,wrapper' --enable-external-acl-helpers='LDAP_group,SQL_session,eDirectory_userip,file_userip,kerberos_ldap_group,session,time_quota,unix_group,wbinfo_group' --with-openssl --with-filedescriptors=65536 --enable-removal-policies="lru,heap" --disable-wccp --disable-wccpv2
```

無事完了したらconfigureのバグを修正。configureはWindowsがmemrchr()というシステム関数を持っていると判断していますが、実際持っていません。厳密に言うとCygwinを動かすためだけに使用していますが、Squidは利用できません(ソースコードの書き換えが必要になる)。なのでmemrchr()を持ってないよと明示してやり、システム側の関数ではなくソースコードに添付の関数を使うように指示してやる必要があります。

```bash
$ vi config.status
/MEMRCHR #検索
-D["HAVE_MEMRCHR"]=" 1"
+D["HAVE_MEMRCHR"]=" 0"
```

満を持してmakeとインストール。

```bash
make && make install
```

パス変数を追加し、インストールできたか確認。

```bash
echo "export PATH=${PATH}:/usr/sbin/squid" >> /etc/profile
source /etc/profile
squid -v
```

普通は不要ですが、私はフォワプロとリバプロを分けて稼働させる必要があったため、バイナリ名を変更。

```bash
mv /usr/sbin/squid/squid /usr/sbin/squid/squidReverse
squidReverse -v
```

このタイミングで設定ファイル(squid.conf)は編集しておき、タイポ等ないようにしておきます。そして各種ファイルを生成するため一度手動起動。これやらずにサービス化すると各種ファイル所有者がSYSTEMになって人間が触れなくなります。私はサービス名と設定ファイル名を変更していたので-nオプションと-fオプションでそれを指定。起動を確認したらシャットダウンを2回。なんか2プロセス動いているみたいなので。

```bash
squid -n squidReverse -f /etc/squid/squidReverse.conf
ps ax | grep squidReverse
squid -n squidReverse -f /etc/squid/squidReverse.conf -k shutdown
squid -n squidReverse -f /etc/squid/squidReverse.conf -k shutdown
ps ax | grep squidReverse
```

## cygrunsrvにてWindowsサービス化

以下のコマンドでsquidをWindowsサービス化。そして起動。

```bash
cygrunsrv --install squidReverse --path /usr/sbin/squid/squidReverse --args "-N -n squidReverse -f /etc/squid/squidReverse.conf" -y tcpip --type auto
cygrunsrv --start squidReverse
```

あとはservices.mscににsquidReveseがあるか、起動しているかを確認し、外部から疎通確認。ファイアウォールの穴開け忘れずに。

## 所感

さらっと手順書きましたけど、前回から更新がこんだけ期間空いているのはなぜなのか察してください。もう二度とLinuxのアプリをWindows上で使うなんてやらん。

## おまけ(Squidのコンフィグの無停止リロード)

Windowsサービスは｢設定のリロード｣という機能がないため、設定をリロードしたかったらサービスを再起動する必要がありますが、これは数秒だけどダウンタイムを発生させます。Linuxだと普通に無停止リロードできるのに。SquidはLinuxのアプリなので、services.mscからはできませんがコマンドラインからは無停止リロードできます。Cygwinのライブラリにパスを通したうえでsquidのリロードコマンドを実行します。

```powershell
C:\Users\Administrator> set PATH=C:\cygwin64\bin;%PATH%
C:\Users\Administrator> C:\cygwin64\usr\sbin\squid\squidReverse -n squidReverse -k reconfigure -f /etc/squid/squidReverse.conf
```

結論として、ますますWindowsが嫌いになったというお話でした。おわり。

 [1]: https://www.serotoninpower.club/archives/227
