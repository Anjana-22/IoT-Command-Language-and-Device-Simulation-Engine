const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeCommand, analyzeProgram } = require('../compiler');

const commands = [
  'IF temperature > 30 THEN FAN ON',
  'IF light < 20 THEN LIGHT ON',
  'IF humidity > 70 THEN FAN OFF'
];

test('all supported commands parse, validate, and produce role-correct tokens and IR', () => {
  const results = analyzeProgram(commands.join('\n'));

  assert.equal(results.length, 3);
  for (const result of results) {
    assert.equal(result.parseResult, true, result.error?.message);
    assert.equal(result.semanticResult, true, result.error?.message);
    assert.equal(result.success, true);
    assert.equal(result.stages.ir, 'complete');
    assert.ok(result.intermediateRepresentation);
  }
  assert.deepEqual(results.map((result) => result.intermediateRepresentation), [
    { type: 'CONDITIONAL', sensor: 'temperature', operator: '>', value: 30, device: 'FAN', action: 'ON' },
    { type: 'CONDITIONAL', sensor: 'light', operator: '<', value: 20, device: 'LIGHT', action: 'ON' },
    { type: 'CONDITIONAL', sensor: 'humidity', operator: '>', value: 70, device: 'FAN', action: 'OFF' }
  ]);
  assert.equal(results[1].tokens[1].type, 'SENSOR');
  assert.equal(results[1].tokens[5].type, 'DEVICE');
});

test('invalid syntax is rejected without executable IR', () => {
  const result = analyzeCommand('IF light < 20 LIGHT ON');
  assert.equal(result.parseResult, false);
  assert.match(result.error.message, /THEN/);
  assert.equal(result.intermediateRepresentation, undefined);
  assert.equal(result.success, false);
});

test('unknown sensors, devices, and actions fail semantic validation without IR', () => {
  const cases = [
    ['IF pressure > 30 THEN FAN ON', /Unknown sensor 'pressure'/],
    ['IF light < 20 THEN PUMP ON', /PUMP is not a supported device/],
    ['IF light < 20 THEN LIGHT BLINK', /BLINK is not a valid action/]
  ];
  for (const [command, expectedError] of cases) {
    const result = analyzeCommand(command);
    assert.equal(result.parseResult, true, result.error?.message);
    assert.equal(result.semanticResult, false);
    assert.match(result.error.message, expectedError);
    assert.equal(result.intermediateRepresentation, undefined);
    assert.equal(result.success, false);
  }
});

test('false conditions do not execute the command action', () => {
  const result = analyzeCommand('IF light < 20 THEN LIGHT ON');
  assert.equal(result.success, true);
  const { evaluate } = require('../compiler/executionEngine');
  const execution = evaluate(result.intermediateRepresentation, { light: 25 });
  assert.equal(execution.conditionMet, false);
  assert.equal(execution.action, 'Not executed');
  assert.equal(execution.status, 'Condition not met');
});
