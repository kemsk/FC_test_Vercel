const API_BASE_URL = '/admin/xu-faculty-clearance';
const AUTH_API_BASE_URL = `${API_BASE_URL}/api/auth`;
const AUTH_ME_URL = `${API_BASE_URL}/api/me`;



export interface LoginResponse {

  success: boolean;

  message: string;

  requires_pin?: boolean;

  user_info?: {

    id?: number;

    email: string;

    first_name: string;

    last_name: string;

    role_value?: number;

    role_name?: string;

    university_id?: string;

    dashboard_url?: string;

  };

}



export interface AuthStatusResponse {

  authenticated: boolean;

  user_info?: {

    email: string;

    role_value: number;

    role_name: string;

    first_name: string;

    last_name: string;
    roles?: number[]; // Array of role values for multi-role users
  };

}



class AuthService {

  private getCSRFToken(): string {

    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {

      const [name, value] = cookie.trim().split('=');

      if (name === 'csrftoken') {

        return decodeURIComponent(value);

      }

    }

    return '';

  }

  private getAuthHeaders(): HeadersInit {

    return {

      'Content-Type': 'application/json',

      'Accept': 'application/json',

      'X-CSRFToken': this.getCSRFToken(),

    };

  }

  private setToken(token: string): void {

    localStorage.setItem('auth_token', token);

  }









  async login(email: string, password: string): Promise<LoginResponse> {

    try {

      const response = await fetch(`${API_BASE_URL}/login`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'X-CSRFToken': this.getCSRFToken(),

        },

        credentials: 'include',

        body: JSON.stringify({ email, password }),

      });



      if (!response.ok) {

        const errorData = await response.json();

        throw new Error(errorData.message || 'Login failed');

      }



