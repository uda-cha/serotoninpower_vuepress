---
title: Let’s Encryptで発行したSSL証明書の更新失敗(Google CTログエラー・20181201)
author: seroto_nin
type: post
date: 2018-12-01T17:08:30+00:00
url: /archives/520
categories:
  - Apache
  - セキュリティ

---
このブログのWebサーバにアクセスできない事象が発生していました。確認できたのは12月2日の0時くらいです。原因がわかったのでメモしておきます。

<!--more-->

## 障害の原因

このWebサーバの証明書は、毎月の1日と15日の午前4時に証明書を自動更新するバッチを入れています。

```bash
$ sudo crontab -e
SHELL=/bin/bash
PATH=/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:/usr/local/bin

(snip)
00 04 01,15 * * apachectl graceful-stop && certbot renew --force-renewal && apachectl start
(snip)
```

httpdを停止し、証明書を更新し、再度httpdを起動するという流れにしています。&&でつないでいるので、これらの日付近にWebサーバがこけていたら、大体証明書更新に失敗しており、後続のhttpdの起動が行われなかった、という可能性が高いです。&&にしないで、証明書更新に失敗してもhttpdの起動だけはしておく、としておくのが本来あるべきなのですが、証明書更新が失敗した際に気付けないので、こう実装した記憶があります。怠惰。ほんとは証明書更新失敗時にはメール通報等でわかるようにしておき、httpdの起動は証明書更新に成功しようが失敗しようが行うべきです。

実際にhttpdのログを確認したところ、4時に停止したっきりなのがわかりました。確実に証明書更新に失敗しています。証明書更新のログを確認します。

```bash
$ sudo view /var/log/letsencrypt/letsencrypt.log
(snip)

2018-12-01 04:00:22,600:DEBUG:acme.client:Sending GET request to https://acme-v02.api.letsencrypt.org/directory.
2018-12-01 04:00:22,699:INFO:requests.packages.urllib3.connectionpool:Starting new HTTPS connection (1): acme-v02.api.letsencrypt.org
2018-12-01 04:00:23,109:DEBUG:requests.packages.urllib3.connectionpool:"GET /directory HTTP/1.1" 503 178
2018-12-01 04:00:23,113:DEBUG:acme.client:Received response:
HTTP 503
content-length: 178
expires: Fri, 30 Nov 2018 19:00:23 GMT
server: nginx
connection: keep-alive
etag: "5a590832-b2"
pragma: no-cache
cache-control: max-age=0, no-cache, no-store
date: Fri, 30 Nov 2018 19:00:23 GMT
content-type: application/problem+json

{
  "type": "urn:acme:error:serverInternal",
  "detail": "The service is down for maintenance or had an internal error. Check https://letsencrypt.status.io/ for more details."
}

2018-12-01 04:00:23,113:WARNING:certbot.renewal:Attempting to renew cert (www.serotoninpower.club) from /etc/letsencrypt/renewal/www.serotoninpower.club.conf produced an unexpected error: u
rn:acme:error:serverInternal :: The server experienced an internal error :: The service is down for maintenance or had an internal error. Check https://letsencrypt.status.io/ for more detai
ls.. Skipping.
2018-12-01 04:00:23,347:DEBUG:certbot.renewal:Traceback was:
Traceback (most recent call last):
  File "/usr/lib/python2.7/site-packages/certbot/renewal.py", line 430, in handle_renewal_request
    main.renew_cert(lineage_config, plugins, renewal_candidate)
  File "/usr/lib/python2.7/site-packages/certbot/main.py", line 1195, in renew_cert
    le_client = _init_le_client(config, auth, installer)
  File "/usr/lib/python2.7/site-packages/certbot/main.py", line 648, in _init_le_client
    return client.Client(config, acc, authenticator, installer, acme=acme)
  File "/usr/lib/python2.7/site-packages/certbot/client.py", line 247, in __init__
    acme = acme_from_config_key(config, self.account.key, self.account.regr)
  File "/usr/lib/python2.7/site-packages/certbot/client.py", line 50, in acme_from_config_key
    return acme_client.BackwardsCompatibleClientV2(net, key, config.server)
  File "/usr/lib/python2.7/site-packages/acme/client.py", line 761, in __init__
    directory = messages.Directory.from_json(net.get(server).json())
  File "/usr/lib/python2.7/site-packages/acme/client.py", line 1095, in get
    self._send_request('GET', url, **kwargs), content_type=content_type)
  File "/usr/lib/python2.7/site-packages/acme/client.py", line 997, in _check_response
    raise messages.Error.from_json(jobj)
Error: urn:acme:error:serverInternal :: The server experienced an internal error :: The service is down for maintenance or had an internal error. Check https://letsencrypt.status.io/ for more details.

2018-12-01 04:00:23,348:ERROR:certbot.renewal:All renewal attempts failed. The following certs could not be renewed:
2018-12-01 04:00:23,348:ERROR:certbot.renewal:  /etc/letsencrypt/live/www.serotoninpower.club/fullchain.pem (failure)
2018-12-01 04:00:23,350:DEBUG:certbot.log:Exiting abnormally:
Traceback (most recent call last):
  File "/bin/certbot", line 9, in &lt;module&gt;
    load_entry_point('certbot==0.27.1', 'console_scripts', 'certbot')()
  File "/usr/lib/python2.7/site-packages/certbot/main.py", line 1364, in main
    return config.func(config, plugins)
  File "/usr/lib/python2.7/site-packages/certbot/main.py", line 1276, in renew
    renewal.handle_renewal_request(config)
  File "/usr/lib/python2.7/site-packages/certbot/renewal.py", line 455, in handle_renewal_request
    len(renew_failures), len(parse_failures)))
Error: 1 renew failure(s), 0 parse failure(s)
(snip)
```

