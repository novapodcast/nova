import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const transaction_id = ctx.params?.transaction_id as string;
  if (!supabaseAdmin) return { props: { notConfigured: true, transaction_id } };
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('transaction_id', transaction_id)
    .single();
  const { data: user } = payment?.user_id
    ? await supabaseAdmin.from('profiles').select('full_name,email').eq('id', payment.user_id).single()
    : { data: null } as any;
  return { props: { payment: payment || null, user: user || null, transaction_id } };
};

export default function ReceiptPage({ payment, user, transaction_id, notConfigured }: any) {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20, background: '#111', color: '#fff', minHeight: '100vh' }}>
      <Head>
        <title>Receipt {transaction_id}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <h1>Receipt</h1>
      {notConfigured && <p>Admin client not configured.</p>}
      {!payment && <p>No payment found for: {transaction_id}</p>}
      {payment && (
        <div style={{ background: '#1a1a1a', padding: 16, borderRadius: 8 }}>
          <p><b>Transaction</b>: {payment.transaction_id}</p>
          <p><b>Status</b>: {payment.status}</p>
          <p><b>Amount</b>: {payment.amount} {payment.currency}</p>
          <p><b>User</b>: {user?.full_name || payment.user_id}</p>
          <p><b>Email</b>: {user?.email || '—'}</p>
          <p><b>Date</b>: {new Date(payment.created_at || Date.now()).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
