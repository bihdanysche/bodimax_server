declare global {
  namespace Express {
    interface User {
      userId: number;
      sessionId: number; 
    }
    
    interface Request {
      user?: User;
    }
  }
}

export {};