'use strict';

var Package = require('../package.json'),
    Assert = require('assert'),
    Thing = require('core-util-is'),
    Builder = require('swaggerize-builder'),
    Utils = require('swaggerize-builder/lib/utils'),
    Joi = require('joi'),
    Path = require('path');

module.exports = {
    register: function (server, options, next) {
        var routes, basePath;

        Assert.ok(Thing.isObject(options), 'Expected options to be an object.');
        Assert.ok(options.api, 'Expected an api definition.');

        if (Thing.isString(options.api)) {
            options.api = require(options.api);
        }

        Assert.ok(Thing.isObject(options.api), 'Api definition must resolve to an object.');

        options.basedir = options.basedir || process.cwd();
        options.docspath = Utils.prefix(options.docspath || '/api-docs', '/');
        options.api.basePath = Utils.prefix(options.api.basePath || '/', '/');
        basePath = Utils.unsuffix(options.api.basePath, '/');

        //Build routes
        routes = Builder(options);

        //API docs route
        server.route({
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

            if (route.validators.length) {
                config.validate = {};

                //Input validation
                route.validators.forEach(function (validator) {
                    switch (validator.parameter.in) {
                        case 'header':
                            config.validate.headers = config.validate.headers || {};
                            config.validate.headers[validator.parameter.name] = validator.schema;
                            break;
                        case 'path':
                            config.validate.params = config.validate.params || {};
                            config.validate.params[validator.parameter.name] = validator.schema;
                            break;
                        case 'body':
                        case 'form':
                            config.validate.payload = validator.schema;
                            break;
                    }
                });

                config.validate.query = function(value, options, callback) {
                    var validationErrors = new Array();
                    for( var i= 0, j=Object.keys(value).length; i<j; i++ ) {
                        route.validators.forEach(function (validator) {
                            if( validator.parameter.name === Object.keys(value)[i] ) {
                                if( validator.parameter.type === 'array' ) {
                                    validator.validate(value[validator.parameter.name], function(err, result) {
                                        if( err ) {
                                            validationErrors.push(err);
                                        }
                                        else {
                                            value[validator.parameter.name] = result;
                                        }
                                    });
                                }
                                else {
                                    Joi.validate(value[validator.parameter.name], validator.schema, options, function(err, result) {
                                        if( err ) {
                                            validationErrors.push(err);
                                        }
                                        else {
                                            value[validator.parameter.name] = result;
                                        }
                                    });
                                }
                            }
                        });
                    }

                    if( validationErrors.length>0 ) {
                        callback(validationErrors[0]);
                    }
                    else {
                        callback(null, value);
                    }

                };
            }

            //Define the route
            server.route({
                method: route.method,
                path: basePath + route.path,
                config: config,
                vhost: options.vhost
            });
        });

        //Expose plugin api
        server.expose({
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
