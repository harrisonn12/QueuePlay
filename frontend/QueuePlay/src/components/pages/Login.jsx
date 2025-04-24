import { LoginButton } from '../LoginButton';

export const Login = () => {
    return (
        <div className='min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
            <div className='max-w-md w-full space-y-8'>
                {/* Logo Placeholder */}
                <div className='flex justify-center'>
                    <div className='h-24 w-24 bg-indigo-600 rounded-lg flex items-center justify-center'>
                        <span className='text-white text-2xl font-bold'>
                            QP
                        </span>
                    </div>
                </div>

                {/* Welcome Text */}
                <div className='text-center'>
                    <h2 className='mt-6 text-3xl font-extrabold text-gray-900'>
                        Welcome to QueuePlay
                    </h2>
                    <p className='mt-2 text-sm text-gray-600'>
                        Your ultimate gaming companion
                    </p>
                </div>

                {/* Login Button */}
                <div className='mt-8'>
                    <LoginButton />
                </div>
            </div>
        </div>
    );
};
