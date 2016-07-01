'use strict';

var Test = require('tape');
var Path = require('path');
var Swaggerize = require('../lib');
var Hapi = require('hapi');
var StubAuthTokenScheme = require('./fixtures/lib/stub-auth-token-scheme');

Test('test', function (t) {
    var server;

    t.test('string api path', function (t) {
        t.plan(3);

        server = new Hapi.Server();

        server.connection({});

        server.register({
            register: Swaggerize,
            options: {
                api: Path.join(__dirname, './fixtures/defs/pets.json'),
                handlers: Path.join(__dirname, './fixtures/handlers')
            }
        }, function (err) {
            t.error(err, 'No error.');
            t.ok(server.plugins.swagger.api, 'server.plugins.swagger.api exists.');
            t.ok(server.plugins.swagger.setHost, 'server.plugins.swagger.setHost exists.');
        });

    });

    t.test('server', function (t) {
        t.plan(4);

        server = new Hapi.Server();

        server.connection({});

        server.register({
            register: Swaggerize,
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

    t.test('query validation', function (t) {
        var queryStringToStatusCode = {
            'limit=2': 200,
            'tags=some_tag&tags=some_other_tag': 200,
            'limit=2&tags=some_tag&tags=some_other_tag': 200,
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

Test('authentication', function (t) {
    var server;

    var buildValidateFunc = function (allowedToken) {
        return function (token, callback) {
            if (token === allowedToken) {
                return callback(null, true, {});
            }

            callback(null, false);
        }
    };

    t.test('token authentication', function (t) {
        t.plan(5);

        server = new Hapi.Server();

        server.connection({});

        server.register({ register: StubAuthTokenScheme }, function (err) {
            t.error(err, 'No error.');

            server.auth.strategy('api_key', 'stub-auth-token', {
                validateFunc: buildValidateFunc('12345')
            });
            server.auth.strategy('api_key2', 'stub-auth-token', {
                validateFunc: buildValidateFunc('98765')
            });

            server.register({
                register: Swaggerize,
                options: {
                    api: require('./fixtures/defs/pets_authed.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                }
            }, function (err) {
                t.error(err, 'No error.');

                server.inject({
                    method: 'GET',
                    url: '/v1/petstore/pets'
                }, function (response) {
                    t.strictEqual(response.statusCode, 401, '401 status (unauthorized).');

                    server.inject({
                        method: 'GET',
                        url: '/v1/petstore/pets',
                        headers: {
                            authorization: '12345',
                            'custom-header': 'Hello'
                        }
                    }, function (response) {
                        t.strictEqual(response.statusCode, 200, 'OK status.');

                        server.inject({
                            method: 'GET',
                            url: '/v1/petstore/pets',
                            headers: { authorization: '98765' }
                        }, function (response) {
                            t.strictEqual(response.statusCode, 200, 'OK status.');
                        });
                    });
                });
            });
        });
    });
});

Test('form data', function (t) {
    var server;

    t.test('success', function (t) {
        t.plan(3);

        server = new Hapi.Server();

        server.connection({});

        server.register({
            register: Swaggerize,
            options: {
                api: Path.join(__dirname, './fixtures/defs/pets.json'),
                handlers: {
                    upload: {
                        $post: function (req, reply) {
                            t.strictEqual(typeof req.payload, 'object');
                            reply();
                        }
                    }
                }
            }
        }, function (err) {
            t.error(err, 'No error.');
        });

        server.inject({
            method: 'POST',
            url: '/v1/petstore/upload',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            payload: 'name=thing&upload=data'
        }, function (response) {
            t.strictEqual(response.statusCode, 200, 'OK status.');
        });
    });

    t.test('bad content type', function (t) {
        t.plan(1);

        server.inject({
            method: 'POST',
            url: '/v1/petstore/upload',
            payload: 'name=thing&upload=data'
        }, function (response) {
            t.strictEqual(response.statusCode, 400, '400 status.');
        });
    });

    t.test('invalid payload', function (t) {
        t.plan(1);

        server.inject({
            method: 'POST',
            url: '/v1/petstore/upload',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            payload: 'name=thing&upload='
        }, function (response) {
            t.strictEqual(response.statusCode, 400, '400 status.');
        });
    });
});

Test('yaml', function (t) {
    t.test('yaml', function (t) {
        t.plan(4);

        var server = new Hapi.Server();

        server.connection({});

        server.register({
            register: Swaggerize,
            options: {
                api: Path.join(__dirname, './fixtures/defs/pets.yaml'),
                handlers: Path.join(__dirname, './fixtures/handlers')
            }
        }, function (err) {
            t.error(err, 'No error.');
            t.ok(server.plugins.swagger.api, 'server.plugins.swagger.api exists.');
            t.ok(server.plugins.swagger.setHost, 'server.plugins.swagger.setHost exists.');
        });

        server.inject({
            method: 'GET',
            url: '/v1/petstore/pets'
        }, function (response) {
            t.strictEqual(response.statusCode, 200, 'OK status.');
        });

    });
});
