var d3 = require('d3-selection');
var accessor = require('accessor')();

function renderPaths({
  pathContainers,
  className,
  rootSelector,
  pathAccessor = accessor('path'),
  colorAccessor,
  fillAccessor
}) {
  var pathsRoot = d3.select(rootSelector);
  pathsRoot.selectAll('.' + className).remove();
  var pathLines = pathsRoot
    .selectAll('.' + className)
    .data(pathContainers)
    .enter()
    .append('path')
    .classed(className, true)
    .attr('d', pathAccessor);
  if (colorAccessor) {
    pathLines.attr('stroke', colorAccessor);
  }
  if (fillAccessor) {
    pathLines.attr('fill', fillAccessor);
  }
}

module.exports = renderPaths;
