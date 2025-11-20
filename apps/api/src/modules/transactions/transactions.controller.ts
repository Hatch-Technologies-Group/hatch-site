import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AttachTransactionDocumentDto } from './dto/attach-transaction-document.dto';

interface AuthedRequest {
  user?: { userId?: string };
}

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('organizations/:orgId/transactions')
export class TransactionsController {
  constructor(private readonly svc: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: CreateTransactionDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.createTransaction(orgId, userId, dto);
  }

  @Patch(':transactionId')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('orgId') orgId: string,
    @Param('transactionId') transactionId: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateTransactionDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.updateTransaction(orgId, userId, transactionId, dto);
  }

  @Post(':transactionId/documents')
  @UseGuards(JwtAuthGuard)
  attachDocument(
    @Param('orgId') orgId: string,
    @Param('transactionId') transactionId: string,
    @Req() req: AuthedRequest,
    @Body() dto: AttachTransactionDocumentDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.attachTransactionDocument(orgId, userId, transactionId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listTransactions(orgId, userId);
  }
}

