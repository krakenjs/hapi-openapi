'use strict';

var Boom = require('@hapi/boom');

const register = function (server, options) {
    server.auth.scheme('stub-auth-token', function (server, options) {
        const scheme = {
            authenticate: async function (request, h) {
                const token = request.headers.authorization;

                if (!token) {
                    throw Boom.unauthorized(null, 'stub-auth-token');
                }

                try {
                    const { credentials, artifacts } = await options.validateFunc(token);

                    if (!credentials) {
                        throw Boom.unauthorized(null, 'stub-auth-token', { credentials });
                    }

                    return h.authenticated({ credentials, artifacts });
                }
                catch (error) {
                    throw error;
                }
            }
        };

        return scheme;
    });
};

const buildValidateFunc = function (allowedToken) {
    return async function (token) {

        if (token === allowedToken) {
            return { credentials: { scope: [ 'api1:read' ] }, artifacts: { }};
        }

        return {};
    }
};

module.exports = { register, name: 'stub-auth-token', buildValidateFunc};
