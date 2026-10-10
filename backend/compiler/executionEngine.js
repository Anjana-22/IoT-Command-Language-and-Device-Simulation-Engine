function evaluate(ir, sensors) {
  const sensorValue = Number(sensors[ir.sensor]);
  const operations = {
    '>': () => sensorValue > ir.value, '<': () => sensorValue < ir.value,
    '>=': () => sensorValue >= ir.value, '<=': () => sensorValue <= ir.value,
    '==': () => sensorValue === ir.value
  };
  const conditionMet = operations[ir.operator]();
  return {
    condition: `${ir.sensor} ${ir.operator} ${ir.value}`,
    sensorValue, conditionMet,
    action: conditionMet ? `${ir.device} ${ir.action}` : 'Not executed',
    device: ir.device,
    status: conditionMet ? 'Executed Successfully' : 'Condition not met'
  };
}

module.exports = { evaluate };
