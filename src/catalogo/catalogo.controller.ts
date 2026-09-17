import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Scopes } from '../auth/scopes.decorator.js';
import { ScopesGuard } from '../auth/scopes.guard.js';
import { CatalogoService } from './catalogo.service.js';
import { CreateCatalogoDto } from './dto/create-catalogo.dto.js';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/catalogo')
export class CatalogoController {
  constructor(
    private readonly catalogoService: CatalogoService,
  ) {}

  @Get()
  @UseGuards(ScopesGuard)
  @Scopes('vidalstore/catalogo.leer')
  findAll() {
    return this.catalogoService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('editores', 'administradores')
  create(
    @Body() createCatalogoDto: CreateCatalogoDto,
  ) {
    return this.catalogoService.create(
      createCatalogoDto,
    );
  }

  @Put(':juegoId')
  @UseGuards(RolesGuard)
  @Roles('editores', 'administradores')
  update(
    @Param('juegoId') juegoId: string,
    @Body() updateCatalogoDto: UpdateCatalogoDto,
  ) {
    return this.catalogoService.update(
      juegoId,
      updateCatalogoDto,
    );
  }
}
