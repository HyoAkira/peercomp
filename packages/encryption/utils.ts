/**
 * crypto.ts — Complete P2P Identity, Session & Namespace Auth Module
 *
 * Mimari:
 * IdentityKey  → kalıcı ECDSA kimlik çifti (imzala/doğrula) & Namespace üretimi
 * CryptoSession → tek seferlik ECDH oturum çifti (uçtan uca şifreleme)
 * validateP2PWriteRequest → P2P ağında Token/Namespace tabanlı yetki doğrulama
 */

// ─────────────────────────────────────────────
// 1. Yardımcı Dönüşüm Fonksiyonları
// ─────────────────────────────────────────────

export function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function base64ToBuffer(b64: string): ArrayBuffer {
  console.log(b64)
    console.log({
    b64,
    length:b64?.length,
    chars:[...b64].filter(c=>!"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".includes(c))
  });
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/**
 * Glob Pattern Eşleştirme (örn: "posts/*" -> "posts/123" ile eşleşir)
 */
export function doesKeyMatchPattern(key: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const escapeRegex = (s: string) => s.replace(/([.+?^${}()|\[\]\/\\])/g, "\\$1");
    const regexPattern = "^" + pattern.split("*").map(escapeRegex).join(".*") + "$";
    const regex = new RegExp(regexPattern);
    return regex.test(key);
  });
}

// ─────────────────────────────────────────────
// 2. Arayüzler (Interfaces & Types)
// ─────────────────────────────────────────────

/** export() çıktısı — JSON-serializable, localStorage / IndexedDB'e yazılabilir */
export interface SerializedIdentityKey {
  publicKey: string;  // base64 SPKI
  privateKey: string; // base64 PKCS8
}

/** Karşı tarafa iletilecek DH oturum paketi */
export interface SessionHandshakePacket {
  ecdhPublicKeyRaw: string;  // base64 raw ECDH public key
  signature: string;         // base64 — kimlik private key ile imzalanmış
  identityPublicKeySPKI: string; // base64 SPKI — doğrulama için
}

/** Şifrelenmiş mesaj paketi */
export interface EncryptedPacket {
  ciphertext: string; // base64
  iv: string;         // base64
}

/** P2P Yetki Devri Token'ı */
export interface DelegationToken {
  delegatePublicKey: string; // Kime izin verildi (base64 SPKI)
  allowedKeys: string[];     // Hangi key pattern'larına (örn: ["posts/*", "profile"])
  expiresAt: number;         // Unix ms
  ownerSignature: string;    // base64, owner'ın token'ı imzaladığı kanıt
}

/** P2P Ağına Gönderilen İmzalı KV Paketi */
export interface SignedValue {
  payload: string;           // Asıl veri (JSON string, tercihen timestamp içerir)
  
  // --- Owner doğrudan yazdıysa ---
  ownerSignature?: string;   // base64

  // --- Delegate yazdıysa ---
  token?: DelegationToken;   
  delegateSignature?: string; // base64
}

// ─────────────────────────────────────────────
// 3. IdentityKey — Kalıcı ECDSA Kimlik Çifti
// ─────────────────────────────────────────────

export class IdentityKey {
  private constructor(
    public readonly publicKey: CryptoKey,
    public readonly privateKey: CryptoKey
  ) {}

  /** Yeni bir kimlik çifti üret */
  static async generate(): Promise<IdentityKey> {
    const pair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
    return new IdentityKey(pair.publicKey, pair.privateKey);
  }

  /**
   * Mevcut bir çifti içe aktar (localStorage, Dexie vb. kaynaklardan)
   */
  static async import(serialized: SerializedIdentityKey): Promise<IdentityKey> {
    const [publicKey, privateKey] = await Promise.all([
      crypto.subtle.importKey(
        "spki",
        base64ToBuffer(serialized.publicKey),
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
      ),
      crypto.subtle.importKey(
        "pkcs8",
        base64ToBuffer(serialized.privateKey),
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
      ),
    ]);
    return new IdentityKey(publicKey, privateKey);
  }

