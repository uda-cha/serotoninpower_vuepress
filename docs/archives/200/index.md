---
title: Vagrantでの複数VMの管理
author: seroto_nin
type: post
date: 2017-08-20T09:23:48+00:00
url: /archives/200
categories:
  - CentOS
  - Linux
  - vagrant

---
[前回の投稿][1]では仮想マシン一つを自動構築する手順を書きました。今回は構築する仮想マシンを用途に合わせて切り替えたり、複数の仮想マシンを同時に自動構築したりする手順を書きます。

<!--more-->

## vagrantの管理スコープ

Vagrantに必要なファイルは二つです。仮想マシンのISOイメージとも呼べるBoxファイルと、それをどう構築するかの内容を記述したvagrantfileです。VagrantはBoxファイルをグローバルに管理します。複数の仮想マシンを動かしたい場合でも、その個数分Boxファイルを用意する必要はありません。Boxファイルが保存されているディレクトリを意識する必要もありません。逆に、vagrantfileはプロジェクトごとに管理されます。vagrantの実行内容ごとにvagrantfileを用意する必要があります。vagrantはupする際にカレントディレクトリ内のvagrantfileを探して読み込むため、これが保存されているディレクトリにも気を配る必要があります。というかvagrantを使う場合必ず作業用ディレクトリを新規作成したほうがよさそう。

## 構築する仮想マシンの切り替え

なので、構築する仮想マシンを切り替えたい、例えば同じCentOSでも6と7の二種類を別々に自動構築したい場合は、vagrantfileを2つ用意し、ディレクトリを分けて配置しておけばOKです。ドス窓やパワーシェルにてvagrant upを行うディレクトリを切り替えれば、それぞれの仮想マシンを選択して自動構築できます。vagrantfileを分け、｢プロジェクトを分ける｣ということです。

なお、vagrant destroyする場合も、upしたディレクトリにて行う必要があります。vagrant upした後、vagrantは仮想マシン固有のファイル(ssh秘密鍵など)や、仮想マシン固有の情報(ロックしているホスト側のファイルなど)を、カレントディレクトリの.vagrantディレクトリ以下に自動的に作成します。destroyする際、vagrantはここを見に行くため、upするディレクトリとdestroyするディレクトリは同じでなければなりません。

## 複数の仮想マシンの同時自動構築

プロジェクトを分けるのはvagrantfileを分ければいいだけなんですが、一つのプロジェクトで同時に複数の仮想マシンを自動構築したい場合もあります。同時に使うマシンなのにいちいちディレクトリ切り替えてマシンの台数分vagrant upするのはめんどくさいです。これは一つのvagrantfileに複数の仮想マシンを構築するように書いてやればいいです。

## vagrantfileの書き方

わかりやすくするために、vagrantfileを一から書いてみます。ちなみにvagrantでは二バイト文字は使えないので、本例みたいにコメントに日本語はいれないでください。

### ⓪きほん

以下が大枠です。この中に構築内容を記述します。`("2")`ってのはvagrantfileの書き方エディションが2ってこと。なおvagrant自体のバージョンとは関係ないです。

```ruby
#⓪きほん
Vagrant.configure("2") do |config|
 #処理内容
end
#⓪おわり
```

### ①VirtualBox固有の設定を書く

｢⓪きほん｣の中に、`config.vm.provider "virtualbox" do |vb|`　と　`end`を記載し、その中ににVirtualBox固有の設定を書いておきます。仮想化基盤がVMware ESXiとかだとまた違った書き方になるはずです。しらんけど。

```ruby
#⓪きほん
Vagrant.configure("2") do |config|
  #①VirtualBox固有の設定
  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
    vb.memory = "768"
  end #①おわり
end
#⓪おわり
```

### ②複数の仮想マシンに共通する設定内容を書く

｢⓪きほん｣の中にそのまま共通設定を書いていきます。仮想マシン固有の設定の中にいちいち書いてもいいけど、まとめられるものはまとめておきます。`$script`については後述。

※やっていることはBoxファイルの指定、デフォゲ設定、rsyncの無効化、sshdでパスワード認証を許可(new)、｢$script｣の内容実行(new)、最後に再起動(new)です。

```ruby
#⓪きほん
Vagrant.configure("2") do |config|
  #①VirtualBox固有の設定
  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
    vb.memory = "768"
  end #①おわり

  #②共通設定
  config.vm.box = "CentOS/6"
  config.vm.provision "shell",
  run: "always",
  inline: "route add default gw 192.168.56.1"
  config.vm.provision "shell",
  run: "always",
  inline: "eval ‘route -n | awk ‘{ if ($8 =="eth0" && $2 != "0.0.0.0") print "route del default gw " $2; }’‘"
  config.vm.synced_folder ".", "/vagrant", disabled: true
  config.vm.provision "shell",
  run: "always",
  inline: "sed -i -e ‘s/PasswordAuthentication no/PasswordAuthentication yes/g’ /etc/ssh/sshd_config"
  config.vm.provision "shell",
  run: "always",
  inline: $script
  config.vm.provision "shell",
  run: "always",
  inline: "shutdown -r now"
  #②おわり
end
#⓪おわり
```

### ③変数を書く

