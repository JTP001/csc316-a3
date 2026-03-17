const WIDTH = 1000;
const HEIGHT = 1000;
let GLOBAL_LOTTOMAX_DATA = [];
let GLOBAL_DRAW_DATA = [];
let CURRENT_DRAW_POSITION = 1;
let USER_DRAW = [];

let drawRow = d3.select("#circle-chart-area")
    .insert("div", ":first-child")
    .attr("id", "user-draw-row")
    .style("margin-bottom", "15px")
    .style("font-size", "25px")
    .style("font-weight", "bold")
    .style("position", "relative")
    .text("Your numbers: ");

let svg = d3.select("#circle-chart-area")
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT);

let chartContainer = svg.append("g")
    .attr("class", "chart-container");

chartContainer.append("circle")
    .attr("cx", WIDTH/2)
    .attr("cy", HEIGHT/2)
    .attr("r", WIDTH/2 - 5)
    .attr("fill", "#79f770")
    .attr("stroke-width", 3);

let defs = svg.append("defs");

let gradient = defs.append("radialGradient")
    .attr("id", "ballGradient");

gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#ffffff");

gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#4ecbde");

let pack = d3.pack()
    .size([WIDTH, HEIGHT])
    .padding(5);

let tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .attr("class", "tooltip bs-tooltip-auto fade show")
    .attr("role", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", 0);

tooltip.append("div").attr("class", "tooltip-arrow");
tooltip.append("div").attr("class", "tooltip-inner");

let size_legend = chartContainer.append("g")
    .attr("class", "size-legend")
    .attr("transform", `translate(${WIDTH - 1000}, 50)`);

const small_r = 8;
const large_r = 25;

// small circle
size_legend.append("circle")
    .attr("cx", 40)
    .attr("cy", 130)
    .attr("r", small_r)
    .attr("fill", "#4ecbde")
    .attr("stroke", "#4ecbde");

// arrow
size_legend.append("line")
    .attr("x1", 40)
    .attr("y1", 115)
    .attr("x2", 40)
    .attr("y2", 65)
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#legend-arrow)");

// big circle
size_legend.append("circle")
    .attr("cx", 40)
    .attr("cy", 35)
    .attr("r", large_r)
    .attr("fill", "#4ecbde")
    .attr("stroke", "#4ecbde");

size_legend.append("text")
    .attr("x", 25)
    .attr("y", 160)
    .text("Drawn")
    .style("font-size", "12px");
size_legend.append("text")
    .attr("x", 18)
    .attr("y", 175)
    .text("less often")
    .style("font-size", "12px");

size_legend.append("text")
    .attr("x", 25)
    .attr("y", -10)
    .text("Drawn")
    .style("font-size", "12px");
size_legend.append("text")
    .attr("x", 15)
    .attr("y", 5)
    .text("more often")
    .style("font-size", "12px");


Promise.all([
    d3.csv("data/LOTTOMAX.csv", row => {
        row.draw_number = +row.draw_number;
        row.sequence_number = +row.sequence_number;
        row.number_drawn_1 = +row.number_drawn_1;
        row.number_drawn_2 = +row.number_drawn_2;
        row.number_drawn_3 = +row.number_drawn_3;
        row.number_drawn_4 = +row.number_drawn_4;
        row.number_drawn_5 = +row.number_drawn_5;
        row.number_drawn_6 = +row.number_drawn_6;
        row.number_drawn_7 = +row.number_drawn_7;
        row.bonus_number = +row.bonus_number;
        return row;
    }),
]).then((data) => {
    let lottomax_data = data[0]
    let aggregated = aggregateData(lottomax_data);
    
    GLOBAL_DRAW_DATA = lottomax_data;
    GLOBAL_LOTTOMAX_DATA = aggregated;

    renderCircleChart(getFilteredData());
});


function aggregateData(lottomax_data) {
    let result = {};

    for (let drawPos = 1; drawPos <= 7; drawPos++) {
        let counts = new Map();
        for (let num = 1; num <= 50; num++) {
            counts.set(num, 0);
        }

        result[drawPos] = counts;
    }

    lottomax_data.forEach(row => {

        for (let drawPos = 1; drawPos <= 7; drawPos++) {
            let num = row[`number_drawn_${drawPos}`];
            let current = result[drawPos].get(num);

            result[drawPos].set(num, current + 1);
        }
    });

    // convert maps to arrays (easier for D3)
    for (let drawPos = 1; drawPos <= 7; drawPos++) {
        result[drawPos] = Array.from(result[drawPos], ([number, count]) => ({
            number: number,
            count: count
        }));
    }

    console.log(result)
    return result;
}


function getFilteredData() {
    return GLOBAL_LOTTOMAX_DATA[CURRENT_DRAW_POSITION]
        .filter(d => !USER_DRAW.includes(d.number));
}


function renderCircleChart(data) {

    let root = d3.hierarchy({
        children: data.filter(d => d.count > 0)
    }).sum(d => d.count);

    pack(root);

    let nodes = root.leaves();

    let groups = chartContainer.selectAll("g.ball")
        .data(nodes, d => d.data.number);

    let groupsEnter = groups.enter()
        .append("g")
        .attr("class", "ball")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .on("click", function(event, d) {
            if (CURRENT_DRAW_POSITION > 7) return;

            let selectedNumber = d.data.number;
            if (USER_DRAW.includes(selectedNumber)) return;

            USER_DRAW.push(selectedNumber);
            updateDrawRow();
            CURRENT_DRAW_POSITION++;

            if (CURRENT_DRAW_POSITION <= 7) {
                renderCircleChart(getFilteredData());
            } else {
                showFinalDraw();
            }
        })
        .on("mouseover", function(event, d) {
            tooltip.style("opacity", 1);
            tooltip.select(".tooltip-inner")
                .html(`Number: ${d.data.number}<br>Count: ${d.data.count}`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseleave", function() {
            tooltip.style("opacity", 0);
        });

    groupsEnter.append("circle")
        .attr("r", 0)
        .attr("fill", "url(#ballGradient)")
        .attr("stroke", "#bdbdbd")
        .transition()
        .duration(600)
        .attr("r", d => d.r);

    groupsEnter.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .style("font-size", d => `${d.r/2}px`)
        .text(d => d.r > 15 ? d.data.number : "");

    // UPDATE (with transition)
    groups.transition()
        .duration(600)
        .attr("transform", d => `translate(${d.x},${d.y})`);

    groups.select("circle")
        .transition()
        .duration(600)
        .attr("r", d => d.r);

    groups.select("text")
        .transition()
        .duration(600)
        .style("font-size", d => `${d.r/2}px`)
        .text(d => d.r > 15 ? d.data.number : "");

    // EXIT
    groups.exit()
        .transition()
        .duration(400)
        .style("opacity", 0)
        .remove();
}


function updateDrawRow() {
    let balls = drawRow.selectAll("span.ball")
        .data(USER_DRAW, d => d);

    let ballsEnter = balls.enter()
        .append("span")
        .attr("class", "ball")
        .style("display", "inline-flex")
        .style("justify-content", "center")
        .style("align-items", "center")
        .style("width", "35px")
        .style("height", "35px")
        .style("border-radius", "50%")
        .style("background", "radial-gradient(circle at 30% 30%, #fff, #4ecbde)")
        .style("border", "2px solid #bdbdbd")
        .style("margin-right", "8px")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text(d => d);

    ballsEnter
        .style("transform", "scale(0)")
        .transition()
        .duration(300)
        .style("transform", "scale(1)");
}


function checkIfDrawWon() {
    // Apparently in Lotto Max draw order doesn't matter, so the easiest way to compare is to just sort it
    let sortedUserDraw = [...USER_DRAW].sort((a,b) => a-b);

    let winningDraw = GLOBAL_DRAW_DATA.find(row => {
        let drawNumbers = [
            row.number_drawn_1,
            row.number_drawn_2,
            row.number_drawn_3,
            row.number_drawn_4,
            row.number_drawn_5,
            row.number_drawn_6,
            row.number_drawn_7
        ].sort((a,b)=>a-b);
        
        return JSON.stringify(drawNumbers) === JSON.stringify(sortedUserDraw);
    });

    return winningDraw;
}


function showFinalDraw() {
    chartContainer.selectAll("g.ball")
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

    chartContainer.select(".size-legend")
        .transition()
        .duration(500)
        .style("opacity", 0);

    let winningDraw = checkIfDrawWon();
    let resultText;

    if (winningDraw) {
        resultText = "Your draw won on: " + winningDraw.draw_date;
    } else {
        resultText = "This number sequence has never won. Try again!";
    }

    let resultContainer = d3.select("#circle-chart-area")
        .append("div")
        .attr("id", "result-container")
        .style("text-align", "center")
        .style("margin-top", "-500px");

    resultContainer.append("div")
        .attr("class", "result-text")
        .style("font-size", "32px")
        .style("margin-bottom", "20px")
        .style("opacity", 0)
        .text(resultText)
        .transition()
        .duration(600)
        .style("opacity", 1);

    resultContainer.append("button")
        .attr("id", "restart-button")
        .attr("class", "btn btn-primary")
        .text("Start New Draw")
        .style("opacity", 0)
        .on("click", resetVisualization)
        .transition()
        .delay(600)
        .duration(400)
        .style("opacity", 1);
}


function resetVisualization() {
    svg.transition()
        .duration(500)
        .style("opacity", 0)
        .on("end", function() {
            USER_DRAW = [];
            CURRENT_DRAW_POSITION = 1;

            svg.selectAll(".result-text").remove();
            drawRow.text("Your numbers: ");
            d3.select("#result-container").remove();

            renderCircleChart(getFilteredData());

            svg.transition()
                .duration(600)
                .style("opacity", 1);
        });
}