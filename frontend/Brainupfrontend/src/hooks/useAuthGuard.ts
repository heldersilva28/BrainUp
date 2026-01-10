import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useAuthGuard = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("brainup_token");
  
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

  const authFetch = (url: string, options: RequestInit = {}) => {
    const currentToken = sessionStorage.getItem("brainup_token");
    return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${currentToken}`,
    },
    });
  };

  // Function to decode JWT and get expiration date
  const getTokenExpiration = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        const expirationDate = new Date(payload.exp * 1000);
        return expirationDate;
      }
    } catch (err) {
      console.error("Error decoding token:", err);
    }
    return null;
  };

  useEffect(() => {
    const checkTokenValidity = async () => {
    if (!token) {
      console.log("Token validation: No token found");
      navigate("/login");
      return;
    }

    // Log token expiration date
    const expirationDate = getTokenExpiration(token);
    if (expirationDate) {
      console.log("Token expiration date:", expirationDate.toISOString());
      console.log("Token expires in:", Math.round((expirationDate.getTime() - Date.now()) / 1000 / 60), "minutes");
    }

    try {
      console.log("Token validation: Validating token...");
      const res = await authFetch(`${apiBaseUrl}/api/auth/validate`);
      if (!res.ok) {
      console.log("Token validation: Token is invalid or expired");
      sessionStorage.removeItem("brainup_token");
      navigate("/login");
      } else {
      console.log("Token validation: Token is valid");
      }
    } catch (err) {
      console.error("Token validation failed:", err);
      console.log("Token validation: Error occurred, removing token");
      sessionStorage.removeItem("brainup_token");
      navigate("/login");
    }
    };

    checkTokenValidity();
  }, [navigate, token, apiBaseUrl]);

  return { isAuthenticated: !!token, authFetch };
  };