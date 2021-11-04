---
title: PowershellのXPathNavigatorでXMLパース
description: "仕事でやったことのメモ。XMLファイルで記述された文書をPowerhsellでパースし、必要な情報を取り出す方法です。"
author: seroto_nin
type: post
date: 2018-04-30T15:31:21+00:00
url: /archives/416
categories:
  - PowerShell

---
# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

## XMLとは

Extensible Markup Languageの略。html同様マークアップ言語ですが、htmlとは違い属性を自由に定義できるため、アプリケーションのコンフィグファイル等によく利用されています。Tomcatの設定なんかもXML形式。

ファイルの先頭にはXML宣言を書きます。この文書はXMLですよという宣言。

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes">
```

versionというのはXMLのバージョン。現在は1.0以外ありません。encodingはその名の通り文字のエンコーディング形式。standaloneというのはこの文書がスタンドアロン文書かどうか。XMLは外部の文書を読み込むこともできるそうです。

んで中身。例えばこんな行があったとします。

```xml
<Linux distributor="Red Hat">CentOS</Linux>
```

Linuxの位置にあるものは｢要素｣。Linux要素の開始タグと終了タグで囲まれたCentOSが｢コンテンツ｣。distributorの位置にあるものはLinux要素が持つ｢属性｣。こんな感じで、XMLは｢要素｣が｢コンテンツ｣を持ち、要素の付加的な情報を｢属性｣で記述していく文章です。

マークアップ言語なので、要素は子要素を持つことができます。こんな感じ。htmlでよく見るやつですね。

```xml
<OS>
  <Linux distributor="Red Hat">CentOS</Linux>
  <Windows distributor="Microsoft">Windows10</Windows>
</OS>
```

一つの要素は属性を複数持つこともできます。こんな感じ。属性の順番は意味をなしません。

```xml
<Linux distributor="Red Hat" desktopmanager="GNOME">CentOS</Linux>
```

コンテンツを含まない要素もあります。その場合、htmlと同様にスラッシュを開始タグの末尾につけることで、終了タグを省略できます。以下二つは同じ意味。省略した書き方を｢空要素タグ｣と呼んだりします。

```xml
<Linux distributor="Red Hat"></Linux>
<Linux distributor="Red Hat"/>
```

## PowershellとXML

仕事でXMLから情報を取り出さなあかんくなったので、やっぱどんな環境でも使えるツールが一番いいんだろうなぁと思ってPowerhsellとXMLについて調べました。

PowershellにはクラスとしてXML型が存在します。例えばこんな文書をtest.xmlとして作成します。

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes">
<OS>
 <Linux distributor="Red Hat" desktopmanager="GNOME">CentOS</Linux>
 <Windows distributor="Microsoft">Windows10</Windows>
</OS>
```

そしてこのファイルの中身をGet-Contentで取得し、変数に代入します。その際、データ型としてXMLと指定します。

```powershell
PS C:\work> $MYXML = [xml](Get-Content .\test.xml)
```

こうすることで、要素をドット区切りで取得できるようになります。オブジェクトのプロパティを取得していくイメージですね。

```powershell
PS C:\work> ${MYXML}.OS

Linux Windows
----- -------
Linux Windows

PS C:\work> ${MYXML}.OS.Linux

distributor desktopmanager #text
----------- -------------- -----
Red Hat     GNOME          CentOS
```

属性は、XMLの要素(XmlElement)クラスのGetAttributeメソッドを利用します。

```powershell
PS C:\work> ${MYXML}.OS.Linux.GetAttribute("distributor")
Red Hat
```

属性の単純なgetとsetは可能なのですが、検索だとか件数カウントだとかが微妙に使いづらい。例えばある属性を持つ要素だけを絞り込んでそのコンテンツを取得する、なんてことはちょっとしたロジックを書いてやらなきゃいけない。foreach文回して全部書き出してそこから選択する、とかね。そこで登場するのがPowershellのXPathNavigatorオブジェクト。

## PowershellとXPathNavigator

XMLクラスの持つ`CreateNavigator()`メソッドを利用すると、XMLオブジェクトを`XPathNavigator`オブジェクトに変換することができます。</span>

```powershell
PS C:\work> $MYXML = [xml](Get-Content .\test.xml)
PS C:\work> $MYXNAVI = ${MYXML}.CreateNavigator()
```

これ何かというと、XPathExpressionクラスが提供するXPath式という表記方法と併用することで、XML文書をパス区切りのディレクトリのような木構造として扱えるオブジェクトです。

基本的な使い方は、`XPathNavigator`クラスの持つ`Select()`メソッドにてXPath式を記述し、XML文書を検索していきます。XPath式の基本的な書き方は[MS公式のここ](https://msdn.microsoft.com/ja-jp/library/ms256086(v=vs.120).aspx)を見れば大体書いてあります。

### 例1.OS要素の子要素のうち、distributorがMicrosoftの全要素を出力する

こんな感じ。

```powershell
PS C:\work> ${MYXNAVI}.Select("/OS/*[@distributor = 'Microsoft']")

NameTable : System.Xml.NameTable
NodeType : Element
LocalName : Windows
NamespaceURI :
Name : Windows
Prefix :
Value : Windows10
BaseURI :
IsEmptyElement : False
XmlLang :
UnderlyingObject : Windows
HasAttributes : True
HasChildren : True
SchemaInfo : System.Xml.XmlName
CanEdit : True
IsNode : True
XmlType :
TypedValue : Windows10
ValueType : System.String
ValueAsBoolean :
ValueAsDateTime :
ValueAsDouble :
ValueAsInt :
ValueAsLong :
OuterXml : <Windows distributor="Microsoft">Windows10</Windows>
InnerXml : Windows10
```

オブジェクトなのでいろんな情報がひっついてきます。コンテンツだけでよければ、Select()した結果の.Valueプロパティを取得すればOK。

```powershell
PS C:\work> ${MYXNAVI}.Select("/OS/*[@distributor = 'Microsoft']").Value
Windows10
```

### 例2.desktopmanager属性がGNOMEである要素のdistributor属性を出力する

こんな感じ。2つ目のスラッシュ区切りの部分は、全て(*)の要素から角括弧でくくった部分で属性条件を指定して要素集合(属性、コンテンツを含む)を絞りこむという意味。その絞り込んだ結果のdistributor属性を表示しています。

```powershell
PS C:\work> ${MYXNAVI}.Select("/OS/*[@desktopmanager = 'GNOME']/@distributor").Value
Red Hat
```

## 使用例

成果物です。何かっつうとNmapの-oXオプションが吐くXMLファイルから各スキャン(UDP、Connect、サービススキャン、etc)にかかった時間を出力するスクリプト。GitHub始めました。

<https://github.com/uda-cha/CalcTimeNmapXML>

おわり。
