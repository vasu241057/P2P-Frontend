import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

// Import the layouts
import RootLayout from "./layouts/root-layout";
import DashboardLayout from "./layouts/dashboard-layout";

// Import the components

import ContactPage from "./routes/contact";
import SignInPage from "./routes/sign-in";
import SignUpPage from "./routes/sign-up";
import DashboardPage from "./routes/dashboard";
import InvoicesPage from "./routes/dashboard.invoices";
import { LandingPage } from "./components/landing-page";
import { GeneratePasscode } from "./components/generate-passcode";
import { SendingReceivingPage } from "./components/sending-receiving-page";

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <SignInPage /> },
      { path: "/contact", element: <ContactPage /> },
      //   { path: "/sign-in/*", element: <SignInPage /> },
      { path: "/sign-up/*", element: <SignUpPage /> },
      { path: "/websocket", element: <LandingPage /> },
      { path: "/generate-passcode", element: <GeneratePasscode /> },
      { path: "/transfer/:passcode", element: <SendingReceivingPage /> },
      {
        element: <DashboardLayout />,
        path: "dashboard",
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/dashboard/invoices", element: <InvoicesPage /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
