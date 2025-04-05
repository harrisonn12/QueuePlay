import { Auth0Provider } from '@auth0/auth0-react';
import { MainContainer } from './components/pages/MainContainer';
// import { CheckoutForm } from './components/CheckoutForm';
import TriviaGame from './components/games/trivia/TriviaGame';
// import { Auth0Provider } from '@auth0/auth0-react';
// import { MainContainer } from './components/containers/MainContainer';

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
            <TriviaGame />
        // </>
    );
};
