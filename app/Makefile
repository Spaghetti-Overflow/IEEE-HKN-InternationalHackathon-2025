DOCKER_COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.yml
DB_USER ?= postgres
DB_NAME ?= budgetdb
DC := $(DOCKER_COMPOSE) -f $(COMPOSE_FILE)

.PHONY: help build up down restart logs ps seed server-shell client-shell db-shell clean

help:
	@echo "Usage: make <target>"
	@echo
	@echo "Available targets:"
	@echo "  build        Build all Docker images"
	@echo "  up           Start the stack in detached mode (builds if needed)"
	@echo "  down         Stop containers and keep volumes"
	@echo "  restart      Restart the stack (down + up)"
	@echo "  logs         Tail logs from all services"
	@echo "  ps           Show container status"
	@echo "  seed         Run the server seed script inside a one-off container"
	@echo "  server-shell Drop into a shell inside the server container"
	@echo "  client-shell Drop into a shell inside the client container"
	@echo "  db-shell     Open psql in the Postgres container"
	@echo "  clean        Stop containers and remove volumes"

build:
	$(DC) build

up:
	$(DC) up --build -d

logs:
	$(DC) logs -f

ps:
	$(DC) ps

down:
	$(DC) down

restart:
	$(DC) down
	$(DC) up --build -d

seed:
	$(DC) run --rm server npm run db:seed

server-shell:
	$(DC) exec server sh

client-shell:
	$(DC) exec client sh

db-shell:
	$(DC) exec postgres psql -U $(DB_USER) -d $(DB_NAME)

clean:
	$(DC) down -v
