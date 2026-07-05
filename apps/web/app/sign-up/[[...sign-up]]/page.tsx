import { SignUp } from "@clerk/nextjs";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function SignUpPage() {
  return (
    <AuthPageShell mode="sign-up">
      <SignUp
        appearance={{
          variables: { colorBackground: "#1b1d2b", colorPrimary: "#818cf8", colorForeground: "#f8fafc", colorMutedForeground: "#94a3b8", colorInput: "#151722", colorInputForeground: "#f8fafc", colorBorder: "#334155", borderRadius: "0.75rem" },
          elements: { cardBox: "shadow-2xl shadow-black/20", card: "border border-slate-700/55", formFieldInput: "bg-[#151722] text-slate-50", footerActionLink: "text-indigo-300 hover:text-indigo-200" },
        }}
        fallbackRedirectUrl="/"
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </AuthPageShell>
  );
}
