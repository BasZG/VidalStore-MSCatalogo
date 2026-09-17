import { vi } from 'vitest';
import { CatalogoController } from './catalogo.controller.js';
import { CatalogoService } from './catalogo.service.js';

describe('CatalogoController', () => {
  let controller: CatalogoController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
    };

    controller = new CatalogoController(
      service as unknown as CatalogoService,
    );
  });

  it('delega la lectura del catálogo al servicio', () => {
    service.findAll.mockReturnValue([]);

    expect(controller.findAll()).toEqual([]);
    expect(service.findAll).toHaveBeenCalledOnce();
  });

  it('delega la actualización usando juegoId como string', () => {
    const dto = { precio: 25 };
    service.update.mockReturnValue({ juegoId: 'uuid-1', ...dto });

    controller.update('uuid-1', dto);

    expect(service.update).toHaveBeenCalledWith('uuid-1', dto);
  });
});
