
/**
 * This component displays a 404 Not Found error page when users try to access
 * non-existent routes. It logs the attempted path for troubleshooting purposes.
 */

import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
      "with search params:",
      location.search
    );
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-lg px-4">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Sidan kunde inte hittas</p>
        <p className="text-gray-500 mb-6">
          Den länk du försökte nå finns inte eller har utgått. Om du klickade på en länk, 
          kontrollera att den är korrekt.
        </p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Gå till startsidan
        </a>
      </div>
    </div>
  );
};

export default NotFound;
