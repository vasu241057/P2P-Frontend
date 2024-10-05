import { motion } from "framer-motion";
import { Loader } from "lucide-react";

export function StyledLoading() {
  return (
    <div className="fixed inset-0 w-full h-full bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-lg bg-gradient-to-br from-gray-900 to-black border border-gray-800 shadow-2xl flex flex-col items-center"
      >
        <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-xl font-semibold text-white">Loading...</p>
      </motion.div>
    </div>
  );
}
