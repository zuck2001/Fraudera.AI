import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { Transaction } from './fraud.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [FraudController],
  providers: [FraudService],
})
export class FraudModule {}
