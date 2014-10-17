'use strict';

var Package = require('../package.json'),
    Assert = require('assert'),
    Caller = require('caller'),
    Thing = require('core-util-is'),
    Builder = require('swaggerize-builder'),
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

        //Build routes
        routes = Builder(options);

        //API docs route
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

        //Add all known routes
        routes.forEach(function (route) {
            var config;

            config = {
                pre: [],
                handler: undefined
            };

            //Addition before ops supplied in handler file (as array)
            if (Thing.isArray(route.handler)) {
                if (route.handler.length > 1) {
                    for (var i = 0; i < route.handler.length - 1; i++) {
                        config.pre.push({
                            assign: route.handler[i].name || 'p' + (i + 1),
                            method: route.handler[i]
                        });
                    }
                }
                config.handler = route.handler[route.handler.length - 1];
            }
            else {
                config.handler = route.handler;
            }

            //Input validation
            route.validators.forEach(function (validator) {
                config.validate = {};

                switch (validator.parameter.in) {
                    case 'header':
                        config.validate.headers = config.validate.headers || {};
                        config.validate.headers[validator.parameter.name] = validator.schema;
                        break;
                    case 'path':
                    case 'query':
                        config.validate.params = config.validate.params || {};
                        config.validate.params[validator.parameter.name] = validator.schema;
                        break;
                    case 'body':
                    case 'form':
                        config.validate.payload = validator.schema;
                        break;
                }
            });

            //Define the route
            plugin.route({
                method: route.method,
                path: basePath + route.path,
                config: config,
                vhost: options.vhost
            });
        });

        //Expose plugin api
        plugin.expose({
            api: options.api,
            setHost: function setHost(host) {
                this.api.host = options.api.host = host;
            }
        });

        //Done
        next();
    }
};

module.exports.register.attributes = {
    name: 'swagger',
    version: Package.version
};
