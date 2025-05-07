import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CookieGuard } from '../session.guard';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) { }

  @Get('/user/:id')
  @UseGuards(CookieGuard)
  findById(@Param('id') id: string) {
    return this.sessionsService.findAllByUserId(+id);
  }

  @Patch('/invalidate/:id')
  @UseGuards(CookieGuard)
  update(@Param('id') id: string) {
    return this.sessionsService.update(+id, {
      status: 'invalidated',
    });
  }
}
