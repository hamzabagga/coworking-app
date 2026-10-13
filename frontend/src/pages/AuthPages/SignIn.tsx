import SignInForm from "@/components/auth/SignInForm";
import PageMeta from "@/components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Connexion | Coworking"
        description="Connexion à l'espace de gestion du coworking"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
