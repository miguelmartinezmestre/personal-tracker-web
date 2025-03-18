import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { CookieGuard } from 'src/session.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(CookieGuard)
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @UseGuards(CookieGuard)
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get(':id')
  @UseGuards(CookieGuard)
  findOne(@Param('id') id: number) {
    return this.notificationsService.findOne(+id);
  }

  @Get('user/:id')
  @UseGuards(CookieGuard)
  findByUser(@Param('id') id: number) {
    return this.notificationsService.findByUser(+id);
  }

  @Patch(':id')
  @UseGuards(CookieGuard)
  update(
    @Param('id') id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @UseGuards(CookieGuard)
  remove(@Param('id') id: number) {
    return this.notificationsService.remove(+id);
  }
}
