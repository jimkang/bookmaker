var listenersInit = false;

var stepButton = document.getElementById('step-button');
var clearSeedButton = document.getElementById('clear-seed-button');

function wireControls({ pageFlow, clearSeed, hideUI }) {
  if (listenersInit) {
    return;
  }
  listenersInit = true;

  stepButton.addEventListener('click', runFlow);
  clearSeedButton.addEventListener('click', clearSeed);

  if (hideUI) {
    stepButton.classList.add('hidden');
    clearSeedButton.classList.add('hidden');
  }

  function runFlow() {
    pageFlow({ stepMode: 'stepwise' });
  }
}

module.exports = wireControls;
