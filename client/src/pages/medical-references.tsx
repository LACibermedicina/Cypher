import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Trash2, Upload } from 'lucide-react';

interface ChatbotReference {
  id: string;
  title: string;
  content: string;
  category: string;
  sourceType: string;
  fileName?: string;
  fileSize?: number;
  pdfExtractedText?: string;
  isActive: boolean;
  createdAt: string;
}

export default function MedicalReferences() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedPdfData, setUploadedPdfData] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'medical',
    keywords: ''
  });

  const { data: references = [], isLoading } = useQuery<ChatbotReference[]>({
    queryKey: ['/api/chatbot-references'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdfFile', file);
      
      const response = await fetch('/api/chatbot-references/upload-pdf', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadedPdfData(data);
      toast({
        title: "PDF Enviado",
        description: `Arquivo ${data.filename} carregado com sucesso. Preencha os dados abaixo.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no Upload",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createReferenceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/chatbot-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create reference');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Referência Criada",
        description: "Documento de referência médica criado com sucesso"
      });
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        category: 'medical',
        keywords: ''
      });
      setSelectedFile(null);
      setUploadedPdfData(null);
      
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot-references'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Criar",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/chatbot-references/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete reference');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Referência Deletada",
        description: "Documento removido com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot-references'] });
    },
    onError: () => {
      toast({
        title: "Erro ao Deletar",
        description: "Falha ao remover documento",
        variant: "destructive"
      });
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 20MB",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFile(file);
    uploadMutation.mutate(file);
  };

  const handleSubmit = () => {
    if (!uploadedPdfData) {
      toast({
        title: "Nenhum PDF",
        description: "Por favor, faça upload de um PDF primeiro",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.title || !formData.content) {
      toast({
        title: "Campos Obrigatórios",
        description: "Preencha título e conteúdo/resumo",
        variant: "destructive"
      });
      return;
    }
    
    const keywords = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    createReferenceMutation.mutate({
      title: formData.title,
      content: uploadedPdfData.extractedText || formData.content,
      category: formData.category,
      keywords,
      sourceType: 'pdf',
      fileUrl: uploadedPdfData.fileUrl,
      fileName: uploadedPdfData.filename,
      fileSize: uploadedPdfData.fileSize,
      pdfExtractedText: uploadedPdfData.extractedText,
      language: 'pt',
      allowedRoles: ['admin', 'doctor', 'patient'],
      useForDiagnostics: true,
      priority: 1,
      isActive: true
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Referências Médicas para IA</h1>
        <p className="text-muted-foreground">
          Faça upload de PDFs com diretrizes médicas que a IA usará como fonte prioritária de informação
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Novo Documento de Referência
          </CardTitle>
          <CardDescription>
            Faça upload de PDFs com guidelines, protocolos ou artigos médicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="pdf-upload">
                  Arquivo PDF (máximo 20MB)
                </Label>
                <Input 
                  id="pdf-upload" 
                  type="file" 
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={uploadMutation.isPending}
                  data-testid="input-pdf-upload"
                />
                {uploadMutation.isPending && (
                  <p className="text-sm text-muted-foreground mt-1">Fazendo upload e extraindo texto...</p>
                )}
                {uploadedPdfData && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ PDF carregado: {uploadedPdfData.filename} ({Math.round(uploadedPdfData.fileSize / 1024)}KB)
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="ref-title">Título da Referência *</Label>
                <Input 
                  id="ref-title" 
                  placeholder="ex: Diretrizes SBC Hipertensão 2024" 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="input-ref-title"
                />
              </div>
              
              <div>
                <Label htmlFor="ref-content">Resumo/Pontos Principais *</Label>
                <textarea 
                  id="ref-content" 
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  placeholder="Descreva os principais pontos do documento ou deixe em branco para usar o texto extraído automaticamente..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  data-testid="input-ref-content"
                />
                {uploadedPdfData?.extractedText && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ℹ️ Texto extraído automaticamente ({uploadedPdfData.extractedText.length} caracteres). Você pode editar ou deixar em branco para usar o texto completo.
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="ref-category">Categoria</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="ref-category" data-testid="select-ref-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">Médica</SelectItem>
                    <SelectItem value="diagnostic">Diagnóstica</SelectItem>
                    <SelectItem value="procedural">Procedimentos</SelectItem>
                    <SelectItem value="emergency">Emergência</SelectItem>
                    <SelectItem value="general">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="ref-keywords">Palavras-chave (separadas por vírgula)</Label>
                <Input 
                  id="ref-keywords" 
                  placeholder="ex: hipertensão, pressão arterial, cardiovascular" 
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  data-testid="input-ref-keywords"
                />
              </div>
              
              <Button 
                onClick={handleSubmit}
                disabled={createReferenceMutation.isPending || !uploadedPdfData}
                className="w-full"
                data-testid="button-create-reference"
              >
                <Plus className="mr-2 h-4 w-4" />
                {createReferenceMutation.isPending ? 'Criando...' : 'Criar Referência'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* References List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Referências Existentes
          </CardTitle>
          <CardDescription>
            Documentos que a IA usa como fonte de informação prioritária
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando referências...</div>
          ) : references.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma referência cadastrada ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {references.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-medium">{ref.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ref.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ref.fileName ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {ref.fileName}
                          {ref.fileSize && ` (${Math.round(ref.fileSize / 1024)}KB)`}
                        </div>
                      ) : (
                        'Sem arquivo'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ref.isActive ? 'default' : 'secondary'}>
                        {ref.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(ref.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${ref.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
