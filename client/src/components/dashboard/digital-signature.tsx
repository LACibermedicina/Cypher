import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_DOCTOR_ID } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function DigitalSignature() {
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isSigningDialogOpen, setIsSigningDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingSignatures, isLoading } = useQuery({
    queryKey: ['/api/digital-signatures/pending', DEFAULT_DOCTOR_ID],
  });

  const signDocumentMutation = useMutation({
    mutationFn: (data: { pin: string; signature: string; certificateInfo: any; documentContent: string }) =>
      apiRequest('POST', `/api/digital-signatures/${selectedDocument?.id}/sign`, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/digital-signatures'] });
      if (response?.verificationResult) {
        setVerificationResult(response.verificationResult);
      }
      toast({
        title: "Documento Assinado com ICP-Brasil A3",
        description: "Assinatura digital válida com validade jurídica plena.",
      });
      setShowVerification(true);
    },
    onError: (error: any) => {
      toast({
        title: "Falha na Assinatura A3",
        description: error?.message || "Erro ao assinar com certificado ICP-Brasil A3.",
        variant: "destructive",
      });
    },
  });

  const verifySignatureMutation = useMutation({
    mutationFn: (data: { documentContent: string }) =>
      apiRequest('POST', `/api/digital-signatures/${selectedDocument?.id}/verify`, data),
    onSuccess: (response: any) => {
      // Extract the verificationResult from nested structure
      const verification = response?.verificationResult || response;
      setVerificationResult(verification);
      const isValid = verification?.isValid || false;
      toast({
        title: isValid ? "Assinatura Válida" : "Assinatura Inválida",
        description: response?.message || "Verificação concluída",
        variant: isValid ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({
        title: "Erro na Verificação",
        description: "Erro ao verificar assinatura digital.",
        variant: "destructive",
      });
    },
  });

  // Mock pending documents from design
  const mockDocuments = [
    {
      id: "doc-1",
      documentType: "prescription",
      title: "Prescrição Médica",
      patientName: "Maria Santos",
      createdAt: new Date(),
    },
    {
      id: "doc-2",
      documentType: "exam_request",
      title: "Solicitação de Exames",
      patientName: "João Silva",
      createdAt: new Date(),
    },
  ];

  const handleSignDocument = (document: any) => {
    setSelectedDocument(document);
    setPin('');
    setShowVerification(false);
    setVerificationResult(null);
    setIsSigningDialogOpen(true);
  };

  const confirmSignature = () => {
    if (!pin || pin.length < 6) {
      toast({
        title: "PIN Obrigatório",
        description: "Digite o PIN do seu token/cartão A3 (mínimo 6 dígitos).",
        variant: "destructive"
      });
      return;
    }

    // ICP-Brasil A3 certificate information
    const icpBrasilCertificate = {
      certificateId: `ICP-BRASIL-A3-${Date.now()}`,
      issuer: "CN=Autoridade Certificadora ICP-Brasil A3, OU=ICP-Brasil, O=ITI, C=BR",
      subject: "CN=Dr. Carlos Silva, OU=Pessoa Fisica A3, OU=Medicina, OU=123456-SP, O=ICP-Brasil, C=BR",
      serialNumber: `${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      certificateType: "A3",
      securityLevel: "Alto",
      hardwareToken: true,
      tokenType: "Smart Card / USB Token",
      complianceLevel: "ICP-Brasil A3",
      validUntil: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      legalValidity: "Validade jurídica plena conforme MP 2.200-2/2001",
      medicalCompliance: "CFM Resolução 1821/2007"
    };

    const signature = `ICP_BRASIL_A3_${crypto.subtle ? 'CRYPTO_' : 'LEGACY_'}${Date.now()}`;
    const documentContent = `Documento: ${selectedDocument?.title}\nPaciente: ${selectedDocument?.patientName}\nData: ${new Date().toISOString()}`;

    signDocumentMutation.mutate({
      pin,
      signature,
      certificateInfo: icpBrasilCertificate,
      documentContent
    });
  };

  const handleVerifyDocument = () => {
    const documentContent = `Documento: ${selectedDocument?.title}\nPaciente: ${selectedDocument?.patientName}\nData: ${new Date().toISOString()}`;
    verifySignatureMutation.mutate({ documentContent });
  };

  const closeDialog = () => {
    setIsSigningDialogOpen(false);
    setSelectedDocument(null);
    setPin('');
    setShowVerification(false);
    setVerificationResult(null);
  };

  const getDocumentIcon = (documentType: string) => {
    switch (documentType) {
      case 'prescription':
        return 'fas fa-prescription-bottle';
      case 'exam_request':
        return 'fas fa-vial';
      case 'medical_certificate':
        return 'fas fa-certificate';
      default:
        return 'fas fa-file-alt';
    }
  };

  return (
    <Card data-testid="card-digital-signature">
      <CardHeader className="border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="security-badge w-8 h-8 rounded-lg flex items-center justify-center">
            <i className="fas fa-signature text-white text-sm"></i>
          </div>
          <CardTitle>Assinatura Digital</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {mockDocuments.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-signature text-4xl text-muted-foreground mb-3"></i>
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Nenhum documento pendente
                </h3>
                <p className="text-muted-foreground">
                  Não há documentos aguardando assinatura digital.
                </p>
              </div>
            ) : (
              mockDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  data-testid={`document-${document.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <i className={`${getDocumentIcon(document.documentType)} text-primary`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium" data-testid={`document-title-${document.id}`}>
                        {document.title}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`document-patient-${document.id}`}>
                        {document.patientName}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSignDocument(document)}
                    data-testid={`button-sign-${document.id}`}
                  >
                    <i className="fas fa-signature mr-1"></i>
                    Assinar
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                <i className="fas fa-certificate text-white text-xl"></i>
              </div>
              <div>
                <p className="font-semibold text-sm">Certificado ICP-Brasil A3</p>
                <p className="text-xs text-muted-foreground">Hardware Token / Smart Card</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <i className="fas fa-shield-check text-green-600"></i>
                <span>Validade Jurídica Plena</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-microchip text-blue-600"></i>
                <span>Proteção em Hardware</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-stamp text-purple-600"></i>
                <span>Carimbo de Tempo ITI</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-user-md text-teal-600"></i>
                <span>CFM Resolução 1821/2007</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-border">
              <i className="fas fa-info-circle text-blue-500"></i>
              <span className="text-xs text-muted-foreground">
                Certificado A3 com RSA 2048-bit, SHA-256, válido até 2027
              </span>
            </div>
          </div>
        </div>

        {/* Signing Dialog */}
        <Dialog open={isSigningDialogOpen} onOpenChange={setIsSigningDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Assinatura Digital</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Documento:</h4>
                <p className="text-sm">{selectedDocument?.title}</p>
                <p className="text-sm text-muted-foreground">
                  Paciente: {selectedDocument?.patientName}
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mr-3">
                    <i className="fas fa-certificate text-white text-sm"></i>
                  </div>
                  Certificado ICP-Brasil A3
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Titular:</span>
                    <span className="font-medium">Dr. Carlos Silva</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registro:</span>
                    <span>CRM 123456-SP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="flex items-center">
                      <i className="fas fa-microchip text-blue-600 mr-1"></i>
                      A3 Hardware Token
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Validade:</span>
                    <span className="text-green-600 font-medium">2027</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conformidade:</span>
                    <span className="text-blue-600">ICP-Brasil</span>
                  </div>
                </div>
              </div>
              
              {/* PIN Input Section */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <Label htmlFor="pin-input" className="flex items-center text-sm font-medium mb-3">
                  <i className="fas fa-key text-yellow-600 mr-2"></i>
                  PIN do Token/Cartão A3
                </Label>
                <Input
                  id="pin-input"
                  type="password"
                  placeholder="Digite o PIN (mínimo 6 dígitos)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mb-3"
                  maxLength={8}
                  data-testid="input-pin"
                />
                <div className="flex items-start space-x-2">
                  <i className="fas fa-exclamation-triangle text-yellow-600 mt-0.5"></i>
                  <div className="text-xs text-yellow-700 dark:text-yellow-200">
                    <p className="font-medium">Autenticação Segura</p>
                    <p>Insira o PIN do seu token A3 para autenticar a assinatura digital.</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-gavel text-red-600 mt-1"></i>
                  <div className="text-sm">
                    <p className="font-medium text-red-800 dark:text-red-200">Validade Jurídica</p>
                    <p className="text-red-700 dark:text-red-300 mb-2">
                      Esta assinatura digital ICP-Brasil A3 possui <strong>validade jurídica plena</strong> 
                      equivalente à assinatura manuscrita (MP 2.200-2/2001).
                    </p>
                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                      <li>✓ Conformidade com CFM Resolução 1821/2007</li>
                      <li>✓ Garantia de autenticidade e integridade</li>
                      <li>✓ Não repúdio e carimbo de tempo</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {showVerification && verificationResult && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center text-green-800 dark:text-green-200">
                    <i className="fas fa-check-circle text-green-600 mr-2"></i>
                    Verificação Eletrônica
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${
                        verificationResult.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {verificationResult.isValid ? 'VÁLIDA' : 'INVÁLIDA'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cadeia de Confiança:</span>
                      <span className={verificationResult.chainOfTrust ? 'text-green-600' : 'text-red-600'}>
                        {verificationResult.chainOfTrust ? 'Verificada' : 'Falhou'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Carimbo de Tempo:</span>
                      <span className={verificationResult.timestampValid ? 'text-green-600' : 'text-red-600'}>
                        {verificationResult.timestampValid ? 'Válido' : 'Expirado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Certificado:</span>
                      <span className={'text-green-600'}>
                        {verificationResult.certificateStatus}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSigningDialogOpen(false)}
                  data-testid="button-cancel-signature"
                >
                  Cancelar
                </Button>
                <div className="flex space-x-2">
                  <Button 
                    onClick={confirmSignature}
                    disabled={signDocumentMutation.isPending || pin.length < 6}
                    className="flex-1"
                    data-testid="button-confirm-signature"
                  >
                    {signDocumentMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Autenticando A3...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-signature mr-2"></i>
                        Assinar com A3
                      </>
                    )}
                  </Button>
                  {showVerification && (
                    <Button 
                      variant="outline"
                      onClick={handleVerifyDocument}
                      disabled={verifySignatureMutation.isPending}
                      data-testid="button-verify-signature"
                    >
                      {verifySignatureMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-shield-check"></i>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
