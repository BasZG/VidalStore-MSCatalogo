import { Test, TestingModule } from '@nestjs/testing';
import { CatalogoController } from './catalogo.controller.js';
import { CatalogoService } from './catalogo.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

describe('CatalogoController', () => {
  let controller: CatalogoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogoController],
      providers: [CatalogoService],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<CatalogoController>(CatalogoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
