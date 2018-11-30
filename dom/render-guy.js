var d3 = require('d3-selection');

function renderGuy({ x, y, rotation, rootSelector, figure, hidden = false }) {
  var guy = d3.select(rootSelector);
  var figureText = guy.select('.figure');
  figureText.text(figure);

  figureText.attr('transform', `rotate(${rotation})`);
  guy.attr('transform', `translate(${x}, ${y})`);
  guy.classed('hidden', hidden);
}

module.exports = renderGuy;
