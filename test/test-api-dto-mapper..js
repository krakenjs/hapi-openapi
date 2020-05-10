'use strict';

const Test = require('tape');
const Path = require('path');
const ApiDtoMapper = require('../lib/api-dto-mapper');

Test('api dto mapper', (t) => {

    const baseApiDoc = {
        swagger: '2.0',
        info: {
            title: 'Base Swagger document',
            version: '1',
        },
    };

    t.test('maps custom authentication schemes', async (t) => {
        t.plan(1);

        const baseDir = 'baseDir';
        const authSchemes = {
            apiKey: 'pathToApiKeyScheme',
            oauth2: 'pathToOAuth2Scheme',
        };
        const api = {
            ...baseApiDoc,
            'x-hapi-auth-schemes': authSchemes,
        };
        const expectedAuthSchemes = {
            apiKey: Path.join(baseDir, 'pathToApiKeyScheme'),
            oauth2: Path.join(baseDir, 'pathToOAuth2Scheme'),
        };

        const dto = ApiDtoMapper.toDto(api, baseDir);

        t.deepEqual(dto.customAuthSchemes, expectedAuthSchemes, 'custom auth schemes were mapped');
    });

    t.test('maps empty object when no authentication schemes', async (t) => {
        t.plan(1);

        const dto = ApiDtoMapper.toDto(baseApiDoc, 'baseDir');

        t.deepEqual(dto.customAuthSchemes, {}, 'empty object mapped when no auth schemes');
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
        const api = {
            ...baseApiDoc,
            securityDefinitions: authStrategies,
        };
        const expectedAuthStrategies = {
            api_key1: {
                strategy: Path.join(baseDir, 'path_to_api_key1_strategy'),
                type: 'apiKey',
                name: 'authorization',
                in: 'header',
            },
            api_key2: {
                strategy: Path.join(baseDir, 'path_to_api_key2_strategy'),
                type: 'apiKey',
                name: 'api_key_query',
                in: 'query',
            },
        };

        const dto = ApiDtoMapper.toDto(api, baseDir);

        t.deepEqual(dto.customAuthStrategies, expectedAuthStrategies, 'custom auth strategies were mapped');
    });

    t.test('maps empty object when no authentication strategies', async (t) => {
        t.plan(1);

        const dto = ApiDtoMapper.toDto(baseApiDoc, 'baseDir');

        t.deepEqual(dto.customAuthStrategies, {}, 'empty object mapped when no auth strategies');
    });
});
