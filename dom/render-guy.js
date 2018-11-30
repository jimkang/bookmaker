var d3 = require('d3-selection');

function renderGuy({
  x,
  y,
  rotation,
  rootSelector,
  figure,
  hidden = false,
  className
}) {
  var guy = d3.select(rootSelector);
  guy.attr('class', className);

  var figureText = guy.select('.figure');
  figureText.text(figure);

  figureText.attr('transform', `rotate(${rotation})`);
  guy.attr('transform', `translate(${x}, ${y})`);
  guy.classed('hidden', hidden);
}

module.exports = renderGuy;
