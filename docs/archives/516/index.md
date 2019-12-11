---
title: CetnOS7でiSCSIターゲットを構築
author: seroto_nin
type: post
date: 2018-11-17T05:24:58+00:00
url: /archives/516
categories:
  - CentOS
  - ストレージ

---
以前、自宅にESXiを構築しました。ESXi上の仮想マシンのディスクイメージは、業務ではESXiローカルに配置することはほぼなく、別ホストのSANストレージ上に配置することがほとんどです。ESXiのストレージ接続の勉強のために、自宅CentOS機でiSCSIターゲットを構築したため、その手順をメモっておきます。勉強のための勉強です。長くなったのでESXiからのマウントは別記事で。

<!--more-->

## 要件

```bash
$ cat /etc/redhat-release
CentOS Linux release 7.5.1804 (Core)
```

## targetcliのインストール&target起動

これがCentOS7においてiSCSIターゲットを構築・管理するツールです。私のCentOS機ではデフォルトで入っていました。

```bash
$ rpm -qa | grep targetcli
targetcli-2.1.fb46-6.el7_5.noarch
```

自動起動を有効にし、サービスを開始します。

```bash
sudo systemctl enable target
sudo systemctl start target
```

## LVMでiSCSI用ブロックデバイスの作成

targetは様々な形式でSANを提供できるようです。ファイルシステム上に作成したファイルをSANディスクとして提供したり、ブロックデバイスをそのままSANディスクとして提供したり、SCSIコマンドをパススルーしてSCSIデバイスを直接提供したり、RAMディスクを提供したり。このSANの提供方式、すなわちデータを格納している実体のことをバックストアと呼ぶそうです。

参考：<https://access.redhat.com/documentation/ja-jp/red_hat_enterprise_linux/7/html/storage_administration_guide/ch24>

今回は一番オーソドックスなブロックデバイス形式を採用します。/dev/sdaなどと言った生のディスクをそのままブロックデバイスとして提供できるのですが、後からの容量の追加・変更がめんどくさいので、生のディスク上にパーティションを切り、LVMを乗せ、論理ボリュームを提供することとします。

今回は新しくSSDを買いました。500ギガバイト。CentOS機にSATAケーブルで接続し、それが/dev/sdcとして認識されたところから始めます。ちなみにlsblkコマンドのiオプションはASCII形式で出力するオプション。Teratermとかからコピぺする際に文字化けを防ぐのに便利です(ブログ書くためにググって知った)。

```bash
$ lsblk -i /dev/sdc
NAME MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sdc     8:32  0 465.8G  0 disk
```

### パーティション作成

割愛。gdiskコマンドでパーティションを切ります。ディスク容量100%で1パーティションを切り、パーティションの種類はLinux LVM(8e00)とします。

```bash
$ lsblk -i /dev/sdc
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sdc       8:32  0 465.8G  0 disk
`-sdc1    8:33  0 465.8G  0 part
```

### LVM作成

現状こうなっていました。

```bash
$ sudo pvscan
  PV /dev/sdd1 VG VgKVM lvm2 [<223.57 GiB / 0 free]
  PV /dev/sda3 VG cl lvm2 [930.31 GiB / 0 free]
  PV /dev/sdb3 VG cl lvm2 [930.31 GiB / 0 free]
  Total: 3 [<2.04 TiB] / in use: 3 [<2.04 TiB] / in no VG: 0 [0 ]
$ sudo vgscan
  Reading volume groups from cache.
  Found volume group "VgKVM" using metadata type lvm2
  Found volume group "cl" using metadata type lvm2
$ sudo lvscan
  ACTIVE '/dev/VgKVM/LvKVM' [<223.57 GiB] inherit
  ACTIVE '/dev/cl/root' [50.00 GiB] inherit
  ACTIVE '/dev/cl/home' [876.68 GiB] inherit
  ACTIVE '/dev/cl/swap' [3.62 GiB] inherit
  ACTIVE '/dev/cl/swap2' [3.62 GiB] inherit
```

新規ボリュームグループを作成し、そこにさっき作成したパーティションを参加させ、ボリュームグループの容量100%で論理ボリュームを切ります。

```bash
$ sudo pvcreate /dev/sdc1
  Physical volume "/dev/sdc1" successfully created.
$ sudo vgcreate VgISCSI /dev/sdc1
  Volume group "VgISCSI" successfully created
$ sudo lvcreate -n /dev/VgISCSI/LvISCSI -l 100%FREE VgISCSI
  Logical volume "LvISCSI" created.
