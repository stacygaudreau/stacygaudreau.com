---
title: "Low Latency C++ for HFT - Part 1 - Introduction"
description: "The first in a series documenting my learnings while developing a low-latency, performant C++ application for High Frequency Trading"
categories: ['Programming', 'C++']
tags: ['C++', 'Low Latency', 'HFT', 'Finance', 'Compiler Optimization']
type: 'blog'
date: 2024-02-12T16:37:11-04:00
draft: false
---

## The goal - learning outcomes

The goal of this series is to gain further understanding of the C++ compiler, its idiosyncracies, and ultimately grow my expertise with the language, while deepening understanding of some of the mechanisms that power our global financial markets.

Throughout this series, I'll be **standing on the shoulders of giants** as we build an HFT system from scratch, starting with the basic building blocks required to develop the majority of generic low latency systems from.

HFT is a fairly mature field, so the plan is to learn from experts in the field, supplementing their teachings with my own experiments and investigation along the way. I'll be documenting my journey here, complete with any mistakes, learning tangents and discoveries made along the way.

\Primary reference material, aka **"The Book"**

> The text **[_Building Low Latency Applications with C++_](https://www.packtpub.com/product/building-low-latency-applications-with-c/9781837639359)**, by **_Sourav Ghosh_** _(Packt Publishing, 2023)_ has been chosen as the primary reference of choice -- though you will see more references appear throughout as the series progresses. 
>
> (This text will at times be referred to as _The Book_ throughout this series, as a shorthand)

Not only does the author describe generic techniques for low-latency systems in C++, but their particular field of expertise is in High Frequency Trading. 

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

The C++ compiler is an incredibly sophisticated piece of engineering with over 40 years of development worked into it. The modern C++ compiler has many tricks up its sleeve, deploying vast array of techniques over multiple iterations in order to optimise code.

Despite this, there are times when sizeable gains in latency performance can be made by providing hints to the compiler or arranging code in a way that takes advantage of the compiler's idiosyncracies. Many compiler optimisation techniques are detailed in this chapter, so I'll summarise only a handful of the most important details here.

#### Branch prediction

Modern CPUs and the C++ compiler have sophisticated ways to try and predict the most likely branch (if, else, or some other logic) a piece of software might take, but the enormous expense of getting branch prediction wrong is enough reason to occasionally spend the extra time providing hints to the compiler about which path your code might take. 

The author emphasises this with numerous examples of how the compiler tries to predict branches, and how costly it can be for the CPU to unwind the call stack and registers when it makes a mistake in branch prediction.

\ Branch prediction attributes
> The author describes a GNU-compiler-specific way of using macros and directives to provide branch suggestions.
>
> Things are now easier and less compiler-specific, as `C++20` introduced a standardised way of describing branch hints to the compiler with the `[[likely]]` and `[[unlikely]]` attributes. 
> 
> _([More detail at cppreference.com](https://en.cppreference.com/w/cpp/language/attributes/likely))_

The GNU C++ compiler provided some non-standard ways of 

#### Code arrangement

Member and non-member functions, data members and variable instantiation are generally arranged by the compiler in memory, in the order they are encountered during compilation.

This means that declaring functions and data variables next to each other (in groups that are most used together) is an ideal way to try and improve caching.

#### Functions - `inline` and `virtual`

Functions should be `inline` whenever possible. The compiler will try to do this as much as possible when optimising.

In general, `virtual` functions should be avoided, and compile-time polymorphism should be preferred instead. 

This is because the compiler cannot infer which virtual function will be called at runtime (unless there is only one instance). Virtual functions come with added overhead and mean that the compiler cannot perform other valuable optimisations which depend on knowing which function is called at runtime, eg: inlining the function.

#### Dynamic memory allocation

Best avoided at all costs in LL applications. Leads to memory fragmentation, poor caching and is generally incredibly slow to allocate/deallocate. When absolutely required, a custom memory pool can be a good solution.

#### Multithreading

A common misconception is that adding more threads means lower latency. In reality, more threading will deliver more throughput, and concurrency. 

The cost of switching contexts, ie: locking a thread and switching to another one, can be costly enough that it is often best avoided in low latency applications. For this reason, a number of techniques are often used in LLCPP, including but not limited to

- Pinning threads to specific CPU cores
- Avoiding locks and context switching altogether 
- Developing custom thread pools and threading constructs especially for low latency

#### Compile-time vs. runtime

Broadly speaking, anything that can be evaluated during compile time instead of at runtime will likely help lower latency. `constexpr` evaluations and template metaprogramming can be helpful techniques. 

#### The CRTP (Curiously Recurring Template Pattern)

A template programming technique to achieve compile-time polymorphism. Essentially a drop-in replacement for a `virtual` function. 

\Replacing a virtual fn with equivalent use of the CRTP at compile-time

```cpp
// adapted from Chapter3/crtp.cpp of "The Book" by Ghosh, S.

#include <iostream>

class RuntimeBase {
public:
    virtual void place_order() {
        std::cout << "RuntimeBase::place_order()\n";
    }
};

class RuntimeImplementation: public RuntimeBase {
public:
    void place_order() override {
        std::cout << "RuntimeImplementation::place_order()\n";
    }
};

template<typename actual_type>
class CRTPBase {
public:
    void place_order() {
        static_cast<actual_type*>(this)->actual_place_order();
    }

    void actual_place_order() {
        std::cout << "CRTPBase::actual_place_order()\n";
    }
};

class CRTPImplementation: public CRTPBase<CRTPImplementation> {
public:
    void actual_place_order() {
        std::cout << "CRTPImplementation::actual_place_order()\n";
    }
};

int main() {
    // runtime polymorphism
    auto runtime_example = RuntimeImplementation{ };
    runtime_example.place_order();

    // compile-time polymorphism
    CRTPBase<CRTPImplementation> crtp_example;
    crtp_example.place_order();

    return 0;
}

/*
Output:

RuntimeImplementation::place_order()
CRTPImplementation::actual_place_order()

Process finished with exit code 0
*/
```

\ If you (like me) disassemble this example - beware, devirtualization!
> The performance gains to be had are not obvious until more than one implementation of the base class exists. This is because the compiler tries to infer (via a technique called `Devirtualization`) which virtual function(s) will be called at runtime. 
>
>With such a simple example, it is trivial for the compiler to determine that `RuntimeImplementation::place_order()` is the only instance of the virtual function called at runtime. The compiler then inlines the method, saving a `vtable` lookup and negating the extra overhead of calling a virtual function at runtime.

## Summary, and next time

In this first part, I've glossed over the basics of C++ programming for HFT and given a bird's eye view (my takeaway) of some of the low-hanging fruit to look out for when developing low latency systems with C++. This takeaway is after reading Chapters 1-3 of Sourav Ghosh's book **[_Building Low Latency Applications with C++_](https://www.packtpub.com/product/building-low-latency-applications-with-c/9781837639359)**, which I highly recommend to check out if you're interested in learning more.

#### In Part 2

We'll be starting to code along with the author and put together some of the basic building blocks for developing low latency systems with.



