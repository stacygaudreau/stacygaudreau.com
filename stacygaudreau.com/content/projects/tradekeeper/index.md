---
title: 'TradeKeeper'
shortTitle: 'TradeKeeper'
description: 'Android and iOS React Native application for personal finance'
stack:
  ['React Native', 'NoSQL', 'React', 'Firebase', 'REST', 'JavaScript', 'CSS']
codeUrl: ''
demoUrl: 'https://stacygaudreau.com/projects/tradekeeper'
isWorkInProgress: true
disableDemoBtn: true
projectType: 'React Native mobile finance application'
type: 'project'
date: 2024-01-05T10:03:03-05:00
draft: true
---

## Features

TradeKeeper features an intuitive UX that focuses on doing one thing well: letting a user track their financial trades and assets over time. The user can quickly add assets and trades on the go, pulling live market data from a 3rd party stock API. Its primary features include

- **Recording and editing transactions** of financial assets (stocks, ETFs and indices as well as cash deposits and withdrawals)
- **Automatic market data** pulled from an API as well as the ability to record manual trade prices
- Computing and tracking a portfolio's **valuation and performance** over time, including
  - Profit & loss (day, month, year and other time ranges)
  - Annualised returns
  - Diversification
  - Best and worst performing assets
  - Asset summaries, and records of trading activity
- **Graphs** and other visual representations of portfolio assets
- User **accounts/authorization**, so a portfolio is private and can be recovered in case of loss of the user's mobile device

## Development Stack

TradeKeeper features a serverless, full-stack architecture using React Native as a base for mobile application development. Specific technologies and resources used include

- React Native
- Expo/EAS Build
- NoSQL database (Firebase)
- React Native Navigation
- Backend API (Node.js functions via Firebase)
- Numerous open source NPM packages
- React Native Styled Components
- User authorization (Firebase)
- 3rd party stock market API (Tiingo)
- Figma for UI/UX design

### Reasoning for technology choices

**React Native** has become a standard for building cross-platform mobile apps for good reason! It's great for small teams to develop cross-platform mobile applications on, due to not needing to know numerous native languages (Objective C for iOS and Java or Kotlin for Android, etc.). React Native's appeal is that it compiles down and packages code written in JS into device-native code (Java, etc.) for each mobile device.

In addition, many developers are already familiar with the component-driven and virtual DOM architecture of React and can use some of their existing knowledge to transpose their skillset into mobile development.

**Firebase** is a great choice for developing serverless and rapidly scalable systems on. Different components can be mixed and matched to create the system needed, and scaling is practically automatic since you are billed according to usage. In this case, it was the best choice for a hobby/learning project, since it has a very generous and full-featured free tier.

In a production application with many users, more care would need to be given to the chosen architecture and its forward-projected costs.

## Design (UI & UX)

Besides the obvious technical achievements, one of the goals of this project was to further my skills with **Figma** and UI design in general, so I can be better integrated with future design teams I may work with.

A considerable amount of time and care went into the design of this project (mainly because I was learning so much Figma at the same time!).

### Figma prototype

You can [check out the interactive Figma prototype here](https://www.figma.com/proto/4hfvPhTWWOvbp6WgJK28bk/TradeKeeper?node-id=160-10848&starting-point-node-id=160%3A10848&mode=design&t=P4vymiaxEntPL2L2-1) if you haven't already.

### Brainstorming

For brainstorming and generally fleshing out ideas for the project, I used Figma's **FigJam** feature for the first time. It was pretty useful for "whiteboarding" a bunch of ideas and organizing them into a creative workflow.

![An image of brainstorming in the FigJam application](./images/brainstorming.png 'Brainstorming application requirements, design and logo inspiration for the brand in Figjam.')

### Logo, branding & typography

A generative model (DALL-E) was used to spark some ideas for the logo and primary colour, and then a unique but inspired logo was created manually using vector primitives in Figma.

![TradeKeeper application logo showing a stock chart rising over candlesticks](./images/logo.png 'The final logo design for TradeKeeper.')

The typography of any application is pretty important, so I spent a good bit of time playing with various font pairings while brainstorming. Figma was very helpful for this.

### App screen and UX design

All of the application's screens/views and components were designed and mocked up in Figma.

![UI and UX being designed in Figma](./images/figma.png 'UI and UX being designed in Figma')

## What's next?

TradeKeeper will **soon be feature complete** and available to demo fully on your mobile device. This project page will be updated with a demo link when the deployment is available to check out!
