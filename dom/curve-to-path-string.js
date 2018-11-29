function curveToPathString(curve) {
  return `C ${curve.srcCtrlPt.join(',')}
  ${curve.destCtrlPt.join(',')}
  ${curve.dest.join(',')}`;
}

module.exports = curveToPathString;
