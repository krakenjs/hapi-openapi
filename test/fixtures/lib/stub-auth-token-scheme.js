'use strict';

var Boom = require('boom');

exports.register = function (server, options, next) {
    server.auth.scheme('stub-auth-token', function (server, options) {
        var scheme = {
            authenticate: function (request, reply) {
                var token = request.raw.req.headers.authorization;

                if (!token) {
                    return reply(Boom.unauthorized());
                }

                options.validateFunc(token, function (err, isValid, credentials) {
                    if (err || !isValid) {
                        return reply(Boom.unauthorized(), { credentials: credentials });
                    }

                    return reply.continue({ credentials: credentials });
                });
            }
        };

        return scheme;
    });

    next();
};

exports.register.attributes = {
    name: 'stub-auth-token'
};
