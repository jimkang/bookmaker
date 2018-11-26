var d3 = require('d3-selection');
var accessor = require('accessor')();

function renderEdges({ edges, className, rootSelector, colorAccessor }) {
  var edgesRoot = d3.select(rootSelector);
  edgesRoot.selectAll('.' + className).remove();
  var edgeLines = edgesRoot
    .selectAll('.' + className)
    .data(edges)
    .enter()
    .append('line')
    .classed(className, true)
    .attr('x1', accessor('x1'))
    .attr('y1', accessor('y1'))
    .attr('x2', accessor('x2'))
    .attr('y2', accessor('y2'));
  if (colorAccessor) {
    edgeLines.attr('stroke', colorAccessor);
  }
}

module.exports = renderEdges;
