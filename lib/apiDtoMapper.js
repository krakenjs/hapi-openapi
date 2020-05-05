'use strict';

const toDto = (spec) => {
    const schemes = spec['x-hapi-auth-schemes'] && Object.entries(spec['x-hapi-auth-schemes']);

    const strategies = spec.securityDefinitions && Object.entries(spec.securityDefinitions)
            .filter(([, config]) => config['x-hapi-auth-strategy']);

    return {
        customAuthSchemes: schemes || [],
        customAuthStrategies: strategies || [],
    };
}

module.exports = {
    toDto,
}
