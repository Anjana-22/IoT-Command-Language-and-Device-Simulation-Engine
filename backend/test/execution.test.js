const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

test('execute endpoint turns the virtual light on and records matching history', async (t) => {
  const server = createApp().listen(0);
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const sensorResponse = await fetch(`${base}/api/sensors`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ light: 10 })
  });
  assert.equal(sensorResponse.status, 200);

  const response = await fetch(`${base}/api/execute`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command: 'IF light < 20 THEN LIGHT ON' })
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.results[0].parseResult, true);
  assert.equal(payload.results[0].semanticResult, true);
  assert.deepEqual(payload.results[0].intermediateRepresentation, {
    type: 'CONDITIONAL', sensor: 'light', operator: '<', value: 20, device: 'LIGHT', action: 'ON'
  });
  assert.equal(payload.results[0].executionResult.conditionMet, true);
  assert.equal(payload.results[0].executionResult.action, 'LIGHT ON');
  assert.equal(payload.devices.find((device) => device.deviceName === 'LIGHT').state, 'ON');
  assert.equal(payload.executions[0].action, 'LIGHT ON');

  const historyResponse = await fetch(`${base}/api/history`);
  const history = await historyResponse.json();
  assert.equal(history.history[0].conditionMet, true);
  assert.equal(history.history[0].action, 'LIGHT ON');
});
