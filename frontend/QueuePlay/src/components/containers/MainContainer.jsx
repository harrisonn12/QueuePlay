import { useAuth0 } from '@auth0/auth0-react';
import { Dashboard } from './Dashboard';
import { Login } from './Login';

export function MainContainer() {
    const { isAuthenticated } = useAuth0();

    return <>{isAuthenticated ? <Dashboard /> : <Login />}</>;
}
