---
title: マストドンのアップデート手順
description: "docker環境で動かしているマストドンを1.2.2から1.3.2へアップデートしたので手順をメモしておきます。"
author: seroto_nin
type: post
date: 2017-04-30T09:46:06+00:00
url: /archives/60
categories:
  - マストドン

---
# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

基本的には以下の公式ドキュメントの通り。

<https://github.com/tootsuite/documentation/blob/master/Running-Mastodon/Docker-Guide.md>

<!--more-->

マストドンを配置しているディレクトリで、公式のgitリポジトリの更新をローカルリポジトリに取り込む。最新バージョンの番号をメモしておく。

```bash
# git fetch
```

docker-compose.ymlとかの自身で変更したファイルを退避させる。このコマンド一発でリポジトリの内容を自動的に比較してくれて、変更したファイルだけを退避してくれます。

```bash
# git stash
```

新しくブランチを作成(-bオプション)し、さっきメモした最新バージョンをコミットする。tagsというのはgithubのバージョン管理に使われる識別子(という認識であってますかね)。

```bash
# git checkout -b production refs/tags/v1.3.2
```

さっき退避させたファイルをもとに戻す。これ忘れると完全にまっさらなマストドンがビルドされるので注意。

```bash
# git stash pop
```

きちんと自分が更新を加えたファイルが元に戻っているか確認してからイメージをビルドする。

```bash
# docker-compose build
```

最後にDBのマイグレーションとアセットのプリコンパイル(バージョンによっては必要ないことも。要Upgrade notes確認)を行う。

```bash
# docker-compose run --rm web rake db:migrate
# docker-compose run --rm web rake assets:precompile
```

最後にビルド。ログを眺めて立ち上がったことを確認。

```bash
# docker-compose up -d
# docker-compose logs -f
```

ログが止まったらブラウザからアクセスする。サーバー情報から無事アップデートできてることを確認しておわり。

docker-compose logs -fを実行したとき、これまでのログがすべて出力されるため鬱陶しい。ディスク容量的にはまったく問題ないから放置してもいいっちゃいいと思うんだけどなんとかしたい。
