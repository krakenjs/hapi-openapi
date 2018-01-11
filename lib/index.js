'use strict';

const Package = require('../package.json');
const HapiOpenAPI = require('hapi-openapi');
const Utils = require('hapi-openapi/lib/utils');
const Joi = require('joi');
const Hoek = require('hoek');
const Caller = require('./caller');
const Path = require('path');

const CALLER_DIR = Path.resolve(Path.dirname(Caller()));

const optionsSchema = Joi.object({
    api: Joi.alternatives(Joi.string(), Joi.object().unknown(true)),
    //deprecated
    docspath: Joi.string().default('/api-docs'),
    docs: Joi.object({
        path: Joi.string().default('/api-docs'),
        auth: Joi.object().allow(null)
    }).default(),
    cors: Joi.boolean().default(true),
    vhost: Joi.string().allow(null),
    handlers: Joi.alternatives().try(Joi.string().default(Path.join(CALLER_DIR, 'routes')), Joi.object()).allow(null),
    extensions: Joi.array().items(Joi.string()).default(['js']),
    outputvalidation: Joi.boolean().default(false)
}).required();

const register = async function (server, options, next) {

    server.log(['warn'], 'You are using an old version. Use hapi-openapi instead.');

    const validation = Joi.validate(options, optionsSchema);

    Hoek.assert(!validation.error, validation.error);

    const { api, cors, vhost, handlers, extensions, outputvalidation } = validation.value;
    let { docs, docspath } = validation.value;

    if (docspath !== '/api-docs' && docs.path === '/api-docs') {
        server.log(['warn'], 'docspath is deprecated. Use docs instead.');
        docs = {
            path: docspath
        };
    }

    docs.path = Utils.prefix(docs.path, '/');
    docs.path = Utils.unsuffix(docs.path, '/');

    await server.register({
        plugin: HapiOpenAPI,
        options: {
            api,
            docs,
            handlers,
            extensions,
            outputvalidation,
            cors,
            vhost
        }
    });

    server.expose({
        getApi() {
            return server.plugins.openapi.getApi();
        },
        setHost: function setHost(host) {
            server.plugins.openapi.setHost(host);
        }
    });
};

module.exports.plugin = { register, name: 'swagger', version: Package.version };
