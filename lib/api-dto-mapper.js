'use strict';

const oas2Strategy = require('./mapping-strategies/oas2');
const oas3Strategy = require('./mapping-strategies/oas3');

class ApiDto {
    #mappingStrategy;

    constructor(spec, baseDir, mappingStrategy) {
        this.baseDir = baseDir;
        this.spec = spec;
        this.#mappingStrategy = mappingStrategy;
    }

    get basePath () {
        return this.#mappingStrategy.getBasePath.call(this);
    }

    get customAuthSchemes () {
        return this.#mappingStrategy.getCustomAuthSchemes.call(this);
    }

    get customAuthStrategies () {
        return this.#mappingStrategy.getCustomAuthStrategies.call(this);
    }

    get operations () {
        return this.#mappingStrategy.getOperations.call(this);
    }
}

const toDto = (spec, baseDir) => {
    const mappingStrategy = spec.swagger ? oas2Strategy : oas3Strategy;
    return new ApiDto(spec, baseDir, mappingStrategy);
}

module.exports = {
    toDto,
}
