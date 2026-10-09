import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateSpaceDto } from './dto/create-space.dto';
import { QuerySpacesDto } from './dto/query-spaces.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpacesService } from './spaces.service';

@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateSpaceDto) {
    return this.spacesService.create(dto);
  }

  @Public()
  @Get()
  findAll(@Query() query: QuerySpacesDto) {
    return this.spacesService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.spacesService.findOne(id);
  }

  @Public()
  @Get(':id/availability')
  getAvailability(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.spacesService.getAvailability(id, query.date);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.spacesService.remove(id);
  }
}