  /** Kalıcı depolama için dışa aktar (base64 SPKI + PKCS8) */
  async export(): Promise<SerializedIdentityKey> {
    const [spki, pkcs8] = await Promise.all([
      crypto.subtle.exportKey("spki", this.publicKey),
      crypto.subtle.exportKey("pkcs8", this.privateKey),
    ]);
    return {
      publicKey: bufferToBase64(spki),
      privateKey: bufferToBase64(pkcs8),
    };
  }

  /** Herhangi bir string / token imzala */
  async sign(data: string): Promise<ArrayBuffer> {
    return crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      this.privateKey,
      new TextEncoder().encode(data)
    );
  }

  /** İmzayı bu kimliğin public key'i ile doğrula */
  async verify(data: string, signature: ArrayBuffer): Promise<boolean> {
    return crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      this.publicKey,
      signature,
      new TextEncoder().encode(data)
    );
  }

  /**
   * Yalnızca public key'i dışarıya ver (SPKI, base64).
   * Karşı tarafa iletmek veya DHT'de yayınlamak için kullanılır.
   */
  async exportPublicKey(): Promise<string> {
    const spki = await crypto.subtle.exportKey("spki", this.publicKey);
    return bufferToBase64(spki);
  }

  /**
   * Base64 SPKI formatındaki bir public key'i doğrulama amaçlı içe aktar.
   */
  static async importPublicKey(spkiBase64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      "spki",
      base64ToBuffer(spkiBase64),
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"]
    );
  }

  /**
   * SPKI Base64 formatındaki bir public key'den SHA-256 Namespace ID üretir.
   */
  static async calculateNamespace(spkiBase64: string): Promise<string> {
    console.log("spki", spkiBase64);
    const keyBuffer = base64ToBuffer(spkiBase64);
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Elimizde IdentityKey objesi yokken, dışarıdan gelen bir verinin imzasını
   * doğrudan Base64 SPKI string kullanarak doğrulamak için yardımcı statik metod.
   */
  static async verifyWithSPKI(
    spkiBase64: string,
    signatureBase64: string,
    data: string
  ): Promise<boolean> {
    try {
      const publicKey = await this.importPublicKey(spkiBase64);
      const signatureBuffer = base64ToBuffer(signatureBase64);
      return await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        signatureBuffer,
        new TextEncoder().encode(data)
      );
    } catch (error) {
      return false;
    }
  }
}

// ─────────────────────────────────────────────
// 4. CryptoSession — Tam Uçtan Uca DH Oturumu
// ─────────────────────────────────────────────

export class CryptoSession {
  private sharedKey: CryptoKey | null = null;
  private ecdhPublicKey: CryptoKey | null = null;
  private ecdhPrivateKey: CryptoKey | null = null;

  private constructor(private readonly identity: IdentityKey) {}

  static create(identity: IdentityKey): CryptoSession {
    return new CryptoSession(identity);
  }

  async createHandshakePacket(): Promise<SessionHandshakePacket> {
    const ecdhPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    this.ecdhPublicKey = ecdhPair.publicKey;
    this.ecdhPrivateKey = ecdhPair.privateKey;

    const rawEcdh = await crypto.subtle.exportKey("raw", this.ecdhPublicKey);
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      this.identity.privateKey,
      rawEcdh
    );

