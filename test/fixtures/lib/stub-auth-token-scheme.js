'use strict';

var Boom = require('boom');

const register = function (server, options) {
    server.auth.scheme('stub-auth-token', function (server, options) {
        const scheme = {
            authenticate: async function (request, h) {
                const token = request.headers.authorization;

                if (!token) {
                    throw Boom.unauthorized();
                }

                try {
                    const credentials = options.validateFunc(token);

                    if (!credentials) {
                        throw Boom.unauthorized(null, 'stub-auth-token');
                    }

                    return h.authenticated({ credentials });
                }
                catch (error) {
                    throw error;
                }
            }
        };

        return scheme;
    });
};

module.exports = { register, name: 'stub-auth-token' };
