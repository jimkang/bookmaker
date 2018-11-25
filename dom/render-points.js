var d3 = require('d3-selection');

function renderPoints({
  points,
  className,
  rootSelector,
  xProperty = '0',
  yProperty = '1',
  labelAccessor
}) {
  const pointSelector = '.' + className;
  var pointsRoot = d3.select(rootSelector);
  pointsRoot.selectAll(pointSelector).remove();
  var pointStems = pointsRoot
    .selectAll(pointSelector)
    .data(points)
    .enter()
    .append('g')
    .classed(className, true)
    .attr('transform', getTransform);

  pointStems
    .append('circle')
    .attr('r', 1)
    .attr('cx', 0)
    .attr('cy', 0);

  if (labelAccessor) {
    pointStems
      .append('text')
      .attr('dx', -0.5)
      .attr('dy', -1)
      .text(labelAccessor);
  }

  function getTransform(point) {
    return `translate(${point[xProperty]}, ${point[yProperty]})`;
  }
}

module.exports = renderPoints;
