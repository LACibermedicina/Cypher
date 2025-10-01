import { db } from "../db";
import { users, tmcTransactions, cashbox, cashboxTransactions, systemSettings } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

// Default credit system configuration
export const DEFAULT_CREDIT_CONFIG = {
  PROMOTIONAL_CREDITS: 10,
  CREDIT_PER_MINUTE: 1,
  CREDIT_PER_AI_RESPONSE: 1,
  CREDIT_PER_STATISTICS: 1,
  DOCTOR_MONTHLY_CREDITS: 100,
  DOCTOR_COMMISSION_PERCENT: 30,
};

// Get system credit configuration
export async function getCreditConfig() {
  const settings = await db.select().from(systemSettings)
    .where(sql`${systemSettings.category} = 'credits'`);
  
  const config = { ...DEFAULT_CREDIT_CONFIG };
  
  for (const setting of settings) {
    const key = setting.settingKey.toUpperCase().replace(/-/g, '_');
    if (key in config && setting.settingType === 'number') {
      config[key as keyof typeof config] = parseInt(setting.settingValue);
    }
  }
  
  return config;
}

// Initialize cashbox if not exists
export async function initializeCashbox(adminId: string) {
  const existing = await db.select().from(cashbox).limit(1);
  
  if (existing.length === 0) {
    await db.insert(cashbox).values({
      balance: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      serverCosts: 0,
      description: 'Sistema de Caixa Telemed',
      updatedBy: adminId,
    });
  }
}

// Add promotional credits to new user
export async function addPromotionalCredits(userId: string, username: string) {
  const config = await getCreditConfig();
  const amount = config.PROMOTIONAL_CREDITS;
  
  // Get current balance (should be 0 for new user)
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.length === 0) {
    throw new Error('User not found');
  }
  
  const currentBalance = user[0].tmcCredits || 0;
  const newBalance = currentBalance + amount;
  
  // Update user balance
  await db.update(users)
    .set({ tmcCredits: newBalance })
    .where(eq(users.id, userId));
  
  // Record transaction
  await db.insert(tmcTransactions).values({
    userId,
    type: 'credit',
    amount,
    reason: 'promotional_credits',
    functionUsed: 'user_registration',
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    metadata: {
      username,
      description: 'Créditos promocionais de boas-vindas',
    },
  });
  
  return newBalance;
}

// Debit credits from user
export async function debitCredits(
  userId: string,
  amount: number,
  reason: string,
  metadata?: any
) {
  // Get current balance
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.length === 0) {
    throw new Error('User not found');
  }
  
  const currentBalance = user[0].tmcCredits || 0;
  
  if (currentBalance < amount) {
    throw new Error('Insufficient credits');
  }
  
  const newBalance = currentBalance - amount;
  
  // Update user balance
  await db.update(users)
    .set({ tmcCredits: newBalance })
    .where(eq(users.id, userId));
  
  // Record transaction
  const transaction = await db.insert(tmcTransactions).values({
    userId,
    type: 'debit',
    amount: -amount, // Negative for debits
    reason,
    functionUsed: metadata?.functionUsed || reason,
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    appointmentId: metadata?.appointmentId,
    medicalRecordId: metadata?.medicalRecordId,
    metadata,
  }).returning();
  
  // Add to cashbox revenue
  await addCashboxRevenue(amount, reason, transaction[0].id);
  
  return { newBalance, transactionId: transaction[0].id };
}

// Credit credits to user (e.g., for statistics bonus)
export async function creditUser(
  userId: string,
  amount: number,
  reason: string,
  metadata?: any
) {
  // Get current balance
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.length === 0) {
    throw new Error('User not found');
  }
  
  const currentBalance = user[0].tmcCredits || 0;
  const newBalance = currentBalance + amount;
  
  // Update user balance
  await db.update(users)
    .set({ tmcCredits: newBalance })
    .where(eq(users.id, userId));
  
  // Record transaction
  await db.insert(tmcTransactions).values({
    userId,
    type: 'credit',
    amount,
    reason,
    functionUsed: metadata?.functionUsed || reason,
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    metadata,
  });
  
  return newBalance;
}

