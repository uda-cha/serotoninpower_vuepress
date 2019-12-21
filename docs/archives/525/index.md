---
title: fail2banでブルートフォース攻撃からsshdを守る
description: "勉強としてたまにハードニング大会に参加しています。とあるシステムが与えられて、そこにレッドチームが攻撃をしかけるので、ブルーチームとしてその攻撃からシステムを防御する、というイベントです。私は基本いつもブルーチーム。

そんな中、真っ先に守らねばならない大穴なのがsshd。大抵、sshdは公開鍵認証のみを受け付ける設定にするか、アクセス元のセグメントでアクセス制御を行ってしまえばとりあえず防御完了なのですが、それができないシステムがたまにあります。参加人数が大人数かつ、攻撃側と防御側のセグメントが分けられていなかったり、すでにシステム内部に侵入済みであることを想定した大会であったり。今回は、そんな状況でもsshdを防御するために、fail2banというツールを使ってみます。"
author: seroto_nin
type: post
date: 2018-12-22T07:34:21+00:00
url: /archives/525
categories:
  - CentOS
  - Linux
  - セキュリティ

---
# {{this.$page.frontmatter.title}}

<CategoriesAndDate/>

{{this.$page.frontmatter.description}}

<!--more-->

## 要件

```bash
$ cat /etc/redhat-release
 CentOS Linux release 7.6.1810 (Core)
$ sudo fail2ban-client --version
 Fail2Ban v0.9.7
$ grep vagrant /etc/passwd
 vagrant:x:1000:1000:vagrant:/home/vagrant:/bin/bash
$ sudo grep PasswordAuth /etc/ssh/sshd_config
 PasswordAuthentication yes
$ sudo grep Port /etc/ssh/sshd_config
 #Port 22
 Port 10022
 ```

vagrantで作ったCentOS7のマシンです。sshdのパスワード認証を有効にしており、ポート番号は変更してあります。

## まずは何もせずブルートフォース攻撃をかけてみる

別マシンのKali Linuxから、hydraというツールを使ってsshにブルートフォースをかけてみます。vagrantユーザとして、3557行のパスワードが記載された辞書ファイルから総当たりでログイン試行を行います。辞書ファイルはネットに転がっているものを適当に拾ってきて、末尾にvagrantのパスワードを追記してあります。パスワードリストのサイズに合わせて、-tオプション(1ホストに対する同時実行数)は要調整です。

```bash
# wc password -l
 3557 password
# hydra -l vagrant -P ./password ssh://192.168.100.121:10022 -t 16
Hydra v8.6 (c) 2017 by van Hauser/THC - Please do not use in military or secret service organizations, or for illegal purposes.
 Hydra (http://www.thc.org/thc-hydra) starting at 2018-12-22 13:05:33
 [WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
(~snip~)
[10022][ssh] host: 192.168.100.121   login: vagrant   password: vagrant
 [STATUS] attack finished for 192.168.100.121 (waiting for children to complete tests)
 1 of 1 target successfully completed, 1 valid password found
(~snip~)  
 Hydra (http://www.thc.org/thc-hydra) finished at 2018-12-22 13:20:40
```

3000回超のログイン試行がものの15分で完了し、パスワードを特定できました。まぁ当然/var/log/secureは大変なことになっているので、ハードニングやってる現場ならログみてfirewall-cmdでドロップさせればいいですが、ログとにらめっこしIP一つ一つ手作業でドロップさせる時間は、できれば他のセキュア化の時間に回したい。

## fail2banとは

fail2banとは、システムの各ログを監視し、不正アクセスだと疑わしいアクセスをしてきたIPアドレスをバンするiptablesやfirewalldのポリシーを自動的に追加するプログラムです。sshdはもちろん、httpdやvsftpd、PostfixなどいろいろなMWのログからファイアウォールポリシーを生成できます。ログ監視方式(フィルターと言います)と、どうバンするか(アクションと言います)は自前で定義せねばなりませんが、有名なMWのフィルター、アクションはデフォルトで定義されています。httpdやnginxはBASIC認証のログイン監視もデフォルトでできるっぽいのでやってみたいです。

## fail2banのインストール

epelから。

```bash
sudo yum install epel-release
sudo yum install fail2ban
```

## fail2banの設定ファイル類

fail2banの設定ファイルはたくさんあります。原則、設定ファイルはそのまま編集せず、.confを.localにリネームしてコピーしたファイルを編集します。update時に上書きされちゃうので。

```bash
$ ls /etc/fail2ban/
 action.d       filter.d   paths-fedora.conf  paths-osx.conf
 fail2ban.conf  jail.conf  paths-common.conf  paths-freebsd.conf
 fail2ban.d     jail.d     paths-debian.conf  paths-opensuse.conf
```

