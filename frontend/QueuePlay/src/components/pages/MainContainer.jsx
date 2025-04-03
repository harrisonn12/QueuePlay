import { Dashboard } from './Dashboard';
import TriviaGame from '../../games/trivia/TriviaGame';
import { AuthenticationScreener } from './AuthenticationScreener';

export const MainContainer = () => {
    return (
        <AuthenticationScreener>
            <Dashboard>
                {/* <TriviaGame /> */}
            </Dashboard>
        </AuthenticationScreener>
    );
};
