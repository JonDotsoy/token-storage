# Changelog

## 1.0.0 (2025-12-22)


### Features

* **client,db,router:** Add token retrieval endpoints and improve configuration ([34c4ef3](https://github.com/JonDotsoy/tokens/commit/34c4ef39bdf17a5657d61d27ba8c00bfb085d8d3))
* **client:** Refactor token exchange response structure and add validation ([6e6d1ea](https://github.com/JonDotsoy/tokens/commit/6e6d1ea9cf89f58c26ac3f65eeab398509e8142b))
* **connections,storage:** Add PostgreSQL support and refactor architecture ([6d250cc](https://github.com/JonDotsoy/tokens/commit/6d250ccbcf1619982ac4bd325909e1aee82fb03f))
* **cors:** Add CORS configuration and middleware support ([165a775](https://github.com/JonDotsoy/tokens/commit/165a775a5c43d1b0ba20d713112ede6cfc308227))
* **db:** Add created_at timestamp tracking to connections ([08e4240](https://github.com/JonDotsoy/tokens/commit/08e4240f3fb2bd967e75a1fbe507d1a5151901fe))
* **db:** Implement automatic token refresh on retrieval ([8c0fe2d](https://github.com/JonDotsoy/tokens/commit/8c0fe2d8ac020e592c265abc2395e98597c1010a))
* **docker,build,imports:** Add build stage to Docker and update module imports ([6f7a9fb](https://github.com/JonDotsoy/tokens/commit/6f7a9fb4063f2add1ff5f3a6d08583c178870551))
* **duckdb,docker:** Add DuckDB connection layer and enhance Docker setup ([bce65ec](https://github.com/JonDotsoy/tokens/commit/bce65ec4c71b346b053cf0610973aee8f7ad7be2))
* **duckdb:** Add checkpoint operations to ensure data persistence ([f4fa8b9](https://github.com/JonDotsoy/tokens/commit/f4fa8b9c68660a4f56c0cd7e4b95e14303c26d29))
* Initialize tokens project with Bun runtime and database setup ([8a5583a](https://github.com/JonDotsoy/tokens/commit/8a5583aeb9929f189245581e43556e487834c744))
* **oauth:** Enhance token handling and database schema ([9cbc11c](https://github.com/JonDotsoy/tokens/commit/9cbc11c295e054a56b87510d0a3fa1dc3612cae7))
* **stats:** Add database statistics endpoint ([b898d46](https://github.com/JonDotsoy/tokens/commit/b898d46aa47f44f7559e11ce94ba9223d79ac7a7))
* **token-storage,testing:** Add token storage layer and e2e testing infrastructure ([3ca30cc](https://github.com/JonDotsoy/tokens/commit/3ca30cce060cea6d56d75863f01222f24a0c0786))
* **token-storage:** Add database adapter methods for auth flow ([d57f1d2](https://github.com/JonDotsoy/tokens/commit/d57f1d246fa884b511e684447473fb47a14561d8))
* **token-storage:** Add HTTP storage adapter with comprehensive tests ([41de86e](https://github.com/JonDotsoy/tokens/commit/41de86edccaf95e18cd34e323c0105fa5f1c2c98))
