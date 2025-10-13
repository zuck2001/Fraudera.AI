import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  amount: number;

  @Column()
  merchantId: string;

  @Column()
  location: string;

  @Column()
  timestamp: Date;

  @Column({ default: 0 })
  dailyCount: number;

  @Column({ default: 0 })
  monthlyCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'float', nullable: true })
  riskScore: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  avgAmount: number;

  @Column({ type: 'varchar', nullable: true })
  lastLocation: string | null;

  @Column({ default: false })
  isNightTransaction: boolean;

  @Column({ default: 'approved', type: 'varchar', length: 20, nullable: true })
  status: string;
}
