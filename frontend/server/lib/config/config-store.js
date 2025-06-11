let _config;

/**
 *
 * @param {import('.').default} config
 */
export function setConfigRef(config) {
  _config = config;
}

/**
 *
 * @returns {import('.').default | undefined} config
 */
export function getConfigRef() {
  return _config;
}
