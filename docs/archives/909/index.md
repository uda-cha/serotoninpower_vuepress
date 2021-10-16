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
	"strings"

	"github.com/DisgoOrg/disgo/discord"
	"github.com/DisgoOrg/disgo/webhook"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-lambda-go/lambdacontext"
)

type DiscordWebHookConfig struct {
	webhookID    string
	webhookToken string
}

func (c DiscordWebHookConfig) Validate() (err error) {
	if len(c.webhookID) == 0 || len(c.webhookToken) == 0 {
		return fmt.Errorf("environment variables must be set")
	}

	return
}

func SendToDiscord(msgSlice []string) (err error) {
	config := DiscordWebHookConfig{
		webhookID:    os.Getenv("WEBHOOK_ID"),
		webhookToken: os.Getenv("WEBHOOK_TOKEN"),
	}

	if err := config.Validate(); err != nil {
		return err
	}

	msg := strings.Join(msgSlice, "\r")

	client := webhook.NewClient(discord.Snowflake(config.webhookID), config.webhookToken)
	_, err = client.CreateContent(msg)

	return err
}

func ParseAWSLogsToStringSlice(awsLogs events.CloudwatchLogsRawData) (msgSlice []string, err error) {
	data, err := awsLogs.Parse()
	if err != nil {
		return nil, err
	}

	for _, logEvent := range data.LogEvents {
		msgSlice = append(msgSlice, logEvent.Message)
	}

	return msgSlice, nil
}

func HandleRequest(ctx context.Context, event events.CloudwatchLogsEvent) (string, error) {
	lc, _ := lambdacontext.FromContext(ctx)

	msgSlice, err := ParseAWSLogsToStringSlice(event.AWSLogs)

	if err != nil {
		return fmt.Sprintf("Failed to parse log. request id: %s.", lc.AwsRequestID), err
	}

	if err := SendToDiscord(msgSlice); err != nil {
		return fmt.Sprintf("Failed to send log. request id: %s.", lc.AwsRequestID), err
	}

	return fmt.Sprintf("Success to send %d logs.", len(msgSlice)), nil
}

func main() {
	lambda.Start(HandleRequest)
}
```

## 感想

[マイクラサーバをECSで立てる](https://www.serotoninpower.club/archives/903/)の記事で書いたログ監視をこれでやってます。

複雑なinputが来るものは静的型付け言語が楽でいいですね。

[https://github.com/aws/aws-lambda-go](https://github.com/aws/aws-lambda-go)に、lambdacontext/CloudwatchLogsEventの型定義があったので、自分で頑張ってinputされたJsonをパースする構造体を書かなくて良いのが楽でした。

<Comments />
