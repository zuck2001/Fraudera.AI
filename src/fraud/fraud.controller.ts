import { Controller, Post, Body, Get } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { Transaction } from './fraud.entity';

@Controller('fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('check')
  checkTransaction(@Body() transactionData: Partial<Transaction>) {
    return this.fraudService.analyzeTransaction(transactionData);
  }

  @Get('all')
  getAllTransactions() {
    return this.fraudService.getAll();
  }

  @Get('analytics')
  getAnalytics() {
    return this.fraudService.getAnalytics();
  }
}
