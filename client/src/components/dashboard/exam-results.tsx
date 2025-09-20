import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ExamResults() {
  const { data: examResults, isLoading } = useQuery({
    queryKey: ['/api/exam-results/recent'],
  });

  // Mock exam results from design
  const mockExamResults = [
    {
      id: "exam-1",
      patientName: "Maria Santos",
      examType: "Hemograma Completo",
      date: new Date(),
      results: {
        "Hemoglobina": "12.5 g/dL",
        "Leucócitos": "6.800/mm³",
        "Plaquetas": "280.000/mm³",
        "Glicose": "145 mg/dL ↑"
      },
      abnormalValues: [
        { parameter: "Glicose", value: "145 mg/dL", status: "high" as const }
      ],
      analyzedByAI: true
    },
    {
      id: "exam-2",
      patientName: "João Silva",
      examType: "Lipidograma",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      results: {
        "Colesterol Total": "220 mg/dL ↑",
        "HDL": "45 mg/dL",
        "LDL": "140 mg/dL ↑",
        "Triglicérides": "150 mg/dL"
      },
      abnormalValues: [
        { parameter: "Colesterol Total", value: "220 mg/dL", status: "high" as const },
        { parameter: "LDL", value: "140 mg/dL", status: "high" as const }
      ],
      analyzedByAI: true
    }
  ];

  const getValueStatus = (value: string) => {
    if (value.includes('↑')) return 'text-destructive font-medium';
    if (value.includes('↓')) return 'text-blue-600 font-medium';
    return 'font-medium';
  };

  return (
    <Card data-testid="card-exam-results">
      <CardHeader className="border-b border-border">
        <CardTitle>Resultados de Exames Recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {mockExamResults.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-vial text-4xl text-muted-foreground mb-3"></i>
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Nenhum exame recente
                </h3>
                <p className="text-muted-foreground">
                  Não há resultados de exames recentes disponíveis.
                </p>
              </div>
            ) : (
              mockExamResults.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 border border-border rounded-lg hover:shadow-sm transition-shadow"
                  data-testid={`exam-result-${exam.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-sm" data-testid={`exam-type-${exam.id}`}>
                        {exam.examType}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        <span data-testid={`exam-patient-${exam.id}`}>{exam.patientName}</span>
                        <span className="mx-2">•</span>
                        <span data-testid={`exam-date-${exam.id}`}>
                          {format(exam.date, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </p>
                    </div>
                    {exam.analyzedByAI && (
                      <Badge className="bg-purple-100 text-purple-800 text-xs" data-testid={`exam-ai-badge-${exam.id}`}>
                        <i className="fas fa-robot mr-1"></i>
                        IA
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    {Object.entries(exam.results).map(([parameter, value]) => (
                      <div key={parameter} className="flex justify-between">
                        <span className="text-muted-foreground">{parameter}:</span>
                        <span className={getValueStatus(value)} data-testid={`exam-value-${exam.id}-${parameter}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {exam.abnormalValues && exam.abnormalValues.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-destructive mb-2">
                        <i className="fas fa-exclamation-triangle mr-1"></i>
                        Valores Alterados
                      </h5>
                      <div className="space-y-1">
                        {exam.abnormalValues.map((abnormal, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between text-xs bg-destructive/10 p-2 rounded"
                            data-testid={`exam-abnormal-${exam.id}-${index}`}
                          >
                            <span>{abnormal.parameter}</span>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">{abnormal.value}</span>
                              <Badge variant="destructive" className="text-xs h-4">
                                {abnormal.status === 'high' ? '↑' : '↓'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <i className="fas fa-robot text-secondary"></i>
                      <span>Dados extraídos automaticamente pela IA</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-full-${exam.id}`}>
                        <i className="fas fa-eye mr-1"></i>
                        Ver Completo
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-export-${exam.id}`}>
                        <i className="fas fa-download mr-1"></i>
                        Exportar
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* AI Analysis Summary */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="ai-indicator w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="fas fa-brain text-white text-sm"></i>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Análise IA - Resumo</h4>
              <p className="text-sm text-muted-foreground mb-2">
                A IA identificou alterações em 2 exames recentes que requerem atenção médica.
              </p>
              <Button variant="outline" size="sm" data-testid="button-ai-recommendations">
                <i className="fas fa-lightbulb mr-2"></i>
                Ver Recomendações IA
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
