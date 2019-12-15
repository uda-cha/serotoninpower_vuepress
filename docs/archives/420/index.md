---
title: 'KVMの仮想マシン作成 & インストール自動化(virt-install & Kickstart)'
description: "この前の記事では、KVMの仮想マシンをvirt-managerからGUIで作成し、virt-managerの仮想シリアルコンソールからポチポチインストールしましたが、毎回GUIでこんなことやってられないので自動化しました。"
author: seroto_nin
type: post
date: 2018-05-06T13:17:46+00:00
url: /archives/420
categories:
  - CentOS
  - KVM
  - Linux

---
# {{this.$page.frontmatter.title}}

[この前の記事][1]では、KVMの仮想マシンをvirt-managerからGUIで作成し、virt-managerの仮想シリアルコンソールからポチポチインストールしましたが、毎回GUIでこんなことやってられないので自動化しました。

<!--more-->

## virt-installで仮想マシンの作成

virt-installというCUIで仮想マシンの作成ができるコマンドラインがあります。今回はそれを使います。なお、libvirtプロジェクトなのでKVM以外の仮想化基盤にも対応しています。

### virt-managerとvirt-installの紐付け

virt-installには大量のオプションがあります。まずは前回やったvirt-managerでのGUIインストールと紐づけて見ていきます。

|項目|virt-managerステップ|virt-installオプション|備考|
|---|---|---|---|---|
|仮想化基盤の指定|(仮想マシン作成段階)|`–virt-type`|`$ virsh capabilities`の出力結果のdomain要素のtype属性にてホストマシンにインストールされている仮想化基盤名を確認可能。KVMとQEMU両方表示されているけどKVMでOK|
|インストールメディアの指定(ホストマシンのローカルファイル)|ステップ1,2|`–location`|pxeブートやホストマシンの光学ドライブなんかからインストールする場合は別なオプションあり|
|オペレーティングシステムの種類|ステップ2|`–os-type`|linux, windows, unix, otherのいずれか|
|オペレーティングシステムのバリアント/バージョン|ステップ2|`–os-variant`|`$ osinfo-query os`で指定できる値を確認可能|
|割り当てるRAM量|ステップ3|`–ram`|メガバイト単位|
|割り当てる仮想CPU数|ステップ3|`–vcpus`|ホストマシンのCPUのスレッド数以上は不可|
|割り当てるストレージデバイス|ステップ4|`–disk`|パスを指定。存在しないファイルを指定すると自動で新規作成する。パスの後に｢`,size=NN`｣でギガバイト単位でサイズ指定可能|
|仮想マシン名|ステップ5|`–name`|ホストから見た仮想マシン名|
|ネットワークの選択|ステップ5|`–network`|ホストマシンのブリッジに接続したいときは続けて｢`bridge=<ブリッジ名>`｣。virshで作成した仮想NWに接続したい際は続けて｢`network=<NW名>`｣。|

### そのほかvirt-managerとは明示的に紐付かないけど必要なvirt-installのオプション

上記のほかにもvirt-managerが暗黙的にやっていたことがあり、それもvirt-installのオプションで指定してやる必要があります。また、今回CUIで仮想マシンをインストールする上で必要となる設定も追加していきます。

|項目|virt-installオプション|備考|
|---|---|---|
|仮想化モードの指定(完全仮想化)|`–hvm`|`–paravirt`で準仮想化、`–container`でコンテナ|
|ゲストコンソールに自動的に接続しない|`–noautoconsole`|これをつけないとvirt-installしたプロンプトがvirt-viewer経由でのゲストコンソールになる。そもそもvirt-viewerはインストールすらしていません。|

上記をもとにコマンドを組み立てます。オプションが非常に多いので、バックスラッシュ+改行+インデントで見やすくしてます。

```bash
[udacha@srtppc02 ~]$ sudo virt-install \
  --virt-type kvm \
  --location /var/lib/libvirt/images/CentOS-7-x86_64-DVD-1708.iso \
  --os-type linux \
  --os-variant centos7.0 \
  --ram 1024 \
  --vcpus 1 \
  --disk /var/lib/libvirt/images/testcentos7.0.qcow2,size=15 \
  --name testcentos7.0 \
  --network bridge=br0 \
  --hvm \
  --noautoconsole
  ```

