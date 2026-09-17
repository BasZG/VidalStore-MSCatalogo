import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CatalogoService } from './catalogo.service.js';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let directorioTemporal: string;
  let rutaDatos: string;

  beforeEach(() => {
    directorioTemporal = mkdtempSync(
      join(tmpdir(), 'vidalstore-catalogo-'),
    );
    rutaDatos = join(
      directorioTemporal,
      'juegos.json',
    );
    process.env.CATALOGO_DATA_PATH = rutaDatos;
    writeFileSync(
      rutaDatos,
      JSON.stringify([
        {
          juegoId: 'juego-inicial',
          titulo: 'Juego inicial',
          descripcion: 'Descripción inicial',
          imagen: 'inicial.jpg',
          precio: 10000,
        },
      ]),
      'utf8',
    );

    service = new CatalogoService();
  });

  afterEach(() => {
    delete process.env.CATALOGO_DATA_PATH;
    rmSync(directorioTemporal, {
      recursive: true,
      force: true,
    });
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe cargar el JSON y normalizar juegoId como id', () => {
    const juegos = service.findAll();

    expect(juegos).toHaveLength(1);
    expect(juegos[0].id).toBe('juego-inicial');
  });

  it('debe generar un id string en backend y persistirlo', () => {
    const juego = service.create({
      titulo: 'Vidal Quest',
      descripcion: 'Juego de prueba',
      imagen: 'vidal.jpg',
      precio: 12990,
    });

    const persistidos = JSON.parse(
      readFileSync(rutaDatos, 'utf8'),
    ) as Array<{ id: string }>;

    expect(typeof juego.id).toBe('string');
    expect(juego.id.length).toBeGreaterThan(0);
    expect(persistidos).toHaveLength(2);
    expect(persistidos[1].id).toBe(juego.id);
  });

  it('debe ignorar un id enviado por el cliente al crear', () => {
    const body = {
      id: 'id-controlado-por-cliente',
      titulo: 'Vidal Quest',
      descripcion: 'Juego de prueba',
      imagen: 'vidal.jpg',
      precio: 12990,
    };

    const juego = service.create(body);

    expect(juego.id).not.toBe(
      'id-controlado-por-cliente',
    );
    expect(juego.id).toBeDefined();
  });

  it('PUT no debe permitir modificar el id', () => {
    const juego = service.create({
      titulo: 'Vidal Quest',
      descripcion: 'Juego de prueba',
      imagen: 'vidal.jpg',
      precio: 12990,
    });

    const idOriginal = juego.id;
    const actualizado = service.update(
      idOriginal,
      {
        id: 'id-malicioso',
        precio: 14990,
      } as any,
    );

    expect(actualizado.id).toBe(idOriginal);
    expect(actualizado.id).not.toBe('id-malicioso');
    expect(actualizado.precio).toBe(14990);
  });

  it('debe permitir actualizacion parcial conservando el id', () => {
    const juego = service.create({
      titulo: 'Vidal Quest',
      descripcion: 'Descripcion original',
      imagen: 'vidal.jpg',
      precio: 12990,
    });

    const actualizado = service.update(juego.id, {
      precio: 15990,
    });

    expect(actualizado.id).toBe(juego.id);
    expect(actualizado.precio).toBe(15990);
    expect(actualizado.titulo).toBe('Vidal Quest');
    expect(actualizado.descripcion).toBe(
      'Descripcion original',
    );
    expect(actualizado.imagen).toBe('vidal.jpg');
  });

  it('debe devolver 404 al actualizar un juego inexistente', () => {
    expect(() =>
      service.update('juego-inexistente', {
        precio: 15990,
      }),
    ).toThrow(NotFoundException);
  });

  it('debe rechazar tipos invalidos al crear', () => {
    expect(() =>
      service.create({
        titulo: 'Vidal Quest',
        descripcion: 'Juego de prueba',
        imagen: 'vidal.jpg',
        precio: '12990',
      } as any),
    ).toThrow(BadRequestException);
  });

  it('debe rechazar tipos invalidos al actualizar', () => {
    const juego = service.create({
      titulo: 'Vidal Quest',
      descripcion: 'Juego de prueba',
      imagen: 'vidal.jpg',
      precio: 12990,
    });

    expect(() =>
      service.update(juego.id, {
        precio: 'incorrecto',
      } as any),
    ).toThrow(BadRequestException);
  });
});
