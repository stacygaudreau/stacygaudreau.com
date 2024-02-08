---
title: 'RateMyDerp!'
shortTitle: 'RateMyDerp!'
description: 'A full-stack web application with a Python backend. An accompanying timeseries database provides real-time application metrics and KPI dashboard.'
stack: ['Python', 'InfluxDB', 'Django', 'PostgreSQL', 'JavaScript', 'CSS']
codeUrl: 'https://gitlab.com/hibouambigu/ratemyderp'
demoUrl: 'https://ratemyderp.com'
isWorkInProgress: false
disableDemoBtn: false
projectType: 'Full Stack Web Application'
type: 'project'
date: 2022-03-02T10:06:03-05:00
draft: false
---

## Technical Features

RateMyDerp is a full stack Python web application. There are a few moving parts to it, so here is an overview of the technologies used and decisions made during its development.

### Backend

Written in Python using the [Django web framework](https://www.djangoproject.com/), the backend features --

- Industry best practices for a production-grade Django application
- User accounts, profiles and authorisation flow with emails and password reset
- Test-driven development -- unit testing with `pytest` and `factory-boy`
- Relational data handled by a PostgreSQL database
- Async and periodic task scheduling via [Celery](https://docs.celeryq.dev/)
- [Redis](https://redis.io/) for caching and message brokering

### Frontend

In addition to Django template language & HTML, the presentation layer is made up of --

- JavaScript ES6 modules, bundled with [rollup.js](https://rollupjs.org/guide/en/)
- Sass compiled into CSS
- A build and transpilation pipeline run by the [Gulp](https://gulpjs.com/) task runner

### Monitoring & Dashboarding

To simulate maintenance of a real production environment, a deployment of InfluxDB open source timeseries database from [InfluxData](https://www.influxdata.com/) was provisioned on a separate VM.

![RateMyDerp! metrics dashboard](./images/dashboard.png 'The application metrics dashboard for RateMyDerp')

The application uses the Python plugin for InfluxDB to report key statistics to the dashboard periodically. The data is transformed into useful metrics and KPIs with the [Flux query language](https://docs.influxdata.com/influxdb/v2.1/query-data/get-started/query-influxdb/).

The deployment system itself is monitored on its own dashboard. The system dashboard measures server health metrics such as database load, memory usage, network traffic and processes running on the server.

### Deployment

While docker was used during the _development_ of RateMyDerp, the actual deployment resides on a dedicated (containerless) VM.

The deployment environment consists of --

- Ubuntu Linux
- [Gunicorn](https://docs.gunicorn.org/en/stable/) WSGI server for the backend
- [NGINX](https://nginx.com) to serve static files and proxy the backend
- PostgreSQL server
- Redis server
- Shell scripts to ease subsequent deployments
- Automatic ACME challenge renewal of SSL certificates (via `certbot`)

This was an excellent opportunity to get more familiar with creating custom `systemd` service units which run Python applications, since there are a total of three of them in the deployment.

\ Huh? No Docker?

> A lower level deployment was the optimal choice to gain deeper understanding of Linux as a deployment target.
>
> I was concerned I'd miss out on some learning if deployment simply consisted of pulling up half a dozen container services with a `docker-compose` command (grin).

## Application Logic

Functionally, RateMyDerp is an homage to the [“Rating Sites”](https://en.wikipedia.org/wiki/Review_site#Rating_site) of the early 2000’s (HotOrNot, RateMyFace, etc.).

Users rate [derpy](https://www.urbandictionary.com/define.php?term=Derpy) photos of pet animals.

This concept was popular back before social media -- when we actually had to go _looking for_, and perhaps even _work_ a little bit for -- entertaining images on the internet. They weren't just fed to us on the daily!

### Rating

The premise is straightforward --

1. A visitor lands on the main app view and is shown a **random image** of a creature from the database. They are asked to vote for its "derpiness" on a scale of 1-10
2. The user is **rewarded for their vote** with a new _fresh_ image from the database
3. If the user doesn't cast a vote, they **don't get to see the next image**

### Users

In addition to basic authorisation requirements, user accounts feature a public profile and numerous settings for the app. All of the submissions a user has contributed appear on their profile, as well as some statistics about the number of ratings they've cast, how long they've been a member for, etc.

\ Anonymous Ratings

> Of course, **anonymous visitors** can cast rating votes, too. It wouldn't be great if users had to register an account just to cast some ratings and see derpy creatures.
>
> Anonymous ratings are kept track of in the app by browser session IDs.

### Submissions

Registered users can submit their own photos to appear in the system. Images are cropped square, compressed and resized to an optimal `jpeg` format.

### Statistics

Stats like average rating, ranking (in terms of place compared to other objects in the database) and virility (number of shares, ratings, views, etc) are kept track of for each submission.

Some of these are calculated periodically in an asynchronous `celery` task, since they require combing through each object in the database (eg: ranking).
