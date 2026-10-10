const SENSORS = new Set(['temperature', 'light', 'humidity']);
const DEVICES = new Set(['FAN', 'LIGHT', 'HEATER', 'AC', 'BUZZER']);
const ACTIONS = new Set(['ON', 'OFF']);
const RANGES = { temperature: [-50, 100], light: [0, 100], humidity: [0, 100] };

function validate(ast) {
  if (!SENSORS.has(ast.sensor)) return { success: false, error: `Unknown sensor '${ast.sensor}'. Supported sensors: temperature, light, humidity.` };
  if (!DEVICES.has(ast.device)) return { success: false, error: `${ast.device} is not a supported device.` };
  if (!ACTIONS.has(ast.action)) return { success: false, error: `${ast.action} is not a valid action. Use ON or OFF.` };
  if (!Number.isFinite(ast.value)) return { success: false, error: 'Condition value must be a valid number.' };
  const [min, max] = RANGES[ast.sensor];
  if (ast.value < min || ast.value > max) return { success: false, error: `${ast.sensor} threshold must be between ${min} and ${max}.` };
  return { success: true };
}

module.exports = { validate };
