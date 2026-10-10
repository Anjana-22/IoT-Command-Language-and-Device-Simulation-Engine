const SENSORS = new Set(['temperature', 'light', 'humidity']);
const DEVICES = new Set(['FAN', 'LIGHT', 'HEATER', 'AC', 'BUZZER']);
const STATES = new Set(['ON', 'OFF']);

/** Turn one source line into typed tokens. Unknown words stay identifiers so
 * the semantic pass can report a useful “unsupported sensor/device” error. */
function tokenize(source) {
  const tokens = [];
  let cursor = 0;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) { cursor += 1; continue; }
    const rest = source.slice(cursor);
    const operator = rest.match(/^(>=|<=|==|>|<)/);
    if (operator) {
      tokens.push({ value: operator[0], type: 'RELATIONAL_OPERATOR', column: cursor + 1 });
      cursor += operator[0].length;
      continue;
    }
    const number = rest.match(/^-?(?:\d+\.?\d*|\.\d+)/);
    if (number) {
      tokens.push({ value: number[0], type: 'NUMBER', column: cursor + 1 });
      cursor += number[0].length;
      continue;
    }
    const word = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (word) {
      const value = word[0];
      const upper = value.toUpperCase();
      let type = 'IDENTIFIER';
      if (upper === 'IF' || upper === 'THEN') type = 'KEYWORD';
      else if (SENSORS.has(value.toLowerCase())) type = 'SENSOR';
      else if (DEVICES.has(upper)) type = 'DEVICE';
      else if (STATES.has(upper)) type = 'ACTION';
      tokens.push({ value, type, column: cursor + 1 });
      cursor += value.length;
      continue;
    }
    return { tokens, error: { message: `Invalid token '${source[cursor]}'`, column: cursor + 1 } };
  }
  return { tokens, error: null };
}

module.exports = { tokenize };
