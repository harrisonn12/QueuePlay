import { useAuth0 } from '@auth0/auth0-react';
import { Login } from './Login';

export const AuthenticationScreener = ({ children }) => {
    const { isAuthenticated } = useAuth0();

    return isAuthenticated ? (
        <>
            {children}
        </>
    ) : (
        <Login />
    );
};
