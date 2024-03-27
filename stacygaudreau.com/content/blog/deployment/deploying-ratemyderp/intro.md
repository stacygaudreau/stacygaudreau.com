---
heading: 'Introduction'
---

This article details the deployment of a production-grade Django/Python web application to a "bare metal" Linux VM. 

To gain the most experience possible, we are not using a PaaS or docker-based deployment. Instead, we will spin up an **Ubuntu** virtual machine and configure everything, including **postgres** database, **redis** and any required **systemd** service units that manage the services needed to run the application.