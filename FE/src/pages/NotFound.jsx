import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";

const NotFound = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getFallbackPath = () => {
    if (user) return "/contacts";
    return "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-4xl font-semibold text-gray-800 mt-4">Page Not Found</h2>
        <p className="text-gray-600 mt-2 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Button variant="primary" onClick={() => navigate(getFallbackPath())}>
          {user ? "Go to Contacts" : "Go Home"}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
