var seedrandom = require('seedrandom');
var Probable = require('probable').createProbable;
var range = require('d3-array').range;
var renderJoints = require('../dom/render-joints');

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
    console.log('bone', probable.roll(6));
  }

  function getRandomPoint() {
    return [probable.roll(1000)/10, probable.roll(1000)/10];
  }
}

module.exports = PageFlow;
