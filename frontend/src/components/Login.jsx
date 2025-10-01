import { LoginForm } from "./LoginForm";
import Header from "./Header";

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground items-center">
      <Header />
      <div className="flex flex-col min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
