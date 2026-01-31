import CryptoJS from 'crypto-js';

/**
 * Quantum-Safe Cryptography Utility (Client-Side)
 * 
 * Implements:
 * 1. BB84 Simulation (Entropy Generation)
 * 2. Kyber KEM Simulation (Post-Quantum Key Exchange)
 * 3. Hybrid KDF (HKDF with BB84 + Kyber)
 * 4. AES-256-GCM (Authenticated Encryption)
 */

/**
 * BB84 Simulation
 */
export const simulateBB84 = (numBits = 256) => {
  const aliceBits = [];
  const aliceBases = [];
  const bobBases = [];
  const bobMeasurements = [];
  
  // Alice & Bob generate random bases
  for (let i = 0; i < numBits; i++) {
    aliceBits.push(Math.floor(Math.random() * 2));
    aliceBases.push(Math.random() > 0.5 ? '+' : 'x');
    bobBases.push(Math.random() > 0.5 ? '+' : 'x');
  }

  // Sifting
  const siftedAliceBits = [];
  const siftedBobBits = [];
  for (let i = 0; i < numBits; i++) {
    if (aliceBases[i] === bobBases[i]) {
      siftedAliceBits.push(aliceBits[i]);
      // In real QKD, Bob's measurement matches Alice's if no eavesdropping
      bobMeasurements.push(aliceBits[i]);
      siftedBobBits.push(aliceBits[i]);
    }
  }

  // Calculate "Entropy" (The shared secret bits)
  const entropy = siftedAliceBits.join('');
  return {
    entropy,
    qber: 0.0, // Base QBER is 0 in simulation unless "Eve" is added
    siftedLength: siftedAliceBits.length
  };
};

const hasSubtleCrypto = () => typeof crypto !== 'undefined' && !!crypto.subtle;

const getRandomBytes = (length) => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

const u8ToWordArray = (u8) => CryptoJS.lib.WordArray.create(u8);

const wordArrayToU8 = (wordArray) => {
  const { words, sigBytes } = wordArray;
  const u8 = new Uint8Array(sigBytes);
  let byteIndex = 0;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    for (let j = 3; j >= 0 && byteIndex < sigBytes; j -= 1) {
      u8[byteIndex] = (word >> (j * 8)) & 0xff;
      byteIndex += 1;
    }
  }
  return u8;
};

/**
 * Kyber KEM Simulation
 * In a real app, this would use a WASM-compiled pqcrypto library.
 */
export const simulateKyber = () => {
  // Simulate a 256-bit shared secret (32 bytes)
  const sharedSecret = getRandomBytes(32);
  const publicKey = btoa(String.fromCharCode(...getRandomBytes(1184)));
  const ciphertext = btoa(String.fromCharCode(...getRandomBytes(1088)));

  return {
    sharedSecret,
    publicKey,
    ciphertext
  };
};

/**
 * Hybrid Key Derivation (HKDF)
 */
export const deriveHybridKey = async (bb84Entropy, kyberSecret, context = 'anonymous-report') => {
  const encoder = new TextEncoder();
  const bb84Bytes = encoder.encode(bb84Entropy);
  const combinedSecret = new Uint8Array(bb84Bytes.length + kyberSecret.length);
  combinedSecret.set(bb84Bytes);
  combinedSecret.set(kyberSecret, bb84Bytes.length);

  if (hasSubtleCrypto()) {
    // Use Web Crypto SHA-256 for KDF
    const hash = await crypto.subtle.digest('SHA-256', combinedSecret);
    // Import as AES Key
    return await crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Fallback for non-secure contexts: CryptoJS SHA-256
  return CryptoJS.SHA256(u8ToWordArray(combinedSecret));
};

/**
 * AES-256-GCM Encryption
 */
export const encryptPayload = async (plaintext, key) => {
  if (hasSubtleCrypto()) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const nonce = getRandomBytes(12);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce
      },
      key,
      data
    );

    // Combine nonce + ciphertext
    const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
    combined.set(nonce);
    combined.set(new Uint8Array(ciphertext), nonce.length);

    // Return base64 encoded
    return btoa(String.fromCharCode(...combined));
  }

  // Fallback AES (CryptoJS) for non-secure contexts
  const ivBytes = getRandomBytes(16);
  const iv = u8ToWordArray(ivBytes);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  const cipherBytes = wordArrayToU8(encrypted.ciphertext);
  const combined = new Uint8Array(ivBytes.length + cipherBytes.length);
  combined.set(ivBytes);
  combined.set(cipherBytes, ivBytes.length);
  return btoa(String.fromCharCode(...combined));
};

