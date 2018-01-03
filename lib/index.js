'use strict';

const Package = require('../package.json');
const Joi = require('joi');
const Hoek = require('hoek');
const Caller = require('./caller');
const Path = require('path');
const Parser = require('swagger-parser');
const Utils = require('./utils');
const Routes = require('./routes');
const Yaml = require('js-yaml');
const Entries = require('entries');
const Fs = require('fs');

const optionsSchema = Joi.object({
    api: Joi.string(),
    //deprecated
    docspath: Joi.string().default('/api-docs'),
    docs: Joi.object({
        path: Joi.string().default('/api-docs'),
        auth: Joi.object().allow(null)
    }).default(),
    cors: Joi.boolean().default(true),
    vhost: Joi.string().allow(null),
    handlers: Joi.alternatives().try(Joi.string().default(Path.resolve(Path.dirname(Caller()), 'routes')), Joi.object()).allow(null),
    extensions: Joi.array().items(Joi.string()).default(['js']),
    outputvalidation: Joi.boolean().default(false)
}).required();

const requireApi = function (path) {
    if (path.match(/\.yaml?/)) {
        const file = Fs.readFileSync(path);
        return Yaml.load(file);
    }
    return require(path);
};

const register = async function (server, options, next) {

    const validation = Joi.validate(options, optionsSchema);

    Hoek.assert(!validation.error, validation.error);

    const { api, cors, vhost, handlers, extensions, outputvalidation } = validation.value;
    let { docs, docspath } = validation.value;

    const spec = await Parser.validate(api);

    spec.basePath = spec.basePath ? Utils.prefix(spec.basePath || '/', '/') : '';

    const basePath = Utils.unsuffix(spec.basePath, '/');

    //Expose plugin api
    server.expose({
        getApi() {
            return spec;
        },
        setHost: function setHost(host) {
            spec.host = host;
        }
    });

    const basedir = Path.dirname(Path.resolve(api));

    if (spec['x-hapi-auth-schemes']) {
        for (const [name, path] of Entries(spec['x-hapi-auth-schemes'])) {
            const scheme = require(Path.resolve(Path.join(basedir, path)));

            await server.register({
                plugin: scheme,
                options: {
                    name
                }
            });
        }
    }
    if (spec.securityDefinitions) {
        for (const [name, security] of Entries(spec.securityDefinitions)) {
            if (security['x-hapi-auth-strategy']) {
                const strategy = require(Path.resolve(Path.join(basedir, security['x-hapi-auth-strategy'])));

                await server.register({
                    plugin: strategy,
                    options: {
                        name,
                        scheme: security.type,
                        lookup: security.name,
                        where: security.in
                    }
                });
            }
        }
    }

    const apiDocument = requireApi(api);

    if (docspath !== '/api-docs' && docs.path === '/api-docs') {
        server.log(['warn'], 'docspath is deprecated. Use docs instead.');
        docs = {
            path: docspath
        };
    }

    docs.path = Utils.prefix(docs.path, '/');
    docs.path = Utils.unsuffix(docs.path, '/');

    //API docs route
    server.route({
        method: 'GET',
        path: basePath + docs.path,
        config: {
            handler(request, h) {
                return apiDocument;
            },
            cors,
            id: 'apidocs',
            description: 'The OpenAPI document.',
            tags: ['api', 'documentation'],
            auth: docs.auth
        },
        vhost
    });

    const routes = await Routes.create(server, { api: spec, basedir, cors, vhost, handlers, extensions, outputvalidation });

    for (const route of routes) {
        server.route(route);
    }
};

module.exports.plugin = { register, name: 'swagger', version: Package.version };