これでvirt-managerのGUIでやっていた仮想マシンの作成はコマンド化できました。

## Kickstartで仮想マシンのインストール自動化

ここまでで、GUIからvirt-managerを開いて仮想マシン一覧を開くと、virt-installコマンドで作成した仮想マシンが稼働中であることがわかります。｢開く｣をクリックすると、仮想シリアルコンソールに接続されてGUIインストールを行うことができますが、ここも省力化したい。

仮想マシンのインストールを自動化する方法として、vagrantとKickstartが思いつきました。vagrantは仮想マシン作成も込みでやってくれますし、virtualboxでずっと使ってきて慣れているのですが、vagrantはKVMネイティブではありません。KVM用のvagrant boxの種類は少ないし、ネイティブでないものを使うと思わぬところではまる(はまってきた)ので、素直にKickstartを使うことにします。

### テンプレ用anaconda-ks.cfgの作成

まずは先ほどのvirt-installで作成した仮想マシンについて、virt-managerの仮想コンソールを通じて、普通に手動インストールします。

インストール後、作成した仮想マシンにログインします。すると以下のディレクトリにこんなファイルができているはず。

```bash
$ sudo cat /root/anaconda-ks.cfg
#version=DEVEL
# System authorization information
auth --enableshadow --passalgo=sha512
# Use CDROM installation media
cdrom
# Use graphical install
graphical
# Run the Setup Agent on first boot
firstboot --enable
ignoredisk --only-use=vda
# Keyboard layouts
keyboard --vckeymap=jp --xlayouts='jp'
# System language
lang ja_JP.UTF-8

# Network information
network --bootproto=static --device=eth0 --gateway=192.168.100.1 --ip=192.168.100.151 --nameserver=192.168.100.1 --netmask=255.255.255.0 --noipv6 --activate
network --hostname=localhost.localdomain

# Root password
rootpw --iscrypted <マスクしました>
# System services
services --enabled="chronyd"
# System timezone
timezone Asia/Tokyo --isUtc
user --groups=wheel --name=udacha --password=<マスクしました> --iscrypted --gecos="udacha"
# System bootloader configuration
bootloader --append=" crashkernel=auto" --location=mbr --boot-drive=vda
autopart --type=lvm
# Partition clearing information
clearpart --none --initlabel

%packages
@^minimal
@core
chrony
kexec-tools

%end

%addon com_redhat_kdump --enable --reserve-mb='auto'

%end

%anaconda
pwpolicy root --minlen=6 --minquality=1 --notstrict --nochanges --notempty
pwpolicy user --minlen=6 --minquality=1 --notstrict --nochanges --emptyok
pwpolicy luks --minlen=6 --minquality=1 --notstrict --nochanges --notempty
%end
```

これは、本マシンのインストール時に手動で実施した設定が、Kickstart形式で書き出されたファイルです。これをテンプレとし、作成したいマシンごとに修正を加え、virt-install時に読み込ませることで、仮想マシンの作成～インストールを自動化することができます。

このファイルは手書きで作成してもいいのですが、仮想環境のように似た構成のマシンを作って壊してできるのであれば、動いているマシンからコピペして持ってきたほうが確実です。ちなみにRHEL6台と7台でだいぶKickstartの構文が変わったりもしているため、やっぱり動いている実機からとってきたほうがいいです。

### anaconda-ks.cfgを修正し、template_ks.cfgを作成

仮想マシンの初期インストールにあたって変数となりうる部分はネットワーク周りでしょう。Kickstartファイルを都度都度変更はしたくないので、ネットワーク周りの設定はコメントアウトし、virt-installコマンドの引数として渡すことにします。

```bash
(前略)
# Network information
#network --bootproto=static --device=eth0 --gateway=192.168.100.1 --ip=192.168.100.151 --nameserver=192.168.100.1 --netmask=255.255.255.0 --noipv6 --activate
#network --hostname=localhost.localdomain

(後略)
```

加えて、インストールが終わったら勝手に再起動するようにしておきます。これを付け加えないと、シリアルコンソールに入っての手動再起動が必要になります。通常のセクション(パッケージセクションに入る前。｢`%packages`｣が記述される前)に｢reboot｣と書きます。

