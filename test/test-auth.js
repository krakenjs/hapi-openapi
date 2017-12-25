'use strict';

const Test = require('tape');
const Path = require('path');
const Swaggerize = require('../lib');
const Hapi = require('hapi');
const StubAuthTokenScheme = require('./fixtures/lib/stub-auth-token-scheme');

Test('authentication', function (t) {

    const buildValidateFunc = function (allowedToken) {
        return async function (token) {

            if (token === allowedToken) {
                return { credentials: { scope: [ 'api1:read' ] }, artifacts: { }};
            }

            return {};
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

            t.strictEqual(response.statusCode, 401, `${response.request.path} unauthenticated.`);

            response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets',
                headers: {
                    authorization: '12345',
                    'custom-header': 'Hello'
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK when authorized and authenticated.`);
        }
        catch (error) {
            t.fail(error.message);
        }
    });

    t.test('unauthorized', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        try {
            await server.register({ plugin: StubAuthTokenScheme });

            server.auth.strategy('api_key', 'stub-auth-token', {
                validateFunc: async function (token) {
                    return { credentials: { scope: [ 'api3:read' ] }, artifacts: { }};
                }
            });

            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets_authed.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            const response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets',
                headers: {
                    authorization: '12345'
                }
            });

            t.strictEqual(response.statusCode, 403, `${response.request.path} unauthorized.`);
        }
        catch (error) {
            t.fail(error.message);
        }
    });
});

Test('authentication with x-auth', function (t) {

    t.test('authenticated', async function (t) {
        t.plan(2);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets_xauthed.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            let response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets'
            });

            t.strictEqual(response.statusCode, 401, `${response.request.path} unauthenticated.`);

            response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets',
                headers: {
                    authorization: '12345'
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK when authorized and authenticated.`);
        }
        catch (error) {
            t.fail(error.message);
        }
    });

});
