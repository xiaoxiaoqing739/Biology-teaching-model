const allowed = new Set(['oxygen', 'carbon-dioxide', 'energy']);
const frames = new Map([...document.querySelectorAll('.series-frame')].map(frame => [frame.dataset.experiment, frame]));
const mask = document.querySelector('.switch-mask');
let activeId = allowed.has(location.hash.slice(1)) ? location.hash.slice(1) : 'oxygen';
let switching = false;
let requestId = 0;
const waiters = new Map();

function send(id, message) { frames.get(id)?.contentWindow?.postMessage(message, '*'); }
function waitFor(type, id, token, timeout = 2600) {
  return new Promise(resolve => {
    const key = `${type}:${id}:${token}`;
    const timer = setTimeout(() => { waiters.delete(key); resolve(); }, timeout);
    waiters.set(key, () => { clearTimeout(timer); waiters.delete(key); resolve(); });
  });
}
function show(id) {
  frames.forEach((frame, frameId) => frame.classList.toggle('active', frameId === id));
  frames.forEach((_, frameId) => send(frameId, {type: 'series:set-active', id}));
  history.replaceState(null, '', `#${id}`);
}
async function switchTo(nextId) {
  if (switching || nextId === activeId || !allowed.has(nextId)) return;
  switching = true;
  const token = ++requestId;
  mask.classList.add('show');
  frames.forEach((_, id) => send(id, {type: 'series:set-switching', value: true}));
  send(activeId, {type: 'series:deactivate', requestId: token});
  await waitFor('series:deactivated', activeId, token);
  activeId = nextId;
  show(activeId);
  send(activeId, {type: 'series:activate', requestId: token});
  await waitFor('series:activated', activeId, token);
  frames.forEach((_, id) => send(id, {type: 'series:set-switching', value: false}));
  mask.classList.remove('show');
  switching = false;
}

addEventListener('message', event => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.type === 'series:switch') switchTo(message.id);
  if (message.type === 'series:deactivated' || message.type === 'series:activated') waiters.get(`${message.type}:${message.id}:${message.requestId}`)?.();
});

frames.forEach((frame, id) => frame.addEventListener('load', () => send(id, {type: 'series:set-active', id: activeId})));
show(activeId);
