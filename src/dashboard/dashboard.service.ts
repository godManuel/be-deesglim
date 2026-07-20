import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from '../products/schemas/product-variant.schema';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { RecentActivityQueryDto } from './dto/recent-activity-query.dto';
import { InventoryAlertsQueryDto } from './dto/inventory-alerts-query.dto';

@Injectable()
export class DashboardService {
  private readonly revenueStatuses = [
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];

  private readonly activeStatuses = [
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
  ];

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
  ) {}

  async getOverview(query: DashboardQueryDto) {
    const days = query.days ?? 30;
    const { startDate, previousStartDate } = this.getDateRange(days);

    const [
      currentRevenueAgg,
      previousRevenueAgg,
      currentOrdersCount,
      previousOrdersCount,
      activeOrders,
      processingOrders,
      salesPerformance,
      recentActivity,
      inventoryAlerts,
    ] = await Promise.all([
      this.orderModel.aggregate([
        {
          $match: {
            status: { $in: this.revenueStatuses },
            createdAt: { $gte: startDate },
          },
        },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        {
          $match: {
            status: { $in: this.revenueStatuses },
            createdAt: { $gte: previousStartDate, $lt: startDate },
          },
        },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
      ]),
      this.orderModel.countDocuments({
        status: { $in: this.revenueStatuses },
        createdAt: { $gte: startDate },
      }),
      this.orderModel.countDocuments({
        status: { $in: this.revenueStatuses },
        createdAt: { $gte: previousStartDate, $lt: startDate },
      }),
      this.orderModel.countDocuments({ status: { $in: this.activeStatuses } }),
      this.orderModel.countDocuments({ status: OrderStatus.PROCESSING }),
      this.getSalesPerformance(query),
      this.getRecentActivity({ limit: 8 }),
      this.getInventoryAlerts({ limit: 6 }),
    ]);

    const currentRevenue = Number(currentRevenueAgg[0]?.totalRevenue ?? 0);
    const previousRevenue = Number(previousRevenueAgg[0]?.totalRevenue ?? 0);
    const averageOrderValue =
      currentOrdersCount > 0 ? currentRevenue / currentOrdersCount : 0;
    const previousAverageOrderValue =
      previousOrdersCount > 0 ? previousRevenue / previousOrdersCount : 0;

    return {
      periodDays: days,
      overview: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        revenueChangePercent: this.calculatePercentChange(
          currentRevenue,
          previousRevenue,
        ),
        activeOrders,
        processingOrders,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        averageOrderValueChangePercent: this.calculatePercentChange(
          averageOrderValue,
          previousAverageOrderValue,
        ),
      },
      salesPerformance,
      recentActivity,
      inventoryAlerts,
    };
  }

  async getSalesPerformance(query: DashboardQueryDto) {
    const days = query.days ?? 30;
    const { startDate } = this.getDateRange(days);

    const [trend, categoryBreakdown] = await Promise.all([
      this.orderModel.aggregate([
        {
          $match: {
            status: { $in: this.revenueStatuses },
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.orderModel.aggregate([
        {
          $match: {
            status: { $in: this.revenueStatuses },
            createdAt: { $gte: startDate },
          },
        },
        { $unwind: '$items' },
        {
          $addFields: {
            variantObjectId: { $toObjectId: '$items.productVariantId' },
          },
        },
        {
          $lookup: {
            from: 'products',
            let: { variantId: '$variantObjectId' },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ['$$variantId', '$variants'] },
                },
              },
              {
                $lookup: {
                  from: 'categories',
                  localField: 'category',
                  foreignField: '_id',
                  as: 'categoryDoc',
                },
              },
              {
                $unwind: {
                  path: '$categoryDoc',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  _id: 0,
                  categoryName: '$categoryDoc.name',
                },
              },
            ],
            as: 'productMatch',
          },
        },
        {
          $addFields: {
            categoryName: {
              $ifNull: [
                { $arrayElemAt: ['$productMatch.categoryName', 0] },
                'Uncategorized',
              ],
            },
          },
        },
        {
          $group: {
            _id: '$categoryName',
            revenue: {
              $sum: { $multiply: ['$items.price', '$items.quantity'] },
            },
            quantitySold: { $sum: '$items.quantity' },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    return {
      metric: 'revenue',
      periodDays: days,
      trend: trend.map((item) => ({
        date: item._id,
        revenue: Number(Number(item.revenue ?? 0).toFixed(2)),
        orders: item.orders,
      })),
      categoryBreakdown: categoryBreakdown.map((item) => ({
        category: item._id,
        revenue: Number(Number(item.revenue ?? 0).toFixed(2)),
        quantitySold: item.quantitySold,
      })),
    };
  }

  async getRecentActivity(query: RecentActivityQueryDto) {
    const limit = query.limit ?? 8;

    type RecentOrderActivityRecord = {
      orderNumber: string;
      items?: Array<{ name?: string }>;
      status: string;
      total?: number;
      createdAt: Date;
    };

    type RecentUserActivityRecord = {
      email: string;
      fullName: string;
      role: string;
      createdAt: Date;
    };

    const [recentOrders, recentUsers] = await Promise.all([
      this.orderModel
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean<RecentOrderActivityRecord[]>()
        .exec(),
      this.userModel
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('email fullName role createdAt')
        .lean<RecentUserActivityRecord[]>()
        .exec(),
    ]);

    const orderActivities = recentOrders.map((order) => ({
      type: 'order',
      title: `New order ${order.orderNumber}`,
      description: `${order.items?.[0]?.name ?? 'Order item'} | ${order.status}`,
      amount: Number(Number(order.total ?? 0).toFixed(2)),
      createdAt: order.createdAt,
    }));

    const userActivities = recentUsers.map((user) => ({
      type: 'user',
      title: `${user.role === 'ADMIN' ? 'New admin' : 'New customer'} ${user.fullName}`,
      description: user.email,
      createdAt: user.createdAt,
    }));

    return [...orderActivities, ...userActivities]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .slice(0, limit);
  }

  async getInventoryAlerts(query: InventoryAlertsQueryDto) {
    const limit = query.limit ?? 6;
    const criticalThreshold = 5;
    const warningThreshold = 15;

    const products = await this.productModel
      .find()
      .populate('variants')
      .select('name variants')
      .lean()
      .exec();

    const alerts: Array<{
      productId: string;
      productName: string;
      variantId?: string;
      sku?: string;
      inventoryCount: number;
      severity: 'CRITICAL' | 'WARNING';
      source: 'VARIANT';
      message: string;
    }> = [];

    for (const product of products) {
      // Products no longer carry their own `quantity` — every product now
      // sells through at least one variant, so inventory is only tracked
      // (and alerted on) at the variant level via `inventoryCount`.
      for (const variant of (product.variants as unknown as ProductVariantDocument[]) ??
        []) {
        const inventoryCount = Number((variant as any).inventoryCount ?? 0);
        if (inventoryCount <= warningThreshold) {
          alerts.push({
            productId: product._id.toString(),
            productName: product.name,
            variantId: (variant as any)._id?.toString(),
            sku: (variant as any).sku,
            inventoryCount,
            severity:
              inventoryCount <= criticalThreshold ? 'CRITICAL' : 'WARNING',
            source: 'VARIANT',
            message:
              inventoryCount <= criticalThreshold
                ? `${inventoryCount} units left`
                : `${inventoryCount} units remaining in stock`,
          });
        }
      }
    }

    return alerts
      .sort((left, right) => left.inventoryCount - right.inventoryCount)
      .slice(0, limit);
  }

  private getDateRange(days: number) {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days);

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(startDate.getDate() - days);

    return { startDate, previousStartDate };
  }

  private calculatePercentChange(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(2));
  }
}
