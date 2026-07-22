function createModelDownloadCommand(scriptPath, modelRoot) {
  return {
    executable: 'powershell.exe',
    args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-ModelRoot', modelRoot],
    options: { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
  };
}

module.exports = { createModelDownloadCommand };
