import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import React, { useEffect, useState } from "react";
import { dark } from "@clerk/themes";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}
export const WebSocketContext = React.createContext<WebSocket | null>(null);

export default function RootLayout() {
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const newWebSocket = new WebSocket(`${import.meta.env.VITE_API_URL}`);

    newWebSocket.onopen = () => {
      setWebSocket(newWebSocket);
    };

    newWebSocket.onerror = (error) => {
      console.error("WebSocket connection error:", error);
    };

    return () => {
      console.log("WebSocket connection closed");
      newWebSocket.close();
    };
  }, []);

  return (
    <ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={PUBLISHABLE_KEY}
      signInFallbackRedirectUrl={"/websocket"}
      signUpFallbackRedirectUrl={"/websocket"}
      appearance={{
        baseTheme: dark,
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "black",
            padding: "1rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "98vw",
            }}
          >
            <div>
              <p style={{ margin: 0, color: "white" }}>P2P File Transfer</p>
            </div>
            <div>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <Link
                  to="/"
                  style={{ textDecoration: "none", color: "#007bff" }}
                >
                  Sign In
                </Link>
              </SignedOut>
            </div>
          </div>
        </header>
        <main style={{ flex: 1 }}>
          <WebSocketContext.Provider value={webSocket}>
            <Outlet />
          </WebSocketContext.Provider>
        </main>
      </div>
    </ClerkProvider>
  );
}
