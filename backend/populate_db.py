import radioactivedecay as rd
from neo4j import GraphDatabase
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "spectra.json")

POLSKIE_PIERWIASTKI = {
    1: "Wodór",
    2: "Hel",
    3: "Lit",
    4: "Beryl",
    5: "Bor",
    6: "Węgiel",
    7: "Azot",
    8: "Tlen",
    9: "Fluor",
    10: "Neon",
    11: "Sód",
    12: "Magnez",
    13: "Glin",
    14: "Krzem",
    15: "Fosfor",
    16: "Siarka",
    17: "Chlor",
    18: "Argon",
    19: "Potas",
    20: "Wapń",
    21: "Skand",
    22: "Tytan",
    23: "Wanad",
    24: "Chrom",
    25: "Mangan",
    26: "Żelazo",
    27: "Kobalt",
    28: "Nikiel",
    29: "Miedź",
    30: "Cynk",
    31: "Gal",
    32: "German",
    33: "Arsen",
    34: "Selen",
    35: "Brom",
    36: "Krypton",
    37: "Rubid",
    38: "Stront",
    39: "Itr",
    40: "Cyrkon",
    41: "Niob",
    42: "Molibden",
    43: "Technet",
    44: "Ruten",
    45: "Rod",
    46: "Pallad",
    47: "Srebro",
    48: "Kadm",
    49: "Ind",
    50: "Cyna",
    51: "Antymon",
    52: "Tellur",
    53: "Jod",
    54: "Ksenon",
    55: "Cez",
    56: "Bar",
    57: "Lantan",
    58: "Cer",
    59: "Prazeodym",
    60: "Neodym",
    61: "Promet",
    62: "Samar",
    63: "Europ",
    64: "Gadolin",
    65: "Terb",
    66: "Dysproz",
    67: "Holm",
    68: "Erb",
    69: "Tul",
    70: "Iterb",
    71: "Lutet",
    72: "Hafn",
    73: "Tantal",
    74: "Wolfram",
    75: "Ren",
    76: "Osm",
    77: "Iryd",
    78: "Platyna",
    79: "Złoto",
    80: "Rtęć",
    81: "Tal",
    82: "Ołów",
    83: "Bizmut",
    84: "Polon",
    85: "Astat",
    86: "Radon",
    87: "Frans",
    88: "Rad",
    89: "Aktyn",
    90: "Tor",
    91: "Protaktyn",
    92: "Uran",
    93: "Neptun",
    94: "Pluton",
    95: "Ameryk",
    96: "Kiur",
    97: "Berkel",
    98: "Kaliforn",
    99: "Ajnsztajn",
    100: "Ferm",
    101: "Mendelew",
    102: "Nobel",
    103: "Lorens",
    104: "Rutherfurd",
    105: "Dubn",
    106: "Seaborg",
    107: "Bohr",
    108: "Has",
    109: "Meitner",
    110: "Darmsztadt",
    111: "Roentgen",
    112: "Kopernik",
    113: "Nihon",
    114: "Flerow",
    115: "Moskow",
    116: "Liwermor",
    117: "Tenes",
    118: "Oganeson",
}

try:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        spectra_db = json.load(f)
    print(f"Sukces: Pomyślnie wczytano plik dla widm ({len(spectra_db)} izotopów).")
except FileNotFoundError:
    spectra_db = {}
    print(f"Ostrzeżenie: Nie znaleziono pliku pod ścieżką {JSON_PATH}")

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "projektBD2")


def populate_entire_database():
    """
    Kompleksowo zasila bazę grafową Neo4j pełnymi danymi izotopów i relacjami rozpadów.

    Funkcja usuwa dotychczasowe dane z bazy, a następnie pobiera pełną listę izotopów
    z biblioteki `radioactivedecay`. Dla każdego niestabilnego izotopu wyciąga parametry
    (Z, A, czas półtrwania, prawdopodobieństwo SF), dołącza dane widm z pliku JSON
    wygenerowanego na podstawie biblioteki PyNE i zapisuje jako węzły w Neo4j. Odtwarza
    również drzewo rozpadów, tworząc relacje (np. ROZPAD_ALFA, ROZPAD_BETA_MINUS)
    pomiędzy izotopami, a na koniec łączy je z odpowiednimi węzłami Pierwiastków chemicznych.

    Note:
        Wymaga dostępu do bazy Neo4j skonfigurowanej za pomocą zmiennych środowiskowych
        `NEO4J_URI`, `NEO4J_USER` oraz `NEO4J_PASSWORD`.
    """
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    all_nuclides = rd.DEFAULTDATA.nuclides
    print(f"Znaleziono {len(all_nuclides)} izotopów do zmapowania.")

    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
        print("Wyczyszczono poprzednie dane. Dodawane są nowe.")

        for current_name in all_nuclides:
            if current_name == "Stable":
                continue

            try:
                nuc = rd.Nuclide(current_name)

                try:
                    hl = nuc.half_life("readable")
                except Exception:
                    hl = "Stabilny"

                z_val = nuc.Z
                a_val = nuc.A

                progeny = nuc.progeny()
                modes = nuc.decay_modes()
                fractions = nuc.branching_fractions()

                sf_prob = 0.0
                for m, f in zip(modes, fractions):
                    if "SF" in m:
                        sf_prob = f

                widmo_dict = spectra_db.get(current_name)
                widmo_json = json.dumps(widmo_dict) if widmo_dict else None

                session.run(
                    """
                    MERGE (n:Izotop {nazwa: $nazwa})
                    SET n.czas_poltrwania = $hl, 
                        n.Z = $z, 
                        n.A = $a, 
                        n.prawdopodobienstwo_SF = $sf_prob,
                        n.widmo = $widmo
                """,
                    nazwa=current_name,
                    hl=hl,
                    z=z_val,
                    a=a_val,
                    sf_prob=sf_prob,
                    widmo=widmo_json,
                )

                for p, m, f in zip(progeny, modes, fractions):
                    if "SF" in m:
                        continue

                    if "α" in m:
                        rel_type = "ROZPAD_ALFA"
                    elif "β-" in m:
                        rel_type = "ROZPAD_BETA_MINUS"
                    elif "β+" in m or "EC" in m:
                        rel_type = "ROZPAD_BETA_PLUS_LUB_EC"
                    elif "IT" in m:
                        rel_type = "PRZEJSCIE_IZOMERYCZNE"
                    elif "p" in m or "n" in m:
                        rel_type = "EMISJA_NUKLEONU"
                    else:
                        rel_type = "INNY_ROZPAD"

                    session.run(
                        f"""
                        MERGE (parent:Izotop {{nazwa: $parent}})
                        MERGE (child:Izotop {{nazwa: $child}})
                        MERGE (parent)-[r:{rel_type}]->(child)
                        SET r.tryb = $mode, r.prawdopodobienstwo = $fraction
                    """,
                        parent=current_name,
                        child=p,
                        mode=m,
                        fraction=f,
                    )

            except Exception as e:
                pass

        print("Łączenie izotopów")
        for z_val, nazwa_pl in POLSKIE_PIERWIASTKI.items():
            session.run(
                """
                MERGE (p:Pierwiastek {Z: $z})
                SET p.nazwa = $nazwa_pl
                WITH p
                MATCH (i:Izotop {Z: $z})
                MERGE (p)-[:POSIADA_IZOTOP]->(i)
            """,
                z=z_val,
                nazwa_pl=nazwa_pl,
            )
    driver.close()


if __name__ == "__main__":
    populate_entire_database()
    print("Baza gotowa.")
