import "./App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./components/landing-page";
import { GeneratePasscode } from "./components/generate-passcode";
// import { EnterPasscode } from "./components/enter-passcode";
import { SendingReceivingPage } from "./components/sending-receiving-page";

function App() {
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null); // Lift WebSocket state up to App

  useEffect(() => {
    const newWebSocket = new WebSocket(`${import.meta.env.VITE_API_URL}`);

    newWebSocket.onopen = () => {
      setWebSocket(newWebSocket);
    };

    newWebSocket.onerror = (error) => {
      console.error("WebSocket connection error:", error);
      // Set an error state or display an error message to the user
    };

    console.log("webSocket", webSocket);

    return () => {
      console.log("WebSocket connection closed");
      newWebSocket.close();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage webSocket={webSocket} />} />
        <Route
          path="/generate-passcode"
          element={<GeneratePasscode webSocket={webSocket} />}
        />
        {/* <Route
          path="/enter-passcode"
          element={<EnterPasscode webSocket={webSocket} />}
        /> */}
        <Route
          path="/transfer/:passcode"
          element={<SendingReceivingPage webSocket={webSocket} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
