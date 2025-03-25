import { useAuth0 } from '@auth0/auth0-react';
import { Dashboard } from './Dashboard';
import { Login } from './Login';
import TriviaGame from '../../games/trivia/TriviaGame';

export const MainContainer = () => {
    const { isAuthenticated } = useAuth0();

    return (
        <>
            {isAuthenticated ? (
                <Dashboard>
                    {/* <TriviaGame /> */}
                </Dashboard>
            ) : (
                <Login />
            )}
        </>
    );
};
