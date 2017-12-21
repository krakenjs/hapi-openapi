'use strict';

var Test = require('tape');
var Path = require('path');
var Swaggerize = require('../lib');
var Hapi = require('hapi');
var StubAuthTokenScheme = require('./fixtures/lib/stub-auth-token-scheme');

Test('test', function (t) {

    t.test('register', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });
            t.ok(server.plugins.swagger.getApi, 'server.plugins.swagger.api exists.');
            t.ok(server.plugins.swagger.setHost, 'server.plugins.swagger.setHost exists.');

            server.plugins.swagger.setHost('api.paypal.com');

            t.strictEqual(server.plugins.swagger.getApi().host, 'api.paypal.com', 'server.plugins.swagger.setHost set host.');
        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('api docs', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            const response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/api-docs'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);
        }
        catch (error) {
            t.fail(error.message);
        }
    });


    t.test('routes', async function (t) {
        t.plan(5);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            let response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: JSON.stringify({
                    id: 0,
                    name: 'Cat'
                })
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets/0'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'DELETE',
                url: '/v1/petstore/pets/0'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

        }
        catch (error) {
            t.fail(error.message);
        }

    });


    t.test('query validation', async function (t) {

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            const queryStringToStatusCode = {
                'limit=2': 200,
                'tags=some_tag&tags=some_other_tag': 200,
                'limit=2&tags=some_tag&tags=some_other_tag': 200,
                'limit=a_string': 400
            }

            for (const queryString in queryStringToStatusCode) {
                const response = await server.inject({
                    method: 'GET',
                    url: '/v1/petstore/pets?' + queryString
                });

                t.strictEqual(response.statusCode, queryStringToStatusCode[queryString], queryString);
            }

            t.end();
        }
        catch (error) {
            t.fail(error.message);
        }
    });

});

Test.only('authentication', function (t) {

    const buildValidateFunc = function (allowedToken) {
        return async function (token) {
            if (token === allowedToken) {
                return {};
            }

            return null;
        }
    };

    t.test('token authentication', async function (t) {
        t.plan(2);

        const server = new Hapi.Server();

        try {
            await server.register({ plugin: StubAuthTokenScheme });

            server.auth.strategy('api_key', 'stub-auth-token', {
                validateFunc: buildValidateFunc('12345')
            });

            server.auth.strategy('api_key2', 'stub-auth-token', {
                validateFunc: buildValidateFunc('98765')
            });

            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets_authed.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            let response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets'
            });

            t.strictEqual(response.statusCode, 401, `${response.request.path} unauthorized.`);

            response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets',
                headers: {
                    authorization: '12345',
                    'custom-header': 'Hello'
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK when authorized.`);
        }
        catch (error) {
            t.fail(error.message);
        }
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
            if (err) {
                console.log(err);
            }
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
