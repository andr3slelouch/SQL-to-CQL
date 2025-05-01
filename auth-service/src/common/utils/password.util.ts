import * as bcrypt from 'bcrypt';

/**
 * Encripta texto usando bcrypt
 * @param plainText Texto plano a encriptar
 * @returns Texto encriptado
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compara texto plano con un hash para verificar si coinciden
 * @param plainText Texto plano a comparar
 * @param hash Hash almacenado
 * @returns true si coinciden, false en caso contrario
 */
export async function compareHashed(plainText: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainText, hash);
  } catch (error) {
    return false;
  }
}