---
title: 'DLsiteの新作をRSS配信する(Ruby on AWS Lambda + S3 + AWS SAM)'
description: "毎日DLsiteの新作を見ているんですが、そういえばRSS配信してないのかなと思って調べた感じなかったので作りました。AWS LambdaとSAMの勉強も兼ねています。"
author: seroto_nin
type: post
date: 2020-05-03T02:56:32+09:00
url: /archives/825
categories:
  - Ruby
  - Lambda
---

# {{this.$page.frontmatter.title}}

<Date/><ShowCategoriesOfPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## 構成

* AWS SAMでAWS LambdaにRubyコードを依存gem含めてデプロイ
* AWS CloudWatchから定期的にAWS Lambdaをキック
* AWS LambdaからRSSを作成してパブリックアクセス可なS3にput
  * DLsiteの新作ページをクローリング&パース
  * パース結果をS3にjson形式でput
  * 前回のパース結果のjsonを取得し、差分を更新
  * RSSフィード形式に起こしてxmlドキュメントとしてS3にput

AWS LambdaはAWS SESに来たメールの転送に使っていたりするのですが、手作業で適当に作ってそれっきりで理解が浅かったので、この機会にちょっと勉強しました。

Lambdaの構成を再現できるよう、またNative ExtentionなgemをLambdaで使えるよう、AWS SAMで構成管理を行うようにしました。

リポジトリはここ。

