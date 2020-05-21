'use strict';

const Oas2Strategy = require('./mapping-strategies/oas2');
const Oas3Strategy = require('./mapping-strategies/oas3');

class ApiDto {
    constructor(spec, baseDir, mappingStrategy) {

        this.baseDir = baseDir;
        this.spec = spec;
        this._mappingStrategy = mappingStrategy;
    }

    get basePath() {

        return this._mappingStrategy.getBasePath.call(this);
    }

    get customAuthSchemes() {

        return this._mappingStrategy.getCustomAuthSchemes.call(this);
    }

    get customAuthStrategies() {

        return this._mappingStrategy.getCustomAuthStrategies.call(this);
    }

    get operations() {

        return this._mappingStrategy.getOperations.call(this);
    }
}

const toDto = (spec, baseDir) => {

    const mappingStrategy = spec.swagger ? Oas2Strategy : Oas3Strategy;
    return new ApiDto(spec, baseDir, mappingStrategy);
};

module.exports = {
    toDto
};
