# stacygaudreau.com

My portfolio website: [Stacy Gaudreau](https://stacygaudreau.com).

Written in plain ol' `CSS` (`Sass`), `JavaScript` and `HTML`, using the excellent [Hugo](https://gohugo.io/) static site generator.

## Why no React, Next.js, tailwind, etc.?

Too easy! The idea here was to grow and nurture native CSS/Sass skills and design something unique from scratch. It was a lot of fun and I actually enjoy CSS now.

## Design

The website was designed and prototyped in Adobe XD. Nowadays I use Figma, but it was still a great learning experience.s

## Content Creation

Within Hugo project directory (`./stacygaudreau.com`)...

### Blog Post

Create with: `hugo new --kind blog-bundle blog/<dir>/<slug>`

This creates a new blog post bundle @ `content/blog/<dir>/<slug>`.

## Dev/build

`npm i` -> install packages

`cd stacygaudreau.com` -> hugo project directory
`hugo server` for local dev

## Build & Deployment

1. Login to firebase cli and activate project

`firebase use stacygaudreau-com`

(`firebase projects:list` if you don't know the project name)

2. run `deploy.sh` from root repo folder to build and deploy to firebase hosting
