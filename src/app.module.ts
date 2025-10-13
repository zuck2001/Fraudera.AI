import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudModule } from './fraud/fraud.module';
import { DashboardModule } from './fraud/dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'fraudera.db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    FraudModule,
    DashboardModule,
  ],
})
export class AppModule {}
