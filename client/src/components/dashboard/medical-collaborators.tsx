import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function MedicalCollaborators() {
  const queryClient = useQueryClient();

  const { data: collaborators, isLoading } = useQuery({
    queryKey: ['/api/collaborators'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isOnline }: { id: string; isOnline: boolean }) =>
      apiRequest('PATCH', `/api/collaborators/${id}/status`, { isOnline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
    },
  });

  // Mock collaborators from design
  const mockCollaborators = [
    {
      id: "collab-1",
      name: "Farmácia São José",
      type: "pharmacy",
      isOnline: true,
      icon: "fas fa-pills",
      color: "primary"
    },
    {
      id: "collab-2",
      name: "Lab Diagnóstico",
      type: "laboratory",
      isOnline: true,
      icon: "fas fa-microscope",
      color: "secondary"
    },
    {
      id: "collab-3",
      name: "Hospital Central",
      type: "hospital",
      isOnline: true,
      icon: "fas fa-hospital",
      color: "accent"
    },
    {
      id: "collab-4",
      name: "Clínica de Imagem",
      type: "clinic",
      isOnline: false,
      icon: "fas fa-x-ray",
      color: "muted"
    },
  ];

  const getCollaboratorColor = (type: string, isOnline: boolean) => {
    if (!isOnline) return "bg-muted text-muted-foreground";
    
    switch (type) {
      case 'pharmacy':
        return "bg-primary/10 text-primary";
      case 'laboratory':
        return "bg-secondary/10 text-secondary";
      case 'hospital':
        return "bg-accent/10 text-accent";
      case 'clinic':
        return "bg-blue-50 text-blue-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card data-testid="card-medical-collaborators">
      <CardHeader className="border-b border-border">
        <CardTitle>Rede de Colaboradores</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {mockCollaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="text-center p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                data-testid={`collaborator-${collaborator.id}`}
              >
                <div className={`w-12 h-12 ${getCollaboratorColor(collaborator.type, collaborator.isOnline)} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <i className={`${collaborator.icon}`}></i>
                </div>
                <p className="text-sm font-medium" data-testid={`collaborator-name-${collaborator.id}`}>
                  {collaborator.name}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {collaborator.type === 'pharmacy' ? 'Farmácia' :
                   collaborator.type === 'laboratory' ? 'Laboratório' :
                   collaborator.type === 'hospital' ? 'Hospital' :
                   collaborator.type === 'clinic' ? 'Clínica' : collaborator.type}
                </p>
                <div className="flex items-center justify-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${collaborator.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className={`text-xs ${collaborator.isOnline ? 'text-green-600' : 'text-gray-500'}`} data-testid={`collaborator-status-${collaborator.id}`}>
                    {collaborator.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" data-testid="button-send-prescription">
              <i className="fas fa-prescription-bottle mr-1"></i>
              Prescrição
            </Button>
            <Button variant="outline" size="sm" data-testid="button-request-exam">
              <i className="fas fa-vial mr-1"></i>
              Solicitar Exame
            </Button>
            <Button variant="outline" size="sm" data-testid="button-refer-hospital">
              <i className="fas fa-hospital mr-1"></i>
              Encaminhar
            </Button>
          </div>
        </div>

        {/* Network Status */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <i className="fas fa-network-wired text-accent"></i>
            <span className="text-muted-foreground">
              Rede Integrada de Saúde • 
              <span className="text-accent font-medium ml-1" data-testid="text-network-status">
                3 de 4 parceiros online
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
