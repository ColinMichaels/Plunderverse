import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Request, Response, NextFunction } from 'express';
import { authConfig, JWTPayload } from '../config/auth.config';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { UnauthorizedError, InvalidTokenError } from '../utils/auth.errors';

// JWT Strategy configuration
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: authConfig.jwtSecret,
  algorithms: ['HS256']
};

// Configure JWT Strategy
passport.use('jwt', new JwtStrategy(jwtOptions, async (payload: JWTPayload, done) => {
  try {
    const user = await userService.getUserById(payload.userId);
    if (!user) {
      return done(new UnauthorizedError('User not found'), false);
    }
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// Configure Local Strategy for email/password login
passport.use('local', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const result = await authService.login(email, password);
    if (!result) {
      return done(new UnauthorizedError('Invalid credentials'), false);
    }
    return done(null, result.user);
  } catch (error) {
    return done(error, false);
  }
}));

// Serialize/Deserialize for session support
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to authenticate JWT token
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      if (info?.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token has expired'));
      }
      if (info?.name === 'JsonWebTokenError') {
        return next(new InvalidTokenError('Invalid token'));
      }
      return next(new UnauthorizedError('Authentication failed'));
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

// Middleware to authenticate local login
export const authenticateLocal = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return next(new UnauthorizedError(info?.message || 'Invalid credentials'));
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

// Optional JWT authentication (doesn't fail if no token)
export const optionalJWT = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Check if user is authenticated (for session-based auth)
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  next(new UnauthorizedError('Authentication required'));
};

// Combined middleware for JWT or session authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check for JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateJWT(req, res, next);
  }
  
  // Fall back to session auth
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  next(new UnauthorizedError('Authentication required'));
};

// Helper to extract user from request
export const getCurrentUser = (req: Request): any => {
  return req.user || null;
};

// Initialize passport
export const initializePassport = passport.initialize();
export const passportSession = passport.session();

export default passport;