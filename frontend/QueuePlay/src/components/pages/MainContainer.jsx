import { useAuth0 } from '@auth0/auth0-react';
import { Dashboard } from './Dashboard';
import { Login } from './Login';
import TriviaGame from '../../games/trivia/TriviaGame';
import { useEffect } from 'react';

export const MainContainer = () => {
    const { isAuthenticated, user } = useAuth0();

    useEffect(() => {
        

        return () => {

        }
    }, [user])

    return (
        <>
            {isAuthenticated ? (
                <Dashboard>
                    <TriviaGame />
                </Dashboard>
            ) : (
                <Login />
            )}
        </>
    );
};
