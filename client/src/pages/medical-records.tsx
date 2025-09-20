import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

const medicalRecordSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  diagnosis: z.string().optional(),
  symptoms: z.string().min(1, "Sintomas são obrigatórios"),
  treatment: z.string().optional(),
  prescription: z.string().optional(),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;

export default function MedicalRecords() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
  });

  const { data: medicalRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['/api/medical-records', selectedPatientId],
    enabled: !!selectedPatientId,
  });

  const { data: examResults } = useQuery({
    queryKey: ['/api/exam-results', selectedPatientId],
    enabled: !!selectedPatientId,
  });

  const form = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      patientId: selectedPatientId || "",
      diagnosis: "",
      symptoms: "",
      treatment: "",
      prescription: "",
    },
  });

  const analyzeSymptomsMutation = useMutation({
    mutationFn: (data: { symptoms: string; history: string }) =>
      apiRequest('POST', `/api/medical-records/${selectedPatientId}/analyze`, data),
    onSuccess: (response) => {
      toast({
        title: "Análise IA Concluída",
        description: "Hipóteses diagnósticas geradas com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro na Análise",
        description: "Erro ao gerar hipóteses diagnósticas.",
        variant: "destructive",
      });
    },
  });

  const selectedPatient = (patients || []).find((p: any) => p.id === selectedPatientId);
  const filteredPatients = (patients || []).filter((patient: any) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAnalyzeSymptoms = () => {
    const symptoms = form.getValues('symptoms');
    if (!symptoms || !selectedPatient) return;

    const history = selectedPatient.medicalHistory ? 
      JSON.stringify(selectedPatient.medicalHistory) : 
      `Paciente: ${selectedPatient.name}, Idade: ${selectedPatient.age || 'N/A'}, Alergias: ${selectedPatient.allergies || 'Nenhuma'}`;

    analyzeSymptomsMutation.mutate({ symptoms, history });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prontuários Médicos</h1>
          <p className="text-muted-foreground">Sistema seguro de gestão de prontuários com criptografia FIPS 140-2</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="security-badge px-3 py-1 rounded-full text-white text-xs font-medium">
            <i className="fas fa-shield-alt mr-1"></i>
            Dados Criptografados
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedPatient} data-testid="button-new-record">
                <i className="fas fa-plus mr-2"></i>
                Novo Prontuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Novo Prontuário - {selectedPatient?.name}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form className="space-y-4">
                  <FormField
                    control={form.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sintomas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva os sintomas apresentados pelo paciente..."
                            {...field}
                            data-testid="textarea-symptoms"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAnalyzeSymptoms}
                      disabled={analyzeSymptomsMutation.isPending}
                      data-testid="button-analyze-symptoms"
                    >
                      <i className="fas fa-robot mr-2"></i>
                      {analyzeSymptomsMutation.isPending ? "Analisando..." : "Analisar com IA"}
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diagnóstico</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Diagnóstico médico..."
                            {...field}
                            data-testid="textarea-diagnosis"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="treatment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tratamento</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Plano de tratamento..."
                            {...field}
                            data-testid="textarea-treatment"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prescrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Prescrição médica..."
                            {...field}
                            data-testid="textarea-prescription"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-record"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="button-save-record">
                      Salvar Prontuário
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-1">
          <Card className="h-[700px]">
            <CardHeader>
              <CardTitle>Pacientes</CardTitle>
              <Input
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-patients"
              />
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {filteredPatients.map((patient: any) => (
                  <div
                    key={patient.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border ${
                      selectedPatientId === patient.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => setSelectedPatientId(patient.id)}
                    data-testid={`patient-card-${patient.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-primary text-sm"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid={`patient-name-${patient.id}`}>
                          {patient.name}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`patient-phone-${patient.id}`}>
                          {patient.phone}
                        </p>
                        {patient.allergies && (
                          <p className="text-xs text-destructive">
                            <i className="fas fa-exclamation-triangle mr-1"></i>
                            {patient.allergies}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Medical Records Content */}
        <div className="lg:col-span-3">
          {!selectedPatient ? (
            <Card className="h-[700px] flex items-center justify-center">
              <CardContent>
                <div className="text-center">
                  <i className="fas fa-file-medical text-6xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    Selecione um Paciente
                  </h3>
                  <p className="text-muted-foreground">
                    Escolha um paciente para visualizar ou criar prontuários médicos
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Patient Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-primary text-2xl"></i>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold" data-testid="selected-patient-name">
                          {selectedPatient.name}
                        </h2>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span data-testid="selected-patient-phone">{selectedPatient.phone}</span>
                          {selectedPatient.bloodType && (
                            <>
                              <span>•</span>
                              <span data-testid="selected-patient-blood-type">{selectedPatient.bloodType}</span>
                            </>
                          )}
                          {selectedPatient.gender && (
                            <>
                              <span>•</span>
                              <span data-testid="selected-patient-gender">{selectedPatient.gender}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        <i className="fas fa-shield-alt mr-1"></i>
                        Prontuário Seguro
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Tabs for Records and Exams */}
              <Tabs defaultValue="records" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="records" data-testid="tab-records">
                    <i className="fas fa-file-medical mr-2"></i>
                    Prontuários
                  </TabsTrigger>
                  <TabsTrigger value="exams" data-testid="tab-exams">
                    <i className="fas fa-vial mr-2"></i>
                    Exames
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="records" className="space-y-4">
                  {recordsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : !(medicalRecords || []).length ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <i className="fas fa-file-medical text-4xl text-muted-foreground mb-3"></i>
                          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                            Nenhum Prontuário
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            Este paciente ainda não possui prontuários médicos
                          </p>
                          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-record">
                            <i className="fas fa-plus mr-2"></i>
                            Criar Primeiro Prontuário
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {(medicalRecords || []).map((record: any) => (
                        <Card key={record.id} data-testid={`record-card-${record.id}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold" data-testid={`record-date-${record.id}`}>
                                  {format(new Date(record.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Dr. {record.doctorName || "Sistema"}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {record.digitalSignature && (
                                  <Badge variant="outline" className="text-green-600">
                                    <i className="fas fa-signature mr-1"></i>
                                    Assinado
                                  </Badge>
                                )}
                                {record.isEncrypted && (
                                  <Badge variant="outline" className="text-blue-600">
                                    <i className="fas fa-lock mr-1"></i>
                                    Criptografado
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {record.symptoms && (
                                <div>
                                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Sintomas</h4>
                                  <p className="text-sm" data-testid={`record-symptoms-${record.id}`}>
                                    {record.symptoms}
                                  </p>
                                </div>
                              )}
                              
                              {record.diagnosis && (
                                <div>
                                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Diagnóstico</h4>
                                  <p className="text-sm" data-testid={`record-diagnosis-${record.id}`}>
                                    {record.diagnosis}
                                  </p>
                                </div>
                              )}

                              {record.treatment && (
                                <div>
                                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Tratamento</h4>
                                  <p className="text-sm" data-testid={`record-treatment-${record.id}`}>
                                    {record.treatment}
                                  </p>
                                </div>
                              )}

                              {record.prescription && (
                                <div>
                                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Prescrição</h4>
                                  <p className="text-sm" data-testid={`record-prescription-${record.id}`}>
                                    {record.prescription}
                                  </p>
                                </div>
                              )}

                              {record.diagnosticHypotheses && (
                                <div>
                                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                                    <i className="fas fa-robot mr-1"></i>
                                    Hipóteses Diagnósticas (IA)
                                  </h4>
                                  <div className="space-y-2">
                                    {record.diagnosticHypotheses.map((hypothesis: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                                        <span>{hypothesis.condition}</span>
                                        <Badge variant="outline">{hypothesis.probability}%</Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="exams" className="space-y-4">
                  {!(examResults || []).length ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <i className="fas fa-vial text-4xl text-muted-foreground mb-3"></i>
                          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                            Nenhum Exame
                          </h3>
                          <p className="text-muted-foreground">
                            Este paciente ainda não possui resultados de exames
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {(examResults || []).map((exam: any) => (
                        <Card key={exam.id} data-testid={`exam-card-${exam.id}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold" data-testid={`exam-type-${exam.id}`}>
                                  {exam.examType}
                                </h3>
                                <p className="text-sm text-muted-foreground" data-testid={`exam-date-${exam.id}`}>
                                  {format(new Date(exam.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </p>
                              </div>
                              {exam.analyzedByAI && (
                                <Badge variant="outline" className="text-purple-600">
                                  <i className="fas fa-robot mr-1"></i>
                                  Analisado por IA
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {exam.results && (
                                <div>
                                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Resultados</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    {Object.entries(exam.results).map(([key, value]: [string, any]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-muted-foreground">{key}:</span>
                                        <span className="font-medium">{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {exam.abnormalValues && exam.abnormalValues.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-sm text-muted-foreground mb-2 text-destructive">
                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                    Valores Alterados
                                  </h4>
                                  <div className="space-y-2">
                                    {exam.abnormalValues.map((abnormal: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between text-sm bg-destructive/10 p-2 rounded">
                                        <span>{abnormal.parameter}</span>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium">{abnormal.value}</span>
                                          <Badge variant="destructive" className="text-xs">
                                            {abnormal.status === 'high' ? '↑' : '↓'}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
