---
title: Ansibleのuserモジュールでパスワードをソルト指定なしのpassword_hash()で生成すると毎回changedになる
author: seroto_nin
type: post
date: 2019-05-29T14:39:30+00:00
url: /archives/731
categories:
  - Ansible
  - Linux

---
# {{this.$page.frontmatter.title}}

掲題の通り。恥ずかしながらソルトという概念を知らずにべき等性の闇に飲まれてはまったのでメモ。

<!--more-->

こんなRoleがあったとします。

* tasks/main.yml

```yaml
---
- name: add the user 'jenkins'
  user:
    name: jenkins
    group: jenkins
    shell: /bin/bash
    password: "{{ vaulted_passwd }}"
    state: present
...
```

* vars/main.yml(実際はこのファイルにansible-vaultを書けてファイルごと暗号化しています)

```yaml
---
vaulted_passwd: "{{ 'thisispassword' | password_hash('sha512') }}"
...
```

[Ansibleのuserモジュールの公式doc][1]にもある通り、userモジュールでパスワードを指定する際は、パスワードを平文ではなくハッシュ(`“crypted value”`)化して記載します。これまで公式doc見て何も疑問を持たず脳死でこれやってた。

んで今日気付いたのですが、このRoleをansible-playbookでかけると毎回changedになります。でも普通に同じユーザ名/パスワードでログインはできる。おかしいなと思ったら、password_hash()でソルトの指定をしていなかったからなんですね。

Unix系のパスワード管理には/etc/shadowというファイルが利用されます。このファイルは、ユーザ名とハッシュアルゴリズム、ソルト、ソルトとパスワードを組み合わせてからハッシュ関数をかけたものが使用されます。Ansibleはこの/etc/shadowを直接操作するため、ソルトを指定してあげないと実行のたびにハッシュ値が変わり、/etc/shadowが変更されるのでchangedになるのですね。

参考：

[【CentOS】/etc/shadowのハッシュ化パスワードについて - よくわからないエンジニア](https://www.unknownengineer.net/entry/2017/08/16/184537)

[Linux の UNIX パスワード認証について調べた - CUBE SUGAR CONTAINER](https://blog.amedama.jp/entry/linux-shadow-passwd)

vars/main.ymlでpassword_hashフィルタをかけるときにソルトを指定してやることで、changedが出なくなる。[Ansible公式doc][2]にやり方自体は書いてありました。当時はきちんとこれを読んでからRoleを作った作ったはずなのですが、知らない単語｢salt｣を脳内フィルタかけて読み飛ばしていたみたいですね……

* vars/main.yml

```yaml
---
vaulted_passwd: "{{ 'thisispassword' | password_hash('sha512', 'thisissalt') }}"
...
```

本当に恥の多い人生を送っています。

 [1]: https://docs.ansible.com/ansible/latest/modules/user_module.html
 [2]: https://docs.ansible.com/ansible/latest/user_guide/playbooks_filters.html#hashing-filters
