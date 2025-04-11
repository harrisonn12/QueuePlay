import { UserDashboard } from './UserDashboard';
import { AuthenticationScreener } from './AuthenticationScreener';

export const MainContainer = () => {
    return (
        <AuthenticationScreener>
            <UserDashboard />
        </AuthenticationScreener>
    );
};
