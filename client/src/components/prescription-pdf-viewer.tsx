import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Eye, Printer, Shield, Calendar } from "lucide-react";

interface PrescriptionPDFViewerProps {
  medicalRecordId: string;
  prescriptionText: string;
  isSignedDigitally?: boolean;
  signedAt?: string;
  patientName?: string;
}

export default function PrescriptionPDFViewer({ 
  medicalRecordId, 
  prescriptionText, 
  isSignedDigitally = false,
  signedAt,
  patientName 
}: PrescriptionPDFViewerProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [restDays, setRestDays] = useState<number>(1);
  const [cid10, setCid10] = useState<string>('');
  const { toast } = useToast();

  // Generate and download prescription PDF
  const downloadPrescriptionPDF = useMutation({
    mutationFn: () => {
      const url = `/api/medical-records/${medicalRecordId}/prescription-pdf`;
      window.open(url, '_blank');
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "PDF Gerado",
        description: "Receita médica aberta em nova aba para impressão.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF da receita.",
        variant: "destructive",
      });
    },
  });

  // Generate and download exam request PDF
  const downloadExamRequestPDF = useMutation({
    mutationFn: () => {
      const url = `/api/medical-records/${medicalRecordId}/exam-request-pdf`;
      window.open(url, '_blank');
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "PDF Gerado",
        description: "Solicitação de exames aberta em nova aba.",
      });
    },
  });

  // Generate medical certificate PDF
  const generateCertificatePDF = useMutation({
    mutationFn: (data: { restDays: number; cid10: string }) =>
      apiRequest('POST', `/api/medical-records/${medicalRecordId}/certificate-pdf`, data)
        .then(() => {
          const url = `/api/medical-records/${medicalRecordId}/certificate-pdf`;
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = url;
          form.target = '_blank';
          
          const restDaysInput = document.createElement('input');
          restDaysInput.type = 'hidden';
          restDaysInput.name = 'restDays';
          restDaysInput.value = data.restDays.toString();
          form.appendChild(restDaysInput);
          
          const cidInput = document.createElement('input');
          cidInput.type = 'hidden';
          cidInput.name = 'cid10';
          cidInput.value = data.cid10;
          form.appendChild(cidInput);
          
          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
        }),
    onSuccess: () => {
      toast({
        title: "Atestado Gerado",
        description: "Atestado médico aberto em nova aba.",
      });
      setIsCertificateOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao gerar atestado médico.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateCertificate = () => {
    if (restDays < 1 || restDays > 365) {
      toast({
        title: "Erro de Validação",
        description: "Número de dias deve ser entre 1 e 365.",
        variant: "destructive",
      });
      return;
    }

    generateCertificatePDF.mutate({ restDays, cid10 });
  };

  return (
    <Card data-testid="card-prescription-pdf-viewer" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Documentos Médicos</CardTitle>
              <p className="text-sm text-muted-foreground">
                {patientName && `Paciente: ${patientName}`}
              </p>
            </div>
          </div>
          
          {isSignedDigitally && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid="badge-digitally-signed">
              <Shield className="w-3 h-3 mr-1" />
              Assinado Digitalmente
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Prescription Preview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm flex items-center">
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              Receita Médica
            </h4>
            {signedAt && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 mr-1" />
                Assinado em {new Date(signedAt).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border text-sm">
            <div className="text-gray-600 dark:text-gray-300 line-clamp-3">
              {prescriptionText || "Nenhuma receita cadastrada"}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => downloadPrescriptionPDF.mutate()}
            disabled={downloadPrescriptionPDF.isPending || !prescriptionText}
            data-testid="button-download-prescription-pdf"
            className="flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadPrescriptionPDF.isPending ? "Gerando..." : "Receita PDF"}
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => downloadExamRequestPDF.mutate()}
            disabled={downloadExamRequestPDF.isPending}
            data-testid="button-download-exam-pdf"
            className="flex items-center justify-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            {downloadExamRequestPDF.isPending ? "Gerando..." : "Solicitação"}
          </Button>

          <Dialog open={isCertificateOpen} onOpenChange={setIsCertificateOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                data-testid="button-generate-certificate"
                className="flex items-center justify-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Atestado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Atestado Médico</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rest-days">Dias de Afastamento</Label>
                  <Input
                    id="rest-days"
                    type="number"
                    min="1"
                    max="365"
                    value={restDays}
                    onChange={(e) => setRestDays(parseInt(e.target.value) || 1)}
                    data-testid="input-rest-days"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cid10">CID-10 (Opcional)</Label>
                  <Input
                    id="cid10"
                    placeholder="Ex: Z76.3"
                    value={cid10}
                    onChange={(e) => setCid10(e.target.value)}
                    data-testid="input-cid10"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCertificateOpen(false)}
                    data-testid="button-cancel-certificate"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleGenerateCertificate}
                    disabled={generateCertificatePDF.isPending}
                    data-testid="button-confirm-certificate"
                  >
                    {generateCertificatePDF.isPending ? "Gerando..." : "Gerar Atestado"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.print()}
            data-testid="button-print"
            className="flex items-center justify-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>

        {/* Digital Signature Info */}
        {isSignedDigitally && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center text-sm text-green-800 dark:text-green-200">
              <Shield className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Receita Assinada Digitalmente</div>
                <div className="text-xs opacity-75">
                  Certificado ICP-Brasil A3 • Conforme Lei 14.063/2020
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Instructions */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <div className="font-medium mb-1">💡 Instruções:</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Receita PDF: Documento formatado para impressão e farmácias</li>
              <li>Solicitação: Pedidos de exames complementares</li> 
              <li>Atestado: Justificativa médica para afastamento</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}