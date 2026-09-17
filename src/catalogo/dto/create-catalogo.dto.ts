export class CreateCatalogoDto {
  titulo: string;
  descripcion: string;
  imagen: string;
  precio: number;
  genero?: string;
  fechaPublicacion?: string;
}
