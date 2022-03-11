---
title: 'How to Monitor Python/Django Applications in Real Time with InfluxDB'
description: 'Collecting real time application metrics is made easy with a timeseries database like InfluxDB.'
categories: ['Monitoring', 'Databases']
tags: ['InfluxDB', 'Python', 'Django']
date: 2022-03-10T16:11:00-05:00
draft: true
---

## Requirements

Setting up an InfluxDB deployment is out of the scope of this guide, but you can check out my how-to here [link].

The quickest way to get up and running is to [sign up for a free account](https://cloud2.influxdata.com/signup) with InfluxData. They offer a limited but very useful free cloud tier of InfluxDB.

\Note: InfluxDB Versions

> This guide is for **Influxdb v2.0**, _not_ an older version like v1.6. The query language (Flux) and infrastructure changed significantly, along with the Python client.

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
