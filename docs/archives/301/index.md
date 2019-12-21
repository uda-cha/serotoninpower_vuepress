---
title: ファイル名、フォルダ名に含まれる空白文字をPowerShellで一括置換
description: "自宅でちょっと凝ったことや大量のデータ処理をしたいときはLinux使えばらくちんなんですが、仕事で使う端末はWindowsなのでこちらも勉強しとかないとなぁと思ってちょっとずつやってます。今回はPowerShellでファイル名やフォルダ名に含まれる憎き空白文字を一括で全部アンダーバーに置換します。"
author: seroto_nin
type: post
date: 2017-12-09T06:00:36+00:00
url: /archives/301
categories:
  - PowerShell
  - Windows

---
# {{this.$page.frontmatter.title}}

<CategoriesAndDate/>

{{this.$page.frontmatter.description}}

<!--more-->

## space\_to\_underbar.ps1

```powershell
$mygl=(Get-Location).Path
Write-Output ${mygl} 以下の全てのディレクトリ名、ファイル名に含まれる空白文字を半角アンダーバーに置換します。
$input=Read-Host "よろしいですか？[Y/n]"
if ($input -eq "Y") {
  Get-ChildItem -Recurse | Rename-Item -NewName { $_.Name -replace '\s','_' }
  Read-Host "終了するにはEnterキーを押して下さい..."
  }
```

この内容で.ps1ファイルを作って、名前を変換したいファイルやフォルダが存在するフォルダと同じフォルダにこの.ps1ファイルを配置して実行すると、そのフォルダ以下に含まれるファイル名やフォルダ名に含まれる空白文字をすべてアンダーバーに変換します。

ちなみにWindowsはProgram Filesなどシステムフォルダにもいまだに空白を利用するアホな構造になっています。そのため例えばCドライブ直下でこのスクリプトを実行するとWindowsがお亡くなりになります。なので申し訳程度の警告を出すようにしました。

単純なコマンドの羅列でCUIを扱えるLinuxからITに入った身として、PowerShellはオブジェクトを扱うシェルだってことに非常に違和感があります。きちんと勉強して使いこなして面倒な単純作業を楽にしたい。
