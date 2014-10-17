'use strict';

var Assert = require('assert'),
    Caller = require('caller'),
    Thing = require('core-util-is'),
    Builder = require('swaggerize-Builder'),
    Utils = require('swaggerize-builder/lib/utils'),
    Path = require('path');

module.exports = {
    register: function (plugin, options, next) {
        var routes, server, basePath;

        Assert.ok(Thing.isObject(options), 'Expected options to be an object.');
        Assert.ok(Thing.isObject(options.api), 'Expected an api definition.');

        options.basedir = options.basedir || Path.dirname(Caller(7));
        options.docspath = Utils.prefix(options.docspath || '/api-docs', '/');
        options.api.basePath = Utils.prefix(options.api.basePath || '/', '/');
        basePath = Utils.unsuffix(options.api.basePath, '/');

        routes = Builder(options);

        plugin.route({
            method: 'GET',
            path: basePath + options.docspath,
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

    function run(validator, request, reply) {
        var parameter, validate, value, isPath;

        parameter = validator.parameter;
        validate = validator.validate;

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

    return function validateInput(request, reply) {
        for (var i = 0; i < validators.length; i++) {
            run(validators[i], request, reply);
        }
    };
}

module.exports.register.attributes = {
    pkg: require('../package.json')
};
