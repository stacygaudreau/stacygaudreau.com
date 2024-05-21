---
title: "Low Latency C++ for HFT - Part 4 - Order Matching"
description: "Building the order matching engine for a market trading system"
categories: ['Programming', 'C++']
tags: ['C++', 'Low Latency', 'Finance', 'Trading Engine']
type: 'blog'
date: 2024-05-05T08:58:28-04:00
draft: true
---

## What is an Order Matching Engine?

The OME is an important part of any market exchange system. One might call it the **core of the exchange**, since it is responsible for **matching buyers bids to sellers asks**, and executing orders on their behalf.

Back when exchanges relied on having actual humans on a trading floor (aka: [open outcry trading](https://en.wikipedia.org/wiki/Open_outcry)), human traders acted as the heart of the exchange. Using a system of hand signals, buyers and sellers were represented by a person who acted on their behalf to match and execute their orders.

These days, electronic exchanges and [ECNs](https://en.wikipedia.org/wiki/Electronic_communication_network) use some implementation of an [order matching system](https://en.wikipedia.org/wiki/Order_matching_system) to carry out matching buy and sell orders.

## References & source code

Along with the other articles in this series, I'm following along with the primary reference book we spoke about in Part 1 --

\ Building Low Latency Applications with C++ (Ghosh)
> Sourav Ghosh's book [Building Low Latency Applications with C++](https://www.packtpub.com/product/building-low-latency-applications-with-c/9781837639359) serves as the main reference for this project. Highly recommend to buy yourself a copy if you're interested in learning more about low latency C++!

### Source code

To keep this series tidy, much of the source code is omitted in these articles. For a complete listing of all my code you can visit the [Git repository for this project.](https://github.com/stacygaudreau/nitek)

\ Note regarding source code
> All of the code shared is written by myself while learning from, experimenting with and extending the code found in Ghosh's text. You will find that my code contains many differences, but is based heavily on the author's design. You can find the [author's code here](https://github.com/PacktPublishing/Building-Low-Latency-Applications-with-CPP). 

## Design

Before we get into too much detail about the OME, it's a good idea to give a bird's eye view of the entire exchange system design.

### Exchange system overview

Since this is a learning project, we'll be focusing on the most critical parts of an exchange system -- where low latency (LL) performance is going to matter the most. To that end, we won't be developing every single feature of a live exchange system. Just enough to maximise learning about LL-Cpp.

In the interest of digesting the most from the book, I've interpreted the author's system design and summarised it in an overview diagram --

![Overview diagram of exchange system](./images/exchange-overview.png 'My interpretation of the exchange system design')

As you can see, the **exchange** itself is separated from the market **participant**. Only one participant is shown, but in reality, many market participants are usually connected to a single market component (which itself may be distributed across many instances to serve more clients).

Both **UDP** and **TCP** protocols are used to connect the participants to the client, depending on the requirements for the data being communicated.

### Components of the exchange system

If the overview diagram made complete sense to you, you can probably skip this section where I describe what each component in the system does.

#### Order Matching Engine (OME)

As already mentioned, the OME matches participant bids and asks to each other, and executes trades on behalf of them. This is the heart of the exchange.

It does its job by communicating with the Market Data Publisher (MDP) and Order Gateway Server (OGS) in the exchange with it. 

##### Order Book (OB)

The order book is a ledger of all bids and asks open at a given point in time. This is the **list of orders which the matching engine executes from**. You can think of it simply like a table of bids, asks and prices along with identifiers that link the orders to a given client.

#### Trading Engine (TE)

In our system, the trading engine is the **client-side application**. While it does not match orders like the OME does, it **does** maintain its own version of the Order Book (OB), based on publicly disseminated market data from the exchange. 

The TE could run a variety of trading algorithms and strategies, as well as compute simple **statistics and risk management metrics** for either trading algorithms or a user to interpret.

In a desktop trading client, this is the area where we might begin to develop a trading client for a user to interact with, or transpose incoming data into metrics which drive charts and graphs for technical analysis.

#### Market Data - Publisher and Consumer (MDP & MDC)

Market data is dispatched to numerous participating market clients over UDP through the publisher. **The publisher (MDP)** encodes sensitive, private market data which drives the Order Book into a format suitable for public consumption by all clients. 

\ Why UDP?
> UDP (via multicast grouping) is the chosen protocol here, since an enormous amount of data is sent out to many clients at once, and we do not care if a packet or two is lost here and there. 
> 
> TCP unnecessary in this circumstance and would seriously **degrade the latency of the system**.

The **market data consumer (MDC)** on the participant's side receives the data from the exchange, decoding it into a local format that the Trading Engine can use to do its job. 

#### Order Gateway - Server and Client (OGS & OGC)

Like market data, the order gateway exists as a separate component on the participant and the exchange's side. Each is responsible for sending and receiving actual market orders to/from the exchange.

The **client (OGC) sends new orders** received from the Trading Engine and the **server (OGS) receives incoming orders** from multiple clients over TCP, validating and passing them on to the OME for potential execution.

\ TCP or UDP?
> For client orders coming into the exchange, it is critical to make sure that they are processed and dealt with reliably, and in the order that they arrive. For this reason, UDP would generally be pretty unsuitable for the order gateway.
>
> **TCP is chosen for its reliability** and concern over the **time and order which packets arrive in**, in the case of order handling.







## Implementation
