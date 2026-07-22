const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('Windows build emits installer and portable artifacts without bundling the large model', () => {
  assert.equal(pkg.devDependencies['electron-builder'], '26.15.3');
  assert.match(pkg.scripts['dist:win'], /electron-builder/);
  const targets = pkg.build.win.target.map((item) => item.target);
  assert.deepEqual(targets, ['nsis', 'portable']);
  assert.equal(pkg.build.nsis.oneClick, false);
  assert.equal(pkg.build.nsis.allowToChangeInstallationDirectory, true);
  assert.match(pkg.build.nsis.artifactName, /Setup/);
  assert.match(pkg.build.portable.artifactName, /Portable/);
  assert.notEqual(pkg.build.nsis.artifactName, pkg.build.portable.artifactName);
  assert.ok(pkg.build.files.includes('!models/**/*'));
});
