import type { DelegationToken, SignedValue } from "./utils";
import { IdentityKey, validateP2PWriteRequest } from "./utils"; // Yukarıdaki dosyanın adı neyse ona göre import et
// ArrayBuffer'ı Base64'e çevirmek için yardımcı (Örnek içinde imzaları string yapmak için)
const toB64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

async function runP2PDemo() {
  console.log("==================================================");
  console.log("   P2P IDENTITY & CAPABILITY AUTHENTICATION DEMO   ");
  console.log("==================================================\n");

  // ---------------------------------------------------------
  // 0. AKTÖRLERİN HAZIRLANMASI
  // ---------------------------------------------------------
  // Namespace Sahibi (Owner)
  const owner = await IdentityKey.generate();
  const ownerPublicKey = await owner.exportPublicKey();
  const targetNamespace = await IdentityKey.calculateNamespace(ownerPublicKey);

  console.log(`[Ağ Kurulumu] Owner oluşturuldu.`);
  console.log(`[Ağ Kurulumu] Hedef Namespace (SHA-256): ${targetNamespace}\n`);

  // Yetki Verilecek Kullanıcı (Delegate - Token Sahibi)
  const delegate = await IdentityKey.generate();
  const delegatePublicKey = await delegate.exportPublicKey();

  // ---------------------------------------------------------
  // SENARYO 1: OWNER DOĞRUDAN KENDİ NAMESPACE'İNE YAZIYOR
  // ---------------------------------------------------------
  console.log("--------------------------------------------------");
  console.log("SENARYO 1: Owner Doğrudan Kendi Alanına Yazıyor");
  console.log("--------------------------------------------------");

  const ownerPayload = JSON.stringify({
    msg: "Sistemin tek sahibiyim.",
    ts: Date.now(),
  });
  const ownerSigBuf = await owner.sign(ownerPayload);

  const signedValueByOwner: SignedValue = {
    payload: ownerPayload,
    ownerSignature: toB64(ownerSigBuf),
  };

  // Ağdaki bir node bu isteği aldığında doğrular:
  const result1 = await validateP2PWriteRequest(
    targetNamespace,
    "profile/avatar", // Key fark etmez, owner her yere yazabilir
    signedValueByOwner,
    ownerPublicKey,
  );
  console.log(
    `>> İstek Sonucu: ${result1 ? "✅ KABUL EDİLDİ" : "❌ REDDEDİLDİ"}\n`,
  );

  // ---------------------------------------------------------
  // SENARYO 2: DELEGATE, ALDIĞI İZİN (TOKEN) İLE YAZIYOR
  // ---------------------------------------------------------
  console.log("--------------------------------------------------");
  console.log("SENARYO 2: Yetkili Kullanıcı (Delegate) Yazıyor");
  console.log("--------------------------------------------------");

  // 1. Adım: Owner, delegate için bir token hazırlar ve imzalar
  const allowedPatterns = ["posts/*", "comments/*"];
  const expiresAt = Date.now() + 1000 * 60 * 60; // 1 saat geçerli

  const tokenDataToSign = JSON.stringify({
    delegatePublicKey: delegatePublicKey,
    allowedKeys: allowedPatterns,
    expiresAt: expiresAt,
  });
  const tokenSigBuf = await owner.sign(tokenDataToSign);

  const validToken: DelegationToken = {
    delegatePublicKey: delegatePublicKey,
    allowedKeys: allowedPatterns,
    expiresAt: expiresAt,
    ownerSignature: toB64(tokenSigBuf),
  };

  // 2. Adım: Delegate, izin verilen bir key'e ("posts/42") veri yazar ve imzalar
  const delegatePayload = JSON.stringify({
    title: "P2P Harika",
    content: "UCAN mimarisi devrede.",
  });
  const delegatePayloadSigBuf = await delegate.sign(delegatePayload);

  const signedValueByDelegate: SignedValue = {
    payload: delegatePayload,
    token: validToken,
    delegateSignature: toB64(delegatePayloadSigBuf),
  };

  // Ağdaki bir node doğrular:
  const result2 = await validateP2PWriteRequest(
    targetNamespace,
    "posts/42", // "posts/*" pattern'ına uyuyor!
    signedValueByDelegate,
    ownerPublicKey,
  );
  console.log(
    `>> İstek Sonucu: ${result2 ? "✅ KABUL EDİLDİ" : "❌ REDDEDİLDİ"}\n`,
  );

  // ---------------------------------------------------------
  // SENARYO 3: DELEGATE, YETKİSİ DIŞINDAKİ BİR ALANA SIZMAYA ÇALIŞIYOR
  // ---------------------------------------------------------
  console.log("--------------------------------------------------");
  console.log("SENARYO 3: Yetki İhlali Denemesi (Saldırı / Hata)");
  console.log("--------------------------------------------------");

  // Delegate elindeki aynı token'ı kullanarak yetkisiz bir alana ("settings/config") yazmaya çalışıyor
  const result3 = await validateP2PWriteRequest(
    targetNamespace,
    "settings/config", // İLLEGAL KEY: Token sadece "posts/*" ve "comments/*" için geçerli!
    signedValueByDelegate,
    ownerPublicKey,
  );
  console.log(
    `>> İstek Sonucu: ${result3 ? "✅ KABUL EDİLDİ" : "❌ REDDEDİLDİ (Güvenlik Duvarı Çalıştı)"}\n`,
  );
}

// Demoyu çalıştır
runP2PDemo().catch(console.error);
