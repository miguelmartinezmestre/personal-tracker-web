import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  NotFoundException,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Request, Response } from 'express';
import { CookieGuard } from '../session.guard';
import { PrismaService } from '../prisma.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Post('/register')
  @HttpCode(200)
  register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.usersService.create(createUserDto, response);
  }

  @Post('/login')
  @HttpCode(200)
  login(
    @Body() loginUserDto: LoginUserDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.usersService.login(loginUserDto, request, response);
  }

  @Get('/auth')
  @HttpCode(200)
  auth(@Req() request: Request) {
    return this.usersService.auth(request);
  }

  // @Post()
  // create(@Body() createUserDto: CreateUserDto) {
  //   return this.usersService.create(createUserDto);
  // }

  @Post('/logout')
  @HttpCode(200)
  @UseGuards(CookieGuard)
  logout(@Res({ passthrough: true }) response: Response) {
    return this.usersService.logout(response);
  }

  @Get()
  @UseGuards(CookieGuard)
  findAll(@Req() request: Request) {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(CookieGuard)
  findById(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  @Patch(':id')
  @UseGuards(CookieGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(CookieGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
