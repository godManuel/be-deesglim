import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { TopCategoriesQueryDto } from './dto/top-categories-query.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { FilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

type UploadedProductImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all products',
    description: 'Retrieve all products from the catalog',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  })
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'List all categories',
    description: 'Retrieve all product categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  listCategories() {
    return this.productsService.findCategories();
  }

  @Get('dashboard/top-categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get top categories breakdown',
    description:
      'Returns category revenue share for the three configured product categories within the selected period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Top categories retrieved successfully',
  })
  getTopCategories(@Query() query: TopCategoriesQueryDto) {
    return this.productsService.getTopCategories(query);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get product by slug',
    description: 'Retrieve a product by its slug identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Admin route to create a product with variants, images, and category',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  create(
    @Body() body: Record<string, any>,
    @UploadedFiles() files: UploadedProductImageFile[] = [],
  ) {
    const productPayload = this.normalizeCreateProductPayload(body, files);
    const product = plainToInstance(CreateProductDto, productPayload);
    const validationErrors = validateSync(product, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    return this.productsService.create(product, files);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Admin route to create a new product category',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  createCategory(@Body() category: CreateCategoryDto) {
    return this.productsService.createCategory(category);
  }

  private normalizeCreateProductPayload(
    body: Record<string, any>,
    files: UploadedProductImageFile[],
  ): Record<string, any> {
    const parseBoolean = (value: unknown) => value === true || value === 'true';
    const parseNumber = (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return value;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    };
    const parseJsonValue = <T>(value: unknown, fallback: T): T => {
      if (value === undefined || value === null || value === '') {
        return fallback;
      }

      if (typeof value !== 'string') {
        return value as T;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    };

    return {
      ...body,
      price: parseNumber(body.price),
      quantity: parseNumber(body.quantity),
      oldPrice: parseNumber(body.oldPrice),
      newPrice: parseNumber(body.newPrice),
      headSize: parseNumber(body.headSize),
      grams: parseNumber(body.grams),
      isVisible: parseBoolean(body.isVisible),
      isFeatured: parseBoolean(body.isFeatured),
      allowAnyColor: parseBoolean(body.allowAnyColor),
      laceCustomizationAvailable: parseBoolean(body.laceCustomizationAvailable),
      laceSizes: parseJsonValue<string[]>(body.laceSizes, []),
      laceTypes: parseJsonValue<string[]>(body.laceTypes, []),
      lengthOptions: parseJsonValue<string[]>(body.lengthOptions, []),
      densityOptions: parseJsonValue<string[]>(body.densityOptions, []),
      headSizes: parseJsonValue<number[]>(body.headSizes, []),
      colors: parseJsonValue<string[]>(body.colors, []),
      textureOptions: parseJsonValue<string[]>(body.textureOptions, []),
      variants: parseJsonValue(body.variants, []),
      images: parseJsonValue(body.images, []),
    };
  }
}
