import { RESTDataSource } from 'apollo-datasource-rest';

/** options for each client instance */
export interface BaseParams {
  params?: { query?: Record<string, unknown> };
}

// const
export type PathItemObject = { [M in HttpMethod]: OperationObject } & { parameters?: unknown };
export type ParseAs = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'stream';
export interface OperationObject {
  parameters: unknown;
  requestBody: unknown; // note: "any" will get overridden in inference
  responses: unknown;
}
export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';
export type OkStatus = 200 | 201 | 202 | 203 | 204 | 206 | 207;

// util
/** Get a union of paths which have method */
export type PathsWith<
  Paths extends Record<string, PathItemObject>,
  PathnameMethod extends HttpMethod,
> = {
  [Pathname in keyof Paths]: Paths[Pathname] extends { [K in PathnameMethod]: unknown }
    ? Pathname
    : never;
}[keyof Paths];
/** Find first match of multiple keys */
export type FilterKeys<Obj, Matchers> = {
  [K in keyof Obj]: K extends Matchers ? Obj[K] : never;
}[keyof Obj];
export type MediaType = `${string}/${string}`;

// general purpose types
export type Params<T> = T extends { parameters: unknown }
  ? { params: NonNullable<T['parameters']> }
  : BaseParams;
export type RequestBodyObj<T> = T extends { requestBody?: unknown } ? T['requestBody'] : never;
export type RequestBodyContent<T> = undefined extends RequestBodyObj<T>
  ? FilterKeys<NonNullable<RequestBodyObj<T>>, 'content'> | undefined
  : FilterKeys<RequestBodyObj<T>, 'content'>;
export type RequestBodyMedia<T> = FilterKeys<RequestBodyContent<T>, MediaType> extends never
  ? FilterKeys<NonNullable<RequestBodyContent<T>>, MediaType> | undefined
  : FilterKeys<RequestBodyContent<T>, MediaType>;
export type RequestBody<T> = undefined extends RequestBodyMedia<T>
  ? { body?: RequestBodyMedia<T> }
  : { body: RequestBodyMedia<T> };
export type RequestOptions<T> = Params<T> & RequestBody<T> & object;
export type Success<T> = FilterKeys<FilterKeys<T, OkStatus>, 'content'>;

type ApolloRequestInit = Parameters<RESTDataSource['get']>[2];

// fetch types
export type DataResponse<T> = T extends { responses: unknown }
  ? NonNullable<FilterKeys<Success<T['responses']>, MediaType>>
  : unknown | never;

function buildFinalPath(
  url: string,
  params?: { query?: Record<string, unknown>; path?: Record<string, unknown> },
) {
  let finalPath = url as string;
  if (params?.path) {
    for (const [k, v] of Object.entries(params.path)) {
      finalPath = finalPath.replace(`{${k}}`, encodeURIComponent(String(v)));
    }
  }
  return {
    path: finalPath,
  };
}

export class TypedRESTDataSource<Paths extends Record<string, PathItemObject>, Context> extends RESTDataSource<Context> {
  openapi: {
    /** Call a GET endpoint */
    get<P extends PathsWith<Paths, 'get'>>(
      url: P,
      init: RequestOptions<FilterKeys<Paths[P], 'get'>>,
      options?: ApolloRequestInit,
    ): Promise<DataResponse<'get' extends keyof Paths[P] ? Paths[P]['get'] : unknown>>;
    /** Call a PUT endpoint */
    put<P extends PathsWith<Paths, 'put'>>(
      url: P,
      init: RequestOptions<FilterKeys<Paths[P], 'put'>>,
      options?: ApolloRequestInit,
    ): Promise<DataResponse<'put' extends keyof Paths[P] ? Paths[P]['put'] : unknown>>;
    /** Call a POST endpoint */
    post<P extends PathsWith<Paths, 'post'>>(
      url: P,
      init: RequestOptions<FilterKeys<Paths[P], 'post'>>,
      options?: ApolloRequestInit,
    ): Promise<DataResponse<'post' extends keyof Paths[P] ? Paths[P]['post'] : unknown>>;
    /** Call a DEL endpoint */
    del<P extends PathsWith<Paths, 'delete'>>(
      url: P,
      init: RequestOptions<FilterKeys<Paths[P], 'delete'>>,
      options?: ApolloRequestInit,
    ): Promise<DataResponse<'delete' extends keyof Paths[P] ? Paths[P]['delete'] : unknown>>;
    /** Call a PATCH endpoint */
    patch<P extends PathsWith<Paths, 'patch'>>(
      url: P,
      init: RequestOptions<FilterKeys<Paths[P], 'patch'>>,
      options?: ApolloRequestInit,
    ): Promise<DataResponse<'patch' extends keyof Paths[P] ? Paths[P]['patch'] : unknown>>;
  };

  private setupParams<M extends HttpMethod, P extends keyof Paths>(
    url: P,
    init: RequestOptions<FilterKeys<Paths[P], M>>,
    options?: ApolloRequestInit,
  ) {
    const baseParams = init as BaseParams;
    const apolloOptions: ApolloRequestInit = options ? { ...options } : undefined;
    const { path } = buildFinalPath(url as string, baseParams?.params);
    const query = baseParams?.params?.query as { [key: string]: object | object[] | undefined } | undefined;
    const body = init?.body as Body;
    return { path, apolloOptions, query, body };
  }

  constructor(httpFetch: ConstructorParameters<typeof RESTDataSource>[0]) {
    super(httpFetch);
    this.openapi = {
      get: async (url, init, options) => {
        const { path, apolloOptions, query } = this.setupParams(url, init, options);
        // This is just to make existing spyOn work better.
        return apolloOptions ? this.get(path, query, apolloOptions) : this.get(path, query);
      },
      del: async (url, init, options) => {
        const { path, apolloOptions, query } = this.setupParams(url, init, options);
        // This is just to make existing spyOn work better.
        return apolloOptions ? this.delete(path, query, apolloOptions) : this.delete(path, query);
      },
      put: async (url, init, options) => {
        const { path, apolloOptions, query, body } = this.setupParams(url, init, options);
        if (query) {
          // Looks like apollo-datasource-rest doesn't support query params with some methods.
          // So we will pipe them through, knowing where it looks for them. We could
          // instead append them to the URL, but then that's redoing query serialization
          (apolloOptions as { params: typeof query }).params = query;
        }
        // This is just to make existing spyOn work better.
        return apolloOptions ? this.put(path, body, apolloOptions) : this.put(path, body);
      },
      post: async (url, init, options) => {
        const { path, apolloOptions, query, body } = this.setupParams(url, init, options);
        if (query) {
          // Looks like apollo-datasource-rest doesn't support query params with some methods.
          // So we will pipe them through, knowing where it looks for them. We could
          // instead append them to the URL, but then that's redoing query serialization
          (apolloOptions as { params: typeof query }).params = query;
        }
        // This is just to make existing spyOn work better.
        return apolloOptions ? this.post(path, body, apolloOptions) : this.post(path, body);
      },
      patch: async (url, init, options) => {
        const { path, apolloOptions, query, body } = this.setupParams(url, init, options);
        if (query) {
          // Looks like apollo-datasource-rest doesn't support query params with some methods.
          // So we will pipe them through, knowing where it looks for them. We could
          // instead append them to the URL, but then that's redoing query serialization
          (apolloOptions as { params: typeof query }).params = query;
        }
        // This is just to make existing spyOn work better.
        return apolloOptions ? this.patch(path, body, apolloOptions) : this.patch(path, body);
      },
    };
  }
}
