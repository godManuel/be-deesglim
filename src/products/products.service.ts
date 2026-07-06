import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.productModel
      .find({ isVisible: true })
      .populate('variants')
      .populate('images')
      .populate('category')
      .exec();
  }

  findBySlug(slug: string): Promise<Product | null> {
    return this.productModel
      .findOne({ slug, isVisible: true })
      .populate('variants')
      .populate('images')
      .populate('category')
      .exec();
  }

  async findCategories(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }
}
