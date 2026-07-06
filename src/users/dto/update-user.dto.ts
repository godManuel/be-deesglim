import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'User email address',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'User full name',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'User password (minimum 8 characters)',
    required: false,
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;
}