    return {
      ecdhPublicKeyRaw: bufferToBase64(rawEcdh),
      signature: bufferToBase64(signature),
      identityPublicKeySPKI: await this.identity.exportPublicKey(),
    };
  }

  async acceptHandshake(incomingPacket: SessionHandshakePacket): Promise<SessionHandshakePacket> {
    const remoteEcdhKey = await this._verifyAndImport(incomingPacket);

    const ecdhPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    this.ecdhPublicKey = ecdhPair.publicKey;
    this.ecdhPrivateKey = ecdhPair.privateKey;

    this.sharedKey = await crypto.subtle.deriveKey(
      { name: "ECDH", public: remoteEcdhKey },
      this.ecdhPrivateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const rawEcdh = await crypto.subtle.exportKey("raw", this.ecdhPublicKey);
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      this.identity.privateKey,
      rawEcdh
    );

    return {
      ecdhPublicKeyRaw: bufferToBase64(rawEcdh),
      signature: bufferToBase64(signature),
      identityPublicKeySPKI: await this.identity.exportPublicKey(),
    };
  }

  async finalizeHandshake(responsePacket: SessionHandshakePacket): Promise<void> {
    if (!this.ecdhPrivateKey) {
      throw new Error("createHandshakePacket() önce çağrılmalıdır.");
    }
    const remoteEcdhKey = await this._verifyAndImport(responsePacket);
    this.sharedKey = await crypto.subtle.deriveKey(
      { name: "ECDH", public: remoteEcdhKey },
      this.ecdhPrivateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async encrypt(data: string | ArrayBuffer): Promise<EncryptedPacket> {
    this._assertReady();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const payload = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.sharedKey!,
      payload
    );

    return {
      ciphertext: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv),
    };
  }

  async decryptText(packet: EncryptedPacket): Promise<string> {
    const buf = await this._decrypt(packet);
    return new TextDecoder().decode(buf);
  }

  async decryptBinary(packet: EncryptedPacket): Promise<ArrayBuffer> {
    return this._decrypt(packet);
  }

  private async _decrypt(packet: EncryptedPacket): Promise<ArrayBuffer> {
    this._assertReady();
    return crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(packet.iv)) },
      this.sharedKey!,
      base64ToBuffer(packet.ciphertext)
    );
  }

  private _assertReady(): void {
    if (!this.sharedKey) throw new Error("Shared key henüz türetilmedi. El sıkışmayı tamamlayın.");
  }

  private async _verifyAndImport(packet: SessionHandshakePacket): Promise<CryptoKey> {
    const remoteIdentityKey = await IdentityKey.importPublicKey(packet.identityPublicKeySPKI);
    const rawEcdh = base64ToBuffer(packet.ecdhPublicKeyRaw);
    const signature = base64ToBuffer(packet.signature);

    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      remoteIdentityKey,
      signature,
      rawEcdh
    );

    if (!valid) throw new Error("MITM tespit edildi: imza geçersiz.");

    return crypto.subtle.importKey("raw", rawEcdh, { name: "ECDH", namedCurve: "P-256" }, true, []);
  }
}

// ─────────────────────────────────────────────
// 5. P2P Ağı Yetki Doğrulama Mantığı
// ─────────────────────────────────────────────

/**
 * Kademlia DHT veya P2P ağına gelen bir PUT isteğini doğrular.
 * Tamamen IdentityKey'in statik metodlarına dayanır.
 * * @param targetNamespace İsteğin yazılmak istendiği alan
 * @param key İsteğin atıldığı spesifik anahtar (Örn: "posts/12")
 * @param signedValue İmzalı veri paketi
 * @param ownerPublicKeyBase64 Namespace sahibinin açık anahtarı
 */
export async function validateP2PWriteRequest(
  targetNamespace: string,
  key: string,
  signedValue: SignedValue,
  ownerPublicKeyBase64: string
): Promise<boolean> {
  
  // 1. ADIM: Namespace Eşleşmesi
  const expectedNamespace = await IdentityKey.calculateNamespace(ownerPublicKeyBase64);
  if (expectedNamespace !== targetNamespace) {
    console.warn("REJECTED: Namespace mismatch.");
    return false; 
  }
  // 2. ADIM: Owner doğrudan yazıyorsa
  if (signedValue.ownerSignature) {
    const isValidOwner = await IdentityKey.verifyWithSPKI(
      ownerPublicKeyBase64,
      signedValue.ownerSignature,
      signedValue.payload
    );
    
    if (isValidOwner) return true;
    console.warn("REJECTED: Invalid Owner Signature.");
    return false;
  }

  // 3. ADIM: Token kontrolü
  if (!signedValue.token || !signedValue.delegateSignature) {
    console.warn("REJECTED: Missing Owner Signature and Delegation Token.");
    return false;
  }

  const { token, delegateSignature } = signedValue;

  // 4. ADIM: Delegate Yetki Kontrolleri
  
  // 4.1. Token gerçekten owner tarafından mı imzalanmış?
  const tokenDataToVerify = JSON.stringify({
    delegatePublicKey: token.delegatePublicKey,
    allowedKeys: token.allowedKeys,
    expiresAt: token.expiresAt
  });
  
  const isTokenAuthentic = await IdentityKey.verifyWithSPKI(
    ownerPublicKeyBase64,
    token.ownerSignature,
    tokenDataToVerify
  );
  
  if (!isTokenAuthentic) {
    console.warn("REJECTED: Token is not signed by Owner.");
    return false;
  }

  // 4.2. Süre kontrolü
  if (Date.now() > token.expiresAt) {
    console.warn("REJECTED: Delegation Token expired.");
    return false;
  }

  // 4.3. Key pattern izni
  if (!doesKeyMatchPattern(key, token.allowedKeys)) {
    console.warn(`REJECTED: Key '${key}' is not allowed by token patterns.`);
    return false;
  }

  // 4.4. Payload delegate tarafından mı imzalanmış?
  const isPayloadAuthentic = await IdentityKey.verifyWithSPKI(
    token.delegatePublicKey,
    delegateSignature,
    signedValue.payload
  );
  
  if (!isPayloadAuthentic) {
    console.warn("REJECTED: Invalid Delegate Signature on payload.");
    return false;
  }

  // Bütün kontrollerden geçti!
  return true; 
}

