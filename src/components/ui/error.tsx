import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";

export function ErrorPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    toast.error(`Redirecting to home page in ${countdown} seconds`, {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });

    const timer = setInterval(() => {
      setCountdown((prevCount) => prevCount - 1);
    }, 1000);

    const redirect = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-lg bg-gradient-to-br from-gray-900 to-black border border-gray-800 shadow-2xl text-center"
      >
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-4">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-300 mb-6">
          We're sorry, but it seems there was an error processing your request.
        </p>
        <p className="text-gray-400">
          Redirecting to home page in {countdown} seconds...
        </p>
      </motion.div>
    </div>
  );
}
