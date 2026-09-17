import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { AppModule } from './../src/app.module.js';
import { JwtAuthGuard } from './../src/auth/jwt-auth.guard.js';
import { RolesGuard } from './../src/auth/roles.guard.js';
import { ScopesGuard } from './../src/auth/scopes.guard.js';

describe('MSCatalogo (e2e)', () => {
  let app: INestApplication;
  let directorioTemporal: string;

  beforeAll(async () => {
    directorioTemporal = mkdtempSync(
      join(tmpdir(), 'vidalstore-catalogo-e2e-'),
    );
    process.env.CATALOGO_DATA_PATH = join(
      directorioTemporal,
      'juegos.json',
    );
    writeFileSync(
      process.env.CATALOGO_DATA_PATH,
      '[]',
      'utf8',
    );

    const guardPermitido = {
      canActivate: () => true,
    };

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(guardPermitido)
        .overrideGuard(RolesGuard)
        .useValue(guardPermitido)
        .overrideGuard(ScopesGuard)
        .useValue(guardPermitido)
        .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.CATALOGO_DATA_PATH;
    rmSync(directorioTemporal, {
      recursive: true,
      force: true,
    });
  });

  it('POST genera id y no acepta el id del cliente', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/catalogo')
      .send({
        id: 'id-malicioso',
        titulo: 'Vidal Quest',
        descripcion: 'Juego e2e',
        imagen: 'vidal.jpg',
        precio: 12990,
      })
      .expect(201);

    expect(typeof response.body.id).toBe('string');
    expect(response.body.id).not.toBe('id-malicioso');
  });

  it('GET devuelve los juegos persistidos', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/catalogo')
      .expect(200);

    expect(response.body).toHaveLength(1);
  });

  it('PUT actualiza campos pero conserva el id', async () => {
    const creado = await request(app.getHttpServer())
      .post('/v1/catalogo')
      .send({
        titulo: 'Juego original',
        descripcion: 'Descripcion original',
        imagen: 'original.jpg',
        precio: 10000,
      })
      .expect(201);

    const idOriginal = creado.body.id;
    const actualizado = await request(
      app.getHttpServer(),
    )
      .put(`/v1/catalogo/${idOriginal}`)
      .send({
        id: 'nuevo-id-malicioso',
        precio: 15000,
      })
      .expect(200);

    expect(actualizado.body.id).toBe(idOriginal);
    expect(actualizado.body.precio).toBe(15000);
  });

  it('PUT inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .put('/v1/catalogo/juego-inexistente')
      .send({
        precio: 15000,
      })
      .expect(404);
  });

  it('POST con tipo invalido devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .send({
        titulo: 'Juego invalido',
        descripcion: 'Prueba',
        imagen: 'imagen.jpg',
        precio: 'no-es-number',
      })
      .expect(400);
  });
});
