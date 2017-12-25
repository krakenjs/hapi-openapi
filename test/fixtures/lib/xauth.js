'use strict';

var Boom = require('boom');

const register = function (server, { name, type, where, lookup }) {
    server.auth.scheme(type, (server, options) => {
        return {
            authenticate: async function (request, h) {
                //TODO: Look up from ${lookup} and ${where}
                const token = request.headers.authorization;

                if (!token) {
                    throw Boom.unauthorized();
                }

                return h.authenticated({ credentials: { scope: ['read'] }, artifacts: { token } });
            }
        };
    });

    server.auth.strategy(name, type);
};

module.exports = { register, name: 'x-auth-register' };
