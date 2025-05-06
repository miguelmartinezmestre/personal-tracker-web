import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Res,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CookieGuard } from 'src/session.guard';
import { UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @UseGuards(CookieGuard)
  create(@Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.create(createGoalDto);
  }

  @Get()
  @UseGuards(CookieGuard)
  findAll() {
    return this.goalsService.findAll();
  }

  @Get(':id')
  @UseGuards(CookieGuard)
  findById(@Param('id') id: number) {
    return this.goalsService.findById(+id);
  }

  @Get('user/:id')
  @UseGuards(CookieGuard)
  findAllByUser(@Param('id') id: number) {
    return this.goalsService.findByUser(+id);
  }

  @Patch(':id')
  @UseGuards(CookieGuard)
  update(@Param('id') id: number, @Body() updateGoalDto: UpdateGoalDto) {
    return this.goalsService.update(+id, updateGoalDto);
  }

  @Delete(':id')
  @UseGuards(CookieGuard)
  remove(@Param('id') id: number) {
    return this.goalsService.remove(+id);
  }
}
