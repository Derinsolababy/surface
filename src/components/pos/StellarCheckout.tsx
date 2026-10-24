import { Check, Copy, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import {
  useCreatePaymentRequest,
  usePaymentRequest,
  useStoreSettings,
  useVerifyPaymentRequest,
} from '@/hooks/queries';
import { useCountdown } from '@/hooks/useCountdown';
import { onRealtime } from '@/hooks/useRealtime';
import type { PaymentRequest, Transaction } from '@/types';
import { copyText } from '@/lib/clipboard';
import { cn, formatAssetAmount, truncateMiddle } from '@/utils/helpers';
import Button from '../ui/Button';
import { Input } from '../ui/Field';
import LoadingSpinner from '../ui/LoadingSpinner';

const explorer = (network: string, hash: string) =>
  `https://stellar.expert/explorer/${network === 'mainnet' ? 'public' : 'testnet'}/tx/${hash}`;

/**
 * Shows a SEP-7 QR for the sale's balance and waits for the chain. The
 * server's watcher settles the payment; this screen just listens (socket
 * first, polling as a fallback) and offers a manual hash check.
 */
export default function StellarCheckout({
  sale,
  onPaid,
}: {
  sale: Transaction;
  onPaid: (t: Transaction) => void;
}) {
  const store = useStoreSettings().data;
  const create = useCreatePaymentRequest();
  const [requestId, setRequestId] = useState<string | null>(null);
  const { data: polled } = usePaymentRequest(requestId);
  const request: PaymentRequest | undefined = polled ?? create.data;
  const verify = useVerifyPaymentRequest();
  const [hash, setHash] = useState('');
  const secondsLeft = useCountdown(request?.status === 'pending' ? request.expiresAt : null);

  useEffect(() => {
    if (!store?.stellar.enabled) return;
    create.mutate(sale.id, {
      onSuccess: (r) => setRequestId(r.id),
      onError: (err) => toast.error(err.message),
    });
    // Create once per sale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.id, store?.stellar.enabled]);

  useEffect(
    () =>
      onRealtime((event, payload) => {
        const p = payload as { request?: PaymentRequest; transaction?: Transaction };
        if (event === 'payment:confirmed' && p.request?.id === requestId && p.transaction)
          onPaid(p.transaction);
      }),
    [requestId, onPaid],
  );

  // Polling fallback: if the socket missed it, the request still flips to paid.
  useEffect(() => {
    if (polled?.status === 'paid')
      onPaid({ ...sale, status: 'completed', paidCents: sale.totalCents, balanceCents: 0 });
  }, [polled?.status, onPaid, sale]);

  if (!store?.stellar.enabled) {
    return (
      <div className="rounded-lg border border-dashed border-ink-line p-5 text-sm text-ink-2">
        <p className="font-medium text-ink">Stellar checkout is not set up yet.</p>
        <p className="mt-1">
          Set <code className="font-mono">STELLAR_MERCHANT_PUBLIC_KEY</code> on the server to the
          account that should receive payments, then restart it.
        </p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="grid place-items-center py-16">
        {create.isError ? (
          <p className="text-signal">{create.error.message}</p>
        ) : (
          <LoadingSpinner size="lg" label="Preparing QR" />
        )}
      </div>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
      <div
        className={cn(
          'mx-auto rounded-xl bg-white p-4 shadow-slip',
          request.status === 'pending' && 'animate-pulse-ring',
        )}
      >
        <QRCode value={request.uri} size={208} level="M" aria-label="Stellar payment QR code" />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="eyebrow">Customer pays</p>
          <p className="figures text-3xl font-semibold text-lumen">
            {formatAssetAmount(request.amount)} <span className="text-lg">{request.assetCode}</span>
          </p>
          <p className="mt-1 font-mono text-xs text-ink-3">
            to {truncateMiddle(request.destination, 6, 6)} / memo{' '}
            <span className="text-ink">{request.memo}</span>
          </p>
        </div>

        {request.status === 'pending' && (
          <div className="flex items-center gap-3 rounded-lg bg-lumen-soft px-4 py-3 text-lumen-ink">
            <LoadingSpinner size="sm" className="text-lumen" />
            <p className="text-sm">
              Waiting for the network. Expires in{' '}
              <span className="figures font-semibold">
                {mins}:{secs}
              </span>
            </p>
          </div>
        )}
        {request.status === 'paid' && (
          <div className="flex items-center gap-3 rounded-lg bg-cash-soft px-4 py-3 text-cash-ink">
            <Check className="h-5 w-5" />
            <p className="text-sm font-medium">
              Paid.{' '}
              {request.txHash && (
                <a
                  className="underline"
                  href={explorer(store.stellar.network, request.txHash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction <ExternalLink className="inline h-3 w-3" />
                </a>
              )}
            </p>
          </div>
        )}
        {(request.status === 'expired' || request.status === 'cancelled') && (
          <p className="rounded-lg bg-signal-soft px-4 py-3 text-sm text-signal">
            This QR {request.status}. Close checkout to start again.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Copy className="h-3.5 w-3.5" />}
            onClick={async () =>
              (await copyText(request.uri))
                ? toast.success('Payment link copied')
                : toast.error('Could not copy. Long-press the QR link instead.')
            }
          >
            Copy link
          </Button>
          <a
            href={request.uri}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-line px-3 text-sm hover:bg-paper-2"
          >
            Open in wallet
          </a>
        </div>

        {request.status === 'pending' && (
          <form
            className="flex items-end gap-2 border-t border-dashed border-ink-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              verify.mutate(
                { id: request.id, txHash: hash.trim() },
                {
                  onSuccess: (r) => onPaid(r.transaction),
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <Input
              wrapperClassName="flex-1"
              label="Customer shows a transaction hash?"
              placeholder="64-character hash"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              type="submit"
              variant="lumen"
              disabled={!/^[0-9a-fA-F]{64}$/.test(hash.trim())}
              loading={verify.isPending}
            >
              Verify
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
