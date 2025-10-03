import { db } from "../db";
import { digitalKeys, digitalSignatures, signatureVerifications, users, prescriptions } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";

export class SignatureService {
  
  /**
   * Generate RSA key pair for doctor
   */
  async generateKeyPair(doctorId: string): Promise<{ publicKey: string; privateKeyEncrypted: string }> {
    // Generate 2048-bit RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Encrypt private key with AES-256-CBC
    const encryptionKey = crypto.randomBytes(32); // 256 bits
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Store encryption key and IV with encrypted data
    const privateKeyEncrypted = JSON.stringify({
      encrypted,
      encryptionKey: encryptionKey.toString('hex'),
      iv: iv.toString('hex')
    });

    return { publicKey, privateKeyEncrypted };
  }

  /**
   * Decrypt private key (for signing)
   */
  decryptPrivateKey(privateKeyEncrypted: string): string {
    const data = JSON.parse(privateKeyEncrypted);
    const encryptionKey = Buffer.from(data.encryptionKey, 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Register or update digital key for doctor
   */
  async registerDigitalKey(doctorId: string) {
    // Check if key already exists
    const existing = await db.select()
      .from(digitalKeys)
      .where(eq(digitalKeys.doctorId, doctorId))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    // Generate new key pair
    const { publicKey, privateKeyEncrypted } = await this.generateKeyPair(doctorId);

    // Get doctor info for certificate
    const doctor = await db.select({
      name: users.name,
      email: users.email,
      medicalLicense: users.medicalLicense,
      specialization: users.specialization,
    })
      .from(users)
      .where(eq(users.id, doctorId))
      .limit(1);

    const certificateInfo = {
      subject: doctor[0].name,
      email: doctor[0].email,
      medicalLicense: doctor[0].medicalLicense,
      specialization: doctor[0].specialization,
      issuer: 'Telemed Digital Signature Authority',
      issuedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    };

    // Store in database
    const key = await db.insert(digitalKeys).values({
      doctorId,
      publicKey,
      privateKeyEncrypted,
      keyAlgorithm: 'RSA',
      keySize: 2048,
      certificateInfo,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    }).returning();

    return key[0];
  }

  /**
   * Hash document content
   */
  hashDocument(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Sign document with doctor's private key
   */
  async signDocument(
    documentType: 'prescription' | 'exam_request' | 'medical_certificate',
    documentId: string,
    patientId: string,
    doctorId: string,
    documentContent: string
  ): Promise<string> {
    // Get doctor's digital key
    const keyData = await db.select()
      .from(digitalKeys)
      .where(eq(digitalKeys.doctorId, doctorId))
      .limit(1);

    if (!keyData[0]) {
      throw new Error("Doctor does not have a digital key. Please register one first.");
    }

    if (!keyData[0].isActive) {
      throw new Error("Doctor's digital key is inactive.");
    }

    // Hash document
    const documentHash = this.hashDocument(documentContent);

    // Decrypt private key
    const privateKey = this.decryptPrivateKey(keyData[0].privateKeyEncrypted);

    // Sign hash
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(documentHash);
    const signature = sign.sign(privateKey, 'hex');

    // Create verification URL
    const signatureId = crypto.randomUUID();
    const verificationUrl = `/verify-signature/${signatureId}`;

    // Generate QR code data
    const qrData = JSON.stringify({
      id: signatureId,
      type: documentType,
      documentId,
      doctorId,
      patientId,
      hash: documentHash,
      timestamp: new Date().toISOString(),
      verificationUrl: `${process.env.REPLIT_DEV_DOMAIN || 'https://telemed.replit.app'}${verificationUrl}`,
    });

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    // Save QR code to file system
    const qrCodeDir = path.join(process.cwd(), 'uploads', 'qr-codes');
    await fs.mkdir(qrCodeDir, { recursive: true });
    
    const qrCodeFilename = `${signatureId}.png`;
    const qrCodePath = path.join(qrCodeDir, qrCodeFilename);
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    await fs.writeFile(qrCodePath, qrCodeBuffer);

    const qrCodeUrl = `/uploads/qr-codes/${qrCodeFilename}`;

    // Store signature in database
    await db.insert(digitalSignatures).values({
      id: signatureId,
      documentType,
      documentId,
      patientId,
      doctorId,
      digitalKeyId: keyData[0].id,
      documentHash,
      signature,
      qrCodeData: qrData,
      qrCodeUrl,
      verificationUrl,
      status: 'signed',
      signedAt: new Date(),
    });

    // Update key last used
    await db.update(digitalKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(digitalKeys.id, keyData[0].id));

    return signatureId;
  }

  /**
   * Verify signature authenticity
   */
  async verifySignature(
    signatureId: string,
    verifiedBy?: string,
    verificationMethod: string = 'qr_code',
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ isValid: boolean; details: any }> {
    // Get signature data
    const signatureData = await db.select()
      .from(digitalSignatures)
      .where(eq(digitalSignatures.id, signatureId))
      .limit(1);

    if (!signatureData[0]) {
      return {
        isValid: false,
        details: { error: "Signature not found" }
      };
    }

    const signature = signatureData[0];

    // Get doctor's public key
    const keyData = await db.select()
      .from(digitalKeys)
      .where(eq(digitalKeys.id, signature.digitalKeyId!))
      .limit(1);

    if (!keyData[0]) {
      return {
        isValid: false,
        details: { error: "Digital key not found" }
      };
    }

    // Verify signature using public key
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signature.documentHash);
    const isValid = verify.verify(keyData[0].publicKey, signature.signature, 'hex');

    // Get doctor info
    const doctor = await db.select({
      name: users.name,
      medicalLicense: users.medicalLicense,
      specialization: users.specialization,
    })
      .from(users)
      .where(eq(users.id, signature.doctorId))
      .limit(1);

    const validationDetails = {
      isValid,
      signedAt: signature.signedAt,
      documentType: signature.documentType,
      documentId: signature.documentId,
      doctor: doctor[0],
      certificateInfo: keyData[0].certificateInfo,
      verificationTimestamp: new Date().toISOString(),
    };

    // Record verification
    await db.insert(signatureVerifications).values({
      signatureId,
      verifiedBy,
      verificationMethod,
      isValid,
      validationDetails,
      ipAddress,
      userAgent,
    });

    // Update signature verification count
    await db.update(digitalSignatures)
      .set({ 
        verificationCount: (signature.verificationCount || 0) + 1,
        lastVerifiedAt: new Date(),
        status: isValid ? 'verified' : signature.status,
      })
      .where(eq(digitalSignatures.id, signatureId));

    return {
      isValid,
      details: validationDetails
    };
  }

  /**
   * Export private key to USB format (encrypted PKCS#12)
   */
  async exportKeyToUsb(doctorId: string, password: string): Promise<Buffer> {
    const keyData = await db.select()
      .from(digitalKeys)
      .where(eq(digitalKeys.doctorId, doctorId))
      .limit(1);

    if (!keyData[0]) {
      throw new Error("Doctor does not have a digital key");
    }

    // Decrypt private key
    const privateKey = this.decryptPrivateKey(keyData[0].privateKeyEncrypted);

    // Create PKCS#12 format (would need additional library like 'node-forge' for real implementation)
    // For now, we'll create an encrypted JSON format
    const exportData = {
      privateKey,
      publicKey: keyData[0].publicKey,
      certificateInfo: keyData[0].certificateInfo,
      exportedAt: new Date().toISOString(),
    };

    // Encrypt with user's password
    const encryptionKey = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    
    let encrypted = cipher.update(JSON.stringify(exportData), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const usbData = {
      format: 'TELEMED_DIGITAL_KEY',
      version: '1.0',
      encrypted,
      iv: iv.toString('hex'),
      doctorId,
      exportedAt: new Date().toISOString(),
    };

    // Mark as exported
    await db.update(digitalKeys)
      .set({ 
        isExportedToUsb: true,
        usbExportedAt: new Date(),
      })
      .where(eq(digitalKeys.id, keyData[0].id));

    return Buffer.from(JSON.stringify(usbData, null, 2), 'utf8');
  }

  /**
   * Get signature details for display
   */
  async getSignatureDetails(signatureId: string) {
    const signature = await db.select()
      .from(digitalSignatures)
      .where(eq(digitalSignatures.id, signatureId))
      .limit(1);

    if (!signature[0]) {
      return null;
    }

    const doctor = await db.select({
      name: users.name,
      medicalLicense: users.medicalLicense,
      specialization: users.specialization,
    })
      .from(users)
      .where(eq(users.id, signature[0].doctorId))
      .limit(1);

    return {
      ...signature[0],
      doctor: doctor[0],
    };
  }

  /**
   * Get verification history for signature
   */
  async getVerificationHistory(signatureId: string) {
    return await db.select()
      .from(signatureVerifications)
      .where(eq(signatureVerifications.signatureId, signatureId))
      .orderBy(desc(signatureVerifications.createdAt));
  }
}

export const signatureService = new SignatureService();
