import { db } from "../db";
import { users, tmcTransactions, tmcCreditPackages, paypalOrders, tmcConfig, cashbox, cashboxTransactions } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export class CreditService {
  
  /**
   * Get user's current credit balance
   */
  async getUserBalance(userId: string): Promise<number> {
    const user = await db.select({ tmcCredits: users.tmcCredits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return user[0]?.tmcCredits || 0;
  }

  /**
   * Add credits to user account
   */
  async addCredits(
    userId: string, 
    amount: number, 
    reason: string, 
    metadata?: any
  ): Promise<void> {
    const currentBalance = await this.getUserBalance(userId);
    const newBalance = currentBalance + amount;

    await db.transaction(async (tx) => {
      // Update user balance
      await tx.update(users)
        .set({ tmcCredits: newBalance })
        .where(eq(users.id, userId));

      // Create transaction record
      await tx.insert(tmcTransactions).values({
        userId,
        type: 'credit',
        amount,
        reason,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        metadata,
      });
    });
  }

  /**
   * Debit credits from user account
   */
  async debitCredits(
    userId: string, 
    amount: number, 
    reason: string, 
    functionUsed?: string,
    relatedIds?: {
      appointmentId?: string;
      medicalRecordId?: string;
    }
  ): Promise<boolean> {
    const currentBalance = await this.getUserBalance(userId);
    
    if (currentBalance < amount) {
      return false; // Insufficient balance
    }

    const newBalance = currentBalance - amount;

    await db.transaction(async (tx) => {
      // Update user balance
      await tx.update(users)
        .set({ tmcCredits: newBalance })
        .where(eq(users.id, userId));

      // Create transaction record
      await tx.insert(tmcTransactions).values({
        userId,
        type: 'debit',
        amount: -amount,
        reason,
        functionUsed,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        appointmentId: relatedIds?.appointmentId,
        medicalRecordId: relatedIds?.medicalRecordId,
      });
    });

    return true;
  }

  /**
   * Transfer credits between users (e.g., doctor commissions)
   */
  async transferCredits(
    fromUserId: string,
    toUserId: string,
    amount: number,
    reason: string
  ): Promise<boolean> {
    const fromBalance = await this.getUserBalance(fromUserId);
    
    if (fromBalance < amount) {
      return false;
    }

    await db.transaction(async (tx) => {
      // Debit from sender
      const newFromBalance = fromBalance - amount;
      await tx.update(users)
        .set({ tmcCredits: newFromBalance })
        .where(eq(users.id, fromUserId));

      await tx.insert(tmcTransactions).values({
        userId: fromUserId,
        type: 'transfer',
        amount: -amount,
        reason,
        relatedUserId: toUserId,
        balanceBefore: fromBalance,
        balanceAfter: newFromBalance,
      });

      // Credit to receiver
      const toBalance = await this.getUserBalance(toUserId);
      const newToBalance = toBalance + amount;
      await tx.update(users)
        .set({ tmcCredits: newToBalance })
        .where(eq(users.id, toUserId));

      await tx.insert(tmcTransactions).values({
        userId: toUserId,
        type: 'transfer',
        amount,
        reason,
        relatedUserId: fromUserId,
        balanceBefore: toBalance,
        balanceAfter: newToBalance,
      });
    });

    return true;
  }

  /**
   * Process commission payment to superior doctor
   */
  async processCommission(
    patientUserId: string,
    doctorUserId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const doctor = await db.select({
      superiorDoctorId: users.superiorDoctorId,
      percentageFromInferiors: users.percentageFromInferiors,
    })
      .from(users)
      .where(eq(users.id, doctorUserId))
      .limit(1);

    if (doctor[0]?.superiorDoctorId) {
      const superiorDoctor = await db.select({
        percentageFromInferiors: users.percentageFromInferiors,
      })
        .from(users)
        .where(eq(users.id, doctor[0].superiorDoctorId))
        .limit(1);

      const commissionPercentage = superiorDoctor[0]?.percentageFromInferiors || 10;
      const commissionAmount = Math.floor((amount * commissionPercentage) / 100);

      if (commissionAmount > 0) {
        await this.transferCredits(
          doctorUserId,
          doctor[0].superiorDoctorId,
          commissionAmount,
          `Comissão: ${reason}`
        );
      }
    }
  }

  /**
   * Get transaction history for user
   */
  async getTransactionHistory(userId: string, limit: number = 50) {
    return await db.select()
      .from(tmcTransactions)
      .where(eq(tmcTransactions.userId, userId))
      .orderBy(desc(tmcTransactions.createdAt))
      .limit(limit);
  }

  /**
   * Get all available credit packages
   */
  async getAvailablePackages() {
    return await db.select()
      .from(tmcCreditPackages)
      .where(eq(tmcCreditPackages.isActive, true))
      .orderBy(tmcCreditPackages.displayOrder);
  }

  /**
   * Create PayPal order for credit purchase
   */
  async createCreditPurchaseOrder(
    userId: string,
    packageId: string,
    paypalOrderId: string,
    amount: string,
    currency: string
  ) {
    const pkg = await db.select()
      .from(tmcCreditPackages)
      .where(eq(tmcCreditPackages.id, packageId))
      .limit(1);

    if (!pkg[0]) {
      throw new Error("Package not found");
    }

    const creditsAmount = pkg[0].credits + (pkg[0].bonusCredits || 0);

    const order = await db.insert(paypalOrders).values({
      userId,
      packageId,
      paypalOrderId,
      amount,
      currency,
      creditsAmount,
      status: 'created',
    }).returning();

    return order[0];
  }

  /**
   * Capture PayPal order and credit user account
   */
  async captureAndCreditOrder(
    paypalOrderId: string,
    captureId: string,
    payerEmail?: string,
    payerId?: string
  ) {
    const order = await db.select()
      .from(paypalOrders)
      .where(eq(paypalOrders.paypalOrderId, paypalOrderId))
      .limit(1);

    if (!order[0]) {
      throw new Error("Order not found");
    }

    if (order[0].status === 'captured') {
      throw new Error("Order already captured");
    }

    await db.transaction(async (tx) => {
      // Update order status
      await tx.update(paypalOrders)
        .set({
          status: 'captured',
          captureId,
          payerEmail,
          payerId,
          capturedAt: new Date(),
        })
        .where(eq(paypalOrders.id, order[0].id));

      // Add credits to user
      const currentBalance = await this.getUserBalance(order[0].userId);
      const newBalance = currentBalance + order[0].creditsAmount;

      await tx.update(users)
        .set({ tmcCredits: newBalance })
        .where(eq(users.id, order[0].userId));

      // Create transaction record
      const transaction = await tx.insert(tmcTransactions).values({
        userId: order[0].userId,
        type: 'recharge',
        amount: order[0].creditsAmount,
        reason: 'Compra de créditos via PayPal',
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        metadata: {
          paypalOrderId,
          captureId,
          packageId: order[0].packageId,
        },
      }).returning();

      // Update PayPal order with transaction ID
      await tx.update(paypalOrders)
        .set({ transactionId: transaction[0].id })
        .where(eq(paypalOrders.id, order[0].id));
    });
  }

  /**
   * Get cost configuration for a function
   */
  async getFunctionCost(functionName: string): Promise<number> {
    const config = await db.select({ costInCredits: tmcConfig.costInCredits })
      .from(tmcConfig)
      .where(and(
        eq(tmcConfig.functionName, functionName),
        eq(tmcConfig.isActive, true)
      ))
      .limit(1);

    return config[0]?.costInCredits || 0;
  }

  /**
   * Update function cost (admin only)
   */
  async updateFunctionCost(
    functionName: string,
    costInCredits: number,
    updatedBy: string
  ) {
    const existing = await db.select()
      .from(tmcConfig)
      .where(eq(tmcConfig.functionName, functionName))
      .limit(1);

    if (existing[0]) {
      await db.update(tmcConfig)
        .set({ costInCredits, updatedBy, updatedAt: new Date() })
        .where(eq(tmcConfig.functionName, functionName));
    } else {
      await db.insert(tmcConfig).values({
        functionName,
        costInCredits,
        description: `Custo para usar ${functionName}`,
        category: 'admin',
        updatedBy,
      });
    }
  }

  /**
   * Get all function costs (admin)
   */
  async getAllFunctionCosts() {
    return await db.select()
      .from(tmcConfig)
      .where(eq(tmcConfig.isActive, true))
      .orderBy(tmcConfig.category, tmcConfig.functionName);
  }
}

export const creditService = new CreditService();
