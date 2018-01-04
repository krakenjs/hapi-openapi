'use strict';

const ObjectFiles = require('merge-object-files');
const Entries = require('entries');
const Validators = require('./validators');
const Hoek = require('hoek');
const Utils = require('./utils');
const Path = require('path');
const Props = require('dot-prop');

const create = async function (server, { api, basedir, cors, vhost, handlers, extensions, outputvalidation }) {
    const routes = [];
    const validator = Validators.create({ api });
    
    if (typeof handlers === 'string') {
        handlers = await ObjectFiles.merge(handlers, extensions);
    }
    //Support x-hapi-handler when no handlers set.
    if (!handlers) {
        for (const [path, operations] of Entries(api.paths)) {
            if (operations['x-hapi-handler']) {
                const pathnames = path.split('/').slice(1).join('.');

                if (!handlers) {
                    handlers = {};
                }

                const xhandler = require(Path.resolve(Path.join(basedir, operations['x-hapi-handler'])));

                Props.set(handlers, pathnames, xhandler);
            }
        }
    }

    for (const [path, operations] of Entries(api.paths)) {
        const pathnames = Utils.unsuffix(path, '/').split('/').slice(1).join('.');

        for (const [method, operation] of Entries(operations)) {
            const pathsearch = `${pathnames}.${method}`;
            const handler = Hoek.reach(handlers, pathsearch);
            const xoptions = operation['x-hapi-options'] || {};

            if (!handler) {
                continue;
            }

            const options = Object.assign({
                cors,
                id: operation.operationId,
                description: operation.description,
                tags: ['api']
            }, xoptions);

            options.handler = handler;

            if (Utils.canCarry(method)) {
                options.payload = {
                    allow: operation.consumes || api.consumes
                };
            }

            if (Array.isArray(handler)) {
                options.pre = [];

                for (let i = 0; i < handler.length - 1; ++i) {
                    options.pre.push({
                        assign: handler[i].name || 'p' + (i + 1),
                        method: handler[i]
                    });
                }
                options.handler = handler[handler.length - 1];
            }

            options.validate = validator.makeAll(operation.parameters, operation.consumes || api.consumes);

            if (outputvalidation) {
                options.response = {};
                options.response.status = validator.makeResponseValidator(operation);
            }

            if (operation.security && operation.security.length) {
                for (const secdef of operation.security) {
                    const securitySchemes = Object.keys(secdef);

                    for (const securityDefinitionName of securitySchemes) {
                        if (!server.auth._strategies[securityDefinitionName]) {
                            server.log(['warn'], `${securityDefinitionName} strategy was not registered.`);
                            continue;
                        }

                        const securityDefinition = api.securityDefinitions[securityDefinitionName];

                        Hoek.assert(securityDefinition, 'Security scheme not defined.');

                        options.auth = options.auth || { access: {}, mode: 'required' };
                        options.auth.access.scope = options.auth.access.scope || [];
                        options.auth.access.scope.push(...secdef[securityDefinitionName]);
                        options.auth.strategies = options.auth.strategies || [];
                        options.auth.strategies.push(securityDefinitionName);
                    }
                }
                if (options.auth.access.scope.length === 0) {
                    options.auth.access.scope = false;
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
