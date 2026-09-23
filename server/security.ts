const encoder = new TextEncoder();
function toHex(value: ArrayBuffer | Uint8Array) {
  return Array.from(value instanceof Uint8Array ? value : new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
function fromHex(value: string) {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (value) => parseInt(value, 16));
}
export async function sha256(value: string) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}
export const randomToken = () => toHex(crypto.getRandomValues(new Uint8Array(32)));
/** 256 random bits. Grouping is for transcription only; the database receives only its digest. */
export const newRecoveryKey = () => `RILL-${randomToken().toUpperCase().match(/.{8}/g)!.join('-')}`;
export async function recoveryKeyHash(key: string) {
  const normalized = key.toUpperCase().replace(/[\s-]/g, '');
  // Malformed input follows the same missing-match path as a wrong or consumed key.
  return sha256(
    `rill-recovery-v1:${/^RILL[0-9A-F]{64}$/.test(normalized) ? normalized : 'invalid'}`,
  );
}
const ITERATIONS = 600_000;
export async function hashPassword(password: string, iterations = ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return `pbkdf2-sha256$${iterations}$${toHex(salt)}$${toHex(bits)}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterationString, saltString, expected] = encoded.split('$');
  const iterations = Number(iterationString);
  if (
    algorithm !== 'pbkdf2-sha256' ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    iterations > 1_000_000 ||
    !/^[0-9a-f]{32}$/.test(saltString ?? '') ||
    !/^[0-9a-f]{64}$/.test(expected ?? '')
  )
    return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const actual = toHex(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltString), iterations },
      key,
      256,
    ),
  );
  let difference = 0;
  for (let index = 0; index < actual.length; index++)
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}
// Use the same KDF cost on unknown accounts to avoid a fast user-enumeration oracle.
export const DUMMY_HASH = `pbkdf2-sha256$${ITERATIONS}$00000000000000000000000000000000$${'0'.repeat(64)}`;

export function validPhoto(value: string): boolean {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || value.length > 1_400_000 || match[2].length % 4 !== 0) return false;
  try {
    const bytes = atob(match[2]);
    if (bytes.length < 16 || bytes.length > 1_048_576) return false;
    if (match[1] === 'jpeg')
      return (
        bytes.charCodeAt(0) === 255 &&
        bytes.charCodeAt(1) === 216 &&
        bytes.charCodeAt(2) === 255 &&
        bytes.charCodeAt(bytes.length - 2) === 255 &&
        bytes.charCodeAt(bytes.length - 1) === 217
      );
    if (match[1] === 'png')
      return bytes.slice(0, 8) === '\x89PNG\r\n\x1a\n' && bytes.slice(12, 16) === 'IHDR';
    return bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WEBP';
  } catch {
    return false;
  }
}
