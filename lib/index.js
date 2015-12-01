'use strict';

var Package = require('../package.json');
var Assert = require('assert');
var Thing = require('core-util-is');
var Routes = require('swaggerize-routes');
var Utils = require('swaggerize-routes/lib/utils');
var Joi = require('joi');
var Yaml = require('js-yaml');
var Fs = require('fs');
var Async = require('async');

module.exports = {
    register: function (server, options, next) {
        var routes, basePath;

        Assert.ok(Thing.isObject(options), 'Expected options to be an object.');
        Assert.ok(options.api, 'Expected an api definition.');

        if (Thing.isString(options.api)) {
            options.api = loadApi(options.api);
        }

        Assert.ok(Thing.isObject(options.api), 'Api definition must resolve to an object.');

        options.basedir = options.basedir || process.cwd();
        options.docspath = Utils.prefix(options.docspath || '/api-docs', '/');
        options.api.basePath = Utils.prefix(options.api.basePath || '/', '/');
        basePath = Utils.unsuffix(options.api.basePath, '/');

        //Build routes
        routes = Routes(options);

        //API docs route
        server.route({
            method: 'GET',
            path: basePath + options.docspath,
            config: {
                handler: function (request, reply) {
                    reply(options.api);
                },
                cors: options.cors
            },
            vhost: options.vhost
        });

        //Add all known routes
        routes.forEach(function (route) {
            var config, formValidators;

            config = {
                pre: [],
                handler: undefined,
                cors: options.cors
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
                        case 'query':
                            config.validate.query = config.validate.query || {};
                            config.validate.query[validator.parameter.name] = validator.schema;
                            break;
                        case 'path':
                            config.validate.params = config.validate.params || {};
                            config.validate.params[validator.parameter.name] = validator.schema;
                            break;
                        case 'body':
                            config.validate.payload = validator.schema;
                            break;
                        case 'formData':
                            formValidators = formValidators || {};
                            formValidators[validator.parameter.name] = function (value, next) {
                                validator.validate(value, next);
                            };
                            break;
                    }
                });

                if (!config.validate.payload && formValidators) {
                    config.validate.payload = function (value, options, next) {
                        Async.series(Object.keys(value).map(function (k) {
                            return function (callback) {
                                formValidators[k](value[k], callback);
                            };
                        }), function (error) {
                            next(error);
                        });
                    };
                }
            }

            if (route.security) {
                var securitySchemes = Object.keys(route.security);

                securitySchemes.forEach(function (securityDefinitionName) {
                    var securityDefinition = options.api.securityDefinitions[securityDefinitionName];

                    Assert.ok(securityDefinition, 'Security scheme not defined.');
                    Assert.ok(securityDefinition.type === 'apiKey', 'None api_key security schemes not supported.');

                    config.auth = config.auth || {};
                    config.auth.strategies = config.auth.strategies || [];
                    config.auth.strategies.push(securityDefinitionName);
                });
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

/**
 * Loads the api from a path, with support for yaml..
 * @param apiPath
 * @returns {Object}
 */
function loadApi(apiPath) {
    if (apiPath.indexOf('.yaml') === apiPath.length - 5 || apiPath.indexOf('.yml') === apiPath.length - 4) {
        return Yaml.load(Fs.readFileSync(apiPath));
    }
    return require(apiPath);
}

module.exports.register.attributes = {
    name: 'swagger',
    version: Package.version
};
