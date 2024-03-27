---
title: 'Deploying RateMyDerp to Production'
description: ''
categories: ['deployment']
tags: ['Python', 'Django', 'Linux', 'systemd']
type: 'blog'
date: 2022-03-23T16:14:00-04:00
draft: false
---

## Deployment

Deployment consists of a couple major parts: initial provisioning of infrastructure and then the actual software deployment.

### Provisioning Infrastructure

The initial setup of our environment we'll be deploying to with our subsequent CI/CD pipeline.

This will be a somewhat monolithic environment, for maximum learning. We'll not be using Docker or Kubernetes, here, and certainly not any kind of "self-configured"/"serverless" Python/Django option like Heroku or PythonAnywhere.

Environment consists of an Ubuntu 20.04 VM, with services

- RateMyDerp's Django application in a virtualenv
- [Celery](https://docs.celeryq.dev/) task workers
- PostgreSQL database server
- Redis server
- NGINX server
- InfluxDB

Ultimately we will have NGINX terminating HTTPS and proxying the Django application.

[Django and NGINX uWSGI Guide](https://uwsgi-docs.readthedocs.io/en/latest/tutorials/Django_and_nginx.html#)

#### Base VM Configuration

Pretty dependent on cloud provider, but in general we're going to want to update the system once we've got our SSH key on it and a shell open.

Additionally we're going to install some helpful -- some might consider essential -- tools on the machine.

Neovim for editing config files and net-tools for diagnosing network stuff once we're up and running (includes tools like `dig` and `netstat`)

We're rolling with Ubuntu so it's `apt` for package management.

```bash
# system update & utils
apt-get update && apt-get dist-upgrade
apt install neovim net-tools
# python, git
apt install git python3 python3-virtualenv
```

#### Install Python

Install the currently desired/supported Python version. At the time of writing, it's `3.10` for Django 4.0.

[Repository of various Python versions](https://launchpad.net/~deadsnakes/+archive/ubuntu/ppa)

We're not going to use the system Python here, since it may be updated in the future and cause issues.

```bash
add-apt-repository ppa:deadsnakes/ppa
apt-get update
apt-get install python3.10 python3.10-distutils python3.10-dev
```

Let's update `pip` as well
`curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10`

#### Test Environment

We're going to check everything is good so far by setting up a test 3.10 virtualenv and running Django in it.

\ Setup Python 3.10 virtual environment

```bash
cd /var/opt/ratemyderp
virtualenv venv --python=/usr/bin/python3.10
# ^ if you get an error here, make sure python3.10-distutils is installed from above
source ./venv/bin/activate
python --version
Python 3.10.3 # all good!
```

Still in the same virtual environment...

\ Quick Django install & test

```bash
# update pip
curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10
# install django & demo project
pip install django
django-admin startproject demo
```

Edit allowed hosts in project settings
\ ./demo/settings.py

```python
# ip address of the server
ALLOWED_HOSTS = ['xx.xx.xx.xx']
```

Test!

```bash
cd demo && python manage.py runserver <server-ip>:8000
```

From another machine, open up a browser and navigate to the ip, or `curl` from another machine to verify.

```bash
# close ports back up when done
ufw delete allow 8000/tcp
# delete venv, we'll make a new one
rm -rf /var/opt/ratemyderp/venv
```

#### Non-root User

Following the [Principle of Least Privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege), we shouldn't be using the root account for our application to run.

Let's create ourselves a system user called `ratemyderp` to run the app from.

```bash
adduser --system --home=/var/opt/ratemyderp \
  --disabled-password --group \
  --shell=/bin/bash ratemyderp
```

#### Environment & Directory Setup

We're going to setup some directories and create our production virtual environment.

Structure is

`/var/opt/ratemyderp` -> data dir: media files, system user's home
`/opt/ratemyderp` -> application source, config, venv
`/var/log/ratemyderp` -> syslog directory

\ Create directories

```bash
# base app directory
mkdir /opt/ratemyderp
# logfile directory
mkdir /var/log/ratemyderp
chown -R ratemyderp:ratemyderp /var/log/ratemyderp
# static files to serve -> no access req'd for ratemyderp user
mkdir -p /var/opt/ratemyderp/static
# media files to server -> RW access for ratemyderp user
mkdir -p /var/opt/ratemyderp/media
chown -R ratemyderp:ratemyderp /var/opt/ratemyderp/media
#
```

\ Virtual environment

```bash
virtualenv /opt/ratemyderp/venv --python=/usr/bin/python3.10
```

#### NGINX

```bash
apt install nginx
```

Our initial server block looks like

\/etc/nginx/sites-enabled/ratemyderp.com.conf

```conf
server {

  listen 80;
  server_name ratemyderp.com;
  root /var/www/ratemyderp.com;

  # proxy our django app
  location / {
    proxy_pass http://localhost:8000/;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 5m;
  }

  # serve static dir
  location /static/ {
    alias /var/opt/ratemyderp/static/;
  }

  # serve media dir
  location /media/ {
    alias /var/opt/ratemyderp/media/;
  }

  # close connections w/ invalid host headers
  # before they reach django
  if ( $host !~* ^(ratemyderp.com|www.ratemyderp.com)$ ) {
    return 444;
  }
}
```

\ NOTE: for CloudFlare

> If you're stuck in a redirect loop b/c of cloudflare SSL termination/redirect,
> make sure to check your `SECURE_SSL_REDIRECT` setting in Django config. Should
> be false if you're redirecting SSL outside of Django. We don't want Django to handle
> this stuff since we'll be terminating http and redirecting to https before traffic is proxied to Django.

#### Certbot & SSL Termination

Follow [instructions for certbot installation](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal).

Configure & deploy via certbot's handy automated NGINX `.conf` editor with `certbot --nginx`

Don't forget to open port `443` if not already open.

```bash
ufw allow 443/tcp
systemctl reload nginx
```

Should be working with https in the browser now. Verify cert renewal works.

```bash
certbot renew --dry-run
```

#### Database Setup

Time to setup our PostgreSQL server and database to run the application on.

##### PostgreSQL Server

One can always just `apt install postgresql` all willy-nilly, but it's better to add the official apt repository to get specific versions/updates not in the Ubuntu package repositories.

Follow the instructions over at the [PostgreSQL Repository Installation](https://www.postgresql.org/download/linux/ubuntu/).

```bash
systemctl enable postgresql
```

##### Database Creation

We'll switch over to the `postgres` system user while we create a database and user for our application.

```bash
sudo -iu postgres
psql -U postgres
```

Within the `psql` shell, create our user and db.

```sql
CREATE DATABASE ratemyderpdb;
CREATE USER ratemyderp WITH ENCRYPTED PASSWORD '<pw-string-here>';
GRANT ALL PRIVILEGES ON DATABASE ratemyderpdb TO ratemyderp;
```

Default character encoding is already `UTF-8` which is good for our needs. Can always check with `SHOW server_encoding;` or per db with the `\l` command, eg:

```bash
\l
                                    List of databases
     Name     |  Owner   | Encoding |   Collate   |    Ctype    |    Access privileges
--------------+----------+----------+-------------+-------------+-------------------------
 postgres     | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 |
 ratemyderpdb | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =Tc/postgres           +
              |          |          |             |             | postgres=CTc/postgres  +
              |          |          |             |             | ratemyderp=CTc/postgres
 template0    | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres            +
              |          |          |             |             | postgres=CTc/postgres
 template1    | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | =c/postgres            +
              |          |          |             |             | postgres=CTc/postgres
(4 rows)
```

Since we're working with our database instance only via `localhost`, there's no more configuration to do as this is what PostgreSQL server's default connection rules allow.

#### Redis

RateMyDerp uses a Redis server for two things: caching frequently accessed views and database results, and to act as a [message broker for Celery](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/redis.html).

Let's install and configure it here.

```bash
apt-get update && apt install redis-server -y
systemctl enable redis-server
# status check
systemctl status redis-server
```

There's nothing to configure just yet, although we will come back later to tune Redis (and Postgres) a bit better for our system.

#### Environment Variables

Our database and caching server are ready, so it's time to configure production environment variables for our application. Required fields shown. Replace with production secrets where indicated.

\ /opt/ratemyderp/conf/ratemyderp.conf

```bash
# django application
PYTHONPATH=/opt/ratemyderp/app
DJANGO_SETTINGS_MODULE='config.settings.production'
DJANGO_SECURE_SSL_REDIRECT=False
DJANGO_STATIC_DIR=/var/opt/ratemyderp/static
DJANGO_MEDIA_DIR=/var/opt/ratemyderp/media
DJANGO_SECRET_KEY='<generate-a-key-string>'
DJANGO_ADMIN_URL='<obfuscated-url>'
# postgresql
DATABASE_URL=postgres://<pg-user>:<pg-pass>@localhost:5432/ratemyderpdb
# redis
CELERY_BROKER_URL=redis://localhost:6379/0
REDIS_URL=redis://localhost:6379/0
# influxdb connection
INFLUX_TOKEN=<influx-bucket-token>
INFLUX_BUCKET=ratemyderp
INFLUX_ORG=<influx-org-name>
INFLUX_URL=<influx-server-url>
# mailgun email api
MAILGUN_API_KEY=<mailgun-domain-api-key-not-pass>
MAILGUN_DOMAIN=<mailgun-domain-address>
```

\ Don't forget to load new .envs!

```bash
source /opt/ratemyderp/ratemyderp.conf
```

#### Gunicorn Server

It is most easy to install this as a Python package rather than system-wide. This will be done automatically during our deployment steps later (when `pip` installs our production requirements), but for testing can be done with `pip install gunicorn` in our virtual environment.

##### Startup Command

Don't forget to `export PYTHONPATH=/opt/ratemyderp/app` before this, whether manually or in the `.env` file.

```bash
gunicorn  --workers=4 --log-file=/var/log/ratemyderp/gunicorn.log \
          --bind=127.0.0.1:8000 --bind=[::1]:8000 \
          config.wsgi:application
```

##### Service Unit File for `systemd`

Now to create a unit file for everyone's favourite service manager, `systemd`. This service will run and provide monitoring of our `gunicorn` application upon system startup.

\ /etc/systemd/system/ratemyderp.service

```conf
[Unit]
Description=RateMyDerp - Backend Web Application

[Service]
User=ratemyderp
Group=ratemyderp
EnvironmentFile=/opt/ratemyderp/conf/ratemyderp.conf
ExecStart=/opt/ratemyderp/venv/bin/gunicorn \
  --workers=4 --log-file=/var/log/ratemyderp/gunicorn.log \
  --bind=127.0.0.1:8000 --bind=[::1]:8000 \
  config.wsgi:application

[Install]
WantedBy=multi-user.target
```

Let's test it!

```bash
systemctl daemon-reload # reload systemd service files
systemctl start ratemyderp
systemctl status ratemyderp
# if all is well ...
● ratemyderp.service - RateMyDerp - Backend Web Application
     Loaded: loaded (/etc/systemd/system/ratemyderp.service; disabled; vendor preset: enabled)
     Active: active (running) since Sat 2022-03-19 13:28:20 UTC; 4s ago
   Main PID: 19019 (gunicorn)
   # ...
```

Well isn't that exciting.

#### Celery

RateMyDerp uses [Celery](https://docs.celeryq.dev/en/stable/index.html) to run various asynchronous and periodic tasks in the application. We're going to set up separate daemons for each type of celery process required.

We need a `worker` process - which handles async tasks, and a `beat` process which handles periodic, scheduled tasks.

[Daemonizing Guide](https://docs.celeryq.dev/en/stable/userguide/daemonizing.html#daemon-systemd-generic)

##### System User

Create a system user for our celery processes to run as.

```bash
adduser --system --home=/var/opt/celery \
  --disabled-password --group \
  --shell=/bin/bash celery
```

##### Daemons

First up is the service unit file for the main Celery worker process. This process handles async queues.

\ /etc/systemd/system/celery.service

```conf
[Unit]
Description=Celery Worker Service
After=network.target

[Service]
Type=forking
User=celery
Group=celery
EnvironmentFile=/opt/ratemyderp/conf/celery.conf
EnvironmentFile=/opt/ratemyderp/conf/ratemyderp.conf
WorkingDirectory=/opt/ratemyderp/app
ExecStart=/bin/sh -c '${CELERY_BIN} multi start ${CELERYD_NODES} \
  -A ${CELERY_APP} --pidfile=${CELERYD_PID_FILE} \
  --logfile=${CELERYD_LOG_FILE} --loglevel=${CELERYD_LOG_LEVEL} ${CELERYD_OPTS}'
ExecStop=/bin/sh -c '${CELERY_BIN} multi stopwait ${CELERYD_NODES} \
  --pidfile=${CELERYD_PID_FILE}'
ExecReload=/bin/sh -c '${CELERY_BIN} multi restart ${CELERYD_NODES} \
  -A ${CELERY_APP} --pidfile=${CELERYD_PID_FILE} \
  --logfile=${CELERYD_LOG_FILE} --loglevel=${CELERYD_LOG_LEVEL} ${CELERYD_OPTS}'

[Install]
WantedBy=multi-user.target
```

Another process altogether is needed to schedule periodic Celery tasks and feed them to our worker. This is called [Celery Beat](https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html).

\ /etc/systemd/system/celerybeat.service

```conf
[Unit]
Description=Celery Beat Task Scheduler
After=network.target

[Service]
Type=simple
User=celery
Group=celery
EnvironmentFile=/opt/ratemyderp/conf/celery.conf
EnvironmentFile=/opt/ratemyderp/conf/ratemyderp.conf
WorkingDirectory=/opt/ratemyderp/app
ExecStart=/bin/sh -c '${CELERY_BIN} -A ${CELERY_APP} beat  \
    --pidfile=${CELERYBEAT_PID_FILE} \
    --logfile=${CELERYBEAT_LOG_FILE} --loglevel=${CELERYD_LOG_LEVEL} \
    --schedule=${CELERYBEAT_SCHEDULE_FILE}'
Restart=always

[Install]
WantedBy=multi-user.target
```

A single configuration file contains the env. parameters for both of our celery daemons.

\ /opt/ratemyderp/conf/celery.conf

```conf
# single node named w1
CELERYD_NODES="w1"

# Absolute or relative path to the 'celery' command:
CELERY_BIN="/opt/ratemyderp/venv/bin/celery"

# App instance to use
# comment out this line if you don't use an app
CELERY_APP="config.celery_app"

# How to call manage.py
CELERYD_MULTI="multi"

# Extra command-line arguments to the worker
CELERYD_OPTS="--time-limit=300 --concurrency=2"

# - %n will be replaced with the first part of the nodename.
# - %I will be replaced with the current child process index
#   and is important when using the prefork pool to avoid race conditions.
CELERYD_PID_FILE="/var/run/celery/%n.pid"
CELERYD_LOG_FILE="/var/log/celery/%n%I.log"
CELERYD_LOG_LEVEL="INFO"

# Beat scheduler options
CELERYBEAT_PID_FILE="/var/run/celery/beat.pid"
CELERYBEAT_LOG_FILE="/var/log/celery/beat.log"
CELERYBEAT_SCHEDULE_FILE="/var/opt/celery/celerybeat-schedule"
# ^ process user must have r/w access to the schedule file
```

##### Log and PID Directories

Finally, we need to make a [systemd-tmpfiles configuration](https://www.freedesktop.org/software/systemd/man/tmpfiles.d.html#Configuration%20File%20Format) to describe the two directories celery's log and PID files will reside in. This file is read by `systemd-tmpfiles` at startup and creates the directories our `celery.service` and `celerybeat.service` need to run.

\ /etc/tmpfiles.d/celery.conf

```conf
d /run/celery 0755 celery celery -
d /var/log/celery 0755 celery celery -
```

##### Enable & Test

After enabling our three services, they should now all survive system reboots.

```bash
systemctl enable ratemyderp celery celerybeat
```

If InfluxDB is properly configured, we should now see real-time measurements being reported to influx by the celery beat scheduled tasks in the application.

#### Monitoring

Set up monitoring of our deployment target to InfluxDB. Install [Telegraf](https://www.influxdata.com/time-series-platform/telegraf/) and plugins to report system, service and database metrics to our monitoring instance.

##### Install Telegraf Agent

Follow the [installation guide](https://portal.influxdata.com/downloads/) for Telegraf.

We'll be doing a number of edits to the configuration file, but the `agent` and `outputs` blocks are common to all of them.

\ /etc/telegraf/telegraf.conf

```conf
[agent]
interval="10s"
round_interval=true
metric_batch_size=1000
metric_buffer_limit=10000
collection_jitter="0s"
flush_interval="10s"
flush_jitter="10s"
precision = ""
## Override default hostname, if empty use os.Hostname()
hostname = ""
omit_hostname = false

# system metrics -> telegraf bucket
[[outputs.influxdb_v2]]
  urls=["INFLUX_HOST"]
  token="INFLUX_TOKEN"
  organization="ratemyderp.com"
  bucket="telegraf"
  namepass = ["cpu", "mem", "disk", "diskio", "kernel", "net", "processes", "swap", "system"]

# ratemyderp service/db metrics -> services bucket
[[outputs.influxdb_v2]]
  urls=["INFLUX_HOST"]
  token="INFLUX_TOKEN"
  organization="ratemyderp.com"
  bucket="services"
  namepass=["systemd_units", "postgresql"]
```

##### System Metrics

We start with the community template [linux_system](https://github.com/influxdata/community-templates/tree/master/linux_system).

The telegraf plugin configuration is provided by the template. Simply copy/pasta the input blocks into our `/etc/telegraf/telegraf.conf`.

##### Service Monitoring

Monitor our custom service units using the [systemd_units](https://github.com/influxdata/telegraf/tree/master/plugins/inputs/systemd_units) plugin.

\ /etc/telegraf/telegraf.conf

```conf
[[inputs.systemd_units]]
  pattern = "ratemyderp* celery*"
```

##### Database Metrics

Metrics for PostgreSQL are collected from its [input plugin](https://github.com/influxdata/telegraf/tree/master/plugins/inputs/postgresql).

\ /etc/telegraf/telegraf.conf

```conf
[[inputs.postgresql]]
  address = "host=localhost user=ratemyderp password=<db-pass> sslmode=disable dbname=ratemyderpdb"
  outputaddress = "rmd-db"
  databases = ["ratemyderpdb"]
```

### Disaster Recovery

Since application source and deployment are kept safe in version control, our main disaster recovery focus is with the database and images uploaded to the server.

In addition to local backups, data is sent via `rsync` to a remote fileserver on a regular schedule.

#### Backups User Group

Create a system user group for users with access to the backup directories.

```bash
groupadd backups
usermod -aG backups postgres truenas
chmod 775 -R /opt/ratemyderp/backup
chgrp -R backups /opt/ratemyderp/backup
```

#### Database Backups

Regular backups of the PostgreSQL database are made to a local folder [with a script](https://wiki.postgresql.org/wiki/Automated_Backup_on_Linux).

In addition to routine backups, each time a new deployment is made, a backup is created and saved in `backup/previous-deploy/` before the deployment finishes.

##### `.pgpass` file

Create a file for postgres backup credentials when running `pg_dump`.

\ ~/.pgdump

```conf
hostname:port:database:username:password
```

Don't forget to `chmod 600 ~/.pgpass`.

##### Single Backup

Use this command to run a single backup with a `~/.pgpass` configured.

```bash
pg_dump ratemyderpdb -U ratemyderp -h localhost -Ft -w > ./bak.tar
```

##### Periodic Backups

Periodic backups are handled with a shell script: `utility/db-backup.sh`. This script does basic pruning and rotation and is run on a daily cron schedule.

#### File Backups

User image files located in the application media directory are backed up at regular intervals.

#### Off-site Duplication

All local backups are sent to an off-site target each day via a remote `rsync` pull. The remote pull isn't documented here, for security reasons.
