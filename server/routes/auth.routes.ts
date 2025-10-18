import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { authenticateJWT, authenticateLocal, requireAuth } from '../middleware/auth';
import { ValidationError, AuthError } from '../utils/auth.errors';

const router = Router();

// Request body types
interface SignupRequest {
  email: string;
  password: string;
  username?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshRequest {
  refreshToken: string;
}

interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

// POST /api/auth/signup - Register new user
router.post('/signup', async (req: Request<{}, {}, SignupRequest>, res: Response, next: NextFunction) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      throw new ValidationError(['Email and password are required']);
    }

    const result = await authService.register(email, password, username);

    // Set session if using sessions
    if (req.session) {
      req.session.userId = result.user.id;
    }

    res.status(201).json({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Login with email/password
router.post('/login', authenticateLocal, async (req: Request<{}, {}, LoginRequest>, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError(['Email and password are required']);
    }

    const result = await authService.login(email, password);

    // Set session if using sessions
    if (req.session) {
      req.session.userId = result.user.id;
    }

    res.json({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - Clear session/token
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clear session if exists
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
    }

    // Clear any cookies
    if (req.cookies) {
      Object.keys(req.cookies).forEach(cookie => {
        res.clearCookie(cookie);
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Get current user (protected)
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    if (!user) {
      throw new ValidationError(['User not found']);
    }

    // Get fresh user data
    const currentUser = await userService.getUserById(user.id);
    
    res.json({
      success: true,
      user: currentUser
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', async (req: Request<{}, {}, RefreshRequest>, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError(['Refresh token is required']);
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      accessToken: result.accessToken
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/verify - Verify if token is valid
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({
        success: true,
        valid: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const isValid = await authService.verifyToken(token);

    res.json({
      success: true,
      valid: isValid
    });
  } catch (error) {
    // Don't pass error to error handler, just return invalid
    res.json({
      success: true,
      valid: false
    });
  }
});

// PUT /api/auth/profile - Update user profile (protected)
router.put('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const { username, email } = req.body;

    const updatedUser = await userService.updateUserProfile(user.id, {
      username,
      email
    });

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/change-password - Change password (protected)
router.post('/change-password', requireAuth, async (req: Request<{}, {}, ChangePasswordRequest>, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new ValidationError(['Old password and new password are required']);
    }

    await authService.changePassword(user.id, oldPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError(['Email is required']);
    }

    const result = await authService.requestPasswordReset(email);

    // In production, don't include the token in response
    // Instead, send it via email
    const response: any = {
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    };

    // Only include token in development
    if (process.env.NODE_ENV !== 'production' && result.resetToken) {
      response.resetToken = result.resetToken;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req: Request<{}, {}, ResetPasswordRequest>, res: Response, next: NextFunction) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      throw new ValidationError(['Reset token and new password are required']);
    }

    await authService.resetPassword(resetToken, newPassword);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/session - Check session status
router.get('/session', (req: Request, res: Response) => {
  const isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : false;
  const userId = req.session?.userId || null;

  res.json({
    success: true,
    authenticated: isAuthenticated,
    userId,
    sessionId: req.sessionID || null
  });
});

// Error handler middleware specific to auth routes
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AuthError) {
    const response: any = {
      success: false,
      message: err.message
    };

    // Include additional error details for validation errors
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    return res.status(err.statusCode).json(response);
  }

  // Pass to global error handler
  next(err);
});

export default router;