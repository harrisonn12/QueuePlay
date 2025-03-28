import { useAuth0 } from '@auth0/auth0-react';
import { Dashboard } from './Dashboard';
import { Login } from './Login';
import TriviaGame from '../../games/trivia/TriviaGame';
import { useEffect, useState } from 'react';
import axios from 'axios';

export const MainContainer = () => {
    const { isAuthenticated, user } = useAuth0();
    const { data, setData } = useState();

    const userLogin = () => {
        console.log('Making request to backend...');
        axios
            .get('http://127.0.0.1:8000/paymentDatabase/read?table=membership')
            .then((response) => {
                setData(response);
            })
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    };

    useEffect(() => {
        userLogin();
        return () => {};
    }, [user]);

    return (
        <>
            {isAuthenticated ? (
                <Dashboard>
                    <TriviaGame />
                    <p>Data: {JSON.stringify(data)}</p>
                </Dashboard>
            ) : (
                <Login />
            )}
        </>
    );
};
