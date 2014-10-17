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
            handlers: Path.join(__dirname, './fixtures/handlers'),
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

        server.inject({
            method: 'GET',
            url: '/pets'
        }, function (response) {
            t.strictEqual(response.statusCode, 200, 'OK status.');
        });
    });

    t.test('apis', function (t) {
        t.plan(3);

        server.inject({
            method: 'GET',
            url: '/pets'
        }, function (response) {
            t.strictEqual(response.statusCode, 200, 'OK status.');
        });

        server.inject({
            method: 'POST',
            url: '/pets',
        }, function (response) {
            t.strictEqual(response.statusCode, 400, '400 status (required param missing).');
        });

        server.inject({
            method: 'POST',
            url: '/pets',
            payload: JSON.stringify({
                id: 0,
                name: 'Cat'
            })
        }, function (response) {
            //console.log(response);
            t.strictEqual(response.statusCode, 200, 'OK status.');
        });
    });

});
