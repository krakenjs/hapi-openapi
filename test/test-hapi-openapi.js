'use strict';

const Test = require('tape');
const Path = require('path');
const OpenAPI = require('../lib');
const Hapi = require('@hapi/hapi');

Test('test plugin', function (t) {

    t.test('register', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
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

    t.test('register with cors options', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    cors: {
                        origin: ["*"],
                        maxAge: 86400,
                        headers: ["Accept", "Authorization", "Content-Type", "If-None-Match"],
                        exposedHeaders: ["x-count", "link"]
                    }
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

    t.test('register with boolean cors', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    cors: true
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

    t.test('register with object api', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Test Object API',
                version: '1.0.0'
            },
            host: 'example.com',
            consumes: [
                'application/json'
            ],
            produces: [
                'application/json'
            ],
            paths: {
                '/test': {
                    get: {
                        operationId: 'testGet',
                        responses: {
                            200: {
                                description: 'default response'
                            }
                        }
                    }
                }
            }
        };

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            get(request, h) {
                                return;
                            }
                        }
                    }
                }
            });

            t.ok(server.plugins.openapi.getApi, 'server.plugins.openapi.api exists.');
            t.ok(server.plugins.openapi.setHost, 'server.plugins.openapi.setHost exists.');

            server.plugins.openapi.setHost('api.paypal.com');

            t.strictEqual(server.plugins.openapi.getApi().host, 'api.paypal.com', 'server.plugins.openapi.setHost set host.');
        }
        catch (error) {
            console.log(error.stack)
            t.fail(error.message);
        }

    });

    t.test('register with optional query parameters does not change "request.orig"', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Test Optional Query Params',
                version: '1.0.0'
            },
            paths: {
                '/test': {
                    get: {
                        parameters: [
                            {
                                name: 'optionalParameter',
                                in: 'query',
                                required: false,
                                type: 'string',
                            },
                        ],
                        responses: {
                            200: {
                                description: 'OK'
                            }
                        }
                    }
                }
            }
        };

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            get(request, h) {
                                return request.orig;
                            }
                        }
                    }
                }
            });

            const { result } = await server.inject({
                method: 'GET',
                url: '/test'
            });
            t.ok(Object.entries(result.query).length === 0, 'request.orig was not modified');
        }
        catch (error) {
            t.fail(error.message);
        }
    });

    t.test('api docs', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
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

            const body = JSON.parse(response.payload);

            t.equal(body.info['x-meta'], undefined, 'stripped x-');
            t.equal(body.paths['/pets'].get.parameters[0]['x-meta'], undefined, 'stripped x- from array.');
        }
        catch (error) {
            t.fail(error.message);
        }
    });

    t.test('api docs strip vendor extensions false', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    docs: {
                        stripExtensions: false
                    }
                }
            });

            const response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/api-docs'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            const body = JSON.parse(response.payload);

            t.equal(body.info['x-meta'], 'test');
            t.equal(body.paths['/pets'].get.parameters[0]['x-meta'], 'test');
        }
        catch (error) {
            t.fail(error.message);
        }
    });

    t.test('api docs auth false', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    docs: {
                        auth: false
                    }
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
                plugin: OpenAPI,
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

    t.test('api docs change path (with no basepath prefix)', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers'),
                    docs: {
                        path: '/spec',
                        prefixBasePath: false
                    }
                }
            });

            const response = await server.inject({
                method: 'GET',
                url: '/spec'
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
                plugin: OpenAPI,
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

    t.test('minimal api spec support', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Minimal',
                version: '1.0.0'
            },
            paths: {
                '/test': {
                    get: {
                        responses: {
                            200: {
                                description: 'default response'
                            }
                        }
                    }
                }
            }
        };

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            get(request, h) {
                                return 'test';
                            }
                        }
                    }
                }
            });

            let response = await server.inject({
                method: 'GET',
                url: '/test'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('trailing slashes', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Minimal',
                version: '1.0.0'
            },
            paths: {
                '/test/': {
                    get: {
                        responses: {
                            200: {
                                description: 'default response'
                            }
                        }
                    }
                }
            }
        };

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            get(request, h) {
                                return 'test';
                            }
                        }
                    }
                }
            });

            let response = await server.inject({
                method: 'GET',
                url: '/test/'
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
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });
            response = await server.inject({
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
                payload: `name: 123`
            });

            t.strictEqual(response.statusCode, 400, `${response.request.path} payload bad.`);
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
                plugin: OpenAPI,
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

    t.test('routes with output validation', async function (t) {
        t.plan(5);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
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
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
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

    t.test('routes x-handler', async function (t) {
        t.plan(4);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets_xhandlers.json')
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
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            const queryStringToStatusCode = {
                'limit=2': 200,
                'tags=some_tag&tags=some_other_tag': 200,
                'tags=single_tag': 200,
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

    t.test('query validation with arrays', async function (t) {

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: {
                        swagger: '2.0',
                        info: {
                            title: 'Minimal',
                            version: '1.0.0'
                        },
                        paths: {
                            '/test': {
                                get: {
                                    description: '',
                                    parameters: [
                                        {
                                            name: 'tags',
                                            in: 'query',
                                            required: false,
                                            type: 'array',
                                            items: {
                                                type: 'string'
                                            },
                                            collectionFormat: 'csv'
                                        }
                                    ],
                                    responses: {
                                        200: {
                                            description: 'default response'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    handlers: {
                        test: {
                            get(request, h) {
                                t.ok(request.query.tags, 'query exists.');
                                t.equal(request.query.tags.length, 2, 'two array elements.');
                                t.equal(request.query.tags[0], 'some_tag', 'values correct.');
                                return 'test';
                            }
                        }
                    }
                }
            });

            const response = await server.inject({
                method: 'GET',
                url: '/test?tags=some_tag,some_other_tag'
            });

            t.strictEqual(response.statusCode, 200, 'csv format supported.');

            t.end();
        }
        catch (error) {
            t.fail(error.message);
        }
    });

    t.test('parse description from api definition', async function (t) {
        t.test('do not break with empty descriptions', async function (t) {
            t.plan(1);

            const server = new Hapi.Server();

            try {
                await server.register({
                    plugin: OpenAPI,
                    options: {
                        api: {
                            swagger: '2.0',
                            info: {
                                title: 'Minimal',
                                version: '1.0.0'
                            },
                            paths: {
                                '/test': {
                                    get: {
                                        description: '',
                                        responses: {
                                            200: {
                                                description: 'default response'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        handlers: {
                            test: {
                                get(request, h) {
                                    return 'test';
                                }
                            }
                        }
                    }
                });

                t.pass();
            } catch (error) {
                t.fail(error.message);
            }
        });

        t.test('create the right description for the route', async function (t) {
            t.plan(1);

            const server = new Hapi.Server();

            try {
                await server.register({
                    plugin: OpenAPI,
                    options: {
                        api: {
                            swagger: '2.0',
                            info: {
                                title: 'Minimal',
                                version: '1.0.0'
                            },
                            paths: {
                                '/test': {
                                    get: {
                                        description: 'A simple description for the route',
                                        responses: {
                                            200: {
                                                description: 'default response'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        handlers: {
                            test: {
                                get(request, h) {
                                    return 'test';
                                }
                            }
                        }
                    }
                });

                const response = await server.inject({ method: 'GET', url: '/test' });
                t.strictEqual(response.request.route.settings.description, 'A simple description for the route');
            } catch (error) {
                t.fail(error.message);
            }
        });
    });

    t.test('hapi payload options (assert via parse:false)', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Minimal',
                version: '1.0.0'
            },
            paths: {
                '/test': {
                    post: {
                        'x-hapi-options': {
                            payload: {
                                parse: false
                            }
                        },
                        parameters: [
                            {
                                name: 'thing',
                                in: 'body',
                                schema: {
                                    type: 'object',
                                    properties: {
                                        id: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        ],
                        responses: {
                            200: {
                                description: 'default response'
                            }
                        }
                    }
                }
            }
        };

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            post() {
                                return 'test';
                            }
                        }
                    }
                }
            });

            let response = await server.inject({
                method: 'POST',
                url: '/test',
                payload: {
                    id: 1 //won't fail because parse is false
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('hapi allowUnknown request payload properties', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Minimal',
                version: '1.0.0'
            },
            paths: {
                '/test': {
                    post: {
                        'x-hapi-options': {
                            validate: {
                                options: {
                                    allowUnknown: true
                                }
                            }
                        },
                        parameters: [
                            {
                                name: 'thing',
                                in: 'body',
                                schema: {
                                    type: 'object',
                                    properties: {
                                        id: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        ],
                        responses: {
                            200: {
                                description: 'default response'
                            }
                        }
                    }
                }
            }
        };

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            post() {
                                return 'test';
                            }
                        }
                    }
                }
            });

            let response = await server.inject({
                method: 'POST',
                url: '/test',
                payload: {
                    id: 'string-id',
                    excessive: 42
                }
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('hapi array parameters', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Minimal',
                version: '1.0.0'
            },
            paths: {
                '/test': {
                    post: {
                        parameters: [
                            {
                                name: 'body',
                                in: 'body',
                                schema: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            name: {
                                                type: "string"
                                            },
                                            breed: {
                                                type: "string"
                                            }
                                        }
                                    }
                                }
                            }
                        ],
                        responses: {
                            200: {
                                description: 'default response'
                            }
                        }
                    }
                }
            }
        };

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            post() {
                                return 'test';
                            }
                        }
                    }
                }
            });

            let response = await server.inject({
                method: 'POST',
                url: '/test',
                payload: [
                    {
                        name: 'Fido',
                        breed: 'Pointer'
                    },
                    {
                        name: 'Frodo',
                        breed: 'Beagle'
                    }
                ]
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('hapi operation tags', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Minimal',
                version: '1.0.0'
            },
            paths: {
                '/test': {
                    get: {
                        tags: [
                            'sample1',
                            'sample2'
                        ],
                        responses: {
                            200: {
                                description: 'default response'
                            }
                        }
                    }
                }
            }
        };
        const expectedTags = ['api', 'sample1', 'sample2']

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            get() {
                                return 'test';
                            }
                        }
                    }
                }
            });

            let response = await server.inject({
                method: 'GET',
                url: '/test'
            });
            const responsteTags = response.request.route.settings.tags

            t.deepEqual(responsteTags, expectedTags, 'additional tags successfully configured');

        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('hapi operation tags omitted', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        const api = {
            swagger: '2.0',
            info: {
                title: 'Minimal',
                version: '1.0.0'
            },
            paths: {
                '/test': {
                    get: {
                        responses: {
                            200: {
                                description: 'default response'
                            }
                        }
                    }
                }
            }
        };
        const expectedDefaultTags = ['api']

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api,
                    handlers: {
                        test: {
                            get() {
                                return 'test';
                            }
                        }
                    }
                }
            });

            let response = await server.inject({
                method: 'GET',
                url: '/test'
            });
            const responsteTags = response.request.route.settings.tags

            t.deepEqual(responsteTags, expectedDefaultTags, 'returned default tags');

        }
        catch (error) {
            t.fail(error.message);
        }

    });

});