// Transfer credits with commission (e.g., doctor commission from consultation)
export async function transferWithCommission(
  fromUserId: string,
  toUserId: string,
  amount: number,
  commissionPercent: number,
  reason: string,
  metadata?: any
) {
  const commissionAmount = Math.floor((amount * commissionPercent) / 100);
  
  // Debit from source (this goes to cashbox)
  await debitCredits(fromUserId, amount, reason, metadata);
  
  // Credit commission to recipient
  if (commissionAmount > 0) {
    await creditUser(
      toUserId,
      commissionAmount,
      `commission_${reason}`,
      { ...metadata, commissionPercent, originalAmount: amount }
    );
    
    // Record commission transaction link
    await db.insert(tmcTransactions).values({
      userId: toUserId,
      type: 'commission',
      amount: commissionAmount,
      reason: `commission_${reason}`,
      relatedUserId: fromUserId,
      functionUsed: metadata?.functionUsed || reason,
      balanceBefore: 0, // Will be updated in creditUser
      balanceAfter: 0, // Will be updated in creditUser
      metadata,
    });
  }
  
  return { commissionAmount, totalDebited: amount };
}

// Add revenue to cashbox
export async function addCashboxRevenue(
  amount: number,
  description: string,
  relatedTransactionId?: string,
  performedBy?: string
) {
  // Get current cashbox
  const box = await db.select().from(cashbox).limit(1);
  if (!box || box.length === 0) {
    throw new Error('Cashbox not initialized');
  }
  
  const currentBalance = box[0].balance;
  const newBalance = currentBalance + amount;
  
  // Update cashbox
  await db.update(cashbox)
    .set({
      balance: newBalance,
      totalRevenue: box[0].totalRevenue + amount,
    })
    .where(eq(cashbox.id, box[0].id));
  
  // Record transaction
  await db.insert(cashboxTransactions).values({
    type: 'revenue',
    amount,
    description,
    relatedTransactionId,
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    performedBy,
  });
  
  return newBalance;
}

// Deduct server costs from cashbox
export async function deductServerCosts(
  amount: number,
  description: string,
  performedBy: string
) {
  // Get current cashbox
  const box = await db.select().from(cashbox).limit(1);
  if (!box || box.length === 0) {
    throw new Error('Cashbox not initialized');
  }
  
  const currentBalance = box[0].balance;
  
  if (currentBalance < amount) {
    throw new Error('Insufficient cashbox balance');
  }
  
  const newBalance = currentBalance - amount;
  
  // Update cashbox
  await db.update(cashbox)
    .set({
      balance: newBalance,
      totalExpenses: box[0].totalExpenses + amount,
      serverCosts: box[0].serverCosts + amount,
    })
    .where(eq(cashbox.id, box[0].id));
  
  // Record transaction
  await db.insert(cashboxTransactions).values({
    type: 'server_cost',
    amount: -amount,
    description,
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    performedBy,
  });
  
  return newBalance;
}

// Get user credit balance
export async function getUserBalance(userId: string) {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.length === 0) {
    throw new Error('User not found');
  }
  
  return user[0].tmcCredits || 0;
}

// Get user transaction history
export async function getUserTransactions(userId: string, limit = 50) {
  return await db.select()
    .from(tmcTransactions)
    .where(eq(tmcTransactions.userId, userId))
    .orderBy(desc(tmcTransactions.createdAt))
    .limit(limit);
}

// Get cashbox balance and stats
export async function getCashboxStats() {
  const box = await db.select().from(cashbox).limit(1);
  if (!box || box.length === 0) {
    return null;
  }
  
  return box[0];
}

// Get cashbox transaction history
export async function getCashboxTransactions(limit = 100) {
  return await db.select()
    .from(cashboxTransactions)
    .orderBy(desc(cashboxTransactions.createdAt))
    .limit(limit);
}
