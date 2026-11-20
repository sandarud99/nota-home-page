const MAX_BODY_BYTES = 24 * 1024;

/** @param {unknown} input */
function validateInquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const fields = /** @type {Record<string, unknown>} */ (input);
  const { email, website } = fields;
  if (website !== undefined && website !== '') return null;
  if (typeof email !== 'string') return null;
  const address = email.trim().toLowerCase();
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return null;
  return { email: address };
}

module.exports = { MAX_BODY_BYTES, validateInquiry };
