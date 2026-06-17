import os
from neo4j import GraphDatabase

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "projektBD2")


class Neo4jConnection:
    def __init__(self):
        """
        Inicjalizuje połączenie z bazą grafową Neo4j.

        Pobiera dane uwierzytelniające ze zmiennych środowiskowych lub używa
        wartości domyślnych dla środowiska lokalnego, tworząc główny sterownik (driver).
        """
        self.driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    def close(self):
        """
        Bezpiecznie zamyka aktywne połączenie (sterownik) z bazą Neo4j.
        """
        if self.driver is not None:
            self.driver.close()


db = Neo4jConnection()
