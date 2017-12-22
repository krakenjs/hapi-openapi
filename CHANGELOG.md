
### Unreleased

- Add tags and description to routes based on API spec.
- Don't restrict auth types.

### 3.0

- [BREAKING] Migrated to Hapi 17 and Node 8.
- [BREAKING] Severed from `swaggerize-routes` - this module is now standalone.
- [BREAKING] `server.plugins.swagger.api` is now `server.plugins.swagger.getApi()`.
- [BREAKING] `handlers` object doesn't namespace http methods using `$` anymore. Assumption is verb is last in object path.
- [BREAKING] Currently does not work with the `swaggerize-generator`.
- Routes will specify what they allow based on api spec.
