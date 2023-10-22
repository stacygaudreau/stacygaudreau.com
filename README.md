# stacygaudreau.com

My portfolio website.

XD design link: https://xd.adobe.com/view/ac208648-c2f4-4e1f-a81c-5394236575ff-f973/

## Content Creation

Within Hugo project directory (`./stacygaudreau.com`)...

### Blog Post

Create with: `hugo new --kind blog-bundle blog/<dir>/<slug>`

This creates a new blog post bundle @ `content/blog/<dir>/<slug>`.

## Dev

`npm i`

## Build & Deployment

1. Login to firebase cli and activate project

`firebase use stacygaudreau-com`

(`firebase projects:list` if you don't know the project name)

2. run `deploy.sh` from root repo folder to build and deploy to firebase hosting