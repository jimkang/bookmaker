var listenersInit = false;

var stepButton = document.getElementById('step-button');

function wireControls({ pageFlow }) {
  if (listenersInit) {
    return;
  }
  listenersInit = true;

  stepButton.addEventListener('click', runFlow);

  function runFlow() {
    pageFlow({ stepMode: 'stepwise' });
  }
}

module.exports = wireControls;
