let defaultUserId = null;

export function setDefaultUserId(id) {
  defaultUserId = id;
}

export function getDefaultUserIdOrThrow() {
  if (!defaultUserId) {
    const error = new Error("Default user is not initialized yet.");
    error.statusCode = 503;
    throw error;
  }
  return defaultUserId;
}
