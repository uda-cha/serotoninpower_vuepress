---
title: LPIC Level2合格
description: "やーっとLPIC Level2とれました。長かったよ。とりあえずこれで｢ある程度Linuxはできますんでフヒヒ｣みたいなことは言ってもいいよね。正答率65%以上、200-800点中500点で合格です。以下受験体験記です。"
author: seroto_nin
type: post
date: 2017-07-30T12:08:26+00:00
url: /archives/183
categories:
  - Linux
  - 資格

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}
  
<!--more-->

## LPIC Level2 ver 4.5について

実は最近Level2の出題内容が改訂されました。systemctlに全面的に対応したり、各種MWの新しいバージョンのコンフィグが出題されたり、ipv6にまつわる問題が出るようになりました。んでもってまだこの新バージョンの4.5に対応しているロクな参考書・問題集が発売されていない。ここが一番つらかった。

## 201試験

* 結果：合格
* 学習期間：1カ月
* 使用テキスト
  * あずき本(4.5対応(大嘘))
  * スピマス(4.0版)
* 得点：540点/800点
* 正解率内訳

| 項番 | セクション名        | 正解率 |
| -- | ------------- | --- |
| 1  | キャパシティプランニング  | 62% |
| 2  | Linuxカーネル     | 44% |
| 3  | システムの起動       | 77% |
| 4  | ファイルシステムとデバイス | 88% |
| 5  | 高度なストレージ管理    | 87% |
| 6  | ネットワーク構成      | 72% |
| 7  | システムの保守       | 66% |

勉強していた感じ、201試験は101試験や102試験の延長上にある感じで特に困らなかった。RAIDやLVM、カーネルアップデートだけ実機で手を動かして確認したほうがいいなぁと感じたのでやったらおおむねその通りでした。ただしやっぱりテキスト類が4.5に全然対応してくれてないのが痛い。4.5対応と謳っているあずき本を隅から隅まで舐めたのにどこにも載ってないことが聞かれまくったりした。結果1発で受かったからいいけど。

## 202試験(1)

* 結果：不合格
* 学習期間：1カ月
* 使用テキスト
  * あずき本(4.5対応(大嘘))
  * スピマス(4.0版)
  * ping-t 最強WEB問題集
* 得点：480点/800点
* 正解率内訳

| 項番 | セクション名          | 正解率 |
| -- | --------------- | --- |
| 1  | ドメインネームサーバ      | 62% |
| 2  | HTTPサービス        | 77% |
| 3  | ファイル共有          | 62% |
| 4  | ネットワーククライアントの管理 | 72% |
| 5  | 電子メールサービス       | 25% |
| 6  | システムのセキュリティ     | 85% |

LPIC最難関との呼び声高い202試験。何が難しいかって各サーバーごとのこまかーいディレクティブの違いをこれでもかと問われる。待ち受けポートの指定をするディレクティブがhttpdではListenでsquidではhttp_portでsshdではPortでDovecotではProtocolsだなんていちいち覚える必要あるか？　その場でぐぐるかコンフィグファイルのデフォルトのサンプルみればええんちゃう？　でも聞かれます。超暗記ゲーなわけです。それでもそのソフトウェアの歴史なんかを軽く調べればちょっと理由が見えてきたりするわけで面白かったですけどね。

そんな前情報を知っていたのでちょっと気合を入れて臨みました。ping-tというWeb問題集に追加で金を払ってゴリゴリ問題解きまくりました。全部で500問くらいあるんですが、全問正解できるレベルまでやりこみましたよ。全部金メダルで埋めましたよ。でも落ちた。足を引っ張ったのが電子メールサービス。ここで4.5から新しく出題範囲となったSieveというメールフィルタリング言語がこれでもかと聞かれて落ちた。完全にノーマークだった。あずき本にちょろっとしか書いてなかったやんか。

## 202試験(2)

* 結果：合格
* 学習期間：二週間
* 使用テキスト
  * あずき本(4.5対応(大嘘))
  * スピマス(4.0版)
  * ping-t 最強WEB問題集
  * 黒本 version4.5差分対応問題集
* 得点：540点/800点
* 正解率内訳

| 項番 | セクション名          | 正解率 |
| -- | --------------- | --- |
| 1  | ドメインネームサーバ      | 75% |
| 2  | HTTPサービス        | 81% |
| 3  | ファイル共有          | 75% |
| 4  | ネットワーククライアントの管理 | 81% |
| 5  | 電子メールサービス       | 50% |
| 6  | システムのセキュリティ     | 64% |

落ちた段階で黒本が4.0と4.5の差分問題集なるものを発売したと知り購入。これを2週と、あずき本、スピマス、ping-tをもう一周ずつやりました。結果なんとか合格。やっぱり電子メールサービスが低かったのと、なぜかシステムのセキュリティが第一回受験より下回っているのが気になるけどもう受かったからいいよこれで。はっきり言って202試験で覚えたこと一瞬で忘れると思う。こんなサーバアプリがあってこんなことができるよってくらいしか記憶に残らないと思う。

## お金のはなし

| 項番 | 費用項目 | 金額 |
| -- | --------------- | --- |
|1|201受験料(会社負担)|0|
|2|202(1)受験料(会社負担)|0|
|3|202(2)受験料(自己負担)|16200|
|4|あずき本|4320|
|5|スピマス|3240|
|6|ping-t(1カ月分)|2400|
|7|黒本 version4.5差分対応問題集|972|
|8|心労|∞|

合計: 27132+∞

無限に何を足しても無限なんですけどね。これに見合った報酬が得られるのかは今後の昇給と案件のやりがい次第です。

## 今後のうごき

さて休む暇なく10月にネスペとるぞと意気込んでいたんですが、会社で新入社員二人の基本情報合格フォローをおまえがやれとトップ通達が来たので時間的に無理そう。週二で1時間ずつ定時後に勉強会を主催することになりそうで、帰って勉強する時間が大幅に削れる。2年目中に高度資格ほしかったんだけどなぁ。とりあえず比較的簡単なWindowsServer2016の構築分野のMCSAか、AWSのアーキテクトアソシエイトか、CCNAかそのあたりを勉強しようと考えていますが、ネスペとる気まんまんだったのでいまいちやる気がおきない……。それよりマストドン復旧かんぜんに放置してたからまずはそこからかな。

P.S.みやはらさんへ
WordPressのページ間リンクがうまくいかんのは設定→パーマリンク設定ってところいじくってみたらなんとかなるかも。私は投稿名とかでパーマリンク設定するとうなぜかうまくリンクできず、やむを得ず数字ベースでパーマリンクした記憶がある。php読めないとWordPress内部の挙動わからんからトライ&エラーになってつらいですよね。
