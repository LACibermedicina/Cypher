import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function DigitalSignature() {
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isSigningDialogOpen, setIsSigningDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingSignatures, isLoading } = useQuery({
    queryKey: ['/api/digital-signatures/pending/doctor-id'],
  });

  const signDocumentMutation = useMutation({
    mutationFn: (data: { signature: string; certificateInfo: any }) =>
      apiRequest('POST', `/api/digital-signatures/${selectedDocument?.id}/sign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/digital-signatures'] });
      toast({
        title: "Documento Assinado",
        description: "O documento foi assinado digitalmente com sucesso.",
      });
      setIsSigningDialogOpen(false);
      setSelectedDocument(null);
    },
    onError: () => {
      toast({
        title: "Erro na Assinatura",
        description: "Erro ao assinar documento digitalmente.",
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
    setIsSigningDialogOpen(true);
  };

  const confirmSignature = () => {
    // Mock signature process
    const mockSignature = "DIGITAL_SIGNATURE_HASH_" + Date.now();
    const mockCertificateInfo = {
      certificateId: "A3_CERT_2024",
      issuer: "ICP-Brasil",
      validUntil: "2025-08-15",
      algorithm: "SHA-256 with RSA"
    };

    signDocumentMutation.mutate({
      signature: mockSignature,
      certificateInfo: mockCertificateInfo,
    });
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
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <i className="fas fa-shield-alt text-accent"></i>
            <span data-testid="text-certificate-info">
              Certificado Digital A3 • Válido até 15/08/2025
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            <i className="fas fa-lock text-accent"></i>
            <span>Assinatura com carimbo de tempo ICP-Brasil</span>
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

              <div className="bg-accent/10 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <i className="fas fa-certificate text-accent mr-2"></i>
                  Certificado Digital
                </h4>
                <div className="space-y-1 text-sm">
                  <p>Dr. Carlos Silva</p>
                  <p className="text-muted-foreground">CRM: 123456-SP</p>
                  <p className="text-muted-foreground">Certificado A3 - ICP-Brasil</p>
                  <p className="text-muted-foreground">Válido até: 15/08/2025</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Atenção</p>
                    <p className="text-yellow-700">
                      A assinatura digital possui validade jurídica equivalente à assinatura manuscrita.
                      Verifique cuidadosamente o conteúdo antes de assinar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSigningDialogOpen(false)}
                  data-testid="button-cancel-signature"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmSignature}
                  disabled={signDocumentMutation.isPending}
                  data-testid="button-confirm-signature"
                >
                  {signDocumentMutation.isPending ? "Assinando..." : "Confirmar Assinatura"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
