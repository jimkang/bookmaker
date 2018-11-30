var seedrandom = require('seedrandom');
var Probable = require('probable').createProbable;
var range = require('d3-array').range;
var renderPoints = require('../dom/render-points');
var renderEdges = require('../dom/render-edges');
var math = require('basic-2d-math');
var jsgraphs = require('js-graph-algorithms');
var Enmeaten = require('enmeaten');
var pluck = require('lodash.pluck');
var flatten = require('lodash.flatten');
var shape = require('d3-shape');
var renderPaths = require('../dom/render-paths');
var curvesFromExtremes = require('../dom/curves-from-extremes');
var zoom = require('d3-zoom');
var curveToPathString = require('../dom/curve-to-path-string');
var renderBezierCurvePoints = require('../dom/render-bezier-curve-points');

var accessor = require('accessor')();

function PageFlow({
  seed,
  curve,
  widthToLength = 1.5,
  forkLengthMin = 0.2,
  showDevLayers,
  hideProdLayers = false,
  jointCount = 100
}) {
  var random = seedrandom(seed);
  var probable = Probable({ random });
  var stepIndex = 0;

  var steps = [
    jointStep,
    boneStep,
    nodeStep,
    limbStep,
    enmeatenStep,
    meatPathStep
  ];

  var page = {};

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
    page.joints = range(jointCount).map(getRandomPoint);
    //console.log('page.joints', page.joints);
    if (showDevLayers) {
      renderPoints({
        points: page.joints,
        className: 'joint',
        rootSelector: '#joints'
      });
    }
  }

  function boneStep() {
    var graph = getNByNGraph({ points: page.joints });
    //console.log(graph);
    if (showDevLayers) {
      renderEdges({
        edges: graph,
        className: 'n-by-n-edge',
        rootSelector: '#n-by-n-graph'
      });
    }

    page.bones = getMST({ graph, points: page.joints });

    if (showDevLayers) {
      renderEdges({
        edges: page.bones,
        className: 'bone',
        rootSelector: '#bones'
      });
    }
  }

  function getRandomPoint() {
    return [probable.roll(1000) / 10, probable.roll(1000) / 10];
  }

  function nodeStep() {
    page.nodes = {};
    page.bones.forEach(updateNodesConnectedToBone);

    if (showDevLayers) {
      renderPoints({
        points: Object.values(page.nodes),
        className: 'node',
        rootSelector: '#nodes',
        labelAccessor: getLinkCount
      });
    }

    function updateNodesConnectedToBone(bone) {
      updateNode(bone.start, bone.dest);
      updateNode(bone.dest, bone.start);
    }

    function updateNode(jointIndex, destJointIndex) {
      var nodeId = getNodeIdForJointIndex(jointIndex);
      var node = page.nodes[nodeId];
      if (!node) {
        let joint = page.joints[jointIndex];
        node = {
          id: nodeId,
          links: [],
          bones: [],
          0: joint[0],
          1: joint[1]
        };
        page.nodes[nodeId] = node;
      }
      var linkedNodeId = getNodeIdForJointIndex(destJointIndex);
      if (node.links.indexOf(linkedNodeId) === -1) {
        node.links.push(linkedNodeId);
      }
    }
  }

  function getNodeIdForJointIndex(index) {
    return page.joints[index].join('_');
  }

  function limbStep() {
    var junctionNodes = Object.values(page.nodes).filter(nodeIsAJunction);
    page.limbs = {};
    if (junctionNodes.length < 1) {
      junctionNodes.push(Object.values(page.nodes)[0]);
    }

    junctionNodes.forEach(followLinksToFillLimbs);

    if (showDevLayers) {
      renderEdges({
        edges: flatten(Object.values(page.limbs).map(getLimbEdges)),
        className: 'limb-edge',
        rootSelector: '#limbs',
        colorAccessor: accessor('color')
      });
    }

    function followLinksToFillLimbs(junctionNode) {
      // You can't use curry to init followLinkToFillLimb here for us in map.
      // . e.g.
      // var limbs = junctionNode.links
      //  .map(curry(followLinkToFillLimb)([ junctionNode ]))
      // It will use the same array ([ junctionNode ]) for every call to
      // followLinkToFillLimb, making it append to arrays that start with
      // a lot of elements in 2nd, 3rd, etc. calls!
      var limbs = [];
      for (var i = 0; i < junctionNode.links.length; ++i) {
        limbs.push(
          wrapInLimbObject(
            followLinkToFillLimb([junctionNode], junctionNode.links[i])
          )
        );
      }
      limbs.forEach(addToPageLimbs);

      function followLinkToFillLimb(limbNodes, destNodeId) {
        var destNode = page.nodes[destNodeId];
        limbNodes.push(destNode);

        if (destNode.links.length === 2) {
          let nodeWeCameFromId = limbNodes[limbNodes.length - 1].id;
          if (limbNodes.length > 1) {
            nodeWeCameFromId = limbNodes[limbNodes.length - 2].id;
          }
          let otherNodeId = otherNodeIdFromLink(destNode, nodeWeCameFromId);
          if (pluck(limbNodes, 'id').indexOf(otherNodeId) === -1) {
            return followLinkToFillLimb(limbNodes, otherNodeId);
          }
        }
        return limbNodes;
      }
    }
  }

  function wrapInLimbObject(limbNodes) {
    return {
      id: [limbNodes[0].id, limbNodes[limbNodes.length - 1].id]
        .sort()
        .join('__'),
      nodes: limbNodes,
      color: `hsl(${probable.roll(360)}, 70%, 50%)`
    };
  }

  function addToPageLimbs(limb) {
    page.limbs[limb.id] = limb;
  }

  function enmeatenStep() {
    var enmeaten = Enmeaten({ random, numberOfDecimalsToConsider: 3 });
    page.cuts = Object.values(page.limbs).map(makeCut);

    if (showDevLayers) {
      renderPoints({
        points: flatten(pluck(page.cuts, 'points')),
        rootSelector: '#cut-points',
        className: 'cut-point',
        r: 0.7
      });
    }

    // These are cuts as in "cuts of meat".
    function makeCut(limb) {
      const maxBoneLength = getMaxBoneLengthInNodes(limb.nodes);
      var forkLengthMax = maxBoneLength * widthToLength;
      if (forkLengthMax < forkLengthMin) {
        forkLengthMax = forkLengthMin;
      }
      var points = enmeaten({
        bone: limb.nodes.map(getPointFromNode),
        forkLengthRange: [forkLengthMin, forkLengthMax],
        //extraRoundness: true,
        widthInterpolator: clampWidth,
        symmetricalEnds: true,
        endAngleRange: [45, 60]
      });

      return {
        id: 'cut__' + limb.id,
        limbColor: limb.color,
        points
      };
    }
  }

  function meatPathStep() {
    var d3Reticulator;
    if (curve) {
      d3Reticulator = shape.line().curve(shape[curve]);
    }
    page.diagnosticBezierCurves = [];

    page.cuts.forEach(addPathToCut);

    if (showDevLayers) {
      renderPaths({
        pathContainers: page.cuts,
        rootSelector: '#cut-paths',
        className: 'cut-path',
        colorAccessor: accessor('limbColor')
      });
    }

    if (!hideProdLayers) {
      renderPaths({
        pathContainers: page.cuts,
        rootSelector: '#tunnel-fills',
        className: 'tunnel-fill',
        fillAccessor: 'hsl(20, 40%, 20%)' // 'url(#GradientReflect)'
      });
    }

    if (showDevLayers) {
      renderBezierCurvePoints({
        rootSelector: '#bezier-points',
        curves: flatten(pluck(page.diagnosticBezierCurves, 'curves'))
      });
    }

    function addPathToCut(cut) {
      if (d3Reticulator) {
        cut.path = d3Reticulator(cut.points);
      } else {
        let bezierCurves = curvesFromExtremes(zoom.zoomIdentity, cut.points);
        console.log('bezierCurves', bezierCurves);
        cut.path = `M ${bezierCurves.start.x},${bezierCurves.start.y}`;
        cut.path += bezierCurves.curves.map(curveToPathString).join('\n');
        page.diagnosticBezierCurves = page.diagnosticBezierCurves.concat(
          bezierCurves
        );
      }
    }
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
          dist: math.getVectorMagnitude(math.subtractPairs(point, points[j]))
        });
      }
    }
  }
}

