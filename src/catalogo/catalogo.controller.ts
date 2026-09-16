import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';import { CatalogoService } from './catalogo.service.js';
import { CreateCatalogoDto } from './dto/create-catalogo.dto.js';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Post()
  create(@Body() createCatalogoDto: CreateCatalogoDto) {
    return this.catalogoService.create(createCatalogoDto);
  }

  @Get()
  findAll() {
    return this.catalogoService.findAll();
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCatalogoDto: UpdateCatalogoDto) {
    return this.catalogoService.update(+id, updateCatalogoDto);
  }


}
