const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

export async function encrypt(text: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt']
  );

  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(text)
  );

  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...result));
}

export async function decrypt(encryptedBase64: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const data = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encrypted = data.slice(28);

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  return dec.decode(decrypted);
}