function getMST({ graph, points }) {
  var g = new jsgraphs.WeightedGraph(points.length);
  graph.forEach(addEdgeToJSGraph);
  var finder = new jsgraphs.EagerPrimMST(g);
  return finder.mst.map(createEdgeObject);

  function addEdgeToJSGraph(edge) {
    g.addEdge(new jsgraphs.Edge(edge.start, edge.dest, edge.dist));
  }

  function createEdgeObject(jsGraphEdge) {
    var start = jsGraphEdge.from();
    var dest = jsGraphEdge.to();
    return {
      start,
      dest,
      x1: points[start][0],
      y1: points[start][1],
      x2: points[dest][0],
      y2: points[dest][1]
    };
  }
}

function getLinkCount(node) {
  return node.links.length;
}

function nodeIsAJunction(node) {
  return node.links.length > 2;
}

function otherNodeIdFromLink(node, unwantedNodeId) {
  if (node.links.length !== 2) {
    throw new Error(
      `otherNodeIdFromLink passed node with ${
        node.links.length
      } links; only works if there are two.`
    );
  }
  return node.links[0] === unwantedNodeId ? node.links[1] : node.links[0];
}

function getLimbEdges(limb) {
  var edges = [];
  for (var i = 0; i < limb.nodes.length - 1; ++i) {
    edges.push({
      x1: limb.nodes[i][0],
      y1: limb.nodes[i][1],
      x2: limb.nodes[i + 1][0],
      y2: limb.nodes[i + 1][1],
      color: limb.color
    });
  }
  return edges;
}

function getPointFromNode(node) {
  return [node[0], node[1]];
}

function getMaxBoneLengthInNodes(nodes) {
  var maxLength = 0;
  for (var i = 0; i < nodes.length - 1; ++i) {
    let length = math.getVectorMagnitude(
      math.subtractPairs(nodes[i + 1], nodes[i])
    );
    if (length > maxLength) {
      maxLength = length;
    }
  }
  return maxLength;
}

// If width is really close to endToEndDistance, it will cut it down a lot.
// If it's really far, then it won't affect it much.
function clampWidth({ width, endToEndDistance }) {
  return Math.max(width * (1.0 - width / endToEndDistance) * 0.6, 0);
}

module.exports = PageFlow;
