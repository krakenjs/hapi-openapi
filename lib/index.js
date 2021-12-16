import Package from '../package.json';
import Joi from 'joi';
import Hoek from '@hapi/hoek';
import Caller from './caller.js';
import Path from 'path';
import Parser from 'swagger-parser';
import Utils from './utils.js';
import { create } from './routes.js';
import Yaml from 'js-yaml';
import Fs from 'fs';

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
    if (Array.isArray(obj)) {
        const clean = [];
        for (const value of obj) {
            clean.push(stripVendorExtensions(value));
        }

        return clean;
    }

    if (typeof obj === 'object') {
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

const requireApi = async function (path) {
    let document;

    if (path.match(/\.ya?ml?/)) {
        const file = Fs.readFileSync(path);
        document = Yaml.load(file);
    }
    else {
        document = await import(path);
        document = Utils.mergeDefault(document);
    }

    return document;
};

const register = async function (server, options, next) {

    //Validator needs to be explicitly declared for Hapi v19.*
    server.validator(Joi);

    const validation = optionsSchema.validate(options);

    Hoek.assert(!validation.error, validation.error);

    const { api, cors, vhost, handlers, extensions, outputvalidation } = validation.value;
    let { docs, docspath } = validation.value;
    const spec = await Parser.validate(api);

    // Cannot use conflicting url pathnames, so opting to mount the first url pathname
    if (spec.openapi) {
        spec.basePath = new URL(Hoek.reach(spec, ['servers', 0, 'url'])).pathname;
    }

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

    if (typeof api === 'string') {
        apiDocument = await requireApi(api);
        basedir = Path.dirname(Path.resolve(api));
    }
    else {
        apiDocument = api;
        basedir = CALLER_DIR;
    }

    if (spec['x-hapi-auth-schemes']) {
        for (const [name, path] of Object.entries(spec['x-hapi-auth-schemes'])) {
            let scheme = await import(Path.resolve(Path.join(basedir, path)));
            scheme = Utils.mergeDefault(scheme);

            await server.register({
                plugin: scheme,
                options: {
                    name
                }
            });
        }
    }

    let securitySchemes;

    if (spec.swagger && spec.securityDefinitions) {
        securitySchemes = spec.securityDefinitions;
    }

    if (spec.openapi && spec.components && spec.components.securitySchemes) {
        securitySchemes = spec.components.securitySchemes;
    }

    if (securitySchemes) {
        for (const [name, security] of Object.entries(securitySchemes)) {
            if (security['x-hapi-auth-strategy']) {
                let strategy = await import(Path.resolve(Path.join(basedir, security['x-hapi-auth-strategy'])));
                strategy = Utils.mergeDefault(strategy);

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
    if (docs.prefixBasePath) {
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

    const routes = await create(server, { api: spec, basedir, cors, vhost, handlers, extensions, outputvalidation });

    for (const route of routes) {
        server.route(route);
    }
};

export default { plugin: { register, name: 'openapi', version: Package.version, multiple: true } };
