'use strict';

const ObjectFiles = require('merge-object-files');
const Validators = require('./validators');
const Hoek = require('@hapi/hoek');
const Utils = require('./utils');
const Path = require('path');
const Props = require('dot-prop');

const create = async function ({ api, cors, vhost, handlers, extensions, outputvalidation }) {
    const routes = [];
    const validator = Validators.create();

    if (typeof handlers === 'string') {
        handlers = await ObjectFiles.merge(handlers, extensions);
    }
    //Support x-hapi-handler when no handlers set.
    if (!handlers) {
        api.operations.filter((operation) => operation.handler)
            .forEach((operation) => {
                const pathnames = operation.path.split('/').slice(1).join('.');

                if (!handlers) {
                    handlers = {};
                }

                const xhandler = require(Path.resolve(operation.handler));

                Props.set(handlers, pathnames, xhandler);
            });
    }

    api.operations.forEach((operation) => {
        const pathnames = Utils.unsuffix(operation.path, '/').split('/').slice(1).join('.');
        const pathsearch = `${pathnames}.${operation.method}`;
        const handler = Hoek.reach(handlers, pathsearch);
        const xoptions = operation.customOptions || {};

        if (!handler) {
            return;
        }

        const customTags = operation.tags || [];
        const options = {
            cors,
            id: operation.operationId,
            // hapi does not support empty descriptions
            description: operation.description !== '' ? operation.description : undefined,
            tags: ['api', ...customTags],
            handler,
            ...xoptions,
        };

        if (Utils.canCarry(operation.method)) {
            options.payload = options.payload ?
                Hoek.applyToDefaults({ allow: operation.mediaTypes.request }, options.payload) :
                { allow: operation.mediaTypes.request };
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

        if (operation.parameters && !skipValidation) {
            const allowUnknownProperties = xoptions.validate && xoptions.validate.options && xoptions.validate.options.allowUnknown === true;
            const v = validator.makeAll(operation.parameters, operation.mediaTypes.request, allowUnknownProperties);
            options.validate = v.validate;
            options.ext = {
                onPreAuth: { method: v.routeExt }
            };
        }

        if (outputvalidation && operation.responses) {
            options.response = {};
            options.response.status = validator.makeResponseValidator(operation.responses);
        }

        operation.security.forEach((secdef) => {
            options.auth = options.auth || { access: {}, mode: 'required' };
            options.auth.access.scope = options.auth.access.scope || [];
            options.auth.access.scope.push(...secdef.scopes);
            options.auth.strategies = options.auth.strategies || [];
            options.auth.strategies.push(secdef.schemeName);

            if (options.auth.access.scope.length === 0) {
                options.auth.access.scope = false;
            }
        });

        routes.push({
            method: operation.method,
            path: api.basePath + operation.path,
            options,
            vhost
        });
    });

    return routes;
};

module.exports = { create };
