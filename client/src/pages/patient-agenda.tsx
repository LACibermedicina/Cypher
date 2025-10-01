import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface PatientNote {
  id: string;
  patientId: string;
  userId: string;
  date: string;
  title: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PatientAgenda() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PatientNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // Fetch patient data
  const { data: patientData } = useQuery<any>({
    queryKey: ['/api/patients/me'],
    enabled: !!user && user.role === 'patient',
  });

  // Fetch notes for selected date
  const { data: notes = [], isLoading } = useQuery<PatientNote[]>({
    queryKey: ['/api/patient-notes', patientData?.id, selectedDate],
    queryFn: async () => {
      if (!patientData?.id) return [];
      const response = await fetch(`/api/patient-notes?patientId=${patientData.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
    enabled: !!patientData?.id && !!selectedDate,
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; date: Date }) => {
      return await apiRequest('/api/patient-notes', 'POST', {
        patientId: patientData.id,
        userId: user!.id,
        title: data.title,
        content: data.content,
        date: data.date.toISOString(),
        isPrivate: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patient-notes'] });
      toast({ title: "Nota criada com sucesso!" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Erro ao criar nota", variant: "destructive" });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; content: string }) => {
      return await apiRequest(`/api/patient-notes/${data.id}`, 'PATCH', {
        title: data.title,
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patient-notes'] });
      toast({ title: "Nota atualizada com sucesso!" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar nota", variant: "destructive" });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/patient-notes/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patient-notes'] });
      toast({ title: "Nota excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir nota", variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
  };

  const handleSaveNote = () => {
    if (!noteTitle.trim() || !noteContent.trim() || !selectedDate) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }

    if (editingNote) {
      updateNoteMutation.mutate({
        id: editingNote.id,
        title: noteTitle,
        content: noteContent,
      });
    } else {
      createNoteMutation.mutate({
        title: noteTitle,
        content: noteContent,
        date: selectedDate,
      });
    }
  };

  const handleEditNote = (note: PatientNote) => {
    setEditingNote(note);
    setNoteTitle(note.title || "");
    setNoteContent(note.content);
    setIsDialogOpen(true);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta nota?")) {
      deleteNoteMutation.mutate(id);
    }
  };

  if (!user || (user.role !== 'patient' && user.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p>Acesso restrito a pacientes e administradores</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-8 h-8 text-medical-primary" />
          Minha Agenda Pessoal
        </h1>
        <p className="text-gray-600 mt-2">
          Faça anotações e organize suas informações pessoais de saúde
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Selecione uma Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="rounded-md border"
            />
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full mt-4" 
                  data-testid="button-add-note"
                  disabled={!selectedDate}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Anotação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingNote ? "Editar Anotação" : "Nova Anotação"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Título</label>
                    <Input
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Ex: Consulta Dr. Silva"
                      data-testid="input-note-title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Anotação</label>
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Escreva suas anotações aqui..."
                      rows={6}
                      data-testid="input-note-content"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveNote}
                    data-testid="button-save-note"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Notes List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Anotações de {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "..."}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500 text-center py-8">Carregando...</p>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma anotação para esta data</p>
                <p className="text-sm text-gray-400 mt-2">
                  Clique em "Nova Anotação" para começar
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <Card key={note.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {note.title && (
                            <h3 className="font-semibold text-lg text-gray-900 mb-2">
                              {note.title}
                            </h3>
                          )}
                          <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="text-xs">
                              {format(new Date(note.createdAt), "HH:mm", { locale: ptBR })}
                            </Badge>
                            {note.isPrivate && (
                              <Badge variant="secondary" className="text-xs">
                                Privada
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditNote(note)}
                            data-testid={`button-edit-note-${note.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteNote(note.id)}
                            data-testid={`button-delete-note-${note.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
