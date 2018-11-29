// TODO: You actually need to consider three points
// when setting the control points. The line between the
// control points should be parallel to the line between
// the point before and point after.
function curvesFromExtremes(transform, extremes) {
  var curves = [];
  var transformedStart = {
    x: transform.applyX(extremes[extremes.length - 1][0]),
    y: transform.applyY(extremes[extremes.length - 1][1])
  };
  for (var i = 0; i < extremes.length; ++i) {
    let prevIndex = i - 1;
    if (prevIndex < 0) {
      prevIndex = extremes.length - 1;
    }
    let dest = [
      transform.applyX(extremes[i][0]),
      transform.applyY(extremes[i][1])
    ];
    let src = [
      transform.applyX(extremes[prevIndex][0]),
      transform.applyY(extremes[prevIndex][1])
    ];

    const distToPrev = dest[0] - src[0];
    let srcCtrlX = src[0] + distToPrev / 2;
    let srcCtrlY = src[1];
    let destCtrlX = dest[0] - distToPrev / 2;
    let destCtrlY = dest[1];

    curves.push({
      srcCtrlPt: [srcCtrlX, srcCtrlY],
      destCtrlPt: [destCtrlX, destCtrlY],
      dest
    });
  }
  return { start: transformedStart, curves };
}

module.exports = curvesFromExtremes;
