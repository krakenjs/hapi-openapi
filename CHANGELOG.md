### 3.4.1

- Upgraded `enjoi`.

### 3.4.0

- Added support for output validation (optional).

### 3.3.2

- Fixed YAML parsing for api-docs route.

### 3.3.1

- Fixed https://github.com/krakenjs/swaggerize-hapi/issues/72 - allow single item arrays.

### 3.3.0

- x-auth attribute support.
- basedir is not an option (officially).

### 3.2.0

- x-handler attribute support.

### 3.1.0

- Add tags and description to routes based on API spec.
- Don't restrict auth types.
- Add route meta data from API spec.
- `docspath` option is now `docs` and is an object.

### 3.0

- [BREAKING] Migrated to Hapi 17 and Node 8.
- [BREAKING] Severed from `swaggerize-routes` - this module is now standalone.
- [BREAKING] `server.plugins.swagger.api` is now `server.plugins.swagger.getApi()`.
- [BREAKING] `handlers` object doesn't namespace http methods using `$` anymore. Assumption is verb is last in object path.
- [BREAKING] Currently does not work with the `swaggerize-generator`.
- Routes will specify what they allow based on api spec.
