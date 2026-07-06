import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Product, ProductDocument } from './schemas/product.schema';
import { ProductVariant, ProductVariantDocument } from './schemas/product-variant.schema';
import { ProductImage, ProductImageDocument } from './schemas/product-image.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    @InjectModel(ProductImage.name)
    private readonly imageModel: Model<ProductImageDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const category = await this.categoryModel.findOne({
      $or: [
        { _id: createProductDto.category },
        { slug: createProductDto.category },
      ],
    });

    if (!category) {
      throw new BadRequestException(
        'Category not found. Provide a valid category id or slug.',
      );
    }

    const variantIds: Types.ObjectId[] = [];
    if (createProductDto.variants?.length) {
      const variants = await this.variantModel.insertMany(
        createProductDto.variants.map((variant: CreateProductVariantDto) => ({
          ...variant,
          inventoryCount: variant.inventoryCount ?? 0,
        })),
      );
      variantIds.push(...variants.map((variant) => variant._id));
    }

    const imageIds: Types.ObjectId[] = [];
    if (createProductDto.images?.length) {
      const images = await this.imageModel.insertMany(
        createProductDto.images.map((image: CreateProductImageDto) => ({
          ...image,
          sortOrder: image.sortOrder ?? 0,
        })),
      );
      imageIds.push(...images.map((image) => image._id));
    }

    const product = new this.productModel({
      ...createProductDto,
      category: category._id,
      variants: variantIds,
      images: imageIds,
    });

    return product.save();
  }

  async createCategory(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const existingCategory = await this.categoryModel.findOne({
      $or: [{ name: createCategoryDto.name }, { slug: createCategoryDto.slug }],
    });

    if (existingCategory) {
      throw new BadRequestException('Category name or slug already exists.');
    }

    const category = new this.categoryModel(createCategoryDto);
    return category.save();
  }

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
