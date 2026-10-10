const { tokenize } = require('./lexer');
const { parse } = require('./parser');
const { validate } = require('./semanticAnalyzer');
const { toIR } = require('./intermediateCode');

function analyzeCommand(command) {
  const lexical = tokenize(command);
  const result = { command, tokens: lexical.tokens, stages: { lexical: 'complete' }, success: false };
  if (lexical.error) {
    result.error = { stage: 'Lexical', message: lexical.error.message, column: lexical.error.column };
    result.stages.lexical = 'error';
    return result;
  }
  const parsed = parse(lexical.tokens);
  result.parseResult = parsed.success;
  result.stages.syntax = parsed.success ? 'complete' : 'error';
  if (!parsed.success) {
    result.error = { stage: 'Syntax', message: parsed.error };
    return result;
  }
  result.ast = parsed.ast;
  const semantic = validate(parsed.ast);
  result.semanticResult = semantic.success;
  result.stages.semantic = semantic.success ? 'complete' : 'error';
  if (!semantic.success) {
    result.error = { stage: 'Semantic', message: semantic.error };
    return result;
  }
  result.intermediateRepresentation = toIR(parsed.ast);
  result.stages.ir = 'complete';
  result.success = true;
  return result;
}

function analyzeProgram(source) {
  const commands = String(source || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return commands.map(analyzeCommand);
}

module.exports = { analyzeCommand, analyzeProgram };
