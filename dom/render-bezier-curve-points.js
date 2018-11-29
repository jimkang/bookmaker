var d3 = require('d3-selection');

function renderBezierCurvePoints({ rootSelector, curves }) {
  var bezierCurveRoot = d3.select(rootSelector);
  var circles = bezierCurveRoot
    .selectAll('.curve-dest')
    .data(curves.map(curve => curve.dest));
  circles
    .enter()
    .append('circle')
    .attr('r', 0.2)
    .classed('curve-dest', true)
    .merge(circles)
    .attr('cx', point => point[0])
    .attr('cy', point => point[1]);

  var controlCircles = bezierCurveRoot
    .selectAll('.curve-control')
    .data(
      curves
        .map(curve => curve.srcCtrlPt)
        .concat(curves.map(curve => curve.destCtrlPt))
    );
  controlCircles
    .enter()
    .append('circle')
    .attr('r', 0.1)
    .classed('curve-control', true)
    .merge(controlCircles)
    .attr('cx', point => point[0])
    .attr('cy', point => point[1]);
}

module.exports = renderBezierCurvePoints;
