---
title: Linuxで指定時間内にログに特定の文字列が現れるかどうかをコマンドで監視する(ReadyMediaのDB更新バッチ)
author: seroto_nin
type: post
date: 2019-06-17T14:35:36+00:00
url: /archives/754
categories:
  - Linux
  - ReadyMedia(MiniDLNA)

---
# {{this.$page.frontmatter.title}}

以下の記事にReadyMediaでミュージックストリーミングサーバを構築する手順を書きました。ReadyMediaは、新しい音楽を新規追加してもサムネイルが自動登録されません。追加の都度DBの更新が必要になります。それをバッチ化したのでメモ。ログを監視してシェルスクリプトによる非同期処理の待ち合わせを行っています。

[CentOS7でReadyMedia(MiniDLNA)を使ってDLNAミュージックストリーミングサーバを作る](https://www.serotoninpower.club/archives/440)

<!--more-->

## ReadyMediaの仕様

* ReadyMediaのサムネイル更新にはDBの再作成が必要
* DBの再作成は`minidlnad -R`コマンドで行える
* `minidlnad -R`コマンドは、通常のminidlnaサーバプロセスとして起動してDBの強制再作成を行う。強制再作成終了後も、minidlnaサーバプロセスとして常駐し続ける
* `minidlnad -R`コマンドで常駐するサーバプロセスはリッスンポートをバインドする
* `systemctl start minidlna`で起動するReadyMediaサーバプロセスは、`/usr/sbin/minidlnad -S`から起動される。このコマンドも当然リッスンポートをバインドする

つまり`systemctl stop minidlna`で一旦稼働中のReadyMediaプロセスを落としてから`minidlnad -R`でDBの再作成を行い、再作成が終わったらそのプロセスを落として、`systemctl start minidlna`で再度起動してあげる必要があります。

## ReadyMediaのDB再作成の終了をどうやって検知するか

普通のアプリケーションだと、DBの再作成プロセスはDBの再作成が終わったら勝手に落ちてくれることが多いのかと思いますが、ReadyMediaはそうではありません。なので、ログを監視してDBの再作成が終わった段階でそのプロセスを強制的に殺すようにします。

## ReadyMediaのDB更新時のログの内容

ReadyMediaのプロセスが一切起動していない状態で、`minidlnad -R`コマンドを打つとこんなログが出ます。

```bash
[2019/06/15 06:49:03] minidlna.c:1022: warn: Starting MiniDLNA version 1.1.6.
[2019/06/15 06:49:03] minidlna.c:331: warn: Creating new database at /var/cache/minidlna/files.db
[2019/06/15 06:49:03] minidlna.c:1062: warn: HTTP listening on port 8200
[2019/06/15 06:49:03] scanner.c:727: warn: /home/samba/share/02_voice を検索中
[2019/06/15 06:49:21] scanner.c:816: warn: /home/samba/share/02_voice (1811 ファイル) の検索終了!
[2019/06/15 06:49:21] playlist.c:125: warn: Parsing playlists...
[2019/06/15 06:49:21] playlist.c:259: warn: Finished parsing playlists.
[2019/06/15 06:49:21] inotify.c:199: warn: WARNING: Inotify max_user_watches [8192] is low or close to the number of used watches [260] and I do not have permission to increase this limit.  Please do so manually by writing a higher value into /proc/sys/fs/inotify/max_user_watches.
```

以下のような流れになっています。

* サーバプロセスとして起動
* DBの更新を開始
* 8200/tcpにバインド
* DB更新のためにメディアが置いてあるディレクトリを検索開始
* 検索終了
* プレイリストの処理
* etc...(inotyfyの監視ファイル数の上限が足りていないという警告は今回置いておきます)

検索が終了した際に`scanner.c:816: warn: <メディアディレクトリのパス> (<検索したファイル数> ファイル) の検索終了!`というワードが出るので、これを検知したタイミングでプロセスを殺してやればいいですね。

## 作成したDB更新バッチの内容

こんなのを作りました。一般ユーザとしてこのシェルスクリプトを起動します。その実行ユーザには下記バッチで実行するコマンドのみパスワードなしでsudoできる権限を`/etc/sudoers/`にて付与しています。

`!/bin/sh -xe`でエラー時にバッチを即終了させるという設定にします。ReadyMediaのDBを`sudo -u minidlna minidlnad -R`で更新します。その後、`timeout`コマンドの部分でログを監視し、｢検索終了!｣という文字列がログに出てきたら正常終了(ステータスコード0)として次の行に進み、ReadyMediaのプロセスをいったん全部殺してから`systemclt start minidlna`でReadyMediaをsytemd経由で起動します。

```bash
#!/bin/sh -xe

sudo /bin/systemctl stop minidlna

sudo -u minidlna minidlnad -R
timeout 300s tail -n 0 -F /var/log/minidlna/minidlna.log | grep -m 1 --line-buffered '検索終了!'

sudo /bin/killall minidlnad
sleep 3
sudo /bin/systemctl start minidlna
```

`timeout 300s tail -n 0 -F /var/log/minidlna/minidlna.log | grep -m 1 --line-buffered '検索終了!`がミソです。ここでステータスコード0以外のコードが返ってくるとこのバッチは即終了しますが、ReadyMediaは幸か不幸か`-R`オプションでサーバプロセスとしても稼働しているため、サービス自体は継続可能です(たまたまそうなっただけですが)。

## timeout & tail & grepで指定時間内にログに特定の文字列が現れるかを監視する

以下、それぞれのコマンドの意味です。

### timeoutコマンド

タイムリミットを設けてコマンドを実行するコマンドです。何らかの理由でDB更新が完了せず、永遠にログを監視し続けてしまうことを防ぎます。

タイムリミット中にコマンドが完了しなかったら、ステータスコード124を返して実行したコマンドのプロセスにSIGTERMを送ります。SIGTERMでプロセスを殺せなかったら、SIGKILLを送ります。ステータスコードは128+9で137になります。タイムリミット中にコマンドが完了した場合、ステータスコードは実行したコマンド自身のステータスコードを継承して返します。

### tail -n 0 -Fコマンド

おなじみtailコマンド。

`-n`オプションは、おなじみファイルの末尾何行を表示するかを指定するオプションです。このオプションを0行として、`-f`もしくは`-F`オプションと組み合わせると、そのファイルの監視を開始してから新しい行が末尾に追加されるとそれを表示する、という動作をします。追加されない限りは何も表示されません(0行なので)。

`-F`オプションは、おなじみファイルを監視し続ける`-f`オプションとほぼ一緒ですが、ログローテート等なんらかの原因でinodeが変わった際に、それを検知して同名のファイル(新しいinode)を開きなおす、という動作をします。`-f`オプションだと、ログローテートでログファイルがリネーム(e.g. `access_log` -> `access_log-20190617`)されても、旧inodeのファイル(e.g. `access_log-20190617`)を監視し続けます。

### grep -m 1 &#8211;line-bufferedコマンド

こちらもおなじみgrepコマンド。

`-m`オプションは、指定の行数だけマッチしたらファイル/標準入力からの読み込みを終了するというオプションです、と[manには書いてある][1]んですが、私が動作検証したところ、｢指定の行数だけマッチした後に、何らかの行が入力されると読み込みを終了する｣という動作をしました。パイプだと違う挙動をするよって書いてあるからそれですかね(どう違うのかは書いていない……)。指定の行数にマッチさえしていれば、そのあとに何の行も入力されなくてもステータスコードは0になります。

`--line-buffered`オプションは、ストリーム全体をバッファするのではなく行単位でバッファをするオプションです。これをつけないとある程度まとまった行数、もしくはファイル全体に対してgrepがかけられるので、検索が遅延したりまったくひっかからなかったりします。

参考: <https://programming-place.net/ppp/contents/c/043.html>

---

## おまけ: パイプで連結したコマンドのステータスコードについて

`$?`だとパイプで連結された一番右側のコマンドのステータスコードしか取れません。パイプ前後のコマンド全てのステータスコードがとりたければ、`$PIPESTATUS`を使います。これは配列なので、複数パイプを使っている場合は`$PIPESTATUS[0]`や、`$PIPESTATUS[@]`という書き方ができます。動作検証の過程で覚えました。

今回の例で`$PIPESTATUS`を見ると面白かったので載せておきます。ちなみに`$PIPESTATUS`は拡張POSIXであり、bashやzshでしか使えません。

### grepで1行マッチした後にログファイルに何も書き込まれなかった場合

grepは`-m`オプションで指定の行マッチすればステータスコードは0です。ただし、先ほど述べたように、マッチした後に何らかの新しい行が入力されない限り、grepは検索をやめません。そのため、grepコマンドは正常終了、timeoutコマンドはタイムアウトのステータスコード124となります。

```bash
$ timeout 30s tail -n 0 -F test.txt | grep -m 1 --line-buffered 'aaa'
aaa #aaaにマッチしたが、そのあとに新しい行が入力されなかった
$ echo ${PIPESTATUS[@]}
124 0
```

### grepで1行マッチした後にログファイルに新しい行が書き込まれてgrepがその場で終了した場合

grepは正常終了しているのでステータスコード0です。timeoutコマンドは128+13で141というステータスコードになっています。シグナル13ってPIPE｢読みこまれないパイプへの書き込み｣なんですね。grepのプロセスが落ちたところにtailがパイプ経由で書き込もうとしてエラーで死んでる感じです。

```bash
$ timeout 30s tail -n 0 -F aaa | grep -m 1 --line-buffered 'aaa'
aaa #aaaにマッチした後に何らかの新しい行が入力された
$ echo ${PIPESTATUS[@]}
141 0
```

参考: <http://www.k-tanaka.net/unix/kill.php>

### grepがマッチしなかった場合

timeoutコマンドはタイムリミット内に完了しなかったためステータスコード124を、grepコマンドはtimeoutコマンドによりSIGTERMされたため128+15のステータスコードとなっています。

```bash
$ timeout 1s tail -n 0 -F aaa | grep -m 1 --line-buffered 'aaa'
Terminated
$ echo ${PIPESTATUS[@]}
124 143
```

以上。ちなみに、このバッチは今Jenkinsに仕込んで動かしています。おわり。

 [1]: https://www.gnu.org/software/grep/manual/html_node/General-Output-Control.html#index-_002d_002dmax_002dcount
