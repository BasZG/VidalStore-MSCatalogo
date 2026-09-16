import { Injectable, NotFoundException, } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateCatalogoDto } from './dto/create-catalogo.dto.js';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto.js';
import { Catalogo } from './entities/catalogo.entity.js';

@Injectable()
export class CatalogoService {
  private readonly juegos: Catalogo[] = [];

  create(
    createCatalogoDto: CreateCatalogoDto,
  ): Catalogo {
    const juego: Catalogo = {
      id: randomUUID(),
      ...createCatalogoDto,
    };

    this.juegos.push(juego);

    return juego;
  }

  findAll(): Catalogo[] {
    return this.juegos;
  }

  update(
    juegoId: string,
    updateCatalogoDto: UpdateCatalogoDto,
  ): Catalogo {
    const juego = this.juegos.find(
      (juego) => juego.id === juegoId,
    );

    if (!juego) {
      throw new NotFoundException('Juego no encontrado');
    }

    Object.assign(juego, updateCatalogoDto);

    return juego;
  }
}