import { storage } from '../storage';
import * as crypto from 'crypto';

/**
 * Script para criar usuários de teste para cada nível de acesso
 * Executar com: npx tsx server/scripts/create-test-users.ts
 */

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createTestUsers() {
  console.log('🚀 Criando usuários de teste...');

  const testUsers = [
    // Médico de teste
    {
      username: 'medico.teste',
      password: hashPassword('medico123'),
      role: 'doctor' as const,
      name: 'Dr. João Silva',
      email: 'joao.silva@telemed.com.br',
      phone: '(11) 99999-1111',
      digitalCertificate: `cert-doctor-${Date.now()}`
    },
    
    // Admin de teste  
    {
      username: 'admin.teste',
      password: hashPassword('admin123'),
      role: 'admin' as const,
      name: 'Carlos Administrador',
      email: 'admin@telemed.com.br',
      phone: '(11) 99999-2222',
      digitalCertificate: `cert-admin-${Date.now()}`
    },
    
    // Paciente de teste 1
    {
      username: 'maria.santos',
      password: hashPassword('paciente123'),
      role: 'patient' as const,
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '(11) 99999-3333'
    },
    
    // Paciente de teste 2
    {
      username: 'jose.oliveira',
      password: hashPassword('paciente123'),
      role: 'patient' as const,
      name: 'José Oliveira',
      email: 'jose.oliveira@email.com',
      phone: '(11) 99999-4444'
    },
    
    // Médico especialista de teste
    {
      username: 'dra.ana',
      password: hashPassword('medico123'),
      role: 'doctor' as const,
      name: 'Dra. Ana Costa',
      email: 'ana.costa@telemed.com.br',
      phone: '(11) 99999-5555',
      digitalCertificate: `cert-doctor-specialist-${Date.now()}`
    }
  ];

  try {
    console.log('📝 Iniciando criação dos usuários...\n');

    for (const userData of testUsers) {
      try {
        // Verificar se usuário já existe
        const existingUser = await storage.getUserByUsername(userData.username);
        
        if (existingUser) {
          console.log(`⚠️  Usuário ${userData.username} já existe. Pulando...`);
          continue;
        }

        // Criar usuário
        const newUser = await storage.createUser(userData);
        
        console.log(`✅ Usuário criado com sucesso:`);
        console.log(`   👤 Nome: ${newUser.name}`);
        console.log(`   🔑 Username: ${newUser.username}`);
        console.log(`   🎭 Role: ${newUser.role}`);
        console.log(`   📧 Email: ${newUser.email || 'N/A'}`);
        console.log(`   📱 Phone: ${newUser.phone || 'N/A'}`);
        console.log(`   🆔 ID: ${newUser.id}\n`);
        
      } catch (userError: any) {
        console.error(`❌ Erro ao criar usuário ${userData.username}:`, userError.message);
      }
    }

    console.log('🎉 Processo de criação de usuários finalizado!');
    console.log('\n📋 Credenciais de Teste:');
    console.log('');
    console.log('👨‍⚕️ MÉDICOS:');
    console.log('   Username: medico.teste | Password: medico123');
    console.log('   Username: dra.ana      | Password: medico123');
    console.log('');
    console.log('👨‍💼 ADMIN:');
    console.log('   Username: admin.teste  | Password: admin123');
    console.log('');
    console.log('👤 PACIENTES:');
    console.log('   Username: maria.santos | Password: paciente123');
    console.log('   Username: jose.oliveira| Password: paciente123');
    console.log('');
    console.log('⚠️  IMPORTANTE: Estas são credenciais de teste. Nunca use em produção!');

  } catch (error: any) {
    console.error('💥 Erro geral ao criar usuários de teste:', error.message);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUsers()
    .then(() => {
      console.log('\n✨ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

export { createTestUsers };