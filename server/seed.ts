import { db } from './db';
import { users, patients, systemSettings } from '@shared/schema';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';

/**
 * Seed script to reset test data and create test users for each access level
 */
async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Step 1: Clear test users (keep production data safe)
    console.log('🧹 Cleaning test users...');
    await db.delete(users).where(sql`username LIKE 'test_%'`);
    
    // Step 2: Create test users for each role
    console.log('👥 Creating test users...');
    
    const hashedPassword = crypto.createHash('sha256').update('test123').digest('hex');
    
    // Admin user
    const adminUser = await db.insert(users).values({
      username: 'test_admin',
      password: hashedPassword,
      role: 'admin',
      name: 'Admin Teste',
      email: 'admin@telemed.test',
      phone: '+55 11 99999-0001',
      whatsappNumber: '+5511999990001',
      tmcCredits: 10000,
      digitalCertificate: 'admin-cert-2024',
    }).returning();
    console.log('✅ Admin created:', adminUser[0].username);

    // Doctor user
    const doctorUser = await db.insert(users).values({
      username: 'test_doctor',
      password: hashedPassword,
      role: 'doctor',
      name: 'Dr. João Silva',
      email: 'doctor@telemed.test',
      phone: '+55 11 99999-0002',
      whatsappNumber: '+5511999990002',
      tmcCredits: 5000,
      digitalCertificate: 'doctor-cert-2024',
      medicalLicense: 'CRM-SP 123456',
      specialization: 'Clínica Geral',
      hierarchyLevel: 1,
    }).returning();
    console.log('✅ Doctor created:', doctorUser[0].username);

    // Patient user
    const patientUser = await db.insert(users).values({
      username: 'test_patient',
      password: hashedPassword,
      role: 'patient',
      name: 'Maria Santos',
      email: 'patient@telemed.test',
      phone: '+55 11 99999-0003',
      whatsappNumber: '+5511999990003',
      tmcCredits: 100,
    }).returning();
    console.log('✅ Patient created:', patientUser[0].username);

    // Visitor user
    const visitorUser = await db.insert(users).values({
      username: 'test_visitor',
      password: hashedPassword,
      role: 'visitor',
      name: 'José Visitante',
      email: 'visitor@telemed.test',
      phone: '+55 11 99999-0004',
      tmcCredits: 0,
    }).returning();
    console.log('✅ Visitor created:', visitorUser[0].username);

    // Researcher user
    const researcherUser = await db.insert(users).values({
      username: 'test_researcher',
      password: hashedPassword,
      role: 'researcher',
      name: 'Dra. Ana Pesquisadora',
      email: 'researcher@telemed.test',
      phone: '+55 11 99999-0005',
      whatsappNumber: '+5511999990005',
      tmcCredits: 1000,
    }).returning();
    console.log('✅ Researcher created:', researcherUser[0].username);

    // Step 3: Initialize system settings
    console.log('⚙️  Initializing system settings...');
    
    const defaultSettings = [
      {
        settingKey: 'rescheduling_margin_hours',
        settingValue: '24',
        settingType: 'number',
        description: 'Margem mínima em horas para reagendamento de consultas',
        category: 'scheduling',
        isEditable: true,
      },
      {
        settingKey: 'ai_model_version',
        settingValue: 'gpt-4',
        settingType: 'string',
        description: 'Versão do modelo de IA para chatbot e assistente',
        category: 'ai',
        isEditable: true,
      },
      {
        settingKey: 'enable_diagnostic_consultations',
        settingValue: 'true',
        settingType: 'boolean',
        description: 'Habilitar consultas diagnósticas com busca na internet',
        category: 'ai',
        isEditable: true,
      },
      {
        settingKey: 'notification_email_enabled',
        settingValue: 'true',
        settingType: 'boolean',
        description: 'Enviar notificações por email',
        category: 'notifications',
        isEditable: true,
      },
      {
        settingKey: 'notification_whatsapp_enabled',
        settingValue: 'true',
        settingType: 'boolean',
        description: 'Enviar notificações por WhatsApp',
        category: 'notifications',
        isEditable: true,
      },
      {
        settingKey: 'system_maintenance_mode',
        settingValue: 'false',
        settingType: 'boolean',
        description: 'Modo de manutenção do sistema',
        category: 'general',
        isEditable: false, // Protected setting
      },
    ];

    for (const setting of defaultSettings) {
      // Check if setting already exists
      const existing = await db.select()
        .from(systemSettings)
        .where(sql`setting_key = ${setting.settingKey}`)
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(systemSettings).values({
          ...setting,
          updatedBy: adminUser[0].id,
        });
        console.log(`✅ Setting created: ${setting.settingKey}`);
      } else {
        console.log(`⏭️  Setting already exists: ${setting.settingKey}`);
      }
    }

    console.log('\n✨ Seed completed successfully!\n');
    console.log('📋 Test Users Created:');
    console.log('   Admin:      username: test_admin      password: test123');
    console.log('   Doctor:     username: test_doctor     password: test123');
    console.log('   Patient:    username: test_patient    password: test123');
    console.log('   Visitor:    username: test_visitor    password: test123');
    console.log('   Researcher: username: test_researcher password: test123');
    console.log('\n⚙️  System Settings Initialized:');
    console.log('   - Rescheduling margin: 24 hours');
    console.log('   - AI model: gpt-4');
    console.log('   - Diagnostic consultations: enabled');
    console.log('   - Email notifications: enabled');
    console.log('   - WhatsApp notifications: enabled');
    console.log('');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed immediately
seed()
  .then(() => {
    console.log('✅ Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

export { seed };
