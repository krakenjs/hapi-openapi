import Test from 'tape';
import Path from 'path';
import OpenAPI from '../lib/index.js';
import Hapi from '@hapi/hapi';

import { fileURLToPath } from 'url';
const __dirname = Path.dirname(fileURLToPath(import.meta.url));

Test('form data', (t) => {

    t.test('upload', async (t) => {
        t.plan(1);

        try {
            const server = new Hapi.Server();

            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/form.json'),
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

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);
        }
        catch (error) {
            t.fail(error.message);
        }

    });

    t.test('bad content type', async (t) => {
        t.plan(1);

        try {
            const server = new Hapi.Server();

            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/form.json'),
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

            t.strictEqual(response.statusCode, 415, `${response.request.path} unsupported media type.`);
        }
        catch (error) {
            t.fail(error.message);
        }

    });


    t.test('invalid payload', async (t) => {
        t.plan(1);

        try {
            const server = new Hapi.Server();

            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/form.json'),
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

            t.strictEqual(response.statusCode, 400, `${response.request.path} validation error.`);
        }
        catch (error) {
            t.fail(error.message);
        }

    });

});
