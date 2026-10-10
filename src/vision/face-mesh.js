export const FACE_MESH_VERSION = '0.4.1633559619';
const base = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${FACE_MESH_VERSION}/`;
const scripts = new WeakMap();

function loadScript(document, timers) {
  if (scripts.has(document)) return scripts.get(document);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${base}face_mesh.js`;
    script.crossOrigin = 'anonymous';
    const timer = timers.setTimeout(() => fail(new Error('FaceMesh download timed out')), 20000);
    const cleanup = () => { timers.clearTimeout(timer); script.onload = null; script.onerror = null; };
    const fail = (error) => { cleanup(); script.remove(); scripts.delete(document); reject(error); };
    script.onload = () => { cleanup(); resolve(); };
    script.onerror = () => fail(new Error('FaceMesh download failed'));
    document.head.append(script);
  });
  scripts.set(document, promise);
  return promise;
}

export async function loadFaceMesh({ document = globalThis.document, timers = globalThis } = {}) {
  await loadScript(document, timers);
  const FaceMesh = document.defaultView?.FaceMesh ?? globalThis.FaceMesh;
  if (!FaceMesh) throw new Error('FaceMesh runtime unavailable');
  const model = new FaceMesh({ locateFile: (file) => `${base}${file}` });
  model.setOptions({ maxNumFaces: 4, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
  try { await model.initialize(); }
  catch (error) { await model.close(); throw error; }
  return model;
}
