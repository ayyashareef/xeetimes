import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

// Verify a login password against a stored hash, supporting the formats that
// exist after the WordPress import as well as our own bcrypt hashes:
//   - "$wp$..."  WordPress 6.8+ : bcrypt over base64(HMAC-SHA384(pw,'wp-sha384'))
//   - "$P$..."/"$H$..." classic phpass (portable, MD5-based)
//   - "$2a/$2b/$2y$..." plain bcrypt (admin-created users)
// Always fails closed: any unexpected input returns false.
export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    if (hash.startsWith('$wp$')) return checkWpBcrypt(plain, hash);
    if (hash.startsWith('$P$') || hash.startsWith('$H$')) return checkPhpass(plain, hash);
    if (hash.startsWith('$2')) return await bcrypt.compare(plain, normalizeBcrypt(hash));
    return false;
  } catch {
    return false;
  }
}

// WordPress 6.8+: hash = '$wp$' + bcrypt( base64( raw HMAC-SHA384(pw, 'wp-sha384') ) ).
// wp_check_password removes 3 chars ('$wp') leaving a '$2y$..' bcrypt hash.
function checkWpBcrypt(plain: string, hash: string): boolean {
  const bcryptHash = normalizeBcrypt(hash.slice(3));
  const prehash = crypto.createHmac('sha384', 'wp-sha384').update(plain, 'utf8').digest('base64');
  return bcrypt.compareSync(prehash, bcryptHash);
}

// bcryptjs doesn't accept the PHP "$2y$" identifier; it's byte-compatible with "$2b$".
function normalizeBcrypt(h: string): string {
  return h.startsWith('$2y$') ? '$2b$' + h.slice(4) : h;
}

const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function checkPhpass(plain: string, setting: string): boolean {
  const computed = cryptPrivate(plain, setting);
  if (computed[0] === '*' || computed.length !== setting.length) return false;
  // constant-time compare
  const a = Buffer.from(computed);
  const b = Buffer.from(setting);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function cryptPrivate(password: string, setting: string): string {
  if (setting.slice(0, 3) !== '$P$' && setting.slice(0, 3) !== '$H$') return '*0';
  const countLog2 = ITOA64.indexOf(setting[3]);
  if (countLog2 < 7 || countLog2 > 30) return '*0';
  let count = 1 << countLog2;
  const salt = setting.slice(4, 12);
  if (salt.length !== 8) return '*0';
  const pw = Buffer.from(password, 'utf8');
  let hash = crypto.createHash('md5').update(Buffer.concat([Buffer.from(salt, 'binary'), pw])).digest();
  do {
    hash = crypto.createHash('md5').update(Buffer.concat([hash, pw])).digest();
  } while (--count);
  return setting.slice(0, 12) + encode64(hash, 16);
}

function encode64(input: Buffer, count: number): string {
  let output = '';
  let i = 0;
  do {
    let value = input[i++];
    output += ITOA64[value & 0x3f];
    if (i < count) value |= input[i] << 8;
    output += ITOA64[(value >> 6) & 0x3f];
    if (i++ >= count) break;
    if (i < count) value |= input[i] << 16;
    output += ITOA64[(value >> 12) & 0x3f];
    if (i++ >= count) break;
    output += ITOA64[(value >> 18) & 0x3f];
  } while (i < count);
  return output;
}
