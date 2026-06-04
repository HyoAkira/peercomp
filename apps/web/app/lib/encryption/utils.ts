// ---------- ECDH ----------
export async function generateKeyPair() {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
}

export async function generateSharedKey(otherPublicKey, privateKey) {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: otherPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ---------- ECDSA (identity) ----------
export async function generateIdentityKey() {
  return crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
}

// ECDH public key’i imzala
export async function signPublicKey(publicKey, identityPrivateKey) {
  const raw = await crypto.subtle.exportKey("raw", publicKey);

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    identityPrivateKey,
    raw
  );

  return { raw, signature };
}

// doğrula + usable public key'e çevir
export async function verifyAndImportPublicKey(
  raw,
  signature,
  identityPublicKey
) {
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    identityPublicKey,
    signature,
    raw
  );

  if (!ok) throw new Error("MITM detected: signature invalid");

  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

// ---------- AES ----------
export async function encrypt(sharedKey, data, dataType: "string" | "image") {
  if (dataType === "string") {
    data = new TextEncoder().encode(data);
  }
  if (dataType === "image") {
    data = new Uint8Array(data);
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    data
  );
  return { encrypted, iv };
}

export async function decrypt(sharedKey, encrypted, iv) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    encrypted
  );
  return decrypted;
}