/**
 * Full BB84 QKD simulation with visualization (client-side fallback when backend unavailable)
 * Returns data compatible with QKDVisualizer and QBERChart
 */
export const runQKDSimulation = (numBits = 512, eavesdropper = false) => {
  const bases = ['rect', 'diag'];
  const aliceBits = [];
  const aliceBases = [];
  const bobBases = [];
  const bobMeasurements = [];
  const transmissions = [];
  const interceptedIndices = [];

  for (let i = 0; i < numBits; i++) {
    const aBit = Math.floor(Math.random() * 2);
    const aBasis = bases[Math.floor(Math.random() * 2)];
    const bBasis = bases[Math.floor(Math.random() * 2)];

    // Eve intercepts with ~50% probability when active
    let bMeasured = aBit;
    let eveBasisUsed = null;
    const intercepted = eavesdropper && Math.random() < 0.5;
    if (intercepted) {
      interceptedIndices.push(i);
      eveBasisUsed = bases[Math.floor(Math.random() * 2)];
      // Eve measures: if basis matches Alice, gets correct bit; else 50% error
      const eveMeasured = aBasis === eveBasisUsed ? aBit : Math.floor(Math.random() * 2);
      // Eve re-sends to Bob: Bob gets eveMeasured if his basis matches Eve's
      bMeasured = bBasis === eveBasisUsed ? eveMeasured : Math.floor(Math.random() * 2);
    } else if (aBasis === bBasis) {
      bMeasured = aBit;
    } else {
      bMeasured = Math.floor(Math.random() * 2); // Random when bases differ
    }

    aliceBits.push(aBit);
    aliceBases.push(aBasis);
    bobBases.push(bBasis);
    bobMeasurements.push(bMeasured);

    transmissions.push({
      index: i,
      alice_bit: aBit,
      alice_basis: aBasis,
      bob_basis: bBasis,
      bob_measurement: bMeasured,
      intercepted,
      bases_match: aBasis === bBasis,
      eve_basis: eveBasisUsed ?? undefined,
    });
  }

  // QBER: errors in sifted bits (where bases match)
  let errors = 0;
  let totalSifted = 0;
  const reconciledBits = [];
  for (let i = 0; i < numBits; i++) {
    if (aliceBases[i] === bobBases[i]) {
      totalSifted++;
      reconciledBits.push(bobMeasurements[i]);
      if (aliceBits[i] !== bobMeasurements[i]) errors++;
    }
  }
  const qber = totalSifted > 0 ? errors / totalSifted : 0;
  const sessionAborted = qber > 0.11;

  return {
    session_id: `qkd_${Math.random().toString(36).substring(2, 14)}`,
    qber,
    key_length: reconciledBits.length,
    total_bits_sent: numBits,
    bits_after_sifting: totalSifted,
    eavesdropper_detected: qber > 0.11,
    session_aborted: sessionAborted,
    eavesdropper_active: eavesdropper,
    visualization: {
      session_id: `qkd_${Math.random().toString(36).substring(2, 14)}`,
      total_transmissions: numBits,
      eavesdropper_active: eavesdropper,
      transmissions,
    },
  };
};

/**
 * Full Encryption Flow for Anonymous Report
 */
export const secureReportFlow = async (reportData, eavesdropper = false) => {
  // 1. QKD Simulation
  const qkd = simulateBB84(512);
  
  // Simulate eavesdropping if requested
  if (eavesdropper) {
    qkd.qber = 0.25 + Math.random() * 0.1; // 25-35% QBER
  }

  if (qkd.qber > 0.11) {
    return { error: 'intrusion_detected', qber: qkd.qber };
  }

  // 2. Kyber KEM
  const kyber = simulateKyber();

  // 3. Hybrid KDF
  const sessionKey = await deriveHybridKey(qkd.entropy, kyber.sharedSecret);

  // 4. AES Encryption
  const payloadJson = JSON.stringify(reportData);
  const encryptedPayload = await encryptPayload(payloadJson, sessionKey);

  return {
    encryptedPayload,
    qber: qkd.qber,
    sessionId: `qkd_${Math.random().toString(36).substring(7)}`,
    success: true
  };
};
