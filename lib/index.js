'use strict';

var Thing = require('core-util-is'),
    Builder = require('swaggerize-Builder'),
    Utils = require('swaggerize-builder/lib/utils');

module.exports = {
    register: function (plugin, options, next) {
        var routes, server, basePath;

        routes = Builder(options);

        options.docspath = Utils.prefix(options.docspath || '/api-docs', '/');
        options.api.basePath = Utils.prefix(options.api.basePath || '/', '/');
        basePath = Utils.unsuffix(options.api.basePath, '/');

        plugin.route({
            method: 'GET',
            path: options.docspath || '/api-docs',
            config: {
                handler: function (request, reply) {
                    reply(options.api);
                }
            },
            vhost: options.vhost
        });

        routes.forEach(function (route) {
            var config;

            config = {
                pre: [],
                handler: undefined
            };

            //Input validation
            config.pre.push({
                assign: 'inputvalidator',
                method: inputvalidator(route.validators || [])
            });

            //Addition before ops supplied in handler file (as array)
            if (Thing.isArray(route.handler)) {
                if (route.handler.length > 1) {
                    for (var i = 0; i < route.handler.length - 1; i++) {
                        config.pre.push({
                            assign: route.handler[i].name || 'm' + (i + 1),
                            method: route.handler[i]
                        });
                    }
                }
                config.handler = route.handler[route.handler.length - 1];
            }
            else {
                config.handler = route.handler;
            }

            //Define the route
            plugin.route({
                method: route.method,
                path: basePath + route.path,
                config: config,
                vhost: options.vhost
            });
        });

        next();
    }
};

function inputvalidator(validators) {

    return function validateInput(request, reply) {
        var parameter, validate, value, isPath;

        for (var i = 0; i < validators.length; i++) {
            parameter = validators[i].parameter;
            validate = validators[i].validate;

            switch (parameter.in) {
                case 'path':
                case 'query':
                    isPath = true;
                    value = request.params[parameter.name];
                    break;
                case 'header':
                    value = request.header(parameter.name);
                    break;
                case 'body':
                case 'form':
                    value = request.payload;
                    break;
            }

            validate(value, function (error, newvalue) {
                if (error) {
                    reply(error.message).code(400).takeover();
                    return;
                }

                if (isPath) {
                    request.params[parameter.name] = newvalue;
                }

                reply();
            });
        }
    };
}

module.exports.register.attributes = {
    pkg: require('../package.json')
};
