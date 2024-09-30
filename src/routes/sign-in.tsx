import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full p-6 bg-black rounded-lg shadow-md">
        <SignIn signUpFallbackRedirectUrl="/sign-up" />
      </div>
    </div>
  );
}
