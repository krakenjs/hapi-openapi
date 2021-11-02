'use strict';

const Test = require('tape');
const Path = require('path');
const OpenAPI = require('../lib');
const Hapi = require('@hapi/hapi');
const StubAuthTokenScheme = require('./fixtures/lib/stub-auth-token-scheme');

Test('test plugin', function (t) {
    t.test('basic API', async function (t) {
        t.plan(8);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/openapi3/defs/pets.yaml'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });
            t.ok(server.plugins.openapi.getApi, 'server.plugins.openapi.api exists.');
            t.ok(server.plugins.openapi.setHost, 'server.plugins.openapi.setHost exists.');

            server.plugins.openapi.setHost('api.paypal.com');

            t.strictEqual(server.plugins.openapi.getApi().host, 'api.paypal.com', 'server.plugins.openapi.setHost set host.');

            let response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);            

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    id: '0',
                    name: 'Cat'
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    name: 123
                }
            });

            t.strictEqual(response.statusCode, 400, `${response.request.path} payload bad.`);

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

    t.test('validate yaml', async function (t) {
        t.plan(2);

        const server = new Hapi.Server();

        try {           
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/openapi3/defs/pets.yaml'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });
            let response = await server.inject({
                method: 'POST',
                headers: {"content-type": "text/x-yaml"},
                url: '/v1/petstore/pets',
                payload: "id: '0'\nname: 'Cat'"
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'POST',
                headers: {"content-type": "text/x-yaml"},
                url: '/v1/petstore/pets',
                payload: `id: '0'\nname_does_not_exists: 'Cat'`
            });

            t.strictEqual(response.statusCode, 400, `${response.request.path} payload bad.`);
        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('routes with output validation', async function (t) {
        t.plan(5);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/openapi3/defs/pets.yaml'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    outputvalidation: true
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
                payload: {
                    id: '0',
                    name: 'Cat'
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    name: 123
                }
            });

            t.strictEqual(response.statusCode, 400, `${response.request.path} payload bad.`);

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

    t.test('output validation fails', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/openapi3/defs/pets.yaml'),
                    handlers: {
                        pets: {
                            '{id}': {
                                get(req, h) {
                                    return 'bad response type';
                                }
                            }
                        }
                    },
                    outputvalidation: true
                }
            });

            const response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets/0'
            });

            t.strictEqual(response.statusCode, 500, `${response.request.path} failed.`);
        }
        catch (error) {
            t.fail(error.message);
        }
    });

    t.test('additional type properties', async function (t) {
        t.plan(11);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/openapi3/defs/pets-types.yaml'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    outputvalidation: true
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
                payload: {
                    id: '0',
                    name: 'Cat',
                    coupon: 97
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    id: '0',
                    name: 'Cat',
                    coupon: 'Welcome'
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    id: '0',
                    name: 'Dog',
                    coupon: false
                }
            });

            t.strictEqual(response.statusCode, 400, `${response.request.path} payload bad.`);
            
            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    id: '0',
                    name: 'Cat',
                    birthday: '2006-01-02'
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    id: '0',
                    name: 'Dog',
                    birthday: null
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);            

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    id: '0',
                    name: 'Dog',
                    birthday: ''
                }
            });

            t.strictEqual(response.statusCode, 400, `${response.request.path} payload bad.`);

            response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/pets',
                payload: {
                    id: '0',
                    name: 'Dog',
                    birthday: 'yesterday'
                }
            });

            t.strictEqual(response.statusCode, 400, `${response.request.path} payload bad.`);

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

    t.test('security object', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        try {
            await server.register({ plugin: StubAuthTokenScheme });

            server.auth.strategy('api_key', 'stub-auth-token', {
                validateFunc: StubAuthTokenScheme.buildValidateFunc('12345')
            });

            server.auth.strategy('api_key2', 'stub-auth-token', {
                validateFunc: StubAuthTokenScheme.buildValidateFunc('98765')
            });

            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/openapi3/defs/pets_authed.yaml'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });
            t.ok(server.plugins.openapi.getApi, 'server.plugins.openapi.api exists.');
            t.ok(server.plugins.openapi.setHost, 'server.plugins.openapi.setHost exists.');

            server.plugins.openapi.setHost('api.paypal.com');

            t.strictEqual(server.plugins.openapi.getApi().host, 'api.paypal.com', 'server.plugins.openapi.setHost set host.');
        }
        catch (error) {
            t.fail(error.message);
        }
    });    
});
