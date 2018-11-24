var seedrandom = require('seedrandom');
var Probable = require('probable').createProbable;
var range = require('d3-array').range;
var renderJoints = require('../dom/render-joints');
var renderEdges = require('../dom/render-edges');
var math = require('basic-2d-math');

function PageFlow({ seed }) {
  var random = seedrandom(seed);
  var probable = Probable({ random });
  var stepIndex = 0;

  var steps = [
    jointStep,
    boneStep
  ];

  var page = {
  };

  return pageFlow;

  function pageFlow({ stepMode = 'continuous' }) {
    if (stepMode === 'continuous') {
      steps.slice(stepIndex).forEach(step => step());
      stepIndex = 0;
    } else {
      let step = steps[stepIndex];
      step();
      stepIndex += 1;
      if (stepIndex >= steps.length) {
        stepIndex = 0;
      }
    }
  }

  function jointStep() {
    page.joints = range(100).map(getRandomPoint);
    console.log('page.joints', page.joints);
    renderJoints(page.joints);
  }

  function boneStep() {
    var graph = getNByNGraph({ points: page.joints });
    console.log(graph);
    renderEdges({ edges: graph, className: 'n-by-n-edge', rootSelector: '#n-by-n-graph' });
  }

  function getRandomPoint() {
    return [probable.roll(1000)/10, probable.roll(1000)/10];
  }
}

// Creates edges between every point and every other point in points.
function getNByNGraph({ points }) {
  var graph = [];
  points.map(createEdgesToOtherPoints);
  return graph;

  function createEdgesToOtherPoints(point, i) {
    for (var j = 0; j < points.length; ++j) {
      if (i !== j) {
        graph.push({
          start: i,
          dest: j,
          x1: point[0],
          y1: point[1],
          x2: points[j][0],
          y2: points[j][1],
          dist: math.getVectorMagnitude(point, points[j])
        });
      }
    }
  }
}

module.exports = PageFlow;
