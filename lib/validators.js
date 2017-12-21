'use strict';

const Enjoi = require('enjoi');
const Hoek = require('hoek');

const create = function (options = {}) {
    const schemas = {};
    const types = {
        file: Enjoi({
            type: 'object',
            properties: {
                value: {
                    type: 'string',
                    minLength: 0,
                    required: true
                },
                consumes: {
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: /multipart\/form-data|application\/x-www-form-urlencoded/,
                    },
                    required: true
                },
                in: {
                    type: 'string',
                    pattern: /formData/,
                    required: true
                }
            }
        })
    };

    schemas['#'] = options.api;

    Hoek.applyToDefaults(schemas, options.schemas);

    const makeValidator = function (parameter, consumes) {
        const coerce = coercion(parameter, consumes);

        const template = {
            required: parameter.required,
            enum: parameter.enum,
            type: normalizetype(parameter.type),
            schema: parameter.schema,
            items: parameter.items,
            properties: parameter.properties,
            pattern: parameter.pattern,
            format: parameter.format,
            allowEmptyValue: parameter.allowEmptyValue,
            collectionFormat: parameter.collectionFormat,
            default: parameter.default,
            maximum: parameter.maximum,
            minimum: parameter.minimum,
            maxLength: parameter.maxLength,
            minLength: parameter.minLength,
            maxItems: parameter.maxItems,
            minItems: parameter.minItems,
            uniqueItems: parameter.uniqueItems,
            multipleOf: parameter.multipleOf
        };

        let schema;

        if ((parameter.in === 'body' || parameter.in === 'formData') && template.schema) {
            schema = Enjoi(template.schema, {
                subSchemas: schemas,
                types: types
            });
        }
        else {
            schema = Enjoi(template, {
                subSchemas: schemas,
                types: types
            });
        }

        if (parameter.required) {
            schema = schema.required();
        }

        if (parameter.in !== 'body' && parameter.allowEmptyValue){
            schema = schema.allow('').optional();
        }

        return {
            parameter: parameter,
            schema: schema
        };
    };

    const makeAll = function (operation) {
        const validate = {};

        for (const parameter of operation.parameters) {
            const validator = makeValidator(parameter, operation.consumes || options.api.consumes);

            let headers, formValidators;

            switch (validator.parameter.in) {
                case 'header':
                    headers = headers || {};
                    headers[validator.parameter.name] = validator.schema;
                    break;
                case 'query':
                    validate.query = validate.query || {};
                    validate.query[validator.parameter.name] = validator.schema;
                    break;
                case 'path':
                    validate.params = validate.params || {};
                    validate.params[validator.parameter.name] = validator.schema;
                    break;
                case 'body':
                    validate.payload = validator.schema;
                    break;
                case 'formData':
                    formValidators = formValidators || {};
                    formValidators[validator.parameter.name] = function (value, next) {
                        validator.validate(value, next);
                    };
                    break;
                default:
                    break;
            }

            if (headers && Object.keys(headers).length > 0) {
                validate.headers = Joi.object(headers).options({ allowUnknown: true });
            }

            if (!validate.payload && formValidators) {
                validate.payload = async function (value) {
                    for (const k of Object.keys(value)) {
                        await formValidators[k](value[k]);
                    }
                };
            }
        }

        return validate;
    };

    return {
        makeAll,
        makeValidator
    };
};

const coercion = function (parameter, consumes) {
    var fn;

    switch (parameter.type) {
        case 'array'  :
            fn = function (data) {
                var sep;

                if (Array.isArray(data)) {
                    return data;
                }

                sep = pathsep(parameter.collectionFormat || 'csv');
                return data.split(sep);
            };
            break;
        case 'integer':
        case 'float':
        case 'long':
        case 'double':
            fn = function (data) {
                if (isNaN(data)) {
                    return data;
                }
                return Number(data);
            };
            break;
        case 'string':
            fn = String;
            break;
        case 'byte':
            fn = function (data) {
                return isNaN(data) ? new Buffer(data)[0] : Number(data);
            };
            break;
        case 'boolean':
            fn = function(data) {
                return (data === 'true') || (data === '1') || (data === true);
            };
            break;
        case 'date':
        case 'dateTime':
            fn = Date.parse;
            break;
        case 'file': {
            fn = function (data) {
                return {
                    value: data,
                    consumes: consumes,
                    in: parameter.in
                };
            };
            break;
        }
    }

    if (!fn && parameter.schema) {
        fn = function (data) {
            if (thing.isObject(data) && !Object.keys(data).length) {
                return undefined;
            }
            return data;
        };
    }

    return fn;
}

const normalizetype = function (type) {
    switch (type) {
        case 'long':
        case 'byte':
            return 'integer';
        case 'float':
        case 'double':
            return 'number';
        case 'date':
        case 'dateTime':
            return 'string';
        default:
            return type;
    }
}

const pathsetp = function (format) {
    switch (format) {
        case 'csv':
            return ',';
        case 'ssv':
            return ' ';
        case 'tsv':
            return '\t';
        case 'pipes':
            return '|';
        case 'multi':
            return '&';
    }
}


const make = async function (operation, consumes) {

    return [];
};

module.exports = { create };
