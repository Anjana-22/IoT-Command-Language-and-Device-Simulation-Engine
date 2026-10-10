const mongoose = require('mongoose');
const Sensor = require('./models/Sensor');
const Device = require('./models/Device');
const Command = require('./models/Command');
const ExecutionHistory = require('./models/ExecutionHistory');

const DEVICE_NAMES = ['FAN', 'LIGHT', 'HEATER', 'AC', 'BUZZER'];
const memory = {
  sensors: { temperature: 24, light: 55, humidity: 45, timestamp: new Date() },
  devices: Object.fromEntries(DEVICE_NAMES.map((name) => [name, { deviceName: name, state: 'OFF', updatedAt: new Date() }])),
  commands: [], history: []
};

async function connectMongo(uri) {
  if (!uri) return false;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    await Promise.all(DEVICE_NAMES.map((deviceName) => Device.updateOne({ deviceName }, { $setOnInsert: { deviceName, state: 'OFF' } }, { upsert: true })));
    if (!(await Sensor.exists({}))) await Sensor.create(memory.sensors);
    return true;
  } catch (error) {
    console.warn(`MongoDB unavailable; using in-memory storage: ${error.message}`);
    return false;
  }
}

const connected = () => mongoose.connection.readyState === 1;
async function getSensors() {
  if (!connected()) return { ...memory.sensors };
  let sensors = await Sensor.findOne().lean();
  if (!sensors) sensors = await Sensor.create(memory.sensors);
  return sensors;
}
async function setSensors(values) {
  memory.sensors = { ...memory.sensors, ...values, timestamp: new Date() };
  if (connected()) return Sensor.findOneAndUpdate({}, { $set: memory.sensors }, { new: true, upsert: true }).lean();
  return { ...memory.sensors };
}
async function getDevices() {
  if (!connected()) return Object.values(memory.devices);
  const devices = await Device.find().sort({ deviceName: 1 }).lean();
  return devices;
}
async function setDevice(deviceName, state) {
  memory.devices[deviceName] = { deviceName, state, updatedAt: new Date() };
  if (connected()) return Device.findOneAndUpdate({ deviceName }, { state, updatedAt: new Date() }, { new: true, upsert: true }).lean();
  return memory.devices[deviceName];
}
async function saveCommand(record) {
  const doc = { ...record, timestamp: new Date() };
  if (connected()) return (await Command.create(doc)).toObject();
  memory.commands.unshift(doc);
  memory.commands = memory.commands.slice(0, 100);
  return doc;
}
async function saveHistory(record) {
  const doc = { ...record, timestamp: new Date() };
  if (connected()) return (await ExecutionHistory.create(doc)).toObject();
  memory.history.unshift(doc);
  memory.history = memory.history.slice(0, 100);
  return doc;
}
async function getHistory(limit = 50) {
  if (connected()) return ExecutionHistory.find().sort({ timestamp: -1 }).limit(limit).lean();
  return memory.history.slice(0, limit);
}

module.exports = { connectMongo, connected, getSensors, setSensors, getDevices, setDevice, saveCommand, saveHistory, getHistory };
