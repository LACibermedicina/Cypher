import { Router, Response, NextFunction } from 'express';
import { signatureService } from '../services/signature-service';
import type { User } from '../../shared/schema';

// Simple auth middleware - will be replaced with proper middleware from parent
const requireAuth = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Autenticação necessária' });
  }
  next();
};

const router = Router();

// Register digital key for doctor
router.post('/register-key', requireAuth, async (req, res) => {
  try {
    const user = req.user as User;

    if (user.role !== 'doctor' && user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Acesso negado: apenas médicos podem registrar chaves digitais' 
      });
    }

    const key = await signatureService.registerDigitalKey(user.id);

    res.json({
      success: true,
      message: 'Chave digital registrada com sucesso',
      keyId: key.id,
      publicKey: key.publicKey,
      certificateInfo: key.certificateInfo,
      expiresAt: key.expiresAt,
    });
  } catch (error) {
    console.error('Failed to register digital key:', error);
    const message = error instanceof Error ? error.message : 'Erro ao registrar chave digital';
    res.status(500).json({ message });
  }
});

// Sign a document
router.post('/sign', requireAuth, async (req, res) => {
  try {
    const user = req.user as User;

    if (user.role !== 'doctor' && user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Acesso negado: apenas médicos podem assinar documentos' 
      });
    }

    const { documentType, documentId, patientId, documentContent } = req.body;

    if (!documentType || !documentId || !patientId || !documentContent) {
      return res.status(400).json({ 
        message: 'Todos os campos são obrigatórios: documentType, documentId, patientId, documentContent' 
      });
    }

    const signatureId = await signatureService.signDocument(
      documentType,
      documentId,
      patientId,
      user.id,
      documentContent
    );

    const signature = await signatureService.getSignatureDetails(signatureId);

    res.json({
      success: true,
      message: 'Documento assinado com sucesso',
      signatureId,
      signature,
    });
  } catch (error) {
    console.error('Failed to sign document:', error);
    const message = error instanceof Error ? error.message : 'Erro ao assinar documento';
    res.status(500).json({ message });
  }
});

// Verify signature (public endpoint - no authentication required)
router.get('/verify/:signatureId', async (req, res) => {
  try {
    const { signatureId } = req.params;

    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const result = await signatureService.verifySignature(
      signatureId,
      ipAddress,
      'qr_code',
      ipAddress,
      userAgent
    );

    res.json(result);
  } catch (error) {
    console.error('Failed to verify signature:', error);
    res.status(500).json({ 
      isValid: false,
      details: { error: 'Erro ao verificar assinatura' }
    });
  }
});

// Get signature details
router.get('/details/:signatureId', requireAuth, async (req, res) => {
  try {
    const { signatureId } = req.params;

    const signature = await signatureService.getSignatureDetails(signatureId);

    if (!signature) {
      return res.status(404).json({ message: 'Assinatura não encontrada' });
    }

    res.json(signature);
  } catch (error) {
    console.error('Failed to fetch signature details:', error);
    res.status(500).json({ message: 'Erro ao buscar detalhes da assinatura' });
  }
});

// Get verification history
router.get('/verification-history/:signatureId', requireAuth, async (req, res) => {
  try {
    const user = req.user as User;

    if (user.role !== 'doctor' && user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Acesso negado: apenas médicos e admins podem ver histórico de verificações' 
      });
    }

    const { signatureId } = req.params;

    const history = await signatureService.getVerificationHistory(signatureId);

    res.json(history);
  } catch (error) {
    console.error('Failed to fetch verification history:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico de verificações' });
  }
});

// Export key to USB format
router.post('/export-key', requireAuth, async (req, res) => {
  try {
    const user = req.user as User;

    if (user.role !== 'doctor' && user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Acesso negado: apenas médicos podem exportar chaves' 
      });
    }

    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ 
        message: 'Senha é obrigatória e deve ter no mínimo 8 caracteres' 
      });
    }

    const usbData = await signatureService.exportKeyToUsb(user.id, password);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="digital-key-${user.id}.tmckey"`);
    res.send(usbData);
  } catch (error) {
    console.error('Failed to export key:', error);
    const message = error instanceof Error ? error.message : 'Erro ao exportar chave';
    res.status(500).json({ message });
  }
});

export default router;
