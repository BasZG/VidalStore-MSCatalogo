import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CatalogoService } from './catalogo.service.js';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let directorioTemporal: string;
  let rutaDatos: string;

  beforeEach(() => {
    directorioTemporal = mkdtempSync(join(tmpdir(), 'vidalstore-catalogo-'));
    rutaDatos = join(directorioTemporal, 'juegos.json');
    process.env.CATALOGO_DATA_PATH = rutaDatos;
    writeFileSync(
      rutaDatos,
      JSON.stringify([
        {
          juegoId: 'juego-1',
          titulo: 'Juego inicial',
          descripcion: 'Descripción inicial',
          imagen: 'https://example.com/juego.jpg',
          precio: 10,
        },
      ]),
      'utf8',
    );

    service = new CatalogoService();
  });

  afterEach(() => {
    delete process.env.CATALOGO_DATA_PATH;
    rmSync(directorioTemporal, { recursive: true, force: true });
  });

  it('devuelve los juegos del archivo JSON', () => {
    expect(service.findAll()).toHaveLength(1);
    expect(service.findAll()[0].juegoId).toBe('juego-1');
  });

  it('crea un juego con UUID y lo persiste', () => {
    const creado = service.create({
      titulo: 'Nuevo juego',
      descripcion: 'Descripción nueva',
      imagen: 'https://example.com/nuevo.jpg',
      precio: 20,
    });

    const persistidos = JSON.parse(readFileSync(rutaDatos, 'utf8')) as Array<{
      juegoId: string;
    }>;

    expect(creado.juegoId).toMatch(/^[0-9a-f-]{36}$/);
    expect(persistidos).toHaveLength(2);
    expect(persistidos[1].juegoId).toBe(creado.juegoId);
  });

  it('actualiza el juego identificado por UUID', () => {
    const actualizado = service.update('juego-1', {
      titulo: 'Título actualizado',
      precio: 15,
    });

    expect(actualizado).toMatchObject({
      juegoId: 'juego-1',
      titulo: 'Título actualizado',
      precio: 15,
    });
    expect(service.findAll()[0]).toEqual(actualizado);
  });

  it('responde 404 al actualizar un juego inexistente', () => {
    expect(() => service.update('no-existe', { precio: 15 })).toThrow(
      NotFoundException,
    );
  });

  it('rechaza datos incompletos al crear', () => {
    expect(() =>
      service.create({
        titulo: '',
        descripcion: 'Descripción',
        imagen: 'https://example.com/juego.jpg',
        precio: 10,
      }),
    ).toThrow(BadRequestException);
  });
});
