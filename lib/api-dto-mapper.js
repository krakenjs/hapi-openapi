'use strict';

const Path = require('path');

const mapAuthSchemes = (baseDir, schemes = {}) =>
    Object.keys(schemes)
        .reduce((acc, cur) => {
            acc[cur] = Path.join(baseDir, schemes[cur]);
            return acc;
        }, {});

const mapAuthStrategies = (baseDir, strategies = {}) =>
    Object.entries(strategies)
        .filter(([, config]) => config['x-hapi-auth-strategy'])
        .reduce((acc, cur) => {
            const [ name, { 'x-hapi-auth-strategy': pathToStrategy, ...rest }] = cur;
            acc[name] = {
                ...rest,
                strategy: Path.join(baseDir, pathToStrategy),
            };
            return acc;
        }, {});

const toDto = (spec, baseDir) => {
    const customAuthSchemes = mapAuthSchemes(baseDir, spec['x-hapi-auth-schemes']);
    const customAuthStrategies = mapAuthStrategies(baseDir, spec.securityDefinitions);

    return {
        customAuthSchemes,
        customAuthStrategies,
    };
}

module.exports = {
    toDto,
}
