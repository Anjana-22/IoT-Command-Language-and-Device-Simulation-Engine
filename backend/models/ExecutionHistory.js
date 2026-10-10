const mongoose = require('mongoose');

const ExecutionHistorySchema = new mongoose.Schema({
  command: String,
  condition: String,
  sensorValue: Number,
  conditionMet: Boolean,
  action: String,
  device: String,
  status: String,
  timestamp: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.models.ExecutionHistory || mongoose.model('ExecutionHistory', ExecutionHistorySchema);
