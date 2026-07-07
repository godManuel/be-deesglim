import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PipelineStage, Types, Model } from 'mongoose';
import {
  PaymentMethod,
  PaymentTransaction,
  PaymentTransactionDocument,
  PaymentTransactionStatus,
} from '../orders/schemas/payment-transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  TransactionStatusFilter,
  TransactionsQueryDto,
} from './dto/transactions-query.dto';
import { TransactionsOverviewQueryDto } from './dto/transactions-overview-query.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(PaymentTransaction.name)
    private readonly paymentTxModel: Model<PaymentTransactionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getOverview(query: TransactionsOverviewQueryDto) {
    const days = query.days ?? 30;
    const startDate = this.getStartDate(days);
    const previousStartDate = this.getStartDate(days * 2);

    const [current, previous] = await Promise.all([
      this.getOverviewAggregate(startDate),
      this.getOverviewAggregate(previousStartDate, startDate),
    ]);

    const currentRevenue = Number(current.totalRevenue ?? 0);
    const previousRevenue = Number(previous.totalRevenue ?? 0);
    const currentSuccessRate = Number(current.successRate ?? 0);
    const previousSuccessRate = Number(previous.successRate ?? 0);

    return {
      periodDays: days,
      cards: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalRevenueChangePercent: this.percentChange(
          currentRevenue,
          previousRevenue,
        ),
        averageTransaction: Number(
          Number(current.averageTransaction ?? 0).toFixed(2),
        ),
        pendingPayouts: Number(Number(current.pendingPayouts ?? 0).toFixed(2)),
        successRate: Number(currentSuccessRate.toFixed(2)),
        successRateChangePercent: this.percentChange(
          currentSuccessRate,
          previousSuccessRate,
        ),
      },
      totals: {
        totalTransactions: current.totalTransactions,
        successfulTransactions: current.successfulTransactions,
        pendingTransactions: current.pendingTransactions,
        refundedTransactions: current.refundedTransactions,
      },
    };
  }

  async listTransactions(query: TransactionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const baseMatch = this.buildBaseMatch(query);
    const pipeline = this.buildListPipeline(query, baseMatch, skip, limit);

    const [result] = await this.paymentTxModel.aggregate<{
      data: Array<any>;
      totalCount: Array<{ value: number }>;
    }>(pipeline);

    const data = (result?.data ?? []).map((item) => ({
      id: item.id,
      transactionId: item.transactionId,
      reference: item.reference,
      date: item.date,
      customer: {
        id: item.customerId,
        fullName: item.customerName,
        email: item.customerEmail,
      },
      method: item.method,
      amount: Number(Number(item.amount ?? 0).toFixed(2)),
      status: item.status,
      orderNumber: item.orderNumber,
      orderId: item.orderId,
    }));

    const total = result?.totalCount?.[0]?.value ?? 0;
    const showingFrom = total === 0 ? 0 : skip + 1;
    const showingTo = total === 0 ? 0 : Math.min(skip + data.length, total);

    const statusCounts = await this.getStatusCounts(baseMatch);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        showingFrom,
        showingTo,
      },
      summary: `Showing ${showingFrom}-${showingTo} of ${total} results`,
      filters: {
        status: query.status ?? 'ALL',
        paymentMethod: query.paymentMethod ?? null,
        minAmount: query.minAmount ?? null,
        maxAmount: query.maxAmount ?? null,
        search: query.search?.trim() ?? null,
        days: query.days ?? 30,
      },
      statusCounts,
    };
  }

  async getTransactionDetails(idOrReference: string) {
    const condition = Types.ObjectId.isValid(idOrReference)
      ? {
          $or: [
            { _id: new Types.ObjectId(idOrReference) },
            { reference: idOrReference },
          ],
        }
      : { reference: idOrReference };

    const transaction = await this.paymentTxModel
      .findOne(condition)
      .populate('userId', 'fullName email')
      .populate('orderId', 'orderNumber status total')
      .lean()
      .exec();

    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }

    const user = transaction.userId as unknown as {
      fullName?: string;
      email?: string;
      _id?: Types.ObjectId;
    };
    const order = transaction.orderId as unknown as {
      _id?: Types.ObjectId;
      orderNumber?: string;
      status?: string;
      total?: number;
    };

    return {
      id: transaction._id.toString(),
      transactionId: transaction.reference,
      reference: transaction.reference,
      status: this.mapDisplayStatus(
        transaction.status,
        transaction.paystackStatus,
      ),
      amount: Number(Number(transaction.total ?? 0).toFixed(2)),
      amountKobo: transaction.amountKobo,
      date: transaction.paidAt ?? (transaction as any).createdAt,
      customer: {
        id: user?._id?.toString() ?? null,
        fullName: user?.fullName ?? 'Unknown Customer',
        email: user?.email ?? null,
      },
      payment: {
        method: this.formatPaymentMethod(transaction.methodOfPayment),
        paystackStatus: transaction.paystackStatus ?? null,
        paystackChannel: transaction.paystackChannel ?? null,
        methodOfPayment: transaction.methodOfPayment ?? PaymentMethod.UNKNOWN,
        authorizationUrl: transaction.paystackAuthorizationUrl ?? null,
        accessCode: transaction.paystackAccessCode ?? null,
      },
      order: order
        ? {
            id: order._id?.toString() ?? null,
            orderNumber: order.orderNumber ?? null,
            status: order.status ?? null,
            total: Number(Number(order.total ?? 0).toFixed(2)),
          }
        : null,
      breakdown: {
        subtotal: Number(Number(transaction.subtotal ?? 0).toFixed(2)),
        taxTotal: Number(Number(transaction.taxTotal ?? 0).toFixed(2)),
        shippingTotal: Number(
          Number(transaction.shippingTotal ?? 0).toFixed(2),
        ),
        discountTotal: Number(
          Number(transaction.discountTotal ?? 0).toFixed(2),
        ),
        total: Number(Number(transaction.total ?? 0).toFixed(2)),
      },
      shippingAddress: transaction.shippingAddress,
      items: transaction.items,
    };
  }

  async exportTransactions(query: TransactionsQueryDto) {
    const exportQuery: TransactionsQueryDto = {
      ...query,
      page: 1,
      limit: 5000,
    };

    const list = await this.listTransactions(exportQuery);
    const rows = list.data;

    const header = [
      'transaction_id',
      'reference',
      'date',
      'customer_name',
      'customer_email',
      'method',
      'amount',
      'status',
      'order_number',
    ];

    const csvRows = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.transactionId,
          row.reference,
          this.toCsvDate(row.date),
          this.escapeCsv(row.customer.fullName),
          this.escapeCsv(row.customer.email ?? ''),
          this.escapeCsv(row.method),
          row.amount.toFixed(2),
          row.status,
          this.escapeCsv(row.orderNumber ?? ''),
        ].join(','),
      ),
    ];

    return {
      filename: `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv',
      totalRows: rows.length,
      csv: csvRows.join('\n'),
    };
  }

  async getFilterOptions(query: TransactionsOverviewQueryDto) {
    const days = query.days ?? 30;
    const baseMatch = {
      createdAt: { $gte: this.getStartDate(days) },
    };

    const [paymentMethods, amountRange, statusCounts] = await Promise.all([
      this.paymentTxModel.distinct('methodOfPayment', {
        ...baseMatch,
        methodOfPayment: { $nin: [null, '', PaymentMethod.UNKNOWN] },
      }),
      this.paymentTxModel.aggregate<{ minAmount: number; maxAmount: number }>([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            minAmount: { $min: '$total' },
            maxAmount: { $max: '$total' },
          },
        },
        {
          $project: {
            _id: 0,
            minAmount: { $ifNull: ['$minAmount', 0] },
            maxAmount: { $ifNull: ['$maxAmount', 0] },
          },
        },
      ]),
      this.getStatusCounts(baseMatch),
    ]);

    const range = amountRange[0] ?? { minAmount: 0, maxAmount: 0 };

    return {
      periodDays: days,
      paymentMethods: paymentMethods
        .filter((value): value is string => typeof value === 'string')
        .map((value) => ({
          value,
          label: this.formatPaymentMethod(value),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
      amountRange: {
        minAmount: Number(Number(range.minAmount ?? 0).toFixed(2)),
        maxAmount: Number(Number(range.maxAmount ?? 0).toFixed(2)),
      },
      statusCounts,
    };
  }

  private buildBaseMatch(query: TransactionsQueryDto): Record<string, any> {
    const match: Record<string, any> = {
      createdAt: { $gte: this.getStartDate(query.days ?? 30) },
    };

    if (
      typeof query.minAmount === 'number' ||
      typeof query.maxAmount === 'number'
    ) {
      match.total = {};
      if (typeof query.minAmount === 'number') {
        match.total.$gte = query.minAmount;
      }
      if (typeof query.maxAmount === 'number') {
        match.total.$lte = query.maxAmount;
      }
    }

    if (query.status && query.status !== 'ALL') {
      Object.assign(match, this.getStatusMatch(query.status));
    }

    return match;
  }

  private buildListPipeline(
    query: TransactionsQueryDto,
    baseMatch: Record<string, any>,
    skip: number,
    limit: number,
  ): PipelineStage[] {
    const pipeline: PipelineStage[] = [
      { $match: baseMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order',
        },
      },
      {
        $unwind: {
          path: '$order',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          transactionId: '$reference',
          customerName: { $ifNull: ['$user.fullName', 'Unknown Customer'] },
          customerEmail: '$user.email',
          method: {
            $ifNull: ['$methodOfPayment', PaymentMethod.UNKNOWN],
          },
          status: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$paystackStatus', ''] },
                      regex: 'refund|revers',
                      options: 'i',
                    },
                  },
                  then: 'REFUNDED',
                },
                {
                  case: { $eq: ['$status', PaymentTransactionStatus.SUCCESS] },
                  then: 'COMPLETED',
                },
                {
                  case: {
                    $eq: ['$status', PaymentTransactionStatus.INITIATED],
                  },
                  then: 'PENDING',
                },
                {
                  case: { $eq: ['$status', PaymentTransactionStatus.FAILED] },
                  then: 'FAILED',
                },
              ],
              default: 'UNKNOWN',
            },
          },
          date: { $ifNull: ['$paidAt', '$createdAt'] },
          amount: '$total',
          orderNumber: '$order.orderNumber',
        },
      },
    ];

    const paymentMethod = query.paymentMethod?.trim();
    if (paymentMethod) {
      const normalizedPaymentMethod = paymentMethod
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

      pipeline.push({
        $match: {
          methodOfPayment: normalizedPaymentMethod,
        },
      });
    }

    const search = query.search?.trim();
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { reference: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { customerEmail: { $regex: search, $options: 'i' } },
            { orderNumber: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({ $sort: { date: -1 } });
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              transactionId: 1,
              reference: 1,
              date: 1,
              customerId: {
                $cond: [
                  { $ifNull: ['$user._id', false] },
                  { $toString: '$user._id' },
                  null,
                ],
              },
              customerName: 1,
              customerEmail: 1,
              method: 1,
              amount: 1,
              status: 1,
              orderNumber: 1,
              orderId: {
                $cond: [
                  { $ifNull: ['$order._id', false] },
                  { $toString: '$order._id' },
                  null,
                ],
              },
            },
          },
        ],
        totalCount: [{ $count: 'value' }],
      },
    });

    return pipeline;
  }

  private async getStatusCounts(baseMatch: Record<string, any>) {
    const [result] = await this.paymentTxModel.aggregate<{
      counts: Array<{ status: string; count: number }>;
    }>([
      { $match: baseMatch },
      {
        $addFields: {
          mappedStatus: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$paystackStatus', ''] },
                      regex: 'refund|revers',
                      options: 'i',
                    },
                  },
                  then: 'REFUNDED',
                },
                {
                  case: { $eq: ['$status', PaymentTransactionStatus.SUCCESS] },
                  then: 'COMPLETED',
                },
                {
                  case: {
                    $eq: ['$status', PaymentTransactionStatus.INITIATED],
                  },
                  then: 'PENDING',
                },
                {
                  case: { $eq: ['$status', PaymentTransactionStatus.FAILED] },
                  then: 'FAILED',
                },
              ],
              default: 'UNKNOWN',
            },
          },
        },
      },
      {
        $group: {
          _id: '$mappedStatus',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
        },
      },
      {
        $facet: {
          counts: [{ $sort: { status: 1 } }],
        },
      },
    ]);

    const mapped = new Map(
      (result?.counts ?? []).map((item) => [item.status, item.count]),
    );

    return {
      all:
        (mapped.get('COMPLETED') ?? 0) +
        (mapped.get('PENDING') ?? 0) +
        (mapped.get('FAILED') ?? 0) +
        (mapped.get('REFUNDED') ?? 0),
      completed: mapped.get('COMPLETED') ?? 0,
      pending: mapped.get('PENDING') ?? 0,
      failed: mapped.get('FAILED') ?? 0,
      refunded: mapped.get('REFUNDED') ?? 0,
    };
  }

  private async getOverviewAggregate(startDate: Date, endDate?: Date) {
    const match: Record<string, any> = {
      createdAt: endDate
        ? { $gte: startDate, $lt: endDate }
        : { $gte: startDate },
    };

    const [result] = await this.paymentTxModel.aggregate<{
      totalTransactions: number;
      successfulTransactions: number;
      pendingTransactions: number;
      refundedTransactions: number;
      totalRevenue: number;
      pendingPayouts: number;
      averageTransaction: number;
      successRate: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: {
              $cond: [
                { $eq: ['$status', PaymentTransactionStatus.SUCCESS] },
                1,
                0,
              ],
            },
          },
          pendingTransactions: {
            $sum: {
              $cond: [
                { $eq: ['$status', PaymentTransactionStatus.INITIATED] },
                1,
                0,
              ],
            },
          },
          refundedTransactions: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ['$paystackStatus', ''] },
                    regex: 'refund|revers',
                    options: 'i',
                  },
                },
                1,
                0,
              ],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', PaymentTransactionStatus.SUCCESS] },
                '$total',
                0,
              ],
            },
          },
          pendingPayouts: {
            $sum: {
              $cond: [
                { $eq: ['$status', PaymentTransactionStatus.INITIATED] },
                '$total',
                0,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          averageTransaction: {
            $cond: [
              { $gt: ['$successfulTransactions', 0] },
              { $divide: ['$totalRevenue', '$successfulTransactions'] },
              0,
            ],
          },
          successRate: {
            $cond: [
              { $gt: ['$totalTransactions', 0] },
              {
                $multiply: [
                  {
                    $divide: ['$successfulTransactions', '$totalTransactions'],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalTransactions: 1,
          successfulTransactions: 1,
          pendingTransactions: 1,
          refundedTransactions: 1,
          totalRevenue: 1,
          pendingPayouts: 1,
          averageTransaction: 1,
          successRate: 1,
        },
      },
    ]);

    return (
      result ?? {
        totalTransactions: 0,
        successfulTransactions: 0,
        pendingTransactions: 0,
        refundedTransactions: 0,
        totalRevenue: 0,
        pendingPayouts: 0,
        averageTransaction: 0,
        successRate: 0,
      }
    );
  }

  private getStatusMatch(status: TransactionStatusFilter) {
    if (status === 'COMPLETED') {
      return { status: PaymentTransactionStatus.SUCCESS };
    }

    if (status === 'PENDING') {
      return { status: PaymentTransactionStatus.INITIATED };
    }

    if (status === 'FAILED') {
      return { status: PaymentTransactionStatus.FAILED };
    }

    if (status === 'REFUNDED') {
      return {
        paystackStatus: { $regex: 'refund|revers', $options: 'i' },
      };
    }

    return {};
  }

  private mapDisplayStatus(
    status: PaymentTransactionStatus,
    paystackStatus?: string,
  ) {
    if (paystackStatus && /refund|revers/i.test(paystackStatus)) {
      return 'REFUNDED';
    }

    if (status === PaymentTransactionStatus.SUCCESS) {
      return 'COMPLETED';
    }

    if (status === PaymentTransactionStatus.INITIATED) {
      return 'PENDING';
    }

    if (status === PaymentTransactionStatus.FAILED) {
      return 'FAILED';
    }

    return 'UNKNOWN';
  }

  private formatPaymentMethod(method?: string) {
    if (!method) {
      return 'Unknown';
    }

    const normalized = method.replace(/[_-]+/g, ' ').trim();
    if (!normalized) {
      return 'Unknown';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private getStartDate(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private percentChange(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  private escapeCsv(value: string) {
    const escaped = `${value ?? ''}`.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private toCsvDate(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString();
  }
}
