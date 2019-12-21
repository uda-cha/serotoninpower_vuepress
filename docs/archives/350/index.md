---
title: vagrantで大量の軽量Linux(Alpine Linux)を一括作成
description: "検証用に大量の仮想マシンが必要になったので、軽量LinuxであるAlpine Linuxをvagrantで一気に30台作成しました。手順をメモします。"
author: seroto_nin
type: post
date: 2018-01-13T06:35:15+00:00
url: /archives/350
categories:
  - Linux
  - PowerShell
  - vagrant
  - VirtualBox

---
# {{this.$page.frontmatter.title}}

<CategoriesAndDate/>

{{this.$page.frontmatter.description}}

<!--more-->

Alpine Linuxは軽量Linuxディストリビューションの一つで、よくDockerのゲストコンテナ用に利用されます。このディストリ独自のパッケージ管理システムであるapkがdockerのコンフィグであるdockerfileの書き方と相性が良いためです。ちなみにマストドンのコンテナもAlpineで作成されていました。

## ホストマシン環境

* CPU:Intel Corei5-6500 3.20GHz 4Core
* メモリ:8GB
* OS:Windows10 home 1709
* VirtualBox:5.1.30
* Vagrant:1.9.7

## 作業用ディレクトリ作成

Powershellで。ディレクトリ名は適当に。

```powershell
C:\Users\serotonin\VagrantFiles> mkdir alpine_30
C:\Users\serotonin\VagrantFiles> cd alpine_30
```

## Alpine Linuxをvagrantで扱う用のvagrantプラグイン追加

Alpine Linuxのネットワーク構成やホスト名の変更、ディスクのマウントなどをvagrantから行うためのプラグインを追加します。なんでAlpine Linux用のVagrantプラグインがあるのかというと、Alpine Linuxはもともと組み込み系のbusyboxをもとにしたOSであり、シェルがbashでなくてashだったり、/binや/sbinも/bin/busyboxへのシンボリックリンクだったりして、通常のLinuxへの操作とだいぶ異なるからだと思います(要出典)。

```powershell
C:\Users\serotonin\VagrantFiles\alpine_30> vagrant plugin install vagrant-alpine
```

## vagrant boxダウンロード & Vagrantfile生成

```powershell
C:\Users\serotonin\VagrantFiles\alpine_30> vagrant box add maier/alpine-3.1.3-x86_64
C:\Users\serotonin\VagrantFiles\alpine_30> vagrant init maier/alpine-3.1.3-x86_64
```

## Powershellでvagrantfile~~(の元ネタ)~~作成

以下の内容でcreate30alpine.ps1を作成してPowershellで実行。私のホストマシンのメモリは8GBしかないため、仮想マシンのメモリを128MBで作成することで30台動かせるようにします。128MB×30台で4GB弱。またホストの負荷軽減のために仮想マシンのGUIは非表示にします。

<span style="color: #ff0000;">210180715 Powershellスクリプトを改善し、吐き出されたファイルをそのままvagrantfileに使えるようにしました。</span>

```powershell
$Header = @"
Vagrant.configure("2") do |config|

  config.vm.provider "virtualbox" do |vb|
    vb.gui = false
    vb.memory = "128"
  end

  config.vm.box = "maier/alpine-3.1.3-x86_64"
  config.vm.synced_folder ".", "/vagrant", disabled: true

"@

for ($i=1; $i -lt 31; $i++){
$fourthoctet=200 + ${i}
$Body += @"
  config.vm.define "vm${i}" do |vm${i}|
    vm${i}.vm.host_name = "alpinevm${i}"
    vm${i}.vm.network "public_network",
      ip: "192.168.100.${fourthocte}",
      netmask: "255.255.255.0"
end

"@
}

$END = "end"

Add-Content -path .\vagrantfile -value ( $Header + $Body + $END ) -encoding String
```

## ~~Vagrantfile編集~~

~~出てきたtest.txtの内容をVagrantfileに貼り付けて、文字コードをSJIS、改行コードをLFに整える。これのせいで直接PoweshellからVagrantfileを作成できませんでした。ここもっと簡単にできないかな。~~

## ゲストマシン生成

```powershell
C:\Users\serotonin\VagrantFiles\alpine_30> vagrant up
```

おわり。

## 所感

* ホストマシンのメモリ増やしたい
* Powershellと文字コードの関係を勉強したい
* VirutlBoxじゃなくてWindows10 homeネイティブでDocker扱う環境整えたい

## 20191209追記

PowerShellで頑張らなくても普通にRubyで書けば良くね？

```ruby
Vagrant.configure("2") do |config|

  config.vm.provider "virtualbox" do |vb|
    vb.gui = false
    vb.memory = "128"
    vb.cpus = 1
  end

  config.vm.box = "maier/alpine-3.1.3-x86_64"
  config.vm.synced_folder ".", "/vagrant", disabled: true

  1.upto(30) do |i|
     config.vm.define "vm#{i}" do |v|
      v.vm.host_name = "alpinevm#{i}"
      v.vm.network "public_network",
        ip: "192.168.100.#{i + 50}",
        netmask: "255.255.255.0"
    end
  end
end
```

## 参考

* <https://github.com/maier/vagrant-alpine>
* <http://blog.sarabande.jp/post/142240565838>
