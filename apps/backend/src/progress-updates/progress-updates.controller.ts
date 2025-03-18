import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProgressUpdatesService } from './progress-updates.service';
import { CreateProgressUpdateDto } from './dto/create-progress-update.dto';
import { UpdateProgressUpdateDto } from './dto/update-progress-update.dto';
import { CookieGuard } from 'src/session.guard';

@Controller('progress-updates')
export class ProgressUpdatesController {
  constructor(private readonly progressUpdatesService: ProgressUpdatesService) {}

  @Post()
  @UseGuards(CookieGuard)
  create(@Body() createProgressUpdateDto: CreateProgressUpdateDto) {
    return this.progressUpdatesService.create(createProgressUpdateDto);
  }

  @Get()
  @UseGuards(CookieGuard)
  findAll() {
    return this.progressUpdatesService.findAll();
  }

  @Get(':id')
  @UseGuards(CookieGuard)
  findOne(@Param('id') id: string) {
    return this.progressUpdatesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(CookieGuard)
  update(@Param('id') id: string, @Body() updateProgressUpdateDto: UpdateProgressUpdateDto) {
    return this.progressUpdatesService.update(+id, updateProgressUpdateDto);
  }

  @Delete(':id')
  @UseGuards(CookieGuard)
  remove(@Param('id') id: string) {
    return this.progressUpdatesService.remove(+id);
  }
}
