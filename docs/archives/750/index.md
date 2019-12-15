---
title: 既に動いてるdockerコンテナのボリュームを後から永続化する
author: seroto_nin
type: post
date: 2019-06-15T08:48:21+00:00
url: /archives/750
categories:
  - docker
  - Zabbix

---
# {{this.$page.frontmatter.title}}

とりあえず動かしてみるか～って動かしたコンテナをそのまま本利用に移したいときなど、ボリューム永続化を忘れていてあとから永続化したいということってありますよね。その手順をメモします。今回はZabbix Applianceコンテナのボリュームを永続化します。

<!--more-->

## 環境

```bash
$ cat /etc/redhat-release
CentOS Linux release 7.6.1810 (Core)
$ docker --version
Docker version 18.09.1, build 4c52b90
$ docker-compose --version
docker-compose version 1.23.2, build 1110ad01
$ docker images zabbix/zabbix-appliance
REPOSITORY                TAG                 IMAGE ID            CREATED             SIZE
zabbix/zabbix-appliance   centos-latest       56f2068934be        4 months ago        645MB
$ docker inspect 56f2068934be --format='{{index .ContainerConfig.Labels "org.label-schema.docker.cmd"}}'
docker run --name zabbix-appliance -p 80:80 -p 10051:10051 -d zabbix-appliance:centos-4.0.3
```

latestタグのdockerイメージを動かしている場合でも、そのイメージのコンテナ化のコマンド定義を見れば実際のバージョンがわかります。

実際に動いていたコンテナはこちら。<https://www.serotoninpower.club/archives/554> で作成したZabbix Applianceコンテナです。

```bash
$ docker ps -a
(~snip~)
cbeac2aec800        zabbix/zabbix-appliance:centos-latest                 "docker-entrypoint.sh"   4 months ago        Exited (0) 3 days ago
```

## 永続化の流れ

この手順では、既存のコンテナはデータバックアップ後に破棄します。コンテナ名、ホスト名、docker network内部のIPアドレスなどが変わるので注意。

* 動いているコンテナを止める
* 動いているコンテナのボリューム内のデータをバックアップしてホスト側の永続化するディレクトリにコピーする
* docker-composeのvolumesでバックアップしたディレクトリをコンテナにマウントする設定をする(docker runコマンドの-vオプションでもいいです)
* 新しいコンテナを起動する

## 動いているコンテナのボリュームを確認

コンテナイメージの作者は、DockerfileのVOLUME命令で変化の起きやすいデータをマウントポイント化することが推奨されています。作者がこれに従っていることを祈りますが、Zabbixなら大丈夫だと考えます。

<http://docs.docker.jp/engine/reference/builder.html#volume>

zabbix-applianceのDockerfileはgithubにあるので見てみます。

<https://github.com/zabbix/zabbix-docker/blob/4.0.3/zabbix-appliance/centos/Dockerfile#L181-L183>

VOLUME命令使ってくれています。このVOLUMEのパス内に変更の起きるデータ全てが格納されていれば、後述の方法で移行できます。

んで、このVOLUME命令はマウントポイントのみ指定してあり、ホスト側のディレクトリは指定されていません。この場合、dockerが動的にホスト側にディレクトリを切ってそれをコンテナにマウントさせます。

動いているコンテナのボリュームを確認します。`docker inspect`の`–-format`オプションって[Go言語のTemplate][1]準拠らしいんですけど書きづらい……。

