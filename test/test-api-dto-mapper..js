'use strict';

const Test = require('tape');
const Path = require('path');
const Mapper = require('../lib/api-dto-mapper');

Test('OAS2 dto mapper', (t) => {

    const baseApiDoc = {
        swagger: '2.0',
        info: {
            title: 'Base Swagger document',
            version: '1',
        },
    };

    t.test('maps basePath', async (t) => {
        t.plan(1);

        const api = {
            ...baseApiDoc,
            basePath: '/basePath',
        };

        const { basePath } = Mapper.toDto(api);

        t.equal(basePath, '/basePath', 'basePath was mapped');
    });

    t.test('maps "/" basePath to empty string', async (t) => {
        t.plan(1);

        const api = {
            ...baseApiDoc,
            basePath: '/',
        };

        const { basePath } = Mapper.toDto(api);

        t.equal(basePath, '', 'base path was mapped');
    });

    t.test('trims "/" from basePath', async (t) => {
        t.plan(1);

        const api = {
            ...baseApiDoc,
            basePath: '/basePath/',
        };

        const { basePath } = Mapper.toDto(api);

        t.equal(basePath, '/basePath', 'base path was trimmed');
    });

    t.test('prefixes basePath with "/"', async (t) => {
        t.plan(1);

        const api = {
            ...baseApiDoc,
            basePath: 'basePath',
        };

        const { basePath } = Mapper.toDto(api);

        t.equal(basePath, '/basePath', 'base path was trimmed');
    });

    t.test('maps empty array when no authentication schemes', async (t) => {
        t.plan(2);

        const { customAuthSchemes } = Mapper.toDto(baseApiDoc, 'baseDir');

        t.ok(Array.isArray(customAuthSchemes), 'customAuthSchemes is an array');
        t.notOk(customAuthSchemes.length, 'empty array mapped');
    });

    t.test('maps custom authentication schemes', async (t) => {
        t.plan(1);

        const baseDir = 'baseDir';
        const authSchemes = {
            apiKey: 'pathToApiKeyScheme',
            oauth2: 'pathToOAuth2Scheme',
        };
        const api = { ...baseApiDoc, 'x-hapi-auth-schemes': authSchemes };
        const expectedAuthSchemes = [
            { scheme: 'apiKey', path: Path.join(baseDir, 'pathToApiKeyScheme') },
            { scheme: 'oauth2', path: Path.join(baseDir, 'pathToOAuth2Scheme') },
        ];

        const { customAuthSchemes } = Mapper.toDto(api, baseDir);

        t.deepEqual(customAuthSchemes, expectedAuthSchemes, 'auth schemes were mapped');
    });

    t.test('maps empty object when no authentication strategies', async (t) => {
        t.plan(2);

        const { customAuthStrategies } = Mapper.toDto(baseApiDoc, 'baseDir');

        t.ok(Array.isArray(customAuthStrategies), 'customAuthStrategies is an array');
        t.notOk(customAuthStrategies.length, 'empty array mapped');
    });

    t.test('maps custom authentication strategies', async (t) => {
        t.plan(1);

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
        const api = { ...baseApiDoc, securityDefinitions: authStrategies };
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

        const { customAuthStrategies } = Mapper.toDto(api, baseDir);

        t.deepEqual(customAuthStrategies, expectedAuthStrategies, 'custom auth strategies were mapped');
    });

    t.test('operation mapping', async (t) => {

        t.test('maps multiple paths', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath1': {
                    get: {},
                },
                '/testPath2': {
                    post: {},
                },
            };
            const api = { ...baseApiDoc, paths };
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

            const { operations } = Mapper.toDto(api);

            const actual = operations.map(({ path, method }) => ({ path, method }));

            t.deepEqual(actual, expectedOperations, 'operations were mapped');
        });

        t.test('maps multiple operations from same path', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    get: {},
                    post: {},
                },
            };
            const api = { ...baseApiDoc, paths };
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

            const { operations } = Mapper.toDto(api);

            const actual = operations.map(({ path, method }) => ({ path, method }));

            t.deepEqual(actual, expectedOperations, 'operations were mapped');
        });

        t.test('maps tags for operation', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    get: {
                        tags: ['tag1', 'tag2'],
                    },
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].tags, ['tag1', 'tag2'], 'tags were mapped');
        });

        t.test('maps description for operation', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    get: {
                        description: 'test operation description',
                    },
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.equal(operations[0].description, 'test operation description', 'description was mapped');
        });

        t.test('maps operationId for operation', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    get: { operationId: 'testOperationId' },
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.equal(operations[0].operationId, 'testOperationId', 'operationId was mapped');
        });

        t.test('maps x-hapi-options for operation', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    get: {
                        'x-hapi-options': {
                            isInternal: true,
                        },
                    },
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].customOptions, { isInternal: true }, 'x-hapi-options were mapped');
        });

        t.test('maps security for operation', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    get: {
                        security: [
                            { api_key: [] },
                        ],
                    },
                },
            };
            const api = { ...baseApiDoc, paths };
            const expectedSecurity = [{ schemeName: 'api_key', scopes: [] }];

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].security, expectedSecurity, 'security was mapped');
        });

        t.test('maps multiple security array items for operation', async (t) => {
            t.plan(1);

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
            const api = { ...baseApiDoc, paths };
            const expectedSecurity = [
                { schemeName: 'api_key1', scopes: ['api1_read'] },
                { schemeName: 'api_key2', scopes: ['api2_read','api2_write'] },
            ];

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].security, expectedSecurity, 'security was mapped');
        });

        t.test('maps multiple security types in single array item for operation', async (t) => {
            t.plan(1);

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
            const api = { ...baseApiDoc, paths };
            const expectedSecurity = [
                { schemeName: 'api_key1', scopes: ['api1_read'] },
                { schemeName: 'api_key2', scopes: ['api2_read','api2_write'] },
            ];

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].security, expectedSecurity, 'security was mapped');
        });

        t.test('maps global security to operation', async (t) => {
            t.plan(1);

            const security = [{ api_key: [] }];
            const paths = { '/testPath': { get: {} } };
            const api = { ...baseApiDoc, security, paths };
            const expectedSecurity = [{ schemeName: 'api_key', scopes: [] }];

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].security, expectedSecurity, 'security was mapped');
        });

        t.test('operation security overrides global securiity', async (t) => {
            t.plan(1);

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
            const api = { ...baseApiDoc, security, paths };
            const expectedSecurity = [
                { schemeName: 'api_key2', scopes: ['api2_read','api2_write'] },
            ];

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].security, expectedSecurity, 'security was mapped');
        });

        t.test('maps x-hapi-handler', async (t) => {
            t.plan(1);

            const baseDir = 'baseDir';
            const paths = {
                '/testPath': {
                    'x-hapi-handler': 'pathToHandler',
                    get: {},
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api, baseDir);

            t.equal(operations[0].handler, Path.join(baseDir, 'pathToHandler'), 'handler was mapped');
        });

        t.test('maps x-hapi-handler to multiple operations', async (t) => {
            t.plan(2);

            const baseDir = 'baseDir';
            const paths = {
                '/testPath': {
                    'x-hapi-handler': 'pathToHandler',
                    get: {},
                    post: {},
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api, baseDir);

            const getOperation = operations.find(op => op.method === 'get');
            const postOperation = operations.find(op => op.method === 'post');

            t.equal(getOperation.handler, Path.join(baseDir, 'pathToHandler'), 'get handler was mapped');
            t.equal(postOperation.handler, Path.join(baseDir, 'pathToHandler'), 'post handler was mapped');
        });

        t.test('maps request media type for operation', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    get: { consumes: ['requestMediaType'] },
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].mediaTypes.request, ['requestMediaType'], 'request media type was mapped');
        });

        t.test('maps global request media type to operation', async (t) => {
            t.plan(1);

            const consumes = ['requestMediaType'];
            const paths = {
                '/testPath': {
                    get: { },
                },
            };
            const api = { ...baseApiDoc, consumes, paths };

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
            const api = { ...baseApiDoc, consumes, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].mediaTypes.request, ['operationRequestMediaType'], 'request media type was mapped');
        });

        t.test('maps response media type for operation', async (t) => {
            t.plan(1);

            const paths = {
                '/testPath': {
                    get: { produces: ['responseMediaType'] },
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].mediaTypes.response, ['responseMediaType'], 'response media type was mapped');
        });

        t.test('maps global response media type to operation', async (t) => {
            t.plan(1);

            const produces = ['responseMediaType'];
            const paths = {
                '/testPath': {
                    get: { },
                },
            };
            const api = { ...baseApiDoc, produces, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].mediaTypes.response, ['responseMediaType'], 'response media type was mapped');
        });

        t.test('operation overrides global response media type', async (t) => {
            t.plan(1);

            const produces = ['globalResponseMediaType'];
            const paths = {
                '/testPath': {
                    get: { produces: ['operationResponseMediaType'] },
                },
            };
            const api = { ...baseApiDoc, produces, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].mediaTypes.response, ['operationResponseMediaType'], 'response media type was mapped');
        });

        t.test('maps parameters for operation', async (t) => {
            t.plan(1);

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
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].parameters, parameters, 'parameters were mapped');
        });

        t.test('maps parameters for path', async (t) => {
            t.plan(1);

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
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].parameters, parameters, 'parameters were mapped');
        });

        t.test('combines path and operation parameters', async (t) => {
            t.plan(1);

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
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].parameters, [...pathParameters, ...operationParameters], 'parameters were mapped');
        });

        t.test('maps responses for operation', async (t) => {
            t.plan(1);

            const responses = {
                '200': { description: 'OK' },
                '404': { description: 'Not Found' },
            };
            const paths = {
                '/testPath': {
                    get: { responses },
                },
            };
            const api = { ...baseApiDoc, paths };

            const { operations } = Mapper.toDto(api);

            t.deepEqual(operations[0].responses, responses, 'responses were mapped');
        });
    });
});
