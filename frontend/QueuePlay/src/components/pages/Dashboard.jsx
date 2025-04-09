import { LogoutButton } from '../LogoutButton';
import Profile from '../features/Profile';
import { useAuth0 } from '@auth0/auth0-react';
import { useHandleLogin } from '../../hooks/useHandleLogin';

export const Dashboard = ({ children }) => {
    const { user } = useAuth0();
    const data = useHandleLogin(user);

    return (
        <>
            <LogoutButton />
            <Profile />
            {children}
            {data}
        </>
    );
};
