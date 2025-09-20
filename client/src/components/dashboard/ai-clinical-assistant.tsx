import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AIClinicalAssistant() {
  const [symptoms, setSymptoms] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Mock diagnostic hypotheses from design
  const mockHypotheses = [
    { condition: "Hipertensão Arterial", probability: 87 },
    { condition: "Diabetes Tipo 2", probability: 65 },
    { condition: "Dislipidemia", probability: 43 },
  ];

  const analyzeSymptomsMutation = useMutation({
    mutationFn: (data: { symptoms: string; history: string }) =>
      apiRequest('POST', '/api/medical-records/current-patient/analyze', data),
    onSuccess: (data) => {
      toast({
        title: "Análise IA Concluída",
        description: "Hipóteses diagnósticas geradas com base nos sintomas.",
      });
      setIsDialogOpen(false);
      setSymptoms("");
    },
    onError: () => {
      toast({
        title: "Erro na Análise",
        description: "Erro ao gerar hipóteses diagnósticas.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!symptoms.trim()) return;

    analyzeSymptomsMutation.mutate({
      symptoms,
      history: "Paciente do sexo feminino, 45 anos, sem comorbidades conhecidas."
    });
  };

  return (
    <Card data-testid="card-ai-clinical-assistant">
      <CardHeader className="border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="ai-indicator w-8 h-8 rounded-lg flex items-center justify-center">
            <i className="fas fa-brain text-white text-sm"></i>
          </div>
          <CardTitle>Assistente Clínico IA</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* AI Diagnostic Suggestions */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center">
            <i className="fas fa-lightbulb text-accent mr-2"></i>
            Hipóteses Diagnósticas
          </h4>
          <div className="space-y-2">
            {mockHypotheses.map((hypothesis, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between text-sm"
                data-testid={`hypothesis-${index}`}
              >
                <span data-testid={`hypothesis-condition-${index}`}>
                  {hypothesis.condition}
                </span>
                <Badge 
                  className={
                    hypothesis.probability >= 80 ? "bg-primary text-primary-foreground" :
                    hypothesis.probability >= 60 ? "bg-secondary text-secondary-foreground" :
                    "bg-muted text-muted-foreground"
                  }
                  data-testid={`hypothesis-probability-${index}`}
                >
                  {hypothesis.probability}%
                </Badge>
              </div>
            ))}
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="button-analyze-symptoms">
                <i className="fas fa-plus mr-2"></i>
                Analisar Novos Sintomas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Análise de Sintomas com IA</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Descreva os sintomas do paciente para análise da IA..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={4}
                  data-testid="textarea-symptoms-analysis"
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-analysis"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAnalyze}
                    disabled={!symptoms.trim() || analyzeSymptomsMutation.isPending}
                    data-testid="button-confirm-analysis"
                  >
                    {analyzeSymptomsMutation.isPending ? "Analisando..." : "Analisar com IA"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Ministry of Health Guidelines */}
        <div className="bg-accent/10 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center">
            <i className="fas fa-book-medical text-accent mr-2"></i>
            Diretrizes MS
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            Baseado nos protocolos do Ministério da Saúde para hipertensão arterial sistêmica (2020).
          </p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-accent hover:underline"
            data-testid="button-view-guidelines"
          >
            Ver diretrizes completas →
          </Button>
        </div>

        {/* Audio Transcription Status */}
        <div className="bg-secondary/10 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center">
            <i className="fas fa-microphone text-secondary mr-2"></i>
            Transcrição de Áudio
          </h4>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className="bg-green-100 text-green-800 text-xs" data-testid="badge-transcription-status">
              <i className="fas fa-check mr-1"></i>
              Pronto
            </Badge>
          </div>
          <Button 
            variant="link" 
            className="p-0 h-auto text-secondary hover:underline"
            data-testid="button-view-transcription"
          >
            Ver transcrição da última consulta →
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="sm" data-testid="button-clinical-protocols">
            <i className="fas fa-clipboard-list mr-2"></i>
            Protocolos
          </Button>
          <Button variant="outline" size="sm" data-testid="button-drug-interactions">
            <i className="fas fa-pills mr-2"></i>
            Interações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
