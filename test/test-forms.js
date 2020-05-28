'use strict';

const Test = require('tape');
const Path = require('path');
const OpenAPI = require('../lib');
const Hapi = require('@hapi/hapi');


Test('form data', function (t) {

    // TODO: figure out the content-type issue for oas3. It may have to do with not using a 'form' type
    for (const schemaVersion of ['oas2']) {
        t.test('upload', async function (t) {
            t.plan(1);

            try {
                const server = new Hapi.Server();

                await server.register({
                    plugin: OpenAPI,
                    options: {
                        api: Path.join(__dirname, `./fixtures/defs/${schemaVersion}/form.json`),
                        handlers: {
                            upload: {
                                post: function (req, h) {
                                    return  {
                                        upload: req.payload.toString()
                                    };
                                }
                            }
                        },
                        outputvalidation: true
                    }
                });

                const response = await server.inject({
                    method: 'POST',
                    url: '/v1/forms/upload',
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    payload: 'name=thing&upload=data'
                });

                t.strictEqual(response.statusCode, 200, `${schemaVersion} ${response.request.path} OK.`);
            }
            catch (error) {
                t.fail(error.message);
            }

        });

        t.test('bad content type', async function (t) {
            t.plan(1);

            try {
                const server = new Hapi.Server();

                await server.register({
                    plugin: OpenAPI,
                    options: {
                        api: Path.join(__dirname, `./fixtures/defs/${schemaVersion}/form.json`),
                        handlers: {
                            upload: {
                                post: function (req, h) {
                                    return '';
                                }
                            }
                        }
                    }
                });

                const response = await server.inject({
                    method: 'POST',
                    url: '/v1/forms/upload',
                    payload: 'name=thing&upload=data'
                });

                t.strictEqual(response.statusCode, 415, `${schemaVersion} ${response.request.path} unsupported media type.`);
            }
            catch (error) {
                t.fail(error.message);
            }

        });


        t.test('invalid payload', async function (t) {
            t.plan(1);

            try {
                const server = new Hapi.Server();

                await server.register({
                    plugin: OpenAPI,
                    options: {
                        api: Path.join(__dirname, `./fixtures/defs/${schemaVersion}/form.json`),
                        handlers: {
                            upload: {
                                post: function (req, h) {
                                    return;
                                }
                            }
                        }
                    }
                });

                const response = await server.inject({
                    method: 'POST',
                    url: '/v1/forms/upload',
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    payload: 'name=thing&upload='
                });

                t.strictEqual(response.statusCode, 400, `${schemaVersion} ${response.request.path} validation error.`);
            }
            catch (error) {
                t.fail(error.message);
            }

        });
    }

});
