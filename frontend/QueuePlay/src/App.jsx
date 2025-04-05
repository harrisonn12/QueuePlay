// import { CheckoutForm } from './components/CheckoutForm';
import TriviaGame from './components/games/trivia/TriviaGame';
// import { Auth0Provider } from '@auth0/auth0-react';
// import { MainContainer } from './components/containers/MainContainer';

export default function App() {
    return (
        // <Auth0Provider
        //     domain='dev-zibrqd6bbmk7gy6m.us.auth0.com'
        //     clientId='yQGvTs7HOWIWBAvhRRdoKE8ttqdFb5Fl'
        //     authorizationParams={{
        //         redirect_uri: window.location.origin,
        //     }}
        // >
        //     <MainContainer />
        // </Auth0Provider>
        <>
            {/* <CheckoutForm /> */}
            <TriviaGame />
        </>
    );
}
