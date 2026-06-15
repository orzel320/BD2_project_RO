Dokumentacja projektu: Radioaktywność - Baza Grafowa
====================================================

Witaj w automatycznie generowanej dokumentacji projektu! Poniżej znajdziesz opis architektury interfejsu oraz pełną dokumentację kodu backendu i frontendu.

.. toctree::
   :maxdepth: 2
   :caption: Architektura:

   ui_architecture.md

Backend (Python / FastAPI)
==========================

Logika API (routes.py)
----------------------
.. automodule:: routes
   :members:
   :undoc-members:
   :show-inheritance:

Baza Danych (database.py)
-------------------------
.. automodule:: database
   :members:
   :undoc-members:

Inicjalizacja (main.py)
-----------------------
.. automodule:: main
   :members:
   :undoc-members:

Skrypt zasilający (populate_db.py)
----------------------------------
.. automodule:: populate_db
   :members:
   :undoc-members:

Frontend (JavaScript)
=====================

Logika siatki izotopów (app.js)
-------------------------------
.. js:autofunction:: getIsomerLevel
.. js:autofunction:: getColorForHalfLife
.. js:autofunction:: renderChart
.. js:autofunction:: openPanel

Logika szczegółów (details.js)
------------------------------
.. js:autofunction:: drawBranchingChart
.. js:autofunction:: drawEvolutionChart
.. js:autofunction:: drawSpectrumChart