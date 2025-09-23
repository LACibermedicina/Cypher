import { db } from "../db";
import { medications, drugInteractions } from "@shared/schema";

// Common Brazilian medications
const commonMedications = [
  {
    name: "Paracetamol",
    genericName: "Paracetamol",
    brandNames: ["Tylenol", "Dorflex", "Novalgina"],
    activeIngredient: "Paracetamol",
    dosageForm: "comprimido",
    strength: "500mg",
    route: "oral",
    category: "analgésico",
    indication: ["dor", "febre"],
    contraindications: ["doença hepática grave"],
    sideEffects: ["náusea", "vômito"],
    pregnancyCategory: "B",
    requiresPrescription: false,
    registrationNumber: "MS-1.0123.0001",
    manufacturer: "Sanofi",
  },
  {
    name: "Amoxicilina",
    genericName: "Amoxicilina",
    brandNames: ["Amoxil", "Flemoxin"],
    activeIngredient: "Amoxicilina",
    dosageForm: "comprimido",
    strength: "500mg",
    route: "oral",
    category: "antibiótico",
    indication: ["infecção bacteriana", "sinusite", "otite"],
    contraindications: ["alergia à penicilina"],
    sideEffects: ["diarreia", "náusea", "candidíase"],
    pregnancyCategory: "B",
    requiresPrescription: true,
    registrationNumber: "MS-1.0123.0002",
    manufacturer: "GlaxoSmithKline",
  },
  {
    name: "Dipirona",
    genericName: "Dipirona Sódica",
    brandNames: ["Novalgina", "Dorflex", "Anador"],
    activeIngredient: "Dipirona Sódica",
    dosageForm: "comprimido",
    strength: "500mg",
    route: "oral",
    category: "analgésico",
    indication: ["dor", "febre"],
    contraindications: ["agranulocitose", "porfiria"],
    sideEffects: ["hipotensão", "reações alérgicas"],
    pregnancyCategory: "C",
    requiresPrescription: false,
    registrationNumber: "MS-1.0123.0003",
    manufacturer: "Sanofi",
  },
  {
    name: "Losartana",
    genericName: "Losartana Potássica",
    brandNames: ["Cozaar", "Aradois"],
    activeIngredient: "Losartana Potássica",
    dosageForm: "comprimido",
    strength: "50mg",
    route: "oral",
    category: "anti-hipertensivo",
    indication: ["hipertensão arterial"],
    contraindications: ["gravidez", "hipotensão severa"],
    sideEffects: ["tontura", "hipercalemia"],
    pregnancyCategory: "D",
    requiresPrescription: true,
    registrationNumber: "MS-1.0123.0004",
    manufacturer: "Merck",
  },
  {
    name: "Metformina",
    genericName: "Cloridrato de Metformina",
    brandNames: ["Glifage", "Glucophage"],
    activeIngredient: "Metformina",
    dosageForm: "comprimido",
    strength: "850mg",
    route: "oral",
    category: "antidiabético",
    indication: ["diabetes mellitus tipo 2"],
    contraindications: ["insuficiência renal", "acidose metabólica"],
    sideEffects: ["diarreia", "náusea", "dor abdominal"],
    pregnancyCategory: "B",
    requiresPrescription: true,
    registrationNumber: "MS-1.0123.0005",
    manufacturer: "Merck",
  },
  {
    name: "Omeprazol",
    genericName: "Omeprazol",
    brandNames: ["Losec", "Peprazol"],
    activeIngredient: "Omeprazol",
    dosageForm: "cápsula",
    strength: "20mg",
    route: "oral",
    category: "inibidor da bomba de prótons",
    indication: ["úlcera péptica", "refluxo gastroesofágico"],
    contraindications: ["hipersensibilidade"],
    sideEffects: ["cefaleia", "diarreia", "dor abdominal"],
    pregnancyCategory: "C",
    requiresPrescription: true,
    registrationNumber: "MS-1.0123.0006",
    manufacturer: "AstraZeneca",
  },
  {
    name: "Ibuprofeno",
    genericName: "Ibuprofeno",
    brandNames: ["Advil", "Alivium"],
    activeIngredient: "Ibuprofeno",
    dosageForm: "comprimido",
    strength: "600mg",
    route: "oral",
    category: "anti-inflamatório",
    indication: ["dor", "inflamação", "febre"],
    contraindications: ["úlcera péptica", "insuficiência renal"],
    sideEffects: ["dispepsia", "cefaleia", "tontura"],
    pregnancyCategory: "C",
    requiresPrescription: false,
    registrationNumber: "MS-1.0123.0007",
    manufacturer: "Pfizer",
  },
  {
    name: "Captopril",
    genericName: "Captopril",
    brandNames: ["Capoten"],
    activeIngredient: "Captopril",
    dosageForm: "comprimido",
    strength: "25mg",
    route: "oral",
    category: "anti-hipertensivo",
    indication: ["hipertensão arterial", "insuficiência cardíaca"],
    contraindications: ["gravidez", "angioedema"],
    sideEffects: ["tosse seca", "hipotensão", "hipercalemia"],
    pregnancyCategory: "D",
    requiresPrescription: true,
    registrationNumber: "MS-1.0123.0008",
    manufacturer: "Bristol-Myers Squibb",
  }
];

// Common drug interactions
const commonInteractions = [
  {
    // Warfarin + Aspirin
    medication1Name: "Ibuprofeno",
    medication2Name: "Captopril",
    severity: "moderate",
    effect: "Aumento do risco de hipotensão e comprometimento da função renal",
    mechanism: "Os AINEs podem reduzir o efeito anti-hipertensivo dos IECA",
    management: "Monitorizar pressão arterial e função renal",
    evidence: "established"
  }
];

export async function populateMedications() {
  try {
    console.log('Populating medications database...');
    
    // Insert medications
    const insertedMedications = await db.insert(medications).values(commonMedications).returning();
    console.log(`Inserted ${insertedMedications.length} medications`);
    
    // Create drug interactions
    for (const interaction of commonInteractions) {
      const med1 = insertedMedications.find(m => m.name === interaction.medication1Name);
      const med2 = insertedMedications.find(m => m.name === interaction.medication2Name);
      
      if (med1 && med2) {
        await db.insert(drugInteractions).values({
          medication1Id: med1.id,
          medication2Id: med2.id,
          severity: interaction.severity,
          effect: interaction.effect,
          mechanism: interaction.mechanism,
          management: interaction.management,
          evidence: interaction.evidence,
          source: "Manual Entry"
        });
        console.log(`Created interaction between ${med1.name} and ${med2.name}`);
      }
    }
    
    console.log('Medication database populated successfully!');
    return insertedMedications;
  } catch (error) {
    console.error('Error populating medications:', error);
    throw error;
  }
}

// Run the population if this file is executed directly
populateMedications()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });