'use strict';

const Enjoi = require('enjoi');
const Joi = require('joi');

const extensions = [
    { type: 'int64', base: Joi.string().regex(/^\d+$/) },
    { type: 'byte', base: Joi.string().base64() },
    { type: 'date-time', base: Joi.date().iso() },
    {
        type: 'file',
        base: Joi.object({
            value: Joi.binary().required(true),
            consumes: Joi.array().items(
                Joi.string().regex(/multipart\/form-data|application\/x-www-form-urlencoded/)
            ).required(true),
            in: Joi.string().regex(/formData/).required(true)
        })
    }
];

const refineType = function (type, format) {
    if (type === 'integer') {
        type = 'number';
    }

    switch (format) {
        case 'int64':
        case 'byte':
        case 'binary':
        case 'date':
        case 'date-time':
            return format;
        default:
            return type;
    }
};

const refineSchema = function (joiSchema, jsonSchema) {
    if (jsonSchema.nullable) {
        return joiSchema.allow(null);
    }

    return joiSchema;
};

const enjoi = Enjoi.defaults({ extensions, refineType, refineSchema });

const create = function (options = {}) {
    const makeValidator = function (parameter, consumes, openapi, allowUnknownProperties = false) {
        const coerce = coercion(parameter, consumes);

        let schema;

        if ((parameter.in === 'body' || parameter.in === 'formData') && parameter.schema) {
            schema = enjoi.schema(parameter.schema);
            if (schema.type === 'object') {
                schema = schema.unknown(allowUnknownProperties);
            }
        }
        else {
            let template = {
                required: parameter.required,
                enum: parameter.enum,
                type: parameter.type,
                schema: undefined,
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

            if (openapi) {
                template = { ...template, ...parameter.schema };
            } 
            else {
                template.schema = parameter.schema;
            }

            schema = enjoi.schema(template);
        }

        if (parameter.type === 'array') {
            schema = schema.single(true);
        }

        if (parameter.required) {
            schema = schema.required();
        }

        if (parameter.in !== 'body' && parameter.allowEmptyValue) {
            schema = schema.allow('').optional();
        }

        return {
            parameter,
            schema,
            routeExt: function (request, h) {
                const p = parameter.in === 'query' ? 'query' : 'params';

                if(parameter.style === "deepObject") {
                    request[p] = Object.keys(request[p]).reduce((data, key) => {
                        let match = key.match(new RegExp(`^${parameter.name}\\[([^\\]]*)]$`));
                        if(match) {
                            data[parameter.name] = {
                                ...data[parameter.name] ?? {},
                                [match[1]]:request[p][key]
                            }
                            delete request[p][key];
                        }
                        return data;
                    },request[p]);
                }

                if (request[p][parameter.name] !== undefined) {
                    request[p][parameter.name] = coerce && request[p][parameter.name] && coerce(request[p][parameter.name]);
                }

                return h.continue;
            },
            validate: function (value) {
                const data = coerce && value && coerce(value);
                const result = schema.validate(data);

                if (result && result.error) {

                    result.error.message = result.error.message.replace('value', parameter.name);

                    result.error.details.forEach((detail) => {
                        detail.message = detail.message.replace('value', parameter.name);
                        detail.path = [parameter.name];
                    });

                    throw result.error;
                }

                return result.value;
            }
        };
    };

    const makeResponseValidator = function (responses, openapi) {
        const schemas = {};

        for (const [code, response] of Object.entries(responses)) {
            if (!isNaN(code)) {
                let schemaDesc;
                if (openapi && response.content) {
                    for (const mediaType of Object.keys(response.content)) {
                        // Applying first available schema to all media types
                        if (response.content[mediaType].schema) {
                            schemaDesc = response.content[mediaType].schema;
                            break;
                        }
                    }
                } 
                else {
                    schemaDesc = response.schema;
                }

                if (schemaDesc) {
                    const schema = enjoi.schema(schemaDesc);
                    if (schemaDesc === 'array') {
                        schema.single(true);
                    }

                    schemas[code] = schema;
                }
            }
        }

        return schemas;
    };

    const makeAll = function (parameters = [], requestBody, consumes, openapi, allowUnknownProperties = false) {
        const routeExt = [];
        const validate = {};
        const formValidators = {};
        let headers = {};

        const formValidator = function (value) {
            const result = this.validate(value);

            if (result.error) {
                throw result.error;
            }

            return this.parameter.type === 'file' ? result.value : result;
        };

        if (openapi && requestBody && requestBody.content) {
            consumes = Object.keys(requestBody.content);
            for (const mediaType of consumes) {
                // Applying first available schema to all media types
                if (requestBody.content[mediaType].schema) {
                    const parameter = { in: 'body', schema: requestBody.content[mediaType].schema, name: 'body' };
                    const validator = makeValidator(parameter, consumes, openapi, allowUnknownProperties);
                    validate.payload = validator.validate;
                    break;
                }
            }
        }

        for (const parameter of parameters) {
            const validator = makeValidator(parameter, consumes, openapi, allowUnknownProperties);

            switch (validator.parameter.in) {
                case 'header':
                    headers = headers || {};
                    headers[validator.parameter.name] = validator.schema;
                    break;
                case 'query':
                    validate.query = validate.query || {};
                    validate.query[validator.parameter.name] = validator.schema;
                    routeExt.push(validator.routeExt);
                    break;
                case 'path':
                    validate.params = validate.params || {};
                    validate.params[validator.parameter.name.replace(/(\*[0-9]*|\?)$/, '')] = validator.schema;
                    routeExt.push(validator.routeExt);
                    break;
                case 'body':
                    validate.payload = validator.validate;
                    break;
                case 'formData':
                    formValidators[validator.parameter.name] = formValidator.bind(validator);
                    break;
                default:
                    break;
            }

            if (headers && Object.keys(headers).length > 0) {
                validate.headers = Joi.object(headers).options({ allowUnknown: true });
            }

            if (!validate.payload && Object.keys(formValidators).length > 0) {
                validate.payload = async function (value) {
                    const results = {};

                    for (const [param, data] of Object.entries(value)) {
                        results[param] = await formValidators[param](data);
                    }

                    return results;
                };
            }
        }

        for (const [key, value] of Object.entries(validate)) {
            if (typeof value === 'object' && !Joi.isSchema(value)) {
                validate[key] = Joi.object(value);
            }
        }

        return {
            validate,
            routeExt
        };
    };

    return {
        makeAll,
        makeValidator,
        makeResponseValidator
    };
};

const pathsep = function (format) {
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
};

const coercion = function (parameter, consumes) {
    let fn;

    switch (parameter.type) {
        case 'array':
            fn = function (data) {
                if (Array.isArray(data)) {
                    return data;
                }

                const sep = pathsep(parameter.collectionFormat || 'csv');

                return data.split(sep);
            };

            break;
        case 'integer':
        case 'number':
            fn = function (data) {
                if (parameter.format === 'int64') {
                    return data;
                }
                
                return Number(data);
            };

            break;
        case 'string':
            //TODO: handle date, date-time, binary, byte formats.
            fn = String;
            break;
        case 'boolean':
            fn = function (data) {
                return (data === 'true') || (data === '1') || (data === true);
            };

            break;
        case 'file': {
            fn = function (data) {
                return {
                    value: data,
                    consumes,
                    in: parameter.in
                };
            };
            
            break;
        }
    }

    if (!fn && parameter.schema) {
        fn = (data) => data;
    }

    return fn;
};

module.exports = { create };
