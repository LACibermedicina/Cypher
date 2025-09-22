import fs from 'fs';
import path from 'path';

export interface PrescriptionData {
  patientName: string;
  patientAge: number;
  patientAddress: string;
  doctorName: string;
  doctorCRM: string;
  doctorCRMState: string;
  prescriptionText: string;
  date: string;
  digitalSignature?: {
    signature: string;
    certificateInfo: any;
    timestamp: string;
  };
}

export class PDFGeneratorService {
  
  async generatePrescriptionPDF(data: PrescriptionData): Promise<string> {
    // Generate HTML content for the prescription
    const htmlContent = this.generatePrescriptionHTML(data);
    
    // Return the HTML content (can be converted to PDF by frontend)
    return htmlContent;
  }

  private generatePrescriptionHTML(data: PrescriptionData): string {
    const logoPath = '/assets/telemed-logo.png'; // Logo path for the clinic
    
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receita Médica - ${data.patientName}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
          }
          
          .prescription-header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
            text-align: center;
          }
          
          .clinic-logo {
            max-height: 60px;
            margin-bottom: 10px;
          }
          
          .clinic-name {
            font-size: 18pt;
            font-weight: bold;
            color: #2563eb;
            margin: 10px 0;
          }
          
          .clinic-info {
            font-size: 10pt;
            color: #666;
            margin-bottom: 5px;
          }
          
          .doctor-info {
            text-align: center;
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f8f9ff;
            border-radius: 8px;
          }
          
          .doctor-name {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .doctor-crm {
            font-size: 11pt;
            color: #666;
          }
          
          .patient-info {
            margin-bottom: 30px;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
          }
          
          .patient-label {
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
            font-size: 13pt;
          }
          
          .patient-details {
            line-height: 1.6;
          }
          
          .prescription-content {
            min-height: 300px;
            margin-bottom: 40px;
            padding: 20px;
            border: 2px dashed #ccc;
            border-radius: 8px;
          }
          
          .prescription-label {
            font-weight: bold;
            font-size: 14pt;
            color: #2563eb;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .prescription-text {
            font-size: 12pt;
            line-height: 1.8;
            white-space: pre-wrap;
          }
          
          .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          
          .signature-box {
            text-align: center;
            width: 300px;
          }
          
          .signature-line {
            border-top: 1px solid #000;
            margin-bottom: 8px;
            height: 50px;
            position: relative;
          }
          
          .digital-signature {
            background-color: #e8f4fd;
            border: 1px solid #2563eb;
            padding: 10px;
            border-radius: 4px;
            font-size: 9pt;
            color: #2563eb;
            margin-bottom: 10px;
          }
          
          .signature-name {
            font-weight: bold;
            font-size: 11pt;
          }
          
          .signature-crm {
            font-size: 10pt;
            color: #666;
          }
          
          .date-location {
            text-align: right;
            margin-bottom: 20px;
            font-size: 11pt;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 9pt;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
          
          .qr-code-section {
            position: absolute;
            top: 20px;
            right: 20px;
            text-align: center;
          }
          
          .qr-placeholder {
            width: 80px;
            height: 80px;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8pt;
            color: #666;
          }
          
          @media print {
            body {
              -webkit-print-color-adjust: exact;
            }
            
            .prescription-content {
              border-style: solid;
            }
          }
        </style>
      </head>
      <body>
        <div class="qr-code-section">
          <div class="qr-placeholder">QR Code<br/>Verificação</div>
        </div>
        
        <div class="prescription-header">
          <div class="clinic-name">TELEMED - Sistema de Telemedicina</div>
          <div class="clinic-info">Plataforma Digital de Saúde | Atendimento Médico Especializado</div>
          <div class="clinic-info">www.telemed.com.br | contato@telemed.com.br</div>
        </div>
        
        <div class="doctor-info">
          <div class="doctor-name">${data.doctorName}</div>
          <div class="doctor-crm">CRM ${data.doctorCRM}/${data.doctorCRMState}</div>
        </div>
        
        <div class="patient-info">
          <div class="patient-label">DADOS DO PACIENTE</div>
          <div class="patient-details">
            <strong>Nome:</strong> ${data.patientName}<br/>
            <strong>Idade:</strong> ${data.patientAge} anos<br/>
            <strong>Endereço:</strong> ${data.patientAddress}
          </div>
        </div>
        
        <div class="date-location">
          São Paulo, ${data.date}
        </div>
        
        <div class="prescription-content">
          <div class="prescription-label">RECEITUÁRIO MÉDICO</div>
          <div class="prescription-text">${data.prescriptionText}</div>
        </div>
        
        <div class="signature-section">
          <div style="flex: 1;"></div>
          <div class="signature-box">
            ${data.digitalSignature ? `
              <div class="digital-signature">
                ✓ RECEITA ASSINADA DIGITALMENTE<br/>
                Certificado ICP-Brasil A3<br/>
                Timestamp: ${new Date(data.digitalSignature.timestamp).toLocaleString('pt-BR')}
              </div>
            ` : ''}
            <div class="signature-line"></div>
            <div class="signature-name">${data.doctorName}</div>
            <div class="signature-crm">CRM ${data.doctorCRM}/${data.doctorCRMState}</div>
          </div>
        </div>
        
        <div class="footer">
          <div>Esta receita foi gerada digitalmente pelo sistema TELEMED</div>
          ${data.digitalSignature ? `
            <div>Receita assinada digitalmente conforme MP 2.200-2/2001 e Lei 14.063/2020</div>
            <div style="font-size: 8pt; margin-top: 5px;">
              Hash do documento: ${data.digitalSignature.signature.substring(0, 32)}...
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  }

  async generateExamRequestPDF(examData: any): Promise<string> {
    // Similar structure for exam requests
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Solicitação de Exame - ${examData.patientName}</title>
        <style>
          /* Similar styling as prescription */
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
          .exam-content { min-height: 200px; padding: 20px; border: 2px solid #ccc; margin: 30px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SOLICITAÇÃO DE EXAME</h2>
          <p>TELEMED - Sistema de Telemedicina</p>
        </div>
        
        <div class="patient-info">
          <p><strong>Paciente:</strong> ${examData.patientName}</p>
          <p><strong>Data:</strong> ${examData.date}</p>
        </div>
        
        <div class="exam-content">
          <h3>EXAMES SOLICITADOS:</h3>
          <div>${examData.examRequests}</div>
        </div>
        
        <div class="signature">
          <p>Médico: ${examData.doctorName}</p>
          <p>CRM: ${examData.doctorCRM}/${examData.doctorCRMState}</p>
        </div>
      </body>
      </html>
    `;
  }

  async generateMedicalCertificatePDF(certificateData: any): Promise<string> {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Atestado Médico - ${certificateData.patientName}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; text-align: justify; }
          .header { text-align: center; margin-bottom: 40px; }
          .content { margin: 40px 0; line-height: 1.8; }
          .signature { margin-top: 80px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>ATESTADO MÉDICO</h2>
          <p>TELEMED - Sistema de Telemedicina</p>
        </div>
        
        <div class="content">
          <p>Atesto que o(a) Sr(a). <strong>${certificateData.patientName}</strong>, 
          portador(a) do documento de identidade nº ${certificateData.patientDocument}, 
          foi por mim examinado(a) nesta data, apresentando quadro clínico que o(a) 
          impossibilita de exercer suas atividades habituais por um período de 
          <strong>${certificateData.restDays} dias</strong>.</p>
          
          <p>CID-10: ${certificateData.cid10 || 'Não especificado'}</p>
          
          <p>Por ser verdade, firmo o presente atestado.</p>
        </div>
        
        <div class="signature">
          <p>São Paulo, ${certificateData.date}</p>
          <br/><br/>
          <p>_________________________________</p>
          <p><strong>${certificateData.doctorName}</strong></p>
          <p>CRM ${certificateData.doctorCRM}/${certificateData.doctorCRMState}</p>
        </div>
      </body>
      </html>
    `;
  }
}

export const pdfGeneratorService = new PDFGeneratorService();