from fastapi import APIRouter, HTTPException
from database import db
import radioactivedecay as rd
import json

router = APIRouter(prefix="/api", tags=["Isotopes API"])

@router.get("/chart-data")
def get_segre_chart_data():
    """
    Pobiera minimalny zestaw danych o wszystkich izotopach niezbędny do wyrysowania siatki na frontendzie.

    Przeszukuje bazę Neo4j i wyciąga podstawowe parametry (liczbę atomową Z, liczbę masową A 
    oraz czas półtrwania). Na podstawie czasu półtrwania przypisuje izotopom flagę stabilności.

    Returns:
        list[dict]: Lista słowników zawierająca dane izotopów. Każdy słownik posiada klucze: 
        nazwa, Z, A, czas_poltrwania, nazwa_pierwiastka oraz typ.
    """
    query = """
    MATCH (n:Izotop)
    OPTIONAL MATCH (p:Pierwiastek)-[:POSIADA_IZOTOP]->(n)
    RETURN n.nazwa AS nazwa, n.Z AS Z, n.A AS A, n.czas_poltrwania AS czas_poltrwania, p.nazwa AS nazwa_pierwiastka
    """
    
    with db.driver.session() as session:
        results = session.run(query)
        data = []
        
        for r in results:
            czas = str(r["czas_poltrwania"]).lower()
            if "stabilny" in czas or "stable" in czas:
                typ = "stabilny"
            else:
                typ = "niestabilny" 
                
            data.append({
                "nazwa": r["nazwa"],
                "Z": int(r["Z"]) if r["Z"] is not None else 0,
                "A": int(r["A"]) if r["A"] is not None else 0,
                "czas_poltrwania": r["czas_poltrwania"],
                "nazwa_pierwiastka": r["nazwa_pierwiastka"] or "Nieznany",
                "typ": typ
            })
            
        return data

@router.get("/isotope/{nazwa}")
def get_isotope_details(nazwa: str):
    """
    Pobiera szczegółowe dane fizyczne dla konkretnego izotopu.

    Wyszukuje w bazie grafowej Neo4j węzeł odpowiadający podanej nazwie.
    Jeśli w bazie zapisane są dane widma (w formacie JSON), zostają one zdeserializowane.

    Args:
        nazwa (str): Pełna nazwa izotopu (np. 'U-238').

    Raises:
        HTTPException: Kod 404, jeśli izotop o podanej nazwie nie istnieje w bazie.

    Returns:
        dict: Szczegółowe parametry izotopu obejmujące liczbę Z, A, czas półtrwania, 
        prawdopodobieństwo spontanicznego rozszczepienia (sf_prob) oraz widmo.
    """
    query = """
    MATCH (n:Izotop {nazwa: $nazwa})
    OPTIONAL MATCH (p:Pierwiastek)-[:POSIADA_IZOTOP]->(n)
    RETURN n.Z AS Z, n.A AS A, n.czas_poltrwania AS czas_poltrwania, 
           n.prawdopodobienstwo_SF AS sf_prob, n.widmo AS widmo, p.nazwa AS nazwa_pierwiastka
    """
    with db.driver.session() as session:
        result = session.run(query, nazwa=nazwa).single()
        if not result:
            raise HTTPException(status_code=404, detail="Nie znaleziono izotopu")
            
        widmo_data = None
        if result["widmo"]:
            try:
                widmo_data = json.loads(result["widmo"])
            except Exception:
                widmo_data = None
                
        return {
            "nazwa": nazwa,
            "Z": result["Z"],
            "A": result["A"],
            "czas_poltrwania": result["czas_poltrwania"],
            "sf_prob": result["sf_prob"] or 0.0,
            "nazwa_pierwiastka": result["nazwa_pierwiastka"] or "Nieznany",
            "widmo": widmo_data 
        }
    