`Let’s Encrypt`は、certbotコマンドを打つことで`Let’s Encrypt`のAPIサーバと通信し、証明書を更新する仕組みですが、APIサーバとの通信で503エラーが返ってきたと書いています。なので、`Let’s Encrypt`の障害情報を確認します。

<https://letsencrypt.status.io/pages/history/55957a99e800baa4470002da>

詳しいことは報告されていませんが、UTCで11月30日の18時50分、つまりJSTで12月1日の3時50分に、GoogleのCTログからエラーが返ってきており、それによりAPIサーバが証明書のユーザへの証明書発行を妨げていた、とあります。これが原因でしょう。

この障害はUTCで11月30日の20時16分、つまりJSTで12月1日の5時16分には復旧していたようです。なので、JSTの12月2日の1時16分に証明書更新コマンドを手打ちし、httpdを再起動して問題なくこのサーバを復旧させました。

## GoogleのCTログのエラーとは

以下に説明があります。

<https://transparencyreport.google.com/https/certificates?hl=ja>

ざっくり言うと、SSL証明書は、CAという信頼できる団体が発行し、発行されたサーバが確実にそのサーバであることをクライアントに証明するものです。詳しくは[以前の記事][1]にまとめてあります。近年、信頼できるはずのCAの信頼性が怪しいということで、GoogleさんがCAを監視しているようで、その監視結果の健全なCAリストがCTログだそうです。へー。このログに載っていないCAから発行された証明書の場合、Chromeクライアントからアクセスした際に警告を出すそうです。他ブラウザはどうなんでしょうね。

ここからは推測込みになりますが、`Let’s Encrypt`へのGoogleのCT監視がうまくいっておらず、`Let’s Encrypt`のAPIサーバがGoogleのCTログから`Let’s Encrypt`のCAの記載を確認できなかったため、APIサーバが証明書を発行｢しなかった｣ことが原因のようですね。CTログがどうであろうと、原理上証明書の発行自体は｢できる｣はずですが、それはAPIサーバの実装上、Googleさんにきちんとお伺いを立ててから証明書を発行する流れになっていたからなんだと思います。

このブログは趣味でやっているので多少落ちてもどうってことないですが、証明書の入れ替えなど、通信に関わる部分はきちんと運用含め設計しないとだめですね。cronで&&でつなぐ密結合なんて絶対にやってはいけない。近いうちに直しておきます。いい勉強になりました。以上。

 [1]: https://www.serotoninpower.club/archives/360
