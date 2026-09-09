import * as T from '../vendor/three.module.min.js';

const POSITION_SPEED = 5;
const AIM_SPEED = 4;
const POSITION_FREQUENCY = 2.4;
const AIM_FREQUENCY = 2.2;
const MAX_STEP = 1 / 120;
const MAX_FRAME_TIME = 1 / 15;
const REST_EPSILON_SQ = 1e-6;

function copyFiniteVector(out, value) {
  const x = value?.x ?? value?.[0];
  const y = value?.y ?? value?.[1];
  const z = value?.z ?? value?.[2];
  if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
    out.set(x, y, z);
  }
  return out;
}

/**
 * Camera and look-at target in world units / seconds. Retargeting keeps both
 * velocities. Only reset() and { immediate: true } deliberately move instantly.
 * Returned vectors and the result object retain their identity between calls.
 */
export function createCameraFlow() {
  const position = new T.Vector3();
  const aim = new T.Vector3(0, 0, -1);
  const targetPosition = position.clone();
  const targetAim = aim.clone();
  const positionVelocity = new T.Vector3();
  const aimVelocity = new T.Vector3();
  const error = new T.Vector3();
  const result = { position, aim };

  function reset(nextPosition, nextAim) {
    copyFiniteVector(position, nextPosition);
    copyFiniteVector(aim, nextAim);
    targetPosition.copy(position);
    targetAim.copy(aim);
    positionVelocity.set(0, 0, 0);
    aimVelocity.set(0, 0, 0);
    return result;
  }

  function step(value, target, velocity, frequency, speed, dt) {
    error.copy(target).sub(value);
    const limit = 2 * speed / frequency;
    const distance = error.length();
    if (distance > limit) error.multiplyScalar(limit / distance);

    // Exact critical spring solution toward a nearby virtual target. With
    // s <= 1 and |error| <= 2*speed/frequency, |v(t)| <= speed*(1+s)*exp(-s)
    // <= speed whenever the incoming velocity obeys the same speed bound.
    // Recomputing the virtual target in small steps also softens long travel.
    const s = frequency * dt;
    const decay = Math.exp(-s);
    const targetWeight = -Math.expm1(-s) - s * decay;
    value.addScaledVector(error, targetWeight)
      .addScaledVector(velocity, dt * decay);
    velocity.multiplyScalar((1 - s) * decay)
      .addScaledVector(error, frequency * s * decay);
  }

  function follow(nextPosition, nextAim, dt, { immediate = false } = {}) {
    if (immediate) return reset(nextPosition, nextAim);
    copyFiniteVector(targetPosition, nextPosition);
    copyFiniteVector(targetAim, nextAim);

    // Zero/invalid time still accepts a new destination without changing the
    // pose or velocity. Excess elapsed time after a suspended tab is discarded.
    let remaining = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_FRAME_TIME) : 0;
    while (remaining > 1e-10) {
      const h = Math.min(MAX_STEP, remaining);
      step(position, targetPosition, positionVelocity, POSITION_FREQUENCY, POSITION_SPEED, h);
      step(aim, targetAim, aimVelocity, AIM_FREQUENCY, AIM_SPEED, h);
      remaining -= h;
    }
    return result;
  }

  return {
    reset,
    follow,
    get settling() {
      return position.distanceToSquared(targetPosition) > REST_EPSILON_SQ
        || aim.distanceToSquared(targetAim) > REST_EPSILON_SQ
        || positionVelocity.lengthSq() > REST_EPSILON_SQ
        || aimVelocity.lengthSq() > REST_EPSILON_SQ;
    },
  };
}

/**
 * Compose the original shot inside the unobscured content rectangle, while
 * drawing into the entire canvas. All dimensions use the same (CSS or device)
 * pixel units. The return value is the aspect to pass to cameraPositionFor().
 */
export function configureStoryFrustum(camera, width, height, { left = 0, top = 0, bottom = 0 } = {}) {
  const w = Number.isFinite(width) ? Math.max(1, width) : 1;
  const h = Number.isFinite(height) ? Math.max(1, height) : 1;
  const reservedLeft = Number.isFinite(left) ? T.MathUtils.clamp(left, 0, w - 1) : 0;
  const reservedTop = Number.isFinite(top) ? T.MathUtils.clamp(top, 0, h - 1) : 0;
  const reservedBottom = Number.isFinite(bottom) ? T.MathUtils.clamp(bottom, 0, h - reservedTop - 1) : 0;
  const availableWidth = w - reservedLeft;
  const availableHeight = h - reservedTop - reservedBottom;
  const aspect = availableWidth / availableHeight;

  camera.aspect = aspect;
  camera.fov = T.MathUtils.lerp(57,46,T.MathUtils.smoothstep(aspect,.65,1.08));
  if (reservedLeft || reservedTop || reservedBottom) {
    // setViewOffset derives camera.aspect from its first two arguments. They
    // must describe the content rectangle, not the full rendering viewport.
    // Negative offsets extend the frustum behind the left/top overlays.
    camera.setViewOffset(availableWidth, availableHeight, -reservedLeft, -reservedTop, w, h);
  } else {
    camera.clearViewOffset();
  }
  camera.updateProjectionMatrix();
  return aspect;
}
