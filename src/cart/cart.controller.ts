import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() request: any) {
    return this.cartService.findOrCreateCart(request.user.id);
  }

  @Post('items')
  addItem(@Req() request: any, @Body() addCartItemDto: AddCartItemDto) {
    return this.cartService.addItem(
      request.user.id,
      addCartItemDto.variantId,
      addCartItemDto.quantity,
    );
  }

  @Put('items/:itemId')
  updateItem(
    @Req() request: any,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(
      request.user.id,
      itemId,
      updateCartItemDto.quantity,
    );
  }

  @Delete('items/:itemId')
  removeItem(@Req() request: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(request.user.id, itemId);
  }
}
