---
title: Windows+VirtualBox+Vagrant
description: "最近会社で仮想マシンつくっては壊してつくっては壊してって作業が増えてきて、もう手作業じゃやってられないのでVagrantをためしてみました。作って壊してならDockerがぴったりだしおうちで使ってるから学習コスト低くてええやんって思ったんだけど、会社のPCに入れていい仮想環境はVirtualBoxだけで、直にDockerをいれちゃいけないので仕方なくこうなりました。もうこころがしんどいよ。"
author: seroto_nin
type: post
date: 2017-08-07T15:12:01+00:00
url: /archives/188
categories:
  - Linux
  - vagrant
  - VirtualBox
  - Windows

---
# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}
  
<!--more-->

## Vagrantとは

仮想化基盤への操作を自動化するツール。主な用途は仮想マシンの作成の自動化。対応する仮想化基盤はVirtualBoxやVMwareのPlayerやESXi、Amazon EC2、Hyper-V、Docker、LXCなどなど。

## 要件

- Windows 10 Home 1703
- VirtualBox 5.1.22
- Vagrant 1.9.7

## Vagrantのインストール

VirtualBoxはもうインストールしてあるものとします。Vagrantを以下からインストール。インストール時のコンフィグは特にいじらずそのまま。最後に再起動させられます。

<https://www.vagrantup.com/downloads.html>

## Boxファイルの入手

以下より好きなOSのBoxファイルを検索します。BoxファイルってのはOSイメージが入ったisoファイルみたいな認識でOKです。んでもってVagrant CloudってのはそのBoxを誰でも置いておくことができるとこって認識でOKです。

<https://app.vagrantup.com/boxes/search>

おれはCentOS6.9に用事があったのでCentOSとかで検索しました。CentOS/6が最新版で中身が6.9だとのことなのでこの｢CentOS/6｣というタグをメモっておきます。そんでそのタグを使ってコマンドプロンプトで以下のコマンドを入力。

```powershell
C:\Users\serotonin> vagrant box add CenOS/6
```

ちょっと待つとどの仮想化基盤のBoxイメージを持ってきますかと聞かれます。CentOS/6はHyper-VとLibvirt、Virtualbox、VMware desktopの4種類がありました。3つ目のVirtualBoxを選択するため｢3｣と入力。ダウンロードが走ります。終わったら以下のコマンドでダウンロードできたか確認。

```powershell
C:\Users\serotonin> vagrant box list
```

## Vagrantfileの作成

Box名を指定して、Vagrantfileを以下のコマンドで初期化・作成します。Vagranfileってのは仮想マシン作成時のメモリ割り当て量とか仮想NIC設定とかの仮想マシンインストール設定を記述したファイル。これをもとにVagrantが仮想マシンの作成を自動化してくれます。

```powershell
C:\Users\serotonin> vagrant init CentOS/6
```

## Vagrantfileの編集

コマンドプロンプトの作業ディレクトリにVagrantfileが作成されているはずなので、テキストエディタで編集します。これいろいろいじれそうなのでお盆の宿題にします。とりあえずメモリ割り当て量と、NICまわりだけ設定しておきます。

```ruby
(略)
#下記をアンコメントしブリッジアダプタ作成。
#ipアドレスとサブネット、MACアドレスを追記で指定。
#サブネットとMACアドレスの指定は任意。
#指定しないとサブネットはクラスそのまんまを仮想マシンが割り当て、MACアドレスはVirtualBoxが適当に割り当てる
config.vm.network "public_network",
  ip: "192.168.100.240",
  netmask: "255.255.255.0",
  mac: "080027000001"

#下記を追記し、今回追加したブリッジアダプタのデフォゲを仮想マシンのシェルを利用して追加。
config.vm.provision "shell",
  run: "always",
  inline: "route add default gw 192.168.100.1"

#下記を追記し、もしすでに既存のNICにデフォゲが設定されていたら仮想マシンのシェルを利用して削除
config.vm.provision "shell",
  run: "always",
  inline: "eval `route -n | awk '{ if ($8 ==\"eth0\" && $2 != \"0.0.0.0\") print \"route del default gw \" $2; }'`"

(略)

#下記をアンコメントし仮想化基盤がVirtualBoxの場合に実行するコマンドを指定
config.vm.provider "virtualbox" do |vb|
#起動時にVirtualBoxのGUIを表示
vb.gui = true

#メモリ割り当て量の変更
vb.memory = "1024"
end
(略)
```

