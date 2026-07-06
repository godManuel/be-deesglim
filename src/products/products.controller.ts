import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';

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
    schema: {
      example: {
        products: [
          {
            _id: '507f1f77bcf86cd799439011',
            name: 'Example Product',
            slug: 'example-product',
            description: 'Product description',
            price: 99.99,
            category: 'Electronics',
          },
        ],
      },
    },
  })
  findAll() {
    return this.productsService.findAll();
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
}
