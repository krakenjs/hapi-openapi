'use strict';

const Test = require('tape');
const Path = require('path');
const OpenAPI = require('../lib');
const Hapi = require('hapi');

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

    t.test('api docs', async function (t) {
        t.plan(1);

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

    t.test('parse description from api definition', async function(t) {
        t.test('do not break with empty descriptions', async function(t) {
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

        t.test('create the right description for the route', async function(t) {
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
