import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(params: {
  password: string
  passwordHash: string
}): Promise<boolean> {
  return bcrypt.compare(params.password, params.passwordHash)
}

