# Zapytania Cypher (Polecenia bazy grafowej)

Poniżej zestawiono kluczowe polecenia w języku Cypher, które realizują główne założenia funkcjonalne projektu – zarówno na etapie budowy struktury, jak i odpytywania bazy przez API.

## 1. Zarządzanie bazą i zasilanie danymi (Skrypty inicjalizujące)

**Czyszczenie bazy przed załadowaniem nowej topologii (`populate_db.py`):**

```cypher
MATCH (n) DETACH DELETE n
```

**Tworzenie węzłów izotopów i relacji rozpadu (skrypt `populate_db.py`):**

```cypher
MERGE (n:Izotop {nazwa: $nazwa})
SET n.czas_poltrwania = $hl, 
    n.Z = $z, 
    n.A = $a, 
    n.prawdopodobienstwo_SF = $sf_prob,
    n.widmo = $widmo
```

**Tworzenie relacji rozpadu z dynamicznym typem za pomocą f-stringa w Pythonie:**

```cypher
MERGE (parent:Izotop {nazwa: $parent})
MERGE (child:Izotop {nazwa: $child})
MERGE (parent)-[r:{rel_type}]->(child)
SET r.tryb = $mode, r.prawdopodobienstwo = $fraction
```

**Grupowanie izotopów pod węzłem chemicznym Pierwiastka (populate_db.py):**

```cypher
MERGE (p:Pierwiastek {Z: $z})
SET p.nazwa = $nazwa_pl
WITH p
MATCH (i:Izotop {Z: $z})
MERGE (p)-[:POSIADA_IZOTOP]->(i)
```

## 2. Odpytywanie bazy (Realizacja funkcjonalności API)

**Pobieranie danych o stabilności do siatki Segrè (routes.py):**

```cypher
MATCH (n:Izotop)
OPTIONAL MATCH (p:Pierwiastek)-[:POSIADA_IZOTOP]->(n)
RETURN n.nazwa AS nazwa, n.Z AS Z, n.A AS A, n.czas_poltrwania AS czas_poltrwania, p.nazwa AS nazwa_pierwiastka
```

**Pobieranie szczegółowych parametrów fizycznych wybranego izotopu (routes.py):**

```cypher
MATCH (n:Izotop {nazwa: $nazwa})
OPTIONAL MATCH (p:Pierwiastek)-[:POSIADA_IZOTOP]->(n)
RETURN n.Z AS Z, n.A AS A, n.czas_poltrwania AS czas_poltrwania, 
       n.prawdopodobienstwo_SF AS sf_prob, n.widmo AS widmo, p.nazwa AS nazwa_pierwiastka
```

**Pobieranie drzewa genealogicznego izotopu – 15 pokoleń w górę i w dół (routes.py):**

```cypher
MATCH (start:Izotop {nazwa: $nazwa})
// Szukamy potomków (w dół drzewa)
OPTIONAL MATCH p_down = (start)-[*1..15]->(down)
// Szukamy przodków (w górę drzewa)
OPTIONAL MATCH p_up = (start)<-[*1..15]-(up)

RETURN start, collect(p_down) AS downs, collect(p_up) AS ups
```
