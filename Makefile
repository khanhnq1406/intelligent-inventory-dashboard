.PHONY: generate generate-go generate-ts migrate-up migrate-down test dev lint

generate: generate-go generate-ts

generate-go:
	cd backend && go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen \
		--config internal/handler/oapi-codegen.cfg.yaml \
		../api/openapi.yaml

generate-ts:
	cd frontend && npx openapi-typescript ../api/openapi.yaml -o src/lib/api/types.ts

migrate-up:
	cd backend && go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest \
		-path migrations \
		-database "$${DATABASE_URL}" \
		up

migrate-down:
	cd backend && go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest \
		-path migrations \
		-database "$${DATABASE_URL}" \
		down 1

test:
	cd backend && go test -race ./...
	cd frontend && npm test

dev:
	docker compose up

lint:
	cd backend && go vet ./...
