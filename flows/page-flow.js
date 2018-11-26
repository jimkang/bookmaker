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
var accessor = require('accessor')();

function PageFlow({ seed }) {
  var random = seedrandom(seed);
  var probable = Probable({ random });
  var stepIndex = 0;

  var steps = [jointStep, boneStep, nodeStep, limbStep, enmeatenStep];

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
    page.joints = range(100).map(getRandomPoint);
    //console.log('page.joints', page.joints);
    renderPoints({
      points: page.joints,
      className: 'joint',
      rootSelector: '#joints'
    });
  }

  function boneStep() {
    var graph = getNByNGraph({ points: page.joints });
    //console.log(graph);
    renderEdges({
      edges: graph,
      className: 'n-by-n-edge',
      rootSelector: '#n-by-n-graph'
    });
    page.bones = getMST({ graph, points: page.joints });
    renderEdges({
      edges: page.bones,
      className: 'bone',
      rootSelector: '#bones'
    });
  }

  function getRandomPoint() {
    return [probable.roll(1000) / 10, probable.roll(1000) / 10];
  }

  function nodeStep() {
    page.nodes = {};
    page.bones.forEach(updateNodesConnectedToBone);
    renderPoints({
      points: Object.values(page.nodes),
      className: 'node',
      rootSelector: '#nodes',
      labelAccessor: getLinkCount
    });

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
    junctionNodes.forEach(followLinksToFillLimbs);
    console.log('page.limbs', page.limbs);

    renderEdges({
      edges: flatten(Object.values(page.limbs).map(getLimbEdges)),
      className: 'limb-edge',
      rootSelector: '#limbs',
      colorAccessor: accessor('color')
    });

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
      color: `hsl(${probable.roll(360)}, 70%, 30%)`
    };
  }

  function addToPageLimbs(limb) {
    page.limbs[limb.id] = limb;
  }

  function enmeatenStep() {
    var enmeaten = Enmeaten({ random });
    //var meatPoints = enmeaten({
    //});
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

module.exports = PageFlow;
