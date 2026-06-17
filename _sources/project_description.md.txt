# Opis projeku, Źródła Danych i Obliczenia Fizyczne

## 1. Opis Projektu

Aplikacja "Radioaktywność - Baza Grafowa" to interaktywny system służący do analizy i wizualizacji właściwości fizycznych oraz łańcuchów rozpadu izotopów promieniotwórczych. Wykorzystuje natywną bazę grafową (Neo4j) do modelowania izotopów jako węzłów oraz ich dróg rozpadu jako relacji skierowanych. Interfejs użytkownika oferuje interaktywną tablicę Segrè, grafy topologii rozpadów (Cytoscape.js) oraz symulacje ewolucji czasowej populacji izotopów (D3.js).

Dane do bazy grafowej zostały pozyskane za pomocą dwóch bibliotek Pythonowych, `radioactivedecay` i `PyNE`.

## 2. Biblioteka `radioactivedecay` (Podstawowa topologia i parametry)

Głównym źródłem danych dla struktury izotopów, ich parametrów fizycznych oraz topologii łańcuchów rozpadu jest biblioteka `radioactivedecay`.

* **Zakres danych:** Liczby atomowe (Z), liczby masowe (A), czasy półtrwania, stany izomeryczne oraz ułamki rozgałęzień  dla poszczególnych trybów rozpadu (np. α, β⁻, β⁺/EC, IT).
* **Pochodzenie danych:** `radioactivedecay` wykorzystuje bazę **ICRP107** (Międzynarodowa Komisja Ochrony Radiologicznej).
* **Integracja z bazą grafową:** Baza Neo4j jest zasilana tymi danymi w sposób zautomatyzowany poprzez skrypt `populate_db.py`, który odpytuje zbiór `rd.DEFAULTDATA` i mapuje go na węzły oraz relacje grafowe.

## 3. Biblioteka 'PyNE (Widma emisyjne)

Dyskretne widma promieniowania jonizującego zostały pierwotnie pozyskane z biblioteki **PyNE** (Python for Nuclear Engineering), która natywnie integruje potężne referencyjne bazy danych struktury jądrowej (m.in. ENSDF - *Evaluated Nuclear Structure Data File*). Na jej podstawie wygenerowano plik spectra.json, którego później użyto do wprowadzenia danych do bazy Neo4j. Nie zastosowano PyNE bezpośrednio z powodu braku kompatybilności z Windowsem.

* **Zakres danych:** Energie (wyrażone w keV) oraz prawdopodobieństwa emisji (intensywności prążków w %) dla promieniowania alfa oraz gamma.
* **Zastosowanie:** Skrypt ładujący przypisuje te dane jako atrybut `widmo` (w zserializowanej postaci) bezpośrednio do węzłów klasy `Izotop`, co pozwala na natychmiastowe renderowanie interaktywnych widm igłowych na frontendzie bez konieczności odpytywania zewnętrznych usług.

## 3. Równania Batemana (Ewolucja czasowa)

Wykresy ewolucji łańcuchów rozpadu (dostępne w widoku szczegółów) nie opierają się na statycznych, wstępnie wyliczonych tabelach, lecz są generowane dynamicznie w czasie rzeczywistym.

Backend wykorzystuje zaimplementowane w bibliotece `radioactivedecay` macierzowe rozwiązania **równań Batemana**. API symuluje rozpad centralnego izotopu dla czasu równego 5 okresom półtrwania, przekazując na frontend wektor danych o pojawiających się i znikających populacjach izotopów potomnych.
