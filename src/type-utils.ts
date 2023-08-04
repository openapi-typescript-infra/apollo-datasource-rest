export type JsonRequestBody<T, M extends keyof T> = T[M] extends {
  requestBody: { content: { 'application/json': infer U } };
}
  ? U
  : never;

export type JsonPostBody<T extends { post: unknown }> = JsonRequestBody<T, 'post'>;
export type JsonPutBody<T extends { put: unknown }> = JsonRequestBody<T, 'put'>;
export type JsonPatchBody<T extends { patch: unknown }> = JsonRequestBody<T, 'patch'>;

type HttpMethod = 'get' | 'delete' | 'post' | 'put' | 'patch';

export type MethodQueryParams<T, P extends keyof T, M extends HttpMethod> = T[P] extends {
  [key in M]: { parameters: { query: infer U } };
}
  ? U
  : never;

export type GetQueryParams<T, P extends keyof T> = MethodQueryParams<T, P, 'get'>;
export type DeleteQueryParams<T, P extends keyof T> = MethodQueryParams<T, P, 'delete'>;
export type PostQueryParams<T, P extends keyof T> = MethodQueryParams<T, P, 'post'>;
export type PutQueryParams<T, P extends keyof T> = MethodQueryParams<T, P, 'put'>;
export type PatchQueryParams<T, P extends keyof T> = MethodQueryParams<T, P, 'patch'>;

export type PathParams<T, P extends keyof T, M extends HttpMethod> = T[P] extends {
  [key in M]: { parameters: { path: infer U } };
}
  ? U
  : never;

export type GetPathParams<T, P extends keyof T> = PathParams<T, P, 'get'>;
export type DeletePathParams<T, P extends keyof T> = PathParams<T, P, 'delete'>;
export type PostPathParams<T, P extends keyof T> = PathParams<T, P, 'post'>;
export type PutPathParams<T, P extends keyof T> = PathParams<T, P, 'put'>;
export type PatchPathParams<T, P extends keyof T> = PathParams<T, P, 'patch'>;
