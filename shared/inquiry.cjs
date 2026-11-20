const MAX_BODY_BYTES = 24 * 1024;

/** @param {unknown} input */
function validateInquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const fields = /** @type {Record<string, unknown>} */ (input);
  const { name, email, message, website } = fields;
  if (website !== undefined && website !== '') return null;
  if (typeof email !== 'string') return null;
  const address = email.trim().toLowerCase();
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return null;
  if (name === undefined && message === undefined) return { email: address };

  // The earlier inquiry form sent both fields. Continue accepting its requests.
  if (typeof name !== 'string' || typeof message !== 'string') return null;
  const inquiry = { name: name.trim(), email: address, message: message.trim() };
  if (inquiry.name.length < 2 || inquiry.name.length > 120 ||
      inquiry.message.length < 10 || inquiry.message.length > 3000) return null;
  return inquiry;
}

module.exports = { MAX_BODY_BYTES, validateInquiry };
