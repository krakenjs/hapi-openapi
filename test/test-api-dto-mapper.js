'use strict';

const Test = require('tape');
const Path = require('path');
const Mapper = require('../lib/api-dto-mapper');

Test('api dto mapper', (t) => {

    const baseOas2Doc = {
        swagger: '2.0',
        info: {
            title: 'oas2',
            version: '1',
        },
    };

    const baseOas3Doc = {
        openapi: '3.0.0',
        info: {
            title: 'oas3',
            version: '1',
        },
    };

    t.test('maps basePath', async (t) => {
        t.plan(2);

        const oas2 = {
            ...baseOas2Doc,
            basePath: '/basePath',
        };
        const oas3 = {
            ...baseOas3Doc,
            servers: ['/basePath'],
        };

        for (const api of [oas2, oas3]) {
            const { basePath } = Mapper.toDto(api);

            t.equal(basePath, '/basePath', `${api.info.title} basePath was mapped`);
        }
    });

    t.test('defaults basePath to empty string', async (t) => {
        t.plan(2);

        for (const api of [baseOas2Doc, baseOas3Doc]) {
            const { basePath } = Mapper.toDto(api);

            t.equal(basePath, '', `${api.info.title} basePath was mapped`);
        }
    });

    t.test('maps "/" basePath to empty string', async (t) => {
        t.plan(2);

        const oas2 = {
            ...baseOas2Doc,
            basePath: '/',
        };
        const oas3 = {
            ...baseOas3Doc,
            servers: ['/'],
        };

        for (const api of [oas2, oas3]) {
            const { basePath } = Mapper.toDto(api);

            t.equal(basePath, '', `${api.info.title} basePath was mapped`);
        }
    });

    t.test('trims "/" from basePath', async (t) => {
        t.plan(2);

        const oas2 = {
            ...baseOas2Doc,
            basePath: '/basePath/',
        };
        const oas3 = {
            ...baseOas3Doc,
            servers: ['/basePath/'],
        }

        for (const api of [oas2, oas3]) {
            const { basePath } = Mapper.toDto(api);

            t.equal(basePath, '/basePath', `${api.info.title} basePath was trimmed`);
        }
    });

    t.test('prefixes basePath with "/"', async (t) => {
        t.plan(2);

        const oas2 = {
            ...baseOas2Doc,
            basePath: 'basePath',
        };
        const oas3 = {
            ...baseOas3Doc,
            servers: ['basePath'],
        };

        for (const api of [oas2, oas3]) {
            const { basePath } = Mapper.toDto(api);

            t.equal(basePath, '/basePath', `${api.info.title} basePath was prefixed`);
        }
    });

    t.test('defaults OAS3 basePath to "/" if multiple servers', async (t) => {
        t.plan(1);

        const oas3 = {
            ...baseOas3Doc,
            servers: ['/server1', '/server2'],
        };

        const { basePath } = Mapper.toDto(oas3);

        t.equal(basePath, '', 'oas3 basePath was mapped');
    });

    t.test('maps empty array when no authentication schemes', async (t) => {
        t.plan(4);

        for (const api of [baseOas2Doc, baseOas3Doc]) {
            const { customAuthSchemes } = Mapper.toDto(api, 'baseDir');

            t.ok(Array.isArray(customAuthSchemes), `${api.info.title} customAuthSchemes is an array`);
            t.notOk(customAuthSchemes.length, `${api.info.title} customAuthSchemes is empty`);
        }
    });

    t.test('maps custom authentication schemes', async (t) => {
        t.plan(2);

        const baseDir = 'baseDir';
        const authSchemes = {
            apiKey: 'pathToApiKeyScheme',
            oauth2: 'pathToOAuth2Scheme',
        };
        const oas2 = { ...baseOas2Doc, 'x-hapi-auth-schemes': authSchemes };
        const oas3 = { ...baseOas3Doc, 'x-hapi-auth-schemes': authSchemes };

        const expectedAuthSchemes = [
            { scheme: 'apiKey', path: Path.join(baseDir, 'pathToApiKeyScheme') },
            { scheme: 'oauth2', path: Path.join(baseDir, 'pathToOAuth2Scheme') },
        ];

        for (const api of [oas2, oas3]) {
            const { customAuthSchemes } = Mapper.toDto(api, baseDir);

            t.deepEqual(customAuthSchemes, expectedAuthSchemes, `${api.info.title} auth schemes were mapped`);
        }
    });

    t.test('maps empty object when no authentication strategies', async (t) => {
        t.plan(4);

        for (const api of [baseOas2Doc, baseOas3Doc]) {
            const { customAuthStrategies } = Mapper.toDto(api);

            t.ok(Array.isArray(customAuthStrategies), `${api.info.title} customAuthStrategies is an array`);
            t.notOk(customAuthStrategies.length, `${api.info.title} is empty`);
        }
    });

    t.test('maps custom authentication strategies', async (t) => {
        t.plan(2);

        const baseDir = 'baseDir';
        const authStrategies = {
            api_key1: {
                'x-hapi-auth-strategy': 'path_to_api_key1_strategy',
                type: 'apiKey',
                name: 'authorization',
                in: 'header',
            },
            api_key2: {
                'x-hapi-auth-strategy': 'path_to_api_key2_strategy',
                type: 'apiKey',
                name: 'api_key_query',
                in: 'query',
            },
        };
        const oas2 = { ...baseOas2Doc, securityDefinitions: authStrategies };
        const oas3 = { ...baseOas3Doc, components: { securitySchemes: authStrategies } };
        const expectedAuthStrategies = [
            {
                strategy: 'api_key1',
                config: {
                    path: Path.join(baseDir, 'path_to_api_key1_strategy'),
                    type: 'apiKey',
                    name: 'authorization',
                    in: 'header',
                },
            },
            {
                strategy: 'api_key2',
                config: {
                    path: Path.join(baseDir, 'path_to_api_key2_strategy'),
                    type: 'apiKey',
                    name: 'api_key_query',
                    in: 'query',
                },
            },
        ];

        for (const api of [oas2, oas3]) {
            const { customAuthStrategies } = Mapper.toDto(api, baseDir);

            t.deepEqual(customAuthStrategies, expectedAuthStrategies, `${api.info.title} customAuthStrategies were mapped`);
        }
    });

    t.test('operation mapping', async (t) => {

        t.test('maps multiple paths', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath1': {
                    get: {},
                },
                '/testPath2': {
                    post: {},
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };
            const expectedOperations = [
                {
                    path: '/testPath1',
                    method: 'get',
                },
                {
                    path: '/testPath2',
                    method: 'post',
                },
            ];

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                // for this test we only care about the path & method to see that the operation was mapped
                const actual = operations.map(({ path, method }) => ({ path, method }));

                t.deepEqual(actual, expectedOperations, `${api.info.title} operations were mapped`);
            }
        });

        t.test('maps multiple operations from same path', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath': {
                    get: {},
                    post: {},
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };
            const expectedOperations = [
                {
                    path: '/testPath',
                    method: 'get',
                },
                {
                    path: '/testPath',
                    method: 'post',
                },
            ];

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                // for this test we only care about the path & method to see that the operation was mapped
                const actual = operations.map(({ path, method }) => ({ path, method }));

                t.deepEqual(actual, expectedOperations, `${api.info.title} operations were mapped`);
            }
        });

        t.test('maps tags for operation', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath': {
                    get: {
                        tags: ['tag1', 'tag2'],
                    },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for(const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].tags, ['tag1', 'tag2'], `${api.info.title} tags were mapped`);
            }
        });

        t.test('maps description for operation', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath': {
                    get: {
                        description: 'test operation description',
                    },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.equal(operations[0].description, 'test operation description', `${api.info.title} description was mapped`);
            }
        });

        t.test('maps operationId for operation', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath': {
                    get: { operationId: 'testOperationId' },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.equal(operations[0].operationId, 'testOperationId', `${api.info.title} operationId was mapped`);
            }
        });

        t.test('maps x-hapi-options for operation', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath': {
                    get: {
                        'x-hapi-options': {
                            isInternal: true,
                        },
                    },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].customOptions, { isInternal: true }, `${api.info.title} x-hapi-options were mapped`);
            }
        });

        t.test('maps security for operation', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath': {
                    get: {
                        security: [
                            { api_key: [] },
                        ],
                    },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };
            const expectedSecurity = [{ strategy: 'api_key', scopes: [] }];

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].security, expectedSecurity, `${api.info.title} security was mapped`);
            }
        });

        t.test('maps multiple security array items for operation', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath': {
                    get: {
                        security: [
                            { api_key1: ['api1_read'] },
                            { api_key2: ['api2_read','api2_write'] },
                        ],
                    },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };
            const expectedSecurity = [
                { strategy: 'api_key1', scopes: ['api1_read'] },
                { strategy: 'api_key2', scopes: ['api2_read','api2_write'] },
            ];

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].security, expectedSecurity, `${api.info.title} security was mapped`);
            }
        });

        t.test('maps multiple security types in single array item for operation', async (t) => {
            t.plan(2);

            const paths = {
                '/testPath': {
                    get: {
                        security: [{
                            api_key1: ['api1_read'],
                            api_key2: ['api2_read','api2_write'],
                        }],
                    },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };
            const expectedSecurity = [
                { strategy: 'api_key1', scopes: ['api1_read'] },
                { strategy: 'api_key2', scopes: ['api2_read','api2_write'] },
            ];

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].security, expectedSecurity, `${api.info.title} security was mapped`);
            }
        });

        t.test('maps global security to operation', async (t) => {
            t.plan(2);

            const security = [{ api_key: [] }];
            const paths = { '/testPath': { get: {} } };
            const oas2 = { ...baseOas2Doc, security, paths };
            const oas3 = { ...baseOas3Doc, security, paths };
            const expectedSecurity = [{ strategy: 'api_key', scopes: [] }];

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].security, expectedSecurity, `${api.info.title} security was mapped`);
            }
        });

        t.test('operation security overrides global securiity', async (t) => {
            t.plan(2);

            const security = [{ api_key1: ['api1_read'] }];
            const paths = {
                '/testPath': {
                    get: {
                        security: [{
                            api_key2: ['api2_read', 'api2_write'],
                        }],
                    },
                },
            };
            const oas2 = { ...baseOas2Doc, security, paths };
            const oas3 = { ...baseOas3Doc, security, paths };
            const expectedSecurity = [
                { strategy: 'api_key2', scopes: ['api2_read','api2_write'] },
            ];

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].security, expectedSecurity, `${api.info.title} security was mapped`);
            }
        });

        t.test('maps x-hapi-handler', async (t) => {
            t.plan(2);

            const baseDir = 'baseDir';
            const paths = {
                '/testPath': {
                    'x-hapi-handler': 'pathToHandler',
                    get: {},
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api, baseDir);

                t.equal(operations[0].handler, Path.join(baseDir, 'pathToHandler'), `${api.info.title} handler was mapped`);
            }
        });

        t.test('maps x-hapi-handler to multiple operations', async (t) => {
            t.plan(4);

            const baseDir = 'baseDir';
            const paths = {
                '/testPath': {
                    'x-hapi-handler': 'pathToHandler',
                    get: {},
                    post: {},
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api, baseDir);

                const getOperation = operations.find(op => op.method === 'get');
                const postOperation = operations.find(op => op.method === 'post');

                t.equal(getOperation.handler, Path.join(baseDir, 'pathToHandler'), `${api.info.title} get handler was mapped`);
                t.equal(postOperation.handler, Path.join(baseDir, 'pathToHandler'), `${api.info.title} post handler was mapped`);
            }
        });

        t.test('maps request media type for operation', async (t) => {
            t.plan(2);

            const oas2 = {
                ...baseOas2Doc,
                paths: {
                    '/testPath': {
                        post: { consumes: ['requestMediaType'] },
                    },
                },
            };
            const oas3 = {
                ...baseOas3Doc,
                paths: {
                    '/testPath': {
                        post: { requestBody: { content: { 'requestMediaType': {} } } },
                    },
                },
            };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].mediaTypes.request, ['requestMediaType'], `${api.info.title} request media type was mapped`);
            }
        });

        t.test('maps global request media type to operation', async (t) => {
            t.plan(1);

            const consumes = ['requestMediaType'];
            const paths = {
                '/testPath': {
                    get: { },
                },
            };
            // only oas2 here - oas3 does not support global request media types
            const api = { ...baseOas2Doc, consumes, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].mediaTypes.request, ['requestMediaType'], 'request media type was mapped');
        });

        t.test('operation overrides global request media type', async (t) => {
            t.plan(1);

            const consumes = ['globalRequestMediaType'];
            const paths = {
                '/testPath': {
                    get: { consumes: ['operationRequestMediaType'] },
                },
            };
            const api = { ...baseOas2Doc, consumes, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].mediaTypes.request, ['operationRequestMediaType'], 'request media type was mapped');
        });

        t.test('maps parameters for operation', async (t) => {
            t.plan(2);

            const parameters = [
                {
                    in: 'header',
                    name: 'testParameter',
                    type: 'integer',
                },
            ];
            const paths = {
                '/testPath': {
                    get: { parameters },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].parameters, parameters, `${api.info.title} parameters were mapped`);
            }
        });

        t.test('maps parameters for path', async (t) => {
            t.plan(2);

            const parameters = [
                {
                    in: 'header',
                    name: 'testParameter',
                    type: 'integer',
                },
            ];
            const paths = {
                '/testPath': {
                    parameters,
                    get: { },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].parameters, parameters, `${api.info.title} parameters were mapped`);
            }
        });

        t.test('combines path and operation parameters', async (t) => {
            t.plan(2);

            const pathParameters = [
                {
                    in: 'header',
                    name: 'testParameter1',
                    type: 'integer',
                },
            ];
            const operationParameters = [
                {
                    in: 'header',
                    name: 'testParameter2',
                    type: 'integer',
                },
            ];
            const paths = {
                '/testPath': {
                    parameters: pathParameters,
                    get: { parameters: operationParameters },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].parameters, [...pathParameters, ...operationParameters], `${api.info.title} parameters were mapped`);
            }
        });

        t.test('maps oas3 requestBody to parameters', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    post: {
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: { type: 'object' },
                                },
                            },
                        },
                    },
                },
            };
            const oas3 = { ...baseOas3Doc, paths };
            const expectedParameter = { name: 'payload', in: 'body', schema: { type: 'object' } };

            const { operations } = Mapper.toDto(oas3);

            t.deepEqual(operations[0].parameters, [expectedParameter], 'oas3 requestBody was mapped to parameters');
        });

        t.test('maps responses for operation', async (t) => {
            t.plan(2);

            const responses = {
                '200': { description: 'OK' },
                '404': { description: 'Not Found' },
            };
            const paths = {
                '/testPath': {
                    get: { responses },
                },
            };
            const oas2 = { ...baseOas2Doc, paths };
            const oas3 = { ...baseOas3Doc, paths };

            for (const api of [oas2, oas3]) {
                const { operations } = Mapper.toDto(api);

                t.deepEqual(operations[0].responses, responses, `${api.info.title} responses were mapped`);
            }
        });

        t.test('maps oas3 response content to response schema', async (t) => {
            t.plan(1);

            const responses = {
                '200': {
                    description: 'OK',
                    content: {
                        'application/json': {
                            schema: { type: 'object' },
                        },
                    },
                },
            };
            const paths = {
                '/testPath': {
                    get: { responses },
                },
            };
            const oas3 = { ...baseOas3Doc, paths };
            const expectedResponses = {
                '200': {
                    description: 'OK',
                    schema: { type: 'object' },
                },
            };

            const { operations } = Mapper.toDto(oas3);

            t.deepEqual(operations[0].responses, expectedResponses, 'oas3 response body mapped to schema');
        });
    });
});
