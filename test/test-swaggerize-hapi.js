'use strict';

const Test = require('tape');
const Path = require('path');
const Swaggerize = require('../lib');
const Hapi = require('hapi');

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

    t.test('api docs change path', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    docs: {
                        path: '/spec'
                    }
                }
            });

            const response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/spec'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);
        }
        catch (error) {
            t.fail(error.message);
        }
    });

    t.test('api docs change path old way', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    docspath: '/spec'
                }
            });

            const response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/spec'
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



Test('yaml', function (t) {
    t.test('yaml', async function (t) {
        t.plan(2);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.yaml'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            t.ok(server.plugins.swagger.getApi, 'server.plugins.swagger.getApi exists.');
            t.ok(server.plugins.swagger.setHost, 'server.plugins.swagger.setHost exists.');
        }
        catch (error) {
            console.log(error.stack)
            //t.fail(error.message);
        }

    });
});
