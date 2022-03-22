// choose.js
// Functions for making choice buttons

var choice = null; // global variable indicating user choice

// Returns a slider
function make_slider(x1, y1, y2, onClick) {
    var slider = svg.append("g")
    .attr("class", "slider");

    slider.append("line")
    .attr("x1", x(x1))
    .attr("y1", y(y1))
    .attr("x2", x(x1))
    .attr("y2", y(y2))
    .style("stroke", "#555555")
    .style("stroke-width", "8px");

    var mover = slider.append("rect")
    .attr("x", x(x1 - 1))
    .attr("y", y((y1 + y2) / 2))
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("width", x(2) - x(0))
    .attr("height", -(y(1) - y(0)))
    .style("fill", "black")
    .style("cursor", "pointer")
    .on("click", onClick);

    return slider;
}

// DBSCAN Rings
function dbscan_rings() {
    var centers = new Array(0);

    var rows = 6;
    var cols = 5;
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
            var MinPoints = row;
            var eps = 1.25 - col * 0.25;

            var x0 = -15 + (30 / (rows + 1)) * (row + 1);
            var y0 = -12 + (24 / (cols + 1)) * (col + 1);

            centers.push({x: x0, y: y0, cluster: 0});
        }
    }

    return centers;
}

var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

y.domain([-10, 10]);
var xlim = 10 * width / height;
x.domain([-xlim, xlim]);

var clr = ["white", "red", "blue", "green", "yellow", "black", "purple", "grey", "brown", "orange", "pink"];
function color(i) {
    if(i == 0) {
        return clr[0];
    }
    else {
        return clr[1 + (i - 1) % (clr.length - 1)];
    }
}

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

function dist(w, z) {
    return Math.sqrt(Math.pow(w.x - z.x, 2) + Math.pow(w.y - z.y, 2));
}

function setup() {
    // Initialize the svg
    d3.select("svg").remove();

    svg = d3.select("#svg_area").append("svg")
    .attr("width", "100%")
    .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
    .attr("style", "display: block;")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    d3.select("#svg_area").select("svg")
    .insert("rect", ":first-child")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", "100%")
    .attr("height", "100%")
    .style("fill", "white");

    // Initialize the buttons
    d3.select("#button_area").selectAll("input").remove();

    d3.select("#button_area")
    .append("input")
    .attr("class", "restart_button button button-blue")
    .attr("name", "restart_button")
    .attr("type", "button")
    .attr("value", "Restart")
    .on("click", restart);
}

function draw(data) {
    var points = svg.selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", function(d, i) { return x(30 * Math.cos(i / 5)); })
      .attr("cy", function(d, i) { return y(30 * Math.sin(i / 5)); })
      .style("fill", function(d) { return color(d.cluster); })
      .style("stroke", "black")
      .style("stroke-width", "1px");

    points.transition()
    .duration(500)
    .attr("cx", function(d) { return x(d.x); })
    .attr("cy", function(d) { return y(d.y); });
}

// Functions specific to dbscan

// Returns all points within distance eps of x,
// (including x itself if it is a point).
function region_query(data, x, eps) {
    var res = new Array();
    for(var i = 0; i < data.length; i++) {
        if(dist(data[i], x) < eps) {
            res.push(data[i]);
        }
    }
    return res;
}

// Makes an epsilon ball animation around z
function eps_ball(z, keep) {
    var ball = svg.append("circle")
    .attr("class", "eps_ball")
    .attr("cx", x(z.x))
    .attr("cy", y(z.y))
    .attr("r", 0.0)
    .style("stroke", z.cluster == 0 ? "black" : color(z.cluster)) // no white borders
    .style("stroke-width", 2)
    .style("fill", "none");

    ball.transition()
    .duration(500)
    .attr("r", x(dbscan_state.eps) - x(0));

    if(keep) {
        ball.transition()
        .delay(1000)
        .attr("opacity", 0.5)
        .remove();

        var new_ball = svg.select(".own_region")
        .append("circle")
        .attr("class", "eps_ball")
        .attr("cx", x(z.x))
        .attr("cy", y(z.y))
        .attr("r", x(dbscan_state.eps) - x(0))
        .style("stroke", z.cluster == 0 ? "black" : color(z.cluster))
        .style("stroke-width", 2)
        .style("fill", z.cluster == 0 ? "black" : color(z.cluster))
        .attr("opacity", 0.0)
        .transition()
        .delay(1000)
        .attr("opacity", 1.0);

    }
    else {
        ball.transition()
        .delay(1000)
        .attr("opacity", 0.0)
        .remove();
    }
}

function dbscan_iter(data) {
    // Not expanding a cluster
    if(dbscan_state.neigh.length == 0) {
        var index = dbscan_state.index;
        while(index < data.length && data[index].cluster != 0) {
            index += 1;
        }
        if(index == data.length) {
            dbscan_state.index = index;
            clearInterval(process);  // stop wasteful computation
            process = null;
            dbscan_state.phase = "done";
            d3.select("#next_button").remove()
            d3.select("#eps_select").remove();
            d3.select("#minPoints_select").remove();
            d3.select("#pause").remove();
            return;
        }
        dbscan_state.index = index + 1;
        var z = data[index];

        var neigh = region_query(data, z, dbscan_state.eps);
        if(neigh.length >= dbscan_state.minPoints) {
            dbscan_state.cluster += 1;
            for(var j = 0; j < neigh.length; j++) {
                neigh[j].cluster = dbscan_state.cluster;
                if(neigh[j] != z) {
                    dbscan_state.neigh.push(neigh[j]);
                }
            }
            eps_ball(z, true);
        }
        else {
            eps_ball(z, false);
        }
    }
    // In the middle of expanding a cluster
    else {
        var z = dbscan_state.neigh.shift();

        var neigh = region_query(data, z, dbscan_state.eps);
        if(neigh.length >= dbscan_state.minPoints) {
            for(var j = 0; j < neigh.length; j++) {
                if(neigh[j].cluster != dbscan_state.cluster) {
                    neigh[j].cluster = dbscan_state.cluster;
                    dbscan_state.neigh.push(neigh[j]);
                }
            }
            eps_ball(z, true);
        }
        else {
            eps_ball(z, false);
        }
    }
}

