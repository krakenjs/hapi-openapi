const Test = require('tape');
const Validators = require('../lib/validators');

Test('validator special types', function (t) {
    const api = {
        swagger: '2.0',
        info: {
            title: 'Minimal',
            version: '1.0.0'
        },
        paths: {
            '/test': {
                get: {
                    description: '',
                    parameters: [
                        {
                            name: 'dateTime',
                            in: 'query',
                            required: false,
                            type: 'string',
                            format: 'date-time'
                        }
                    ],
                    responses: {
                        200: {
                            description: 'default response'
                        }
                    }
                }
            }
        }
    };
    const validator = Validators.create(api);

    t.test('valid date-time', async function (t) {
        t.plan(1);

        const { validate } = validator.makeValidator(api.paths['/test'].get.parameters[0]);

        try {
            await validate('1995-09-07T10:40:52Z');
            t.pass('valid date-time');
        }
        catch (error) {
            t.fail(error.message);
        }
    });

    t.test('invalid date-time', async function (t) {
        t.plan(1);

        const { validate } = validator.makeValidator(api.paths['/test'].get.parameters[0]);

        const timestamp = Date.now();

        try {
            await validate(timestamp);
            t.fail(`${timestamp} should be invalid.`);
        }
        catch (error) {
            t.pass(`${timestamp} is invalid.`);
        }
    });

});