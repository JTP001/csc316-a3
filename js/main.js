const WIDTH = 1000;
const HEIGHT = 1000;
let GLOBAL_LOTTOMAX_DATA = [];
let CURRENT_DRAW_POSITION = 1;
let USER_DRAW = [];

let svg = d3.select("#circle-chart-area")
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT);

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

let size_legend = svg.append("g")
    .attr("class", "size-legend")
    .attr("transform", `translate(${WIDTH - 1000}, 50)`);

const small_r = 8;
const large_r = 25;

// small circle
size_legend.append("circle")
    .attr("cx", 20)
    .attr("cy", 130)
    .attr("r", small_r)
    .attr("fill", "#fee391")
    .attr("stroke", "#fee391");

// arrow
size_legend.append("line")
    .attr("x1", 20)
    .attr("y1", 115)
    .attr("x2", 20)
    .attr("y2", 65)
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#legend-arrow)");

// big circle
size_legend.append("circle")
    .attr("cx", 20)
    .attr("cy", 35)
    .attr("r", large_r)
    .attr("fill", "#fee391")
    .attr("stroke", "#fee391");

size_legend.append("text")
    .attr("x", 0)
    .attr("y", 160)
    .text("Drawn")
    .style("font-size", "10px");
size_legend.append("text")
    .attr("x", 0)
    .attr("y", 175)
    .text("less often")
    .style("font-size", "10px");

size_legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .text("Drawn")
    .style("font-size", "10px");
size_legend.append("text")
    .attr("x", 0)
    .attr("y", 5)
    .text("more often")
    .style("font-size", "10px");


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
    svg.selectAll("circle.number").remove();
    svg.selectAll("text.number").remove();

    let root = d3.hierarchy({
        children: data.filter(d => d.count > 0)
    })
    .sum(d => d.count);

    pack(root);

    let nodes = root.leaves();

    let circles = svg.selectAll("circle.number")
        .data(nodes, d => d.data.number);
    
    let circlesEnter = circles.enter()
        .append("circle")
        .attr("class", "number")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .attr("fill", "#fee391")
        .attr("stroke", "#bdbdbd")
        .on("click", function(event, d) {
            let selectedNumber = d.data.number;
            if (USER_DRAW.includes(selectedNumber)) return;

            USER_DRAW.push(selectedNumber);
            console.log("User draw:", USER_DRAW);
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

    svg.selectAll("text.number")
        .data(nodes, d => d.data.number)
        .enter()
        .append("text")
        .attr("class", "number")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .style("font-size", "10px")
        .text(d => d.r > 15 ? d.data.number : "");
}


function showFinalDraw() {

    console.log("Final draw:", USER_DRAW);

    svg.selectAll("circle.number").remove();
    svg.selectAll("text.number").remove();

    svg.append("text")
        .attr("x", WIDTH/2)
        .attr("y", HEIGHT/2)
        .attr("text-anchor", "middle")
        .style("font-size", "30px")
        .text("Your draw: " + USER_DRAW.join(", "));
}