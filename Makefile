.PHONY: all

all: generate

generate: __tests__/petstore.d.ts
	yarn dlx openapi-typescript ./__tests__/petstore.json -o ./__tests__/petstore.d.ts
	@echo "/* eslint-disable */" > lint-swap.txt
	@cat __tests__/petstore.d.ts >> lint-swap.txt
	@mv lint-swap.txt __tests__/petstore.d.ts
