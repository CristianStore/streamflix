const crypto = require('crypto');
const config = require('../config/config');

const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.createHash('sha256').update(String(config.streamEncryptionKey)).digest();

/**
 * Genera un ticket temporal cifrado para acceder al stream HLS (.m3u8)
 * @param {string|number} userId
 * @param {string|number} mediaId
 * @param {number} durationSeconds
 * @returns {string} Token temporal cifrado seguro para URL
 */
function generateStreamTicket(userId, mediaId, durationSeconds = config.streamTokenExpirationSeconds) {
  const expiresAt = Date.now() + (durationSeconds * 1000);
  const payload = JSON.stringify({
    uid: userId,
    mid: mediaId,
    exp: expiresAt,
    salt: crypto.randomBytes(8).toString('hex')
  });

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Retornamos iv + ":" + encrypted en formato Base64 URL-safe
  const tokenRaw = `${iv.toString('hex')}:${encrypted}`;
  return Buffer.from(tokenRaw).toString('base64url');
}

/**
 * Valida y descifra un ticket temporal
 * @param {string} ticket
 * @param {string|number} expectedMediaId
 * @returns {{ valid: boolean, error?: string, payload?: object }}
 */
function verifyStreamTicket(ticket, expectedMediaId) {
  if (!ticket) {
    return { valid: false, error: 'Ticket de reproducción no proporcionado' };
  }

  try {
    const raw = Buffer.from(ticket, 'base64url').toString('utf8');
    const [ivHex, encryptedHex] = raw.split(':');

    if (!ivHex || !encryptedHex) {
      return { valid: false, error: 'Formato de ticket inválido' };
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const payload = JSON.parse(decrypted);

    // Validar expiración
    if (Date.now() > payload.exp) {
      return { valid: false, error: 'El ticket de reproducción ha expirado' };
    }

    // Validar que corresponda al medio solicitado
    if (String(payload.mid) !== String(expectedMediaId)) {
      return { valid: false, error: 'El ticket no coincide con el recurso solicitado' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Ticket corrupto o manipulación detectada' };
  }
}

module.exports = {
  generateStreamTicket,
  verifyStreamTicket
};
