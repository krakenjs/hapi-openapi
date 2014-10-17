'use strict';

module.exports = function inputvalidator(validators) {
    var pre = [];

    function make(parameter, validate) {
        return function inputvalidator(request, reply) {
            var value, isPath;

            switch (parameter.in) {
                case 'path':
                case 'query':
                    isPath = true;
                    value = request.params[parameter.name];
                    break;
                case 'header':
                    value = request.header(parameter.name);
                    break;
                case 'body':
                case 'form':
                    value = request.payload;
                    break;
            }

            validate(value, function oncomplete(error, newvalue) {
                if (error) {
                    reply(error.message).code(400).takeover();
                    return;
                }

                if (isPath) {
                    request.params[parameter.name] = newvalue;
                }

                reply();
            });
        };
    }

    for (var i = 0; i < validators.length; i++) {
        var parameter, validate;

        parameter = validators[i].parameter;
        validate = validators[i].validate;

        pre.push({
            assign: parameter.name,
            method: make(parameter, validate)
        });
    }

    return pre;
};
