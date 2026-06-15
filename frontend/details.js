/**
 * @file Skrypt obsługujący widok szczegółów izotopu (details.html).
 * * Odpowiada za odczytanie wybranego izotopu z parametrów URL, asynchroniczne pobieranie danych 
 * z backendowego API (właściwości fizyczne, łańcuchy rozpadu, ewolucja czasowa) 
 * oraz inicjalizację i renderowanie wykresów za pomocą bibliotek D3.js i Cytoscape.js.
 */
document.addEventListener("DOMContentLoaded", () => {
    /**
     * Rysuje wykres kołowy (donut chart) przedstawiający prawdopodobieństwa poszczególnych dróg rozpadu dla badanego izotopu.
     *
     * Funkcja filtruje krawędzie wychodzące z głównego izotopu, zamienia ich prawdopodobieństwa
     * na procenty i renderuje wykres SVG przy użyciu biblioteki D3.js. Jeśli izotop jest stabilny 
     * (brak krawędzi wychodzących), wyświetla stosowny komunikat tekstowy zamiast wykresu.
     *
     * @param {Array<Object>} edgesData - Lista obiektów krawędzi (z grafu Cytoscape) zawierających dane o relacjach i prawdopodobieństwach rozpadu.
     * @param {string} centralNodeId - Identyfikator (nazwa) głównego izotopu, dla którego analizowane są rozpadu wychodzące.
     * @returns {void} Funkcja modyfikuje bezpośrednio drzewo DOM, niczego nie zwracając.
     */
    function drawBranchingChart(edgesData, centralNodeId) {
        const svg = d3.select("#decay-chart");
        svg.selectAll("*").remove();

        const outgoingEdges = edgesData.filter(e => e.data.source === centralNodeId);

        const container = document.getElementById("decay-chart-container");
        const width = container.clientWidth;
        const height = container.clientHeight || 200;

        if (outgoingEdges.length === 0) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#28a745")
                .style("font-weight", "bold")
                .text("Brak rozpadów (Izotop stabilny)");
            return;
        }

        const pieData = outgoingEdges.map(e => ({
            label: e.data.label,
            probability: parseFloat(e.data.probability) * 100
        }));

        const radius = Math.min(width, height) / 2 - 10;
        const g = svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        const color = d3.scaleOrdinal()
            .domain(pieData.map(d => d.label))
            .range(["#0056b3", "#ffc107", "#dc3545", "#17a2b8", "#6c757d"]);

        const pie = d3.pie().value(d => d.probability);
        const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);

        const arcs = g.selectAll("arc")
            .data(pie(pieData))
            .enter()
            .append("g");

        arcs.append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.label))
            .attr("stroke", "white")
            .style("stroke-width", "2px");

        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .text(d => d.data.probability > 5 ? `${d.data.probability.toFixed(1)}%` : "");

        const legend = svg.append("g")
            .attr("transform", `translate(10, 10)`);

        pieData.forEach((d, i) => {
            const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
            legendRow.append("rect").attr("width", 10).attr("height", 10).attr("fill", color(d.label));
            legendRow.append("text").attr("x", 15).attr("y", 10).style("font-size", "12px").text(`${d.label} (${d.probability.toFixed(2)}%)`);
        });
    }


    /**
     * Rysuje interaktywny wykres liniowy przedstawiający ewolucję populacji izotopów w czasie (na podstawie równań Batemana).
     *
     * Wykorzystuje D3.js do wygenerowania wykresu ze skalą logarytmiczną na osi Y (aby uwidocznić populacje śladowe) 
     * oraz osią X wyrażoną w krotnościach czasu półtrwania izotopu matki. Zawiera interaktywną legendę, 
     * pozwalającą użytkownikowi na włączanie i wyłączanie widoczności poszczególnych izotopów na wykresie.
     *
     * @param {Object} evolutionResponse - Obiekt JSON z danymi ewolucji pobranymi z backendu (zawiera flagę stabilności, czas półtrwania i dane historyczne).
     * @returns {void} Funkcja modyfikuje bezpośrednio drzewo DOM.
     */
    function drawEvolutionChart(evolutionResponse) {
        const svg = d3.select("#evolution-chart");
        svg.selectAll("*").remove();

        const container = document.getElementById("evolution-chart-container");
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (evolutionResponse.stable) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#28a745")
                .style("font-weight", "bold")
                .text("Izotop stabilny – brak zmian w czasie.");
            return;
        }

        const hl_s = evolutionResponse.half_life_s;
        const rawData = evolutionResponse.data;

        let isotopes = new Set();
        rawData.forEach(d => {
            Object.keys(d).forEach(k => {
                if (k !== "time") isotopes.add(k);
            });
        });
        isotopes = Array.from(isotopes);

        const yMin = 1e-12; 

        const series = isotopes.map(iso => {
            return {
                name: iso,
                values: rawData.map(d => ({
                    time: d.time / hl_s,
                    value: Math.max(yMin, (d[iso] || 0) * 100) 
                }))
            };
        });

        let activeIsotopes = new Set(isotopes);

        const margin = { top: 20, right: 120, bottom: 50, left: 90 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear().domain([0, 5]).range([0, innerWidth]);
        const yScale = d3.scaleLog().domain([yMin, 150]).range([innerHeight, 0]); 

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(isotopes);

        const xAxisGroup = g.append("g").attr("transform", `translate(0,${innerHeight})`);
        xAxisGroup.call(d3.axisBottom(xScale))
            .append("text")
            .attr("x", innerWidth / 2)
            .attr("y", 40)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Czas (Liczba T₁/₂ izotopu matki)");

        const yAxisGroup = g.append("g");
        yAxisGroup.call(d3.axisLeft(yScale)
            .tickValues([100, 1, 1e-2, 1e-4, 1e-6, 1e-8, 1e-10, 1e-12])
            .tickFormat(d => d >= 1 ? d + "%" : d.toExponential(0) + "%")
        );

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -70)
            .attr("x", -innerHeight / 2)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Populacja izotopu (%)");

        const line = d3.line()
            .x(d => xScale(d.time))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        const linesGroup = g.append("g");

        function updateChart() {
            const activeSeries = series.filter(s => activeIsotopes.has(s.name));

            const paths = linesGroup.selectAll(".line").data(activeSeries, d => d.name);

            paths.exit().transition().duration(300).style("opacity", 0).remove();

            paths.enter()
                .append("path")
                .attr("class", "line")
                .style("stroke", d => colorScale(d.name))
                .style("stroke-width", 3)
                .style("fill", "none")
                .merge(paths)
                .transition().duration(500)
                .attr("d", d => line(d.values));
        }

        const legend = svg.append("g")
            .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

        isotopes.forEach((iso, i) => {
            const row = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`)
                .style("cursor", "pointer")
                .on("click", function() {
                    if (activeIsotopes.has(iso)) {
                        activeIsotopes.delete(iso);
                        d3.select(this).style("opacity", 0.3);
                    } else {
                        activeIsotopes.add(iso);
                        d3.select(this).style("opacity", 1);
                    }
                    updateChart(); 
                });

            row.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", colorScale(iso));

            row.append("text")
                .attr("x", 20)
                .attr("y", 10)
                .style("font-size", "12px")
                .style("alignment-baseline", "middle")
                .text(iso);
        });

        updateChart();
    }

    /**
     * Generuje interaktywny wykres widma promieniowania jonizującego w formie wykresu igłowego (stem-and-bulb).
     *
     * Używa D3.js do narysowania dyskretnych linii emisyjnych dla promieniowania alfa i gamma. 
     * Skala X (energia w keV) wykorzystuje transformację logarytmiczną w celu lepszej czytelności 
     * szerokich zakresów energii. Implementuje ukryte domyślnie etykiety narzędziowe (tooltipy), 
     * które pojawiają się po najechaniu kursorem na prążek widma, wyświetlając dokładną energię i wydajność rozpadu.
     *
     * @param {Object|null} spectra - Obiekt z danymi widma pobrany z bazy danych lub wartość null, jeśli izotop nie posiada dyskretnych linii emisyjnych.
     * @returns {void} Funkcja modyfikuje bezpośrednio drzewo DOM.
     */
    function drawSpectrumChart(spectra) {
        const svg = d3.select("#spectrum-chart");
        svg.selectAll("*").remove();

        const container = document.getElementById("spectrum-chart-container");
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (!spectra || (spectra.gamma.length === 0 && spectra.alpha.length === 0)) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#777")
                .text("Brak dyskretnych linii emisyjnych w bazie.");
            return;
        }

        let dataset = [];
        spectra.gamma.forEach(d => dataset.push({ e: d.e, i: (d.i / 100), type: "γ (Gamma)", color: "#00bfff" }));
        spectra.alpha.forEach(d => dataset.push({ e: d.e, i: (d.i / 100), type: "α (Alfa)", color: "#ff0000" }));

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const xMin = Math.max(10, d3.min(dataset, d => d.e) * 0.8);
        const xMax = d3.max(dataset, d => d.e) * 1.2;
        
        const maxIntensity = d3.max(dataset, d => d.i);
        const yMax = Math.max(100, maxIntensity * 1.05); 
        
        const xScale = d3.scaleLog().domain([xMin, xMax]).range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(5, "~s"))
            .append("text")
            .attr("x", innerWidth / 2)
            .attr("y", 35)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Energia (keV)");

        g.append("g").call(d3.axisLeft(yScale).tickFormat(d => d + "%"));

        let tooltip = d3.select("#spectrum-tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("id", "spectrum-tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "8px")
                .style("border-radius", "4px")
                .style("pointer-events", "none") 
                .style("z-index", "100")
                .style("opacity", 0)
                .style("transition", "opacity 0.2s ease-in-out");
        }

        g.selectAll("line.stem")
            .data(dataset)
            .enter().append("line")
            .attr("class", "stem")
            .attr("x1", d => xScale(d.e))
            .attr("x2", d => xScale(d.e))
            .attr("y1", yScale(0))
            .attr("y2", d => yScale(d.i))
            .attr("stroke", d => d.color)
            .attr("stroke-width", 2);

        g.selectAll("circle.bulb")
            .data(dataset)
            .enter().append("circle")
            .attr("class", "bulb")
            .attr("cx", d => xScale(d.e))
            .attr("cy", d => yScale(d.i))
            .attr("r", 5)
            .attr("fill", d => d.color)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                d3.select(event.target).attr("r", 8).attr("stroke", "#fff").attr("stroke-width", 2);
                tooltip.style("opacity", 1)
                       .html(`<strong>Promieniowanie ${d.type}</strong><br>Energia: ${d.e} keV<br>Wydajność: ${d.i}%`);
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", (event) => {
                d3.select(event.target).attr("r", 5).attr("stroke", "none");
                tooltip.style("opacity", 0);
            });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isotopeName = urlParams.get('iso');

    if (!isotopeName) {
        document.getElementById("dashboard-title").innerText = "Błąd: Nie wybrano izotopu.";
        return;
    }

    document.getElementById("dashboard-title").innerText = `Karta Informacyjna: ${isotopeName}`;

    fetch(`/api/isotope/${isotopeName}`)
        .then(res => {
            if (!res.ok) throw new Error(`Błąd HTTP: ${res.status}`);
            return res.json();
        })
        .then(data => {
            document.getElementById("det-element").innerText = data.nazwa_pierwiastka !== "Nieznany" ? data.nazwa_pierwiastka : "Brak danych";
            document.getElementById("det-z").innerText = data.Z !== null ? data.Z : "Brak danych";
            document.getElementById("det-a").innerText = data.A !== null ? data.A : "Brak danych";
            document.getElementById("det-hl").innerText = data.czas_poltrwania || "Brak danych";

            if (data.sf_prob > 0) {
                document.getElementById("det-sf").innerText = `${(data.sf_prob * 100).toExponential(2)}%`;
            } else {
                document.getElementById("det-sf").innerText = "Brak / 0%";
                document.getElementById("det-sf").style.color = "#333";
            }

            if (data.widmo) {
                drawSpectrumChart(data.widmo);
            } else {
                drawSpectrumChart(null);
            }
        })
        .catch(err => {
            console.error("Błąd pobierania właściwości:", err);
            document.getElementById("det-hl").innerText = "Błąd ładowania danych.";
        });


    const cy = cytoscape({
        container: document.getElementById('cy-container'),
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#0056b3',
                    'label': 'data(label)',
                    'color': '#333',
                    'text-valign': 'top',
                    'text-margin-y': -5,
                    'font-size': '12px',
                    'font-weight': 'bold',
                    'width': '35px',
                    'height': '35px'
                }
            },
            {
                selector: '.central-node',
                style: {
                    'background-color': '#ffc107',
                    'border-width': '3px',
                    'border-color': '#333',
                    'width': '45px',
                    'height': '45px',
                    'font-size': '14px'
                }
            },
            {
                selector: 'node[type="Rozszczepienie"]',
                style: {
                    'background-color': '#dc3545',
                    'shape': 'star',
                    'width': '45px',
                    'height': '45px'
                }
            },
            {
                selector: 'node[type="Czastka"]',
                style: {
                    'background-color': '#6c757d',
                    'shape': 'ellipse',
                    'width': '20px',
                    'height': '20px'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#999',
                    'target-arrow-color': '#999',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'label': 'data(label)',
                    'font-size': '10px',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -10
                }
            }
        ]
    });

    fetch(`/api/isotope/${isotopeName}/decay-chains`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                const allEdges = data.filter(item => item.data.source !== undefined);
                const centralNodeData = data.find(item => item.classes === "central-node");
                if (centralNodeData) {
                    drawBranchingChart(allEdges, centralNodeData.data.id);
                }

                cy.add(data);
                
                cy.layout({
                    name: 'breadthfirst',
                    directed: true,
                    padding: 30,
                    spacingFactor: 2.5,
                    nodeDimensionsIncludeLabels: true,
                    avoidOverlap: true 
                }).run();
                
                cy.on('tap', 'node', function(evt){
                    const node = evt.target;
                    if (node.data('type') === 'Izotop') {
                        const clickedIsotope = node.data('label');
                        window.location.href = `details.html?iso=${clickedIsotope}`;
                    }
                });
                
                cy.on('mouseover', 'node', function(evt){
                    document.getElementById('cy-container').style.cursor = 'pointer';
                });
                cy.on('mouseout', 'node', function(evt){
                    document.getElementById('cy-container').style.cursor = 'default';
                });

                function applyGraphFilters() {
                    const showAlpha = document.getElementById('filter-alpha').checked;
                    const showBetaM = document.getElementById('filter-beta-minus').checked;
                    const showBetaP = document.getElementById('filter-beta-plus').checked;

                    cy.batch(() => {
                        cy.elements().show(); 

                        if (!showAlpha) cy.edges('[label = "ROZPAD_ALFA"]').hide();
                        if (!showBetaM) cy.edges('[label = "ROZPAD_BETA_MINUS"]').hide();
                        if (!showBetaP) cy.edges('[label = "ROZPAD_BETA_PLUS_LUB_EC"]').hide();

                        const centralNode = cy.$('.central-node');
                        
                        if (centralNode.length > 0) {
                            const reachableElements = cy.collection();
                            reachableElements.merge(centralNode);

                            cy.elements(':visible').bfs({
                                roots: centralNode,
                                directed: false, 
                                visit: function(v, e, u, i, depth) {
                                    reachableElements.merge(v); 
                                }
                            });

                            cy.nodes().difference(reachableElements).hide();
                        }
                    });
                }

                document.querySelectorAll('#filters-container input').forEach(checkbox => {
                    checkbox.addEventListener('change', applyGraphFilters);
                });

            } else {
                document.getElementById('cy-container').innerHTML = 
                    `<div style="padding: 20px; text-align: center; color: #28a745; font-weight: bold;">
                        To jest izotop stabilny. Posiada najniższy stan energetyczny i nie ulega dalszym rozpadom promieniotwórczym.
                     </div>`;
            }
        })
        .catch(err => console.error("Błąd pobierania grafu:", err));
    fetch(`/api/isotope/${isotopeName}/evolution`)
        .then(res => res.json())
        .then(data => {
            if (data.stable) {
                drawEvolutionChart(data);
                return;
            }
            
            if (data.detail || data.error || !data.data) {
                console.error("Błąd z backendu:", data);
                document.getElementById('evolution-chart-container').innerHTML = 
                    `<p style="color:red; padding: 20px;">Błąd pobierania danych ewolucji. Upewnij się, że backend działa i został zrestartowany.</p>`;
                return;
            }
            
            drawEvolutionChart(data);
        })
        .catch(err => {
            console.error("Błąd pobierania ewolucji:", err);
            document.getElementById('evolution-chart-container').innerHTML = 
                `<p style="color:red; padding: 20px;">Krytyczny błąd skryptu. Sprawdź konsolę (F12).</p>`;
        });
});