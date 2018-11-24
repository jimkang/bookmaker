var seedrandom = require('seedrandom');
var Probable = require('probable').createProbable;

function PageFlow({ seed }) {
  var random = seedrandom(seed);
  var probable = Probable({ random });
  var stepIndex = 0;

  var steps = [
    jointStep,
    boneStep
  ];

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
    console.log('joint', probable.roll(6));
  }

  function boneStep() {
    console.log('bone', probable.roll(6));
  }
}

module.exports = PageFlow;
