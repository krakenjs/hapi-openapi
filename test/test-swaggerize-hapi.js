'use strict';

const Test = require('tape');
const Path = require('path');
const Swaggerize = require('../lib');
const Hapi = require('hapi');

Test('test plugin', function (t) {

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

});
