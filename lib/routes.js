'use strict';

const ObjectFiles = require('merge-object-files');
const Entries = require('entries');
const Validators = require('./validators');

const create = async function ({ api, basedir, cors, vhost, docspath, handlers, extensions }) {
    const routes = [];

    if (typeof handlers === 'string') {
        handlers = await ObjectFiles.merge(handlers, extensions);
    }

    const matchpath = function (method, pathnames, handlers) {
        if (!handlers) {
            return;
        }
        if (pathnames.length > 1) {
            pathnames.shift();
            return matchpath(method, pathnames, handlers[pathnames[0]]);
        }
        
        return handlers[pathnames[0]] ? handlers[pathnames[0]][method] : handlers[method];
    }

    for (const [path, operations] of Entries(api.paths)) {
        const pathnames = path.split('/').slice(1);
        const pre = [];

        for (const [method, operation] of Entries(operations)) {
            const handler = matchpath(`$${method}`, pathnames, handlers);

            if (!handler) {
                continue;
            }

            if (Array.isArray(handler)) {
                for (let i = 0; i < handler.length - 1; i++) {
                    pre.push({
                        assign: handler[i].name || 'p' + (i + 1),
                        method: handler[i]
                    });
                }
            }

            const options = {
                pre,
                handler,
                cors
            };

            const validators = await Validators.make(operation, operation.consumes || api.consumes);

            if (validators.length) {
                const validate = {};

                let headers, formValidators;

                for (const validator of validators) {
                    switch (validator.parameter.in) {
                        case 'header':
                            headers = headers || {};
                            headers[validator.parameter.name] = validator.schema;
                            break;
                        case 'query':
                            validate.query = options.validate.query || {};
                            validate.query[validator.parameter.name] = validator.schema;
                            break;
                        case 'path':
                            validate.params = options.validate.params || {};
                            validate.params[validator.parameter.name] = validator.schema;
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
                        default:
                            break;
                    }
                }

                if (headers && Object.keys(headers).length > 0) {
                    validate.headers = Joi.object(headers).options({ allowUnknown: true });
                }

                if (!validate.payload && formValidators) {
                    validate.payload = async function (value) {
                        for (const k of Object.keys(value)) {
                            await formValidators[k](value[k]);
                        }
                    };
                }

                options.validate = validate;
            }

            if (operation.security) {
                const securitySchemes = Object.keys(operation.security);

                for (const securityDefinitionName of securitySchemes) {
                    const securityDefinition = api.securityDefinitions[securityDefinitionName];

                    Hoek.assert(securityDefinition, 'Security scheme not defined.');
                    Hoek.assert(securityDefinition.type === 'apiKey', 'Security schemes other than api_key are not supported currently.');

                    options.auth = options.auth || {};
                    options.auth.strategies = options.auth.strategies || [];
                    options.auth.strategies.push(securityDefinitionName);
                }
            }

            routes.push({
                method,
                path: api.basePath + path,
                options,
                vhost
            });
        }
    }

    return routes;
};

module.exports = { create };
