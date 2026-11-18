import {
  registerDecorator,
  ValidationOptions,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/** valueProps admite array o `{ items: [...] }` (el storefront soporta ambos). */
function IsObjectOrArray(options?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isObjectOrArray',
      target: target.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return value !== null && typeof value === 'object';
        },
        defaultMessage() {
          return `${propertyName} debe ser un objeto o un array JSON`;
        },
      },
    });
  };
}

/**
 * JSONB configurables de la tienda: navegación, footer, sellos de confianza
 * y layout de bloques del home. Se validan como JSON genérico (schema-less
 * por diseño) y los alimenta un panel admin/CMS en el roadmap.
 */
export class UpdateStoreConfigDto {
  @IsOptional() @IsString()
  storeName?: string;

  @IsOptional() @IsString()
  tagline?: string;

  @IsOptional() @IsString()
  domain?: string;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsString()
  locale?: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  whatsappNumber?: string;

  @IsOptional() @IsString()
  themeId?: string;

  @IsOptional() @IsObject()
  navigation?: Record<string, unknown>;

  @IsOptional() @IsObject()
  footer?: Record<string, unknown>;

  @IsOptional() @IsObjectOrArray()
  valueProps?: Record<string, unknown> | unknown[];

  @IsOptional() @IsArray()
  homeLayout?: unknown[];
}
