var d3 = require('d3-selection');

function renderBezierCurvePoints({ rootSelector, curves }) {
  var bezierCurveRoot = d3.select(rootSelector);
  var circles = bezierCurveRoot
    .selectAll('.curve-dest')
    .data(curves.map(curve => curve.dest));
  circles
    .enter()
    .append('circle')
    .attr('r', 0.5)
    .classed('curve-dest', true)
    .merge(circles)
    .attr('cx', point => point[0])
    .attr('cy', point => point[1])
    .attr('fill', getBezierPointColor);

  var srcCtrlCircles = bezierCurveRoot
    .selectAll('.curve-src-ctrl')
    .data(
      curves
        .map(curve => curve.srcCtrlPt)
        .concat(curves.map(curve => curve.destCtrlPt))
    );
  srcCtrlCircles
    .enter()
    .append('circle')
    .attr('r', 0.3)
    .classed('curve-src-ctrl', true)
    .merge(srcCtrlCircles)
    .attr('cx', point => point[0])
    .attr('cy', point => point[1])
    .attr('fill', getBezierPointColor);

  var destCtrlCircles = bezierCurveRoot
    .selectAll('.curve-dest-ctrl')
    .data(
      curves
        .map(curve => curve.destCtrlPt)
        .concat(curves.map(curve => curve.destCtrlPt))
    );
  destCtrlCircles
    .enter()
    .append('circle')
    .attr('r', 0.3)
    .classed('curve-dest-ctrl', true)
    .merge(destCtrlCircles)
    .attr('cx', point => point[0])
    .attr('cy', point => point[1])
    .attr('fill', getBezierPointColor);
}

function getBezierPointColor(d, i) {
  return `hsl(${360 * i/10}, 70%, 50%`;
}

module.exports = renderBezierCurvePoints;
