# Radioaktywność - Baza Grafowa Neo4j

Projekt wykorzystujący FastAPI, Neo4j oraz statyczny frontend (JS/HTML), konteneryzowany za pomocą Docker Compose.

## Szybki start

1. **Uruchomienie kontenerów w tle:**

   ```bash
   docker compose up --build -d
   ```

2. Zasilenie bazy danymi początkowymi:

    ```bash
    docker exec -it fastapi_bd2 python backend/populate_db.py
    ```

## Adresy i dostęp

1. Aplikacja (Frontend + API): [http://localhost:8000](http://localhost:8000)

2. Panel zarządzania Neo4j: [http://localhost:7474](http://localhost:7474):
    * Użytkownik: neo4j
    * Hasło: projektBD2
    * Bolt URI: bolt://localhost:7687

## Dokumentacja
  
Dokumentacja została wygenerowana z pomocą biblioteki Sphinx i znajduje się pod linkiem [https://orzel320.github.io/BD2_project_RO/](https://orzel320.github.io/BD2_project_RO/)
