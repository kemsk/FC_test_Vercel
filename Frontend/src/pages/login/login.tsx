import { useState, useEffect, useMemo } from "react";
import "../../index.css"; // ensure index.css is accessible from src
import { Button } from "../../stories/components/button";
import { authService } from "../../services/authService";
import PWAInstallPrompt from "../../components/PWAInstallPrompt";

interface UserRole {
  value: number;
  name: string;
  display_name: string;
  icon_primary: string;
  icon_white: string;
}

export default function Login() {
  const [error, setError] = useState<string>("");
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState<{ first_name?: string; last_name?: string } | null>(null);

  const allRoles: UserRole[] = useMemo(() => [
    {
      value: 1,
      name: 'ciso',
      display_name: 'CISO System Admin',
      icon_primary: '/public/PrimaryShieldIcon.png',
      icon_white: '/public/WhiteShieldIcon.png'
    },
    {
      value: 2,
      name: 'ovphe',
      display_name: 'OVPHE System Admin',
      icon_primary: '/public/PrimaryAnalysisIcon.png',
      icon_white: '/public/WhiteAnalysisIcon.png'
    },
    {
      value: 3,
      name: 'approver',
      display_name: 'Department or Office Approver',
      icon_primary: '/public/PrimaryPersonChecked.png',
      icon_white: '/public/WhitePersonChecked.png'
    },
    {
      value: 4,
      name: 'assistant',
      display_name: 'Assistant Approver',
      icon_primary: '/public/PrimaryHandIcon.png',
      icon_white: '/public/WhiteHandIcon.png'
    },
    {
      value: 5,
      name: 'faculty',
      display_name: 'Faculty Member',
      icon_primary: '/public/PrimaryChecklistIcon.png',
      icon_white: '/public/WhiteChecklistIcon.png'
    }
  ], []);

  useEffect(() => {
    const loadUserRoles = async () => {
      try {
        // Handle JWT token from URL if present (OAuth callback)
        authService.handleOAuthCallback();
        
        const authStatus = await authService.getAuthStatus();
        
        if (!authStatus.authenticated || !authStatus.user_info) {
          // User not authenticated, redirect to login input
          window.location.replace('/');
          return;
        }

        setUserInfo(authStatus.user_info);
        
        // Debug: Log the complete auth status
        console.log('LOGIN: Complete auth status:', authStatus);
        console.log('LOGIN: User info from auth status:', authStatus.user_info);
        
        // Use roles from API response instead of JWT token
        let userRoles: (string | number)[] = [authStatus.user_info.role_value]; // fallback
        
        if (authStatus.user_info.roles && authStatus.user_info.roles.length > 0) {
          // Use roles from API response (already converted to role values)
          userRoles = authStatus.user_info.roles;
          console.log('LOGIN: Using roles from API response:', userRoles);
        } else {
          console.log('LOGIN: No roles in API response, using fallback role_value');
        }
        
        console.log('LOGIN: Final user roles to process:', userRoles);
        console.log('LOGIN: Type of userRoles:', typeof userRoles, Array.isArray(userRoles));
        
        // Since API returns role values directly, no conversion needed
        const roleValues = userRoles.map((role: string | number) => {
          console.log('LOGIN: Processing role:', role, 'type:', typeof role);
          if (typeof role === 'string') {
            const converted = parseInt(role, 10);
            console.log('LOGIN: Converted string role:', role, '->', converted);
            return converted;
          }
          console.log('LOGIN: Kept number role:', role);
          return role;
        });
        
        console.log('LOGIN: Final role values:', roleValues);
        
        // Find all role objects that match user's roles
        const matchedRoles = allRoles.filter(role => roleValues.includes(role.value));
        console.log('LOGIN: All available roles:', allRoles);
        console.log('LOGIN: Matched roles:', matchedRoles);
        console.log('LOGIN: Role values includes 3 (APPROVER):', roleValues.includes(3));
        
        if (matchedRoles.length > 0) {
          setUserRoles(matchedRoles);
        } else {
          setError('Invalid role assigned. Please contact administrator.');
        }
        
      } catch (error) {
        console.error('Error loading user roles:', error);
        setError('Failed to load user roles. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserRoles();
  }, [allRoles]);

  const handleRoleSelection = async (role: UserRole) => {
    setError("");
    
    try {
      // Update the selected role in the session first
      console.log('LOGIN: Updating selected role in session:', role.value);
      await authService.updateSelectedRole(role.value);

      const roleToActivityLog: Record<
        number,
        { endpoint: string; user_role: "CISO" | "OVPHE" | "Approver" | "Assistant" | "Faculty" }
      > = {
        1: { endpoint: "/admin/xu-faculty-clearance/api/ciso/activity-logs", user_role: "CISO" },
        2: { endpoint: "/admin/xu-faculty-clearance/api/ovphe/activity-logs", user_role: "OVPHE" },
        3: { endpoint: "/admin/xu-faculty-clearance/api/approver/activity-logs", user_role: "Approver" },
        4: { endpoint: "/admin/xu-faculty-clearance/api/approver/activity-logs", user_role: "Assistant" },
        5: { endpoint: "/admin/xu-faculty-clearance/api/faculty/activity-logs", user_role: "Faculty" },
      };

      const logTarget = roleToActivityLog[role.value];
      if (logTarget) {
        try {
          await fetch(logTarget.endpoint, {
            method: "POST",
            credentials: "include",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "user_login",
              user_role: logTarget.user_role,
              details: [`${logTarget.user_role} Login`],
            }),
          });
        } catch {
        }
      }
      
      // Store the selected role for potential future use
      sessionStorage.setItem('selected_role', JSON.stringify(role));
      
      // Redirect directly to dashboard based on selected role
      const roleDashboardMap: Record<number, string> = {
        1: '/CISO-dashboard',
        2: '/OVPHE-dashboard', 
        3: '/approver-dashboard',
        4: '/assistant-approver-dashboard',
        5: '/faculty-dashboard',
      };

      const target = roleDashboardMap[role.value] || '/faculty-dashboard';
      console.log('LOGIN: Redirecting to dashboard:', target);
      
      // Redirect to the appropriate dashboard
      window.location.replace(`${target}`);
      
    } catch (error) {
      console.error('LOGIN: Error updating selected role:', error);
      setError('Failed to select role. Please try again.');
    }
  };

  return (
    <div className="login-container bg-primary text-primary-foreground min-h-screen flex justify-center items-center p-4">
      <PWAInstallPrompt />

      {/* LOGIN PANEL */}
      <div className="w-full bg-primary p-8 flex flex-col items-center px-0">

      {/* Login Header */}
        <div className="w-full max-w-screen-sm px-3 flex flex-col items-center gap-8">

        <img src="/public/RemoveBG_Logomark.png" className="w-full max-w-[40%] h-auto -mt-12" />

        <div className="flex flex-col items-center gap-4 w-full">
          <h1 className="text-center font-bold leading-[1.05] text-[clamp(1.5rem,6vw,2.25rem)] text-white">
            Welcome, {userInfo?.first_name || 'User'}!
          </h1>

          <p className="text-center text-white/80 text-sm md:text-base max-w-md">
            Select your account type to continue
          </p>
        </div>

        </div>

      

      {/* Login Form */}
      <div className="mt-5 p-8 w-full max-w-md">

        {isLoading ? (
          <div className="text-white text-center">Loading your roles...</div>
        ) : error ? (
          <div className="mb-4 text-sm text-red-200">{error}</div>
        ) : null}

        {/* Username input + checkbox */}
        <div className="login-input mb-4 flex flex-col gap-2">
          {userRoles.map((role) => (
            <Button
              key={role.value}
              type="button"
              variant="white"
              alignment="left"
              className="group"
              size="mobileXL"
              onClick={() => handleRoleSelection(role)}
            >
              <div className="flex items-start gap-3">
                <span className="relative w-5 h-5 flex-shrink-0 mt-0.5">
                  <img src={role.icon_primary} alt="{role.display_name} Icon" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-150 opacity-100 group-hover:opacity-0" />
                  <img src={role.icon_white} alt="{role.display_name} Hover Icon" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-150 opacity-0 group-hover:opacity-100" />
                </span>
                <span className="flex-1 text-left">{role.display_name}</span>
              </div>
            </Button>
          ))}
        </div>
        
      </div>
      </div>
    </div>
  );
}
