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

The goal of this series is to gain further understanding of the C++ compiler, its idiosyncracies, and ultimately grow my expertise with the language, while deepening understanding of some of the mechanisms that power our global financial markets.

Throughout this series, I'll be **standing on the shoulders of giants** as we build an HFT system from scratch, beginning with the basic building blocks to develop low latency systems from.

HFT is a fairly mature field, so the plan is to learn from experts in the field, supplementing their teachings with my own experiments and investigation along the way. I'll be documenting my journey here, complete with any mistakes, learning tangents and discoveries made along the way.

\Primary reference material chosen

> I have chosen the text **[_Building Low Latency Applications with C++_](https://www.packtpub.com/product/building-low-latency-applications-with-c/9781837639359)**, by **_Sourav Ghosh_** _(Packt Publishing, 2023)_ as the primary reference of choice -- though you will see more references appear throughout as the series progresses. 

Not only does the author describe generic techniques for low-latency systems in C++, but their particular field of interest is in High Frequency Trading. Perfect!  

## HFT - the most brief of introductions

C++ evolves at a blistering pace, and the world of high frequency trading is constantly pushing the boundary of what the language and advances in computing hardware can achieve. HFT is a bit of an _arms race_, that is -- the most profitable HFT algorithms tend to be the fastest. So, it's an interesting application of low latency development, where every bit of speed is important.

A common application of HFT is in profit-taking or market-making algorithms in equity markets. However, it should be noted that these techniques also apply equally well to domains such as risk and statistical analysis of common, everyday banking transactions, as well as to the pricing, and price feeds of assets on exchange systems. The faster (and more efficient) an exchange can serve its clients data at, the cheaper their costs, and the more profitable the exchange becomes for the people trading on their platform, for example.

## Just how fast is "low latency"?

For the majority of low latency C++ applications, we are measuring performance in `uS`, very often tens or hundreds of uS. Modern advances in FPGA-accelerated networking hardware has meant that HFT can now operate in the nanosecond (`nS`) realm, ie: sub 1uS. 

Does this mean C++ for HFT is dead? _No, not at all._. FPGAs are effectively programmable logic gates, and thus aren't generally carrying out complex application logic. Yes, they make the latency of trade executions or broadcasting to consumers incredibly fast (< 1uS), but so far, we still require something like C++ to carry out the majority of complex application logic surrounding the FPGA's lightning-fast but relatively simple algorithms. [David Gross' talk at _Meeting C++ 2022_ goes into detail about this @ 10:30](https://www.youtube.com/watch?v=8uAW5FQtcvE)

## Guiding principles

Chapters 1-3 (inclusive) of _Ghosh, S._ give a great overview of general concerns when developing low-latency C++ applications. 

The text then goes into detail regarding a number of C++ compiler features and how writing code in a different way can have a substantial effect on the performance of the real world machine code output by the compiler.

Here is my summary of these findings. We will no doubt revisit these topics as we encounter them in the project.


### Caching and memory access

Caching is **incredibly important** for low latency. Modern CPUs have multiple levels of cache after the main CPU register (L0, L1, L2, etc...) and the time to access each level of cache grows, the further you are away from the register. In a perfect world, our entire low latency application would run in the cache, and not have to go to the actual memory bus for anything.

Acceptable versus unacceptable application latency can sometimes hinge on packing data so that it fits the cache of the CPU better, or simply rearranging code so that the compiler packs functions and variables in a way that results in fewer cache misses.

In general, we want our data to be packed into **contiguous memory blocks** by the compiler, so data is less fragmented and benefits most from caching.

### Algorithms and data structures (DS)

Sometimes, the theoretically "better" data structure is not the most performant one in reality. 

> Take, for example, the `std::unordered_map`. This is implemented with a linked-list under the hood, which means it excels at random memory access. The theoretical average time complexity of accessing members in this DS is linear, which is nice, but in the context of low latency, random memory access means _memory fragmentation_ and more than likely poor cache performance. This turns out to be quite undesirable in practice, and a more simple data structure with contigious memory will wind up performing better.

### Compiler hints

The C++ compiler is an incredibly sophisticated piece of engineering with over 40 years of development worked into it. There are dozens of sophisticated techniques and multiple iterations carried out by the compiler to optimise code.

Despite this, there are times when large gains in latency performance can be made by providing hints to the compiler. Dozens of compiler optimisations are detailed in this chapter, but we will focus on the most strongly emphasised gains to be made and refer the curious reader to Chapter 3 of the text.

#### Branch prediction

Modern CPUs and the C++ compiler have sophisticated ways to try and guess at the most likely branch (if, else, or some other branching logic) a piece of software might take, but the enormous expense of getting branch prediction wrong is enough reason to spend the extra time providing hints to the compiler about which path your code might take. 

The author emphasises this with numerous examples of how the compiler tries to predict branches, and how costly it can be for the CPU to unwind the call stack and registers when it makes a mistake in branch prediction.

#### Code arrangement

Member and non-member functions and data members are generally arranged by the compiler in memory, in the order they are encountered during compilation.

This means that declaring functions and data variables next to each other that are most used is an ideal way to try and improve caching.

#### Compile-time vs. runtime

Broadly speaking, anything that can be evaluated during compile time instead of at runtime will likely help lower latency. `constexpr` evaluations and template metaprogramming can be helpful techniques. 

#### `inline` and `virtual` functions

Inline functions whenever possible. The compiler also tries to do this whenever it can when optimising.

In general, virtual functions should be avoided, and compile-time polymorphism should be preferred instead. This is because the compiler cannot infer which virtual function will be called at runtime (unless there is only one instance). Virtual functions come with added overhead and mean that the compiler cannot perform other valuable optimisations which depend on knowing which function is called at runtime, eg: inlining the function.

#### Dynamic memory allocation

Best avoided at all costs in LL applications. Leads to memory fragmentation, poor caching and is generally incredibly slow to allocate/deallocate. When absolutely required, a custom memory pool can be a good solution.

#### Multithreading

A common misconception is more threads means lower latency. In reality, more threads deliver more throughput, and concurrency. 

The cost of switching contexts, ie: locking a thread and switching to another one, can be costly enough that it is often best avoided in low latency applications. For this reason, a number of techniques are often used in LLCPP, including but not limited to --

- pinning threads to specific CPU cores
- avoiding locks and context switching altogether 
- developing custom thread pools and threading constructs especially for low latency





 

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
