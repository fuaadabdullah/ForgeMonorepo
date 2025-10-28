import type { AppProps } from 'next/app';
import { TRPCProvider } from '../components/TRPCProvider';
import '../styles.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <TRPCProvider>
      <Component {...pageProps} />
    </TRPCProvider>
  );
}
