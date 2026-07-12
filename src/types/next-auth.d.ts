import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      roleKey: string;
      roleName: string;
      canViewCost: boolean;
      mustChangePassword: boolean;
      permissions: string[];
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    roleKey: string;
    roleName: string;
    canViewCost: boolean;
    mustChangePassword: boolean;
    permissions: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    username: string;
    roleKey: string;
    roleName: string;
    canViewCost: boolean;
    mustChangePassword: boolean;
    permissions: string[];
  }
}
