'use strict';

const Path = require('path');
const Utils = require('../../lib/utils');

const getBasePath = function () {

    return Utils.unsuffix(Utils.prefix(this.spec.basePath || '/', '/'), '/');
};

const getCustomAuthSchemes = function () {

    const schemes = this.spec['x-hapi-auth-schemes'] || {};

    return Object.entries(schemes)
        .map(([scheme, pathToScheme]) => ({ scheme, path: Path.join(this.baseDir, pathToScheme) })
        );
};

const getCustomAuthStrategies = function () {

    const strategies = this.spec.securityDefinitions || {};

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
                    request: operation.consumes || this.spec.consumes
                },
                parameters: [...(operations.parameters || []), ...(operation.parameters || [])],
                handler: operations['x-hapi-handler'] && Path.join(this.baseDir, operations['x-hapi-handler']),
                responses: operation.responses,
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