```bash
$ docker inspect cbeac2aec800 --format='{{range .Mounts}}{{println .Source .Destination}}{{end}}'
/var/lib/docker/volumes/137e8f9f8a93b34ca20370fcd3ec816e5deae91cbd25bb2d433bec4fdceeeb44/_data /var/lib/mysql
/var/lib/docker/volumes/f9a71cb37042679de36b362d331ed2ca00243c341586fa7b4955eecb3c5d4f1d/_data /var/lib/zabbix/enc
/var/lib/docker/volumes/2d9cebb44f69f96e1babf95056d1d6d24e2534b1cc436f03957e2ac5c8cd7dba/_data /var/lib/zabbix/modules
/var/lib/docker/volumes/7aa81c284b3943272549c4273fb42fc937b5d6979f2d96af112e4612ab75c5be/_data /var/lib/zabbix/ssh_keys
/var/lib/docker/volumes/05a13f10485409650c0d60abbfae3469d87f41dc8b6491319df6351671bb10e4/_data /var/lib/zabbix/ssl/certs
/var/lib/docker/volumes/69751a8af546259d4311bd979ba6a012f3924a50f937c29095df2e7a503f4c6d/_data /var/lib/zabbix/ssl/keys
/var/lib/docker/volumes/55b0e0a6f2b5d3ff30fc4e2a63ad0812fb5030dd69adaa746b83a12a440af3c1/_data /usr/lib/zabbix/alertscripts
/var/lib/docker/volumes/ca643f75813ad39d3a20e731092c84ad3e52bfd56a663c189bf0e5b3cac24855/_data /usr/lib/zabbix/externalscripts
/var/lib/docker/volumes/613ecc7ea1d64aab9c8f5773ccd207ba7a9d5037faa8f045e90c686554728d85/_data /var/lib/zabbix/snmptraps
/var/lib/docker/volumes/9da22e7abf7610e410eadbe5a48ff47374c392cc69e6d5da4e323a1a181c5278/_data /var/lib/zabbix/ssl/ssl_ca
/var/lib/docker/volumes/cd117184a441e53c6e530fb31a1fce2686ad1062616611d7e6d63cd246d4c277/_data /etc/ssl/nginx
/var/lib/docker/volumes/c0d5dd7820e73497cd7d80206d764ca9a2cd7ae43daf93a8c83f75a4b33fee65/_data /var/lib/zabbix/mibs
```

## 動いているコンテナを止めてデータをバックアップする

```bash
docker stop cbeac2aec800
```

バックアップ先(永続化する)のホスト側のディレクトリのルートを切っておきます。

```bash
mkdir -p /var/docker/zabbix_appliance
chmod 755 /var/docker/zabbix_appliance
```

今回は、`/var/docker/zabbix_appliance`の配下に、コンテナのマウントポイントと同一の名前のディレクトリ名でバックアップを取ります。まずはディレクトリ作成。

```bash
install -d -m=755 /var/docker/zabbix_appliance/usr/lib/zabbix/alertscripts/
install -d -m=755 /var/docker/zabbix_appliance/usr/lib/zabbix/externalscripts/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/mysql/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/zabbix/mibs/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/zabbix/modules/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/zabbix/ssh_keys/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/zabbix/ssl/certs/
install -d -m=755 /var/docker/zabbix_appliance/etc/ssl/nginx/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/zabbix/enc/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/zabbix/snmptraps/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/zabbix/ssl/keys/
install -d -m=755 /var/docker/zabbix_appliance/var/lib/zabbix/ssl/ssl_ca/
```

続いてバックアップ。ワンライナーでかっこよくやろうとしたけどワイルドカード展開タイミングとsudoとパイプの罠にはまって結局テキストエディタでコマンド生成してしもた。

```bash
sudo cp -pr /var/lib/docker/volumes/55b0e0a6f2b5d3ff30fc4e2a63ad0812fb5030dd69adaa746b83a12a440af3c1/_data/* /var/docker/zabbix_appliance/usr/lib/zabbix/alertscripts/
sudo cp -pr /var/lib/docker/volumes/ca643f75813ad39d3a20e731092c84ad3e52bfd56a663c189bf0e5b3cac24855/_data/* /var/docker/zabbix_appliance/usr/lib/zabbix/externalscripts/
sudo cp -pr /var/lib/docker/volumes/137e8f9f8a93b34ca20370fcd3ec816e5deae91cbd25bb2d433bec4fdceeeb44/_data/* /var/docker/zabbix_appliance/var/lib/mysql/
sudo cp -pr /var/lib/docker/volumes/c0d5dd7820e73497cd7d80206d764ca9a2cd7ae43daf93a8c83f75a4b33fee65/_data/* /var/docker/zabbix_appliance/var/lib/zabbix/mibs/
sudo cp -pr /var/lib/docker/volumes/2d9cebb44f69f96e1babf95056d1d6d24e2534b1cc436f03957e2ac5c8cd7dba/_data/* /var/docker/zabbix_appliance/var/lib/zabbix/modules/
sudo cp -pr /var/lib/docker/volumes/7aa81c284b3943272549c4273fb42fc937b5d6979f2d96af112e4612ab75c5be/_data/* /var/docker/zabbix_appliance/var/lib/zabbix/ssh_keys/
sudo cp -pr /var/lib/docker/volumes/05a13f10485409650c0d60abbfae3469d87f41dc8b6491319df6351671bb10e4/_data/* /var/docker/zabbix_appliance/var/lib/zabbix/ssl/certs/
sudo cp -pr /var/lib/docker/volumes/cd117184a441e53c6e530fb31a1fce2686ad1062616611d7e6d63cd246d4c277/_data/* /var/docker/zabbix_appliance/etc/ssl/nginx/
sudo cp -pr /var/lib/docker/volumes/f9a71cb37042679de36b362d331ed2ca00243c341586fa7b4955eecb3c5d4f1d/_data/* /var/docker/zabbix_appliance/var/lib/zabbix/enc/
sudo cp -pr /var/lib/docker/volumes/613ecc7ea1d64aab9c8f5773ccd207ba7a9d5037faa8f045e90c686554728d85/_data/* /var/docker/zabbix_appliance/var/lib/zabbix/snmptraps/
sudo cp -pr /var/lib/docker/volumes/69751a8af546259d4311bd979ba6a012f3924a50f937c29095df2e7a503f4c6d/_data/* /var/docker/zabbix_appliance/var/lib/zabbix/ssl/keys/
sudo cp -pr /var/lib/docker/volumes/9da22e7abf7610e410eadbe5a48ff47374c392cc69e6d5da4e323a1a181c5278/_data/* /var/docker/zabbix_appliance/var/lib/zabbix/ssl/ssl_ca/
```

