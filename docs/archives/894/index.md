---
title: 'CpawCTF Level 2 writeup'
description: "そうだCTFやろうと思って、CpawCTFという練習サイトの問題を解いたのでwriteupします。"
author: seroto_nin
type: post
date: 2021-05-09T12:37:46+09:00
url: /archives/894
categories:
  - CTF
---

# {{this.$page.frontmatter.title}}

<Date/><CategoriesPerPost/>

{{this.$page.frontmatter.description}}

<!--more-->

CpawCTFのサイトは[こちら](https://ctf.cpaw.site/index.php)。

## Q13.[Stego]隠されたフラグ

初めは問題文からするにステガノグラフィかなと思いました。

[青い空を見上げればいつもそこに白い猫](https://digitaltravesia.jp/usamimihurricane/webhelp/_RESOURCE/MenuItem/another/anotherAoZoraSiroNeko.html)でいろいろ画像をいじったのですが何も見当たらなかった。

悩んだのですが、

> 目を凝らして画像を見てみると、すみっこに何かが…!!!!

このすみっこにある記号たち、上か下かの二種類しか配置場所がなく、かつ上が必ず横長の棒で、下が必ず点でした。

モールス信号かなと思い、モールス信号変換サイトに打ち込んでみたらフラグらしき文章が現れました。

## Q15.[Web] Redirect

> 果たしてリダイレクトはどのようにされているのだろうか…

という問題文だったので、HTTPヘッダを見る。

```sh
curl -I http://q15.ctf.cpaw.site
```

普通に`302 Found`の`Location`ヘッダでのリダイレクトでした。

HTTPヘッダに`X-Flag`というヘッダがあり、この値がフラグ。

## Q16.[Network+Forensic]HTTP Traffic

WireSharkでpcapファイルを開く。

ファイル => オブジェクトをエクスポート => HTTP => 全て保存

htmlファイルに拡張子をつけ、js/css/imgのディレクトリ構造を、htmlファイルに記載の内容から整え、ブラウザで開く

## Q17.[Recon]Who am I ?

ツイッターで検索したらゲーム画面のスクショが出てきたので、ツイートの内容と画像の内容を照らし合わせる。

## Q18.[Forensic]leaf in forest

拡張子がないのでなんのファイルかなというところから。

```sh
$ file misc100
misc100: tcpdump capture file (little-endian) - version 0.0, capture length 1869357413)
```

パケットキャプチャファイルらしいのですが、WireSharkでもtcpdumpでも開けない。

`strings`コマンドで可読部分をとりあえず見てみようと思ったら、大量の、、、

> `lovelive!lovelive!lovelive!lovelive!lovelive!lovelive!lovelive!`

問題文が`leaf in forest`なので、forestたる`lovelive!`を取り除いてみると、フラグらしきものが出てくる。

```sh
strings misc100 | sed -e 's/[lovelive!]//g'
```

## Q19.[Misc]Image!

```sh
$ file misc100.zip
misc100.zip: OpenDocument Drawing
```

`OpenDocument Drawing`ってなんぞと思ってググると、`*.odg`なる拡張子がつくお絵かきファイルのようでした。

ちゃんとやるならLibreOfficeとかインストールして、拡張子を`.zip`から`.odg`に変更してみればいいのですが、`.otd`に変換するとMicrosoft Wordでも見れました。

## Q20.[Crypto]Block Cipher

C言語のソースコードが与えられます。

`main`関数は、引数を二つとるようです。一つ目が暗号文、二つ目が数字です。

暗号文の文字列を、引数で与えられた数字ぶん転置する転置暗号(`Block Cipher`)のようです。

とりあえずコンパイルした上で、暗号文は問題で与えられているので、数字をいくつかでたらめに入れてみます。

```sh
$ gcc crypto100.c
$ ./a.out ruoYced_ehpigniriks_i_llrg_stae 1
$ ./a.out ruoYced_ehpigniriks_i_llrg_stae 2
$ ./a.out ruoYced_ehpigniriks_i_llrg_stae 3
$ ./a.out ruoYced_ehpigniriks_i_llrg_stae 4
```

4番目で意味を成す文字列が出てきて、これがフラグ。

後から思えば、大文字`Y`の場所に着目してはじめから4を入れればよかった。

## Q21.[Reversing]reversing easy!

```sh
$ file rev100
rev100: ELF 32-bit LSB executable, Intel 80386, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux.so.2, for GNU/Linux 2.6.24, BuildID[sha1]=f94360edd84a940de2b74007d4289705601d618d, not stripped
```

実行ファイルらしいので、とりあえず`strings`で中身を見てみると、フラグを示す`cpaw`なる文字列に続いて答えらしきものが見えます。

が、変換処理とかあるかもしれないので、`radare2`でもうちょっとちゃんと見ます。

```Sh
$ radare2 rev100
[0x080483a0]> aaa
[0x080483a0]> afl # main関数が見つかる
[0x080483a0]> s main
[0x0804849d]> pdc # 逆アセンブル
function main () {
    //  7 basic blocks

    loc_0x804849d:

     //DATA XREF from 0x080483b7 (entry0)
       push ebp
       ebp = esp
       esp &= 0xfffffff0
       esp -= 0x50              //'P'
       eax = dword gs:[0x14]    //[0x14:4]=-1 ; 20
       dword [local_4ch] = eax
       eax = 0
       dword [local_46h] = 0x77617063 //[0x77617063:4]=-1
       word [local_4ah] = 0x7b  //'{' ; [0x7b:2]=0xffff ; 123
       dword [local_20h] = 0x79 //'y' ; [0x79:4]=-1 ; 121
       dword [local_24h] = 0x61 //'a' ; [0x61:4]=-1 ; 97
       dword [local_28h] = 0x6b //'k' ; [0x6b:4]=-1 ; 107
       dword [local_2ch] = 0x69 //'i' ; [0x69:4]=-1 ; 105
       dword [local_30h] = 0x6e //'n' ; [0x6e:4]=-1 ; 110
       dword [local_34h] = 0x69 //'i' ; [0x69:4]=-1 ; 105
       dword [local_38h] = 0x6b //'k' ; [0x6b:4]=-1 ; 107
       dword [local_3ch] = 0x75 //'u' ; [0x75:4]=-1 ; 117
       dword [local_40h] = 0x21 //'!' ; [0x21:4]=-1 ; 33
       word [local_15h] = 0xa7d //[0xa7d:2]=0xffff ; 2685
       byte [local_17h] = 0
       dword [local_1ch] = 5
       eax = dword [local_46h]  //0x46 ; 'F' ; 70 ; "cpaw{"
       dword [local_4h] = eax
       dword [esp] = 0x8048620  //[0x8048620:4]=0x7325
                                                                           
       int printf(const char * format : (*0x8048620)0x00177fa0 = %s)
       var = dword [local_1ch] - 5 //aeim.fd ; [0x5:4]=-1
       if (!var) goto 0x804855e //unlikely
       {
        loc_0x804855e:

         //JMP XREF from 0x08048536 (main)
           eax = dword [local_15h]  //0x15 ; 21
           dword [local_4h] = eax
           dword [esp] = 0x8048620  //[0x8048620:4]=0x7325
                                                                               
           int printf(const char * format : (*0x8048620)0x00178000 = %s)
           eax = 0
           edx = dword [local_4ch]  //[0x4c:4]=-1 ; 'L' ; 76
           edx ^= dword gs:[0x14]
           if (!var) goto 0x8048589 //unlikely
           {
            loc_0x8048589:

             //JMP XREF from 0x08048582 (main)
               leave                    //ebp ; "%s"
               return
            loc_0x8048584:

               void __stack_chk_fail(void) //sym.imp.__stack_chk_fail
                                        ; sym.imp.__stack_chk_fail ()
           } else {
           }
      }
      return;

}
```

、、、うん、変換処理はなさそうだな！(アセンブラ読めない)

バイナリ見るときはいつも`gdb`で見ていたのですが、逆アセンブルする場合、ASCII文字コードを文字に変換することができないっぽい(というかたぶん私が知らないだけ)です。

なんかいい方法ないかなと思って調べていたら、`radare2`という素敵なツールを見つけました。

## Q22.[Web]Baby's SQLi - Stage 1-

```sql
SELECT * FROM palloc_home;
```

## Q28.[Network] Can you login？

pcapファイルが渡されるので、WireSharkで開くと、平文のFTP通信が見えます。

接続先サーバ/ユーザ/パスワードがそのまま見えるので、それを使って実際にftpコマンドでサーバにログインします。

また、passiveモードへ変更している様子も見えることからわかるように、passiveモードでないと接続できないようです。

キャプチャによると、`dummy`というファイルをアップロードしているようなので、それをgetして中身を見てみると、

> `FLAG file exists in this directory.`

と書いてあるので、`ls -la`するとドットファイルが見つかります。この中身がフラグ。

## 所感

雰囲気で`gdb`使っていたので、この機会に`radare2`ちゃんと覚えたい。

