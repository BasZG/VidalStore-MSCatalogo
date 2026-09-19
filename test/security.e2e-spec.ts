import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  generateKeyPairSync,
  type KeyObject,
  sign as cryptoSign,
} from 'node:crypto';
import {
  createServer,
  type Server,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  mkdtempSync,
  readFileSync,
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

const CLIENT_ID = 'cliente-prueba';
const KID = 'clave-prueba';

type ServidorLocal = {
  server: Server;
  url: string;
};

const { privateKey, publicKey } = generateKeyPairSync(
  'rsa',
  {
    modulusLength: 2048,
  },
);

const { privateKey: privateKeyIncorrecta } =
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

let issuer = '';

function codificarJson(valor: unknown): string {
  return Buffer.from(
    JSON.stringify(valor),
  ).toString('base64url');
}

function firmarToken(
  overrides: Record<string, unknown> = {},
  clave: KeyObject = privateKey,
): string {
  const ahora = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: KID,
  };

  const payload = {
    sub: 'usuario-prueba',
    iss: issuer,
    client_id: CLIENT_ID,
    token_use: 'access',
    scope: 'vidalstore/catalogo.leer',
    'cognito:groups': ['jugadores'],
    iat: ahora,
    exp: ahora + 300,
    ...overrides,
  };

  const contenido =
    `${codificarJson(header)}.` +
    `${codificarJson(payload)}`;

  const firma = cryptoSign(
    'RSA-SHA256',
    Buffer.from(contenido),
    clave,
  ).toString('base64url');

  return `${contenido}.${firma}`;
}

function alterarToken(token: string): string {
  const [header, payload, firma] = token.split('.');

  const payloadOriginal = JSON.parse(
    Buffer.from(
      payload,
      'base64url',
    ).toString('utf8'),
  );

  payloadOriginal.sub = 'usuario-alterado';

  return [
    header,
    codificarJson(payloadOriginal),
    firma,
  ].join('.');
}

