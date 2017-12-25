'use strict';

var Boom = require('boom');

const register = function (server, { name  }) {
    server.auth.scheme(name /*apiKey*/, (server, { validate }) => {
        return {
            authenticate: async function (request, h) {
                return h.authenticated(await validate(request));
            }
        };
    });
};

module.exports = { register, name: 'x-auth-scheme' };
