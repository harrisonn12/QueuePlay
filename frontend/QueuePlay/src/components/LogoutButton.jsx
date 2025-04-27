import { useAuth0 } from '@auth0/auth0-react';

export function LogoutButton() {
    const { logout } = useAuth0();

    const text = {
        logoutButtonText: "Logout"
    }

    return (
        <button
            onClick={() => logout({ returnTo: window.location.origin })}
            className='px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700'
        >
            {text.logoutButtonText}
        </button>
    );
}