```

こうなりました。

```bash
$ lsblk -i /dev/sdc
NAME                MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sdc                   8:32   0 465.8G  0 disk
`-sdc1                8:33   0 465.8G  0 part
  `-VgISCSI-LvISCSI 253:11   0 465.8G  0 lvm  
$ sudo pvscan
  PV /dev/sdd1   VG VgKVM           lvm2 [<223.57 GiB / 0    free]
  PV /dev/sdc1   VG VgISCSI         lvm2 [<465.76 GiB / 0    free]
  PV /dev/sda3   VG cl              lvm2 [930.31 GiB / 0    free]
  PV /dev/sdb3   VG cl              lvm2 [930.31 GiB / 0    free]
  Total: 4 [2.49 TiB] / in use: 4 [2.49 TiB] / in no VG: 0 [0   ]
$ sudo vgscan
  Reading volume groups from cache.
  Found volume group "VgKVM" using metadata type lvm2
  Found volume group "VgISCSI" using metadata type lvm2
  Found volume group "cl" using metadata type lvm2
$ sudo lvscan
  ACTIVE            '/dev/VgKVM/LvKVM' [<223.57 GiB] inherit
  ACTIVE            '/dev/VgISCSI/LvISCSI' [<465.76 GiB] inherit
  ACTIVE            '/dev/cl/root' [50.00 GiB] inherit
  ACTIVE            '/dev/cl/home' [876.68 GiB] inherit
  ACTIVE            '/dev/cl/swap' [3.62 GiB] inherit
  ACTIVE            '/dev/cl/swap2' [3.62 GiB] inherit
```

ディスクを追加・変更した際は/etc/fstabを編集するのが通例ですが、今回はブロックデバイスを直接SANディスクとするため不要です。私も｢よく考えたらそうか｣って感じだったのですが、fstabはその名の通りファイルシステムのマウント設定ですので今回は無関係です。CentOSからファイルシステムを作成するわけではないですし、マウントするわけでもありません。

### targetcliでバックストアの作成

targetcliでtargetの設定を変更していきます。今回は対話型でコマンドを打っていきますが、非対話型でやることもできます。targetcliコンソールに入ったら、targetcliのlsサブコマンドをたたき、どんな設定があるか確認します。

```bash
$ sudo targetcli
Warning: Could not load preferences file /root/.targetcli/prefs.bin.
targetcli shell version 2.1.fb46
Copyright 2011-2013 by Datera, Inc and others.
For help on commands, type 'help'.

> ls
o- / .................................................................................. [...]
  o- backstores ....................................................................... [...]
  | o- block ........................................................... [Storage Objects: 0]
  | o- fileio .......................................................... [Storage Objects: 0]
  | o- pscsi ........................................................... [Storage Objects: 0]
  | o- ramdisk ......................................................... [Storage Objects: 0]
  o- iscsi ..................................................................... [Targets: 0]
  o- loopback .................................................................. [Targets: 0]
