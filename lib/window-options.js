function windowSizeFor(workArea) {
  return {
    width: Math.max(980, Math.min(1180, workArea.width - 40)),
    height: Math.max(640, Math.min(780, workArea.height - 40))
  };
}

module.exports = { windowSizeFor };
