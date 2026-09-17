import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CreateCatalogoDto } from './dto/create-catalogo.dto.js';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto.js';
import { Catalogo } from './entities/catalogo.entity.js';

@Injectable()
export class CatalogoService {
  create(createCatalogoDto: CreateCatalogoDto): Catalogo {
    this.validarCreacion(createCatalogoDto);

    const juegos = this.leerJuegos();
    const juego: Catalogo = {
      juegoId: randomUUID(),
      titulo: createCatalogoDto.titulo.trim(),
      descripcion: createCatalogoDto.descripcion.trim(),
      imagen: createCatalogoDto.imagen.trim(),
      precio: createCatalogoDto.precio,
      ...(createCatalogoDto.genero?.trim()
        ? { genero: createCatalogoDto.genero.trim() }
        : {}),
      ...(createCatalogoDto.fechaPublicacion?.trim()
        ? { fechaPublicacion: createCatalogoDto.fechaPublicacion.trim() }
        : {}),
    };

    juegos.push(juego);
    this.guardarJuegos(juegos);

    return juego;
  }

  findAll(): Catalogo[] {
    return this.leerJuegos();
  }

  update(juegoId: string, updateCatalogoDto: UpdateCatalogoDto): Catalogo {
    this.validarActualizacion(updateCatalogoDto);

    const juegos = this.leerJuegos();
    const indice = juegos.findIndex((juego) => juego.juegoId === juegoId);

    if (indice === -1) {
      throw new NotFoundException('Juego no encontrado');
    }

    const actual = juegos[indice];
    const actualizado: Catalogo = {
      ...actual,
      ...(updateCatalogoDto.titulo !== undefined
        ? { titulo: updateCatalogoDto.titulo.trim() }
        : {}),
      ...(updateCatalogoDto.descripcion !== undefined
        ? { descripcion: updateCatalogoDto.descripcion.trim() }
        : {}),
      ...(updateCatalogoDto.imagen !== undefined
        ? { imagen: updateCatalogoDto.imagen.trim() }
        : {}),
      ...(updateCatalogoDto.precio !== undefined
        ? { precio: updateCatalogoDto.precio }
        : {}),
      ...(updateCatalogoDto.genero !== undefined
        ? { genero: updateCatalogoDto.genero.trim() }
        : {}),
      ...(updateCatalogoDto.fechaPublicacion !== undefined
        ? { fechaPublicacion: updateCatalogoDto.fechaPublicacion.trim() }
        : {}),
      juegoId: actual.juegoId,
    };

    juegos[indice] = actualizado;
    this.guardarJuegos(juegos);

    return actualizado;
  }

  private get rutaDatos(): string {
    return (
      process.env.CATALOGO_DATA_PATH ??
      resolve(process.cwd(), 'data', 'juegos.json')
    );
  }

  private leerJuegos(): Catalogo[] {
    try {
      const contenido = readFileSync(this.rutaDatos, 'utf8');
      const datos: unknown = JSON.parse(contenido);

      if (!Array.isArray(datos)) {
        throw new Error('El archivo de catálogo no contiene un arreglo');
      }

      return datos as Catalogo[];
    } catch (error) {
      throw new InternalServerErrorException(
        'No fue posible leer los datos del catálogo',
        { cause: error },
      );
    }
  }

  private guardarJuegos(juegos: Catalogo[]): void {
    try {
      writeFileSync(
        this.rutaDatos,
        `${JSON.stringify(juegos, null, 2)}\n`,
        'utf8',
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'No fue posible guardar los datos del catálogo',
        { cause: error },
      );
    }
  }

  private validarCreacion(dto: CreateCatalogoDto): void {
    if (
      !this.textoValido(dto.titulo) ||
      !this.textoValido(dto.descripcion) ||
      !this.textoValido(dto.imagen) ||
      !this.precioValido(dto.precio)
    ) {
      throw new BadRequestException(
        'titulo, descripcion, imagen y precio válido son obligatorios',
      );
    }
  }

  private validarActualizacion(dto: UpdateCatalogoDto): void {
    const entradas = Object.entries(dto);

    if (entradas.length === 0) {
      throw new BadRequestException('Debes enviar al menos un campo');
    }

    if (
      (dto.titulo !== undefined && !this.textoValido(dto.titulo)) ||
      (dto.descripcion !== undefined && !this.textoValido(dto.descripcion)) ||
      (dto.imagen !== undefined && !this.textoValido(dto.imagen)) ||
      (dto.precio !== undefined && !this.precioValido(dto.precio)) ||
      (dto.genero !== undefined && !this.textoValido(dto.genero)) ||
      (dto.fechaPublicacion !== undefined &&
        !this.textoValido(dto.fechaPublicacion))
    ) {
      throw new BadRequestException('Los campos enviados no son válidos');
    }
  }

  private textoValido(valor: unknown): valor is string {
    return typeof valor === 'string' && valor.trim().length > 0;
  }

  private precioValido(valor: unknown): valor is number {
    return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
  }
}
