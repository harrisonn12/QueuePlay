import { Auth0Provider } from '@auth0/auth0-react';
import { MainContainer } from './components/pages/MainContainer';
import GameFactory from './components/games/GameFactory';
import { GAME_TYPES } from './utils/constants/gameTypes';

export const App = () => {
    const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const auth0ClientID = import.meta.env.VITE_AUTH0_CLIENT_ID;

    return (
        // <Auth0Provider
        //     domain={auth0Domain}
        //     clientId={auth0ClientID}
        //     authorizationParams={{
        //         redirect_uri: window.location.origin,
        //     }}
        // >
        //     <MainContainer />
        // </Auth0Provider>
        <GameFactory gameType={GAME_TYPES.TRIVIA} />
    );
};