デフォゲ設定は仮想マシン作成後に仮想マシンのシェルから設定するように書きました。これくらいVargrantのデフォルトの機能でやってくれんかなと思うんですけど、Vagrantは仮想化基盤の操作をラップするものなので、仮想化基盤からいじれないものは基本的にいじれないんでしょう。

ちなみにですが、eth0はBoxファイルの設定としてNATアダプタにすでに割り当てられていましたので、今回追加したブリッジアダプタはeth1として割り当てられます。eth0はVagrantが仮想マシン構築後にシェルを呼び出してコマンドをたたくときにsshで利用するっぽいです。

## rsyncの無効化

vagrantは仮想マシン構築中にホスト側のコマンドプロンプト作業ディレクトリをゲスト側にrsyncでマウントしてくれる設定になっています。ありがたいんですが、この作業ディレクトリ内に日本語が含まれるファイルやディレクトリが存在すると、2バイト文字の性で起動後しばらくするとエラー吐いて勝手にシャットダウンしてなんとBoxを削除してしまいます。基本的に無効にしておきましょう。下記を適当なとこに追記します。

```ruby
config.vm.synced_folder ".", "/vagrant", disabled: true
```

## Box起動

いよいよ以下のコマンドでBoxを起動。

```powershell
C:\Users\serotonin>vagrant up
```

作業ディレクトリ内に存在するVagratfileの内容に従い、だばーっと処理内容が流れます。VirtualBoxのコンソールからログインネームvagrant、パスワードvagrantでログインできて無事いろいろできてるか確認。ちなみにvagrantユーザはパスワードなしでsudo使えます。

## ssh秘密鍵のありか

Vagrantで構築される仮想マシンのsshdは、デフォルトでssh公開鍵認証のみを許可しており、パスワードログインを行うことができません。物理/仮想問わずリモートから接続するときに必要となるssh秘密鍵は、vagrant upした作業ディレクトリからみた以下の相対パスにあります。

```bash
.vagrant\machines\default\virtualbox/private_key
```

## Box削除

つくった仮想マシンで好きなことをやります。やりたいことが終わり、仮想マシンが不要になった際にそれを削除するコマンドがこちら。

```powershell
C:\Users\serotonin>vagrant destroy
```

これで仮想マシンを破棄できます。VirtualBoxコンソールから直で削除するのと一緒です。仮想マシン作成後に加えられたあらゆる変更も破棄されます。以降、vagrant upするたびに、Vagrantfileに従ってまっさらな仮想マシンがコマンド一発で作成できるようになります。

以上。いろいろ仕組みを学んでいくのもいいけど、こういう便利なツールの使い方も随時勉強して、効率よく物事を進めていきたい。

## 参考

- [Windows上でVirtualBox+Vagrant+CentOSによる仮想環境構築][1]
- [Vagrant Cloud上に公開されたBoxを利用する方法][2]
- [Vagrant で NIC の MAC アドレスを変更する][3]
- [HashiCorp Vagrant Networking Public Networks][4]
- [HashiCorp Vagrant synced-folders basic_usage ][5]

 [1]: http://qiita.com/hiroyasu55/items/11a4c996b0c62450940f
 [2]: http://www.punio.org/blog/201407251905VVAW.html
 [3]: http://momijiame.tumblr.com/post/77070688874/vagrant-%E3%81%A7-nic-%E3%81%AE-mac-%E3%82%A2%E3%83%89%E3%83%AC%E3%82%B9%E3%82%92%E5%A4%89%E6%9B%B4%E3%81%99%E3%82%8B
 [4]: https://www.vagrantup.com/docs/networking/public_network.html
 [5]: https://www.vagrantup.com/docs/synced-folders/basic_usage.html
