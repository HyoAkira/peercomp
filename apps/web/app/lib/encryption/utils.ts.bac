/**
 * crypto.ts — Signed Diffie-Hellman Key Exchange
 *
 * Mimari:
 *   IdentityKey  → kalıcı ECDSA kimlik çifti (imzalama / doğrulama)
 *   SessionKey   → tek seferlik ECDH oturum çifti (shared key türetme)
 *   CryptoSession → tam bir DH el sıkışmasını + AES-GCM şifrelemeyi yönetir
 *
 * Kullanım örneği dosyanın en altında yer almaktadır.
 */

// ─────────────────────────────────────────────
// Yardımcı dönüşüm fonksiyonları
// ─────────────────────────────────────────────

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// ─────────────────────────────────────────────
// Tipler
// ─────────────────────────────────────────────

/** export() çıktısı — JSON-serializable, localStorage / IndexedDB'e yazılabilir */
export interface SerializedIdentityKey {
  publicKey: string;  // base64 SPKI
  privateKey: string; // base64 PKCS8
}

/** Karşı tarafa iletilecek oturum paketi */
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

// ─────────────────────────────────────────────
// IdentityKey — kalıcı ECDSA kimlik çifti
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
   * Mevcut bir çifti içe aktar.
   * Kaynak: localStorage, IndexedDB, Dexie, vb.
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
}

// ─────────────────────────────────────────────
// CryptoSession — tam DH oturumu
// ─────────────────────────────────────────────

export class CryptoSession {
  private sharedKey: CryptoKey | null = null;

  private ecdhPublicKey: CryptoKey | null = null;
  private ecdhPrivateKey: CryptoKey | null = null;

  private constructor(private readonly identity: IdentityKey) {}

  static create(identity: IdentityKey): CryptoSession {
    return new CryptoSession(identity);
  }

  // ── El Sıkışma: Başlatan taraf ──────────────

  /**
   * 1. Adım (Initiator): ECDH çifti üret, ECDH public key'i kimlik key'i ile
   * imzala, karşı tarafa gönderilecek paketi döndür.
   */
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

  /**
   * 2. Adım (Responder): Gelen paketi doğrula, kendi ECDH çiftini üret,
   * shared key'i türet ve cevap paketini döndür.
   */
  async acceptHandshake(
    incomingPacket: SessionHandshakePacket
  ): Promise<SessionHandshakePacket> {
    // Gelen ECDH public key'i imzayla doğrula
    const remoteEcdhKey = await this._verifyAndImport(incomingPacket);

    // Kendi ECDH çiftini üret
    const ecdhPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    this.ecdhPublicKey = ecdhPair.publicKey;
    this.ecdhPrivateKey = ecdhPair.privateKey;

    // Shared key türet
    this.sharedKey = await crypto.subtle.deriveKey(
      { name: "ECDH", public: remoteEcdhKey },
      this.ecdhPrivateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    // Cevap paketini oluştur
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

  /**
   * 3. Adım (Initiator): Responder'ın cevap paketini doğrula,
   * shared key'i türet. Bundan sonra şifreleme / deşifreleme kullanılabilir.
   */
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

  // ── Şifreleme / Deşifreleme ──────────────────

  /** AES-GCM ile string veya binary veri şifrele */
  async encrypt(data: string | ArrayBuffer): Promise<EncryptedPacket> {
    this._assertReady();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const payload =
      typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);

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

  /** Şifreli paketi deşifrele — string döndürür */
  async decryptText(packet: EncryptedPacket): Promise<string> {
    const buf = await this._decrypt(packet);
    return new TextDecoder().decode(buf);
  }

  /** Şifreli paketi deşifrele — ham ArrayBuffer döndürür (binary / image için) */
  async decryptBinary(packet: EncryptedPacket): Promise<ArrayBuffer> {
    return this._decrypt(packet);
  }

  // ── Özel yardımcılar ────────────────────────

  private async _decrypt(packet: EncryptedPacket): Promise<ArrayBuffer> {
    this._assertReady();
    return crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(packet.iv)) },
      this.sharedKey!,
      base64ToBuffer(packet.ciphertext)
    );
  }

  private _assertReady(): void {
    if (!this.sharedKey) {
      throw new Error(
        "Shared key henüz türetilmedi. El sıkışmayı tamamlayın."
      );
    }
  }

  /**
   * Gelen paketin imzasını doğrular ve ECDH public key'i import eder.
   * MITM koruması burada sağlanır.
   */
  private async _verifyAndImport(packet: SessionHandshakePacket): Promise<CryptoKey> {
    const remoteIdentityKey = await IdentityKey.importPublicKey(
      packet.identityPublicKeySPKI
    );

    const rawEcdh = base64ToBuffer(packet.ecdhPublicKeyRaw);
    const signature = base64ToBuffer(packet.signature);

    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      remoteIdentityKey,
      signature,
      rawEcdh
    );

    if (!valid) throw new Error("MITM tespit edildi: imza geçersiz.");

    return crypto.subtle.importKey(
      "raw",
      rawEcdh,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
  }
}

