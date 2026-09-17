import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateCatalogoDto } from './dto/create-catalogo.dto.js';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto.js';
import { Catalogo } from './entities/catalogo.entity.js';

@Injectable()
export class CatalogoService {
  private readonly juegos: Catalogo[] = [];

  create(createCatalogoDto: CreateCatalogoDto): Catalogo {
    this.validarCreate(createCatalogoDto);

    const juego: Catalogo = {
      id: randomUUID(),
      titulo: createCatalogoDto.titulo,
      descripcion: createCatalogoDto.descripcion,
      imagen: createCatalogoDto.imagen,
      precio: createCatalogoDto.precio,
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

    this.validarUpdate(updateCatalogoDto);

    if (updateCatalogoDto.titulo !== undefined) {
      juego.titulo = updateCatalogoDto.titulo;
    }

    if (updateCatalogoDto.descripcion !== undefined) {
      juego.descripcion = updateCatalogoDto.descripcion;
    }

    if (updateCatalogoDto.imagen !== undefined) {
      juego.imagen = updateCatalogoDto.imagen;
    }

    if (updateCatalogoDto.precio !== undefined) {
      juego.precio = updateCatalogoDto.precio;
    }

    return juego;
  }

  private validarCreate(dto: CreateCatalogoDto): void {
    if (typeof dto.titulo !== 'string') {
      throw new BadRequestException('titulo debe ser string');
    }

    if (typeof dto.descripcion !== 'string') {
      throw new BadRequestException('descripcion debe ser string');
    }

    if (typeof dto.imagen !== 'string') {
      throw new BadRequestException('imagen debe ser string');
    }

    if (
      typeof dto.precio !== 'number' ||
      !Number.isFinite(dto.precio)
    ) {
      throw new BadRequestException('precio debe ser number');
    }
  }

  private validarUpdate(dto: UpdateCatalogoDto): void {
    if (
      dto.titulo !== undefined &&
      typeof dto.titulo !== 'string'
    ) {
      throw new BadRequestException('titulo debe ser string');
    }

    if (
      dto.descripcion !== undefined &&
      typeof dto.descripcion !== 'string'
    ) {
      throw new BadRequestException(
        'descripcion debe ser string',
      );
    }

    if (
      dto.imagen !== undefined &&
      typeof dto.imagen !== 'string'
    ) {
      throw new BadRequestException('imagen debe ser string');
    }

    if (
      dto.precio !== undefined &&
      (
        typeof dto.precio !== 'number' ||
        !Number.isFinite(dto.precio)
      )
    ) {
      throw new BadRequestException('precio debe ser number');
    }
  }
}