async function iniciarJwks(): Promise<ServidorLocal> {
  const publicJwk = publicKey.export({
    format: 'jwk',
  });

  const server = createServer((req, res) => {
    if (
      req.url ===
      '/.well-known/jwks.json'
    ) {
      res.statusCode = 200;
      res.setHeader(
        'Content-Type',
        'application/json',
      );

      res.end(
        JSON.stringify({
          keys: [
            {
              ...publicJwk,
              kid: KID,
              use: 'sig',
              alg: 'RS256',
            },
          ],
        }),
      );

      return;
    }

    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(
      0,
      '127.0.0.1',
      resolve,
    );
  });

  const address =
    server.address() as AddressInfo;

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function cerrarServidor(
  server: Server,
): Promise<void> {
  await new Promise<void>(
    (resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    },
  );
}

function restaurarEnv(
  nombre: string,
  valor: string | undefined,
): void {
  if (valor === undefined) {
    delete process.env[nombre];
    return;
  }

  process.env[nombre] = valor;
}

describe('MSCatalogo seguridad JWT real (e2e)', () => {
  let app: INestApplication;
  let jwks: ServidorLocal;
  let directorioTemporal: string;
  let rutaDatos: string;

  const envAnterior = {
    issuer: process.env.COGNITO_ISSUER,
    jwks: process.env.COGNITO_JWKS_URI,
    clientId: process.env.COGNITO_CLIENT_ID,
    dataPath: process.env.CATALOGO_DATA_PATH,
  };

  beforeAll(async () => {
    jwks = await iniciarJwks();
    issuer = jwks.url;

    directorioTemporal = mkdtempSync(
      join(
        tmpdir(),
        'vidalstore-catalogo-security-',
      ),
    );

    rutaDatos = join(
      directorioTemporal,
      'juegos.json',
    );

    writeFileSync(
      rutaDatos,
      JSON.stringify(
        [
          {
            id: 'juego-inicial',
            titulo: 'Juego inicial',
            descripcion: 'Juego para pruebas',
            imagen: 'juego.jpg',
            precio: 1000,
          },
        ],
        null,
        2,
      ),
      'utf8',
    );

    process.env.COGNITO_ISSUER =
      issuer;

    process.env.COGNITO_JWKS_URI =
      `${issuer}/.well-known/jwks.json`;

    process.env.COGNITO_CLIENT_ID =
      CLIENT_ID;

    process.env.CATALOGO_DATA_PATH =
      rutaDatos;

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app =
      moduleFixture.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await cerrarServidor(jwks.server);

    restaurarEnv(
      'COGNITO_ISSUER',
      envAnterior.issuer,
    );

    restaurarEnv(
      'COGNITO_JWKS_URI',
      envAnterior.jwks,
    );

    restaurarEnv(
      'COGNITO_CLIENT_ID',
      envAnterior.clientId,
    );

    restaurarEnv(
      'CATALOGO_DATA_PATH',
      envAnterior.dataPath,
    );

    rmSync(directorioTemporal, {
      recursive: true,
      force: true,
    });
  });

  it('acepta Access Token RS256 valido con scope correcto', async () => {
    const token = firmarToken();

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(200);
  });

  it('rechaza token con firma incorrecta', async () => {
    const token = firmarToken(
      {},
      privateKeyIncorrecta,
    );

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(401);
  });

  it('rechaza token alterado despues de firmarlo', async () => {
    const token =
      alterarToken(firmarToken());

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(401);
  });

  it('rechaza token vencido', async () => {
    const ahora =
      Math.floor(Date.now() / 1000);

    const token = firmarToken({
      exp: ahora - 60,
    });

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(401);
  });

  it('rechaza issuer incorrecto', async () => {
    const token = firmarToken({
      iss: 'https://issuer-invalido',
    });

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(401);
  });

  it('rechaza ID Token', async () => {
    const token = firmarToken({
      token_use: 'id',
    });

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(401);
  });

  it('rechaza token de otro App Client', async () => {
    const token = firmarToken({
      client_id: 'otro-cliente',
    });

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(401);
  });

  it('rechaza scope insuficiente con 403', async () => {
    const token = firmarToken({
      scope:
        'vidalstore/biblioteca.leer',
    });

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(403);
  });

  it('acepta JWT sin grupos en lectura con scope suficiente', async () => {
    const token = firmarToken({
      'cognito:groups': undefined,
    });

    await request(app.getHttpServer())
      .get('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(200);
  });

  it('rechaza JWT sin grupos al crear', async () => {
    const token = firmarToken({
      'cognito:groups': undefined,
    });

    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        titulo: 'Juego sin privilegios',
      })
      .expect(403);
  });

  it('rechaza JWT sin grupos al modificar', async () => {
    const token = firmarToken({
      'cognito:groups': undefined,
    });

    await request(app.getHttpServer())
      .put('/v1/catalogo/juego-inicial')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        precio: 999999,
      })
      .expect(403);
  });

  it('trata grupos vacios como jugador', async () => {
    const token = firmarToken({
      'cognito:groups': [],
    });

    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        titulo: 'Juego sin grupo explicito',
      })
      .expect(403);
  });

  it('conserva editor y descarta grupo desconocido', async () => {
    const token = firmarToken({
      'cognito:groups': [
        'editores',
        'grupo-externo',
      ],
    });

    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        titulo: 'Juego de editor conocido',
        descripcion: 'Creado por editor conocido',
        imagen: 'editor-conocido.jpg',
        precio: 0,
      })
      .expect(201);
  });

  it('rechaza grupos exclusivamente desconocidos', async () => {
    const token = firmarToken({
      'cognito:groups': ['grupo-externo'],
    });

    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        titulo: 'Juego de grupo desconocido',
      })
      .expect(403);
  });

  it('rechaza claim de grupos con formato incorrecto', async () => {
    const token = firmarToken({
      'cognito:groups': 'editores',
    });

    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        titulo: 'Juego con claim invalido',
      })
      .expect(403);
  });

  it('ignora grupos efectivos inyectados en el JWT', async () => {
    const token = firmarToken({
      'cognito:groups': ['jugadores'],
      gruposEfectivos: ['editores'],
    });

    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        titulo: 'Juego con contexto inyectado',
      })
      .expect(403);
  });

  it('rechaza jugador al crear y no modifica persistencia', async () => {
    const antes =
      readFileSync(rutaDatos, 'utf8');

    const token = firmarToken({
      'cognito:groups': ['jugadores'],
    });

    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        titulo: 'No permitido',
        descripcion: 'No debe persistirse',
        imagen: 'no.jpg',
        precio: 500,
      })
      .expect(403);

    const despues =
      readFileSync(rutaDatos, 'utf8');

    expect(despues).toBe(antes);
  });

  it('permite a editor crear juego', async () => {
    const token = firmarToken({
      'cognito:groups': ['editores'],
    });

    const response =
      await request(app.getHttpServer())
        .post('/v1/catalogo')
        .set(
          'Authorization',
          `Bearer ${token}`,
        )
        .send({
          titulo: 'Juego editor',
          descripcion: 'Creado por editor',
          imagen: 'editor.jpg',
          precio: 0,
        })
        .expect(201);

    expect(response.body.titulo).toBe(
      'Juego editor',
    );

    expect(response.body.precio).toBe(0);
  });

  it('permite a administrador crear juego', async () => {
    const token = firmarToken({
      'cognito:groups': [
        'administradores',
      ],
    });

    await request(app.getHttpServer())
      .post('/v1/catalogo')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        titulo: 'Juego administrador',
        descripcion: 'Creado por admin',
        imagen: 'admin.jpg',
        precio: 1000,
      })
      .expect(201);
  });

  it('rechaza jugador al modificar y no altera el juego', async () => {
    const antes =
      readFileSync(rutaDatos, 'utf8');

    const token = firmarToken({
      'cognito:groups': ['jugadores'],
    });

    await request(app.getHttpServer())
      .put('/v1/catalogo/juego-inicial')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        precio: 999999,
      })
      .expect(403);

    const despues =
      readFileSync(rutaDatos, 'utf8');

    expect(despues).toBe(antes);
  });

  it('permite a editor modificar juego', async () => {
    const token = firmarToken({
      'cognito:groups': ['editores'],
    });

    const response =
      await request(app.getHttpServer())
        .put('/v1/catalogo/juego-inicial')
        .set(
          'Authorization',
          `Bearer ${token}`,
        )
        .send({
          precio: 2000,
        })
        .expect(200);

    expect(response.body.id).toBe(
      'juego-inicial',
    );

    expect(response.body.precio).toBe(2000);
  });
});
