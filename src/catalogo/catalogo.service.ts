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

type CatalogoPersistido = Catalogo & {
  juegoId?: string;
};

@Injectable()
export class CatalogoService {
  create(createCatalogoDto: CreateCatalogoDto): Catalogo {
    this.validarCreate(createCatalogoDto);

    const juegos = this.leerJuegos();
    const juego: Catalogo = {
      id: randomUUID(),
      titulo: createCatalogoDto.titulo.trim(),
      descripcion: createCatalogoDto.descripcion.trim(),
      imagen: createCatalogoDto.imagen.trim(),
      precio: createCatalogoDto.precio,
      ...(createCatalogoDto.genero?.trim()
        ? { genero: createCatalogoDto.genero.trim() }
        : {}),
      ...(createCatalogoDto.fechaPublicacion?.trim()
        ? {
            fechaPublicacion:
              createCatalogoDto.fechaPublicacion.trim(),
          }
        : {}),
    };

    juegos.push(juego);
    this.guardarJuegos(juegos);

    return juego;
  }

  findAll(): Catalogo[] {
    return this.leerJuegos();
  }

  update(
    juegoId: string,
    updateCatalogoDto: UpdateCatalogoDto,
  ): Catalogo {
    const juegos = this.leerJuegos();
    const indice = juegos.findIndex(
      (juego) => juego.id === juegoId,
    );

    if (indice === -1) {
      throw new NotFoundException('Juego no encontrado');
    }

    this.validarUpdate(updateCatalogoDto);

    const juego = juegos[indice];

    if (updateCatalogoDto.titulo !== undefined) {
      juego.titulo = updateCatalogoDto.titulo.trim();
    }

    if (updateCatalogoDto.descripcion !== undefined) {
      juego.descripcion =
        updateCatalogoDto.descripcion.trim();
    }

    if (updateCatalogoDto.imagen !== undefined) {
      juego.imagen = updateCatalogoDto.imagen.trim();
    }

    if (updateCatalogoDto.precio !== undefined) {
      juego.precio = updateCatalogoDto.precio;
    }

    if (updateCatalogoDto.genero !== undefined) {
      juego.genero = updateCatalogoDto.genero.trim();
    }

    if (
      updateCatalogoDto.fechaPublicacion !== undefined
    ) {
      juego.fechaPublicacion =
        updateCatalogoDto.fechaPublicacion.trim();
    }

    this.guardarJuegos(juegos);

    return juego;
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
        throw new Error(
          'El archivo de catálogo no contiene un arreglo',
        );
      }

      return (datos as CatalogoPersistido[]).map(
        (juego) => {
          const id = juego.id ?? juego.juegoId;

          if (!id) {
            throw new Error(
              'Existe un juego sin identificador',
            );
          }

          return {
            id,
            titulo: juego.titulo,
            descripcion: juego.descripcion,
            imagen: juego.imagen,
            precio: juego.precio,
            ...(juego.genero
              ? { genero: juego.genero }
              : {}),
            ...(juego.fechaPublicacion
              ? {
                  fechaPublicacion:
                    juego.fechaPublicacion,
                }
              : {}),
          };
        },
      );
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

  private validarCreate(dto: CreateCatalogoDto): void {
    if (!this.textoValido(dto.titulo)) {
      throw new BadRequestException(
        'titulo debe ser string no vacío',
      );
    }

    if (!this.textoValido(dto.descripcion)) {
      throw new BadRequestException(
        'descripcion debe ser string no vacío',
      );
    }

    if (!this.textoValido(dto.imagen)) {
      throw new BadRequestException(
        'imagen debe ser string no vacío',
      );
    }

    if (!this.precioValido(dto.precio)) {
      throw new BadRequestException(
        'precio debe ser un número mayor o igual a cero',
      );
    }

    if (
      dto.genero !== undefined &&
      !this.textoValido(dto.genero)
    ) {
      throw new BadRequestException(
        'genero debe ser string no vacío',
      );
    }

    if (
      dto.fechaPublicacion !== undefined &&
      !this.textoValido(dto.fechaPublicacion)
    ) {
      throw new BadRequestException(
        'fechaPublicacion debe ser string no vacío',
      );
    }
  }

  private validarUpdate(dto: UpdateCatalogoDto): void {
    const tieneCampoActualizable = [
      dto.titulo,
      dto.descripcion,
      dto.imagen,
      dto.precio,
      dto.genero,
      dto.fechaPublicacion,
    ].some((valor) => valor !== undefined);

    if (!tieneCampoActualizable) {
      throw new BadRequestException(
        'Debes enviar al menos un campo actualizable',
      );
    }

    if (
      dto.titulo !== undefined &&
      !this.textoValido(dto.titulo)
    ) {
      throw new BadRequestException(
        'titulo debe ser string no vacío',
      );
    }

    if (
      dto.descripcion !== undefined &&
      !this.textoValido(dto.descripcion)
    ) {
      throw new BadRequestException(
        'descripcion debe ser string no vacío',
      );
    }

    if (
      dto.imagen !== undefined &&
      !this.textoValido(dto.imagen)
    ) {
      throw new BadRequestException(
        'imagen debe ser string no vacío',
      );
    }

    if (
      dto.precio !== undefined &&
      !this.precioValido(dto.precio)
    ) {
      throw new BadRequestException(
        'precio debe ser un número mayor o igual a cero',
      );
    }

    if (
      dto.genero !== undefined &&
      !this.textoValido(dto.genero)
    ) {
      throw new BadRequestException(
        'genero debe ser string no vacío',
      );
    }

    if (
      dto.fechaPublicacion !== undefined &&
      !this.textoValido(dto.fechaPublicacion)
    ) {
      throw new BadRequestException(
        'fechaPublicacion debe ser string no vacío',
      );
    }
  }

  private textoValido(valor: unknown): valor is string {
    return (
      typeof valor === 'string' &&
      valor.trim().length > 0
    );
  }

  private precioValido(valor: unknown): valor is number {
    return (
      typeof valor === 'number' &&
      Number.isFinite(valor) &&
      valor >= 0
    );
  }
}