@router.get("/isotope/{nazwa}/decay-chains")
def get_isotope_decay_chain(nazwa: str):
    """
    Zwraca strukturę grafu izotopu wraz z jego przodkami i potomkami w formacie Cytoscape.

    Endpoint odpytuje bazę Neo4j w celu znalezienia ścieżek do 15 kroków w dół (w co rozpada się izotop) 
    oraz do 15 kroków w górę (co rozpada się w ten izotop). Przekształca wyniki na format 
    zgodny z biblioteką frontendową Cytoscape.js.

    Args:
        nazwa (str): Nazwa głównego (centralnego) izotopu dla grafu (np. 'U-238').

    Returns:
        list[dict]: Lista węzłów i krawędzi (relacji) sformatowana dla Cytoscape.js. 
        Zawiera parametry takie jak id, label, type, source, target oraz prawdopodobieństwo rozpadu.
    """
    query = """
    MATCH (start:Izotop {nazwa: $nazwa})
    // Szukamy potomków (w dół drzewa)
    OPTIONAL MATCH p_down = (start)-[*1..15]->(down)
    // Szukamy przodków (w górę drzewa)
    OPTIONAL MATCH p_up = (start)<-[*1..15]-(up)
    
    RETURN start, collect(p_down) AS downs, collect(p_up) AS ups
    """
    with db.driver.session() as session:
        result = session.run(query, nazwa=nazwa).single()
        
        if not result or not result["start"]:
            return []

        nodes_dict = {}
        rels_dict = {}
        
        def process_path(path):
            if not path: return
            for node in path.nodes:
                nodes_dict[node.element_id] = node
            for rel in path.relationships:
                rels_dict[rel.element_id] = rel

        start_node = result["start"]
        nodes_dict[start_node.element_id] = start_node
        
        for p in result["downs"]: process_path(p)
        for p in result["ups"]: process_path(p)

        cytoscape_elements = []
        
        for node_id, node in nodes_dict.items():
            node_data = dict(node.items())
            labels = list(node.labels)
            label = labels[0] if labels else "Unknown"
            display_name = node_data.get("nazwa", node_data.get("typ", "Nieznany"))
            
            is_central = "central-node" if display_name == nazwa else ""

            cytoscape_elements.append({
                "data": {
                    "id": str(node_id), 
                    "label": display_name,
                    "type": label,
                    "half_life": node_data.get("czas_poltrwania", "")
                },
                "classes": is_central
            })
            
        for rel_id, rel in rels_dict.items():
            rel_type = rel.type
            rel_data = dict(rel.items())
            
            cytoscape_elements.append({
                "data": {
                    "id": str(rel_id),
                    "source": str(rel.start_node.element_id),
                    "target": str(rel.end_node.element_id),
                    "label": rel_type,
                    "probability": rel_data.get("prawdopodobienstwo", 1.0)
                }
            })
            
        return cytoscape_elements
    
@router.get("/isotope/{nazwa}/evolution")
def get_isotope_evolution(nazwa: str):
    """
    Oblicza ewolucję łańcucha rozpadu w czasie wykorzystując równania Batemana.

    Na podstawie biblioteki `radioactivedecay` symuluje populację izotopów potomnych 
    w 50 równych krokach czasowych. Całkowity czas symulacji wynosi 5 czasów półtrwania 
    badanego izotopu. Izotopy stabilne oraz posiadające nieskończony czas półtrwania 
    są pomijane w obliczeniach ewolucji.

    Args:
        nazwa (str): Nazwa izotopu początkowego (np. 'U-238').

    Returns:
        dict: Wyniki symulacji zawierające flagę `stable`, czas półtrwania w sekundach (`half_life_s`) 
        oraz listę `data`, w której każdy element to stan ilościowy izotopów w danym kroku czasowym.
    """
    try:
        nuc = rd.Nuclide(nazwa)
        hl_s = nuc.half_life('s')
        hl_readable = nuc.half_life('readable')
    except Exception:
        return {"error": "Nie można pobrać danych izotopu"}

    if hl_readable == 'Stable' or hl_s == float('inf'):
        return {"stable": True}

    steps = 50
    max_time = hl_s * 5
    time_points = [max_time * (i / steps) for i in range(steps + 1)]
    
    evolution_data = []
    
    for t in time_points:
        inv = rd.Inventory({nazwa: 1.0}, 'num')
        decayed = inv.decay(t, 's')
        
        step_result = {"time": t}
        for iso, amount in decayed.contents.items():
            if amount > 1e-8:
                step_result[iso] = amount
                
        evolution_data.append(step_result)

    return {
        "stable": False,
        "half_life_s": hl_s,
        "data": evolution_data
    }