Test('multi-register', function (t) {

    const api1 = {
        swagger: '2.0',
        info: {
            title: 'API 1',
            version: '1.0.0'
        },
        basePath: '/api1',
        paths: {
            '/test': {
                get: {
                    responses: {
                        200: {
                            description: 'default response'
                        }
                    }
                }
            }
        }
    };

    const api2 = {
        swagger: '2.0',
        info: {
            title: 'API 2',
            version: '1.0.0'
        },
        basePath: '/api2',
        paths: {
            '/test': {
                get: {
                    responses: {
                        200: {
                            description: 'default response'
                        }
                    }
                }
            }
        }
    };

    t.test('support register multiple', async function (t) {
        t.plan(2);

        const server = new Hapi.Server();

        try {
            await server.register([
                {
                    plugin: OpenAPI,
                    options: {
                        api: api1,
                        handlers: {
                            test: {
                                get(request, h) {
                                    return 'test';
                                }
                            }
                        }
                    }
                },
                {
                    plugin: OpenAPI,
                    options: {
                        api: api2,
                        handlers: {
                            test: {
                                get(request, h) {
                                    return 'test';
                                }
                            }
                        }
                    }
                }
            ]);

            let response = await server.inject({
                method: 'GET',
                url: '/api1/test'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

            response = await server.inject({
                method: 'GET',
                url: '/api2/test'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);

        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('support fail on conflicts', async function (t) {
        t.plan(1);

        const server = new Hapi.Server();

        try {
            await server.register([
                {
                    plugin: OpenAPI,
                    options: {
                        api: api1,
                        docs: {
                            path: 'docs1'
                        },
                        handlers: {
                            test: {
                                get(request, h) {
                                    return 'test';
                                }
                            }
                        }
                    }
                },
                {
                    plugin: OpenAPI,
                    options: {
                        api: api1,
                        docs: {
                            path: 'docs2'
                        },
                        handlers: {
                            test: {
                                get(request, h) {
                                    return 'test';
                                }
                            }
                        }
                    }
                }
            ]);

            t.fail('should have errored');
        }
        catch (error) {
            t.pass('expected failure');
        }

    });

});

Test('yaml support', function (t) {
    t.test('register', async function (t) {
        t.plan(3);

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.yaml'),
                    handlers: Path.join(__dirname, './fixtures/handlers')
                }
            });

            t.ok(server.plugins.openapi.getApi, 'server.plugins.openapi.getApi exists.');
            t.ok(server.plugins.openapi.setHost, 'server.plugins.openapi.setHost exists.');

            const response = await server.inject({
                method: 'GET',
                url: '/v1/petstore/pets'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);
        }
        catch (error) {
            t.fail(error.message);
        }

    });
});
