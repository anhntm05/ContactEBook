import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  return user ? <Navigate to="/contacts" replace /> : children;
};

export default PublicRoute;