// ─────────────────────────────────────────────
// Kullanım Örneği
// ─────────────────────────────────────────────
//
// ── Alice tarafı ────────────────────────────
//
//   const aliceIdentity = await IdentityKey.generate();
//
//   // Kimliği kalıcı depola (Dexie / localStorage)
//   const serialized = await aliceIdentity.export();
//   localStorage.setItem("identity", JSON.stringify(serialized));
//
//   // Oturum oluştur ve handshake paketi hazırla
//   const aliceSession = CryptoSession.create(aliceIdentity);
//   const alicePacket = await aliceSession.createHandshakePacket();
//   // → alicePacket'i Bob'a ilet (WebRTC data channel, DHT, vb.)
//
// ── Bob tarafı ──────────────────────────────
//
//   const bobIdentity = await IdentityKey.generate();
//   const bobSession = CryptoSession.create(bobIdentity);
//
//   // Alice'in paketini kabul et, cevap paketini üret
//   const bobPacket = await bobSession.acceptHandshake(alicePacket);
//   // → bobPacket'i Alice'e ilet
//
// ── Alice — handshake'i tamamla ─────────────
//
//   await aliceSession.finalizeHandshake(bobPacket);
//
// ── Artık şifreli iletişim mümkün ───────────
//
//   const encrypted = await aliceSession.encrypt("Merhaba Bob!");
//   const text = await bobSession.decryptText(encrypted);
//   console.log(text); // "Merhaba Bob!"
//
// ── Kimliği sonradan tekrar yükle ───────────
//
//   const saved = JSON.parse(localStorage.getItem("identity")!);
//   const aliceIdentityLoaded = await IdentityKey.import(saved);

// // ---------- ECDH ----------
// export async function generateKeyPair() {
//   return crypto.subtle.generateKey(
//     { name: "ECDH", namedCurve: "P-256" },
//     true,
//     ["deriveKey"]
//   );
// }

// export async function generateSharedKey(otherPublicKey, privateKey) {
//   return crypto.subtle.deriveKey(
//     { name: "ECDH", public: otherPublicKey },
//     privateKey,
//     { name: "AES-GCM", length: 256 },
//     false,
//     ["encrypt", "decrypt"]
//   );
// }

// // ---------- ECDSA (identity) ----------
// export async function generateIdentityKey() {
//   return crypto.subtle.generateKey(
//     { name: "ECDSA", namedCurve: "P-256" },
//     true,
//     ["sign", "verify"]
//   );
// }

// // ECDH public key’i imzala
// export async function signPublicKey(publicKey, identityPrivateKey) {
//   const raw = await crypto.subtle.exportKey("raw", publicKey);

//   const signature = await crypto.subtle.sign(
//     { name: "ECDSA", hash: "SHA-256" },
//     identityPrivateKey,
//     raw
//   );

//   return { raw, signature };
// }

// // doğrula + usable public key'e çevir
// export async function verifyAndImportPublicKey(
//   raw,
//   signature,
//   identityPublicKey
// ) {
//   const ok = await crypto.subtle.verify(
//     { name: "ECDSA", hash: "SHA-256" },
//     identityPublicKey,
//     signature,
//     raw
//   );

//   if (!ok) throw new Error("MITM detected: signature invalid");

//   return crypto.subtle.importKey(
//     "raw",
//     raw,
//     { name: "ECDH", namedCurve: "P-256" },
//     true,
//     []
//   );
// }

// // ---------- AES ----------
// export async function encrypt(sharedKey, data, dataType: "string" | "image") {
//   if (dataType === "string") {
//     data = new TextEncoder().encode(data);
//   }
//   if (dataType === "image") {
//     data = new Uint8Array(data);
//   }
//   const iv = crypto.getRandomValues(new Uint8Array(12));
//   const encrypted = await crypto.subtle.encrypt(
//     { name: "AES-GCM", iv },
//     sharedKey,
//     data
//   );
//   return { encrypted, iv };
// }

// export async function decrypt(sharedKey, encrypted, iv) {
//   const decrypted = await crypto.subtle.decrypt(
//     { name: "AES-GCM", iv },
//     sharedKey,
//     encrypted
//   );
//   return decrypted;
// }

// // Herhangi bir string/object veriyi ECDSA ile imzalar (Token veya İstek doğrulamak için)
// export async function signData(data: string, identityPrivateKey: CryptoKey): Promise<ArrayBuffer> {
//   const encoder = new TextEncoder();
//   const encodedData = encoder.encode(data);

//   return crypto.subtle.sign(
//     { name: "ECDSA", hash: "SHA-256" },
//     identityPrivateKey,
//     encodedData
//   );
// }

// // İmzanın gerçekten o public key sahibine ait olup olmadığını doğrular
// export async function verifyDataSignature(
//   data: string,
//   signature: ArrayBuffer,
//   identityPublicKey: CryptoKey
// ): Promise<boolean> {
//   const encoder = new TextEncoder();
//   const encodedData = encoder.encode(data);

//   return crypto.subtle.verify(
//     { name: "ECDSA", hash: "SHA-256" },
//     identityPublicKey,
//     signature,
//     encodedData
//   );
// }