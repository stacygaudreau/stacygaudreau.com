---
title: 'Low Latency C++ for HFT - Part 3 - Network Programming'
description: 'Low-latency TCP and UDP networking with Unix sockets'
categories: ['Programming', 'C++']
tags: ['C++', 'Networking', 'Sockets', 'Low Latency']
type: 'blog'
date: 2024-04-08T07:12:20-04:00
draft: true
---

## Introduction

This part is all about building some networking utilities for high performance, latency-sensitive application development in a Linux environment.

These networking components will be used later in the series to build a **high frequency trading system**.

The Unix socket API will be used to build a --

1. Module of **helper functions** for constructing and configuring low latency Unix sockets
2. **TCP socket** wrapper class
3. Low latency **TCP server** for handling numerous TCP connections
4. **UDP multicast socket** wrapper class

## References & source code

### Primary reference book

Along with the other articles in this series, I'm following along with the primary reference book we spoke about in Part 1 --

\ Building Low Latency Applications with C++ (Ghosh)

> Sourav Ghosh's book [Building Low Latency Applications with C++](https://www.packtpub.com/product/building-low-latency-applications-with-c/9781837639359) serves as the main reference for this project. Highly recommend to buy yourself a copy if you're interested in learning more about low latency C++!

### Source code

To keep things tidy, much of the source code is omitted in these articles. For a complete listing of all my code you can visit the [Git repository for this project.](https://github.com/stacygaudreau/nitek)

\ Note regarding source code

> All of the code shared is written by myself while learning from, experimenting with and extending the code found in Ghosh's text. You will find that my code contains many differences, but is based heavily on the author's design. You can find the [author's code here](https://github.com/PacktPublishing/Building-Low-Latency-Applications-with-CPP).

## 1 - Abstracting the Unix socket API

The first order of business is to build a collection of helper functions to easily and repeatably create and manage Unix sockets with. Our goal is to produce high performance sockets with an emphasis on low latency. This means that we'll be using (and perhaps _abusing_) some features of the socket API which are not default. It makes sense to build some reusable utilities to avoid having to repeat ourselves. Additionally,

### Creating Unix sockets

Each kind of Unix socket (not just network sockets!) is configured and managed using the same API. The socket's lifetime begins with a call to `socket()` and ends with freeing the socket's file descriptor (`fd`) with a call to `close()`. The function being built will effectively wrap the call to `socket()` and handle all the preceding logic to configure and instantiate TCP and UDP sockets for low latency networking.

#### Network programming resources

Some great resources to learn network programming in Linux exist already. Here are the favourites --

- [Unix Network Programming, Volume 1](http://www.unpbook.com/)
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/)
- [The Linux Programming Interface (ch. 56 to 61)](https://man7.org/tlpi/)

#### Socket creation function

Socket instantiation can be pretty verbose, so a utility function is constructed for easily creating TCP and UDP sockets with. A number of helper functions are called throughout which are explained in the next section.

The code is quite verbose and [so can be found here](https://github.com/stacygaudreau/nitek/blob/e0e7d30fbc9d806c998d4c7fec62728ba480aae8/source/llbase/sockets.h), in the `sockets.h` header file.

### Socket configuration

Before building up the TCP and UDP socket abstractions, some utility functions are created to manage setting options on a socket.

Setting socket options involves configuring flags on a file descriptor associated with the socket. This is done through the more generic `fnctl()` file control function as well as `setsockopt()`, depending on which option is being set. It's a simple API, but you do have to pass some esoterically named flags, so it's nice to have some convenient utility methods for setting common options with.

### Low-latency sockets

Some specific considerations are in order when minimising the latency of network sockets. Each concern is given its own convenient utility function to configure it, which are described next.

#### Sockets should be non-blocking

By default, Unix sockets are **blocking**. This means that calls to their communication methods (`send()`, `recv()` and similar) execute on the thread they are called on and only return once they're done working, much like any ordinary function call. Especially for TCP (where connections are stateful) a thread could be waiting in a socket communication function for a relatively long time (seconds, or even minutes) before hearing from its peer, or timing out in the case of a lost connection. Since the server will support many simultaneous connections, this is a problem.

It may seem obvious to solve this problem with multithreading, and, for many applications this could potentially be a fine solution. For reasons already discussed, **multithreading incurs a reasonable amount of latency overhead** in the form of context switching, and adds to program complexity. It also potentially reduces the determinism of an application's performance. For our needs, we're better off not using it for multiplexing low latency network sockets.

A good solution is to use **polling** to multiplex all of the connections on the server. If we were writing a cross-platform (Linux, Windows and other Unix derivatives) application, we would probably use something like `select()` since it has an equivalent API on both Unix and [Windows](https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-select).

##### Which polling method to use?

We of course do not care about Windows support. We also don't care about other Unix derivatives, since the resulting binary will be a _Linux_ server. This is important to note since there are a few different methods available to use, each with its own supported platforms, summarised below --

| Polling method | Socket API supported     |
| -------------- | ------------------------ |
| `select()`     | Winsock, Berkeley (Unix) |
| `poll()`       | Berkeley (Unix)          |
| `epoll()`      | Linux (only)             |

It turns out that there is an advantage to using `epoll()` instead of `poll()`. The latter is less efficient. Check out the [manpages](https://man7.org/linux/man-pages/man7/epoll.7.html) for `epoll()` to see how it works. The gist of it is that you register file descriptors to poll in one step, which the system later sends an event for whenever there is I/O waiting. The `poll()` function has more overhead in the form of an extra system call to the kernel each time it is called. Additionally, it **gets slower with each socket** that is polled, making it a less scalable solution.

\ A performance-focused non-blocking event library

> The open source [libevent](https://libevent.org/) library is focused on performance and deterministic low latency. A number of hugely popular software projects use it under the hood, eg: the Chromium browser.
>
> On the Linux platform, `epoll()` is used in this library to provide high performance socket polling.

##### Non-blocking function

The code to disable blocking on a socket is pretty straight forward. The more generic `fnctl()` function is used here, since blocking applies to other system constructs with file descriptors, and not just sockets.

\ `set_non_blocking()`

```cpp
/**
 * @brief Disable blocking on socket
 * @details The socket will return immediately from a call
 * to send(), recv() etc. instead of blocking and
 * waiting to finish when in non-blocking mode
 * @param fd Socket file descriptor
 * @return True when successful
 */
inline auto set_non_blocking(int fd) -> bool {
    // get flags for fd
    const auto flags = fcntl(fd, F_GETFL, 0);
    if (flags & O_NONBLOCK)
        return true;    // already in non-blocking mode
    // set flag to non-blocking
    return (fcntl(fd, F_SETFL, flags | O_NONBLOCK) != -1);
}
```

#### Reducing TCP packet delay

By default, network sockets come with [Nagle's algorithm](https://en.wikipedia.org/wiki/Nagle's_algorithm) enabled. The algorithm aims to reduce the number of small TCP packets emitted from a socket, at the expense of adding a small and (usually) negligible delay. We'll be using TCP to handle order requests and other client communication to and from the exchange, and it is imperative that latencies are as low as possible no matter the packet size, so it's best disabled.

##### Code to disable the algorithm

This option is socket specific. As such it's set using the `setsockopt()` function.

\ `set_no_delay()`

```cpp
/**
 * @brief Disable Nagle's Algorithm on the socket,
 * reducing latency by removing sent TCP packet delay
 */
inline auto set_no_delay(int fd) -> bool {
    int one{ 1 };
    return (setsockopt(fd, IPPROTO_TCP, TCP_NODELAY,
                       reinterpret_cast<void*>(&one),
                       sizeof(one)) != -1);
}
```

#### Software timestamps

There's not much point in trying to achieve imperceptibly small microsecond latencies if they cannot be measured. The Linux kernel [has a socket option](https://www.kernel.org/doc/html/next/networking/timestamping.html) to apply software timestamps to packets, and we'll enable it on our network sockets for measurement and debugging.

\ set_software_timestamps()

```cpp
/**
 * @brief Enable software timestamping on the
 * given socket file descriptor
 */
inline auto set_software_timestamps(int fd) -> bool {
    int one{ 1 };
    return (setsockopt(fd, SOL_SOCKET, SO_TIMESTAMP,
                       reinterpret_cast<void*>(&one),
                       sizeof(one)) != -1);
};
```

##### Hardware timestamps

Software timestamps are **not the most reliable** source of measurement when you're concerned with micro and potentially even nanosecond precision. The typical timekeeping oscillator on a computer motherboard is not designed to be the most accurate and stable clock device.

For precise and repeatable microsecond latency measurement, specialised network cards and other devices can be ordered with **hardware timestamping built in**.

##### Low-latency networking hardware

At the server level, [Solarflare's 8000 Series](https://www.xilinx.com/products/boards-and-kits/8000-series.html#specifications) networking cards -- in particular, the `PLUS` SKUs -- have a stable precision oscillator and the ability to tag incoming and outgoing ethernet frames with timestamps. The [SFN8522-PLUS](https://www.xilinx.com/content/dam/xilinx/publications/product-briefs/SFN8522-plus-product-brief.pdf) is a dual socket NIC with such features.

\ Kernel bypass networking cards

> The SFN8000 series is an example of an accelerated network card designed especially for low latency systems. Hardware on the card supports the [ef_vi API](https://github.com/majek/openonload/blob/master/README.ef_vi) which allows ethernet frames to be sent to and from the card directly from user space, completely **bypassing the kernel** in the process. This improves latency and determinism of network applications.
>
> Solarflare also develops a network API called [Onload](https://docs.amd.com/r/en-US/ug1586-onload-user) which uses `ef_vi` to provide a TCP and UDP socket interface separate from native system calls.

The network card is only part of the path in an ethernet frame's journey through a network. An entire ecosystem of specialised low-latency network hardware exists, many of which also include provisions for hardware timestamping and latency measurement. One example is the [Arista 7150 Series switch](https://www.arista.com/en/products/7150-series-network-switch-datasheet), which has dedicated hardware and software utilities built into it for measuring sub-microsecond latency.

## 2 - A wrapper for TCP sockets

## 3 - Server module for TCP connections

## 4 - Streaming over UDP multicast
