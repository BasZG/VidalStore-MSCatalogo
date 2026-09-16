import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './auth/jwt.strategy.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CatalogoModule } from './catalogo/catalogo.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CatalogoModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy, JwtAuthGuard],
})
export class AppModule {}