```bash
(前略)

# Partition clearing information
clearpart --none --initlabel

reboot

%packages
@^minimal
@core
chrony
kexec-tools

%end

(後略)
```

そのほかも必要に応じて修正します。構文については[Redhat公式のKickstart構文][2]を参照。私は上記二つだけ修正しました。

できたKickstartファイルをホスト側の適当なディレクトリに配置しておく。そしたら、virt-installコマンドのオプションでそのkickstart側のファイルを指定する。具体的には以下のオプションをvirt-installコマンドに追加します。

```bash
  --initrd-inject /var/lib/libvirt/ks-files/template_ks.cfg
  --extra-args \
    "inst.ks=file:/template_ks.cfg \
    hostname=test2centos7 \
    ksdevice=eth0 \
    onboot=yes \
    bootproto=static \
    ip=192.168.100.152 \
    netmask=255.255.255.0 \
    gateway=192.168.100.1 \
    nameserver=192.168.100.1"
```

一つ目のinitrd-injectはKickstartファイルのホスト側のパスを指定。2つ目のextra-argsはゲスト側のブートオプション。initrd-injectで指定されたKickstartファイルは、ゲストの初期RAMディスクのルートフォルダに配置されるため、extra-argsのinst.ksにてゲスト側から見たKickstartファイルのありかを書いてあげます。あとはだらだらとネットワーク設定をブートオプションの書式にしたがって記述します。めんどくさいな……。ブートオプションの詳細についてはこれまた[Redhat公式を参照][3]。

ということで、結局以下のようなvirt-installコマンドを打てばいいことになります。うーむ、といった感じ。

```bash
sudo virt-install \
  --virt-type kvm \
  --location /var/lib/libvirt/images/CentOS-7-x86_64-DVD-1708.iso \
  --os-type linux \
  --os-variant centos7.0 \
  --ram 1024 \
  --vcpus 1 \
  --disk /var/lib/libvirt/images/test2centos7.qcow2,size=15 \
  --name test2centos7 \
  --network bridge=br0 \
  --hvm \
  --noautoconsole \
  --initrd-inject /var/lib/libvirt/ks-files/template_ks.cfg \
  --extra-args \
    "inst.ks=file:/template_ks.cfg \
    hostname=test2centos7 \
    ksdevice=eth0 \
    onboot=yes \
    bootproto=static \
    ip=192.168.100.152 \
    netmask=255.255.255.0 \
    gateway=192.168.100.1 \
    nameserver=192.168.100.1"
```

これを実行すると、仮想マシンの作成とインストールを同時にやってくれます。10分～20分くらい待つと、外からsshでつなげるようになります。一応自動化できました。

## virt-install & Kickstartのあんまり好きじゃないところ

* virt-installコマンドが長すぎる。これは変数を外出ししたスクリプトを作っておくことで一応解決できなくもない。
* Kickstartの取り回しにくさ。安全を期すなら必ず一度は手動で仮想マシンを構築してanaconda-ks.cfgを取り出さないといけない。
* Kickstartの使い回しにくさ。OSのバージョンが変わると記法も変わる。そしてdebian系ではKickstartは使わないらしい(使えないわけではなさそうだが。未検証)。変わりにPreseedというツールがあるらしいが、両方覚える労力が……。

vagrantって優秀だったんだなぁというおはなし。KVMネイティブではないけどvagrantに乗り換えようかな。

## おまけ。仮想マシンの停止&削除

検証中に100回くらい打ちました。良いゴールデンウィークだった。

```bash
sudo virsh shutdown test2centos7 && \
sudo virsh undefine test2centos7 && \
sudo virsh vol-delete /var/lib/libvirt/images/test2centos7.qcow2
```

おわり。

 [1]: https://www.serotoninpower.club/archives/400
 [2]: https://access.redhat.com/documentation/ja-jp/red_hat_enterprise_linux/7/html/installation_guide/sect-kickstart-syntax
 [3]: https://access.redhat.com/documentation/ja-jp/red_hat_enterprise_linux/7/html/installation_guide/chap-anaconda-boot-options
