'use strict';

var Test = require('tape'),
    Path = require('path'),
    Swaggerize = require('../lib'),
    Hapi = require('hapi');

Test('test', function (t) {
    var server;

    t.test('server', function (t) {
        t.plan(1);

        var settings = {
            api: require('./fixtures/defs/pets.json'),
            handlers: Path.join(__dirname, './fixtures/handlers')
        };

        server = new Hapi.Server();

        server.pack.register({
            plugin: Swaggerize,
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
