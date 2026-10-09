import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

// vérifie qu'un paramètre :id est un ObjectId MongoDB valide
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException(`Identifiant invalide : ${value}`);
    }
    return value;
  }
}
