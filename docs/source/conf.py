import os
import sys

# 1. Wskazujemy ścieżkę do backendu (aby autodoc znalazł kod Pythona)
sys.path.insert(0, os.path.abspath('../../backend'))

project = 'Radioaktywność - Baza Grafowa'
copyright = '2024, Twój Autor'
author = 'Twój Autor'

# 2. Aktywacja wymaganych rozszerzeń
extensions = [
    'sphinx.ext.autodoc',      # Czytanie docstringów z Pythona
    'sphinx.ext.napoleon',     # Obsługa formatu Google w docstringach
    'sphinx_js',               # Czytanie JSDoc z JS
    'sphinxcontrib.mermaid',   # Obsługa diagramów Mermaid
    'myst_parser',             # Obsługa plików Markdown (.md)
]

# 3. Wskazujemy ścieżkę do kodu frontendowego (dla sphinx-js)
js_source_path = '../../frontend'

# 4. Ustawienia plików źródłowych
source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

templates_path = ['_templates']
exclude_patterns = []
language = 'pl'

# 5. Ustawienie nowoczesnego motywu Furo
html_theme = 'furo'
html_static_path = ['_static']