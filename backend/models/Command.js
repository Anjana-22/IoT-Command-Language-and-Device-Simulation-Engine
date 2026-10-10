const mongoose = require('mongoose');

const CommandSchema = new mongoose.Schema({
  command: { type: String, required: true },
  tokens: { type: [mongoose.Schema.Types.Mixed], default: [] },
  parseResult: Boolean,
  semanticResult: Boolean,
  intermediateRepresentation: mongoose.Schema.Types.Mixed,
  executionResult: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.models.Command || mongoose.model('Command', CommandSchema);