fail2ban.conf、fail2ban.d/* は、fail2ban自体のログの設定やpidファイルの場所、バックエンドで使用するdbのパスなど、fail2ban全体の設定が記載されています。原則変更する必要はありません。

`paths-*.conf`は、ディストリごとに異なる各ログのパスが定義してあります。例えば同じメールログでも、ディストリごとにログファイル名は異なるため、定義しておかねばなりません。読み込みの流れは複雑です。まずjail.confにて、どのディストリの`paths-*.conf` ファイルを読むか定義しておきます。すると、その`paths-*.conf`の[INCLUDES]セクション にて、paths-common.confを先に読んでから自分自身を読んでね、そのあとに paths-overrides.localというファイルを読んでねと記載されているため、この流れで`paths-*.conf`ファイル達が読み込まれます。複雑。結局自分自身でログパスを修正したい場合、paths-overrides.localという名前で設定ファイルを作成すればいいようです。

jail.conf、fail.d/*は、どのフィルターを有効化するか、どのログをフィルターするか、フィルターに引っかかったときどうアクションするかを定義するファイルです。普通に利用する分には、主にこのファイルを編集することになります。編集はjail.localにリネームコピーして行います。詳しくは別章にて。

filter.dの中には、どうログ監査を行うのかの設定(フィルター)が記載されたファイルがたくさんあります。例えばsshd関連だと以下の3種類がデフォルトでありました。自分で作るのは難しそう……

```bash
$ ls sshd*
sshd-aggressive.conf  sshd.conf  sshd-ddos.conf
```

action.dの中には、実際にどうバンを行うかの設定(アクション)が記載されたファイルがたくさんあります。例えばfirewalldで行うアクションだと、以下の6種類がデフォルトでありました。これも自分で作るのは難しそう。

```bash
$ ls firewallcmd*
 firewallcmd-allports.conf  firewallcmd-multiport.conf  firewallcmd-rich-logging.conf
 firewallcmd-ipset.conf     firewallcmd-new.conf        firewallcmd-rich-rules.conf
```

## jail.localの編集

上記の通り、普通に利用する分には、fail.confのみを編集することになります。編集する際はjail.localにリネームコピーしてから行います。

```bash
$ ls -R jail*
 jail.conf  jail.local
 jail.d:
 00-firewalld.conf
```

jail.localの中身を見ていきます。

### [INCLUDES]セクション

ここでどのログパスを読むかを指定します。今回はCentOSなのでfedoraです。デフォルトでfedoraに設定してありました。

```bash
before = paths-fedora.conf
```

### [DEFAULT]セクション

ここでfail2banの基本動作を定義します。ここで定義した動作は、後述のMWごとのセクションでオーバーライド可能です。基本的な部分のみ書いておきます。

#### ignoreip

fail2banが無視するホストを定義します。信頼できるホストをここで定義します。IPアドレス、CIDRでのマスク、DNSホスト名いずれも定義に使えます。複数ホストを列挙する場合はスペース区切りで。

```bash
ignoreip = 127.0.0.1/8
```

#### bantime

バンする期間を定義します。デフォルトだと600秒。

```bash
bantime  = 600
```

#### findtimeとmaxretry

findtimeの期間中に、maxretryの回数ログイン試行が失敗した場合にバンします。デフォルトだと600秒中に5回。

```bash
findtime  = 600
maxretry = 5
```

#### backend

ログを監視するバックエンドモジュールの指定。pythonモジュールpyinotifyを利用したりsystemdのjounalctlを利用したりいろいろあります。デフォルトはauto。きっと性能を求めるならこれは変更しないといけない。

```bash
backend = auto
```

#### usedns

各ログにホストネームにてアクセスログが記載されていた場合に、自前でIPアドレスを逆引きするかどうかを指定します。firewalldやそのバックのiptablesは、ホスト名でアクセス制御を行うことができないため、IPアドレスの情報は必須です。なので、ログにホストネームしか記載がなかった場合、それをIPアドレスに解決しないといけません。しかし、ホストネームはいくらでも変更できるため信用できませんし、大量のアクセスを食らった際にいちいち名前解決を行うとそれだけでDoSです。

usednsは、yesだと黙って逆引きをする、warnだと逆引きはするけど警告をログに残す、noだと逆引きを行わずバンも行わず、情報をログに残す、の3択です。rawはホスト名が関係ない(例えばユーザ名のみを見る、など)フィルタ/アクションの際に指定します。noが一番性能いいですが、ホストネームでアクセスしてきた場合にまったくバンができません。一番いいのは、fail2banを使うサービスのログにはホスト名を記載しない設定にし、usednsをnoにすること。

```bash
usedns = warn
```

#### enabled

fail2banを有効にするかどうか。DEFAULTセクションでは無効にしておいて、有効化するサービスのセクションで有効に上書きするのがいいと思います。

```bash
enabled = false
```

#### banactionとbanaction_allports

バンを行うときのアクションの基本を定義します。実際は、アクション定義ファイルにてメール通報を行ってログに書いてバンする、と細かく書いてありますが、この実際のバンをどうやるか指定するのがここです。

デフォルトでは、下記のようにiptablesがバンを実施する設定になっています(このiptables-*というファイルはactions.d/内にあります)。

```bash
banaction = iptables-multiport
banaction_allports = iptables-allports
```

しかし、CentOS7はiptablesをfirewalldがラッピングしており、iptablesは起動していないので、firewalldがバンを行うよう設定せなばなりません。その設定は、jail.localではなく、jail.d/00-firewalld.confに記載があります。ここでfirewalldに上書きされています(このfirewallcmd-*というファイルもactions.d/内にあります) 。

```bash
$ cat jail.d/00-firewalld.conf
This file is part of the fail2ban-firewalld package to configure the use of
the firewalld actions as the default actions.  You can remove this package
(along with the empty fail2ban meta-package) if you do not use firewalld
[DEFAULT]
banaction = firewallcmd-ipset
```

なぜかデフォルトではbanaction_allportsのみfirewalldで定義されていなかったため、別ファイルで追記しておきました。

```bash
$ sudo vim 01-myfirewalld.comf
[DEFAULT]
banaction_allports = firewallcmd-allports
```

### [sshd]セクション

ここから各MWごとの設定になります。

#### port

バンを行うポート番号です。デフォルトでsshという定義(22)がされています。カンマ区切りで列挙、コロンで連番を指定できます。ちなみにudpを指定したい場合は、portではなくprotocolというディレクティブで別に定義します。

```bash
port    = ssh,10022
#port    = 0:65535 #全ポート遮断したい場合
```

#### logpath

監視を行うsshdのログのパス。この変数はpaths-common.confで定義されていました。

```bash
logpath = %(sshd_log)s```

#### backend

sshdのログを監視するバックエンドモジュール。[DEFAULT]セクションではautoに設定されていましたが、paths-fedora.confでsystemdへオーバーライドされていました。

```bash
backend = %(sshd_backend)
```

#### enabled

有効化するのでenabledに。

```bash
enabled = true
```

#### filter

基本的に、セクション名(今回はsshd)と同名のフィルタが、filter.d/に存在していれば、それが使用されます。それ以外にフィルタを追加したい場合はこのディレクティブを使います。なんかより積極的な検知ができるフィルタがあるとのことなので、追加で有効化しておきます。

```bash
filter = sshd-aggressive
```

## fail2ban起動、自動起動設定

```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## 動作確認

fail2banの動作確認は以下のfail2ban-clientコマンドでできます。引数なしのstatusだと、なんのサービスを監視しているかがわかり、そのサービス名を引数に取ると、バンの状況が見れます。

```bash
$ sudo fail2ban-client status
 Status
 |- Number of jail:      1
 `- Jail list:   sshd
$ sudo fail2ban-client status sshd
 Status for the jail: sshd
 |- Filter
 |  |- Currently failed: 0
 |  |- Total failed:     0
 |  <code>- Journal matches:  _SYSTEMD_UNIT=sshd.service + _COMM=sshd </code>- Actions
    |- Currently banned: 0
    |- Total banned:     0
    `- Banned IP list:
```

Kali Linuxからhydraをかけてみます。

```bash
# hydra -l vagrant -P ./password ssh://192.168.100.121:10022 -t 16 -v
(~snip~)
[ERROR] could not connect to target port 10022: Connection refused
(~snip~)
```

このように、Connection refusedが大量に表示されていつまでたっても完了しませんでした。fail2ban側から見ても、きちんとバンできています。

```bash
$ sudo fail2ban-client status sshd
 Status for the jail: sshd
 |- Filter
 |  |- Currently failed: 0
 |  |- Total failed:     32
 |  `- Journal matches:  _SYSTEMD_UNIT=sshd.service + _COMM=sshd
  `- Actions
    |- Currently banned: 1
    |- Total banned:     1
    `- Banned IP list:   192.168.100.201
```

これでなんとなくハードニングでも使えることがわかりました。BASIC認証にも使えるらしいので、早めに試してみたいです。

## おまけ。REJECTとDROP

デフォルトだと、バンされたホストはREJECTされるようです。これをDROPに変えて、何も通知を出さないようにするには、アクション設定ファイルのblocktypeを変更すればいいようです。actions.d/でgrepかけてみます。

```bash
$ grep "blocktype =" *
firewallcmd-rich-logging.conf:blocktype = reject type='icmp-port-unreachable'
firewallcmd-rich-rules.conf:blocktype = reject type='icmp-port-unreachable'
iptables-common.conf:blocktype = REJECT --reject-with icmp-port-unreachable
 nftables-common.conf:blocktype = reject
route.conf:blocktype = unreachable
symbiosis-blacklist-allports.conf:blocktype = DROP
```

出てきた`firewalldcmd-rich-*`の2つはもちろん、iptables-commonも下記のように`firewallcmd-*`から読み込まれているので、修正します。

```bash
$ grep iptables-common firewall*
 firewallcmd-allports.conf:before = iptables-common.conf
 firewallcmd-ipset.conf:before = iptables-common.conf
 firewallcmd-multiport.conf:before = iptables-common.conf
 firewallcmd-new.conf:before = iptables-common.conf
```

つまるところ、以下のファイルのblocktypeをdropに変更すればいいものと思います。また試してみます。

  1. firewallcmd-rich-logging.conf
  2. firewallcmd-rich-rules.conf
  3. iptables-common.conf

おわり。
