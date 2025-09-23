import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Trash2, AlertTriangle } from 'lucide-react';

// Form validation schema
const prescriptionFormSchema = z.object({
  patientId: z.string().min(1, 'Paciente é obrigatório'),
  diagnosis: z.string().min(1, 'Diagnóstico é obrigatório'),
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
  items: z.array(z.object({
    medicationId: z.string().optional(),
    customMedication: z.string().optional(),
    dosage: z.string().min(1, 'Dosagem é obrigatória'),
    frequency: z.string().min(1, 'Frequência é obrigatória'),
    duration: z.string().min(1, 'Duração é obrigatória'),
    quantity: z.number().min(1, 'Quantidade deve ser maior que 0'),
    instructions: z.string().min(1, 'Instruções são obrigatórias'),
    isGenericAllowed: z.boolean().default(true),
    notes: z.string().optional(),
  })).min(1, 'Pelo menos um medicamento é obrigatório'),
});

type PrescriptionFormData = z.infer<typeof prescriptionFormSchema>;

interface Medication {
  id: string;
  name: string;
  genericName: string;
  activeIngredient: string;
  dosageForm: string;
  strength: string;
  category: string;
}

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone: string;
}

interface CreatePrescriptionFormProps {
  onSuccess: () => void;
}

export default function CreatePrescriptionForm({ onSuccess }: CreatePrescriptionFormProps) {
  const { toast } = useToast();
  const [searchMedication, setSearchMedication] = useState('');
  const [searchPatient, setSearchPatient] = useState('');
  const [interactions, setInteractions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      patientId: '',
      diagnosis: '',
      notes: '',
      specialInstructions: '',
      items: [{
        medicationId: '',
        customMedication: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 1,
        instructions: '',
        isGenericAllowed: true,
        notes: '',
      }],
    },
  });

  // Get medications
  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: ['/api/medications'],
    select: (data) => data || []
  });

  // Get patients
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    select: (data) => data || []
  });

  const filteredMedications = medications.filter(med =>
    !searchMedication || 
    med.name.toLowerCase().includes(searchMedication.toLowerCase()) ||
    med.genericName.toLowerCase().includes(searchMedication.toLowerCase())
  );

  const filteredPatients = patients.filter(patient =>
    !searchPatient ||
    patient.name.toLowerCase().includes(searchPatient.toLowerCase()) ||
    patient.phone.includes(searchPatient)
  );

  const addMedicationItem = () => {
    const currentItems = form.getValues('items');
    form.setValue('items', [...currentItems, {
      medicationId: '',
      customMedication: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 1,
      instructions: '',
      isGenericAllowed: true,
      notes: '',
    }]);
  };

  const removeMedicationItem = (index: number) => {
    const currentItems = form.getValues('items');
    if (currentItems.length > 1) {
      form.setValue('items', currentItems.filter((_, i) => i !== index));
    }
  };

  const checkInteractions = async () => {
    const items = form.getValues('items');
    const medicationIds = items
      .filter(item => item.medicationId)
      .map(item => item.medicationId);

    if (medicationIds.length > 1) {
      try {
        const response = await apiRequest('POST', '/api/prescriptions/check-interactions', {
          medicationIds
        });
        setInteractions(response.interactions || []);
      } catch (error) {
        console.error('Error checking interactions:', error);
      }
    }
  };

  const onSubmit = async (data: PrescriptionFormData) => {
    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/prescriptions', data);
      
      toast({
        title: 'Prescrição criada com sucesso',
        description: 'A prescrição foi criada e está pronta para uso.',
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar prescrição',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-patient">
                        <SelectValue placeholder="Selecione um paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Buscar paciente..."
                            value={searchPatient}
                            onChange={(e) => setSearchPatient(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredPatients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            <div>
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-sm text-muted-foreground">{patient.phone}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Prescription Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Prescrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnóstico</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o diagnóstico..."
                      {...field}
                      data-testid="input-diagnosis"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instruções Especiais</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instruções especiais para o paciente..."
                      {...field}
                      data-testid="textarea-special-instructions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Medications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Medicamentos</CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={checkInteractions}
                  size="sm"
                  data-testid="button-check-interactions"
                >
                  Verificar Interações
                </Button>
                <Button
                  type="button"
                  onClick={addMedicationItem}
                  size="sm"
                  data-testid="button-add-medication"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Medicamento
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Drug Interactions Warning */}
            {interactions.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h4 className="font-medium text-orange-800">Interações Medicamentosas Detectadas</h4>
                </div>
                {interactions.map((interaction, index) => (
                  <div key={index} className="text-sm text-orange-700 mb-2">
                    <Badge variant="outline" className="mr-2 text-orange-600 border-orange-600">
                      {interaction.severity}
                    </Badge>
                    {interaction.effect}
                  </div>
                ))}
              </div>
            )}

            {form.watch('items').map((item, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Medicamento {index + 1}</h4>
                    {form.watch('items').length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedicationItem(index)}
                        data-testid={`button-remove-medication-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.medicationId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicamento</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um medicamento" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="p-2">
                                  <Input
                                    placeholder="Buscar medicamento..."
                                    value={searchMedication}
                                    onChange={(e) => setSearchMedication(e.target.value)}
                                    className="mb-2"
                                  />
                                </div>
                                {filteredMedications.map(medication => (
                                  <SelectItem key={medication.id} value={medication.id}>
                                    <div>
                                      <div className="font-medium">{medication.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {medication.strength} - {medication.dosageForm}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.customMedication`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicamento Personalizado</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ou digite o nome do medicamento..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.dosage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dosagem</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 500mg, 1 comprimido"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.frequency`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequência</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 3x ao dia, a cada 8 horas"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.duration`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duração</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 7 dias, até acabar"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade Total</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.instructions`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instruções de Uso</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: Tomar com alimentos, evitar álcool..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-32"
            data-testid="button-create-prescription"
          >
            {isSubmitting ? 'Criando...' : 'Criar Prescrição'}
          </Button>
        </div>
      </form>
    </Form>
  );
}