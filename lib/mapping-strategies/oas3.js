'use strict';

const Path = require('path');
const Utils = require('../../lib/utils');

const getBasePath = function () {

    const server = this.spec.servers && this.spec.servers.length === 1 && this.spec.servers[0];
    return Utils.unsuffix(Utils.prefix(server || '/', '/'), '/');
};

const getCustomAuthSchemes = function () {

    const schemes = this.spec['x-hapi-auth-schemes'] || {};

    return Object.entries(schemes)
        .map(([scheme, pathToScheme]) => ({ scheme, path: Path.join(this.baseDir, pathToScheme) })
        );
};

const getCustomAuthStrategies = function () {

    const strategies = this.spec.components && this.spec.components.securitySchemes || {};

    return Object.entries(strategies)
        .filter(([, config]) => config['x-hapi-auth-strategy'])
        .map(([strategy, { 'x-hapi-auth-strategy': pathToStrategy, ...rest }]) =>
            ({
                strategy,
                config: {
                    ...rest,
                    path: Path.join(this.baseDir, pathToStrategy)
                }
            })
        );
};

const mapSecurity = function (security = []) {

    return security.flatMap((auth) =>

        Object.entries(auth).map(([strategy, scopes]) => ({ strategy, scopes }))
    );
};

const getRequestMediaTypes = function (operation) {

    return operation.requestBody &&
        operation.requestBody.content &&
        Object.keys(operation.requestBody.content);
};

const mapRequestBodyToParameter = function (operation) {

    const mediaTypes = getRequestMediaTypes(operation);
    const schema = mediaTypes &&
        mediaTypes.length &&
        operation.requestBody.content[mediaTypes[0]].schema;

    return schema ? [{ name: 'payload', in: 'body', schema }] : [];
};

const mapResponses = function (responses = {}) {

    return Object.entries(responses).reduce((acc, [statusCode, response]) => {

        const mappedResponse = { description: response.description };
        if (response.content) {
            const contentType = Object.keys(response.content)[0];
            mappedResponse.schema = response.content[contentType].schema;
        }

        acc[statusCode] = mappedResponse;
        return acc;
    }, {});
};

const getOperations = function () {

    const globalSecurity = this.spec.security;
    const paths = this.spec.paths || {};

    return Object.entries(paths).flatMap(([path, operations]) =>

        Object.entries(operations)
            .filter(([method]) => Utils.isHttpMethod(method))
            .map(([method, operation]) => ({
                path,
                method,
                description: operation.description,
                operationId: operation.operationId,
                tags: operation.tags,
                security: mapSecurity(operation.security || globalSecurity),
                mediaTypes: {
                    request: getRequestMediaTypes(operation)
                },
                parameters: [
                    ...(operations.parameters || []),
                    ...(operation.parameters || []),
                    ...mapRequestBodyToParameter(operation)
                ],
                handler: operations['x-hapi-handler'] && Path.join(this.baseDir, operations['x-hapi-handler']),
                responses: mapResponses(operation.responses),
                customOptions: operation['x-hapi-options']
            }))
    );
};

module.exports = {
    getBasePath,
    getCustomAuthSchemes,
    getCustomAuthStrategies,
    getOperations
};
