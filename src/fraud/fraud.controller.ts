import {
  Controller,
  Post,
  Body,
  Get,
  UploadedFile,
  UseInterceptors,
  Patch,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FraudService } from './fraud.service';
import { Transaction } from './fraud.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';

@Controller('fraud')
export class FraudController {
  constructor(
    private readonly fraudService: FraudService,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

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

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (
          req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const transaction = this.transactionRepo.create({
      amount: 0,
      merchantId: 'file_upload',
      location: 'system',
      timestamp: new Date(),
      riskScore: 0,
      status: 'pending',
      documentStatus: 'pending',
    });
    await this.transactionRepo.save(transaction);

    return {
      message: 'File uploaded successfully and pending verification',
      fileName: file.filename,
      documentStatus: transaction.documentStatus,
    };
  }

  @Post('verify-docs')
  verifyDocs(
    @Body()
    body: {
      id?: number;
      nationalId?: string;
      passportNumber?: string;
      commercialRegister?: string;
      taxCardNumber?: string;
    },
  ) {
    if (
      !body.nationalId &&
      !body.passportNumber &&
      !body.commercialRegister &&
      !body.taxCardNumber
    ) {
      throw new BadRequestException('No document data provided for verification');
    }

    try {
      // 👇 Add explicit type for returned value from service
      const result: { result: 'verified' | 'fake' } = this.fraudService.verifyDocumentData(body);

      return {
        message: 'Document verification simulated',
        id: body.id,
        result: result.result,
      };
    } catch (error: unknown) {
      // 👇 Safe error handling to avoid unsafe access
      throw new BadRequestException(error instanceof Error ? error.message : 'Verification failed');
    }
  }

  @Patch('verify/:id')
  async verifyDocument(@Param('id') id: number, @Body('result') result: string) {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (result !== 'verified' && result !== 'fake') {
      throw new BadRequestException('Result must be either "verified" or "fake"');
    }

    transaction.documentStatus = result;
    await this.transactionRepo.save(transaction);
    return { message: `Document marked as ${result}` };
  }

  @Get('documents')
  async getAllDocuments() {
    const transactions = await this.transactionRepo.find({
      where: { merchantId: 'file_upload' },
      order: { timestamp: 'DESC' },
    });

    return transactions.map((t) => ({
      id: t.id,
      fileName: t.merchantId,
      status: t.documentStatus,
      uploadedAt: t.timestamp,
    }));
  }
}