      return await response.json();

    } catch (error) {

      console.error('Login error:', error);

      throw error;

    }

  }



  async verifyPin(pin: string): Promise<LoginResponse> {

    try {

      const response = await fetch(`${API_BASE_URL}/login`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'X-CSRFToken': this.getCSRFToken(),

        },

        credentials: 'include',

        body: JSON.stringify({ user_pin: pin }),

      });



      if (!response.ok) {

        const errorData = await response.json();

        throw new Error(errorData.message || 'PIN verification failed');

      }



      return await response.json();

    } catch (error) {

      console.error('PIN verification error:', error);

      throw error;

    }

  }



  async logout(): Promise<{ success: boolean; message: string }> {

    try {

      // Clear all local storage data
      this.clearToken();
      localStorage.removeItem('user_info');
      localStorage.removeItem('selected_role');
      sessionStorage.removeItem('selected_role');
      sessionStorage.clear();

      // Call server logout endpoint
      const response = await fetch(`${API_BASE_URL}/admin/xu-faculty-clearance/api/auth/logout`, {
        method: 'POST',

        headers: {

          'Accept': 'application/json',

          'X-CSRFToken': this.getCSRFToken(),

        },

        credentials: 'same-origin',

      });



      // Force clear cookies by setting them to expire
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });

      const result = { success: true, message: 'Logged out successfully' };
      console.log('AUTH_SERVICE: Logout successful', result);
      return result;
    } catch (error) {
      console.error('AUTH_SERVICE: Logout error:', error);
      // Still return success to allow navigation
      return { success: true, message: 'Logged out (local cleanup only)' };
    }

  }



  async getAuthStatus(): Promise<AuthStatusResponse> {

    try {

      const response = await fetch(AUTH_ME_URL, {

        method: 'GET',

        headers: {

          'Accept': 'application/json',

        },

        credentials: 'include',

      });



      if (!response.ok) {
        return { authenticated: false };
      }

      const userData = await response.json();
      console.log('AUTH_SERVICE: Auth status successful:', userData);
      
      return {
        authenticated: true,
        user_info: {
          email: userData.email,
          role_value: userData.role_value,
          role_name: userData.role_name,
          first_name: userData.first_name,
          last_name: userData.last_name,
          roles: userData.roles || [userData.role_value] // Use roles from API response
        }
      };
    } catch (error) {

      console.error('Auth status error:', error);

      throw error;

    }

  }



  async loginWithGoogle(): Promise<void> {

    try {

      // Direct redirect to Google OAuth endpoint

      window.location.href = `/accounts/login/google/`;

    } catch (error) {

      console.error('Google login error:', error);

      throw error;
    }
  }

  // Handle OAuth callback with JWT token
  handleOAuthCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      console.log('AUTH_SERVICE: Received JWT token from OAuth callback:', token);
      this.setToken(token);
      
      // Store user info (would need to get from token or API)
      const userInfo = this.parseJWT(token);
      if (userInfo) {
        localStorage.setItem('user_info', JSON.stringify({
          email: userInfo.email,
          roles: userInfo.roles || []
        }));
      }
      
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      console.log('AUTH_SERVICE: No token found in OAuth callback');
    }
  }

  // Parse JWT token (simple implementation)
  private parseJWT(token: string): { email?: string; roles?: string[] } | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      console.log('AUTH_SERVICE: Parsed JWT payload:', payload);
      
      return {
        email: payload.email,
        roles: payload.roles || []
      };
    } catch (error) {
      console.error('AUTH_SERVICE: Error parsing JWT token:', error);
      return null;
    }
  }

  async loginWithSSO(email: string, password: string, provider: string = 'default'): Promise<LoginResponse> {

    try {

      const response = await fetch(`${API_BASE_URL}/login/sso/`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'X-CSRFToken': this.getCSRFToken(),

        },

        credentials: 'include',

        body: JSON.stringify({ 

          email: email,

          password: password,

          sso_provider: provider

        }),

      });



      if (!response.ok) {

        const errorData = await response.json();

        throw new Error(errorData.message || 'SSO login failed');

      }



      return await response.json();

    } catch (error) {

      console.error('SSO login error:', error);

      throw error;

    }

  }



  async loginWithSSOToken(ssoToken: string, provider: string = 'default'): Promise<LoginResponse> {

    try {

      const response = await fetch(`${API_BASE_URL}/login/sso/`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'X-CSRFToken': this.getCSRFToken(),

        },

        credentials: 'include',

        body: JSON.stringify({ 

          sso_token: ssoToken,

          sso_provider: provider

        }),

      });



      if (!response.ok) {

        const errorData = await response.json();

        throw new Error(errorData.message || 'SSO login failed');

      }



      return await response.json();

    } catch (error) {

      console.error('SSO login error:', error);

      throw error;

    }

  }



  // Get supported SSO providers

  async getSSOProviders(): Promise<{ message: string; supported_providers: string[] }> {

    try {

      const response = await fetch(`${API_BASE_URL}/login/sso/`, {

        method: 'GET',

        credentials: 'include',

      });



      if (!response.ok) {

        throw new Error('Failed to get SSO providers');

      }



      return await response.json();

    } catch (error) {

      console.error('SSO providers error:', error);

      throw error;

    }

  }



  // Check if user is authenticated

  isAuthenticated(): boolean {

    // This is a simple check - you might want to implement a more robust solution

    return document.cookie.includes('sessionid');

  }



  // Get current user info from session storage or make an API call

  async getCurrentUser() {

    try {

      const authStatus = await this.getAuthStatus();

      return authStatus.user_info;

    } catch (error) {

      console.error('Failed to get current user:', error);

      return null;

    }

  }



  // Role-based access checking

  canAccessFolder(folderName: string): boolean {

    const roleAccessMap = {

      1: ['ciso'],      // CISO

      2: ['ovphe'],     // OVPHE

      3: ['approver'],  // APPROVER

      4: ['assistant'], // ASSISTANT_APPROVER

      5: ['faculty'],   // FACULTY

    };



    const userInfo = this.getCurrentUserFromSession();

    if (!userInfo || !userInfo.role_value) return false;



    const accessibleFolders = roleAccessMap[userInfo.role_value as keyof typeof roleAccessMap] || [];

    return accessibleFolders.includes(folderName);

  }



  hasRole(roleValue: number): boolean {

    const userInfo = this.getCurrentUserFromSession();

    return userInfo?.role_value === roleValue;

  }



  isCISO(): boolean { return this.hasRole(1); }

  isOVPHE(): boolean { return this.hasRole(2); }

  isApprover(): boolean { return this.hasRole(3); }

  isAssistant(): boolean { return this.hasRole(4); }

  isFaculty(): boolean { return this.hasRole(5); }



  private getCurrentUserFromSession(): { role_value?: number; } | null {

    // This would typically come from your app's state management

    // For now, return null - you'd implement this based on your state management

    return null;

  }



  // Get role display name

  getRoleName(roleValue: number): string {

    const roleNames = {

      1: 'CISO',

      2: 'OVPHE',

      3: 'APPROVER',

      4: 'ASSISTANT_APPROVER',

      5: 'FACULTY'

    };

    return roleNames[roleValue as keyof typeof roleNames] || 'Unknown';

  }



  // Get dashboard URL for role

  getDashboardUrl(roleValue: number): string {

    const dashboardPaths = {

      1: '/CISO-dashboard',

      2: '/OVPHE-dashboard',

      3: '/approver-dashboard',

      4: '/assistant-approver-dashboard',

      5: '/faculty-dashboard'

    };

    return dashboardPaths[roleValue as keyof typeof dashboardPaths] || '/faculty-dashboard';
  }

  // Get current user's dashboard URL
  // Update selected role in session
  async updateSelectedRole(roleValue: number): Promise<{ success: boolean; role_value: number }> {
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/update-role`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ role_value: roleValue }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update role');
      }

      const result = await response.json();
      console.log('AUTH_SERVICE: Updated selected role:', result);
      return result;
    } catch (error) {
      console.error('AUTH_SERVICE: Error updating selected role:', error);
      throw error;
    }
  }

  async getCurrentUserDashboardUrl(): Promise<string> {

    try {

      const authStatus = await this.getAuthStatus();

      if (authStatus.authenticated && authStatus.user_info) {

        return this.getDashboardUrl(authStatus.user_info.role_value);

      }

      return '/login';

    } catch (error) {

      console.error('Failed to get dashboard URL:', error);

      return '/login';

    }

  }

}



export const authService = new AuthService();