```

バックストアとは、SANストレージのデータが保存される実体です。先述の通り、4種類のバックストアの形式があります。今回はブロックデバイス形式で。/backstores/block/のツリーに移動し、createサブコマンドでブロックデバイスをバックストアに追加します。

```bash
> cd /backstores/block
/backstores/block> create name=block_backend_LvISCSI dev=/dev/VgISCSI/LvISCSI
Created block storage object block_backend_LvISCSI using /dev/VgISCSI/LvISCSI.
```

一旦targetcliの設定のルートに戻り、lsサブコマンドを叩くとこうなっている。

```bash
/backstores/block> cd ../..
> ls
o- / .................................................................................. [...]
o- backstores ....................................................................... [...]
| o- block ........................................................... [Storage Objects: 1]
| | o- block_backend_LvISCSI ..... [/dev/VgISCSI/LvISCSI (465.8GiB) write-thru deactivated]
| | o- alua ............................................................ [ALUA Groups: 1]
| | o- default_tg_pt_gp ................................ [ALUA state: Active/optimized]
| o- fileio .......................................................... [Storage Objects: 0]
| o- pscsi ........................................................... [Storage Objects: 0]
| o- ramdisk ......................................................... [Storage Objects: 0]
o- iscsi ..................................................................... [Targets: 0]
o- loopback .................................................................. [Targets: 0]
```

### targetcliコマンドでiscsiターゲットの作成

続いて、/iscsiのツリーに移動し、createサブコマンドでiscsiターゲットを作成します。ターゲットにはiqnという一意の名前を付ける必要があります。命名規則はネットに転がってます。例えばここ。<https://docs.vmware.com/jp/VMware-vSphere/6.5/com.vmware.vsphere.storage.doc/GUID-686D92B6-A2B2-4944-8718-F1B74F6A2C53.html>

```bash
> cd iscsi
/iscsi> create iqn.2018-11.local.serotoninwg.iscsi:iscsi-storage1
Created target iqn.2018-11.local.serotoninwg.iscsi:iscsi-storage1.
Created TPG 1.
Global pref auto_add_default_portal=true
Created default portal listening on all IPs (0.0.0.0), port 3260.
```

/iscsiのツリーにこんな設定ができました。

```bash
/iscsi> ls
o- iscsi ....................................................................... [Targets: 1]
o- iqn.2018-11.local.serotoninwg.iscsi:iscsi-storage1 ........................... [TPGs: 1]
o- tpg1 .......................................................... [no-gen-acls, no-auth]
o- acls ..................................................................... [ACLs: 0]
o- luns ..................................................................... [LUNs: 0]
o- portals ............................................................... [Portals: 1]
o- 0.0.0.0:3260 ................................................................ [OK]
```

### targetcliコマンドでiscsiターゲットにLUNの追加

ここで実際にブロックデバイスをiscsiターゲットに紐づけます。さっき作ったiqnのiscsiターゲットのツリー内のtpg1/lunsに移動し、backstores内のブロックデバイスを指定してLUNを作成します。

```bash
/iscsi> cd iqn.2018-11.local.serotoninwg.iscsi:iscsi-storage1/tpg1/luns
/iscsi/iqn.20...ge1/tpg1/luns> create /backstores/block/block_backend_LvISCSI
Created LUN 0.
```

さっき作ったiqnのツリーにこんな設定ができました。

```bash
/iscsi/iqn.20...ge1/tpg1/luns> cd ../..
/iscsi/iqn.20...scsi-storage1> ls
o- iqn.2018-11.local.serotoninwg.iscsi:iscsi-storage1 ............................. [TPGs: 1]
o- tpg1 ............................................................ [no-gen-acls, no-auth]
o- acls ....................................................................... [ACLs: 0]
o- luns ....................................................................... [LUNs: 1]
| o- lun0 ....... [block/block_backend_LvISCSI (/dev/VgISCSI/LvISCSI) (default_tg_pt_gp)]
o- portals ................................................................. [Portals: 1]
o- 0.0.0.0:3260 .................................................................. [OK]
```

### targetcliで待ち受けIPアドレスの設定

iqnのツリー内のtpg1/portals内に、待ち受けIPアドレス、ポート番号の設定が保存されています。デフォルトでは0.0.0.0:3260であり、全てのNICでiSCSIイニシエータを待ち受けるため、特定のNICのIPアドレスに変更します。一旦デフォルトの設定を削除した後に、新規にIPアドレス、ポート番号を変更します。

```bash
/iscsi/iqn.20...scsi-storage1> cd tpg1/portals/
/iscsi/iqn.20.../tpg1/portals> ls
o- portals ..................................................................... [Portals: 1]
o- 0.0.0.0:3260 ...................................................................... [OK]
/iscsi/iqn.20.../tpg1/portals> delete 0.0.0.0 3260
Deleted network portal 0.0.0.0:3260
/iscsi/iqn.20.../tpg1/portals> create 192.168.90.1 ip_port=3260
Using default IP port 3260
Created network portal 192.168.90.1:3260.
```

こうなります。

```bash
/iscsi/iqn.20.../tpg1/portals> ls
o- portals ..................................................................... [Portals: 1]
o- 192.168.90.1:3260 ................................................................. [OK]
```

### targetcliでaclにiscsiイニシエータのiqnを登録

iscsiでは、iscsiイニシエータ側のiqnを事前にターゲット側に登録しておくことでアクセス制御を行います。iqn内のtpg1/aclに移動し、ターゲットにiqnをcreate1サブコマンドで登録しておきます。

```bash
> cd /iscsi/iqn.2018-11.local.serotoninwg.iscsi:iscsi-storage1/tpg1/acls
/iscsi/iqn.20...ge1/tpg1/acls> create iqn.1998-01.com.vmware:srtppc04-7429af57
Created Node ACL for iqn.1998-01.com.vmware:srtppc04-7429af57
Created mapped LUN 0.
```

### targetcliの設定の保存

最終的にこうなりました。

```bash
> ls /
o- / .................................................................................. [...]
o- backstores ....................................................................... [...]
| o- block ........................................................... [Storage Objects: 1]
| | o- block_backend_LvISCSI ....... [/dev/VgISCSI/LvISCSI (465.8GiB) write-thru activated]
| | o- alua ............................................................ [ALUA Groups: 1]
| | o- default_tg_pt_gp ................................ [ALUA state: Active/optimized]
| o- fileio .......................................................... [Storage Objects: 0]
| o- pscsi ........................................................... [Storage Objects: 0]
| o- ramdisk ......................................................... [Storage Objects: 0]
o- iscsi ..................................................................... [Targets: 1]
| o- iqn.2018-11.local.serotoninwg.iscsi:iscsi-storage1 ......................... [TPGs: 1]
| o- tpg1 ........................................................ [no-gen-acls, no-auth]
| o- acls ................................................................... [ACLs: 1]
| | o- iqn.1998-01.com.vmware:srtppc04-7429af57 ...................... [Mapped LUNs: 1]
| | o- mapped_lun0 .......................... [lun0 block/block_backend_LvISCSI (rw)]
| o- luns ................................................................... [LUNs: 1]
| | o- lun0 ... [block/block_backend_LvISCSI (/dev/VgISCSI/LvISCSI) (default_tg_pt_gp)]
| o- portals ............................................................. [Portals: 1]
| o- 192.168.90.1:3260 ......................................................... [OK]
o- loopback .................................................................. [Targets: 0]
```

保存してtargetcliから抜け、targetを再起動することで設定が有効になります。

```bash
> saveconfig
Configuration saved to /etc/target/saveconfig.json
> exit
Global pref auto_save_on_exit=true
Last 10 configs saved in /etc/target/backup/.
Configuration saved to /etc/target/saveconfig.json
$ sudo systemctl restart target
```

## ファイアウォール穴あけ

iSCSIターゲットが待ち受けるポート3260/tcpを開けます。

```bash
$ sudo firewall-cmd --permanent --zone=myfirewall --add-port=3260/tcp
success
$ sudo firewall-cmd --reload
success
```

## ジャンボフレームの有効化

実際に効果があるのかまだ検証できてないですが、iSCSIでブロックデバイスのデータを直接やり取りするなど、巨大なファイルを扱う通信が多い場合、mtu上限値を上げ、ジャンボフレームに対応させることで、パケットの分割・結合の手間が省け、通信性能が上がることが多いそうです。一応やっておきます。

ipコマンドで現在のmtuを確認。デフォルトの1500となっています。

```bash
$ ip a
(snip)
3: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:1b:21:63:85:39 brd ff:ff:ff:ff:ff:ff
    inet 192.168.90.1/24 brd 192.168.90.255 scope global noprefixroute enp1s0
       valid_lft forever preferred_lft forever
    inet6 fe80::21b:21ff:fe63:8539/64 scope link
       valid_lft forever preferred_lft forever
