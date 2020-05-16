'use strict';

const oas2MappingStrategy = require('./mapping-strategies/oas2');

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
    return new ApiDto(spec, baseDir, oas2MappingStrategy);
}

module.exports = {
    toDto,
}
