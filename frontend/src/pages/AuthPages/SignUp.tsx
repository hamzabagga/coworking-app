import SignUpForm from "@/components/auth/SignUpForm";
import PageMeta from "@/components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Inscription | Coworking"
        description="Créer un compte membre du coworking"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
