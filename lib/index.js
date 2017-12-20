'use strict';

const Package = require('../package.json');
const Assert = require('assert');
const Joi = require('joi');
const Fs = require('fs');
const Hoek = require('hoek');
const Caller = require('caller');
const Path = require('path');
const Parser = require('swagger-parser');
const Utils = require('./utils');
const Routes = require('./routes');

const optionsSchema = Joi.object({
    basedir: Joi.string().default(Path.resolve(Path.dirname(Caller()))),
    api: Joi.string(),
    docspath: Joi.string().default('/api-docs'),
    cors: Joi.boolean().default(true),
    vhost: Joi.string().allow(null),
    handlers: Joi.alternatives().try(Joi.string().default(Path.resolve(Path.dirname(Caller()), 'routes')), Joi.object()),
    extensions: Joi.array().items(Joi.string()).default(['js'])
}).required();

const register = async function (server, options, next) {
    const validation = Joi.validate(options, optionsSchema);

    Hoek.assert(!validation.error, validation.error);

    const { api, basedir, cors, vhost, handlers, extensions } = validation.value;

    const spec = await Parser.validate(api);

    let docspath = validation.value.docspath;

    docspath = Utils.prefix(docspath, '/');
    docspath = Utils.unsuffix(docspath, '/');

    spec.basePath = Utils.prefix(spec.basePath || '/', '/');

    const basePath = Utils.unsuffix(spec.basePath, '/');

    const apiObject = require(api);

    //Expose plugin api
    server.expose({
        getApi() {
            return apiObject;    
        },
        setHost: function setHost(host) {
            apiObject.host = host;
        }
    });

    //API docs route
    server.route({
        method: 'GET',
        path: basePath + docspath,
        config: {
            handler(request, h) {
                return apiObject;
            },
            vhost: options.vhost
        });

        //Add all known routes
        routes.forEach(function (route) {
            var config = {
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
                config.validate = buildValidators(route.validators);
            }

            if (route.security) {
                var securitySchemes = Object.keys(route.security);

                securitySchemes.forEach(function (securityDefinitionName) {
                    var securityDefinition = options.api.securityDefinitions[securityDefinitionName];

                    Assert.ok(securityDefinition, 'Security scheme not defined.');
                    Assert.ok(securityDefinition.type === 'apiKey', 'Security schemes other than api_key are not supported.');

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

function buildValidators(validators) {
    var validate = {}, formValidators, headers, query, params;

    validators.forEach(function (validator) {
        switch (validator.parameter.in) {
            case 'header':
                headers = headers || {};
                headers[validator.parameter.name] = validator.schema;
                break;
            case 'query':
                query = query || {};
                query[validator.parameter.name] = validator.schema;
                break;
            case 'path':
                params = params || {};
                params[validator.parameter.name] = validator.schema;
                break;
            case 'body':
                validate.payload = validator.schema;
                break;
            case 'formData':
                formValidators = formValidators || {};
                formValidators[validator.parameter.name] = function (value, next) {
                    validator.validate(value, next);
                };
                break;
        }
    });

    if (headers && Object.keys(headers).length > 0) {
        validate.headers = Joi.object(headers).options({ allowUnknown: true });
    }

    if (query) {
        validate.query = Joi.object(query);
    }

    if (params) {
        validate.params = Joi.object(params);
    }

    if (!validate.payload && formValidators) {
        validate.payload = function (value, options, next) {
            Async.series(Object.keys(value).map(function (k) {
                return function (callback) {
                    formValidators[k](value[k], callback);
                };
            }), function (error) {
                next(error);
            });
        };
    }

    return validate;
}

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
