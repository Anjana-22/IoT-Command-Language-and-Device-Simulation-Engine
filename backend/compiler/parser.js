/** Parse COMMAND → IF SENSOR OPERATOR NUMBER THEN DEVICE STATE. */
function parse(tokens) {
  const at = (index) => tokens[index];
  if (!tokens.length) return { success: false, error: 'Command is empty.' };
  if (!at(0) || at(0).value.toUpperCase() !== 'IF') return { success: false, error: "Command must start with 'IF'." };
  if (!at(1) || !['SENSOR', 'IDENTIFIER'].includes(at(1).type)) return { success: false, error: 'Sensor name expected after IF.' };
  if (!at(2)) return { success: false, error: 'Relational operator expected after sensor.' };
  if (at(2).type !== 'RELATIONAL_OPERATOR') {
    return { success: false, error: at(2).type === 'NUMBER' ? 'Relational operator expected.' : 'Invalid relational operator.' };
  }
  if (!at(3) || at(3).type !== 'NUMBER') return { success: false, error: 'Numeric value expected after relational operator.' };
  if (!at(4) || at(4).value.toUpperCase() !== 'THEN') return { success: false, error: "'THEN' expected after condition." };
  if (!at(5) || !['DEVICE', 'IDENTIFIER'].includes(at(5).type)) return { success: false, error: 'Device name expected after THEN.' };
  if (!at(6) || !['ACTION', 'IDENTIFIER'].includes(at(6).type)) return { success: false, error: 'Action ON or OFF expected after device.' };
  if (tokens.length > 7) return { success: false, error: `Unexpected token '${at(7).value}' after action.` };
  return {
    success: true,
    ast: {
      sensor: at(1).value.toLowerCase(), operator: at(2).value,
      value: Number(at(3).value), device: at(5).value.toUpperCase(), action: at(6).value.toUpperCase()
    }
  };
}

module.exports = { parse };
