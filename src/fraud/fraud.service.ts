import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './fraud.entity';

@Injectable()
export class FraudService {
  getDocumentsFiltered() {
    throw new Error('Method not implemented.');
  }

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  async analyzeTransaction(transactionData: Partial<Transaction>) {
    const { amount, merchantId, location, timestamp } = transactionData;

    if (!timestamp) {
      throw new Error('Transaction timestamp is required');
    }

    const date = new Date(timestamp);
    const today = date.toISOString().split('T')[0];
    const month = date.getMonth();

    const merchantTransactions = await this.transactionRepo.find({
      where: { merchantId },
    });

    const dailyCount = merchantTransactions.filter(
      (t) => new Date(t.timestamp).toISOString().split('T')[0] === today,
    ).length;

    const monthlyCount = merchantTransactions.filter(
      (t) => new Date(t.timestamp).getMonth() === month,
    ).length;

    const avgAmount =
      merchantTransactions.length > 0
        ? merchantTransactions.reduce((sum, t) => sum + t.amount, 0) / merchantTransactions.length
        : 0;

    const hour = date.getUTCHours();
    const isNightTransaction = hour >= 0 && hour < 6;

    const lastLocation =
      merchantTransactions.length > 0
        ? merchantTransactions[merchantTransactions.length - 1].location
        : null;

    const MAX_DAILY_TX = 20;
    const MAX_MONTHLY_TX = 100;
    const MAX_AMOUNT = 5000;

    let riskScore = 0.1;
    let reason = 'Normal transaction';

    if (typeof amount === 'number' && amount > MAX_AMOUNT) {
      riskScore += 0.6;
      reason = 'High transaction amount';
    }

    if (dailyCount > MAX_DAILY_TX) {
      riskScore += 0.2;
      reason = 'Too many daily transactions';
    }

    if (monthlyCount > MAX_MONTHLY_TX) {
      riskScore += 0.2;
      reason = 'Unusual monthly transaction volume';
    }

    if (avgAmount && typeof amount === 'number' && amount > avgAmount * 2) {
      riskScore += 0.3;
      reason = 'Amount is higher than merchants average';
    }

    if (isNightTransaction) {
      riskScore += 0.2;
      reason = 'Suspicious night transaction';
    }

    if (lastLocation && lastLocation !== location) {
      riskScore += 0.2;
      reason = 'Transaction from unusual location';
    }

    riskScore = Math.min(riskScore, 1);

    const status = riskScore > 0.7 ? 'declined' : 'approved';

    const transaction = this.transactionRepo.create({
      ...transactionData,
      avgAmount,
      lastLocation,
      isNightTransaction,
      riskScore,
      status,
      country: transactionData.country || 'Unknown',
    });

    await this.transactionRepo.save(transaction);

    return {
      status,
      riskScore,
      reason,
      dailyCount,
      monthlyCount,
      avgAmount,
      isNightTransaction,
      lastLocation,
    };
  }

  async getAll() {
    const transactions = await this.transactionRepo.find();
    return transactions.map((t) => ({
      ...t,
      riskScore: typeof t.riskScore === 'number' && !isNaN(t.riskScore) ? t.riskScore : 0,
    }));
  }

  async getAnalytics() {
    const all = await this.transactionRepo.find();
    const total = all.length;
    if (total === 0) {
      return {
        total: 0,
        declined: 0,
        avgRisk: 0,
        uniqueMerchants: 0,
        topMerchants: [],
        highRiskLast7DaysPercent: 0,
      };
    }
    const declined = all.filter((t) => t.status === 'declined').length;
    const avgRisk = all.reduce((sum, t) => sum + (t.riskScore || 0), 0) / total;
    const merchantsMap = new Map<string, number>();
    all.forEach((t) => {
      merchantsMap.set(t.merchantId, (merchantsMap.get(t.merchantId) || 0) + 1);
    });
    const uniqueMerchants = merchantsMap.size;
    const topMerchants = Array.from(merchantsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([merchantId, count]) => ({ merchantId, count }));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTx = all.filter((t) => new Date(t.timestamp) >= sevenDaysAgo);
    const highRiskLast7Days = recentTx.filter((t) => (t.riskScore || 0) > 0.7).length;

    const highRiskLast7DaysPercent = recentTx.length
      ? (highRiskLast7Days / recentTx.length) * 100
      : 0;
    return {
      total,
      declined,
      avgRisk: parseFloat(avgRisk.toFixed(2)),
      uniqueMerchants,
      topMerchants,
      highRiskLast7DaysPercent: highRiskLast7DaysPercent.toFixed(1),
    };
  }

  // ✅ Fixed version (removed unnecessary async)
  verifyDocumentData(data: {
    id?: number;
    nationalId?: string;
    passportNumber?: string;
    commercialRegister?: string;
    taxCardNumber?: string;
  }): { result: 'verified' | 'fake' } {
    try {
      const hasValidId =
        (data.nationalId && data.nationalId.length > 5) ||
        (data.passportNumber && data.passportNumber.length > 5) ||
        (data.commercialRegister && data.commercialRegister.length > 5) ||
        (data.taxCardNumber && data.taxCardNumber.length > 5);

      const result: 'verified' | 'fake' = hasValidId ? 'verified' : 'fake';
      return { result };
    } catch (error: unknown) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Document verification failed',
      );
    }
  }
}
