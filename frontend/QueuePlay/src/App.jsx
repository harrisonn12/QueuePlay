import { Auth0Provider } from '@auth0/auth0-react';
import { MainContainer } from './components/pages/MainContainer';

export const App = () => {
    return (
        <Auth0Provider
            domain='dev-zibrqd6bbmk7gy6m.us.auth0.com'
            clientId='5yrCCdRGWUEeALRTuSzISLGAwaRbW6yG'
            authorizationParams={{
                redirect_uri: window.location.origin,
            }}
        >
            <MainContainer />
        </Auth0Provider>
    );
};