// ─────────────────────────────────────────────
// 6. KV Şifreleme — Delegation Key Sistemi
// ─────────────────────────────────────────────

export interface SerializedECDHKey {
  publicKey: string;  // base64 SPKI
  privateKey: string; // base64 PKCS8
}

/** Decrypt yetkisi devir paketi — owner tarafından imzalanır, 10s TTL */
export interface DelegationKey {
  wrappedKey: string;    // base64 — AES-GCM data key, AES-KW ile sarmalanmış
  iv: string;            // base64 — sarmalama IV (AES-GCM ile sarmalandıysa)
  expiresAt: number;     // Unix ms
  ownerSignature: string;// base64
}

/** ECDH P-256 key pair üret (KV şifreleme için, ECDSA'dan ayrı) */
export async function generateECDHKeyPair(): Promise<SerializedECDHKey> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const [spki, pkcs8] = await Promise.all([
    crypto.subtle.exportKey("spki", pair.publicKey),
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
  ]);
  return { publicKey: bufferToBase64(spki), privateKey: bufferToBase64(pkcs8) };
}

async function importECDHPublicKey(spkiBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki", base64ToBuffer(spkiBase64),
    { name: "ECDH", namedCurve: "P-256" }, true, []
  );
}

async function importECDHPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8", base64ToBuffer(pkcs8Base64),
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]
  );
}

/** Değeri rastgele AES-GCM key ile şifreler; key'i owner'ın ECDH public key'iyle ECDH+AES-KW ile sarar */
export async function encryptKvValue(
  value: string,
  ownerECDHPublicKeySPKI: string
): Promise<{ ciphertext: string; iv: string; encryptedKey: string; keyIv: string }> {
  // 1. Tek kullanımlık AES-256-GCM data key
  const dataKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, true, ["encrypt"]
  );

  // 2. Value şifrele
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, dataKey, new TextEncoder().encode(value)
  );

  // 3. Data key'i owner'ın ECDH public key'iyle bir ECDH paylaşımlı sır ile sar
  const ownerPub = await importECDHPublicKey(ownerECDHPublicKeySPKI);
  // Ephemeral ECDH pair — wrap için
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
  );
  const wrapKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ownerPub },
    ephemeral.privateKey,
    { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  );
  const keyIvBytes = crypto.getRandomValues(new Uint8Array(12));
  const rawDataKey = await crypto.subtle.exportKey("raw", dataKey);
  const encryptedKeyBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: keyIvBytes }, wrapKey, rawDataKey
  );
  const ephemeralPubRaw = await crypto.subtle.exportKey("raw", ephemeral.publicKey);

  // encryptedKey = ephemeralPub(65B) + ciphertext, pipe ile birleştir
  const combined = new Uint8Array(65 + encryptedKeyBuf.byteLength);
  combined.set(new Uint8Array(ephemeralPubRaw), 0);
  combined.set(new Uint8Array(encryptedKeyBuf), 65);

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
    encryptedKey: bufferToBase64(combined.buffer),
    keyIv: bufferToBase64(keyIvBytes),
  };
}