[dlsite_rss](https://github.com/uda-cha/dlsite_rss)

RSSのURLはこちら。

[voice_rss.xml](https://dlsite-rss.s3-ap-northeast-1.amazonaws.com/voice_rss.xml)

インフラ回りで時間食いすぎて肝心のRubyのロジックが相当ガバいのなんとかしたい。

## ハマったところ

### gemをLambdaで使いたいときはgemごとパッケージングしてアップロードする必要がある

[docs.aws.amazon.com - Ruby の AWS Lambda デプロイパッケージ#追加の依存関係を使用して関数を更新する](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/ruby-package.html#ruby-package-dependencies)

Lambda実行前に勝手に`bundle install`するような方法はなく、依存gemごとコードをパッケージングしてLambdaにアップロードする必要があります。

※リンクでは`zip`で固めて`aws lambda`でアップロードしていますが、後述の理由でこの方法は使わず、`sam`を使っています。

### Native ExtentionなgemはAmazonLinux上でコンパイルしてパッケージングする必要がある

`nokogiri`など、Native Extentionなgem(RubyではなくCで書かれたもの)は、コンパイルした環境以外では動きません。なので、パッケージングする際に、Lambdaの実行環境と同じ環境で`bundle install`してやる必要があります。

LambdaはAmazonLinux上で動いています(アーキテクチャはわからん)。コンテナでAmazonLinuxイメージを用意してそこでコンパイルしてもよかったのですが、`sam build --use-container`で
その操作をラップしてくれること、およびsamでLambdaの構成管理も行えるとのことなので、ここでsamを採用しました。

SAMの方式として、ローカルでコンテナ経由でLambda関数をパッケージング(`sam build`)し、それをS3にアップロード(`sam package`)し、それをLambdaにデプロイ(`sam deploy`)する、という流れを取ります。

```sh
$ pipenv run sam build --use-container
$ pipenv run sam package --s3-bucket ${SAM_S3_BUCKET}
$ pipenv run sam deploy \
  --stack-name ${SAM_STACK_NAME} \
  --s3-bucket ${SAM_S3_BUCKET} \
  --s3-prefix ${SAM_S3_PREFIX} \
  --capabilities ${SAM_CAPABILITIES} \
  --region ${SAM_REGION} \
  --no-fail-on-empty-changeset
```

なお、上記`sam package`/`sam deploy`コマンドに必要な設定値(環境変数で指定している部分)は、一度`sam build`した後に`sam deploy --guided`コマンドを実行すると対話的にいろいろきかれ、`samconfig.toml`に吐き出してくれるのでそれを使います。

`samconfig.toml`ファイルがカレントディレクトリに存在すれば、オプションなしの`sam deploy`コマンドのみでLambdaにデプロイできますが、ファイルは取り回しが悪いので環境変数&コマンドに起こしています。

### Lambdaで使うGemfileとローカルでのテスト用に使うGemfileは分ける

これいまいち腑に落ちていないのですが、samはデフォルトでそういう構成を推奨しているようです。`sam init`をするとこうなります。

コンテナなどでかんぺきにdevelopment/test/production環境を分離できるなら分けなくてもいいと思うのですが、そうでない環境向けにこういう構成をとっているんですかね。

```sh{2,8}
$ tree
├── Gemfile
├── Gemfile.lock
├── Pipfile
├── Pipfile.lock
├── README.md
├── dlsite_rss
│   ├── Gemfile
│   └── app.rb
├── events
│   └── event.json
├── template.yaml
└── tests
    └── unit
        └── test_handler.rb
```

`dlsite_rss/Gemfile`にはLambda上で使うgemを記載して、`Gemfile`ではそれプラステスト用のgemを記載しています。

* `Gemfile`

```ruby{7}
# frozen_string_literal: true

source "https://rubygems.org"

git_source(:github) {|repo_name| "https://github.com/#{repo_name}" }

eval_gemfile File.join( File.dirname(__FILE__), "dlsite_rss/Gemfile")
gem "test-unit"
gem "mocha"
gem "pry-byebug"
```

ローカルでユニットテストを行うときはこう。

```sh
$ bundle exec ruby tests/unit/test_handler.rb
```

samコマンドには、ローカル上にLambdaを模した環境を構築し、そこでLambda関数レベルのテストを行うこともできます(今回実装していないですが)

```sh
$ pipenv run build --use-container
$ pipenv run sam local invoke DlsiteRSSFunction
```

### オブジェクトACLでS3のパブリックアクセスを許可している場合、指定しないとオブジェクトが更新される度にパブリックアクセスがオフになる

完全にAWS初心者の感想です。そうなのかーという感じですがそうみたいです。更新するたびにaclを設定してやる必要があります。

```ruby
def put_to_s3(key:, body:, content_type: "application/json; charset=utf-8", public: false)
  acl = public ? "public-read" : "private"

  s3_client.put_object(
    bucket: ENV['BUCKET'],
    key: key,
    body: body,
    content_type: content_type,
    acl: acl,
  )
end
```

### SAM(というかCloudFormation)の権限管理めんどくせ

8割方の時間はこれにもっていかれました。`sam deploy`して権限足りてなくて怒られてまた追加して。。。と無限に繰り返していました。

#### デプロイするユーザに必要な権限

SAMはバックエンドにCloudFormationを使っているそうです。なのでデプロイするAWSユーザにCloudFormationを操作する権限が必要です。

また、Lambdaの関数を作ったり削除したり設定を書き換えたりタグを打ったりするので、Lambdaを操作する権限も必要です。デプロイするユーザとLambdaを実行するユーザを分けていれば、デプロイするユーザにLambdaを実行する権限は不要です。

LambdaソースコードはS3経由でLambdaにアップロードされるので、S3の特定のバケットのオブジェクトを読み書きする権限も必要です。

Lambda実行ロールも読み書きするので、IAMのroleを操作する権限も必要です。

最後まで残っていたのがこのエラーメッセージ。

```
User: arn:aws:iam::xxxxxxxxxxxx:user/xxxxxxxx is not authorized to perform: events:PutRule on resource: arn:aws:events:ap-northeast-1:xxxxxxxxxxxx:rule/**********-xxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxx (Service: AmazonCloudWatchEvents; Status Code: 400; Error Code: AccessDeniedException; Request ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

エラーメッセージをググると出るのですが、これはLambdaをCloudWatchからキックするための`EventBridge`のルール作成権限が足りていないことがエラーの原因です。

このへんの権限管理は手でIAMポリシーをポチポチやってしまったのですが、ゆくゆくは構成管理したい。

ちなみに現状デプロイユーザにアタッチされている権限一覧はこちら。もっとアクションもリソースも絞りたい。

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "lambda:CreateFunction",
                "lambda:TagResource",
                "events:PutRule",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "lambda:GetFunctionConfiguration",
                "cloudformation:CreateChangeSet",
                "lambda:UntagResource",
                "iam:PassRole",
                "cloudformation:DescribeStackEvents",
                "lambda:ListTags",
                "events:RemoveTargets",
                "lambda:DeleteFunction",
                "cloudformation:DescribeChangeSet",
                "cloudformation:ExecuteChangeSet",
                "iam:GetRole",
                "events:DescribeRule",
                "s3:*",
                "lambda:UpdateFunctionConfiguration",
                "cloudformation:GetTemplateSummary",
                "cloudformation:DescribeStacks",
                "events:DeleteRule",
                "events:PutTargets",
                "lambda:UpdateFunctionCode",
                "lambda:AddPermission",
                "cloudformation:DescribeStackSet",
                "lambda:RemovePermission"
            ],
            "Resource": "*"
        }
    ]
}
```

#### LambdaをCloudWatchから定期実行できるようにする

先ほどCloudWatchからLambdaをキックするルールをデプロイ時に作成するために、`EventBridge`のルール作成権限をデプロイするユーザに付与しました。

それとは別に、このLambda関数を`EventBridge`からキックしてもいいというパーミッションをLambda関数に与えてあげる必要があります。これはAWS SAMで作りました。

* template.yaml

```yaml
Resources:
  (~snip~)
  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref "DlsiteRSSFunction"
      Action: lambda:InvokeFunction
      Principal: events.amazonaws.com
```

AWSの権限管理は本当によくわからん。。。

## 所感

新しいことをもっとさくっとできるようになりたい。いつまで経っても手が遅い。

<Comments />
