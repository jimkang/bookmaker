var handleError = require('handle-error-web');
var wireControls = require('./dom/wire-controls');
var PageFlow = require('./flows/page-flow');
var RouteState = require('route-state');

var routeState = RouteState({
  followRoute,
  windowObject: window
});

(function go() {
  window.onerror = reportTopLevelError;
  routeState.routeFromHash();
})();

function followRoute({ stepMode, seed }) {
  if (!seed) {
    seed = (new Date()).toISOString();
    routeState.addToRoute({ seed });
    return;
  }

  var pageFlow = PageFlow({ seed });
  wireControls({ pageFlow, clearSeed });
  pageFlow({ stepMode });
}

function clearSeed() {
  routeState.addToRoute({ seed: '' });
}

function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}

