var margin = {top: 20, right: 80, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var formatDate = d3.time.format("%Y-%m-%d %H");
var parseDate = formatDate.parse;

var x = d3.time.scale()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var color = d3.scale.category10();

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d) { return x(d.time); })
    .y(function(d) { return y(d.duration); });

var loadData = function() {
d3.json("/api/feed", function(error, feed) {
        d3.json("/api/hungry", function(error, hungry) {
            var twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            $('#rubtime').text(new Date(hungry.result[hungry.result.length - 1].time).toLocaleString());
            $('#feedtime').text(new Date(feed.result[feed.result.length - 1].time).toLocaleString());
            feed = d3.nest().key(function(d) {
                return formatDate(new Date(d.time));
            }).rollup(function(d) {
                return d.length;
            }).entries(feed.result).map(function(d) {
                return {time: parseDate(d.key), duration: d.values};
            }).filter(function(d) {
              return d.time > twoDaysAgo;
            });

            hungry = hungry.result.reduce(function(prev, curr, index, arr) {
                if (0 == prev.length) {
                    if (curr.action == 'rub') {
                        prev.push({time: new Date(curr.time), duration: 0})
                    }
                }
                else {
                    var last = prev[prev.length - 1];
                    if (0 == last.duration) {
                        if (curr.action == 'leave') {
                            prev[prev.length - 1]['duration'] = (new Date(curr.time).getTime() - last.time.getTime()) / 1000 / 60;
                        }
                    }
                    else {
                        if (curr.action == 'rub') {
                            prev.push({time: new Date(curr.time), duration: 0})
                        }
                    }
                }
                return prev;
            }, []);
            hungry = d3.nest().key(function(d) {
                return formatDate(d.time);
            }).rollup(function(g) {
                return d3.sum(g, function(e) {return e.duration});
            }).entries(hungry).map(function(d) {
                return {time: parseDate(d.key), duration: d.values};
            }).filter(function(d) {
              return d.time > twoDaysAgo;
            });
            console.log(hungry);

            var data = [{name: 'feed', values: feed}, {name: 'eat', values: hungry}];
            color.domain(data.map(function(d) { return d.name; }));
    //        x.domain(d3.extent(hungry.concat(feed), function(d) { return d.time; })).nice();
            x.domain(d3.extent(hungry.concat(feed), function(d) { return d.time; })).ticks(d3.time.hour);
            var fillZero = function(array) {
                return x.ticks(d3.time.hour).map(function(h) {
                    return _.find(array, {time: h}) || {time: h, duration: 0};
                })
            };
            data = data.map(function(t) {
                t.values = fillZero(t.values);
                return t;
            });

            y.domain([0, d3.max(data, function(t) { return d3.max(t.values, function(e) { return e.duration; }); })]);

            d3.select("svg").remove();
            var svg = d3.select("#stats").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis);

            svg.append("g")
              .attr("class", "y axis")
              .call(yAxis)
            .append("text")
              .attr("transform", "rotate(-90)")
              .attr("y", 6)
              .attr("dy", ".71em")
              .style("text-anchor", "end")
              .text("Minutes");

            var curve = svg.selectAll(".curve")
              .data(data)
            .enter().append("g")
              .attr("class", "curve");

            curve.append("path").transition()
              .attr("class", "line")
              .attr("d", function(d) { return line(d.values); })
              .style("stroke", function(d) { return color(d.name); });

            curve.append("text")
              .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
              .transition()
              .attr("transform", function(d) { return "translate(" + x(d.value.time) + "," + y(d.value.duration) + ")"; })
              .attr("x", 3)
              .attr("dy", ".35em")
              .text(function(d) { return d.name; });
        });
    });
};

loadData();
