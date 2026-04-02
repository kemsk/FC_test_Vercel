import { useState, useEffect } from "react";
import "../../index.css"; // ensure index.css is accessible from src
import { Button } from "../../stories/components/button";
import PWAInstallPrompt from "../../components/PWAInstallPrompt";

export default function LoginInput() {
  const [error, setError] = useState<string>(() => {
    // Check for error parameters in URL during initial render
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const errorParam = urlParams.get('error');
    
    const getErrorMessage = () => {
      switch (errorParam) {
        case 'authentication_failed':
          return "Authentication failed. Please try signing in again.";
        case 'unauthorized':
          return "You are not authorized to access this system. Please contact your administrator.";
        case 'role_mismatch':
          return "Role mismatch detected. Please select the correct account type.";
        case 'no_role_selected':
          return "Please select your account type to continue.";
        case 'invalid_role':
          return "Invalid login type detected. Please select your account type from the options below.";
        case 'email_not_registered':
          return "This email is not registered in the system. Please use your registered XU email or contact the administrator.";
        default:
          return "";
      }
    };

    // Clear the error parameter from URL if it exists
    if (errorParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      return getErrorMessage();
    }
    
    return "";
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Don't automatically redirect - let user choose to sign in
    // This allows users to see the initial login page
    console.log('Login page loaded - waiting for user action');
  }, []);

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    
    // For PWA compatibility, use window.location.href instead of assign
    // This helps keep the flow within the PWA context when possible
    window.location.href = `/accounts/login/google/`;
  };

  return (
    <div className="login-container bg-primary text-primary-foreground min-h-screen flex justify-center items-center p-4">
      <PWAInstallPrompt />

      {/* LOGIN PANEL */}
      <div className="w-full bg-primary p-8 flex flex-col items-center px-0">

      {/* Login Header */}
        <div className="w-full max-w-screen-sm px-3 flex flex-col items-center gap-8">

        <img src="/public/RemoveBG_Logomark.png" className="w-full max-w-[28%] h-auto -mt-12" />

        <div>Welcome to</div>

        <div className="flex w-full items-center justify-center gap-5">

          <img
            src="/static/frontend/Pen Swish White_FacultyClearTrack.png"
            className="h-24 w-auto flex-shrink-0"
          />
          <div className="text-left leading-tight">
            <div className="text-3xl font-bold text-white">XU Faculty</div>
            <div className="text-3xl font-bold text-white">ClearTrack</div>
          </div>
        </div>
        </div>

      

      {/* Login Form */}
      <div className="mt-5 p-8 w-full max-w-md">

        {error ? (
          <div className="mb-4 text-sm text-red-200">{error}</div>
        ) : null}

        <div className="login-input mb-4 flex flex-col gap-2">
        
          {/* Primary login button */}
          <Button
            type="button"
            variant="white"
            className="w-full border border-gray-300 bg-white px-4 text-black"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <span className="flex w-full items-center">
              <img
                src="/GoogleIcon.png"
                alt="Google"
                className="h-4 w-4 flex-shrink-0 object-contain"
              />
              <span className="flex-1 text-center text-sm font-medium">
                {isLoading ? 'Signing in...' : 'Sign in with Google'}
              </span>
            </span>
          </Button>

          {error && (
            <div className="text-sm text-red-200 text-center">{error}</div>
          )}

        </div>
        
      </div>
      </div>
    </div>
  );
}
