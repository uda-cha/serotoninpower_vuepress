---
title: Linux機の既存データ領域の冗長化(LVM RAID logical volume)
description: "自宅のファイルサーバのHDDを(一部)冗長化しました。感情がなさすぎて前置きがこれ以上書けない。"
author: seroto_nin
type: post
date: 2017-10-28T17:34:36+00:00
url: /archives/272
categories:
  - CentOS
  - Linux
  - ストレージ

---
# {{this.$page.frontmatter.title}}

{{this.$page.frontmatter.description}}
  
<!--more-->

## LVMとは

LVMはディスク運用の柔軟性を高める技術です。例えば、通常ディスク容量がいっぱいになって別ディスクを追加した場合、これを別パーティションとして作成しなければなりません。LVMは複数の物理的なパーティション(Physical Volume)をひとかたまりの仮想物理ディスク(Volume Group)として扱い、そこから仮想論理ディスク(Logical Volume)を切り出すという手順を踏むことで、追加した別ディスクを既存のLVにがっちゃんこし、元々のパーティションを単純に増量することができます。

## LVM RAID logical volumeとは

LVMはLVを書き込むPVを指定することができます。これを応用して、複数のPVに同時に同じ内容を書き込むように指定し、RAID1相当のミラーリングを行うことができます。

## 現在の構成

前提として、MBRではなくGPTであり、BIOSではなくUEFIのマシンであり、ブートローダにgrub2を利用していることとします。以下の3つのコマンドで情報収集します。

```bash
[udacha@srtppc02 ~]$ sudo gdisk -l /dev/sda
[udacha@srtppc02 ~]$ sudo df -T
[udacha@srtppc02 ~]$ sudo lvdisplay
```

以上より、/dev/sdaはこんな構成だとわかりました。コードはフォーマットの仕方のコードネームです。

|開始ｾｸﾀ |終了ｾｸﾀ |ﾊﾟｰﾃｨｼｮﾝ名 |容量 |ﾏｳﾝﾄ先 |ｺｰﾄﾞ |
|---|---|---|---|---|---|
|1 |2047|(GPTﾃｰﾌﾞﾙ)|–|–|–|
|2048|411647|sda1|200MB|/boot/efi|EF00|
|411648|2508799|sda2|1024MB|/boot|0700|
|2508800|1953523711|sda3|930.3GB|–|8E00|

んでsda3のLVMの中身はこんな感じ。ちなみにVG名はclでした。

|LV名|容量|マウント先|
|---|---|---|
|root|50GB|/|
|home|876.68GB|/home|
|swap|3.62GB|-|

## 方針

以上を受けて、こんな方針で行くことにしました。

* /bootと/boot/efiは冗長化しない。GPT & UEFI& grub2なシステムを後からRAID1化するドキュメントが少なさすぎる(どうやらRedHatのサブスクリプションがあれば完全なドキュメントを閲覧できるようですが)
* LVMのsd3はLVM RAID logical volumeで。同量のパーティションをPVにしてVGを分け、同量のLVを切る

うんまぁデータだけ助かればいいよね……。後で/bootと/boot/efiの冗長化方法が分かった時のため、新しいHDDにその領域だけは確保しておきます。

## 新しいHDDのパーティションを切る

まずは新しいHDDをPCにつないで起動。/dev/sdbが存在していれば認識されています。ここからパーティションを切っていきます。gdisk /dev/sdbをたたき、まずはoでgptテーブルを作成。続いて/dev/sdaとまったく同じ構成になるよう(開始/終了セクタやコードも)に切ります。終わったらwで書き込み。ただしこの1番目と2番目のパーティションは使いません。今後/bootと/boot/efiをRAID1化できる目途が立ったときのためにスペースだけ残しておきます。

