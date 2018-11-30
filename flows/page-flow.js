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
var renderGuy = require('../dom/render-guy');

var accessor = require('accessor')();
const layerShowChance = 40;

function PageFlow({
  seed,
  curve,
  widthToLength = 1.5,
  forkLengthMin = 0.2,
  showDevLayers,
  hideProdLayers = false,
  jointCount = 100,
  randomizeNxNLayerColor,
  randomizeCutPathStyle,
  randomizeLayersToShow = false,
  randomizeCutPointColor,
  randomizeJointSize,
  randomizeNodeLabels,
  randomizeReticulation,
  randomizeJointCount,
  figure = '🐙',
  friendFigure = '🦖'
}) {
  var random = seedrandom(seed);
  var probable = Probable({ random });
  var stepIndex = 0;

  if (randomizeJointCount === 'yes') {
    jointCount = 10 + probable.roll(140);
  }

  var steps = [
    jointStep,
    boneStep,
    nodeStep,
    limbStep,
    enmeatenStep,
    meatPathStep,
    guyStep
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
      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        renderPoints({
          points: page.joints,
          className: 'joint',
          rootSelector: '#joints',
          r: randomizeJointSize === 'yes' ? getJointSize : undefined,
          colorAccessor: getStarColor
        });
      }
    }
  }

  function boneStep() {
    var graph = getNByNGraph({ points: page.joints });
    //console.log(graph);
    if (showDevLayers) {
      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        let colorAccessor;
        if (randomizeNxNLayerColor === 'yes') {
          if (probable.roll(4) === 0) {
            colorAccessor = getNxNColor;
          } else {
            colorAccessor = getNxNColor();
          }
        }

        renderEdges({
          edges: graph,
          className: 'n-by-n-edge',
          rootSelector: '#n-by-n-graph',
          colorAccessor
        });
      }
    }

    page.bones = getMST({ graph, points: page.joints });

    if (showDevLayers) {
      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        renderEdges({
          edges: page.bones,
          className: 'bone',
          rootSelector: '#bones'
        });
      }
    }
  }

  function getRandomPoint() {
    return [probable.roll(1000) / 10, probable.roll(1000) / 10];
  }

  function nodeStep() {
    page.nodes = {};
    page.bones.forEach(updateNodesConnectedToBone);

    if (showDevLayers) {
      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        renderPoints({
          points: Object.values(page.nodes),
          className: 'node',
          rootSelector: '#nodes',
          labelAccessor:
            randomizeNodeLabels === 'yes' ? getRandomLabel : getLinkCount
        });
      }
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
      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        renderEdges({
          edges: flatten(Object.values(page.limbs).map(getLimbEdges)),
          className: 'limb-edge',
          rootSelector: '#limbs',
          colorAccessor: accessor('color')
        });
      }
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
      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        renderPoints({
          points: flatten(pluck(page.cuts, 'points')),
          rootSelector: '#cut-points',
          className: 'cut-point',
          r: 0.7,
          colorAccessor:
            randomizeCutPointColor === 'yes' ? getCutPointColor() : undefined
        });
      }
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
    if (randomizeReticulation === 'yes') {
      if (probable.roll(2) === 0) {
        let d3Curve = probable.pickFromArray([
          'curveBasisClosed',
          'curveCatmullRomClosed',
          'curveStep'
        ]);

        d3Reticulator = shape.line().curve(shape[d3Curve]);
      }
      // else, just use the bezier curve stuff.
    } else if (curve) {
      d3Reticulator = shape.line().curve(shape[curve]);
    }
    page.diagnosticBezierCurves = [];

    page.cuts.forEach(addPathToCut);

    if (showDevLayers) {
      let strokeWidthAccessor;
      let strokeDashArrayAccessor;

      if (randomizeCutPathStyle) {
        strokeWidthAccessor = getCutPathStrokeWidth;
        strokeDashArrayAccessor = getCutPathDashArray;
      }

      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        renderPaths({
          pathContainers: page.cuts,
          rootSelector: '#cut-paths',
          className: 'cut-path',
          colorAccessor: accessor('limbColor'),
          strokeWidthAccessor,
          strokeDashArrayAccessor
        });
      }
    }

    if (!hideProdLayers) {
      let tunnelColor = getTunnelColor();
      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        renderPaths({
          pathContainers: page.cuts,
          rootSelector: '#tunnel-fills',
          className: 'tunnel-fill',
          fillAccessor: tunnelColor
        });
      }
    }

    if (showDevLayers) {
      if (!randomizeLayersToShow || probable.roll(100) <= layerShowChance) {
        renderBezierCurvePoints({
          rootSelector: '#bezier-points',
          curves: flatten(pluck(page.diagnosticBezierCurves, 'curves'))
        });
      }
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

  function guyStep() {
    var homeBone = probable.pickFromArray(page.bones);
    var guyLocation = getLocationOnBone(homeBone);
    renderGuy({
      x: guyLocation[0],
      y: guyLocation[1],
      rotation: probable.roll(360),
      figure,
      rootSelector: '#searcher'
    });

    var friendBone;
    if (page.bones.length > 1) {
      do {
        friendBone = probable.pickFromArray(page.bones);
      } while (friendBone.id !== homeBone.id);
      var friendLocation = getLocationOnBone(friendBone);
      renderGuy({
        x: friendLocation[0],
        y: friendLocation[1],
        rotation: probable.roll(360),
        figure: friendFigure,
        rootSelector: '#lost-friend'
      });
    }
  }

  function getTunnelColor() {
    if (probable.roll(4) === 0) {
      return 'hsla(0, 0%, 0%, 0.8)';
    } else {
      // Avoid yellows.
      return `hsla(${(180 + probable.roll(200)) % 360}, 80%, 50%, 0.2)`;
    }
  }

  function getNxNColor() {
    if (probable.roll(4) === 0) {
      return 'hsl(220, 40%, 50%)';
    } else {
      return `hsl(${probable.roll(360)}, 40%, 50%)`;
    }
  }

  function getCutPathStrokeWidth() {
    return 0.1 * probable.rollDie(10);
  }

  function getCutPathDashArray() {
    return `${0.1 * probable.rollDie(10)} ${0.1 * probable.rollDie(10)}`;
  }

  function getCutPointColor() {
    return `hsl(${probable.roll(360)}, 40%, 30%)`;
  }

  function getJointSize() {
    return (probable.rollDie(5) + probable.rollDie(6)) * 0.1;
  }

  function getStarColor() {
    if (probable.roll(4) === 0) {
      return 'white';
    } else {
      return `hsl(${probable.roll(360)}, 60%, ${40 + probable.roll(20)}%)`;
    }
  }

  function getRandomLabel() {
    if (probable.roll(4) === 0) {
      return String.fromCharCode(97 + probable.roll(11500));
    } else if (probable.roll(4) === 0) {
      return probable.roll(100);
    } else {
      return probable.roll(10);
    }
  }

  function getLocationOnBone(bone) {
    var boneXRange = bone.x2 - bone.y2;
    var boneSlope = (bone.y2 - bone.y1) / boneXRange;
    var xDelta = probable.roll(boneXRange * 1000) / 1000;
    return [bone.y2 + xDelta, bone.y1 + xDelta * boneSlope];
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
