const API = '/api';
const DEVICE_ICONS = { FAN: '✣', LIGHT: '☼', HEATER: '♨', AC: '❄', BUZZER: '◉' };
const SENSOR_SUFFIX = { temperature: '°C', light: '%', humidity: '%' };
const $ = (selector) => document.querySelector(selector);
let toastTimer;

function showToast(message, error = false) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.toggle('error', error); toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
async function request(url, options = {}) {
  const response = await fetch(`${API}${url}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}
function setConnection(storage) {
  const el = $('#connection'); const online = storage === 'mongodb';
  el.classList.toggle('offline', !online); el.querySelector('span').textContent = online ? 'MongoDB connected' : 'Memory mode';
  el.title = online ? 'Persistent MongoDB storage' : 'MongoDB not configured; data lasts until server stops';
}
function setPipeline(results, executing = false) {
  const stages = [...document.querySelectorAll('.pipe-stage')];
  stages.forEach((node) => node.classList.remove('active', 'done', 'error'));
  const hasError = results?.some((result) => !result.success);
  const furthest = hasError ? Math.max(...results.map((r) => r.error ? ['Lexical', 'Syntax', 'Semantic'].indexOf(r.error.stage) + 1 : 4)) : (executing ? 5 : 4);
  stages.forEach((node, index) => { if (index <= furthest) node.classList.add('done'); if (index === furthest) node.classList.add(hasError ? 'error' : 'active'); });
  stages[0].classList.add('done');
}
function renderTokens(results) {
  const tokens = results.flatMap((result) => result.tokens || []); $('#tokenCount').textContent = tokens.length;
  $('#tokensView').innerHTML = tokens.length ? `<div class="token-list">${tokens.map((token) => `<span class="token-chip ${token.type.toLowerCase().replace('_', '-')}"><b>${escapeHtml(token.value)}</b><small>${escapeHtml(token.type.replace('_', ' '))}</small></span>`).join('')}</div>` : '<div class="empty-state">No tokens were produced.</div>';
}
function renderFeedback(results) {
  $('#feedbackView').innerHTML = results.map((result, index) => {
    const error = result.error;
    const p = result.parseResult === undefined ? '—' : result.parseResult ? 'PASS' : 'FAIL';
    const s = result.semanticResult === undefined ? '—' : result.semanticResult ? 'PASS' : 'FAIL';
    return `<div class="command-result"><div class="command-label">${index + 1}. ${escapeHtml(result.command)}</div><div class="result-line"><span class="badge ${p === 'PASS' ? 'ok' : p === 'FAIL' ? 'fail' : ''}">PARSE ${p}</span><span class="badge ${s === 'PASS' ? 'ok' : s === 'FAIL' ? 'fail' : ''}">SEMANTIC ${s}</span></div>${error ? `<div class="error-text">${escapeHtml(error.stage)} Error: ${escapeHtml(error.message)}</div>` : ''}</div>`;
  }).join('');
}
function renderIR(results) {
  const valid = results.filter((result) => result.intermediateRepresentation);
  $('#irView').textContent = valid.length ? valid.map((result) => JSON.stringify(result.intermediateRepresentation, null, 2)).join('\n\n') : 'No intermediate representation generated.';
  $('#irView').classList.toggle('empty-state', !valid.length);
}
function renderDevices(devices) {
  $('#deviceGrid').innerHTML = devices.map((device) => {
    const on = device.state === 'ON';
    return `<div class="device-tile ${on ? 'on' : ''}"><div class="device-symbol">${DEVICE_ICONS[device.deviceName] || '◇'}</div><div class="device-info"><b>${escapeHtml(device.deviceName)}</b><span class="device-state"><i></i>${on ? 'ONLINE · ON' : 'STANDBY · OFF'}</span></div></div>`;
  }).join('');
}
function renderHistory(history) {
  $('#historyBody').innerHTML = history.length ? history.map((item) => {
    const status = item.status || 'Unknown'; const klass = status.includes('Successfully') ? 'success' : status.includes('Error') ? 'failed' : 'muted';
    return `<tr><td class="command-cell">${escapeHtml(item.command || '')}</td><td>${escapeHtml(item.condition || '—')}<br><span class="muted">Sensor: ${item.sensorValue ?? '—'}</span></td><td><span class="status-tag ${item.conditionMet === true ? 'success' : item.conditionMet === false ? 'muted' : 'failed'}">${item.conditionMet === true ? 'TRUE' : item.conditionMet === false ? 'FALSE' : 'ERROR'}</span></td><td>${escapeHtml(item.action || '—')}</td><td><span class="status-tag ${klass}">${escapeHtml(status)}</span></td><td>${formatTime(item.timestamp)}</td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-row">No executions yet. Run a command to populate the history.</td></tr>';
}
function formatTime(value) { return value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function updateSensorDisplay(key, value) {
  $(`#${key}Out`).innerHTML = `${value}<span>${SENSOR_SUFFIX[key]}</span>`;
  const input = $(`#${key}`); const percent = ((Number(value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
  input.style.setProperty('--progress', `${percent}%`);
}
async function saveSensors() {
  const values = Object.fromEntries(['temperature', 'light', 'humidity'].map((key) => [key, Number($(`#${key}`).value)]));
  try {
    const body = await request('/sensors', { method: 'PUT', body: JSON.stringify(values) }); setConnection(body.storage);
    $('#sensorSaved').textContent = 'Saved'; clearTimeout(saveSensors.timer); saveSensors.timer = setTimeout(() => { $('#sensorSaved').textContent = ''; }, 1200);
  } catch (error) { showToast(error.message, true); }
}
async function loadInitial() {
  try {
    const [sensorData, deviceData, historyData, health] = await Promise.all([request('/sensors'), request('/devices'), request('/history'), request('/health')]);
    setConnection(health.storage);
    for (const key of ['temperature', 'light', 'humidity']) { $(`#${key}`).value = sensorData.sensors[key]; updateSensorDisplay(key, sensorData.sensors[key]); }
    renderDevices(deviceData.devices); renderHistory(historyData.history);
  } catch (error) { setConnection('memory'); showToast(`Could not connect to backend: ${error.message}`, true); }
}
async function processCommand(mode) {
  const command = $('#commandInput').value;
  if (!command.trim()) { showToast('Enter at least one command first.', true); return; }
  const button = mode === 'execute' ? $('#executeBtn') : $('#analyzeBtn'); button.disabled = true; button.textContent = mode === 'execute' ? 'Running…' : 'Analyzing…';
  try {
    const body = await request(mode === 'execute' ? '/execute' : '/analyze', { method: 'POST', body: JSON.stringify({ command }) });
    setConnection(body.storage); setPipeline(body.results, mode === 'execute'); renderTokens(body.results); renderFeedback(body.results); renderIR(body.results);
    if (mode === 'execute') {
      renderDevices(body.devices); const history = await request('/history'); renderHistory(history.history);
      const succeeded = body.results.filter((result) => result.executionResult?.conditionMet).length;
      showToast(`${body.results.length} command${body.results.length === 1 ? '' : 's'} processed · ${succeeded} action${succeeded === 1 ? '' : 's'} executed`);
    } else showToast(`${body.results.length} command${body.results.length === 1 ? '' : 's'} analyzed`);
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; button.innerHTML = mode === 'execute' ? '<span>▶</span> Execute' : '<span>⌕</span> Analyze Command'; }
}

$('#analyzeBtn').addEventListener('click', () => processCommand('analyze'));
$('#executeBtn').addEventListener('click', () => processCommand('execute'));
$('#clearBtn').addEventListener('click', () => { $('#commandInput').value = ''; syncEditor(); $('#tokensView').textContent = 'Analyze a command to inspect its tokens.'; $('#feedbackView').textContent = 'Syntax and semantic results appear here.'; $('#irView').textContent = 'No intermediate representation generated.'; $('#tokenCount').textContent = '0'; document.querySelectorAll('.pipe-stage').forEach((stage, i) => stage.classList.toggle('active', i === 0)); showToast('Editor cleared'); });
$('#commandInput').addEventListener('input', syncEditor);
function syncEditor() { const lines = Math.max(1, $('#commandInput').value.split('\n').length); $('#lineRail').textContent = Array.from({ length: lines }, (_, index) => index + 1).join('\n'); $('#lineCount').textContent = `${String(lines).padStart(2, '0')} LINE${lines === 1 ? '' : 'S'}`; }
document.querySelectorAll('.samples button').forEach((button) => button.addEventListener('click', () => { $('#commandInput').value = button.dataset.sample; syncEditor(); }));
for (const key of ['temperature', 'light', 'humidity']) $(`#${key}`).addEventListener('input', (event) => { updateSensorDisplay(key, event.target.value); saveSensors(); });
$('#randomBtn').addEventListener('click', () => {
  const values = { temperature: Math.floor(Math.random() * 36 + 10), light: Math.floor(Math.random() * 101), humidity: Math.floor(Math.random() * 81 + 20) };
  for (const [key, value] of Object.entries(values)) { $(`#${key}`).value = value; updateSensorDisplay(key, value); }
  saveSensors(); showToast('New sensor values generated');
});
$('#refreshHistory').addEventListener('click', async () => { try { const body = await request('/history'); renderHistory(body.history); setConnection(body.storage); } catch (error) { showToast(error.message, true); } });
syncEditor(); loadInitial();
