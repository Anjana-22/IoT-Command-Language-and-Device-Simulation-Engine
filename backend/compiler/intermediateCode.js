function toIR(ast) {
  return {
    type: 'CONDITIONAL', sensor: ast.sensor, operator: ast.operator,
    value: ast.value, device: ast.device, action: ast.action
  };
}

module.exports = { toIR };
