// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://16.176.17.115/api';

export interface User {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

class AuthApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new AuthApiError(response.status, data.error || 'An error occurred');
  }
  return data;
};

export const authApi = {
  /**
   * 新規ユーザー登録
   */
  signup: async (request: SignupRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<AuthResponse>(response);
  },

  /**
   * ログイン
   */
  login: async (request: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    return handleResponse<AuthResponse>(response);
  },

  /**
   * ログアウト
   */
  logout: async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  /**
   * 現在のユーザー情報を取得
   */
  getMe: async (): Promise<{ user: User }> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ user: User }>(response);
  },
};

export { AuthApiError };
