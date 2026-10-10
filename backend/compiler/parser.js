/** Parse COMMAND → IF SENSOR OPERATOR NUMBER THEN DEVICE STATE. */
function parse(tokens) {
  const at = (index) => tokens[index];
  // Words are classified by position, not by their spelling. Known words and
  // unknown words alike reach semantic validation in the appropriate role.
  const isWord = (token) => token && ['IDENTIFIER', 'ACTION', 'SENSOR', 'DEVICE'].includes(token.type);
  if (!tokens.length) return { success: false, error: 'Command is empty.' };
  if (!at(0) || at(0).value.toUpperCase() !== 'IF') return { success: false, error: "Command must start with 'IF'." };
  if (!isWord(at(1))) return { success: false, error: 'Sensor name expected after IF.' };
  at(1).type = 'SENSOR';
  if (!at(2)) return { success: false, error: 'Relational operator expected after sensor.' };
  if (at(2).type !== 'RELATIONAL_OPERATOR') {
    return { success: false, error: at(2).type === 'NUMBER' ? 'Relational operator expected.' : 'Invalid relational operator.' };
  }
  if (!at(3) || at(3).type !== 'NUMBER') return { success: false, error: 'Numeric value expected after relational operator.' };
  if (!at(4) || at(4).value.toUpperCase() !== 'THEN') return { success: false, error: "'THEN' expected after condition." };
  if (!isWord(at(5))) return { success: false, error: 'Device name expected after THEN.' };
  at(5).type = 'DEVICE';
  if (!isWord(at(6))) return { success: false, error: 'Action ON or OFF expected after device.' };
  at(6).type = 'ACTION';
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