function update_eps(value) {
    dbscan_state.eps = value;
    // change to increase compatibility with EduClust (use 100x100 board)
    d3.select("#eps_value").text("\u03B5 = " + twodecs(dbscan_state.eps * 5));
    if (dbscan_state.phase == "postchoose") {
        draw_eps_balls();
    }
}


function update_minPoints(value) {
    dbscan_state.minPoints = value;
    d3.select("#minPoints_value").text("minPts = " + dbscan_state.minPoints);
    if (dbscan_state.phase == "postchoose") {minPts
        draw_eps_balls();
    }
}

function draw_eps_balls() {

    var centers = dbscan_rings();
    var eps = dbscan_state.eps;
    var minPoints = dbscan_state.minPoints;

    function fill_color(d) {
        if (region_query(data, d, eps).length >= minPoints) {
            return color(1);
        } else {
            return "none";
        }
    }

    var balls = svg.selectAll(".choose_eps_ball");
    if (balls.empty()) {
        balls
        .data(centers)
        .enter()
        .append("circle")
        .attr("class", "choose_eps_ball")
        .attr("cx", function(d) { return x(d.x); })
        .attr("cy", function(d) { return y(d.y); })
        .attr("r", x(eps) - x(0))
        .style("stroke", color(1))
        .style("stroke-width", 2)
        .style("opacity", 0.5)
        .style("fill", fill_color);
    } else {
        balls.attr("r", x(eps) - x(0))
        .style("fill", fill_color);
    }
}

// Some global variables
var svg;
var data;
var dbscan_state;
var algo_delay;
var process = null; // For setInterval

function twodecs(x) {
    return parseFloat(Math.round(x*100)/100).toFixed(2);
}

function go() {
    dbscan_state.phase = "inprogress";
    d3.selectAll(".choose_eps_ball").remove()
    //d3.select("#eps_select").remove();
    //d3.select("#minPoints_select").remove();
    
    d3.select("#next_button").remove();

    process = setInterval(function() {
        dbscan_iter(data);
        svg.selectAll(".dot")
        .transition()
        .style("fill", function(d) { return color(d.cluster); });
    }, algo_delay);

    d3.select("#button_area").append("input")
    .attr("id", "pause")
    .attr("class", "button button-blue")
    .attr("name", "pause_button")
    .attr("type", "button")
    .attr("value", "Pause")
    .on("click", function() {
        d3.select("#pause").remove();

        clearInterval(process);

        d3.select("#button_area").append("input")
        .attr("id", "next_button")
        .attr("class", "button button-blue")
        .attr("name", "updateButton")
        .attr("type", "button")
        .attr("value", "  GO!  ")
        .on("click", go);
    });
}

function restart() {
    /* Reset global variables */
    data = JSON.parse(localStorage.getItem('points')).map(pt => ({x: pt[0] / 5 - 10, y: pt[1] / 5 - 10, cluster: 0}));

    dbscan_state = {eps: 1.0, minPoints: 4, cluster: 0, index: 0, neigh: [], phase: "postchoose"};
    algo_delay = 100;
    clearInterval(process);
    process = null;

    setup();

    svg.append("g")
    .attr("class", "own_region")
    .attr("opacity", 0.5);

    draw(data);

    svg.append("text")
    .attr("id", "eps_value")
    .attr("x", x(-20))
    .attr("y", y(-9.5))
    .text("\u03B5 = " + twodecs(dbscan_state.eps * 5));

    svg.append("text")
    .attr("id", "minPoints_value")
    .attr("x", x(-20))
    .attr("y", y(-10.5))
    .text("minPts = " + dbscan_state.minPoints);

    d3.select("#button_area").append("input")
    .attr("id", "eps_select")
    .attr("name", "eps_select")
    .attr("type", "range")
    .attr("min", 0)  // lots of decimals to prevent ties in initial animation... :-(
    .attr("max", 2.002)
    .attr("step", 0.002)
    .attr("value", dbscan_state.eps)
    .style("width", "20%")
    .attr("onchange", "update_eps(parseFloat(this.value));")
    .attr("oninput", "update_eps(parseFloat(this.value));");

    d3.select("#button_area").append("input")
    .attr("id", "minPoints_select")
    .attr("name", "minPoints_select")
    .attr("type", "range")
    .attr("min", 1)
    .attr("max", 10)
    .attr("step", 1)
    .attr("value", dbscan_state.minPoints)
    .style("width", "20%")
    .attr("onchange", "update_minPoints(parseInt(this.value));")
    .attr("oninput", "update_minPoints(parseInt(this.value));");

    d3.select("#button_area").append("input")
    .attr("class", "button button-blue")
    .attr("id", "next_button")
    .attr("name", "updateButton")
    .attr("type", "button")
    .attr("value", "  GO!  ")
    .on("click", go);

    setTimeout(draw_eps_balls, 500);
}
