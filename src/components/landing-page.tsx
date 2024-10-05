import React, { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { WebSocketContext } from "@/layouts/root-layout";
import { toast } from "react-toastify";
import { useUser } from "@clerk/clerk-react";
import { StyledLoading } from "./ui/loader";

export function LandingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const webSocket = useContext(WebSocketContext);
  const [name, setName] = useState("");
  const [usePasscode, setUsePasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setName(user.fullName || "");
    }
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return <StyledLoading />;
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear any previous errors

    if (!name.trim()) {
      setError("Please enter your name.");
      toast.error("Please enter your name.");
      return;
    }

    if (usePasscode && !passcode.trim()) {
      setError("Please enter a passcode.");
      toast.error("Please enter a passcode.");
      return;
    }

    if (usePasscode) {
      // API request to connect with passcode using Axios
      try {
        const response = await axios.post<{ message: string }>(
          `${import.meta.env.VITE_API_FULL_URL}/connections/connect/${passcode}`
        );
        console.log(response);

        if (response.status === 200) {
          if (webSocket) {
            webSocket.send(
              JSON.stringify({
                type: "SET_PASSCODE",
                passcode: passcode,
              })
            );
            toast.success("Connected successfully!");
            navigate(`/transfer/${passcode}`);
          }
        } else {
          // Handle connection error (e.g., invalid passcode)
          const errorMessage =
            response.data.message || "Failed to connect. Please try again.";
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } catch (error) {
        console.error("Error connecting:", error);
        const errorMessage = "An error occurred. Please try again later.";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } else {
      toast.info("Generating new passcode...");
      navigate("/generate-passcode");
    }
  };

  const handlePasscodeToggle = (generatePasscode: boolean) => {
    setUsePasscode(!generatePasscode);
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
          className="text-4xl font-bold text-center mb-8 text-white tracking-wide"
        >
          Share Files Instantly
        </motion.h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-gray-300">
              Your Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Passcode
            </label>
            <div className="flex items-center justify-between bg-gray-800 rounded-md p-1">
              <Toggle
                pressed={usePasscode}
                onPressedChange={() => handlePasscodeToggle(false)}
                className="w-1/2 py-2 text-sm font-medium text-center rounded-md transition-all duration-300"
                variant={usePasscode ? "default" : "outline"}
              >
                Enter Passcode
              </Toggle>
              <Toggle
                pressed={!usePasscode}
                onPressedChange={() => handlePasscodeToggle(true)}
                className="w-1/2 py-2 text-sm font-medium text-center rounded-md transition-all duration-300"
                variant={!usePasscode ? "default" : "outline"}
              >
                Generate Passcode
              </Toggle>
            </div>
          </div>
          {usePasscode && (
            <Input
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              placeholder="Enter passcode"
            />
          )}
          <Button
            type="submit"
            className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105"
          >
            Continue
          </Button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      </motion.div>
    </div>
  );
}