中身を見てみてコピーできていることを確認します。私の環境ではもともと空のファイルも多かったです(`var/lib/mysql`以下以外空でした。)。

```bash
$ sudo tree -d /var/docker/zabbix_appliance --charset=hoge
/var/docker/zabbix_appliance
|-- etc
|   `-- ssl
|       `-- nginx
|-- usr
|   `-- lib
|       `-- zabbix
|           |-- alertscripts
|           `-- externalscripts
`-- var
    `-- lib
        |-- mysql
        |   |-- mysql
        |   |-- performance_schema
        |   |-- test
        |   `-- zabbix
        `-- zabbix
            |-- enc
            |-- mibs
            |-- modules
            |-- snmptraps
            |-- ssh_keys
            `-- ssl
                |-- certs
                |-- keys
                `-- ssl_ca

25 directories
```

## docker-compose.ymlでボリュームを永続化する

いかんせんボリュームの数が多いので、docker run -vで永続化させるのは諦めました。

* docker-compose.yml

```yaml
version: '3'

services:
  zabbix_appliance:
    image: zabbix/zabbix-appliance:centos-latest
    environment:
      - PHP_TZ=Asia/Tokyo
      - ZBX_STARTDISCOVERERS=3
      - ZBX_STARTVMWARECOLLECTORS=2
    ports:
      - "80:80"
      - "10051:10051"
    volumes:
      - /var/docker/zabbix_appliance/usr/lib/zabbix/alertscripts/:/usr/lib/zabbix/alertscripts
      - /var/docker/zabbix_appliance/usr/lib/zabbix/externalscripts/:/usr/lib/zabbix/externalscripts
      - /var/docker/zabbix_appliance/var/lib/mysql/:/var/lib/mysql
      - /var/docker/zabbix_appliance/var/lib/zabbix/mibs/:/var/lib/zabbix/mibs
      - /var/docker/zabbix_appliance/var/lib/zabbix/modules/:/var/lib/zabbix/modules
      - /var/docker/zabbix_appliance/var/lib/zabbix/ssh_keys/:/var/lib/zabbix/ssh_keys
      - /var/docker/zabbix_appliance/var/lib/zabbix/ssl/certs/:/var/lib/zabbix/ssl/certs
      - /var/docker/zabbix_appliance/etc/ssl/nginx/:/etc/ssl/nginx
      - /var/docker/zabbix_appliance/var/lib/zabbix/enc/:/var/lib/zabbix/enc
      - /var/docker/zabbix_appliance/var/lib/zabbix/snmptraps/:/var/lib/zabbix/snmptraps
      - /var/docker/zabbix_appliance/var/lib/zabbix/ssl/keys/:/var/lib/zabbix/ssl/keys
      - /var/docker/zabbix_appliance/var/lib/zabbix/ssl/ssl_ca/:/var/lib/zabbix/ssl/ssl_ca
```

できたらdocker-compose.ymlがあるディレクトリで`docker-compose up -d`。新しいコンテナが立ち上げるので、動作確認をして、データが消えていないことを確認出来たら既存のボリューム永続化できていないコンテナは破棄してOKです。新しいコンテナなのでdocker network内のIPアドレスやホスト名も変わるので、必要なら修正しておきます。おわり。

 [1]: https://golang.org/pkg/text/template/
