export const TFJS_VERSION = '4.17.0';
export const COCO_SSD_VERSION = '2.2.3';

const tfjsUrl = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@' + TFJS_VERSION + '/dist/tf.min.js';
const cocoUrl = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@' + COCO_SSD_VERSION + '/dist/coco-ssd.min.js';
const loadedScripts = new WeakMap();

function globalValue(document, name) {
  return document.defaultView?.[name] ?? globalThis[name];
}

function loadScript(document, timers, url) {
  let scripts = loadedScripts.get(document);
  if (!scripts) { scripts = new Map(); loadedScripts.set(document, scripts); }
  if (scripts.has(url)) return scripts.get(url);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.crossOrigin = 'anonymous';
    const timer = timers.setTimeout(() => fail(new Error('Model script download timed out')), 20000);
    const cleanup = () => {
      timers.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
    };
    const fail = (error) => {
      cleanup();
      script.remove();
      scripts.delete(url);
      reject(error);
    };
    script.onload = () => { cleanup(); resolve(); };
    script.onerror = () => fail(new Error('Model script download failed'));
    document.head.append(script);
  });
  scripts.set(url, promise);
  return promise;
}

export async function loadCocoSsd({ document = globalThis.document, timers = globalThis } = {}) {
  if (!globalValue(document, 'tf')) await loadScript(document, timers, tfjsUrl);
  if (!globalValue(document, 'cocoSsd')) await loadScript(document, timers, cocoUrl);
  const cocoSsd = globalValue(document, 'cocoSsd');
  if (!cocoSsd?.load) throw new Error('COCO-SSD runtime unavailable');
  const model = await cocoSsd.load();
  return {
    detect: (video) => model.detect(video),
    close: () => model.dispose(),
  };
}
