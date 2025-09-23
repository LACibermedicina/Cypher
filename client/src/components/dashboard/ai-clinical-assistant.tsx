import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brain, Lightbulb, BookOpen, Mic, ClipboardList, Pill } from "lucide-react";

interface DiagnosticHypothesis {
  condition?: string;
  diagnosis?: string;
  name?: string;
  probability?: number;
  confidence?: number;
}

interface DiagnosticAnalysisResponse {
  analysis: string;
  hypotheses: DiagnosticHypothesis[];
}

interface ConsultationTranscription {
  id: string;
  date: string;
  patientName: string;
  text: string;
  preview?: string;
}

export default function AIClinicalAssistant() {
  const [symptoms, setSymptoms] = useState("");
  const [patientHistory, setPatientHistory] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticAnalysisResponse | null>(null);
  const { toast } = useToast();

  // Get recent transcriptions from consultations
  const { data: recentTranscriptions, isLoading: transcriptionsLoading, error: transcriptionsError } = useQuery<ConsultationTranscription[]>({
    queryKey: ['/api/consultations/recent-transcriptions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data: any) => data || [],
    retry: 1
  });

  const analyzeSymptomsMutation = useMutation({
    mutationFn: async (data: { symptoms: string; patientHistory: string }) => {
      const response = await apiRequest('POST', '/api/ai/diagnostic-analysis', data);
      return await response.json() as DiagnosticAnalysisResponse;
    },
    onSuccess: (data) => {
      setDiagnosticResults(data);
      toast({
        title: "Análise IA Concluída",
        description: "Hipóteses diagnósticas geradas com base nos sintomas.",
      });
      setIsDialogOpen(false);
      setSymptoms("");
      setPatientHistory("");
    },
    onError: () => {
      toast({
        title: "Erro na Análise",
        description: "Erro ao gerar hipóteses diagnósticas.",
        variant: "destructive",
      });
    },
  });

  // Default hypotheses when no analysis has been performed yet
  const defaultHypotheses = [
    { condition: "Hipertensão Arterial", probability: 87 },
    { condition: "Diabetes Tipo 2", probability: 65 },
    { condition: "Dislipidemia", probability: 43 },
  ];

  const displayedHypotheses = (diagnosticResults?.hypotheses && diagnosticResults.hypotheses.length > 0)
    ? diagnosticResults.hypotheses 
    : defaultHypotheses;

  const handleAnalyze = () => {
    if (!symptoms.trim()) return;

    analyzeSymptomsMutation.mutate({
      symptoms,
      patientHistory: patientHistory || "Histórico não informado."
    });
  };

  const quickAnalyzeFromTranscription = async (transcription: string) => {
    try {
      const response = await apiRequest('POST', '/api/ai/diagnostic-analysis', {
        symptoms: transcription,
        patientHistory: "Baseado em transcrição de consulta anterior."
      });
      const data = await response.json() as DiagnosticAnalysisResponse;
      setDiagnosticResults(data);
      toast({
        title: "Análise da Transcrição Concluída",
        description: "Hipóteses geradas a partir da transcrição da consulta.",
      });
    } catch (error) {
      toast({
        title: "Erro na Análise",
        description: "Erro ao analisar transcrição.",
        variant: "destructive",
      });
    }
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
            {displayedHypotheses.map((hypothesis: any, index: number) => (
              <div 
                key={index} 
                className="flex items-center justify-between text-sm"
                data-testid={`hypothesis-${index}`}
              >
                <span data-testid={`hypothesis-condition-${index}`}>
                  {hypothesis.condition || hypothesis.diagnosis || hypothesis.name}
                </span>
                <Badge 
                  className={
                    (hypothesis.probability || hypothesis.confidence || 0) >= 80 ? "bg-primary text-primary-foreground" :
                    (hypothesis.probability || hypothesis.confidence || 0) >= 60 ? "bg-secondary text-secondary-foreground" :
                    "bg-muted text-muted-foreground"
                  }
                  data-testid={`hypothesis-probability-${index}`}
                >
                  {hypothesis.probability || hypothesis.confidence || 0}%
                </Badge>
              </div>
            ))}
            
            {diagnosticResults?.analysis && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Análise IA:</strong> {diagnosticResults.analysis}
                </p>
              </div>
            )}
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
                <div>
                  <Label htmlFor="symptoms-input" className="text-sm font-medium">
                    Sintomas do Paciente
                  </Label>
                  <Textarea
                    id="symptoms-input"
                    placeholder="Descreva os sintomas do paciente para análise da IA..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={4}
                    data-testid="textarea-symptoms-analysis"
                  />
                </div>
                
                <div>
                  <Label htmlFor="history-input" className="text-sm font-medium">
                    Histórico Médico (Opcional)
                  </Label>
                  <Textarea
                    id="history-input"
                    placeholder="Histórico médico, comorbidades, medicamentos em uso..."
                    value={patientHistory}
                    onChange={(e) => setPatientHistory(e.target.value)}
                    rows={3}
                    data-testid="textarea-patient-history"
                  />
                </div>
                
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
            Transcrições Recentes
          </h4>
          
          {(recentTranscriptions && recentTranscriptions.length > 0) ? (
            <div className="space-y-2">
              {recentTranscriptions.slice(0, 2).map((transcription, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {transcription.date || 'Recente'} - {transcription.patientName || 'Paciente'}
                    </p>
                    <p className="text-sm line-clamp-2">
                      {transcription.preview || transcription.text?.substring(0, 80) + '...'}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => quickAnalyzeFromTranscription(transcription.text || transcription.preview)}
                    data-testid={`button-analyze-transcription-${index}`}
                  >
                    <i className="fas fa-brain text-sm"></i>
                  </Button>
                </div>
              ))}
              
              <Button 
                variant="link" 
                className="p-0 h-auto text-secondary hover:underline text-xs"
                data-testid="button-view-all-transcriptions"
              >
                Ver todas as transcrições →
              </Button>
            </div>
          ) : (
            <div className="text-center py-2">
              <Badge className="bg-blue-100 text-blue-800 text-xs" data-testid="badge-transcription-status">
                <i className="fas fa-info mr-1"></i>
                Nenhuma transcrição recente
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Transcrições de consultas aparecerão aqui
              </p>
            </div>
          )}
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
