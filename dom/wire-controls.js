var listenersInit = false;

var stepButton = document.getElementById('step-button');
var clearSeedButton = document.getElementById('clear-seed-button');

function wireControls({ pageFlow, clearSeed }) {
  if (listenersInit) {
    return;
  }
  listenersInit = true;

  stepButton.addEventListener('click', runFlow);
  clearSeedButton.addEventListener('click', clearSeed);

  function runFlow() {
    pageFlow({ stepMode: 'stepwise' });
  }
}

module.exports = wireControls;
