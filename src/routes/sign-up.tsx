import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full p-6 bg-black rounded-lg shadow-md">
        <SignUp path="/sign-up" signInFallbackRedirectUrl="/" />
      </div>
    </div>
  );
}
