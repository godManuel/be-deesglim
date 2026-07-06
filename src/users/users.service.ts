import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  RequestTimeoutException,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { HashingProvider } from 'src/auth/providers/hashing.provider';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly usersModel: Model<UserDocument>,

    @Inject(forwardRef(() => HashingProvider))
    private readonly hashingProvider: HashingProvider,
  ) {}

  public async createUser(createUserDto: CreateUserDto & { authProvider?: any; googleId?: string; }) {
    let existingUser;

    try {
      existingUser = await this.usersModel.findOne({ email: createUserDto.email }).exec();
    } catch (error) {
      throw new RequestTimeoutException('Unable to process your request at the moment. Please try again later.');
    }

    if (existingUser) {
      throw new BadRequestException('User with this email already exists.');
    }

    const user = new this.usersModel({
      ...createUserDto,
      password: createUserDto.password ? await this.hashingProvider.hashPassword(createUserDto.password) : createUserDto.password,
    });

    try {
      return await user.save();
    } catch (error) {
      throw new RequestTimeoutException('Unable to process your request at the moment. Please try again later.');
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

  public async updateUser(id: string, update: Partial<UpdateUserDto & { authProvider?: any; googleId?: string }>) {
    const user = await this.findById(id);
    if (update.password) {
      update.password = await this.hashingProvider.hashPassword(update.password as string);
    }
    Object.assign(user, update);
    return user.save();
  }
}
