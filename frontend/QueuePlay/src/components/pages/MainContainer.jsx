import { Dashboard } from './Dashboard';
import TriviaGame from '../../games/trivia/TriviaGame';
import useFetchDatabase from '../../hooks/useFetchDatabase';
import { AuthenticationScreener } from './AuthenticationScreener';

export const MainContainer = () => {
    const data = useFetchDatabase('paymentDatabase/read?table=membership');

    return (
        <AuthenticationScreener>
            <Dashboard>
                <TriviaGame />
                <p>Data: {JSON.stringify(data.data)}</p>
            </Dashboard>
        </AuthenticationScreener>
    );
};
