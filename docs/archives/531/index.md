---
title: Linuxで稼働しているuPnPデバイス(ReadyMedia)が他のデバイスから検索できなくなった件とその対処法
description: "LAN内に建てているミュージックストリーミングサーバ(ReadyMedia)が、なんかいつの間にかデバイスとして探索できなくなっていて困っていました。IPアドレス/ポート番号を直打ちすればReadyMediaのコンテンツへアクセスはできるのですが、どうもuPnPによるデバイスの探索のみがうまくいっていないようでした。やっと原因がわかったのでメモしておきます。"
author: seroto_nin
type: post
date: 2019-01-11T17:50:28+00:00
url: /archives/531
categories:
  - CentOS
  - Linux
  - ReadyMedia(MiniDLNA)
  - ネットワーク

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## ブリッジデバイスとIGMP Snooping

このReadyMediaサーバにはKVMも立てており、NICは仮想マシン用にブリッジデバイスとして動作させていました。このブリッジデバイスにてIGMP Snoopingが有効になっており、uPnPのデバイス探索用のマルチキャストパケットが届かなくなっていたことが原因でした。

IGMPはマルチキャストを管理するL3のプロトコルです。マルチキャストを送受信するホストは、マルチキャストグループに参加する必要があります。そのグループに参加するよってことを近くのルータに伝えるのがIGMPです。IGMPによって特定のホストがグループに所属していることがわかったルータは、そのグループのマルチキャストアドレス宛に届いたパケットを、そのホストがいるセグメントへ向かってルーティングします。こうすることでセグメントをまたいだマルチキャストが可能となっているようです。

んで、マルチキャストはブロードキャストドメイン全体に配送されます。つまり同じVLANやL2スイッチにぶら下がっているホストのうち、1ホストでもマルチキャストグループに所属しているホストがいたら、そのVLANやL2スイッチ 配下の全ホストがマルチキャストパケットを受信するそうです。

これでは帯域を食ってしまうということで、`ホスト<-->ルータ間`がやりとりするIGMPパケットを(ルータではなく)L2スイッチが 監視し、それを学習しておくことで、そのL2スイッチ配下全てのホストでなく、特定のホスト(正確にはL2スイッチの特定のポート)のみにマルチキャストパケットを配信する仕組みが、IGMP Snoopingだそうです。ここまでよくわかってない。

要約すると、ReadyMediaサーバ のNICがブリッジとして稼働しており、そこでIGMP Snoopingが有効化されていたため、ReadyMediaサーバ側からルータへ送ったIGMPによるグループ参加通知をブリッジのNICが監視できていない(あるいは監視してからしばらくたったため忘れてしまった)場合、ブリッジのNICがReadyMediaサーバはマルチキャストグループに参加していないと認識しており、 他のデバイスからのuPnPデバイス探索用のマルチキャストパケットをドロップしてしまっていたというのが原因だと思います。

## 対策

カーネルパラメータでIGMP Snoopingを無効化します。一時的な設定は/sys以下に直書き。br0はそのLinux機のブリッジデバイス名に読み替えてください。

```bash
$ echo 0 | sudo tee /sys/devices/virtual/net/br0/bridge/multicast_snooping
```

永続的な設定を行う場合、/etc/sysctl.d以下に設定ファイルを作成して再読み込み。sysctlの-pオプションは/etc/sysctl.confのみしか再読み込みされないため、/etc/sysctl.dに作った設定ファイルは--systemで再読み込みします。

```bash
$ echo "net.br0.bridge.multicast_snooping=0" | sudo tee /etc/sysctl.d/35-minidlna_no_snoop.conf
$ sudo sysctl --system
$ cat /sys/devices/virtual/net/br0/bridge/multicast_snooping
0
```

ちなみに、uPnPデバイスとそのクライアントの間にネットワーク機器(L2スイッチ、ルータのLAN側ハブ等)がある場合、そちらでもIGMP Snoopingは無効化する必要があります。

以上。IGMPについて全然よくわかってなかったので何となく勉強になりました。

## 参考

[Internet Group Management Protocol -- Wikipedia][1]

[ヤマハネットワーク周辺機器 技術情報ページ IPマルチキャスト機能][2]

[ReadyMedia -- ArchWiki][3]

 [1]: https://ja.m.wikipedia.org/wiki/Internet_Group_Management_Protocol
 [2]: http://www.rtpro.yamaha.co.jp/SW/docs/swx2300/Rev_2_00_10/IP_mcast/IGMP.html?rev=2.00.10&category=ipmcast
 [3]: https://wiki.archlinux.jp/index.php/ReadyMedia
