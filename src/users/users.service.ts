import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  RequestTimeoutException,
  NotFoundException,
} from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { HashingProvider } from 'src/auth/providers/hashing.provider';
import { UpdateUserDto } from './dto/update-user.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CustomerGrowthQueryDto } from './dto/customer-growth-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly usersModel: Model<UserDocument>,
    @InjectModel(Order.name) private readonly ordersModel: Model<OrderDocument>,

    @Inject(forwardRef(() => HashingProvider))
    private readonly hashingProvider: HashingProvider,
  ) {}

  public async createUser(
    createUserDto: CreateUserDto & {
      authProvider?: any;
      googleId?: string;
      role?: UserRole;
    },
  ) {
    let existingUser;

    try {
      existingUser = await this.usersModel
        .findOne({ email: createUserDto.email })
        .exec();
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment. Please try again later.',
      );
    }

    if (existingUser) {
      throw new BadRequestException('User with this email already exists.');
    }

    const user = new this.usersModel({
      ...createUserDto,
      password: createUserDto.password
        ? await this.hashingProvider.hashPassword(createUserDto.password)
        : createUserDto.password,
    });

    try {
      return await user.save();
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment. Please try again later.',
      );
    }
  }

  public async findByEmail(email: string) {
    return this.usersModel.findOne({ email }).exec();
  }

  public async findById(id: string) {
    const user = await this.usersModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  public async updateUser(
    id: string,
    update: Partial<UpdateUserDto & { authProvider?: any; googleId?: string }>,
  ) {
    const user = await this.findById(id);
    if (update.password) {
      update.password = await this.hashingProvider.hashPassword(
        update.password as string,
      );
    }
    Object.assign(user, update);
    return user.save();
  }

  public async findAllForAdmin(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<UserDocument> = {};
    if (query.role) {
      filter.role = query.role;
    }

    const search = query.search?.trim();
    if (search) {
      const normalizedSearch = search.toUpperCase();
      const roleSearch = Object.values(UserRole).find(
        (role) => role === normalizedSearch,
      );

      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        ...(roleSearch ? [{ role: roleSearch }] : []),
      ];
    }

    const [data, total] = await Promise.all([
      this.usersModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password')
        .exec(),
      this.usersModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      filters: {
        role: query.role ?? null,
        search: search ?? null,
      },
    };
  }

  public async getAdminDashboardStats() {
    const totalUsers = await this.usersModel.countDocuments().exec();

    const orderMetrics = await this.ordersModel.aggregate([
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$total' },
          ordersCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          usersWithOrders: { $sum: 1 },
          returningUsers: {
            $sum: {
              $cond: [{ $gte: ['$ordersCount', 2] }, 1, 0],
            },
          },
          totalRevenue: { $sum: '$totalSpent' },
        },
      },
    ]);

    const usersWithOrders = orderMetrics[0]?.usersWithOrders ?? 0;
    const returningUsers = orderMetrics[0]?.returningUsers ?? 0;
    const totalRevenue = orderMetrics[0]?.totalRevenue ?? 0;

    const retentionRate =
      usersWithOrders > 0 ? (returningUsers / usersWithOrders) * 100 : 0;
    const averageLifetimeValue = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    return {
      totalUsers,
      retentionRate: Number(retentionRate.toFixed(2)),
      averageLifetimeValue: Number(averageLifetimeValue.toFixed(2)),
      usersWithOrders,
      returningUsers,
      totalRevenue: Number(totalRevenue.toFixed(2)),
    };
  }

  public async getCustomerGrowth(query: CustomerGrowthQueryDto) {
    const months = query.months ?? 6;
    const startDate = this.getCustomerGrowthStartDate(months);

    const growth = await this.usersModel.aggregate([
      {
        $match: {
          role: UserRole.USER,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]);

    const points = this.buildCustomerGrowthPoints(months, growth);

    return {
      months,
      role: UserRole.USER,
      totalNewCustomers: points.reduce((sum, point) => sum + point.value, 0),
      points,
    };
  }

  private getCustomerGrowthStartDate(months: number) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  }

  private buildCustomerGrowthPoints(
    months: number,
    growth: Array<{ _id: { year: number; month: number }; total: number }>,
  ) {
    const now = new Date();
    const growthMap = new Map(
      growth.map((item) => [`${item._id.year}-${item._id.month}`, item.total]),
    );

    return Array.from({ length: months }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1) + index,
        1,
      );
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;

      return {
        label: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        month,
        year,
        value: growthMap.get(key) ?? 0,
      };
    });
  }
}
