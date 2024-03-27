---
title: "Low Latency C++ for HFT - Part 1"
description: "The first in a series documenting my learning ventures in developing low-latency, performant C++ for High Frequency Trading"
categories: ['C++', 'Finance']
tags: ['C++', 'Low Latency', 'HFT', 'Finance', 'Compiler Optimization']
type: 'blog'
date: 2024-02-12T16:37:11-04:00
draft: true
---

## The goal - learning outcomes

The goal of this series is to gain further understanding of the C++ compiler, its idiosyncracies, and ultimately grow my expertise with the language. 

Throughout this series, I'll be **standing on the shoulders of giants.**

HFT is a fairly mature field, so the plan is to learn from experts in the field, supplementing their teachings with my own experiments and investigation along the way, documented here. 

\Primary reference material chosen

> I have chosen the text **[_Building Low Latency Applications with C++_](https://www.packtpub.com/product/building-low-latency-applications-with-c/9781837639359)**, by **_Sourav Ghosh_** _(Packt Publishing, 2023)_ as the primary reference of choice -- though you will see more references appear throughout as the series progresses. 


Not only does the author describe generic techniques for low-latency systems in C++, but their particular field of interest is in High Frequency Trading. Perfect!  

We'll be building an HFT system along with the book, diving deep into supplemental learning material as needed, along the way.

## HFT - the most brief of introductions

C++ evolves at a blistering pace, and the world of high frequency trading is constantly pushing the boundary of what the language and advances in computing hardware can achieve. It seems



The goal is to gain knowledge of the market systems that are powering our global financial economy, and a breadth of experience developing lower-level computer systems with C++. 

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
