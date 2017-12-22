'use strict';

const Package = require('../package.json');
const Joi = require('joi');
const Hoek = require('hoek');
const Caller = require('caller');
const Path = require('path');
const Parser = require('swagger-parser');
const Utils = require('./utils');
const Routes = require('./routes');
const Yaml = require('js-yaml');

const optionsSchema = Joi.object({
    basedir: Joi.string().default(Path.resolve(Path.dirname(Caller()))),
    api: Joi.string(),
    docspath: Joi.string().default('/api-docs'),
    cors: Joi.boolean().default(true),
    vhost: Joi.string().allow(null),
    handlers: Joi.alternatives().try(Joi.string().default(Path.resolve(Path.dirname(Caller()), 'routes')), Joi.object()),
    extensions: Joi.array().items(Joi.string()).default(['js'])
}).required();

const requireApi = function (api) {
    return api.endsWith('yaml') ? Yaml.safeLoad(api) : require(api);
};

const register = async function (server, options, next) {
    const validation = Joi.validate(options, optionsSchema);

    Hoek.assert(!validation.error, validation.error);

    const { api, basedir, cors, vhost, handlers, extensions } = validation.value;

    const spec = await Parser.validate(api);

    let docspath = validation.value.docspath;

    docspath = Utils.prefix(docspath, '/');
    docspath = Utils.unsuffix(docspath, '/');

    spec.basePath = Utils.prefix(spec.basePath || '/', '/');

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

    const apiDocument = requireApi(api);

    //API docs route
    server.route({
        method: 'GET',
        path: basePath + docspath,
        config: {
            handler(request, h) {
                return apiDocument;
            },
            cors
        },
        vhost
    });

    await Routes.create(server, { api: spec, basedir, cors, vhost, docspath, handlers, extensions });
};

module.exports.plugin = { register, name: 'swagger', version: Package.version };
