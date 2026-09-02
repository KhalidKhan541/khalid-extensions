const PassForgeCrypto = (() => {
  const PBKDF2_ITERATIONS = 100000;
  const SALT_LENGTH = 32;
  const IV_LENGTH = 12;
  const KEY_LENGTH = 256;

  async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function deriveHash(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return bufferToHex(bits);
  }

  async function encrypt(plaintext, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(password, salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(plaintext)
    );

    const hmacKey = await deriveHmacKey(password, salt);
    const dataToAuthenticate = concatBuffers(salt, iv, new Uint8Array(ciphertext));
    const signature = await computeHmac(hmacKey, dataToAuthenticate);

    const result = new Uint8Array(
      signature.length + salt.length + iv.length + ciphertext.byteLength
    );
    result.set(signature, 0);
    result.set(salt, signature.length);
    result.set(iv, signature.length + salt.length);
    result.set(new Uint8Array(ciphertext), signature.length + salt.length + iv.length);

    return bufferToBase64(result);
  }

  async function decrypt(encryptedBase64, password) {
    const data = base64ToBuffer(encryptedBase64);
    const signature = data.slice(0, 32);
    const salt = data.slice(32, 32 + SALT_LENGTH);
    const iv = data.slice(32 + SALT_LENGTH, 32 + SALT_LENGTH + IV_LENGTH);
    const ciphertext = data.slice(32 + SALT_LENGTH + IV_LENGTH);

    const hmacKey = await deriveHmacKey(password, salt);
    const dataToAuthenticate = concatBuffers(salt, iv, ciphertext);
    const expectedSignature = await computeHmac(hmacKey, dataToAuthenticate);

    if (!constantTimeCompare(signature, expectedSignature)) {
      throw new Error('Integrity check failed - wrong password or corrupted data');
    }

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }

  async function deriveHmacKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  async function computeHmac(key, data) {
    const sig = await crypto.subtle.sign('HMAC', key, data);
    return new Uint8Array(sig);
  }

  function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }

  function concatBuffers(...buffers) {
    const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return result;
  }

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const hash = await deriveHash(password, salt);
    return { hash: hash, salt: bufferToBase64(salt) };
  }

  async function verifyPassword(password, storedHash, storedSalt) {
    const salt = base64ToBuffer(storedSalt);
    const hash = await deriveHash(password, salt);
    return constantTimeCompare(
      new Uint8Array(hexToBuffer(hash)),
      new Uint8Array(hexToBuffer(storedHash))
    );
  }

  function hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  function calculateEntropy(password, charsetSize) {
    if (!password || password.length === 0) return 0;
    return Math.floor(password.length * Math.log2(charsetSize || 95));
  }

  return {
    encrypt,
    decrypt,
    hashPassword,
    verifyPassword,
    calculateEntropy,
    bufferToBase64,
    base64ToBuffer
  };
})();
