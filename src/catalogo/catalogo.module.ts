import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CatalogoService } from './catalogo.service.js';
import { CatalogoController } from './catalogo.controller.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CatalogoController],
  providers: [CatalogoService, JwtAuthGuard],
})
export class CatalogoModule {}