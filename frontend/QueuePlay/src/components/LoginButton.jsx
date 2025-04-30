import { useAuth0 } from '@auth0/auth0-react';
import { ArrowLeftEndOnRectangleIcon } from '@heroicons/react/24/solid';

export const LoginButton = () => {
    const { loginWithRedirect } = useAuth0();

    const text = {
        loginButtonText: 'Log In',
    };

    return (
        <button
            onClick={() => {
                loginWithRedirect();
            }}
            className='relative inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300'
        >
            <div className='flex flex-row items-center'>
                <ArrowLeftEndOnRectangleIcon className='w-5 h-5 mr-2' />
                {text.loginButtonText}
            </div>
        </button>
    );
};
