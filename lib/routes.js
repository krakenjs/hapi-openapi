import ObjectFiles from 'merge-object-files-es6';
import Validators from './validators.js';
import Hoek from '@hapi/hoek';
import Utils from './utils.js';
import Path from 'path';
import Props from 'dot-prop';

const SEPARATOR = String.fromCharCode(0x7F);

export const create = async function (server, { api, basedir, cors, vhost, handlers, extensions, outputvalidation }) {
    const routes = [];
    const validator = Validators.create({ api });

    if (typeof handlers === 'string') {
        handlers = await ObjectFiles.merge(handlers, extensions);
    }

    //Support x-hapi-handler when no handlers set.
    if (!handlers) {
        for (const [path, operations] of Object.entries(api.paths)) {
            if (operations['x-hapi-handler']) {
                const pathnames = path.split('/').slice(1).join('.');

                if (!handlers) {
                    handlers = {};
                }

                const xhandler = await import(Path.resolve(Path.join(basedir, operations['x-hapi-handler'])));

                Props.set(handlers, pathnames, Utils.mergeDefault(xhandler));
            }
        }
    }

    for (const [path, operations] of Object.entries(api.paths)) {
        const pathnames = Utils.unsuffix(path, '/').split('/').slice(1).join(SEPARATOR);

        for (const [method, operation] of Object.entries(operations)) {
            const pathsearch = `${pathnames}${SEPARATOR}${method}`;
            const handler = Hoek.reach(handlers, pathsearch, { separator: SEPARATOR });
            const xoptions = operation['x-hapi-options'] || {};

            if (!handler) {
                continue;
            }

            const customTags = operation.tags || [];
            const options = Object.assign({
                cors,
                id: operation.operationId,
                // hapi does not support empty descriptions
                description: operation.description !== '' ? operation.description : undefined,
                tags: ['api', ...customTags]
            }, xoptions);

            options.handler = handler;

            if (Utils.canCarry(method)) {
                options.payload = options.payload ? Hoek.applyToDefaults({ allow: operation.consumes || api.consumes }, options.payload) : { allow: operation.consumes || api.consumes };
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

            const skipValidation = options.payload && options.payload.parse === false;

            if ((operation.parameters || operation.requestBody) && !skipValidation) {
                const allowUnknownProperties = xoptions.validate && xoptions.validate.options && xoptions.validate.options.allowUnknown === true;
                const v = validator.makeAll(operation.parameters, operation.requestBody, operation.consumes || api.consumes, api.openapi, allowUnknownProperties);
                options.validate = v.validate;
                options.ext = {
                    onPreAuth: { method: v.routeExt }
                };
            }

            if (outputvalidation && operation.responses) {
                options.response = {};
                options.response.status = validator.makeResponseValidator(operation.responses, api.openapi);
            }

            if (operation.security === undefined && api.security) {
                operation.security = api.security;
            }

            if (operation.security && operation.security.length) {
                for (const secdef of operation.security) {
                    const securitySchemes = Object.keys(secdef);
                    if (!securitySchemes.length) {
                        options.auth = options.auth || { access: {}, mode: 'optional' };
                        options.auth.mode = 'optional';
                    }

                    for (const securityDefinitionName of securitySchemes) {
                        let securityDefinition;
                        if (api.swagger) {
                            securityDefinition = api.securityDefinitions[securityDefinitionName];
                        }

                        if (api.openapi) {
                            securityDefinition = api.components.securitySchemes[securityDefinitionName];
                        }

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
