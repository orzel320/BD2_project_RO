import os
import sys

sys.path.insert(0, os.path.abspath('../../backend'))

project = 'Radioaktywność - Baza Grafowa'
copyright = ''
author = 'Rafał Oszajca'

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
    'sphinx_js',
    'sphinxcontrib.mermaid',
    'myst_parser',
]

js_source_path = '../../frontend'

source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

templates_path = ['_templates']
exclude_patterns = []
language = 'pl'

html_theme = 'furo'
html_static_path = ['_static']