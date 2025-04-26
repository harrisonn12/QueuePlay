import { UserDashboard } from './UserDashboard';
import { AuthenticationScreener } from './AuthenticationScreener';

export const MainDisplay = () => {
    return (
        <div>
            <AuthenticationScreener>
                <UserDashboard />
            </AuthenticationScreener>
        </div>
    );
};
