# Diagramy UML i Architektura Systemu

Poniższe diagramy obrazują architekturę projektu, schemat bazy danych oraz przepływ komunikacji pomiędzy poszczególnymi warstwami.

## 1. Diagram Komponentów (Architektura)

Widok wysokiego poziomu przedstawiający z jakich modułów składa się aplikacja i w jaki sposób się one komunikują.

```{mermaid}
graph LR
    User((Użytkownik)) <-->|Przeglądarka / HTTP| Frontend[Frontend: HTML/JS/CSS]
    Frontend <-->|REST API / JSON| API[Backend: FastAPI]
    API <-->|Sterownik Neo4j / Protokół Bolt| DB[(Baza Grafowa: Neo4j)]
```

## 2. Diagram Klas (Struktura Bazy Grafowej)

Diagram obrazujący strukturę i ontologię danych w bazie Neo4j. Węzły pełnią funkcję klas, a krawędzie (relacje) łączą poszczególne obiekty.

```{mermaid}
classDiagram
    class Pierwiastek {
        +int Z
        +String nazwa
    }
    class Izotop {
        +String nazwa
        +int Z
        +int A
        +String czas_poltrwania
        +float prawdopodobienstwo_SF
        +JSON widmo
    }
    
    Pierwiastek "1" --> "1..*" Izotop : POSIADA_IZOTOP
    Izotop "1" --> "0..*" Izotop : ROZPAD (α, β⁻, β⁺, IT, inne)
```

## 3. Diagram Sekwencji (Przepływ danych)

Scenariusz komunikacji w momencie, gdy użytkownik wybiera konkretny izotop na głównej siatce w celu poznania jego szczegółów (details.html).

```{mermaid}
sequenceDiagram
    actor User as Użytkownik
    participant UI as Frontend (details.js)
    participant API as Backend (FastAPI)
    participant DB as Neo4j
    
    User->>UI: Wybiera izotop z siatki Segrè
    UI->>API: GET /api/isotope/{nazwa}
    API->>DB: MATCH (n:Izotop) ...
    DB-->>API: Zwraca właściwości węzła (Z, A, widmo)
    API-->>UI: Zwraca obiekt JSON
    UI->>User: Wyświetla właściwości i widmo
    
    UI->>API: GET /api/isotope/{nazwa}/decay-chains
    API->>DB: Odpytanie o ścieżki rozpadów (do 15 kroków)
    DB-->>API: Zwraca kolekcję relacji i węzłów
    API-->>UI: Zwraca dane w formacie Cytoscape
    UI->>User: Renderuje graf topologii izotopu
```
