---
title: インドからのsshdへの不正アクセスについて
author: seroto_nin
type: post
date: 2017-05-03T05:36:51+00:00
url: /archives/94
categories:
  - CentOS
  - Linux

---
# {{this.$page.frontmatter.title}}

ぼーっとjournalctlでログを眺めていたらこんなことになっていた。

<!--more-->

```bash
[root@serotoninpower log]# journalctl -u sshd -r | grep Invalid
May 03 13:31:52 serotoninpower sshd[25545]: Invalid user oper from 49.248.112.46
May 03 12:58:06 serotoninpower sshd[25454]: Invalid user usuario from 49.248.112.46
May 03 12:24:29 serotoninpower sshd[25385]: Invalid user usuario from 49.248.112.46
May 03 11:50:48 serotoninpower sshd[25290]: Invalid user usuario from 49.248.112.46
May 03 11:17:27 serotoninpower sshd[25152]: Invalid user usuario from 49.248.112.46
May 03 10:44:16 serotoninpower sshd[24814]: Invalid user usuario from 49.248.112.46
May 03 00:10:15 serotoninpower sshd[22295]: Invalid user prueba from 49.248.112.46
May 02 23:39:23 serotoninpower sshd[21827]: Invalid user prueba from 49.248.112.46
May 02 23:08:33 serotoninpower sshd[21667]: Invalid user prueba from 49.248.112.46
May 02 22:37:55 serotoninpower sshd[21407]: Invalid user prueba from 49.248.112.46
May 02 22:07:20 serotoninpower sshd[21301]: Invalid user prueba from 49.248.112.46
May 02 21:36:57 serotoninpower sshd[21190]: Invalid user operador from 49.248.112.46
May 02 21:06:41 serotoninpower sshd[21026]: Invalid user operador from 49.248.112.46
May 02 20:36:29 serotoninpower sshd[20936]: Invalid user operador from 49.248.112.46
May 02 20:06:25 serotoninpower sshd[20870]: Invalid user operador from 49.248.112.46
May 02 19:36:28 serotoninpower sshd[20720]: Invalid user operador from 49.248.112.46
May 02 19:06:38 serotoninpower sshd[20405]: Invalid user operador from 49.248.112.46
May 02 18:36:54 serotoninpower sshd[20309]: Invalid user operador from 49.248.112.46
May 02 18:07:15 serotoninpower sshd[20139]: Invalid user operador from 49.248.112.46
May 02 17:37:47 serotoninpower sshd[19954]: Invalid user operador from 49.248.112.46
May 02 11:50:57 serotoninpower sshd[18088]: Invalid user administrador from 49.248.112.46
May 02 11:22:56 serotoninpower sshd[18002]: Invalid user administrador from 49.248.112.46
May 02 10:55:00 serotoninpower sshd[17859]: Invalid user administrador from 49.248.112.46
May 02 10:27:13 serotoninpower sshd[17746]: Invalid user administrador from 49.248.112.46
May 02 09:59:32 serotoninpower sshd[6364]: Invalid user administrador from 49.248.112.46
May 02 09:31:57 serotoninpower sshd[3318]: Invalid user administrador from 49.248.112.46
May 02 09:04:31 serotoninpower sshd[2924]: Invalid user administrador from 49.248.112.46
```

49.248.112.46から一時間に一回か二回ほどsshdに不正アクセスをくらっていた。しかもずーっと。はじめてだとびびる。様々なユーザ名で手あたり次第にログインを試行していました。

IPアドレスでぐぐってみるとどうやらインドのサーバのよう。元がメールサーバなので乗っ取られて攻撃に加担させられている？　それともメールサーバに偽装しているだけ？

このサーバへのsshログインは公開鍵認証を強制しているので、この鍵が私のPCから漏れない限りまぁ突破されることはないけど気持ち悪い。

対策はいろいろ考えたけど、私のPCやルータは固定IPを払い出してもらってないのでホワイトリスト方式は使えないし、ブラックリスト方式でREJECTしてもきりがないし、国外サーバからのアクセスをすべてREJECTすると将来AWSとか使おうと思ったらめんどくさいし、sshguardとかで試行回数制限しようと思ってもリソース食うしうーんといった感じ。

とりあえずsshdのポート番号を再度変更していったん様子を見ることにしました。22番ポートから変更してはいたけど、よくある変更の仕方だったのでより複雑に。どうせbotの攻撃だからこれであきらめてくれるといいけど。
