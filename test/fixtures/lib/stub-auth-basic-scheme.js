'use strict';
var base64 = require('base-64');
var Boom = require('boom');

exports.register = function (server, options, next) {
    server.auth.scheme('stub-auth-basic', function (server, options) {
        var scheme = {
            authenticate: function (request, reply) {
                var token = request.raw.req.headers.authorization;

                if (!token) {
                    return reply(Boom.unauthorized());
                }

                token = token.split(' ')[1];
                var decodedData = base64.decode(token).split(':');
                
                var login = decodedData[0];
                var password = decodedData[1];

                options.validateFunc(password, function (err, isValid, credentials) {
                    if (err || !isValid) {
                        return reply(Boom.unauthorized(null, 'stub-auth-basic'), { credentials: credentials });
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
    name: 'stub-auth-basic'
};
