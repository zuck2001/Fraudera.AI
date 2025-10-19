import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.dashboardService.getStats(startDate, endDate);
  }

  @Get('top-merchants')
  getTopMerchants(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.dashboardService.getTopMerchants(startDate, endDate);
  }

  @Get('risk-breakdown')
  getRiskBreakdown(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.dashboardService.getRiskBreakdown(startDate, endDate);
  }

  @Get('recent')
  getRecentTransactions() {
    return this.dashboardService.getRecentTransactions();
  }

  @Get('by-country')
  getByCountry(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.dashboardService.getByCountry(startDate, endDate);
  }
}