```bash
[udacha@srtppc02 ~]$ sudo gdisk /dev/sdb
GPT fdisk (gdisk) version 0.8.6

Partition table scan:
  MBR: protective
  BSD: not present
  APM: not present
  GPT: present
Found valid GPT with protective MBR; using GPT.

Command (? for help): o
This option deletes all partitions and creates a new protective MBR.
Proceed? (Y/N): y

Command (? for help): n
Partition number (1-128, default 1): 1
First sector (34-1953525134, default = 2048) or {+-}size{KMGTP}:
Last sector (2048-1953525134, default = 1953525134) or {+-}size{KMGTP}: 411647
Current type is 'Linux filesystem'
Hex code or GUID (L to show codes, Enter = 8300): EF00
Changed type of partition to 'EFI System'

Command (? for help): n
Partition number (2-128, default 2): 2
First sector (34-1953525134, default = 411648) or {+-}size{KMGTP}:
Last sector (411648-1953525134, default = 1953525134) or {+-}size{KMGTP}: 2508799
Current type is 'Linux filesystem'
Hex code or GUID (L to show codes, Enter = 8300): 0700
Changed type of partition to 'Microsoft basic data'

Command (? for help): n
Partition number (3-128, default 3): 3
First sector (34-1953525134, default = 2508800) or {+-}size{KMGTP}:
Last sector (2508800-1953525134, default = 1953525134) or {+-}size{KMGTP}: 1953523711
Current type is 'Linux filesystem'
Hex code or GUID (L to show codes, Enter = 8300): 8E00
Changed type of partition to 'Linux LVM'

Command (? for help): w
Final checks complete. About to write GPT data. THIS WILL OVERWRITE EXISTINGPARTITIONS!!
Do you want to proceed? (Y/N): Y
OK; writing new GUID partition table (GPT) to /dev/sdb.
Warning: The kernel is still using the old partition table.
The new table will be used at the next reboot.
The operation has completed successfully.
```

## LVM周りの冗長化

* /dev/sdb3をPVとして作成
* 上記のPV単体からなる仮のVGを作成
* 仮のVGを既存のVGにマージ
* 既存のLVをミラーリング(PVを指定しなくても勝手に別PVにミラーリングしてくれる)

```bash
[udacha@srtppc02 boot]$ sudo pvcreate /dev/sdb3
[udacha@srtppc02 boot]$ sudo vgcreate vgtemp /dev/sdb3
[udacha@srtppc02 boot]$ sudo vgmerge -v cl vgtemp
[udacha@srtppc02 boot]$ sudo lvconvert -v --type mirror -m 1 cl/home
[udacha@srtppc02 boot]$ sudo lvconvert -v --type mirror -m 1 cl/root
```

typeについて。raid1とmirrorというtypeがほぼ同じtypeとして存在しますが、raid1は新しいモードです。これを利用するとミラーリング元のLV(sdaのcl/home、cl/root)にLVMのログを残すスペースが必要になります。sdaはめいっぱい使っているため空きはもうありません。sdaのswap分を減らしてcl/homeとcl/rootを拡張する手もありましたが、めんどいので結局ログ分のスペースを新規ディスク(sdb)に別に作成してくれる旧版のmirrorで作りました。

ミラーリングには時間かかります。特に900GBくらいあるcl/homeは4時間くらいかかるため、寝る前に叩いて起きてから確認するほうがよいです。

既存のLVの中でもswapはミラーリングの必要がないためしていないです。でもPVの容量余らせておくのもなんなので、以下のコマンドで第二のswap領域を作成します。

```bash
[udacha@srtppc02 etc]$ sudo lvcreate -n /dev/cl/swap2 -l 100%FREE cl
[udacha@srtppc02 etc]$ sudo dd if=/dev/zero of=/dev/mapper/cl-swap2 bs=1M count=50
[udacha@srtppc02 etc]$ sudo mkswap /dev/mapper/cl-swap2
[udacha@srtppc02 etc]$ sudo swapon /dev/mapper/cl-swap2
[udacha@srtppc02 etc]$ sudo vim /etc/fstab
+/dev/mapper/cl-swap2 swap swap defaults 0 0
```

これで二つ目のswap領域ができました。そんで最終的にLVM周りはこうなりました。一応データ領域の冗長化だけ完了しました。

```bash
[udacha@srtppc02 etc]$ sudo lvs -a -o vg_name,name,copy_percent,devices,size
 VG LV Cpy%Sync Devices LSize
 cl home 100.00 home_mimage_0(0),home_mimage_1(0) 876.68g
 cl [home_mimage_0] /dev/sda3(12800) 876.68g
 cl [home_mimage_1] /dev/sdb3(0) 876.68g
 cl [home_mlog] /dev/sda3(238159) 4.00m
 cl root 100.00 root_mimage_0(0),root_mimage_1(0) 50.00g
 cl [root_mimage_0] /dev/sda3(0) 50.00g
 cl [root_mimage_1] /dev/sdb3(224431) 50.00g
 cl [root_mlog] /dev/sdb3(237231) 4.00m
 cl swap /dev/sda3(237231) 3.62g
 cl swap2 /dev/sdb3(237232) 3.62g
 ```

## 所感

boot周りが何とか冗長化できないか、かなり調べて試行錯誤したけどどうにもうまくいかんくて悔しい。古い記事なら結構見つかるんだけど、GPT & UEFI& grub2の組み合わせが全然なくてその断片を読み漁ってつなげてもだめでした。今回やったLVMの冗長化を打ち棄てて、最悪OSの再インストールも視野に入れます。ディスク冗長化方式はOSのインストール時に決めておこうね。
