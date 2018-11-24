var d3 = require('d3-selection');
var accessor = require('accessor')();

var jointsRoot = d3.select('#joints');

function renderJoints(joints) {
  jointsRoot.selectAll('circle').remove();
  jointsRoot
    .selectAll('circle')
    .data(joints)
    .enter()
    .append('circle')
    .attr('r', 1)
    .attr('cx', accessor('0'))
    .attr('cy', accessor('1'));
}

module.exports = renderJoints;
