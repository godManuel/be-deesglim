import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  CustomWigDensityOption,
  CustomWigType,
  LaceTintShade,
  LaceType,
} from '../schemas/product.schema';

export class CreateCustomWigOptionsDto {
  @ApiPropertyOptional({
    enum: CustomWigType,
    description:
      'Custom wig order flow. READY_TO_SHIP for admin uploads, MAKE_FROM_SCRATCH for app configuration.',
  })
  @IsOptional()
  @IsEnum(CustomWigType)
  customWigType?: CustomWigType;

  @ApiPropertyOptional({
    type: [String],
    example: ['4x4', '5x5', '13x4'],
    description: 'Available lace sizes for this custom wig.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  laceSizes?: string[];

  @ApiPropertyOptional({
    type: [String],
    enum: LaceType,
    description: 'Available lace types.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(LaceType, { each: true })
  laceTypes?: LaceType[];

  @ApiPropertyOptional({
    type: [String],
    example: ['12 inches', '14 inches', '16 inches'],
    description: 'Available wig lengths.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  lengthOptions?: string[];

  @ApiPropertyOptional({
    type: [String],
    enum: CustomWigDensityOption,
    description: 'Available density options.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(CustomWigDensityOption, { each: true })
  densityOptions?: CustomWigDensityOption[];

  @ApiPropertyOptional({
    type: [Number],
    example: [21, 21.5, 22, 22.5, 23, 24],
    description: 'Available head sizes.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  headSizes?: number[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Natural Black', 'Burgundy'],
    description: 'Color options available for this custom wig.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({
    example: false,
    description:
      'If true, any color can be chosen (primarily for make-from-scratch).',
  })
  @IsOptional()
  @IsBoolean()
  allowAnyColor?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether lace customization is offered (bleached knots and tinted lace).',
  })
  @IsOptional()
  @IsBoolean()
  laceCustomizationAvailable?: boolean;

  @ApiPropertyOptional({
    type: [String],
    enum: LaceTintShade,
    description: 'Available lace tint shades when customization is enabled.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LaceTintShade, { each: true })
  laceTintShades?: LaceTintShade[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Straight', 'Body Wave', 'Curly'],
    description:
      'Texture options available for make-from-scratch custom wig flow.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  textureOptions?: string[];

  @ApiPropertyOptional({
    example: 'https://cdn.deesglim.com/guides/head-size-guide.pdf',
    description: 'PDF URL for head-size guide.',
  })
  @IsOptional()
  @IsUrl()
  sizeGuidePdfUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.deesglim.com/guides/skin-tone-guide.pdf',
    description: 'PDF URL for lace tint skin-tone guide.',
  })
  @IsOptional()
  @IsUrl()
  skinToneGuidePdfUrl?: string;
}