(snip)
```

enp1s0のコネクション名を確認し、そのコネクションのmtu設定を確認します。NetworkManagerなので、mtuがなんていうプロパティで保存されているのかはおそらく個人差あります。

```bash
$ sudo nmcli con show
NAME                    UUID                                  TYPE      DEVICE
bridge-br0              252222c5-698f-4d0e-a254-71a71fe7682a  bridge    br0
bridge-slave-enp0s31f6  d2b1741d-3514-40c9-a106-ef456d0cec93  ethernet  enp0s31f
virbr0                  8bd5d321-d273-4a9a-b6af-bfa247b9dfc1  bridge    virbr0
有線接続 1              5da60b75-410c-3f7c-b323-dd2152e2efc7  ethernet  enp1s0

sudo nmcli con show "有線接続 1" | grep mtu
802-3-ethernet.mtu: 自動
```

私の環境では802-3-ethernet.mtuというプロパティにmtu設定が保存されているようでしたので、それを9000くらいに設定し、NICを再起動して設定をリロードします。

```bash
$ sudo nmcli con mod "有線接続 1" 802-3-ethernet.mtu 9000
sudo nmcli con down "有線接続 1" && sudo nmcli con up "有線接続 1
"```

無事mtu値が9000になっていることを確認します。

```bash
$ ip a
(snip)
3: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9000 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:1b:21:63:85:39 brd ff:ff:ff:ff:ff:ff
    inet 192.168.90.1/24 brd 192.168.90.255 scope global noprefixroute enp1s0
       valid_lft forever preferred_lft forever
    inet6 fe80::21b:21ff:fe63:8539/64 scope link
       valid_lft forever preferred_lft forever
(snip)
```

長かったですが、これでCentOS側(ISCSIターゲット側)の設定は終わり。まぁ実務じゃ使うことない知識ですが、どのストレージ製品も中身はたぶんOSSなので、GUIの設定画面の裏でもこんなことが行われているんじゃなかろうかと思います。ESXiからのマウントはまた別記事で書きます。おわり。
