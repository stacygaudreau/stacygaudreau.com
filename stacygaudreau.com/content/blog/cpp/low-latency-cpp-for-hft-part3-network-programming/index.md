---
title: 'Low Latency C++ for HFT - Part 3 - Network Programming'
description: 'Low-latency TCP and UDP networking with Unix sockets'
categories: ['Programming', 'C++']
tags: ['C++', 'Networking', 'Sockets', 'Low Latency']
type: 'blog'
date: 2024-04-08T07:12:20-04:00
draft: false
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

The next module is a `TCPSocket` class, which contains and manages the lifecycle of a Berkeley networking socket configured to operate in TCP stream mode.

\ Usage examples
> The [test suite demonstrates some examples](https://github.com/stacygaudreau/nitek/blob/e0e7d30fbc9d806c998d4c7fec62728ba480aae8/tests/test_tcp_socket.cpp) of how to use this class as well as a suite of tests for ensuring the module works well.

The module also manages a send (`tx`) and receive (`rx`) buffer which are each simply a `std::vector`. These buffers are passed to system socket calls for reading and writing data over the network.

> Some of the more interesting methods are examined below. The [full module source code](https://github.com/stacygaudreau/nitek/blob/e0e7d30fbc9d806c998d4c7fec62728ba480aae8/source/llbase/tcp_socket.h) can be found in `<llbase/tcp_socket.h>` and `.cpp` files in the repository.

### Connecting a TCP socket

Calling this method is what actually creates the system socket. The process is made easy thanks to the `create_socket()` function and `SocketConfig` configuration structure built earlier in this article.

```cpp
int TCPSocket::connect(const std::string& ip, const std::string& iface,
                       int port, bool is_listening) {
    // configure and create socket
    const SocketConfig conf{
            ip, iface, port, false, is_listening, true };
    fd = create_socket(conf, logger);
    // set connection attributes and return descriptor
    in_inaddr.sin_addr.s_addr = INADDR_ANY;
    in_inaddr.sin_port = htons(port);
    in_inaddr.sin_family = AF_INET;
    return fd;
}
```

### Send & receive data over TCP

Sending data over the `TCPSocket` is a two step process. The programmer first loads the transmit buffer with the `load_tx()` method.

```cpp
void TCPSocket::load_tx(const void* data, size_t len) noexcept {
    // simply copy the given data into the buffer
    memcpy(tx_buffer.data() + i_tx_next, data, len);
    i_tx_next += len;
    ASSERT(i_tx_next < TCP_BUFFER_SIZE,
           "<TCPSocket> tx buffer overflow! Have you called tx_and_rx()?");
}
```

Next, the `tx_and_rx()` method is called, which encapsulates the socket functions needed to both send and receive data over the network. First, some data structures are configured to pass to the `recvmsg()` call. You can read more about this system call [at the manpages](https://man7.org/linux/man-pages/man2/recvmsg.2.html) but suffice to say in this case it returns the number of bytes waiting to be read in the TCP buffer configured by the `iov{ }` structure.

A non-blocking read is performed on any pending data and a software kernel timestamp is transformed into a normalised form suitable for logging and measurement. The socket receive callback is then executed.

\ Performance improvement

> The socket receive callback `rx_callback()` is a `std::function` instance. These work a lot like `virtual` functions, and present some overhead when being called. The compiler is smart enough to preprocess trivial single instance examples of them, but performance gains can potentially be had by using a the [Curiously recurring template pattern](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern) instead. Since this callback is called within a path critical to the TCP socket (its `tx_and_rx()` method) this could be an avenue worth exploring later.

Writing data out is a more simple affair. If there's data in the `tx_buffer` then the `send()` function is called on the socket and told to not wait around. The method quickly exits and expects the underlying system socket do its job sending the data passed to it.

```cpp

bool TCPSocket::tx_and_rx() noexcept {
    char ctrl[CMSG_SPACE(sizeof(struct timeval))];
    auto cmsg = reinterpret_cast<struct cmsghdr*>(&ctrl);

    iovec iov{ rx_buffer.data() + i_rx_next, TCP_BUFFER_SIZE - i_rx_next };
    msghdr msg{ &in_inaddr, sizeof(in_addr),
                &iov, 1, ctrl,
                sizeof(ctrl), 0 };

    // non-blocking read of data
    const auto rx_size = recvmsg(fd, &msg, MSG_DONTWAIT);
    if (rx_size > 0) {
        i_rx_next += rx_size;
        Nanos t_kernel{ };
        timeval kernel_timeval{ };
        if (cmsg->cmsg_level == SOL_SOCKET && cmsg->cmsg_type == SCM_TIMESTAMP
                && cmsg->cmsg_len == CMSG_LEN(sizeof(kernel_timeval))) {
            memcpy(&kernel_timeval, CMSG_DATA(cmsg), sizeof(kernel_timeval));
            // timestamp converted to nanoseconds
            t_kernel = kernel_timeval.tv_sec * NANOS_TO_SECS
                    + kernel_timeval.tv_usec * NANOS_TO_MICROS;
        }
        const auto t_user = get_time_nanos();
        logger.logf("% <TCPSocket::%> RX at socket %, len: %,"
                    " t_user: %, t_kernel: %, delta: %\n",
                    LL::get_time_str(&t_str), __FUNCTION__, fd, i_rx_next,
                    t_user, t_kernel, (t_user - t_kernel));
        // finally, the receive data callback is executed
        rx_callback(this, t_kernel);
    }

    // non-blocking write out of data in tx buffer
    if (i_tx_next > 0) {
        const auto n = send(fd, tx_buffer.data(),
                            i_tx_next, MSG_DONTWAIT | MSG_NOSIGNAL);
        logger.logf("% <TCPSocket::%> TX at socket %, size: %\n",
                    LL::get_time_str(&t_str), __FUNCTION__, fd, n);
    }
    i_tx_next = 0;
    return (rx_size > 0);
}
```

## 3 - Server module for TCP connections

The `TCPSocket` module created in the last section is used to create a low latency TCP server capable of handling many simultaneous client connections. This is the module where we see `epoll()` multiplexing used in practise, since the server has to manage many different stateful TCP connections. 

\ Source code
> This module is quite large and so the source is not copied here. The [full module source code](https://github.com/stacygaudreau/nitek/blob/e0e7d30fbc9d806c998d4c7fec62728ba480aae8/source/llbase/tcp_server.cpp) can be found in `<llbase/tcp_server.h>` and `.cpp` files in the repository.

### TCP server anatomy

The server is really just a collection of `TCPSocket` instances which serve different purposes in the server module. The basic working principle is --

1. The server is instantiated with its `listen()` method, which binds it to a local interface and port. 
2. A single `TCPSocket` is listened on for new incoming connection requests (member `listening_socket`)
3. New clients have a dedicated `TCPSocket` created and maintained for them in the `rx_sockets` vector, which tracks all sockets being received upon by the server.
4. Clients which can be written back to are added to the `tx_sockets` vector, and disconnected sockets are similarly tracked in the `dx_sockets` vector.
5. Similar to the `TCPSocket` module, a `tx_and_rx()` method is called periodically by the application which in turn calls the non-blocking read and write methods of each of the `TCPSocket` instances the server is managing.

\ Usage examples
> The [test suite](https://github.com/stacygaudreau/nitek/blob/e0e7d30fbc9d806c998d4c7fec62728ba480aae8/tests/test_tcp_server.cpp) for the `TCPServer` module demonstrates how to use the module in practise. A number of examples are shown including sending messages back and forth from multiple clients connecting, sending and receiving to and from the TCP server (see test `multiple_clients_communicate`).

It's clear from inspection that a lot of the instructions in this method relate to tracking and maintaining all of the sockets relating to the server. Hence why we concerned ourselves with choosing the fastest multiplexing method to use, ie: `epoll()`. 

If you take a look at the `poll()` method, you'll see that the `epoll()` interface is being used to respond to edge-triggered events detected by the system, whenever a monitored socket calls for it and we are passing through the `poll()` routine, ie --

```cpp
void TCPServer::poll() noexcept {
    // ...
    if (e.events & EPOLLIN) {
        // epoll input event triggered, we have a 
        // -> receive data ...
    }
    if (e.events & EPOLLOUT) {
        // epoll output event triggered
        // -> transmit data ...
    }

    if (e.events & (EPOLLERR | EPOLLHUP | EPOLLRDHUP)) {
        // EPOLLERR or EPOLLHUP -> socket was disconnected
        //  (error or signal hang up) 
        //  -> add to dx_sockets ...
    }
    // ...
}
```

## 4 - Streaming over UDP multicast

In this section, an `McastSocket` container is built to provide a UDP multicast socket for streaming data to/from market participants.

### When to use UDP

Being that TCP is a **stateful** protocol, it spends time maintaining those connections at the server and protocol level. This was demonstrated in the `TCPServer` module, which by inspection of its methods does indeed spend an obvious amount of time and resources multiplexing all of the connecting sockets. TCP also spends time **handshaking and acknowledging connections** at the transport layer of the networking model.  

For this and other reasons, the **stateless** UDP protocol is preferred in situations where the application can afford some packet loss, and/or packets arriving out of order.

UDP becomes especially useful when a **single producer is broadcasting the same data** over a network in order to be consumed by multiple consumers. Instead of needing a managed TCP connection for each consumer, the exchange can broadcast over a single [UDP multicast stream](https://en.wikipedia.org/wiki/Multicast), saving an enormous amount of **processing power and bandwidth**.

In a trading exchange, the **public market data** which is disseminated to exchange participants is a suitable candidate for a UDP multicast stream.

### The multicast socket class

The multicast UDP socket module wraps a Unix socket in a way similar to the `TCPSocket` class. Again, the transmit and receive buffers' pointers are passed to and from the Berkeley socket API's send and receive functions. 

\ Source code
> Like the other socket modules, only select areas of the code are presented here. The [full source code](https://github.com/stacygaudreau/nitek/blob/e0e7d30fbc9d806c998d4c7fec62728ba480aae8/source/llbase/mcast_socket.h) can be found in `<llbase/mcast_socket.h>` and `.cpp` files in the repository.

#### Multicast group membership

The main difference between this and the TCP class is that instead of connecting directly to a specific socket to communicate, the multicast socket joins a multicast group, which is simply an address that it subscribes to receive and transmit network data on. Multicast group membership is just a socket option, set once again by the `setsockopt()` function.

\ McastSocket::join_group()
```cpp
/**
 * @brief Join a given multicast stream group on the
 * given socket and ip address
 * @param fd Socket file descriptor
 * @param ip String rep'n of iface's IP address
 * @return True when successful
 */
bool McastSocket::join_group(const std::string& ip) {
    const ip_mreq mreq{{ inet_addr(ip.c_str()) },
                       { htonl(INADDR_ANY) }};
    return (setsockopt(fd, IPPROTO_IP, IP_ADD_MEMBERSHIP,
                       &mreq, sizeof(mreq)) != -1);
}
```

### Sending and receiving multicast messages

Inspecting the `load_tx()` and `tx_and_rx()` methods of the multicast socket class reveals that they are much simpler than that of the `TCPSocket` class. This is due to the simplicity of UDP compared to TCP.

In the `tx_and_rx()` method, it's worth noting that ordinarily it is common to use the `sendto()` socket function with UDP sockets. But, in this implementation, it's not needed, for reasons explained in the code comments --

\ 
```cpp
bool McastSocket::tx_and_rx() noexcept {
    // non-blocking read
    // ...
    // write out to stream
    if (i_tx_next > 0) {
        // we don't have to use sendto() with this multicast socket since
        //  the call to create_socket() already calls connect() on the
        //  multicast group this socket belongs to. If the design changes
        //  it may be necessary to use sendto() here instead.
        const auto n = send(fd, tx_buffer.data(), i_tx_next,
                            MSG_DONTWAIT | MSG_NOSIGNAL);
        logger.logf("% <McastSocket::%> TX at socket %, size: %\n",
                    LL::get_time_str(&t_str), __FUNCTION__, fd, n);
    }
    // ...
}
```

\ Usage examples
> As with the other modules built in this article, [a test suite exists](https://github.com/stacygaudreau/nitek/blob/e0e7d30fbc9d806c998d4c7fec62728ba480aae8/tests/test_mcast_socket.cpp) for the UDP socket container. Examples of publishing and consuming to/from the stream are presented to get a better understanding of how to use this class.

## Summary and next time

This article presented an overview of low latency networking principles in C++ and built some useful modules around the Unix sockets API. 

First, the Unix socket creation and configuration functions was abstracted into some helper methods. Then, a TCP server and TCP/UDP socket containers were built. A suite of tests ensures all of these modules are working correctly.

### In the next part

The fourth part of this series will put all the pieces to work and begin building out the heart of the exchange system resonsible for matching traders' orders with one-another: the **Order Matching Engine**.