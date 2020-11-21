---
title: 'Fedora 33でkubernetesクラスタ組む'
description: "GKEの料金を支払うのがつらくなってきたので、自宅にFedora 33でkubernetesクラスタを組んだときのメモ。"
author: seroto_nin
type: post
date: 2020-11-21T17:22:54+09:00
url: /archives/879
categories:
  - kubernetes
---

# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## 環境

3ノード、シングルコントロールプレーンクラスター。コントロールプレーンはワーカーノードと共有。CNIはflannel。

基本的には以下のkubernetes公式ドキュメントに従って進めます。
* [kubeadmのインストール](https://kubernetes.io/ja/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)
* [kubeadmを使用したシングルコントロールプレーンクラスターの作成](https://kubernetes.io/ja/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)

```sh
$ cat /etc/redhat-release
Fedora release 33 (Thirty Three)
$ docker --version
Docker version 19.03.13, build 4484c46d9d
$ kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"19", GitVersion:"v1.19.3", GitCommit:"1e11e4a2108024935ecfcb2912226cedeafd99df", GitTreeState:"clean", BuildDate:"2020-10-14T12:47:53Z", GoVersion:"go1.15.2", Compiler:"gc", Platform:"linux/amd64"}
$ kubectl get pod -n kube-system kube-flannel-ds-5dbpv -o jsonpath='{.status.containerStatuses[0].image}'
quay.io/coreos/flannel:v0.13.0
```

参考までに、[雑構築Playbook](https://github.com/uda-cha/playbooks/blob/master/k8s.yml)を置いておきます。

## ハマったところ

### Fedora 33用のdocker rpmがない

VMをFeroda 33で構築してさぁkubeadmインストールしようとしたときに気付きました。

以下のissueで要望も上がっていますが、Fedora 33自体がかなり新しい(2020年10月29日リリース)なので、まだないようです。

[Please Provide a Repo for Fedora 33](https://github.com/docker/for-linux/issues/1114)

こういう場合、たいてい一つ前のディストリビューション用のrpm入れれば動きます。以下のrpmをインストールしました。

```yml
- name: install docker
  dnf:
    name:
    name:
      - https://download.docker.com/linux/fedora/32/x86_64/stable/Packages/containerd.io-1.3.7-3.1.fc32.x86_64.rpm
      - https://download.docker.com/linux/fedora/32/x86_64/stable/Packages/docker-ce-19.03.13-3.fc32.x86_64.rpm
      - https://download.docker.com/linux/fedora/32/x86_64/stable/Packages/docker-ce-cli-19.03.13-3.fc32.x86_64.rpm
```

趣味用なのでいいかなと。

### `zram-generator`サービスが勝手にSwapを作成する

[kubeadmのインストール#始める前に](https://kubernetes.io/ja/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#%E5%A7%8B%E3%82%81%E3%82%8B%E5%89%8D%E3%81%AB)にも記載がある通り、各ノードでSwapは無効化しないといけないです。

`kubeadm init`でコケるので必ず無効化しないといけないですが、`/etc/fstab`や`swapoff`コマンドでSwapを無効化しても、OSを再起動するとなぜかswapが勝手に作られてしまいます。

Swap領域が`/dev/zram0`に作られていて、なんだコレと思って調べた結果、[zram-generator](https://github.com/systemd/zram-generator)というsystemdサービスがあって、こいつが勝手にswapをzram上に作っていました。

なのでサービスを無効化します。私はrpmパッケージごとアンインストールしました。

```yml
- name: remove zram-generator to disable swap
  dnf:
    name: zram-generator
    state: absent
```

### CNIプラグインのインストールディレクトリが変わった？

ドキュメントに従ってクラスタを構築して、flannelのマニフェストをapplyしても、CoreDNSのPodがRunningにならず困りました。

Podをdescribeしてもあまり要領のいいエラーメッセージが出ていなかったのですが、nodeをdescribeしたところ、kubeletでエラーが発生していることがわかりました。

`journalctl -e -u kubelet.service`でkubeletサービスのエラーログを見てみると、以下のようなエラーメッセージが出ていました。

```sh
[failed to find plugin "flannel" in path [/opt/cni/bin] failed to find plugin "portmap" in path [/opt/cni/bin]
```

`flannel`やportmap`のプラグインが`/opt/cni/bin`にないよと怒られています。

findで探したところ、portmapやflannelコマンドは、`/opt/cni/bin`ではなく`/usr/libexec/cni`に配置されていました。
このファイルは、`containernetworking-plugins`というrpmパッケージによってダウンロードされていました。

```sh
$ dnf provides /usr/libexec/cni/portmap
メタデータの期限切れの最終確認: 0:08:56 時間前の 2020年11月21日 17時56分31秒 に実施しました。
containernetworking-plugins-0.8.7-1.fc33.x86_64 : Libraries for writing CNI plugin
Repo        : @System
一致:
ファイル名    : /usr/libexec/cni/portmap
```

このrpmパッケージは、`kubelet`によってインストールされるようです。

[Kubernetesバイナリとパッケージの内容](https://kubernetes.io/ja/docs/setup/production-environment/tools/kubeadm/kubelet-integration/#kubernetes%E3%83%90%E3%82%A4%E3%83%8A%E3%83%AA%E3%81%A8%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8%E3%81%AE%E5%86%85%E5%AE%B9)

`kubelet`が`containernetworking-plugin`をインストールするパスが変わったけど、それを読み込むパスの方が変わっていないのでしょうか。よくわかりません。

`kubelet`起動時のオプション`--cni-bin-dir`で変更してもいいようですが、私は以下のようにSymlinkを張って解決しました。

```yml
- name: mkdir for cni plugin
  file:
    path: /opt/cni
    state: directory

- name: create symlink for cni plugin
  file:
    path: /opt/cni/bin
    src: /usr/libexec/cni
    state: link
    force: yes
 ```

おわり。
