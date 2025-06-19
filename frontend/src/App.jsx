import { useState } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { MainContainer } from './components/pages/MainContainer';
import GameFactory from './components/games/GameFactory';

export const App = () => {
    const _auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const _auth0ClientID = import.meta.env.VITE_AUTH0_CLIENT_ID;
    
    // State to track current game type - determined by host or joining player
    const [currentGameType, setCurrentGameType] = useState(null);
    
    // Fresh start on every page load - no persistent game state

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
        <GameFactory 
            key="game-factory" // Prevent unnecessary remounting
            gameType={currentGameType} 
            onGameTypeChange={setCurrentGameType}
        />
    );
};
