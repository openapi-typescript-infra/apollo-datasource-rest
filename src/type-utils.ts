export type JsonRequestBody<T, M extends keyof T> = T[M] extends {
  requestBody: { content: { 'application/json': infer U } };
}
  ? U
  : never;

export type JsonPostBody<T extends { post: unknown }> = JsonRequestBody<T, 'post'>;
export type JsonPutBody<T extends { put: unknown }> = JsonRequestBody<T, 'put'>;
export type JsonPatchBody<T extends { patch: unknown }> = JsonRequestBody<T, 'patch'>;

export type QueryParams<T extends { get?: unknown }, M extends keyof T = 'get'> = T[M] extends {
  parameters: { query: infer U };
}
  ? U
  : never;

export type PathParams<T extends { get?: unknown }, M extends keyof T> = T[M] extends {
  parameters: { path: infer U };
}
  ? U
  : never;
