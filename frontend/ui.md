# Dokumentacja struktury interfejsu użytkownika (UI)

Rozdział ten opisuje statyczną strukturę plików HTML oraz definicje stylów CSS, które stanowią szkielet aplikacji. Logika interaktywna dla tych widoków znajduje się w dedykowanych skryptach JavaScript.

## 1. `index.html` - Główny widok (Diagram Segrè)

Plik definiuje strukturę strony startowej, zawierającej interaktywną mapę izotopów.

* **`#controls-panel`**: Kontener nawigacyjny umieszczony w lewym górnym rogu.
  * **`.slider-container`**: Suwak (input range) do wyboru poziomu stanu izomerycznego (0-2).
  * **`.legend-container`**: Legenda kolorów reprezentująca rzędy wielkości czasu półtrwania izotopów.
* **`#chart-container`**: Główny obszar roboczy zajmujący większość ekranu.
  * **`#segre-chart`**: Element SVG, w którym D3.js renderuje siatkę izotopów.
* **`#details-panel`**: Wysuwany z prawej strony panel boczny. Wyświetla podstawowe parametry (Z, N, czas półtrwania) klikniętego izotopu i zawiera przycisk przejścia do widoku szczegółowego.
* **`#tooltip`**: Pływający element DOM, ukryty domyślnie, służący do wyświetlania etykiet po najechaniu kursorem na element siatki.
* **Zależności zewn.:** D3.js (v7).

## 2. `details.html` - Widok szczegółów izotopu (Dashboard)

Plik definiuje strukturę panelu analitycznego dla pojedynczego izotopu. Opiera się na układzie kafelkowym (kart).

* **`.dashboard-header`**: Nagłówek z przyciskiem powrotu do strony głównej oraz dynamicznym tytułem zawierającym nazwę izotopu.
* **`.dashboard-grid`**: Główny kontener wykorzystujący CSS Grid do rozmieszczenia kart informacyjnych.
  * **Karta 1 (Właściwości fizyczne)**: Lista `<ul>` wyświetlająca podstawowe dane pobrane z API.
  * **Karta 2 (Prawdopodobieństwo)**: Kontener `#decay-chart` dla wykresu kołowego dróg rozpadu.
  * **Karta 3 (Topologia)**: Kontener `#cy-container` przeznaczony do renderowania grafu węzłów przez Cytoscape.js.
  * **Karta 4 (Filtry)**: Zestaw pól wyboru (checkbox) do włączania i wyłączania widoczności określonych typów rozpadu (α, β⁻, β⁺/ε) na grafie topologii.
  * **Karta 5 (Widmo Emisyjne)**: Element SVG rozciągnięty na dwie kolumny siatki, przeznaczony na wykres prążkowy promieniowania.
  * **Karta 6 (Ewolucja)**: Element SVG rozciągnięty na dwie kolumny siatki, przeznaczony na wykres liniowy równań Batemana.
* **Zależności zewn.:** Cytoscape.js (v3.28.1), D3.js (v7).

## 3. `style.css` - Arkusz stylów

Wspólny plik stylów dla obu widoków HTML. Wykorzystuje Flexbox i CSS Grid do pozycjonowania.

* **Style globalne**: Usunięcie domyślnych marginesów, ustawienie czcionki 'Segoe UI' oraz zablokowanie pasków przewijania (`overflow: hidden`) dla głównego widoku.
* **Diagram Segrè**:
  * Klasa `.isotope`: Definiuje obramowanie kwadratów na siatce i efekty najechania kursorem (zmiana grubości obramowania).
  * `#details-panel`: Kontroluje wysuwanie panelu bocznego za pomocą transformacji CSS (`transform: translateX(100%)`).
  * `.color-bar`: Generuje gradient tła dla legendy czasu półtrwania.
* **Dashboard szczegółów**:
  * Klasa `.dashboard-grid`: Definiuje dwukolumnowy układ siatki (`grid-template-columns: repeat(2, 1fr)`).
  * Klasa `.card`: Standaryzuje wygląd kafelków (białe tło, zaokrąglenia, cienie, minimalna wysokość 250px).
* **Elementy pomocnicze**: Ustawienia przycisków (`.primary-btn`, `.back-btn`) oraz zachowanie tooltipa (wyłączenie interakcji wskaźnika przez `pointer-events: none`).
