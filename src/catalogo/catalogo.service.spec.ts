import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogoService } from './catalogo.service.js';

describe('CatalogoService', () => {
  let service: CatalogoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogoService],
    }).compile();

    service = module.get<CatalogoService>(CatalogoService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe generar un id string en backend', () => {
    const juego = service.create({
      titulo: 'Vidal Quest',
      descripcion: 'Juego de prueba',
      imagen: 'vidal.jpg',
      precio: 12990,
    });

    expect(typeof juego.id).toBe('string');
    expect(juego.id.length).toBeGreaterThan(0);
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

    const idOriginal = juego.id;

    const actualizado = service.update(
      idOriginal,
      {
        precio: 15990,
      },
    );

    expect(actualizado.id).toBe(idOriginal);
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
