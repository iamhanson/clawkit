const test = require('node:test');
const assert = require('node:assert/strict');

const { chooseConfigPathForDeploy } = require('../package/clawkittool/bin/clawkittool');

test('chooseConfigPathForDeploy prefers explicit config path without prompting', async () => {
  let confirmCalled = false;
  let inputCalled = false;

  const result = await chooseConfigPathForDeploy({
    explicitConfigPath: '/tmp/explicit/openclaw.json',
    detectedConfigPath: '/tmp/detected/openclaw.json',
    confirmUseDetected: async () => {
      confirmCalled = true;
      return true;
    },
    promptForConfigPath: async () => {
      inputCalled = true;
      return '/tmp/manual/openclaw.json';
    },
  });

  assert.equal(result, '/tmp/explicit/openclaw.json');
  assert.equal(confirmCalled, false);
  assert.equal(inputCalled, false);
});

test('chooseConfigPathForDeploy uses detected config path when user confirms', async () => {
  let inputCalled = false;

  const result = await chooseConfigPathForDeploy({
    explicitConfigPath: null,
    detectedConfigPath: '/tmp/detected/openclaw.json',
    confirmUseDetected: async () => true,
    promptForConfigPath: async () => {
      inputCalled = true;
      return '/tmp/manual/openclaw.json';
    },
  });

  assert.equal(result, '/tmp/detected/openclaw.json');
  assert.equal(inputCalled, false);
});

test('chooseConfigPathForDeploy asks for manual path when detected config is declined', async () => {
  const result = await chooseConfigPathForDeploy({
    explicitConfigPath: null,
    detectedConfigPath: '/tmp/detected/openclaw.json',
    confirmUseDetected: async () => false,
    promptForConfigPath: async () => '/tmp/manual/openclaw.json',
  });

  assert.equal(result, '/tmp/manual/openclaw.json');
});

test('chooseConfigPathForDeploy skips deploy when manual path prompt is left empty', async () => {
  const result = await chooseConfigPathForDeploy({
    explicitConfigPath: null,
    detectedConfigPath: '/tmp/detected/openclaw.json',
    confirmUseDetected: async () => false,
    promptForConfigPath: async () => '   ',
  });

  assert.equal(result, null);
});
