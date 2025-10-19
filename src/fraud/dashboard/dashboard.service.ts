import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Transaction } from '../fraud.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  async getStats(
    startDate?: string,
    endDate?: string,
  ): Promise<{
    total: number;
    approved: number;
    declined: number;
    avgRisk: number;
  }> {
    const where: Record<string, any> = {};
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const all: Transaction[] = await this.transactionRepo.find({ where });
    const total = all.length;
    const declined = all.filter((t: Transaction) => t.status === 'declined').length;
    const approved = all.filter((t: Transaction) => t.status === 'approved').length;
    const avgRisk = all.reduce((sum, t: Transaction) => sum + (t.riskScore || 0), 0) / (total || 1);

    return { total, approved, declined, avgRisk };
  }

  async getTopMerchants(
    startDate?: string,
    endDate?: string,
  ): Promise<{ merchantId: string; count: number }[]> {
    const where: Record<string, any> = {};
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const all: Transaction[] = await this.transactionRepo.find({ where });
    const grouped: Record<string, number> = {};
    for (const tx of all) {
      grouped[tx.merchantId] = (grouped[tx.merchantId] || 0) + 1;
    }

    const sorted = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([merchantId, count]) => ({ merchantId, count }));

    return sorted;
  }

  async getRiskBreakdown(
    startDate?: string,
    endDate?: string,
  ): Promise<{
    low: number;
    medium: number;
    high: number;
  }> {
    const where: Record<string, any> = {};
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const all: Transaction[] = await this.transactionRepo.find({ where });
    const low = all.filter((t: Transaction) => (t.riskScore || 0) <= 0.3).length;
    const medium = all.filter(
      (t: Transaction) => (t.riskScore || 0) > 0.3 && (t.riskScore || 0) <= 0.7,
    ).length;
    const high = all.filter((t: Transaction) => (t.riskScore || 0) > 0.7).length;

    return { low, medium, high };
  }

  async getRecentTransactions(limit = 10): Promise<Transaction[]> {
    const recent: Transaction[] = await this.transactionRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return recent;
  }

  async getByCountry(startDate?: string, endDate?: string) {
    const where: Record<string, any> = {};
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    }
    const all: Transaction[] = await this.transactionRepo.find({ where });
    const grouped: Record<string, number> = {};
    for (const tx of all) {
      const country = tx.country || 'Unknown';
      grouped[country] = (grouped[country] || 0) + 1;
    }

    return Object.entries(grouped)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }
}
