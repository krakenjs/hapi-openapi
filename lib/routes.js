'use strict';

const ObjectFiles = require('merge-object-files');
const Entries = require('entries');
const Validators = require('./validators');
const Hoek = require('hoek');

const create = async function ({ api, basedir, cors, vhost, docspath, handlers, extensions }) {
    const routes = [];
    const validator = Validators.create({ api });

    if (typeof handlers === 'string') {
        handlers = await ObjectFiles.merge(handlers, extensions);
    }

    for (const [path, operations] of Entries(api.paths)) {
        const pathnames = path.split('/').slice(1).join('.');

        for (const [method, operation] of Entries(operations)) {
            const handler = Hoek.reach(handlers, `${pathnames}.${method}`);

            if (!handler) {
                continue;
            }

            const options = {
                pre: [],
                handler,
                cors
            };

            if (Array.isArray(handler)) {
                for (let i = 0; i < handler.length - 1; i++) {
                    options.pre.push({
                        assign: handler[i].name || 'p' + (i + 1),
                        method: handler[i]
                    });
                }
                options.handler = handler[handler.length - 1];
            }

            options.validate = validator.makeAll(operation);

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
