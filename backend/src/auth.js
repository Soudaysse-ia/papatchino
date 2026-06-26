import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-resto-manager';
const TOKEN_TTL = '12h';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Middleware : exige une authentification, et optionnellement un rôle parmi `roles`.
export function requireAuth(...roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    try {
      const payload = verifyToken(token);
      req.user = payload;
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Accès interdit pour votre rôle' });
      }
      next();
    } catch {
      return res.status(401).json({ error: 'Session expirée ou invalide' });
    }
  };
}
