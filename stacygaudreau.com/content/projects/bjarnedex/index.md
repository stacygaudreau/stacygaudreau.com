---
title: 'BjarneDex'
shortTitle: 'BjarneDex'
description: 'A cross-platform desktop DJ application written in C++, using the JUCE framework'
stack: ['C++', 'JUCE']
codeUrl: ''
demoUrl: 'https://youtu.be/2jdJ26DcbAA'
isWorkInProgress: false
disableDemoBtn: false
projectType: 'Desktop Application'
type: 'project'
date: 2021-02-25T10:07:03-05:00
draft: false
---

## Demo Video

They say a picture speaks a thousand words. So what might a video say?

Check out this short demonstration video of the application.

{{< youtube id="2jdJ26DcbAA" title="BjarneDex Application Demo Video" class="video">}}

## Features

BjarneDex was developed with modern C++ and JUCE component-driven GUI development in mind.

Its main features are described below.

### Audio Decks

The focus of BjarneDex is playback of audio through its two decks --

- Each with animated waveform display cursors for scrubbing song position
- DJ-style audio filters (lowpass & highpass)
- Equal-power crossfading between the decks
- Transport controls, with playback position and track information
- Track gain and speed controls

### Track Library

Allows the user to manage their audio file library and playlists along with --

- Importing tracks via file browse or drag and drop onto the application window
- Editing, exporting and loading library playlists as `.xml` files
- Automatically persisting track playlists between application loads
- Drag and drop or manual loading of decks from the library
