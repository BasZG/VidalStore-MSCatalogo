import { Body,Controller,Get,Param,Post,Put,UseGuards} from '@nestjs/common';
import { CatalogoService } from './catalogo.service.js';
import { CreateCatalogoDto } from './dto/create-catalogo.dto.js';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/catalogo')
export class CatalogoController {
  constructor(
    private readonly catalogoService: CatalogoService,
  ) {}

  @Get()
  findAll() {
    return this.catalogoService.findAll();
  }

  @Post()
  create(
    @Body() createCatalogoDto: CreateCatalogoDto,
  ) {
    return this.catalogoService.create(
      createCatalogoDto,
    );
  }

  @Put(':juegoId')
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
