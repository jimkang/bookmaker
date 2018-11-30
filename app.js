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

function followRoute({
  stepMode,
  seed,
  curve,
  widthToLength,
  forkLengthMin,
  showDevLayers,
  hideProdLayers,
  jointCount,
  randomizeNxNLayerColor,
  randomizeCutPathStyle,
  randomizeLayersToShow
}) {
  if (!seed) {
    seed = new Date().toISOString();
    routeState.addToRoute({ seed });
    return;
  }

  var pageFlow = PageFlow({
    seed,
    curve,
    widthToLength: numberizeIfThere(widthToLength),
    forkLengthMin: numberizeIfThere(forkLengthMin),
    showDevLayers,
    hideProdLayers,
    jointCount,
    randomizeNxNLayerColor,
    randomizeCutPathStyle,
    randomizeLayersToShow: randomizeLayersToShow === 'yes'
  });
  wireControls({ pageFlow, clearSeed });
  pageFlow({ stepMode });
}

function clearSeed() {
  routeState.addToRoute({ seed: '' });
}

function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}

function numberizeIfThere(v) {
  return isNaN(v) ? undefined : +v;
}
