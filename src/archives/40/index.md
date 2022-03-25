---
title: マストドン導入について①
description: "マストドンを導入しようと奮起中。調べていくと大幅な環境変更が必要で、とても2、３日でできるものじゃなさそうなので、検討事項をメモ。"
author: seroto_nin
type: post
date: 2017-04-16T02:06:51+00:00
url: /archives/40
categories:
  - マストドン

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## マストドンとは

最近バズってるポストTwitterとの呼び声高いSNS。投稿文字数がTwitterよりちょっと多いくらいで、ユーザから見た時のTwitterとの差はそんなにない。ただシステムとしてTwitterと一番異なるのは、分散型システムであること。TwitterはTwitterが全ユーザのアカウントや投稿を保持しているため、Twitter社のシステムがダウンすると全サービスにつながらなくなる。マストドンはそうではなく、ユーザ自身がそのアカウント情報や投稿を保存するサーバを選択できる。そのため、一部のサーバが落ちても、そのサーバ以外に存在するユーザの投稿は問題なく見ることができる(当然自分のアカウント情報が含まれるサーバが落ちたら何も見れなくなるけど)。また、マストドンはOSSであり、ソースコードを引っ張ってきて自前でサーバを構築できる。プロプライエタリなTwitterと大きく異なる点の一つ。

## 要件

そんな今はやりのSNSマストドンのサーバを自前で構築しようと考えている。というわけで要件を以下に整理。

- マストドンを稼働させること(マストドンはDockerコンテナが用意されている。いい機会なので触れてみたい。)

- サーバを増やさないこと(このWordPressはGMOクラウドのVPSの2GBプランを契約して動かしている。リソースも余っているし、もろもろ月2000円程かかっているので、これ以上新たにサーバを増やし、金をかけたくない)

- 既存環境への変更を最小限にすること(技術も知識もないので大幅な変更には時間がかかる。悠長にやっていたらマストドンブームが終わる。)

- WordPressの稼働は止めないこと(このブログを打ち捨ててマストドンのみを立ち上げるのが一番簡単だが、それでは面白くない(勉強にならない))

## 方針

以上を受けて、現在検討している方針がこちら。

- 既存のサーバにDocker環境を構築し、そこにマストドンのコンテナを乗せる

- マストドンとWordPressを同居させるために、nginxをリバースプロキシサーバとして用いる。マストドンへのアクセスはコンテナに、WordPressへのアクセスはApacheに振り向ける(既存のApacheもリバースプロキシ機能を持っているが、SNSのような小さなリクエストを大量にさばくのには不向き)

- 将来的に、WordPressもコンテナ環境に移行する(現在はドキュメントルート直置き。コンテナに移行できれば管理が簡単になる。同時にApacheが不要となり、リソースを削減できる。時間がないので当面は保留。)

## やること

- Dockerの勉強

- nginxの勉強

&nbsp;

おわり。楽しくなってきた。