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

type KeyedQuery = { [key: string]: object | object[] | undefined };
type ApolloBodyParams = [string, Body?, ApolloRequestInit?];
type ApolloQueryParams = [string, KeyedQuery?, ApolloRequestInit?];

export class TypedRESTDataSource<
  // TODO I'm not sure why we can't use the paths generic type here, but I can't get it to work.
  // eslint-disable-next-line @typescript-eslint/ban-types
  Paths extends {},
  Context,
> extends RESTDataSource<Context> {
  protected openapi: {
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
    hasBody: true,
    url: P,
    init: RequestOptions<FilterKeys<Paths[P], M>>,
    options?: ApolloRequestInit,
  ): ApolloBodyParams;

  private setupParams<M extends HttpMethod, P extends keyof Paths>(
    hasBody: false,
    url: P,
    init: RequestOptions<FilterKeys<Paths[P], M>>,
    options?: ApolloRequestInit,
  ): ApolloQueryParams;

  private setupParams<M extends HttpMethod, P extends keyof Paths>(
    hasBody: boolean,
    url: P,
    init: RequestOptions<FilterKeys<Paths[P], M>>,
    options?: ApolloRequestInit,
  ) {
    const baseParams = init as BaseParams;
    let apolloOptions: ApolloRequestInit = options ? { ...options } : undefined;
    const { path } = buildFinalPath(url as string, baseParams?.params);
    const query = baseParams?.params?.query as KeyedQuery | undefined;
    if (hasBody) {
      if (query) {
        // Looks like apollo-datasource-rest doesn't support query params with some methods.
        // So we will pipe them through, knowing where it looks for them. We could
        // instead append them to the URL, but then that's redoing query serialization
        apolloOptions = apolloOptions || {};
        (apolloOptions as { params: typeof query }).params = query;
      }
      const body = init?.body as Body;
      if (apolloOptions) {
        return [path, body, apolloOptions] as ApolloBodyParams;
      }
      if (body) {
        return [path, body] as ApolloBodyParams;
      }
      return [path] as ApolloBodyParams;
    }
    if (apolloOptions) {
      return [path, query, apolloOptions] as ApolloQueryParams;
    }
    if (query) {
      return [path, query] as ApolloQueryParams;
    }
    return [path] as ApolloQueryParams;
  }

  constructor(httpFetch?: ConstructorParameters<typeof RESTDataSource>[0]) {
    super(httpFetch);
    this.openapi = {
      get: async (url, init, options) => {
        const params = this.setupParams(false, url, init, options);
        return this.get(...params);
      },
      del: async (url, init, options) => {
        const params = this.setupParams(false, url, init, options);
        return this.delete(...params);
      },
      put: async (url, init, options) => {
        const params = this.setupParams(true, url, init, options);
        return this.put(...params);
      },
      post: async (url, init, options) => {
        const params = this.setupParams(true, url, init, options);
        return this.post(...params);
      },
      patch: async (url, init, options) => {
        const params = this.setupParams(true, url, init, options);
        return this.patch(...params);
      },
    };
  }
}
