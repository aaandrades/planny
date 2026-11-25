import { lazy, Suspense, useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';
import { Splash } from './components/Splash';
import { Toaster } from './components/Toast';
import { AuthProvider, useAuth } from './lib/auth';
import { Home } from './pages/Home';

const Login = lazy(() => import('./pages/Login'));
export const loadTripPage = () => import('./pages/TripPage');
const TripPage = lazy(loadTripPage);

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);
  return null;
}

function Routes() {
  const { user, ready } = useAuth();
  if (!ready) return <Splash />;
  if (!user) return <Login />;
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/trip/:id">{(p) => <TripPage key={p.id} id={p.id} />}</Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </>
  );
}

export function App() {
  useEffect(() => {
    // Warm the trip page chunk once the browser is idle — makes the first tap instant.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    idle(() => void loadTripPage());
  }, []);

  return (
    <AuthProvider>
      <Suspense fallback={<Splash />}>
        <Routes />
      </Suspense>
      <Toaster />
    </AuthProvider>
  );
}
