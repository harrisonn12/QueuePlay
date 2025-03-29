import { LogoutButton } from '../LogoutButton';
import Profile from '../features/Profile';

export const Dashboard = ({ children }) => {
    return (
        <>
            <LogoutButton />
            <Profile />
            {children}
        </>
    );
};