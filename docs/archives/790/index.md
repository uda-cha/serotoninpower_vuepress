---
title: nginxでX-Forwarded-Forの値に$proxy_add_x_forwarded_forを安易に使わない方が良い
description: "nginxでX-Forwarded-Forヘッダを付与するのに`$proxy_add_x_forwarded_for`という便利な変数がありますが、迂闊に設定するとちょっと危ないのでメモします。"
author: seroto_nin
type: post
date: 2019-08-17T14:21:01+00:00
url: /archives/790
categories:
  - nginx

---
# {{this.$page.frontmatter.title}}

{{this.$page.frontmatter.description}}

<!--more-->

## 公式ドキュメントの `$proxy_add_x_forwarded_for` の説明

> `$proxy_add_x_forwarded_for`
>
> the `“X-Forwarded-For”` client request header field with the `$remote_addr` variable appended to it, separated by a comma. If the `“X-Forwarded-For”` field is not present in the client request header, the `$proxy_add_x_forwarded_for` variable is equal to the `$remote_addr` variable.

<https://nginx.org/en/docs/http/ngx_http_proxy_module.html#var_proxy_add_x_forwarded_for>

受け取ったリクエストヘッダにXFFヘッダがなければ、XFFヘッダを作成してクライアントIPアドレスを値に設定してバックエンドにリクエストを送ります。受け取ったリクエストヘッダにXFFがあれば、それにカンマ区切りでクライアントのIPアドレスを追加してバックエンドにリクエストを送ります、とあります。

以下の一行を追加するだけで、上記の挙動を自動でやってくれるため大変便利です。

`proxy_set_header X-Forwarded-For         $proxy_add_x_forwarded_for;`

しかし、この変数を利用している場合、以下のような問題が起こります。

## 問題1:nginxがXFFを生成するフロントエンドの場合、XFFの改ざんが可能になる

nginxがXFFを生成するフロントエンドとなっている場合です。 `$proxy_add_x_forwarded_for`は、単純に｢XFFがあれば追加し、なければ作る｣という挙動しか行わないため、悪意のあるクライアントがXFFヘッダをつけてリクエストを飛ばしてきた場合、そのXFFヘッダにそのままクライアントIPアドレスを追加してバックエンドに流してしまいます。バックエンドに対するクライアントIPアドレスの偽装が可能になる可能性があります。

LBやFW等で一旦リクエストを受け取って、そのバックエンドとしてnginxを利用している場合、そのLBやFWが悪意あるXFFの破棄、およびXFFの新規生成を行ってくれていれば、nginx側はこの問題を気にする必要はありません。最もLBやFWの挙動は確認しておく必要があります。

## 問題1:どうすればいいか

nginxがXFFを生成するフロントエンドでなければ、`$proxy_add_x_forwarded_for`を使ってもいいです。そうでなければ、nginxでXFFを生成する際に`$proxy_add_x_forwarded_for`を使ってはいけません。

以下のように、クライアントIPアドレスをそのままXFFの値とすれば、悪意あるXFFの消去ができるためOKです。

`proxy_set_header X-Forwarded-For        $remote_addr;`

## 問題2:`:real_ip_header`などで`$remote_addr`が変更されている場合、正しく上流プロキシのIPアドレスをXFFに追加できない

公式ドキュメントの記述にもあるように、`$proxy_add_x_forwarded_for`は`$remote_addr`の値をXFFに埋め込みます。`$proxy_add_x_forwarded_for`は、`$remote_addr`が直近のリクエストを送信したサーバのIPアドレスであることを期待するため、多段プロキシ環境などで`$remote_addr`を上流プロキシではなくクライアントのIPアドレスに変更している場合に、上流プロキシのIPアドレスをXFFに埋め込めないという問題が発生します。

下記の記事で言うと、内部プロキシproxy2で、XFFに`$proxy_add_x_forwarded_for`を利用している場合に問題が起こります。

[多段nginxでもX-Forwarded-ForできちんとバックエンドにクライアントIPアドレスを伝える せろとにんぱわー.](https://www.serotoninpower.club/archives/780)

### 問題2:期待されるXFFの値とこの設定で実際に設定されるXFFの値

バックエンドが受け取るXFFリクエストヘッダ、つまりproxy2が付与するXFFヘッダの値です。

* 期待されるXFF: `X-Forwarded-For: 192.168.100.101, 172.21.0.1`
* 実際に設定されるXFF: `X-Forwarded-For: 192.168.100.101, 192.168.100.101`

## 問題2: どうすればいいか

記事に記載の通り、上流プロキシproxy1から受け取ったXFFヘッダに、上流プロキシのIPアドレスを追記してやればいいです。`$proxy_add_x_forwarded_for`は使えません。

`proxy_set_header X-Forwarded-For        "$http_x_forwarded_for, $realip_remote_addr";`

参考： <https://stackoverflow.com/questions/29279084/nginx-proxy-add-x-forwarded-for-and-real-ip-header>

以上、はまったポイントでした。問題1はあまりネットで問題とされていないっぽいけど、私の何か思い違いだろうか。
