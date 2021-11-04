# serotoninpower_vuepress

自分のブログサイトのコードベース

## 開発環境初期化


```shell
$ docker-compose run --rm node npm install
```

## 開発環境の起動

```shell
$ docker-compose run --rm --service-ports node npm run dev
```

## ビルド

```shell
$ docker-compose run --rm node npm run build
```

## ESLint

```shell
$ docker-compose run --rm node npm run lint --silent
```

## markdownlint

```shell
$ docker-compose run --rm node npm run mdlint --silent
```

## firebaseへのデプロイ

- デプロイ前にビルドをやる
- firebase token は何らかの方法で取得しておく

`firebase.json`

```json
{
 "hosting": {
   "public": "./src/.vuepress/dist",
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
$ docker-compose run --rm node npx firebase deploy --token <token>
```

