const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('replace-with-')) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function signAccessToken(user) {
  return jwt.sign(
    { role: user.role, username: user.username },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: '8h',
      issuer: 'tapos-api',
      audience: 'tapos-apps'
    }
  );
}

function signPriceSnapshot(product) {
  return jwt.sign(
    {
      type: 'price-snapshot',
      productId: product.id,
      name: product.name,
      price: String(product.price)
    },
    getJwtSecret(),
    { issuer: 'tapos-api', audience: 'tapos-price-snapshot' }
  );
}

function verifyPriceSnapshot(token) {
  const snapshot = jwt.verify(token, getJwtSecret(), {
    issuer: 'tapos-api',
    audience: 'tapos-price-snapshot'
  });
  if (snapshot.type !== 'price-snapshot') {
    throw new Error('Invalid price snapshot.');
  }
  return snapshot;
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: 'tapos-api',
    audience: 'tapos-apps'
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token is required.' });
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  signAccessToken,
  signPriceSnapshot,
  verifyPriceSnapshot,
  verifyAccessToken
};
