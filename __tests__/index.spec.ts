import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';

import { type JsonPutBody, TypedRESTDataSource } from '../src/index';

import type { paths } from './petstore';

interface ApolloContext {
  petId: number;
}

class PetStoreDataSource extends TypedRESTDataSource<paths, ApolloContext> {
  override baseURL = 'https://petstore3.swagger.io/api/v3';

  protected willSendRequest() {}

  callSimpleMethod() {
    return this.openapi.GET(
      '/pet/{petId}',
      {
        params: {
          path: {
            petId: this.context.petId,
          },
        },
      },
      {
        cacheOptions: {
          ttl: 100000,
        },
      },
    );
  }

  uploadBadImage() {
    return this.openapi.POST('/pet/{petId}/uploadImage', {
      params: {
        path: { petId: 1 },
        query: { additionalMetadata: 'test' },
      },
      body: 'binarydata',
    });
  }
}

test('should create a client', async () => {
  const petStore = new PetStoreDataSource();
  const cache = new InMemoryLRUCache();
  expect(petStore).toBeInstanceOf(PetStoreDataSource);
  petStore.initialize({
    context: { petId: 1 },
    cache,
  });

  const response = await petStore.callSimpleMethod();
  expect(response.name).toBe('Pet1');
  expect(cache.keys()).toHaveLength(1);

  const response2 = await petStore.callSimpleMethod();
  expect(response2.name).toBe('Pet1');
  expect(cache.keys()).toHaveLength(1);

  const reqSpy = jest.spyOn(
    petStore as unknown as { willSendRequest: () => void },
    'willSendRequest',
  );

  await petStore.uploadBadImage().catch((error) => {
    expect(error.extensions?.response).toBeTruthy();
    expect(error.extensions?.response.status).toBe(415);
  });

  expect(reqSpy).toHaveBeenCalledTimes(1);
  expect(reqSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      method: 'POST',
      path: '/pet/1/uploadImage',
      body: 'binarydata',
      params: new URLSearchParams({ additionalMetadata: 'test' }),
    }),
  );

  // This is essentially a build time test.
  const body: JsonPutBody<paths['/pet']> = {
    id: 1,
    name: 'Kiki',
    photoUrls: [],
  };
  expect(body).toBeTruthy();
});
