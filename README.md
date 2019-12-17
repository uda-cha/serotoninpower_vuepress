# serotoninpower_vuepress

自分のブログサイトのコードベース

## 開発環境初期化

https://vuepress.vuejs.org/guide/getting-started.html#inside-an-existing-project

```shell
$ docker-compose run --rm node npm install -D vuepress
$ mkdir docs
$ echo '# Hello VuePress' > docs/README.md
```

Then, add some scripts to package.json:

```json
{
  "scripts": {
    "dev": "vuepress dev docs",
    "build": "vuepress build docs"
  }
}
```

## 開発環境の起動

```shell
$ docker-compose run --rm --service-ports node npm run dev
```

## ビルド

```shell
$ docker-compose run --rm node npm run build
```

## firebaseへのデプロイ

- デプロイ前にビルドをやる
- firebase token は何らかの方法で取得しておく

`firebase.json`

```json
{
 "hosting": {
   "public": "./docs/.vuepress/dist",
   "ignore": []
 }
}
```

`.firebaserc`

```json
{
 "projects": {
   "default": "<YOUR_FIREBASE_ID>"
 }
}
```

```shell
$ docker-compose run --rm node npm install -D firebase-tools
$ docker-compose run --rm node /app/node_modules/.bin/firebase deploy --token <token>
```

