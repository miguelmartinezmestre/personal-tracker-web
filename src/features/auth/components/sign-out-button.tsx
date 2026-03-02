'use client';

import { Button } from '@/components/ui/button';
import { useSignOutMutationOptions } from '@/features/auth/auth-client';
import { useMutation } from '@tanstack/react-query';
import { Loader2, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function SignOutButton() {
  const router = useRouter();
  const t = useTranslations('Common');

  const signOutMutation = useMutation(
    useSignOutMutationOptions({
      onSuccess: () => {
        router.push('/login');
        router.refresh();
      },
      onError: error => {
        toast.error(error.message || t('unknownError'));
      },
    })
  );

  return (
    <Button
      variant="outline"
      size="sm"
      className="px-2 sm:px-3"
      onClick={() => signOutMutation.mutate()}
      disabled={signOutMutation.isPending}
      data-testid="logout-button"
      aria-label={t('actions.signOut')}
    >
      {signOutMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {signOutMutation.isPending ? t('actions.signingOut') : t('actions.signOut')}
      </span>
    </Button>
  );
}
