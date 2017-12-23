'use strict';

const ObjectFiles = require('merge-object-files');
const Entries = require('entries');
const Validators = require('./validators');
const Hoek = require('hoek');
const Utils = require('./utils');

const create = async function (server, { api, basedir, cors, vhost, docspath, handlers, extensions }) {
    const routes = [];
    const validator = Validators.create({ api });

    if (typeof handlers === 'string') {
        handlers = await ObjectFiles.merge(handlers, extensions);
    }

    for (const [path, operations] of Entries(api.paths)) {
        const pathnames = path.split('/').slice(1).join('.');

        for (const [method, operation] of Entries(operations)) {
            const pathsearch = `${pathnames}.${method}`;
            const handler = Hoek.reach(handlers, pathsearch);

            if (!handler) {
                continue;
            }

            const options = {
                handler,
                cors,
                id: operation.operationId,
                description: operation.description,
                tags: ['api']
            };

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

            options.validate = validator.makeAll(operation);

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

    for (const route of routes) {
        server.route(route);
    }
};

module.exports = { create };