vagrantfile中に変数を利用することもできます。上記の`$script`は変数を意味しています。変数の中身は｢⓪きほん｣の外に書きます。

※何をしているかというとキーボードレイアウトの日本語化。Boxイメージは海外で作られたものが多いので、大体デフォルトで外国のキーボードレイアウトになってます。設定変更には仮想マシン中のファイルに複数行を記述する必要があるため、その記述内容を変数としてまとめています。

```ruby
#③変数
$script = <<SCRIPT
cat << "EOS" | sudo tee "/etc/sysconfig/keyboard"
KEYTABLE="jp106″
MODEL="jp106″
LAYOUT="jp"
KEYBOARDTYPE="pc"
EOS
SCRIPT
#③おわり

#⓪きほん
Vagrant.configure("2") do |config|
  #①VirtualBox固有の設定
  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
    vb.memory = "768"
  end #①おわり

  #②共通設定
  config.vm.box = "CentOS/6"
  config.vm.provision "shell",
  run: "always",
  inline: "route add default gw 192.168.56.1"
  config.vm.provision "shell",
  run: "always",
  inline: "eval ‘route -n | awk ‘{ if ($8 =="eth0" && $2 != "0.0.0.0") print "route del default gw " $2; }’‘"
  config.vm.synced_folder ".", "/vagrant", disabled: true
  config.vm.provision "shell",
  run: "always",
  inline: "sed -i -e ‘s/PasswordAuthentication no/PasswordAuthentication yes/g’ /etc/ssh/sshd_config"
  config.vm.provision "shell",
  run: "always",
  inline: $script
  config.vm.provision "shell",
  run: "always",
  inline: "shutdown -r now"
  #②おわり
end
#⓪おわり
```

### ④仮想マシンごと独自の設定を書く

マシンになんらかのタグをつけます。タグの頭文字は小文字にしてください。頭文字が大文字だとvagrantのエンジンであるrubyがそれを定数として解釈してしまうため、シンタックスエラーを吐きます。今回は｢slave1｣と｢slave2｣というタグをつけた二台のマシンを作成します。｢ config.vm.define "<タグ>" do |<タグ>|｣から｢end｣の間に、マシン固有の設定を書いていきます。

```ruby
#③変数
$script = <<SCRIPT
cat << "EOS" | sudo tee "/etc/sysconfig/keyboard"
KEYTABLE="jp106″
MODEL="jp106″
LAYOUT="jp"
KEYBOARDTYPE="pc"
EOS
SCRIPT
#③おわり

#⓪きほん
Vagrant.configure("2") do |config|
  #①VirtualBox固有の設定
  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
    vb.memory = "768"
  end #①おわり

  #②共通設定
  config.vm.box = "CentOS/6"
  config.vm.provision "shell",
  run: "always",
  inline: "route add default gw 192.168.56.1"
  config.vm.provision "shell",
  run: "always",
  inline: "eval ‘route -n | awk ‘{ if ($8 =="eth0" && $2 != "0.0.0.0") print "route del default gw " $2; }’‘"
  config.vm.synced_folder ".", "/vagrant", disabled: true
  config.vm.provision "shell",
  run: "always",
  inline: "sed -i -e ‘s/PasswordAuthentication no/PasswordAuthentication yes/g’ /etc/ssh/sshd_config"
  config.vm.provision "shell",
  run: "always",
  inline: $script
  config.vm.provision "shell",
  run: "always",
  inline: "shutdown -r now"
  #②おわり

  #④マシンごとの独自設定
  config.vm.define "slave1" do |slave1|
    slave1.vm.host_name = "CentOS6Slave1"
    slave1.vm.network "private_network",
    ip: "192.168.56.101",
    netmask: "255.255.255.0",
    mac: "080027000101"
  end
  config.vm.define "slave2" do |slave2|
    slave2.vm.host_name = "CentOS6Slave2"
    slave2.vm.network "private_network",
    ip: "192.168.56.102",
    netmask: "255.255.255.0",
    mac: "080027000102"
  end
  #④おわり
end
#⓪おわり
```

以上。あとはこのvagrantfileを配置したディレクトリでvagrant upすれば、このファイルの内容に沿って二台の仮想マシンが自動構築されます。結構vagrantfileがでかくなりましたが、vagrant upしてから仮想マシンが使えるようになるまでたった4分なので結構満足です。

Windows Serverもvagrantで作ったり壊したりしたいんだけど、Linux系と違って自分でBoxファイルを作る必要があるっぽい。ネットに記事がいくつかあがってたけどえっらい長いし、家ならまだしも職場のオフライン環境だとかなーりめんどくさそうなのでちょっとどうしようかな。

## 参考

- [実践 Vagrant][2]
- [HashiCorp Vagrant provisioning shell][3]
- [bashのヒアドキュメントで、root権限下のディレクトリにスクリプトを作成する][4]

 [1]: https://www.serotoninpower.club/archives/188
 [2]: https://www.amazon.co.jp/%E5%AE%9F%E8%B7%B5-Vagrant-Mitchell-Hashimoto/dp/4873116651
 [3]: https://www.vagrantup.com/docs/provisioning/shell.html
 [4]: http://te2u.hatenablog.jp/entry/2015/07/01/224505
