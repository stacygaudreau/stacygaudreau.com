---
title: 'How to Monitor Python and Django Applications in Real Time with InfluxDB'
description: 'Collecting real time application metrics and performance measurements is made easy with a timeseries database like InfluxDB.'
categories: ['Monitoring', 'Databases']
tags: ['InfluxDB', 'Python', 'Django']
date: 2022-03-10T16:11:00-05:00
draft: true
type: 'blog'
---

## Requirements

Setting up an InfluxDB deployment is out of the scope of this guide, but you can check out my how-to here [link].

The quickest way to get up and running is to [sign up for a free account](https://cloud2.influxdata.com/signup) with InfluxData. They offer a limited but very useful free cloud tier of InfluxDB.

\Note: InfluxDB Versions

> This guide is for **Influxdb v2.0**, _not_ an older version like v1.6. The query language (Flux) and infrastructure changed significantly, along with the Python client.

## Setup

Set everything up

### InfluxDB Bucket

Create and configure a storage bucket to dump data into.

### Python Packages

Install the Python client to your project's virtual environment.

```bash
pip install influxdb-client
```

## Django Configuration

Adding django.settings vars for InfluxDB, note on Celery tasks if using but omitted for demo purposes.

## Connect to Influx

Show building influx connection `utils` module, batch writing etc, some connection examples

## Writing Data

Using the Python client to write data

### Data Points

Structure to use

### Tags vs. Fields

Explain tags vs fields, give example using species as tag

## Django Application Measurements

Now that we know how to package up data points and send them off to InfluxDB, let's write some functions to get some actual measurement data from our application. We're going to develop some examples of real application-level measurements.

### Model Statistics

Getting time series measurements from our database models is as easy as making some queries in our application, and then sending the results of those queries off as data points to our InfluxDB bucket.

Our Django application has two models which we are interested in developing some measurements for.

\ `"Derps"? The heck are those?`

> Funny you should ask. This example is based on a live web application called [Rate My Derp!](https://ratemyderp.com)
>
> Derps are the main focus of the app, and are basically photos of cute, funny or "derpy" looking pet animals which the user submits.
>
> So, our `Derps` model is really just a **pet animal** of some sort.

\stats/measurements.py

```python
def measure_derps_n_derps():
    """
    Measures number of derps by species.
    Returns meausurements as a list of InfluxDB data points.
    """
    records = []
    for species in Derp.Species:
        # count number of records for each species
        count = Derp.objects.filter(species=species).count()
        # make a data point for each
        point = (
            Point("derps")
            .tag("species", species.name.lower())
            .field("count", count)
        )
        records.append(point)
    return records
```

n_derps, n_views/visits, difference between tags and fields (species tags)

### Aggregate Count For All Species

If your Flux query language is rusty and you're the "learn from video" type, [Rawkode Academy on YouTube](https://youtu.be/1jbxhuZ7m0E) is a good resource.

Now that we've got our model counts tagged by species, we're interested in having a nice dashboard display the total number of all species _combined_. Let's build a Flux query for that. I'm using the query editor built into the InfluxDB user interface.

First, we query all derp counts for the past five minutes.

\Derp counts for -5m

```java
derpCount = from(bucket: "ratemyderp")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "derps" and r._field == "count")
  |> yield()
```

![Derp query results ordered by species](./images/derps-count-no-grouping.png 'Raw data output before combining species counts')

Looking at the raw data, we can see it's not really giving us what we want. How do we sum the species counts together?

The answer is to use the Flux `group()` function. This can be a difficult concept to learn if you--like myself when starting with Flux--are most familiar with typical relational databases.

Right now our data is "grouped" by the default [group key](https://docs.influxdata.com/influxdb/cloud/query-data/flux/group-data/#group-keys), and it's not working for us. We're going to change the key we are grouping our columnar data by.

What we want to do is grab all of our counts for individual species, and add them all up, so that we can display a nice graph and numerical count of derps in the database at any given time on our dashboard.

Since this is a _time series_ database, we've also got to decide what kind of time window to group our data by.This is a pretty simple example since we just want to add up the total number of derps at _any_ given time. In other words: group by each timestamp.

Turns out, that's pretty easy. Our grouping function call looks like: `group(columns: ["_time"])` which says "group data by unique records in the timestamp column".

![Derp query results after grouping](./images/derps-count-grouped-time.png 'Raw flux output after grouping our derp counts by timestamp.')

Looking at our raw data output again, pay attention to the number of **tables**. There are now as many tables as there are timestamps in the range/interval we have specified. Which is exactly what we want: one point on our graph for each timestamp.

Lastly, we've just got to `sum()` up the results for a total count. Flux provides a nice function for this.

Putting it all together, we can finally get a

```java
derpCount = from(bucket: "ratemyderp")
  |> range(start: -60s)
  |> filter(fn: (r) => r._measurement == "derps" and r._field == "count")
  |> group(columns: ["_time"])
  |> sum()
  |> yield()
```

\Still confused?

> Check out [Pivoting Data in Flux](https://www.influxdata.com/blog/how-to-pivot-data-flux-columnar-data/) for an even better explanation than I can give -- straight from the people at Influx.

```java
derpCount = from(bucket: "ratemyderp")
  |> range(start: -60s)
  |> filter(fn: (r) => r._measurement == "derps" and r._field == "count")
  |> group(columns: ["_time"])
  |> sum()
  |> yield()
```

## Django System Measurements

Using `django-influx-v2` to make django-specific measurements.
Link to open source repo for package.

### Users

Capturing user activity (active users, n_logins etc.)

### Views

View activity or whatever the metric is

### PostgreSQL Database

DB metrics/performance from Django.

Images can be figures with captions and alt text, eg:
![An image alt text](./images/1.png 'A caption for an image/figure.')
