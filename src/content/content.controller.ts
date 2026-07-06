import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  findAll() {
    return this.contentService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.contentService.findBySlug(slug);
  }
}
