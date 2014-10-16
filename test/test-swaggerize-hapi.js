'use strict';

var test = require('tape'),
    path = require('path'),
    swaggerize = require('../lib'),
    hapi = require('hapi');

test('test', function (t) {
    var server;

    t.test('server', function (t) {
        t.plan(1);

        var settings = {
            api: require('./fixtures/defs/pets.json'),
            handlers: path.join(__dirname, './fixtures/handlers')
        };

        server = new hapi.Server();

        server.pack.register({
            plugin: swaggerize,
            options: settings
        }, function (err) {
            t.error(err);
        });
    });

    t.test('api docs', function (t) {
        t.plan(1);

        server.inject('/api-docs', function (response) {
            t.strictEqual(response.statusCode, 200);
        });
    });

});
