/** Starts shared preparation on page arrival. Language work is coalesced by key. */
export function createArrival(loadShared) {
  const jobs = new Map();
  const bounded = work => {
    let timer;
    return Promise.race([work, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('Preparation timed out')), 90000);
    })]).finally(() => clearTimeout(timer));
  };
  const shared = bounded(Promise.resolve().then(loadShared));
  void shared.catch(() => {});
  function prepare(key, work) {
    if (jobs.has(key)) return jobs.get(key).promise;
    const job = {ready: false, promise: null};
    job.promise = bounded(Promise.all([shared, Promise.resolve().then(work)]))
      .then(() => { job.ready = true; })
      .catch(error => { jobs.delete(key); throw error; });
    jobs.set(key, job);
    return job.promise;
  }
  return {shared, prepare, isReady: key => jobs.get(key)?.ready === true};
}

/** SVGElement.hidden is not a reflected property in all browsers. */
export function setPlaybackButton(button, playIcon, pauseIcon, playing, label) {
  playIcon.toggleAttribute('hidden', playing);
  pauseIcon.toggleAttribute('hidden', !playing);
  button.setAttribute('aria-label', label);
  button.title = label;
  button.dataset.playback = playing ? 'playing' : 'paused';
}

export const wordmarks = {en: 'GITA', hi: 'गीता', ja: 'ギーター', 'zh-Hans': '薄伽梵歌', fr: 'GITA'};
