// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface User {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  emailVerified: boolean;
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

  /**
   * パスワードリセットリクエスト
   */
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * パスワードリセット実行
   */
  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password }),
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * メールアドレス認証
   */
  verifyEmail: async (token: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    return handleResponse<AuthResponse>(response);
  },

  /**
   * 認証メール再送信
   */
  resendVerification: async (): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * パスワード変更
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse<{ message: string }>(response);
  },

  /**
   * アカウント削除
   */
  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    return handleResponse<{ message: string }>(response);
  },
};

export { AuthApiError };
