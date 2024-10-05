import { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { Copy, Share2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { WebSocketContext } from "@/layouts/root-layout";
import { toast } from "react-toastify";
import { useUser } from "@clerk/clerk-react";
import { StyledLoading } from "./ui/loader";

export function GeneratePasscode() {
  const { isLoaded, isSignedIn } = useUser();
  const webSocket = useContext(WebSocketContext);
  const [passcode, setPasscode] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      generatePasscode();
    }
  }, [isSignedIn]);

  if (!isLoaded) {
    return <StyledLoading />;
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  const generatePasscode = async () => {
    try {
      setIsGenerating(true);
      const response = await axios.post<{ passcode: string }>(
        `${import.meta.env.VITE_API_FULL_URL}/connections/generate-passcode`
      );

      setPasscode(response.data.passcode);

      if (webSocket) {
        webSocket.send(
          JSON.stringify({
            type: "SET_PASSCODE",
            passcode: response.data.passcode,
          })
        );

        webSocket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "NEW_USER_CONNECTED") {
            toast.success("New user connected!");
            navigate(`/transfer/${response.data.passcode}`);
          }
        };
      } else {
        console.error("WebSocket not available");
        toast.error("Connection error. Please try again.");
      }
    } catch (error) {
      console.error("Error generating passcode:", error);
      toast.error("Failed to generate passcode. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(passcode);
    setIsCopied(true);
    toast.success("Passcode copied to clipboard!");
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md p-8 rounded-lg bg-gradient-to-br from-gray-900 to-black border border-gray-800 shadow-2xl"
      >
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-3xl font-bold text-center mb-8 text-white tracking-wide"
        >
          Your Generated Passcode
        </motion.h1>
        {isGenerating ? (
          <div className="flex justify-center items-center h-24">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl font-bold text-center mb-8 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text"
          >
            {passcode}
          </motion.div>
        )}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex items-center space-x-4 text-gray-300"
          >
            <Share2 className="w-6 h-6 text-blue-500" />
            <p>Share this passcode with the person you want to connect with.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex items-center space-x-4 text-gray-300"
          >
            <Copy className="w-6 h-6 text-purple-500" />
            <p>
              Click the button below to copy the passcode to your clipboard.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <Button
              onClick={copyToClipboard}
              disabled={isGenerating}
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105"
            >
              {isCopied ? "Copied!" : "Copy Passcode"}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
