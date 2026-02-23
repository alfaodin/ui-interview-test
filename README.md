# Christian Cartes prueba de ingreso Devsu LLC

Application for viewing financial products

## Structure

Monorepo setup: backend + frontend with Docker support
Apps live under apps/backend (Express, port 3002) and apps/frontend (port 4200) (Angular 19).

## Running locally

First step:  install all the dependencial
```bash
  npm run install:all        # install deps in both apps
```
Second step: run the project
```bash
  npm run dev      # starts the backend on :3002 and Angular dev server on :4200
```
Also you can start the backend and frontend servers separately
```bash
  npm run backend:start      # starts the backend on :3002
```
```bash
  npm run frontend:dev       # starts Angular dev server on :4200
```

## RUN ALL THE APP USING DOCKER COMPOSE

Additionlly you can generate a build and run the project just running the following command:

```bash
docker compose up --build  # builds and starts both services
```
http://localhost:80        # frontend served by nginx
                           # nginx proxies /bp to the backend container
