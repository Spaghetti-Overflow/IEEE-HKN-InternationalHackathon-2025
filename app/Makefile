DOCKER_COMPOSE ?= docker compose
COMPOSE_FILE ?= docker-compose.yml
DB_USER ?= postgres
DB_NAME ?= budgetdb
DC := $(DOCKER_COMPOSE) -f $(COMPOSE_FILE)

.PHONY: help build up down restart logs server_log client_log ps seed base_seed demo_seed server-shell client-shell db-shell clean all

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
	@echo "  seed         Run the demo seed script (alias of demo_seed)"
	@echo "  demo_seed    Seed the database with demo/sample data"
	@echo "  base_seed    Seed the database with only the base admin user"
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

server_log:
	$(DC) logs -f server

client_log:
	$(DC) logs -f client

ps:
	$(DC) ps

down:
	$(DC) down

restart:
	$(DC) down
	$(DC) up --build -d

seed: demo_seed

demo_seed:
	$(DC) run --build --rm server npm run db:seed:demo

base_seed:
	$(DC) run --build --rm server npm run db:seed:base

server-shell:
	$(DC) exec server sh

client-shell:
	$(DC) exec client sh

db-shell:
	$(DC) exec postgres psql -U $(DB_USER) -d $(DB_NAME)

clean:
	$(DC) down -v

all: clean demo_seed up
