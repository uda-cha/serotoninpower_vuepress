---
title: Powershellでパスを変数に格納したプログラムの実行
author: seroto_nin
type: post
date: 2018-01-20T06:15:27+00:00
url: /archives/355
categories:
  - PowerShell

---
複数のflacファイルにアートワークを埋め込む作業をmetaflacとPowershellでやってたんですが、Poweshellのスクリプト文中でパスを変数に格納したプログラムを実行しようとした際にはまりました。<!--more-->

## 結論

Invoke-Expressionコマンド使おうね。

## やりたいこと

パスの通っていないプログラムを実行するために、スクリプト中で絶対パスを指定したかった。具体的には以下のコマンド。

```powershell
C:\path\to\metaflac.exe --import-picture-from="||||${l}\${MYCOVER}" "${l}\*.flac"
```

フルパスをハードコーディングなんてしたくないので、まず以下のように変数に置き換えてみた。

```powershell
$PATHTOMETAFLAC = "C:\path\to"
${PATHTOMETAFLAC}\metaflac.exe --import-picture-from="||||${l}\${MYCOVER}" "${l}\*.flac"
```

するとこんな構文エラーが。

```powershell
発生場所 C:\test\20180119_import_picture_to_frac.ps1:33 文字:22
+ ${PATHTOMETAFLAC}\metaflac.exe --import-picture-from="||||${l}\${ ...
+ ~~~~~~~~~~~~~
式またはステートメントのトークン '\metaflac.exe' を使用できません。
 + CategoryInfo : ParserError: (:) [], ParentContainsErrorRecordException
 + FullyQualifiedErrorId : UnexpectedToken
 ```

パスがうまく結合できてないんだろうと考え、metaflac.exeも含めて変数に格納してみる。

```powershell
$PATHTOMETAFLAC = "C:\path\to\metaflac.exe"
${PATHTOMETAFLAC} --import-picture-from="||||${l}\${MYCOVER}" "${l}\*.flac"
```

するとまた構文エラー。コマンド名を変数に格納すると、Powershellがそれをコマンドだと認識できず、引数やオプションをうまくコマンドに引き渡せない。

```powershell
発生場所 C:\test\20180119_import_picture_to_frac.ps1:38 文字:22
+ ${PATHTOMETAFLAC} --import-picture-from=`"||||${l}\${MYCOVER}`" `"${ ...
+ ~~~~~~~~~~~~~~~~~~~~~~
式またはステートメントのトークン 'import-picture-from=`"' を使用できません。
発生場所 C:\test\20180119_import_picture_to_frac.ps1:38 文字:44
+ ${PATHTOMETAFLAC} --import-picture-from=`"||||${l}\${MYCOVER}`" `"${ ...
+ ~~
トークン '||' は、このバージョンでは有効なステートメント区切りではありません。
発生場所 C:\test\20180119_import_picture_to_frac.ps1:38 文字:46
+ ${PATHTOMETAFLAC} --import-picture-from=`"||||${l}\${MYCOVER}`" `"${ ...
+ ~
空のパイプ要素は許可されていません。
発生場所 C:\test\20180119_import_picture_to_frac.ps1:38 文字:46
+ ${PATHTOMETAFLAC} --import-picture-from=`"||||${l}\${MYCOVER}`" `"${ ...
+ ~~
トークン '||' は、このバージョンでは有効なステートメント区切りではありません。
発生場所 C:\test\20180119_import_picture_to_frac.ps1:38 文字:48
+ ${PATHTOMETAFLAC} --import-picture-from=`"||||${l}\${MYCOVER}`" `"${ ...
+ ~~~~
式は、パイプラインの最初の要素としてのみ許可されます。
発生場所 C:\test\20180119_import_picture_to_frac.ps1:38 文字:52
+ ... PATHTOMETAFLAC} --import-picture-from=`"||||${l}\${MYCOVER}`" `"${l}\ ...
+ ~~~~~~~~~~~~~
式またはステートメントのトークン '\${MYCOVER}`"' を使用できません。
 + CategoryInfo : ParserError: (:) [], ParentContainsErrorRecordException
 + FullyQualifiedErrorId : UnexpectedToken
```

じゃあ変数に格納したコマンドってどう実行するの？　って調べたところ、Invoke-ExpressionというPowershellからスクリプトを実行するPowershellコマンドがあるとのこと。コマンドと引数/オプションをそれぞれ変数に入れ、それらを結合して別変数に入れ、その別変数をInvoke-Expressionで実行することで解決しました。引数/オプション前にスペースを入れることと、変数中のダブルクオーテーションをエスケープすることを忘れずに。

```powershell
${PATHTOMETAFLAC} = "C:\path\to\metaflac.exe"
${MYMETAFLACARGS} = " --import-picture-from=`"||||${l}\${MYCOVER}`" `"${l}\*.flac`""
${MYCMD} = ${PATHTOMETAFLAC} + ${MYMETAFLACARGS}
Invoke-Expression ${MYCMD}
```

Linuxのシェルと比べてPowershellはやっぱりめんどくさい。使いこなせばいろんなことできるんだろうけど。

## おまけ。`import_picture_to_frac.ps1`

```powershell
#作業ディレクトリ以下にあるファイル一覧を格納
$FILE = Get-ChildItem -include *.flac -Recurse
#metaflac.exeの絶対パス指定
$PATHTOMETAFLAC = "E:\tools\flacdrop\metaflac.exe"


#flacファイルが一つもないときのメッセージ
if ( ${FILE}.count -eq 0 )
  {
  Write-host "There was no flac file."
  Read-Host  "Please press the enter key..."
  exit
  }

Write-host "Importing picture to flacs..."
foreach ( $l in ${FILE} )
  {
  
  #flacファイルの同ディレクトリにあるcover.*ファイルの名前をフルパスで格納
  $MYCOVER = ( Get-ChildItem ( ${l}.DirectoryName + "\*.*" ) -include cover.* ).FullName
  
  #cover.*ファイルが一つのみなら処理開始
  if ( ${MYCOVER}.Count -eq 1 )
    {
    #metaflac.exeに引き渡す引数とオプション指定。冒頭のスペース忘れずに
    $MYMETAFLACARGS = " --import-picture-from=`"||||${MYCOVER}`" `"${l}`""
    #metaflacのコマンドと引数/オプションを結合
    $MYCMD = ${PATHTOMETAFLAC} + ${MYMETAFLACARGS}
    #metaflacを利用して画像を埋め込む
    Invoke-Expression ${MYCMD}

    #正常性確認
    if ( $LASTEXITCODE -eq 0)
      {
      Write-host "[INFO] : Done. ${l}"
      } else {
      Write-host "[ERROR] : Unknown failure to import picture. ${l}"
      }

    #cover.*ファイルがない場合
    } elseif ( ${MYCOVER}.Count -eq 0 ) {
    Write-host "[ERROR] : cover.* was not found in the same directory. ${l}"

    #cover.*ファイルが複数ある場合
    } else {
    Write-host "[ERROR] : Multiple cover.* in the same directory. Please place only one cover.*. ${l}"
    }
  
  }

Read-Host "Please press the enter key..."
```

おわり。
