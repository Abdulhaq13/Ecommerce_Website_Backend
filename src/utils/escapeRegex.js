// Escapes regex special characters so user search text is matched literally.
// Without this, input like "(" throws, and crafted patterns can hang the DB (ReDoS).
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
