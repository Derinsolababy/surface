import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { useAuthStore } from '@/stores/authStore';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('That does not look like an email'),
  password: z.string().min(1, 'Enter your password'),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const serverError = useAuthStore((s) => s.error);
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/pos';
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch {
      // The store holds the message; it is rendered below.
    }
  });

  return (
    <>
      <h2 className="font-display text-4xl font-extrabold tracking-tight">Sign in to the till</h2>
      <p className="mt-2 text-ink-2">Use the account your manager set up for you.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {serverError && (
          <p role="alert" className="rounded-lg bg-signal-soft px-3 py-2 text-sm text-signal">
            {serverError}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Open register
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-3">
        Setting up a new store?{' '}
        <Link to="/auth/register" className="font-medium text-ink underline underline-offset-4">
          Create the owner account
        </Link>
      </p>
      <details className="mt-8 rounded-lg border border-dashed border-ink-line px-4 py-3 text-sm text-ink-2">
        <summary className="cursor-pointer font-medium text-ink">Trying the demo?</summary>
        <p className="mt-2">
          After <code className="font-mono">npm run db:seed</code> on the backend, sign in as{' '}
          <code className="font-mono">admin@stellarpos.dev</code> with password{' '}
          <code className="font-mono">stellarpos-demo</code>.
        </p>
      </details>
    </>
  );
}
