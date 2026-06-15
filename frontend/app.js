/**
 * @file Skrypt obsługujący główny widok siatki izotopów (Tablica Segrè).
 * Odpowiada za pobranie podstawowych danych o wszystkich izotopach z backendu, 
 * renderowanie interaktywnego wykresu przy użyciu biblioteki D3.js (z obsługą zoomu i przesuwania) 
 * oraz zarządzanie panelem bocznym prezentującym szczegóły wybranego izotopu.
 */
document.addEventListener("DOMContentLoaded", () => {
    const svg = d3.select("#segre-chart");
    const container = document.getElementById("chart-container");
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const g = svg.append("g");

    const xAxisGroup = svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height - 40})`);
        
    const yAxisGroup = svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(40, 0)`);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .style("text-anchor", "middle")
        .text("Liczba neutronów (N)");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 12)
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .style("text-anchor", "middle")
        .text("Liczba protonów (Z)");

    const axisScaleX = d3.scaleLinear().range([0, width]);
    const axisScaleY = d3.scaleLinear().range([height, 0]);

    const tileSize = 12;
    const Z_MAX = 120;
    const N_MAX = 180;

    const zoom = d3.zoom()
        .scaleExtent([0.3, 15])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);

            const k = event.transform.k;
            const tx = event.transform.x;
            const ty = event.transform.y;

            const nLeft = (0 - tx) / (k * tileSize);
            const nRight = (width - tx) / (k * tileSize);
            axisScaleX.domain([nLeft, nRight]);

            const zBottom = Z_MAX - ((height - ty) / (k * tileSize));
            const zTop = Z_MAX - ((0 - ty) / (k * tileSize));
            axisScaleY.domain([zBottom, zTop]);

            xAxisGroup.call(d3.axisBottom(axisScaleX).ticks(Math.floor(width / 80)));
            yAxisGroup.call(d3.axisLeft(axisScaleY).ticks(Math.floor(height / 50)));

            svg.selectAll(".x-axis text, .y-axis text")
               .style("text-shadow", "2px 2px 0px #fff, -2px -2px 0px #fff, 2px -2px 0px #fff, -2px 2px 0px #fff")
               .style("font-size", "11px")
               .style("font-weight", "bold");
        });

    svg.call(zoom);

    let allIsotopesData = [];
    let currentSelectedIsotope = null;
    
    /**
     * Określa poziom stanu izomerycznego (wzbudzenia) izotopu na podstawie jego nazwy.
     *
     * Analizuje sufiksy w nazwie izotopu (takie jak 'm', 'm1', 'n', 'p'), aby sklasyfikować go 
     * jako stan podstawowy lub jeden ze stanów wzbudzonych. Wykorzystywane do filtrowania 
     * warstw na głównym wykresie.
     *
     * @param {string} name - Nazwa izotopu do weryfikacji (np. "Tc-99m").
     * @returns {number} Liczba całkowita reprezentująca poziom wzbudzenia: 0 (stan podstawowy), 1, 2 lub 3.
     */
    function getIsomerLevel(name) {
        if (name.endsWith('m') || name.endsWith('m1')) return 1;
        if (name.endsWith('m2') || name.endsWith('n')) return 2;
        if (name.endsWith('m3') || name.endsWith('p')) return 3;
        return 0;
    }

    /**
     * Konwertuje tekstowy czas półtrwania na odpowiedni kolor na mapie izotopów.
     *
     * Rozpoznaje jednostki czasu (od nanosekund po lata), przelicza wartość na sekundy, 
     * a następnie używa skali logarytmicznej do wygenerowania odpowiedniego koloru z predefiniowanej 
     * palety termicznej (od czerwonego do niebieskiego). Izotopy stabilne są rysowane na czarno.
     *
     * @param {string} hlStr - Czas półtrwania w postaci tekstowej wraz z jednostką (np. "4.468e9 y", "Stable").
     * @returns {string} Kod koloru w formacie HEX przypisany do danego czasu półtrwania.
     */
    function getColorForHalfLife(hlStr) {
        if (!hlStr) return "#777";
        
        const str = hlStr.toLowerCase();
        if (str.includes("stabil") || str.includes("inf")) {
            return "#000000";
        }

        const parts = hlStr.trim().split(" ");
        if (parts.length < 2) return "#777";
        
        const val = parseFloat(parts[0]);
        const unit = parts[1].toLowerCase();
        if (isNaN(val)) return "#777";
        
        let multiplier = 1;
        if (unit.includes('y')) multiplier = 31536000;
        else if (unit.includes('d')) multiplier = 86400;
        else if (unit.includes('h')) multiplier = 3600; 
        else if (unit.includes('m') && !unit.includes('ms') && !unit.includes('μs') && !unit.includes('µs')) multiplier = 60;
        else if (unit.includes('ms')) multiplier = 1e-3; 
        else if (unit.includes('us') || unit.includes('μs') || unit.includes('µs')) multiplier = 1e-6;
        else if (unit.includes('ns')) multiplier = 1e-9;

        const seconds = val * multiplier;
        
        const logSeconds = Math.log10(Math.max(1e-9, seconds));

        const mathScale = d3.scaleLinear()
            .domain([-6, -1, 4, 9, 18])
            .range(["#ff0000", "#ff7f00", "#ffd700", "#00bfff", "#0000ff"])
            .clamp(true);

        return mathScale(logSeconds);
    }

    /**
     * Rysuje lub aktualizuje siatkę izotopów na głównym wykresie D3.
     *
     * Pobiera pełny zbiór izotopów i filtruje go według wybranego poziomu izomerycznego.
     * Tworzy elementy SVG w odpowiednich koordynatach Z i N. Podpina również 
     * zdarzenia myszy do wyświetlania dynamicznych tooltipów oraz otwierania panelu bocznego po kliknięciu.
     *
     * @param {number} levelFilter - Poziom stanu izomerycznego (0-3), który ma zostać wyrenderowany.
     * @returns {void} Modyfikuje bezpośrednio wyselekcjonowaną grupę SVG w DOM.
     */
    function renderChart(levelFilter) {
        g.selectAll("rect.isotope").remove();
        const tooltip = d3.select("#tooltip");

        const layerData = allIsotopesData.filter(d => getIsomerLevel(d.nazwa) === levelFilter);

        g.selectAll("rect.isotope")
            .data(layerData, d => d.nazwa)
            .enter()
            .append("rect")
            .attr("class", "isotope")
            .attr("x", d => (d.A - d.Z) * tileSize)
            .attr("y", d => (Z_MAX - d.Z) * tileSize - tileSize) 
            .attr("width", tileSize * 0.9)
            .attr("height", tileSize * 0.9)
            .attr("fill", d => getColorForHalfLife(d.czas_poltrwania))
            .on("mouseover", (event, d) => {
                const elName = d.nazwa_pierwiastka && d.nazwa_pierwiastka !== "Nieznany" ? ` (${d.nazwa_pierwiastka})` : "";
                
                tooltip.classed("hidden", false)
                       .html(`<strong>${d.nazwa}${elName}</strong><br>Z=${d.Z}, N=${d.A - d.Z}<br>T₁/₂: ${d.czas_poltrwania}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("left", event.pageX + "px").style("top", event.pageY + "px");
            })
            .on("mouseout", () => { tooltip.classed("hidden", true); })
            .on("click", (event, d) => { openPanel(d); });
    }

    const panel = document.getElementById("details-panel");
    
    /**
     * Otwiera panel boczny i wypełnia go podstawowymi danymi wybranego izotopu.
     *
     * Aktualizuje węzły tekstowe w DOM na podstawie przekazanego obiektu, 
     * zdejmując z panelu klasę ukrywającą go przed użytkownikiem.
     *
     * @param {Object} isotope - Obiekt reprezentujący wybrany izotop (musi zawierać nazwę, Z, A, czas półtrwania oraz nazwę pierwiastka).
     * @returns {void} Modyfikuje bezpośrednio zawartość panelu w strukturze DOM.
     */
    function openPanel(isotope) {
        currentSelectedIsotope = isotope;
        document.getElementById("iso-name").innerText = isotope.nazwa;
        
        const elSpan = document.getElementById("iso-element");
        if(elSpan) {
            elSpan.innerText = isotope.nazwa_pierwiastka !== "Nieznany" ? isotope.nazwa_pierwiastka : "Brak danych";
        }
        
        document.getElementById("iso-z").innerText = isotope.Z;
        document.getElementById("iso-n").innerText = isotope.A - isotope.Z;
        document.getElementById("iso-hl").innerText = isotope.czas_poltrwania;
        panel.classList.remove("hidden");
    }

    document.getElementById("close-panel-btn").addEventListener("click", () => panel.classList.add("hidden"));
    
    document.getElementById("explore-btn").addEventListener("click", () => {
        if (currentSelectedIsotope) {
            window.location.href = `details.html?iso=${currentSelectedIsotope.nazwa}`;
        }
    });

    const slider = document.getElementById("isomer-slider");
    const label = document.getElementById("isomer-label");
    slider.addEventListener("input", (e) => {
        const level = parseInt(e.target.value);
        let text = "Podstawowy (0)";
        if (level === 1) text = "Wzbudzony m1 (1)";
        else if (level === 2) text = "Wzbudzony m2 (2)";
        else if (level === 3) text = "Wzbudzony m3 (3)";
        label.innerText = text;
        renderChart(level);
    });

    fetch('/api/chart-data')
        .then(res => res.json())
        .then(data => {
            allIsotopesData = data;
            
            svg.call(zoom.transform, d3.zoomIdentity.translate(80, 50).scale(0.8));
            
            renderChart(0); 
        })
        .catch(err => console.error("Błąd pobierania bazy:", err));
});