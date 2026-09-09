/**
 * Geeta — locally hosted battlefield recordings.
 * Start from a user gesture; no synthesis or service credentials in the browser.
 * All browser objects, timers, and audio nodes are created lazily by start().
 */
import {createFieldRecordings} from './experience/field-recordings.js?v=14';
export function createSound() {
  let ctx, master, bedBus, actionBus, travelBus, accentBus, windBus;
  let loadPromise, scheduler = null, suspendTimer = null, documentRef = null;
  let enabled = false, muted = false, hidden = false, disposed = false;
  let level = 0.72, vision = 0, dread = 0, travel = 0, narration = false, ending = 0;
  let activation = 0,recordings=null,lastListenerUpdate=-1;
  let listenerPose=null;
  const graphNodes = new Set();

  const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));
  const remember = (node) => { graphNodes.add(node); return node; };
  const requested = () => enabled && !muted && !hidden && level > 0;
  const audible = () => !disposed && !!ctx && ctx.state === 'running' && requested();

  function hold(param, time) {
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(time);
    else {
      const value = param.value;
      param.cancelScheduledValues(time);
      param.setValueAtTime(value, time);
    }
  }
  function smooth(param, value, seconds = 0.22) {
    const now = ctx.currentTime;
    hold(param, now);
    param.setTargetAtTime(value, now, seconds);
  }
  function clearSuspend() {
    if (suspendTimer !== null) globalThis.clearTimeout(suspendTimer);
    suspendTimer = null;
  }
  function stopScheduler() {
    if (scheduler !== null) globalThis.clearInterval(scheduler);
    scheduler = null;
  }

  function initialize() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) throw new Error('Audio is unavailable in this browser.');
    ctx = new Audio({ latencyHint: 'playback' });
    master = remember(ctx.createGain());
    master.gain.value = 0;
    const compressor = remember(ctx.createDynamicsCompressor());
    compressor.threshold.value = -19;
    compressor.knee.value = 15;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.24;
    const highpass = remember(ctx.createBiquadFilter());
    highpass.type = 'highpass';
    highpass.frequency.value = 32;
    highpass.Q.value = 0.5;
    highpass.connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);
    bedBus = remember(ctx.createGain());
    actionBus = remember(ctx.createGain());
    travelBus = remember(ctx.createGain());
    accentBus = remember(ctx.createGain());
    windBus = remember(ctx.createGain());
    for (const bus of [bedBus, actionBus, travelBus, accentBus, windBus]) {
      bus.gain.value = 0;
      bus.connect(highpass);
    }
    documentRef = globalThis.document || null;
    hidden = !!documentRef?.hidden;
    documentRef?.addEventListener?.('visibilitychange', onVisibility);
    ctx.addEventListener?.('statechange', onContextState);
    updateMix();
    recordings=createFieldRecordings(ctx,{bedBus,actionBus,travelBus,accentBus,windBus});
    loadRecordings();
    if(listenerPose)setListener(...listenerPose);
  }

  function loadRecordings(){
    if(!loadPromise){
      const pending=recordings.load();loadPromise=pending;
      // Only a failed load resets the bank. A denied resume must not duplicate beds.
      void pending.catch(()=>{if(loadPromise===pending)loadPromise=null;});
    }
    return loadPromise;
  }

  function updateMix() {
    if (!ctx || disposed) return;
    const speaking = narration ? 1 : 0;
    // XI/vision and narration leave room for reading and speech, with gradual changes.
    smooth(bedBus.gain, (0.83 + dread * 0.12) * (1 - vision * 0.48) * (1 - speaking * 0.53) * (1-ending*.98), 0.42);
    smooth(actionBus.gain, (0.82 + dread * 0.1) * (1 - vision * 0.78) * (1 - speaking * 0.8) * (1-ending), 0.2);
    smooth(travelBus.gain, Math.pow(travel, 0.6) * 0.92 * (1 - vision * 0.74) * (1 - speaking * 0.8) * (1-ending), 0.2);
    smooth(accentBus.gain, 0.82 * (1 - vision * 0.85) * (1 - speaking * 0.86) * (1-ending), 0.28);
    smooth(windBus.gain,(.7-ending*.46)*(1-vision*.38)*(1-speaking*.5),.6);
    if(narration||vision>=.55||ending>.02)recordings?.stopEvents('signal');
    if(ending>.98)recordings?.stopEvents();
  }

  function tick() {
    if (!audible()) { stopScheduler(); return; }
    recordings?.tick(ctx.currentTime,{travel,narration,vision,ending});
  }
  function beginScheduler() {
    if (scheduler !== null || !audible()) return;
    scheduler = globalThis.setInterval(tick, 150);
    tick();
  }
  function activate() {
    if (!audible()) return;
    clearSuspend();
    smooth(master.gain, level, 0.33);
    updateMix();
    beginScheduler();
  }
  function park() {
    stopScheduler();
    recordings?.stopEvents();
    clearSuspend();
    if (!ctx || ctx.state === 'closed') return;
    smooth(master.gain, 0, 0.015);
    if (ctx.state === 'running') {
      const parkedContext = ctx;
      suspendTimer = globalThis.setTimeout(() => {
        suspendTimer = null;
        if (!disposed && !requested() && parkedContext.state === 'running') {
          void parkedContext.suspend().catch(() => {});
        }
      }, 110);
    }
  }
  async function reconcile() {
    if (!ctx || disposed) return;
    const ticket = ++activation;
    if (!requested()) { park(); return; }
    clearSuspend();
    if (ctx.state !== 'running') await ctx.resume();
    if (ticket === activation && !disposed) activate();
  }
  function onVisibility() {
    hidden = !!documentRef?.hidden;
    void reconcile().catch(() => {});
  }
  function onContextState() {
    if (disposed) return;
    if (ctx.state === 'running') {
      if (requested()) activate();
      else park();
    } else {
      stopScheduler();
      recordings?.stopEvents();
      hold(master.gain, ctx.currentTime);
      master.gain.setValueAtTime(0, ctx.currentTime);
    }
  }

  async function start() {
    if (disposed) throw new Error('This sound instance has been disposed.');
    if (!ctx) initialize();
    enabled = true;
    muted = false;
    try {
      // Resume within the gesture before waiting for network/decoding.
      const resumed=reconcile();
      const loaded=loadRecordings();
      await resumed; await loaded;
    }
    catch (error) { enabled = false; park(); throw error; }
  }
  function stop() {
    enabled = false;
    ++activation;
    park();
  }
  function mute(value = true) {
    muted = !!value;
    void reconcile().catch(() => {});
  }
  function state(nextVision = 0, nextDread = 0) {
    vision = clamp(nextVision);
    dread = clamp(nextDread);
    updateMix();
  }
  function setTravel(value) {
    const previous = travel;
    const nextTravel=clamp(value);if(Math.abs(nextTravel-previous)<.01)return;travel=nextTravel;
    updateMix();
  }
  function setLevel(value) {
    level = clamp(value);
    void reconcile().catch(() => {});
  }
  function setEnding(value){const nextEnding=clamp(value);if(nextEnding===ending)return;if(Math.abs(nextEnding-ending)<.002&&nextEnding!==0&&nextEnding!==1)return;ending=nextEnding;updateMix();}
  function setNarration(value) {
    if(narration===!!value)return;
    narration = !!value;
    updateMix();
  }
  function setListener(position,quaternion){
    listenerPose=[position,quaternion];if(!ctx||ctx.currentTime-lastListenerUpdate<.05)return;
    lastListenerUpdate=ctx.currentTime;
    const {x,y,z,w}=quaternion,forward=[-2*(x*z+w*y),-2*(y*z-w*x),-(1-2*(x*x+y*y))],up=[2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x)];
    const listener=ctx.listener;if(!listener)return;
    if(listener.positionX){for(const [name,value] of Object.entries({positionX:position.x,positionY:position.y,positionZ:position.z,forwardX:forward[0],forwardY:forward[1],forwardZ:forward[2],upX:up[0],upY:up[1],upZ:up[2]}))listener[name].setTargetAtTime(value,ctx.currentTime,.08);}
    else{listener.setPosition(position.x,position.y,position.z);listener.setOrientation(...forward,...up);}
  }
  function dispose() {
    if (disposed) return Promise.resolve();
    disposed = true;
    enabled = false;
    ++activation;
    stopScheduler();
    clearSuspend();
    documentRef?.removeEventListener?.('visibilitychange', onVisibility);
    ctx?.removeEventListener?.('statechange', onContextState);
    if (!ctx) return Promise.resolve();
    recordings?.dispose();recordings=null;
    for (const node of graphNodes) { try { node.disconnect(); } catch {} }
    graphNodes.clear();
    loadPromise = null;
    documentRef = null;
    return ctx.state === 'closed' ? Promise.resolve() : ctx.close();
  }

  return { start, stop, mute, state, setTravel, setLevel, setNarration,setListener,setEnding,
    get enabled() { return enabled; }, dispose };
}
