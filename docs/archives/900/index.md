---
title: Elasticsearchで複数インデックスをクエリする際に、インデックスが存在しなくても404エラーを出さないようにする
description: "アクセスログ分析などの目的で、日付でインデックスを切ってドキュメントを投入していること、あると思います。たとえば access-log-YYYY-MM-DD など。いくつかのインデックスの中からクエリしたいけど、それらのインデックスが存在しないこともある場合のクエリの書き方にちょっとハマったのでメモ。"
author: seroto_nin
type: post
date: 2021-05-29T13:14:21+00:00
url: /archives/900
categories:
  - Elasticsearch

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## 基本は`_search` API叩く時にインデックスをカンマ区切りで列挙すれば事足りる

例えば、`2021-05-28`のインデックスと、`2021-05-21`のインデックスのみに対してクエリしたいとき、以下のような書き方がまず思いつくと思います。

```json
POST /access-log-2021-05-21,access-log-2021-05-28/_search
{
    "query": {
        "bool": {
            "must": [
                { "terms": { "status": [500] } },
                { "terms": { "remote_ip": ["8.8.8.8", "1.1.1.1"] } }
            ]
        }
    }
}
```

`_search`APIを叩くときのURLのインデックス名を、カンマ続きで複数書く方法です。

## 存在しないインデックスにクエリしようとするとエラーになる

この方法、複数書いたインデックスが全て存在するならいいのですが、全てのインデックスが存在しないと使えません。

どれか一つのインデックスでも存在しないと、HTTP 404で返ってきてしまい、`index_not_found_exception`、`no such index [access-log-2021-05-28]`と言われてしまいます。

## 解決法: `query`オブジェクトにインデックス名を指定しよう

URLには検索対象のインデックスをワイルドカードで指定しておき、`query`オブジェクトの中で`_index`条件を付ければOK。

```json
POST /access-log-*/_search
{
    "query": {
        "bool": {
            "must": [
                { "terms": { "status": [500] } },
                { "terms": { "remote_ip": ["8.8.8.8", "1.1.1.1"] } },
                { "terms": { "_index": ["access-log-2021-05-21", "access-log-2021-05-28"] } },
            ]
        }
    }
}
```

これだと、存在しないインデックスがあっても、きちんとHTTP 200で返ってきます。

## パフォーマンスについても心配ない

ワイルドカードつけて`access-log-*`に当てはまる全てのインデックス検索しちゃわない？ めっちゃ遅くなるんじゃないの？ と思うかもしれませんが、ElasticSearchくん賢いので大丈夫です。

クエリがどういう検索をするか(SQLにおける`EXPLAIN`みたいな)は、Kibanaの`Dev Tools` => `Search Profiler`にかけると見ることができます。

そもそも指定した2つのインデックスしか検索対象になっていないので大丈夫です。

おわり。

<Comments />
