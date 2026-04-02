import { useState, useEffect } from "react";
import "../../index.css"; // ensure index.css is accessible from src
import { Progress } from "../../stories/components/progress";
import { authService } from "../../services/authService";

export default function LoginPrompt() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 100 ? prev + 5 : 100));
    }, 200); // increase 5% every 200ms

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  useEffect(() => {
    if (progress < 100) return;

    const resolveAndRedirect = async () => {
      // Handle OAuth callback with JWT token
      authService.handleOAuthCallback();
      
      try {
        // Get user authentication status
        const authStatus = await authService.getAuthStatus();
        console.log('LOGIN_PROMPT: Auth status:', authStatus);
        
        if (!authStatus.authenticated || !authStatus.user_info) {
          console.log('LOGIN_PROMPT: No valid authentication, redirecting to login');
          window.location.replace('/');
          return;
        }
        
        // Check if we have a selected role from session storage
        const selectedRoleStr = sessionStorage.getItem('selected_role');
        if (!selectedRoleStr) {
          console.log('LOGIN_PROMPT: No selected role found, redirecting to role selection');
          window.location.replace('/login');
          return;
        }
        
        const selectedRole = JSON.parse(selectedRoleStr);
        console.log('LOGIN_PROMPT: Selected role:', selectedRole);
        
        // Verify user has the selected role
        const userRoles = authStatus.user_info.roles || [authStatus.user_info.role_value];
        console.log('LOGIN_PROMPT: User roles from API:', userRoles);
        console.log('LOGIN_PROMPT: Selected role value:', selectedRole.value);
        console.log('LOGIN_PROMPT: User roles types:', userRoles.map(r => typeof r));
        console.log('LOGIN_PROMPT: Complete authStatus.user_info:', authStatus.user_info);
        
        // Since API returns role values directly, no conversion needed
        const userRoleValues = userRoles.map((role: string | number) => {
          if (typeof role === 'string') {
            const converted = parseInt(role, 10);
            return converted;
          }
          return role;
        });
        
        console.log('LOGIN_PROMPT: Converted user role values:', userRoleValues);
        console.log('LOGIN_PROMPT: Does user have role 3 (APPROVER)?', userRoleValues.includes(3));
        console.log('LOGIN_PROMPT: Does user have role 2 (OVPHE)?', userRoleValues.includes(2));
        console.log('LOGIN_PROMPT: Does user have role 4 (ASSISTANT)?', userRoleValues.includes(4));
        console.log('LOGIN_PROMPT: Does user have role 5 (FACULTY)?', userRoleValues.includes(5));
        
        if (!userRoleValues.includes(selectedRole.value)) {
          console.log('LOGIN_PROMPT: User does not have selected role');
          console.log('LOGIN_PROMPT: Available roles:', userRoleValues);
          console.log('LOGIN_PROMPT: Selected role:', selectedRole.value);
          sessionStorage.removeItem('selected_role');
          window.location.replace('/login?error=role_mismatch');
          return;
        }
        
        // Wait a moment to show the verification screen
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Role-based dashboard mapping
        const roleDashboardMap: Record<number, string> = {
          1: '/CISO-dashboard',
          2: '/OVPHE-dashboard', 
          3: '/approver-dashboard',
          4: '/assistant-approver-dashboard',
          5: '/faculty-dashboard',
        };

        const target = roleDashboardMap[selectedRole.value] || '/faculty-dashboard';
        console.log('LOGIN_PROMPT: Redirecting to dashboard:', target);
        
        // Clear selected role from session storage
        sessionStorage.removeItem('selected_role');
        
        window.location.replace(target);
        
      } catch (error) {
        console.error('LOGIN_PROMPT: Error during authentication:', error);
        window.location.replace('/');
      }
    };

    resolveAndRedirect();
  }, [progress]);

  return (
    <div className="login-container bg-primary text-primary-foreground min-h-screen flex justify-center items-center p-0">

      {/* LOGIN PANEL */}
      <div className="w-full bg-primary p-8 flex flex-col items-center px-3">

        {/* Logos */}
        <div className="w-full max-w-screen-sm px-3 flex flex-col items-center gap-8">

          <img src="/RemoveBG_Logomark.png" className="w-full max-w-[40%] h-auto -mt-12" />

          {/* App Logo + Progress */}
          <div className="flex flex-col items-center gap-5 w-full">

            <img src="/Pen Swish White_FacultyClearTrack.png" className="w-full max-w-[70%] h-auto mb-2" />

            <div className="w-full flex flex-col items-center gap-11">

              <h1 className="text-center font-bold leading-[1.05] max-w-[20rem] text-[clamp(1.75rem,7vw,2.75rem)]">
                Signing you in..
              </h1>

              {/* Animated Progress Bar */}
              <Progress value={progress} className="w-full max-w-[70%] h-2 rounded" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}