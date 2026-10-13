/**
 * Safe and secure JWT secret resolver.
 * Ensures token signing and verification use the exact same secret,
 * avoiding crashes while preventing unauthorized public fallback keys in production.
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be defined in production.');
  }

  // Safe internal secret for local development
  return 'hamdan_traders_dev_secret_key_secure_local_only';
};

module.exports = {
  getJwtSecret
};
