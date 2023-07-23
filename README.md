# apollo-datasource-rest

This module allows you to use typed OpenAPI-based method calls in an Apollo RESTDataSource subclass. The apollo-datasource-rest package is in fact deprecated, but we still use this heavily so I will start with this package and move to the new @apollo packages when we move the rest of the service.

To use this module, you should derive from `TypedRESTDataSource<Paths, Context>` instead of directly from RESTDataSource. The first generic argument should point to the paths object created by openapi-typescript, and the second to your Apollo server context.

Now, instead of calling `this.get` to use the generic REST client, call `this.openapi.get` to use the typed client (which in turn calls this.get after fixing up all the types and parameters).

See [the test](__tests__/index.spec.ts) for an example using the PetStore API.
