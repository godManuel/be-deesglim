import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContentPage, ContentPageDocument } from './schemas/content-page.schema';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(ContentPage.name)
    private readonly contentModel: Model<ContentPageDocument>,
  ) {}

  findAll(): Promise<ContentPage[]> {
    return this.contentModel.find().exec();
  }

  findBySlug(slug: string): Promise<ContentPage | null> {
    return this.contentModel.findOne({ slug }).exec();
  }
}
