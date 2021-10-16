---
title: CloudWatch Logsのログ本文をDiscordへ送るAWS Lambda関数
description: "Slackへ送るサンプルはネットに大量に上がっているのですが、Discordへ送る例がネットに転がってなかったのでメモ。"
author: seroto_nin
type: post
date: 2021-10-16T11:23:30+09:00
url: /archives/909
categories:
  - AWS
  - CloudWatch Logs
  - Lambda
  - Golang
---

# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## リポジトリ

[uda-cha/cloudwatch_logs_to_discord](https://github.com/uda-cha/cloudwatch_logs_to_discord)

## 構成

おおむねリポジトリのREADME.mdに書いてある通りです。

CloudWatch Log の Subscription Filterを作成し、そこでフィルタに引っかかったログデータをlambdaへ送ります。

lambdaでは、そのログデータから送りたいデータのみを取りだし、DiscordのWebhookへ送りつけます。

言語はなんでもいいのですが、今回はGoで書いてみました。

```go
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/DisgoOrg/disgo/discord"
	"github.com/DisgoOrg/disgo/webhook"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-lambda-go/lambdacontext"
)

func SendToDiscord(msg string) (err error) {
	webhookID := os.Getenv("WEBHOOK_ID")
	webhookToken := os.Getenv("WEBHOOK_TOKEN")

	if len(webhookID) == 0 || len(webhookToken) == 0 {
		return fmt.Errorf("environment variables must be set")
	}

	client := webhook.NewClient(discord.Snowflake(webhookID), webhookToken)
	_, err = client.CreateContent(msg)

	return err
}

func HandleRequest(ctx context.Context, event events.CloudwatchLogsEvent) (string, error) {
	lc, _ := lambdacontext.FromContext(ctx)

	data, err := event.AWSLogs.Parse()
	if err != nil {
		return fmt.Sprintf("Failed to parse AWSLogs. request id: %s", lc.AwsRequestID), err
	}

	for _, logEvent := range data.LogEvents {
		if err := SendToDiscord(logEvent.Message); err != nil {
			return fmt.Sprintf("Failed to send log event id: %s.", logEvent.ID), err
		}
	}

	return fmt.Sprintf("Success to send %d logs.", len(data.LogEvents)), nil
}

func main() {
	lambda.Start(HandleRequest)
}
```

## 感想

[マイクラサーバをECSで立てる](https://www.serotoninpower.club/archives/903/)の記事で書いたログ監視をこれでやってます。

複雑なinputが来るものは静的型付け言語が楽でいいですね。

<Comments />
