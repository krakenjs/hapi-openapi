'use strict';

var Test = require('tape'),
    Path = require('path'),
    Swaggerize = require('../lib'),
    Hapi = require('hapi');

Test('test', function (t) {
    var server;

    t.test('server', function (t) {
        t.plan(4);

        server = new Hapi.Server();

        server.pack.register({
            plugin: Swaggerize,
            options: {
                api: require('./fixtures/defs/pets.json'),
                handlers: Path.join(__dirname, './fixtures/handlers'),
            }
        }, function (err) {
            t.error(err, 'No error.');
            t.ok(server.plugins.swagger.api, 'server.plugins.swagger.api exists.');
            t.ok(server.plugins.swagger.setHost, 'server.plugins.swagger.setHost exists.');

            server.plugins.swagger.setHost('api.paypal.com');

            t.strictEqual(server.plugins.swagger.api.host, 'api.paypal.com', 'server.plugins.swagger.setHost set host.');
        });

    });

    t.test('api docs', function (t) {
        t.plan(1);

        server.inject({
            method: 'GET',
            url: '/v1/petstore/api-docs'
        }, function (response) {
            t.strictEqual(response.statusCode, 200, 'OK status.');
        });
    });

    t.test('apis', function (t) {
        t.plan(7);

        server.inject({
            method: 'GET',
            url: '/v1/petstore/pets'
        }, function (response) {
            t.strictEqual(response.statusCode, 200, 'OK status.');

            server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
            }, function (response) {
                t.strictEqual(response.statusCode, 400, '400 status (required param missing).');

                server.inject({
                    method: 'POST',
                    url: '/v1/petstore/pets',
                    payload: JSON.stringify({
                        id: 0,
                        name: 'Cat'
                    })
                }, function (response) {
                    t.strictEqual(response.statusCode, 200, 'OK status.');

                    server.inject({
                        method: 'GET',
                        url: '/v1/petstore/pets/0'
                    }, function (response) {
                        t.strictEqual(response.statusCode, 200, 'OK status.');
                        t.ok(response.result, 'Result exists.');

                        server.inject({
                            method: 'DELETE',
                            url: '/v1/petstore/pets/0'
                        }, function (response) {
                            t.strictEqual(response.statusCode, 200, 'OK status.');
                            t.ok(response.result, 'Result does not exist anymore.');
                        });

                    });

                });

            });

        });

    });

    t.test('validation', function (t) {
        t.test('query', function(t) {
            var queryStringToStatusCode = {
                'limit=2': 200,
                'limit=a_string': 400
            }

            t.plan(Object.keys(queryStringToStatusCode).length);

            for (var queryString in queryStringToStatusCode) {
                (function(queryString, expectedStatusCode) {
                    server.inject({
                        method: 'GET',
                        url: '/v1/petstore/pets?' + queryString
                    }, function (response) {
                        t.strictEqual(response.statusCode, expectedStatusCode, queryString);
                    });
                })(queryString, queryStringToStatusCode[queryString]);
            }
        });
    });


});
