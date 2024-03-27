---
title: "{{ replace .Name "-" " " | title }}"
description: ''
categories: ['category1', 'category2']
tags: ['tag1', 'tag2']
type: 'blog'
date: {{ .Date }}
draft: true
---

## First Heading After ToC

Do dee doo write some stuff here.

\This is how to make a Code block title

```bash
$ echo '#!/bin/sh' > my-script.sh
$ echo 'echo Hello World' >> my-script.sh
$ cat my-script.sh
echo Hello World
$ chmod 755 my-script.sh
$ ./my-script.sh Hello World

```

Images can be figures with captions and alt text, eg:
![An image alt text](./images/1.png 'A caption for an image/figure.')