/** Owner'ın kendi ECDH private key'i ile data key'i açar (kendi verisi için) */
export async function unwrapOwnDataKey(
  encryptedKey: string,
  keyIv: string,
  ownerECDHPrivateKeyPKCS8: string
): Promise<CryptoKey> {
  const combined = new Uint8Array(base64ToBuffer(encryptedKey));
  const ephemeralPubRaw = combined.slice(0, 65);
  const wrappedKey = combined.slice(65);

  const ownerPriv = await importECDHPrivateKey(ownerECDHPrivateKeyPKCS8);
  const ephemeralPub = await crypto.subtle.importKey(
    "raw", ephemeralPubRaw, { name: "ECDH", namedCurve: "P-256" }, true, []
  );
  const wrapKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ephemeralPub },
    ownerPriv,
    { name: "AES-GCM", length: 256 }, false, ["decrypt"]
  );
  const rawDataKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(keyIv)) },
    wrapKey, wrappedKey
  );
  return crypto.subtle.importKey("raw", rawDataKey, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/** Owner: gelen requester'ın ECDH public key'i ile data key'i sarar, imzalı DelegationKey üretir */
export async function wrapKeyForDelegation(
  dataKey: CryptoKey,
  requesterECDHPublicKeySPKI: string,
  ownerIdentity: IdentityKey,
  ttlMs = 10_000
): Promise<DelegationKey> {
  const requesterPub = await importECDHPublicKey(requesterECDHPublicKeySPKI);
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
  );
  const wrapKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: requesterPub },
    ephemeral.privateKey,
    { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawDataKey = await crypto.subtle.exportKey("raw", dataKey);
  const encryptedKeyBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, wrapKey, rawDataKey
  );
  const ephemeralPubRaw = await crypto.subtle.exportKey("raw", ephemeral.publicKey);
  const combined = new Uint8Array(65 + encryptedKeyBuf.byteLength);
  combined.set(new Uint8Array(ephemeralPubRaw), 0);
  combined.set(new Uint8Array(encryptedKeyBuf), 65);

  const expiresAt = Date.now() + ttlMs;
  const wrappedKey = bufferToBase64(combined.buffer);
  const ivB64 = bufferToBase64(iv);
  const sigBuf = await ownerIdentity.sign(`${wrappedKey}|${ivB64}|${expiresAt}`);

  return { wrappedKey, iv: ivB64, expiresAt, ownerSignature: bufferToBase64(sigBuf) };
}

/** Requester: DelegationKey'i kendi ECDH private key'iyle açar, data key'i alır */
export async function unwrapDelegationKey(
  delegation: DelegationKey,
  requesterECDHPrivateKeyPKCS8: string
): Promise<CryptoKey> {
  if (Date.now() > delegation.expiresAt) throw new Error("DelegationKey süresi dolmuş.");
  const combined = new Uint8Array(base64ToBuffer(delegation.wrappedKey));
  const ephemeralPubRaw = combined.slice(0, 65);
  const wrappedKey = combined.slice(65);

  const requesterPriv = await importECDHPrivateKey(requesterECDHPrivateKeyPKCS8);
  const ephemeralPub = await crypto.subtle.importKey(
    "raw", ephemeralPubRaw, { name: "ECDH", namedCurve: "P-256" }, true, []
  );
  const wrapKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ephemeralPub },
    requesterPriv,
    { name: "AES-GCM", length: 256 }, false, ["decrypt"]
  );
  const rawDataKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(delegation.iv)) },
    wrapKey, wrappedKey
  );
  return crypto.subtle.importKey("raw", rawDataKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}

/** Şifreli value'yu çözer */
export async function decryptKvValue(
  ciphertext: string,
  iv: string,
  dataKey: CryptoKey
): Promise<string> {
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(iv)) },
    dataKey,
    base64ToBuffer(ciphertext)
  );
  return new TextDecoder().decode(plainBuf);
}
