---
title: 'Polyverse Music'
shortTitle: 'Polyverse Music'
description: 'Senior C++ GUI/UX Developer (2022-2024)'
stack: ['C++', 'Python', 'Figma']
codeUrl: ''
demoUrl: 'https://polyversemusic.com'
isWorkInProgress: false
disableDemoBtn: true
projectType: 'Cross-platform desktop GUI development in C++'
type: 'project'
date: 2024-01-01T10:06:03-05:00
draft: false
---

## The "Frontend" of desktop software

My duties at Polyverse Music involved developing, using and maintaining a large proprietary library of code in order to produce bespoke "frontends" for each of the products worked on during my tenure there.

I worked **very closely** with our UI/UX/graphic design lead, turning their component and UI ideas into reality. Our product manager (also CEO) guided and directed us toward their vision, always inviting us to contribute our opinions and ideas about the UX and design of each product. Everyone at Polyverse has music in their blood, and we all put our heart and soul into the products we made.

\ The "frontend" analogy

> If you're familiar with the client/server (or "front and backend") terms in modern web development, you might find the analogy of me being on the "**frontend**" of development at Polyverse useful.

In essence, I was responsible for all of the moving parts that the user sees and physically interacts with. It was my job to work with a **component-based**, **MVC-type** framework (not too dissimilar to something like **React** in web parlance). The major difference between these technologies being the language (C++ vs JavaScript) and generally being much more low-level, verbose and **strongly typed**.

## The framework

Like React or Svelte for the web, the framework I worked with keeps central the idea of `Component` abstractions to make **composition**, **inheritance** and **reuse** of UI components easy.

It also offers an application state architecture which has its roots in the [MVC Paradigm](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller).

Naturally, common design patterns and challenges exist between the framework we used, and a web framework such as eg: Svelte or React. For example, the question

\ Where should I place the `state` for this component?

> A question asked by many programmers in React and other "frontend" roles!
>
> _Things were no different in this line of work!_ Much like most popular web frameworks, one has the choice of placing state local to a component, or within some kind of global state or context. All options come with tradeoffs, like having to "drill down" state into components lower in the tree.

## Getting low level

The major difference between JavaScript web frameworks and C++ GUI programming is of course that things sometimes get a little more low-level in C++. Being that web frameworks run in a web browser, they implicitly come with their own declaritive language tailor-made for UI development (ie: CSS)!

During component development, a lot of my time was spent doing vector drawing with primitives like rectangles, lines and ellipses, pushing pixels around and reacting to "backend" code and state to drive animations and user feedback.

It was a really great chance to use **trigonometry** and **linear/vector algebra** to solve real world problems and this was one of my favourite parts of the job.

\ I've got a confession to make: CSS actually kind of rocks.

> Hate `flexbox`, or trying to centre a `div` in the browser? Well, try doing it pixel perfect in C++ and you might find yourself wishing you had something like CSS!
>
> Perhaps I might not be popular for saying this, but CSS is actually pretty _amazing_.

## The products I worked on

During my time at Polyverse, I was fortunate to get to work on multiple flagship products, often hopping from project-to-project on the daily and encountering new challenges with each.

[**Filtron**](https://polyversemusic.com/products/filtron/) was my first product, being that it was relatively simple for me to take and run with the idea of. My code also made its way into revamping the modulation system for all of our plugins, applying maintenance and updates to legacy products, and putting some finishing touches on [**Supermodal**](https://polyversemusic.com/products/supermodal/) for its release.

The largest and most complicated development to date, [**Filterverse**](https://polyversemusic.com/products/filterverse/) (shipping in early 2024) was my last project at Polyverse, and I couldn't be more proud of the team for it. It's quite an accomplishment and there's nothing else like it in the market. Polyverse are a true team of innovators both in UI/UX and audio experience with pro audio plugins, and I'm sure it will be well received in the industry when it launches. The UI has a lot of moving parts and was very exciting to iterate on the design of, and develop with the team.
