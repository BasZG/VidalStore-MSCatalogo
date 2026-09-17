import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ScopesGuard } from '../auth/scopes.guard.js';
import { CatalogoController } from './catalogo.controller.js';
import { CatalogoService } from './catalogo.service.js';

describe('CatalogoController', () => {
  let controller: CatalogoController;

  beforeEach(async () => {
    const guardPermitido = {
      canActivate: () => true,
    };

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [CatalogoController],
        providers: [CatalogoService],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(guardPermitido)
        .overrideGuard(RolesGuard)
        .useValue(guardPermitido)
        .overrideGuard(ScopesGuard)
        .useValue(guardPermitido)
        .compile();

    controller = module.get<CatalogoController>(
      CatalogoController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
