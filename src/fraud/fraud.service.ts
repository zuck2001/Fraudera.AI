import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './fraud.entity';

@Injectable()
export class FraudService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  async analyzeTransaction(transactionData: Partial<Transaction>) {
    const { amount, merchantId, timestamp } = transactionData;
    if (!timestamp) {
      throw new Error('Transaction timestamp is required');
    }

    const date = new Date(timestamp);
    const today = date.toISOString().split('T')[0];
    const month = date.getMonth();

    const allTransactions = await this.transactionRepo.find({
      where: { merchantId },
    });

    const dailyCount = allTransactions.filter(
      (t) => new Date(t.timestamp).toISOString().split('T')[0] === today,
    ).length;

    const monthlyCount = allTransactions.filter(
      (t) => new Date(t.timestamp).getMonth() === month,
    ).length;

    const MAX_DAILY_TX = 20;
    const MAX_MONTHLY_TX = 100;
    const MAX_AMOUNT = 5000;

    let risk = 'low';
    let reason = 'Normal transaction';
    let riskScore = 0.1;

    if (typeof amount === 'number' && amount > MAX_AMOUNT) {
      risk = 'high';
      reason = 'Transaction amount exceeds threshold';
      riskScore = 0.9;
    } else if (dailyCount > MAX_DAILY_TX) {
      risk = 'high';
      reason = 'Too many transactions today';
      riskScore = 0.8;
    } else if (monthlyCount > MAX_MONTHLY_TX) {
      risk = 'medium';
      reason = 'Unusual monthly transaction volume';
      riskScore = 0.6;
    }

    const status = risk === 'high' ? 'declined' : 'approved';

    const transaction = this.transactionRepo.create({
      ...transactionData,
      riskScore,
      status,
    });

    await this.transactionRepo.save(transaction);

    return {
      status,
      riskScore,
      reason,
      dailyCount,
      monthlyCount,
    };
  }

  async getAll() {
    return this.transactionRepo.find();
  }
}
