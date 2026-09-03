import bcrypt from "bcryptjs";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash de una contraseña aleatoria generado al arrancar. Se usa para comparar
 * cuando el usuario no existe: así el login tarda lo mismo exista o no la
 * cuenta y no se puede enumerar correos por tiempo de respuesta.
 */
export const HASH_SENUELO = bcrypt.hashSync(crypto.randomUUID(), 10);
