import { useAuth0 } from '@auth0/auth0-react';
import { Dashboard } from './Dashboard';
import { Login } from './Login';
import TriviaGame from '../../games/trivia/TriviaGame';
import { useEffect, useState } from 'react';

export const MainContainer = () => {
    const { isAuthenticated, user } = useAuth0();
    const [data, setData] = useState('');

    

    /*
        - create authenticationScreener component
            - checks if you're authenticated
            - encapsulates authentication (accepts children)
     */

    return (
        <>
            {isAuthenticated ? (
                <Dashboard>
                    <TriviaGame />
                    <p>Data: {JSON.stringify(data.data)}</p>
                </Dashboard>
            ) : (
                <Login />
            )}
        </>
    );
};
