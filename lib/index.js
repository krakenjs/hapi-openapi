'use strict';

const Package = require('../package.json');
const Joi = require('@hapi/joi');
const Hoek = require('@hapi/hoek');
const Caller = require('./caller');
const Path = require('path');
const Parser = require('swagger-parser');
const Utils = require('./utils');
const Routes = require('./routes');
const Yaml = require('js-yaml');
const Fs = require('fs');
const Util = require('util');

const CALLER_DIR = Path.resolve(Path.dirname(Caller()));

const optionsSchema = Joi.object({
    api: Joi.alternatives(Joi.string(), Joi.object().unknown(true)),
    //deprecated
    docspath: Joi.string().default('/api-docs'),
    docs: Joi.object({
        path: Joi.string().default('/api-docs'),
        auth: Joi.alternatives().try(Joi.object(), Joi.boolean()).allow(null),
        stripExtensions: Joi.boolean().default(true),
        prefixBasePath: Joi.boolean().default(true)
    }).default(),
    cors: Joi.alternatives().try(Joi.object(), Joi.boolean()).default(true),
    vhost: Joi.string().allow(null),
    handlers: Joi.alternatives().try(Joi.string().default(Path.join(CALLER_DIR, 'routes')), Joi.object()).allow(null),
    extensions: Joi.array().items(Joi.string()).default(['js']),
    outputvalidation: Joi.boolean().default(false)
}).required();

const stripVendorExtensions = function (obj) {
    if (Util.isArray(obj)) {
        const clean = [];
        for (const value of obj) {
            clean.push(stripVendorExtensions(value));
        }
        return clean;
    }
    if (Util.isObject(obj)) {
        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            if (!key.match(/\x-(.*)/)) {
                clean[key] = stripVendorExtensions(value);
            }
        }
        return clean;
    }
    return obj;
};

const requireApi = function (path) {
    let document;

    if (path.match(/\.ya?ml?/)) {
        const file = Fs.readFileSync(path);
        document = Yaml.load(file);
    }
    else {
        document = require(path);
    }

    return document;
};

const register = async function (server, options, next) {

    const validation = optionsSchema.validate(options);

    Hoek.assert(!validation.error, validation.error);

    const { api, cors, vhost, handlers, extensions, outputvalidation } = validation.value;
    let { docs, docspath } = validation.value;
    const spec = await Parser.validate(api);

    spec.basePath = Utils.unsuffix(Utils.prefix(spec.basePath || '/', '/'), '/');

    //Expose plugin api
    server.expose({
        getApi() {
            return spec;
        },
        setHost: function setHost(host) {
            spec.host = host;
        }
    });

    let basedir;
    let apiDocument;

    if (Util.isString(api)) {
        apiDocument = requireApi(api);
        basedir = Path.dirname(Path.resolve(api));
    }
    else {
        apiDocument = api;
        basedir = CALLER_DIR;
    }

    if (spec['x-hapi-auth-schemes']) {
        for (const [name, path] of Object.entries(spec['x-hapi-auth-schemes'])) {
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
        for (const [name, security] of Object.entries(spec.securityDefinitions)) {
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

    if (docspath !== '/api-docs' && docs.path === '/api-docs') {
        server.log(['warn'], 'docspath is deprecated. Use docs instead.');
        docs = {
            path: docspath,
            prefixBasePath: docs.prefixBasePath
        };
    }

    let apiPath = docs.path;
    if (docs.prefixBasePath){
        docs.path = Utils.prefix(docs.path, '/');
        docs.path = Utils.unsuffix(docs.path, '/');
        apiPath = spec.basePath + docs.path;
    }

    if (docs.stripExtensions) {
        apiDocument = stripVendorExtensions(apiDocument);
    }

    //API docs route
    server.route({
        method: 'GET',
        path: apiPath,
        config: {
            handler(request, h) {
                return apiDocument;
            },
            cors,
            id: `${apiPath.replace(/\//g, '_')}`,
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

module.exports.plugin = { register, name: 'openapi', version: Package.version, multiple: true };
