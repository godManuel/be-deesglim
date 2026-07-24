import { IsInt, IsPositive, IsString } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @IsPositive()
  quantity: number;

  @IsString()
  color: string;
}
