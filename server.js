var prometheus = require('prometheus-wrapper');
var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
const Joi = require('joi');

var app = express();
app.use(bodyParser.json());

prometheus.setNamespace('promgateway');

var server = http.createServer(app);
var metricNames = [];
var port = 5000, ip = '0.0.0.0';

app.route('/confer').get((req,res) => {
    res.end(prometheus.getMetrics());
});

app.route('/metrics').get((req, res) => {
    var response = prometheus.getMetrics();
    metricNames.forEach(v => {
        var metric = prometheus.get(v);
        if(metric !== undefined)
            if(metric.get().type === "gauge")
                metric.set(0);

    });
    res.end(response);
});

app.route('/metrics').post((req, res) => {
    const schema = {
        metricName: Joi.string().required(),
        metricValue: Joi.string().required(),
        metricHelp: Joi.string().required(),
        metricType: Joi.string().required(),
        metricLabels: Joi.array().allow()
    };

    const result = Joi.validate(req.body, schema);

    if(result.error)
    {
        res.status(400).send(result.error.details[0].message);
        return;
    }

    var metric = req.body;
    var metricName = metric.metricName;// req.params.name;
    var metricValue = metric.metricValue; // req.params.value;
    var metricHelp = metric.metricHelp;
    var metricType = metric.metricType;
    var metricLabels = metric.metricLabels;
    if(prometheus.get(metricName) === undefined){
        switch(metricType){
            case "gauge":
                prometheus.createGauge(metricName, metricHelp, metricLabels);
            break;
            case "counter":
                prometheus.createCounter(metricName, metricHelp, metricLabels);
            break;
        }
        
        metricNames.push(metricName);
    }
    prometheus.get(metricName).inc(parseInt(metricValue));
    res.status(201);
    res.end();
});


server.listen(port, ip);