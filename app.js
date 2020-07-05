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
  window.Typekit.load();
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
  randomizeLayersToShow,
  randomizeCutPointColor,
  randomizeJointSize,
  randomizeNodeLabels,
  randomizeReticulation,
  hideUI,
  figure,
  friendFigure,
  randomizeJointCount,
  firstPage,
  lastPage,
  stepLimit
}) {
  if (!seed) {
    seed = new Date().toISOString();
    routeState.addToRoute({ seed });
    return;
  }
  lastPage = lastPage === 'yes';
  firstPage = firstPage === 'yes';

  var pageFlow = PageFlow({
    seed,
    curve,
    widthToLength: numberizeIfThere(widthToLength),
    forkLengthMin: numberizeIfThere(forkLengthMin),
    showDevLayers: !lastPage && !firstPage && showDevLayers,
    hideProdLayers: lastPage || firstPage || hideProdLayers,
    jointCount,
    randomizeNxNLayerColor,
    randomizeCutPathStyle,
    randomizeLayersToShow: randomizeLayersToShow === 'yes',
    randomizeCutPointColor,
    randomizeJointSize,
    randomizeNodeLabels,
    randomizeReticulation,
    figure,
    friendFigure,
    randomizeJointCount,
    firstPage,
    lastPage,
    stepLimit
  });
  wireControls({ pageFlow, clearSeed, hideUI: hideUI === 'yes' });
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
