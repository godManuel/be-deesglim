import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentPage, ContentPageSchema } from './schemas/content-page.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContentPage.name, schema: ContentPageSchema },
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
